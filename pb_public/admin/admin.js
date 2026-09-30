// pb_public/admin/admin.js
// Admin Control Center interactive controller (ADMN-01..04, SEC-04)

function adminApp() {
  return {
    token: localStorage.getItem("pb_admin_token") || "",
    admin: null,
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
      if (this.token) {
        await this.loadAll();
      }
    },

    async login() {
      this.loginError = "";
      this.loading = true;
      try {
        let token = "";
        let record = null;

        // 1) Try an app user with role = admin
        const res = await fetch("/api/collections/users/auth-with-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identity: this.loginEmail,
            password: this.loginPassword
          })
        });
        const data = await res.json();

        if (res.ok && data.record) {
          if (data.record.role !== "admin") {
            throw new Error("Access denied: administrator role required (your role is " + data.record.role + ")");
          }
          token = data.token;
          record = data.record;
        } else {
          // 2) Fallback: PocketBase superuser (no role field, full bypass)
          const suRes = await fetch("/api/admins/auth-with-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              identity: this.loginEmail,
              password: this.loginPassword
            })
          });
          const suData = await suRes.json();
          if (!suRes.ok) {
            throw new Error(data.message || suData.message || "Invalid email or password");
          }
          token = suData.token;
          record = { name: suData.admin.name || "Superuser", email: suData.admin.email, role: "superuser" };
        }

        this.token = token;
        this.admin = record;
        localStorage.setItem("pb_admin_token", this.token);
        this.showToast(`Welcome, ${record.name}!`, "success");
        await this.loadAll();
      } catch (err) {
        this.loginError = err.message;
      } finally {
        this.loading = false;
      }
    },

    logout() {
      this.token = "";
      this.admin = null;
      localStorage.removeItem("pb_admin_token");
      this.showToast("Signed out successfully", "info");
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
        await Promise.all([
          this.fetchPortfolio(),
          this.fetchWatchlist(),
          this.fetchPackages(),
          this.fetchSubscriptions(),
          this.fetchFieldNetwork()
        ]);
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
      if (!confirm(`Delete "${p.title}"?\n\nPackages with existing bookings are deactivated instead of deleted.`)) return;
      try {
        const res = await fetch(`/api/admin/packages/${p.id}`, {
          method: "DELETE",
          headers: this.getHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Delete failed");
        this.showToast(
          data.soft_deactivated
            ? `"${p.title}" has active bookings — it was deactivated instead of deleted`
            : `"${p.title}" deleted`,
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
