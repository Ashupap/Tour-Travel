// pb_public/distributor/distributor.js
// Distributor Dashboard interactive controller (DIST-01..05, SEC-04)

function distributorApp() {
  return {
    token: sessionStorage.getItem("pb_distributor_token") || localStorage.getItem("pb_distributor_token") || "",
    distributor: null,
    isRealtimeConnected: false,
    realtimeEventSource: null,
    _realtimeTimer: null,
    metrics: {
      total_active_subscriptions: 0,
      total_overdue_amount: 0,
      collected_today: 0,
      cash_in_agents_custody: 0,
      total_cash_in_custody: 0,
      total_settled_amount: 0,
      active_sahayaks_count: 0,
      devotees_count: 0
    },
    packages: [],
    agents: [],
    delinquents: [],
    handovers: [],
    devotees: [],
    handoverHistory: [],
    otpInputs: {},
    activeTab: "overview",
    loading: false,
    toastMessage: "",
    toastType: "info",
    loginEmail: "tarini_hub@bharatyatra.local",
    loginPassword: "password123456",
    loginError: "",

    // Filters & Search
    devoteeSearch: "",
    devoteeFilter: "all",
    agentSearch: "",

    // Sahayak Registration / Edit Modal
    showSahayakModal: false,
    isEditingSahayak: false,
    sahayakForm: {
      id: "",
      name: "",
      phone: "",
      email: "",
      password: "",
      is_active: true
    },
    sahayakFormError: "",

    // Password Reset Modal
    showPasswordModal: false,
    passwordTarget: null,
    newPassword: "",
    passwordError: "",

    // Sahayak Analytics Drilldown Modal
    showDrilldownModal: false,
    drilldownLoading: false,
    drilldownData: null,

    // Transactions Ledger
    transactions: [],
    transactionSummary: { total_transactions: 0, total_collected: 0, total_in_safe: 0, total_in_transit: 0 },
    txSearch: "",
    txCustodyFilter: "all",
    txModeFilter: "all",
    txSahayakFilter: "all",
    showTxModal: false,
    selectedTx: null,

    async init() {
      if (!this.token) {
        window.location.href = "/login.html?redirect=" + encodeURIComponent(window.location.pathname + window.location.search);
        return;
      }
      try {
        const storedUser = sessionStorage.getItem("pb_distributor_user") || localStorage.getItem("pb_distributor_user");
        if (storedUser) this.distributor = JSON.parse(storedUser);
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
            console.warn("Distributor realtime handshake error:", err);
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
        console.warn("Distributor SSE error:", err);
      }
    },

    async silentRefresh() {
      try {
        await Promise.allSettled([
          this.fetchAnalytics(),
          this.fetchAgents(),
          this.fetchDelinquents(),
          this.fetchHandovers(),
          this.fetchDevotees(),
          this.fetchTransactions()
        ]);
      } catch (err) {
        console.warn("Distributor silent refresh warning:", err);
      }
    },

    logout() {
      if (this.realtimeEventSource) {
        try { this.realtimeEventSource.close(); } catch(e) {}
      }
      this.token = "";
      this.distributor = null;
      sessionStorage.removeItem("pb_distributor_token");
      sessionStorage.removeItem("pb_distributor_user");
      localStorage.removeItem("pb_distributor_token");
      localStorage.removeItem("pb_distributor_user");
      window.location.href = "/login.html";
    },

    getHeaders() {
      return {
        "Authorization": `Bearer ${this.token}`,
        "Content-Type": "application/json"
      };
    },

    async loadAll() {
      this.loading = true;
      try {
        await this.fetchAnalytics();
        await this.fetchAgents();
        await this.fetchDelinquents();
        await this.fetchHandovers();
        await this.fetchDevotees();
        await this.fetchHandoverHistory();
        await this.fetchTransactions();
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        if (err.status === 401) {
          this.logout();
        }
      } finally {
        this.loading = false;
      }
    },

    async fetchAnalytics() {
      const res = await fetch("/api/distributor/analytics", { headers: this.getHeaders() });
      if (res.status === 401) throw { status: 401 };
      if (res.ok) {
        const data = await res.json();
        this.distributor = data.distributor;
        this.metrics = {
          total_active_subscriptions: data.metrics ? data.metrics.total_active_subscriptions : (data.active_subscriptions_count || 0),
          total_overdue_amount: data.metrics ? data.metrics.total_overdue_amount : (data.total_overdue || 0),
          collected_today: data.metrics ? data.metrics.collected_today : (data.collected_today || 0),
          cash_in_agents_custody: data.metrics ? data.metrics.cash_in_agents_custody : (data.total_cash_in_transit || 0),
          total_cash_in_custody: data.metrics ? (data.metrics.cash_in_custody || data.total_cash_in_custody || 0) : (data.total_cash_in_custody || 0),
          total_settled_amount: data.metrics ? (data.metrics.total_settled_cash || data.metrics.total_settled_amount || 0) : (data.total_settled_amount || 0),
          active_sahayaks_count: data.metrics ? (data.metrics.active_sahayaks_count || data.metrics.total_sahayaks || 0) : (data.active_sahayaks_count || 0),
          devotees_count: data.metrics ? (data.metrics.devotees_count || data.metrics.total_active_subscriptions || 0) : (data.devotees_count || 0)
        };
        this.packages = data.packages || data.packages_breakdown || [];
      }
    },

    async fetchAgents() {
      const res = await fetch("/api/distributor/sahayaks", { headers: this.getHeaders() });
      if (res.ok) {
        const data = await res.json();
        this.agents = data.items || data.agents || [];
        this.agentsWithFloat = this.agents.filter(a => (Number(a.cash_in_custody) || 0) > 0);
        if (this.agents.length > 0) {
          this.metrics.active_sahayaks_count = this.agents.filter(a => a.is_active).length;
        }
      }
    },

    async fetchDelinquents() {
      const res = await fetch("/api/distributor/delinquents", { headers: this.getHeaders() });
      if (res.ok) {
        const data = await res.json();
        this.delinquents = data.delinquents || [];
      }
    },

    async fetchHandovers() {
      const res = await fetch("/api/distributor/pending-handovers", { headers: this.getHeaders() });
      if (res.ok) {
        const data = await res.json();
        this.handovers = data.handovers || [];
      }
    },

    async fetchDevotees() {
      const res = await fetch("/api/distributor/devotees", { headers: this.getHeaders() });
      if (res.ok) {
        const data = await res.json();
        this.devotees = data.devotees || [];
        if (this.devotees.length > 0) {
          this.metrics.devotees_count = this.devotees.length;
        }
      }
    },

    async fetchHandoverHistory() {
      const res = await fetch("/api/distributor/handover-history", { headers: this.getHeaders() });
      if (res.ok) {
        const data = await res.json();
        this.handoverHistory = data.handovers || [];
      }
    },

    async fetchTransactions() {
      const res = await fetch("/api/distributor/transactions", { headers: this.getHeaders() });
      if (res.ok) {
        const data = await res.json();
        this.transactions = data.transactions || [];
        if (data.summary) {
          this.transactionSummary = data.summary;
        }
      }
    },

    get filteredTransactions() {
      let list = this.transactions || [];
      if (this.txSearch) {
        const q = this.txSearch.toLowerCase().trim();
        list = list.filter(t => 
          (t.customer_name && t.customer_name.toLowerCase().includes(q)) ||
          (t.customer_phone && t.customer_phone.includes(q)) ||
          (t.booking_code && t.booking_code.toLowerCase().includes(q)) ||
          (t.receipt_slip_id && t.receipt_slip_id.toLowerCase().includes(q)) ||
          (t.agent_name && t.agent_name.toLowerCase().includes(q))
        );
      }
      if (this.txCustodyFilter !== "all") {
        list = list.filter(t => t.handover_status === this.txCustodyFilter);
      }
      if (this.txModeFilter !== "all") {
        list = list.filter(t => t.payment_mode === this.txModeFilter);
      }
      if (this.txSahayakFilter !== "all") {
        list = list.filter(t => t.agent_id === this.txSahayakFilter || t.agent_name === this.txSahayakFilter);
      }
      return list;
    },

    openTransactionModal(tx) {
      this.selectedTx = tx;
      this.showTxModal = true;
    },

    get agentsWithFloat() {
      return (this.agents || []).filter(a => (Number(a.cash_in_custody) || 0) > 0);
    },

    async verifyHandover(handoverId) {
      const code = (this.otpInputs[handoverId] || "").trim();
      if (!code || (code.length !== 4 && code.length !== 6)) {
        this.showToast("Please enter the 6-digit Sahayak verification passcode", "error");
        return;
      }

      this.loading = true;
      try {
        const res = await fetch("/api/handover/verify", {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            handover_id: handoverId,
            passcode: code,
            otp_code: code
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Passcode verification failed");
        }

        this.showToast(`✓ Cash handover verified! ${data.installments_confirmed} installments transferred into safe.`, "success");
        this.otpInputs[handoverId] = "";
        await this.loadAll();
      } catch (err) {
        this.showToast(err.message, "error");
      } finally {
        this.loading = false;
      }
    },

    // Sahayak Registration & Management
    openCreateSahayakModal() {
      this.isEditingSahayak = false;
      this.sahayakForm = {
        id: "",
        name: "",
        phone: "",
        email: "",
        password: "",
        is_active: true
      };
      this.sahayakFormError = "";
      this.showSahayakModal = true;
    },

    openEditSahayakModal(agent) {
      this.isEditingSahayak = true;
      this.sahayakForm = {
        id: agent.id,
        name: agent.name,
        phone: agent.phone,
        email: agent.email,
        password: "",
        is_active: agent.is_active
      };
      this.sahayakFormError = "";
      this.showSahayakModal = true;
    },

    async saveSahayak() {
      this.sahayakFormError = "";
      const { name, phone, email, password, is_active } = this.sahayakForm;

      if (!name || name.trim().length < 2) {
        this.sahayakFormError = "Full name is required (min 2 characters).";
        return;
      }
      if (!phone || phone.trim().length < 10) {
        this.sahayakFormError = "Valid 10-digit mobile number is required.";
        return;
      }

      this.loading = true;
      try {
        if (!this.isEditingSahayak) {
          if (!email || !email.includes("@")) {
            throw new Error("Valid email address is required for login.");
          }
          if (!password || password.length < 8) {
            throw new Error("Password must be at least 8 characters.");
          }

          const res = await fetch("/api/distributor/sahayaks", {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify({ name, phone, email, password })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Failed to register Sahayak");

          this.showToast(`✓ Field Sahayak ${name} successfully enrolled in your hub!`, "success");
        } else {
          const res = await fetch(`/api/distributor/sahayaks/${this.sahayakForm.id}`, {
            method: "PATCH",
            headers: this.getHeaders(),
            body: JSON.stringify({ name, phone, is_active })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Failed to update Sahayak");

          this.showToast(`✓ Sahayak details updated.`, "success");
        }

        this.showSahayakModal = false;
        await this.loadAll();
      } catch (err) {
        this.sahayakFormError = err.message;
      } finally {
        this.loading = false;
      }
    },

    async toggleSahayakActive(agent) {
      const newStatus = !agent.is_active;
      const confirmMsg = newStatus 
        ? `Reactivate Sahayak "${agent.name}"? They will regain access to collection routes.`
        : `Deactivate Sahayak "${agent.name}"? They will be blocked from logging in.`;
      
      if (!confirm(confirmMsg)) return;

      this.loading = true;
      try {
        const res = await fetch(`/api/distributor/sahayaks/${agent.id}`, {
          method: "PATCH",
          headers: this.getHeaders(),
          body: JSON.stringify({ is_active: newStatus })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Status update failed");

        this.showToast(`✓ Sahayak ${newStatus ? 'activated' : 'deactivated'}.`, "success");
        await this.loadAll();
      } catch (err) {
        this.showToast(err.message, "error");
      } finally {
        this.loading = false;
      }
    },

    openResetPasswordModal(agent) {
      this.passwordTarget = agent;
      this.newPassword = "";
      this.passwordError = "";
      this.showPasswordModal = true;
    },

    async savePassword() {
      this.passwordError = "";
      if (!this.newPassword || this.newPassword.length < 8) {
        this.passwordError = "Password must be at least 8 characters.";
        return;
      }

      this.loading = true;
      try {
        const res = await fetch(`/api/distributor/sahayaks/${this.passwordTarget.id}/reset-password`, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({ password: this.newPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Password reset failed");

        this.showToast(`✓ Password reset for ${this.passwordTarget.name}`, "success");
        this.showPasswordModal = false;
      } catch (err) {
        this.passwordError = err.message;
      } finally {
        this.loading = false;
      }
    },

    // Sahayak Analytics Drilldown
    async openSahayakDrilldown(agent) {
      this.drilldownLoading = true;
      this.drilldownData = null;
      this.showDrilldownModal = true;

      try {
        const res = await fetch(`/api/distributor/sahayaks/${agent.id}/analytics`, {
          headers: this.getHeaders()
        });
        if (!res.ok) throw new Error("Failed to load Sahayak details");
        this.drilldownData = await res.json();
      } catch (err) {
        this.showToast(err.message, "error");
        this.showDrilldownModal = false;
      } finally {
        this.drilldownLoading = false;
      }
    },

    // Filtered Views
    get filteredDevotees() {
      let list = this.devotees;
      if (this.devoteeFilter === "unlocked") {
        list = list.filter(d => d.travel_status === "unlocked");
      } else if (this.devoteeFilter === "progress") {
        list = list.filter(d => d.travel_status !== "unlocked" && d.overdue_amount === 0);
      } else if (this.devoteeFilter === "overdue") {
        list = list.filter(d => d.overdue_amount > 0);
      }

      if (this.devoteeSearch.trim()) {
        const q = this.devoteeSearch.toLowerCase().trim();
        list = list.filter(d => 
          (d.customer_name && d.customer_name.toLowerCase().includes(q)) ||
          (d.booking_code && d.booking_code.toLowerCase().includes(q)) ||
          (d.customer_phone && d.customer_phone.includes(q)) ||
          (d.agent_name && d.agent_name.toLowerCase().includes(q))
        );
      }
      return list;
    },

    get filteredAgents() {
      if (!this.agentSearch.trim()) return this.agents;
      const q = this.agentSearch.toLowerCase().trim();
      return this.agents.filter(a => 
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.phone && a.phone.includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q))
      );
    },

    // Print EOD Settlement Report
    printTerritoryReport() {
      window.print();
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

window.distributorApp = distributorApp;
