// pb_public/admin/admin.js
// Admin Control Center interactive controller (ADMN-01..04, SEC-04)

function adminApp() {
  return {
    token: sessionStorage.getItem("pb_admin_token") || localStorage.getItem("pb_admin_token") || "",
    admin: null,
    isRealtimeConnected: false,
    realtimeEventSource: null,
    _realtimeTimer: null,
    metrics: {
      total_booked_value: 0,
      total_realized_cash: 0,
      total_defaults: 0,
      cash_in_transit: 0,
      post_travel_default_count: 0
    },
    watchlist: [],
    sortBy: "days",
    sortOrder: "desc",
    activeTab: "devotees",
    loading: false,
    toastMessage: "",
    toastType: "info",
    loginEmail: "admin@bharatyatra.local",
    loginPassword: "password123456",
    loginError: "",

    async init() {
      if (!this.token) {
        window.location.href = "/login.html?redirect=" + encodeURIComponent(window.location.pathname + window.location.search);
        return;
      }
      try {
        const storedUser = sessionStorage.getItem("pb_admin_user") || localStorage.getItem("pb_admin_user");
        if (storedUser) this.admin = JSON.parse(storedUser);
      } catch (e) {}

      await this.loadAll();
      this.connectRealtime();

      document.addEventListener("visibilitychange", () => {
        if (!document.hidden && this.token) {
          this.silentRefresh();
        }
      });
      window.addEventListener("focus", () => {
        if (this.token) this.silentRefresh();
      });
    },

    connectRealtime() {
      if (this.realtimeEventSource) {
        try { this.realtimeEventSource.close(); } catch(e) {}
      }
      if (!this.token) return;

      try {
        const es = new EventSource("/api/realtime");
        this.realtimeEventSource = es;

        es.addEventListener("PB_CONNECT", async (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.clientId) {
              const subRes = await fetch("/api/realtime", {
                method: "POST",
                headers: this.getHeaders(),
                body: JSON.stringify({
                  clientId: data.clientId,
                  subscriptions: ["installments/*", "handover_batches/*", "settlements/*", "subscriptions/*"]
                })
              });
              if (subRes.ok || subRes.status === 204) {
                this.isRealtimeConnected = true;
              }
            }
          } catch (err) {
            console.warn("Realtime subscription handshake error:", err);
          }
        });

        const onRecordChange = () => {
          if (this._realtimeTimer) clearTimeout(this._realtimeTimer);
          this._realtimeTimer = setTimeout(() => {
            this.silentRefresh();
          }, 350);
        };

        es.addEventListener("installments", onRecordChange);
        es.addEventListener("handover_batches", onRecordChange);
        es.addEventListener("settlements", onRecordChange);
        es.addEventListener("subscriptions", onRecordChange);
        es.onmessage = onRecordChange;

        es.onerror = () => {
          this.isRealtimeConnected = false;
          try { es.close(); } catch(e) {}
          setTimeout(() => {
            if (this.token) this.connectRealtime();
          }, 5000);
        };
      } catch (err) {
        console.warn("Admin SSE error:", err);
      }
    },

    async silentRefresh() {
      try {
        await Promise.allSettled([
          this.fetchPortfolio(),
          this.fetchWatchlist(),
          this.fetchSubscriptions(),
          this.fetchDistributors(),
          this.fetchSahayaks(),
          this.fetchFieldNetwork()
        ]);
      } catch (err) {
        console.warn("Silent refresh warning:", err);
      }
    },

    logout() {
      if (this.realtimeEventSource) {
        try { this.realtimeEventSource.close(); } catch(e) {}
      }
      this.token = "";
      this.admin = null;
      sessionStorage.removeItem("pb_admin_token");
      sessionStorage.removeItem("pb_admin_user");
      localStorage.removeItem("pb_admin_token");
      localStorage.removeItem("pb_admin_user");
      window.location.href = "/login.html";
    },

    getHeaders() {
      return {
        "Authorization": `Bearer ${this.token}`,
        "Content-Type": "application/json"
      };
    },

    async refresh() {
      await this.loadAll();
      this.showToast("Dashboard refreshed", "info");
    },

    async loadAll() {
      this.loading = true;
      try {
        await this.fetchPortfolio();
        await this.fetchWatchlist();
        await this.fetchPackages();
        await this.fetchSubscriptions();
        await this.fetchDistributors();
        await this.fetchSahayaks();
        await this.fetchFieldNetwork();
      } catch (err) {
        console.error("Error loading admin dashboard data:", err);
        if (err && err.status === 401) {
          this.logout();
        }
      } finally {
        this.loading = false;
      }
    },

    // ---------- Subscriptions & Devotees Management ----------
    subscriptions: [],
    subscriptionsLoading: false,
    subscriptionSearchQuery: "",
    subscriptionFilterStatus: "all",
    showPassbookModal: false,
    passbookData: null,
    passbookLoading: false,

    async fetchSubscriptions() {
      this.subscriptionsLoading = true;
      try {
        const params = new URLSearchParams();
        if (this.subscriptionFilterStatus && this.subscriptionFilterStatus !== "all") {
          params.append("status", this.subscriptionFilterStatus);
        }
        if (this.subscriptionSearchQuery) {
          params.append("search", this.subscriptionSearchQuery);
        }
        const res = await fetch(`/api/admin/subscriptions?${params.toString()}`, {
          headers: this.getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          this.subscriptions = data.subscriptions || [];
        }
      } catch (err) {
        console.error("Error fetching subscriptions:", err);
      } finally {
        this.subscriptionsLoading = false;
      }
    },

    async openPassbook(sub) {
      this.showPassbookModal = true;
      this.passbookLoading = true;
      this.passbookData = null;
      try {
        const res = await fetch(`/api/admin/subscriptions/${sub.id}`, {
          headers: this.getHeaders()
        });
        if (res.ok) {
          this.passbookData = await res.json();
        } else {
          this.showToast("Failed to load passbook ledger", "error");
        }
      } catch (err) {
        this.showToast("Network error loading passbook", "error");
      } finally {
        this.passbookLoading = false;
      }
    },

    async updateTravelStatus(subId, newStatus) {
      try {
        const res = await fetch(`/api/admin/subscriptions/${subId}/travel-status`, {
          method: "PATCH",
          headers: this.getHeaders(),
          body: JSON.stringify({ travel_status: newStatus })
        });
        if (res.ok) {
          this.showToast(`Travel status updated to ${newStatus}`, "success");
          if (this.passbookData && this.passbookData.subscription) {
            this.passbookData.subscription.travel_status = newStatus;
          }
          await this.fetchSubscriptions();
          await this.fetchWatchlist();
        } else {
          const err = await res.json();
          this.showToast(err.message || "Failed to update travel status", "error");
        }
      } catch (e) {
        this.showToast("Network error updating status", "error");
      }
    },

    // ---------- Field Network & Float Monitoring ----------
    fieldNetwork: {
      distributors: [],
      agents: [],
      recent_handovers: []
    },
    fieldNetworkLoading: false,

    async fetchFieldNetwork() {
      this.fieldNetworkLoading = true;
      try {
        const res = await fetch("/api/admin/field-network", {
          headers: this.getHeaders()
        });
        if (res.ok) {
          this.fieldNetwork = await res.json();
        }
      } catch (err) {
        console.error("Error loading field network:", err);
      } finally {
        this.fieldNetworkLoading = false;
      }
    },

    // ---------- Distributor Management & Analytics ----------
    distributors: [],
    distributorsLoading: false,
    distributorSearchQuery: "",
    distributorFilterStatus: "all",
    showDistributorModal: false,
    distributorModalTitle: "Register New Distributor",
    distributorFormError: "",
    savingDistributor: false,
    distributorForm: {
      id: null,
      name: "",
      email: "",
      phone: "",
      password: "",
      is_active: true
    },
    showDistPasswordModal: false,
    distPasswordForm: {
      id: "",
      name: "",
      password: "",
      passwordConfirm: ""
    },
    distPasswordError: "",
    savingDistPassword: false,
    showDistAnalyticsModal: false,
    distAnalyticsLoading: false,
    distAnalyticsData: null,

    async fetchDistributors() {
      this.distributorsLoading = true;
      try {
        const params = new URLSearchParams();
        if (this.distributorFilterStatus && this.distributorFilterStatus !== "all") {
          params.append("status", this.distributorFilterStatus);
        }
        if (this.distributorSearchQuery) {
          params.append("search", this.distributorSearchQuery);
        }
        const res = await fetch(`/api/admin/distributors?${params.toString()}`, {
          headers: this.getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          this.distributors = data.distributors || [];
        }
      } catch (err) {
        console.error("Error fetching distributors:", err);
      } finally {
        this.distributorsLoading = false;
      }
    },

    openRegisterDistributorModal() {
      this.distributorModalTitle = "Register New Regional Distributor";
      this.distributorFormError = "";
      this.distributorForm = {
        id: null,
        name: "",
        email: "",
        phone: "",
        password: "",
        is_active: true
      };
      this.showDistributorModal = true;
    },

    editDistributor(dist) {
      this.distributorModalTitle = "Edit Distributor Profile";
      this.distributorFormError = "";
      this.distributorForm = {
        id: dist.id,
        name: dist.name,
        email: dist.email,
        phone: dist.phone,
        password: "",
        is_active: dist.is_active
      };
      this.showDistributorModal = true;
    },

    async saveDistributor() {
      this.distributorFormError = "";
      this.savingDistributor = true;
      try {
        const isEdit = !!this.distributorForm.id;
        const url = isEdit ? `/api/admin/distributors/${this.distributorForm.id}` : "/api/admin/distributors";
        const method = isEdit ? "PATCH" : "POST";

        const payload = {
          name: this.distributorForm.name,
          phone: this.distributorForm.phone,
          is_active: this.distributorForm.is_active
        };

        if (!isEdit) {
          payload.email = this.distributorForm.email;
          payload.password = this.distributorForm.password;
        }

        const res = await fetch(url, {
          method: method,
          headers: this.getHeaders(),
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          this.showToast(isEdit ? "Distributor updated successfully" : "Distributor registered successfully", "success");
          this.showDistributorModal = false;
          await this.fetchDistributors();
          await this.fetchFieldNetwork();
        } else {
          const err = await res.json();
          this.distributorFormError = err.message || "Failed to save distributor";
        }
      } catch (err) {
        this.distributorFormError = "Network error saving distributor";
      } finally {
        this.savingDistributor = false;
      }
    },

    async toggleDistributorStatus(dist) {
      const nextStatus = !dist.is_active;
      try {
        const res = await fetch(`/api/admin/distributors/${dist.id}`, {
          method: "PATCH",
          headers: this.getHeaders(),
          body: JSON.stringify({ is_active: nextStatus })
        });
        if (res.ok) {
          dist.is_active = nextStatus;
          this.showToast(`Distributor ${dist.name} is now ${nextStatus ? "Active" : "Disabled"}`, "info");
        } else {
          this.showToast("Failed to update distributor status", "error");
        }
      } catch (err) {
        this.showToast("Network error updating status", "error");
      }
    },

    async deleteDistributor(dist) {
      if (!confirm(`Are you sure you want to delete or deactivate distributor "${dist.name}"?`)) return;
      try {
        const res = await fetch(`/api/admin/distributors/${dist.id}`, {
          method: "DELETE",
          headers: this.getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          this.showToast(data.message || "Distributor removed", "info");
          await this.fetchDistributors();
          await this.fetchFieldNetwork();
        } else {
          const err = await res.json();
          this.showToast(err.message || "Failed to delete distributor", "error");
        }
      } catch (err) {
        this.showToast("Network error deleting distributor", "error");
      }
    },

    openDistPasswordModal(dist) {
      this.distPasswordError = "";
      this.distPasswordForm = {
        id: dist.id,
        name: dist.name,
        password: "",
        passwordConfirm: ""
      };
      this.showDistPasswordModal = true;
    },

    async saveDistPassword() {
      this.distPasswordError = "";
      if (!this.distPasswordForm.password || this.distPasswordForm.password.length < 8) {
        this.distPasswordError = "Password must be at least 8 characters.";
        return;
      }
      if (this.distPasswordForm.password !== this.distPasswordForm.passwordConfirm) {
        this.distPasswordError = "Passwords do not match.";
        return;
      }

      this.savingDistPassword = true;
      try {
        const res = await fetch(`/api/admin/distributors/${this.distPasswordForm.id}/reset-password`, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({ password: this.distPasswordForm.password })
        });
        if (res.ok) {
          this.showToast(`Password updated for ${this.distPasswordForm.name}`, "success");
          this.showDistPasswordModal = false;
        } else {
          const err = await res.json();
          this.distPasswordError = err.message || "Failed to update password";
        }
      } catch (err) {
        this.distPasswordError = "Network error updating password";
      } finally {
        this.savingDistPassword = false;
      }
    },

    async openDistributorAnalytics(dist) {
      this.showDistAnalyticsModal = true;
      this.distAnalyticsLoading = true;
      this.distAnalyticsData = null;
      try {
        const res = await fetch(`/api/admin/distributors/${dist.id}/analytics`, {
          headers: this.getHeaders()
        });
        if (res.ok) {
          this.distAnalyticsData = await res.json();
        } else {
          this.showToast("Failed to load distributor analytics", "error");
        }
      } catch (err) {
        this.showToast("Network error loading analytics", "error");
      } finally {
        this.distAnalyticsLoading = false;
      }
    },

    // ---------- Sahayak (Agent) Management & Analytics ----------
    sahayaks: [],
    sahayaksLoading: false,
    sahayakSearchQuery: "",
    sahayakFilterStatus: "all",
    sahayakFilterDistributor: "",
    showSahayakModal: false,
    sahayakModalTitle: "Register New Sahayak",
    sahayakFormError: "",
    savingSahayak: false,
    sahayakForm: {
      id: null,
      name: "",
      email: "",
      phone: "",
      password: "",
      distributor_id: "",
      is_active: true
    },
    showSahayakPasswordModal: false,
    sahayakPasswordForm: {
      id: "",
      name: "",
      password: "",
      passwordConfirm: ""
    },
    sahayakPasswordError: "",
    savingSahayakPassword: false,
    showSahayakAnalyticsModal: false,
    sahayakAnalyticsLoading: false,
    sahayakAnalyticsData: null,

    async fetchSahayaks() {
      this.sahayaksLoading = true;
      try {
        const params = new URLSearchParams();
        if (this.sahayakFilterStatus && this.sahayakFilterStatus !== "all") {
          params.append("status", this.sahayakFilterStatus);
        }
        if (this.sahayakFilterDistributor) {
          params.append("distributor_id", this.sahayakFilterDistributor);
        }
        if (this.sahayakSearchQuery) {
          params.append("search", this.sahayakSearchQuery);
        }
        const res = await fetch(`/api/admin/sahayaks?${params.toString()}`, {
          headers: this.getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          this.sahayaks = data.sahayaks || [];
        }
      } catch (err) {
        console.error("Error fetching sahayaks:", err);
      } finally {
        this.sahayaksLoading = false;
      }
    },

    openRegisterSahayakModal() {
      this.sahayakModalTitle = "Register New Field Sahayak";
      this.sahayakFormError = "";
      this.sahayakForm = {
        id: null,
        name: "",
        email: "",
        phone: "",
        password: "",
        distributor_id: this.distributors.length > 0 ? this.distributors[0].id : "",
        is_active: true
      };
      this.showSahayakModal = true;
    },

    editSahayak(ag) {
      this.sahayakModalTitle = "Edit Sahayak Profile";
      this.sahayakFormError = "";
      this.sahayakForm = {
        id: ag.id,
        name: ag.name,
        email: ag.email,
        phone: ag.phone,
        password: "",
        distributor_id: ag.distributor_id || "",
        is_active: ag.is_active
      };
      this.showSahayakModal = true;
    },

    async saveSahayak() {
      this.sahayakFormError = "";
      this.savingSahayak = true;
      try {
        const isEdit = !!this.sahayakForm.id;
        const url = isEdit ? `/api/admin/sahayaks/${this.sahayakForm.id}` : "/api/admin/sahayaks";
        const method = isEdit ? "PATCH" : "POST";

        const payload = {
          name: this.sahayakForm.name,
          phone: this.sahayakForm.phone,
          distributor_id: this.sahayakForm.distributor_id,
          is_active: this.sahayakForm.is_active
        };

        if (!isEdit) {
          payload.email = this.sahayakForm.email;
          payload.password = this.sahayakForm.password;
        }

        const res = await fetch(url, {
          method: method,
          headers: this.getHeaders(),
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          this.showToast(isEdit ? "Sahayak updated successfully" : "Sahayak registered successfully", "success");
          this.showSahayakModal = false;
          await this.fetchSahayaks();
          await this.fetchFieldNetwork();
        } else {
          const err = await res.json();
          this.sahayakFormError = err.message || "Failed to save Sahayak";
        }
      } catch (err) {
        this.sahayakFormError = "Network error saving Sahayak";
      } finally {
        this.savingSahayak = false;
      }
    },

    async toggleSahayakStatus(ag) {
      const nextStatus = !ag.is_active;
      try {
        const res = await fetch(`/api/admin/sahayaks/${ag.id}`, {
          method: "PATCH",
          headers: this.getHeaders(),
          body: JSON.stringify({ is_active: nextStatus })
        });
        if (res.ok) {
          ag.is_active = nextStatus;
          this.showToast(`Sahayak ${ag.name} is now ${nextStatus ? "Active" : "Disabled"}`, "info");
        } else {
          this.showToast("Failed to update Sahayak status", "error");
        }
      } catch (err) {
        this.showToast("Network error updating status", "error");
      }
    },

    async deleteSahayak(ag) {
      if (!confirm(`Are you sure you want to delete or deactivate Sahayak "${ag.name}"?`)) return;
      try {
        const res = await fetch(`/api/admin/sahayaks/${ag.id}`, {
          method: "DELETE",
          headers: this.getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          this.showToast(data.message || "Sahayak removed", "info");
          await this.fetchSahayaks();
          await this.fetchFieldNetwork();
        } else {
          const err = await res.json();
          this.showToast(err.message || "Failed to delete Sahayak", "error");
        }
      } catch (err) {
        this.showToast("Network error deleting Sahayak", "error");
      }
    },

    openSahayakPasswordModal(ag) {
      this.sahayakPasswordError = "";
      this.sahayakPasswordForm = {
        id: ag.id,
        name: ag.name,
        password: "",
        passwordConfirm: ""
      };
      this.showSahayakPasswordModal = true;
    },

    async saveSahayakPassword() {
      this.sahayakPasswordError = "";
      if (!this.sahayakPasswordForm.password || this.sahayakPasswordForm.password.length < 8) {
        this.sahayakPasswordError = "Password must be at least 8 characters.";
        return;
      }
      if (this.sahayakPasswordForm.password !== this.sahayakPasswordForm.passwordConfirm) {
        this.sahayakPasswordError = "Passwords do not match.";
        return;
      }

      this.savingSahayakPassword = true;
      try {
        const res = await fetch(`/api/admin/sahayaks/${this.sahayakPasswordForm.id}/reset-password`, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({ password: this.sahayakPasswordForm.password })
        });
        if (res.ok) {
          this.showToast(`Password updated for ${this.sahayakPasswordForm.name}`, "success");
          this.showSahayakPasswordModal = false;
        } else {
          const err = await res.json();
          this.sahayakPasswordError = err.message || "Failed to update password";
        }
      } catch (err) {
        this.sahayakPasswordError = "Network error updating password";
      } finally {
        this.savingSahayakPassword = false;
      }
    },

    async openSahayakAnalytics(ag) {
      this.showSahayakAnalyticsModal = true;
      this.sahayakAnalyticsLoading = true;
      this.sahayakAnalyticsData = null;
      try {
        const res = await fetch(`/api/admin/sahayaks/${ag.id}/analytics`, {
          headers: this.getHeaders()
        });
        if (res.ok) {
          this.sahayakAnalyticsData = await res.json();
        } else {
          this.showToast("Failed to load Sahayak analytics", "error");
        }
      } catch (err) {
        this.showToast("Network error loading analytics", "error");
      } finally {
        this.sahayakAnalyticsLoading = false;
      }
    },

    // ---------- Package Manager (ADMN-03) ----------
    packages: [],
    packagesLoading: false,
    showPackageModal: false,
    savingPackage: false,
    packageFormError: "",
    packageForm: {
      id: null,
      title: "",
      destination: "",
      duration_days: 7,
      total_price: 12000,
      allowed_tenures: [6, 9, 12],
      min_emis_to_travel: 2,
      itinerary: "",
      is_active: true,
      coverFile: null
    },

    async fetchPackages() {
      this.packagesLoading = true;
      try {
        const res = await fetch("/api/admin/packages", { headers: this.getHeaders() });
        if (res.ok) {
          const data = await res.json();
          this.packages = data.packages || [];
        }
      } catch (err) {
        console.error("Error loading packages:", err);
      } finally {
        this.packagesLoading = false;
      }
    },

    openCreatePackage() {
      this.packageForm = {
        id: null, title: "", destination: "", duration_days: 7, total_price: 12000,
        allowed_tenures: [6, 9, 12], min_emis_to_travel: 2, itinerary: "",
        is_active: true, coverFile: null
      };
      this.packageFormError = "";
      this.showPackageModal = true;
    },

    openEditPackage(p) {
      this.packageForm = {
        id: p.id,
        title: p.title,
        destination: p.destination,
        duration_days: p.duration_days,
        total_price: p.total_price,
        allowed_tenures: (p.allowed_tenures || []).slice(),
        min_emis_to_travel: p.min_emis_to_travel,
        itinerary: p.itinerary || "",
        is_active: !!p.is_active,
        coverFile: null
      };
      this.packageFormError = "";
      this.showPackageModal = true;
    },

    toggleTenure(t) {
      const list = this.packageForm.allowed_tenures;
      const idx = list.indexOf(t);
      if (idx >= 0) list.splice(idx, 1);
      else list.push(t);
      list.sort((a, b) => a - b);
    },

    async savePackage() {
      this.packageFormError = "";
      if (!this.packageForm.allowed_tenures.length) {
        this.packageFormError = "Select at least one allowed tenure.";
        return;
      }
      this.savingPackage = true;
      try {
        const isEdit = !!this.packageForm.id;
        const payload = {
          title: this.packageForm.title,
          destination: this.packageForm.destination,
          duration_days: this.packageForm.duration_days,
          total_price: this.packageForm.total_price,
          allowed_tenures: this.packageForm.allowed_tenures,
          min_emis_to_travel: this.packageForm.min_emis_to_travel,
          itinerary: this.packageForm.itinerary,
          is_active: this.packageForm.is_active
        };

        const res = await fetch(isEdit ? `/api/admin/packages/${this.packageForm.id}` : "/api/admin/packages", {
          method: isEdit ? "PATCH" : "POST",
          headers: this.getHeaders(),
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
          const fieldErrors = data.data && Object.keys(data.data).length
            ? " — " + Object.entries(data.data).map(([k, v]) => `${k}: ${v}`).join(", ")
            : "";
          throw new Error((data.message || "Save failed") + fieldErrors);
        }

        const pkgId = data.id || this.packageForm.id;
        if (this.packageForm.coverFile) {
          const fd = new FormData();
          fd.append("cover_image", this.packageForm.coverFile);
          const upRes = await fetch(`/api/collections/packages/records/${pkgId}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${this.token}` },
            body: fd
          });
          if (!upRes.ok) {
            const upData = await upRes.json().catch(() => ({}));
            this.showToast("Package saved, but cover image upload failed: " + (upData.message || upRes.status), "error");
          }
        }

        this.showPackageModal = false;
        this.showToast(isEdit ? "Package updated — landing catalog refreshed on next load" : "Package created", "success");
        await this.fetchPackages();
      } catch (err) {
        this.packageFormError = err.message;
      } finally {
        this.savingPackage = false;
      }
    },

    async togglePackageActive(p) {
      try {
        const res = await fetch(`/api/admin/packages/${p.id}`, {
          method: "PATCH",
          headers: this.getHeaders(),
          body: JSON.stringify({ is_active: !p.is_active })
        });
        if (!res.ok) throw new Error("Toggle failed");
        p.is_active = !p.is_active;
        this.showToast(`${p.title} is now ${p.is_active ? "active" : "inactive"}`, p.is_active ? "success" : "info");
      } catch (err) {
        this.showToast(err.message, "error");
      }
    },

    async deletePackage(p) {
      let force = false;
      if (!p.is_active && p.subscriptions_count > 0) {
        if (!confirm(`"${p.title}" is currently INACTIVE and has ${p.subscriptions_count} booking(s).\n\nDo you want to permanently force-delete this package along with its test bookings?`)) {
          return;
        }
        force = true;
      } else {
        if (!confirm(`Delete "${p.title}"?\n\nActive packages with existing bookings will be deactivated instead of deleted.`)) return;
      }

      try {
        const url = `/api/admin/packages/${p.id}` + (force ? "?force=true" : "");
        const res = await fetch(url, {
          method: "DELETE",
          headers: this.getHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Delete failed");
        this.showToast(
          data.soft_deactivated
            ? `"${p.title}" has active bookings — it was deactivated instead of deleted`
            : `"${p.title}" permanently deleted`,
          data.soft_deactivated ? "info" : "success"
        );
        await this.fetchPackages();
      } catch (err) {
        this.showToast(err.message, "error");
      }
    },

    // ---------- Bus Manifest (ADMN-04) ----------
    manifestPackageId: "",
    manifestData: null,
    manifestLoading: false,
    manifestError: "",

    async loadManifest() {
      if (!this.manifestPackageId) return;
      this.manifestLoading = true;
      this.manifestError = "";
      try {
        const res = await fetch(
          `/api/admin/manifest?tour=${encodeURIComponent(this.manifestPackageId)}`,
          { headers: this.getHeaders() }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load manifest");
        this.manifestData = data;
      } catch (err) {
        this.manifestError = err.message;
        this.manifestData = null;
      } finally {
        this.manifestLoading = false;
      }
    },

    async downloadManifestCsv() {
      if (!this.manifestPackageId) return;
      this.manifestError = "";
      try {
        const res = await fetch(
          `/api/admin/manifest?tour=${encodeURIComponent(this.manifestPackageId)}&format=csv`,
          { headers: this.getHeaders() }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "CSV export failed");
        }
        const blob = await res.blob();
        const cd = res.headers.get("Content-Disposition") || "";
        const match = cd.match(/filename="?([^";]+)"?/i);
        const filename = match ? match[1] : "manifest.csv";

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        this.showToast(`Manifest downloaded: ${filename}`, "success");
      } catch (err) {
        this.manifestError = err.message;
        this.showToast(err.message, "error");
      }
    },

    printManifest() {
      if (!this.manifestData) return;
      window.print();
    },

    async fetchPortfolio() {
      const res = await fetch("/api/admin/portfolio", { headers: this.getHeaders() });
      if (res.status === 401) throw { status: 401 };
      if (res.ok) {
        const data = await res.json();
        this.metrics = data.metrics;
      } else if (res.status === 403) {
        this.showToast("Administrator access required", "error");
        this.logout();
      }
    },

    async fetchWatchlist() {
      const res = await fetch(
        `/api/admin/risk-watchlist?sort=${this.sortBy}&order=${this.sortOrder}`,
        { headers: this.getHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        this.watchlist = data.watchlist || [];
      }
    },

    setSort(key) {
      this.sortBy = key;
      this.sortOrder = key === "name" ? "asc" : "desc";
      this.fetchWatchlist();
    },

    showToast(msg, type = "info") {
      this.toastMessage = msg;
      this.toastType = type;
      setTimeout(() => {
        if (this.toastMessage === msg) {
          this.toastMessage = "";
        }
      }, 4500);
    }
  };
}

window.adminApp = adminApp;

if (typeof window.Alpine !== "undefined") {
  window.Alpine.data("adminApp", adminApp);
} else {
  document.addEventListener("alpine:init", () => {
    window.Alpine.data("adminApp", adminApp);
  });
}
