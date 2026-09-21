// pb_public/distributor/distributor.js
// Distributor Dashboard interactive controller (DIST-01..04, SEC-04)

function distributorApp() {
  return {
    token: localStorage.getItem("pb_distributor_token") || "",
    distributor: null,
    metrics: {
      total_active_subscriptions: 0,
      total_overdue_amount: 0,
      collected_today: 0,
      cash_in_agents_custody: 0
    },
    agents: [],
    delinquents: [],
    handovers: [],
    otpInputs: {},
    activeTab: "overview",
    loading: false,
    toastMessage: "",
    toastType: "info",
    loginEmail: "distributor1@bharatyatra.local",
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
        const res = await fetch("/api/collections/users/auth-with-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identity: this.loginEmail,
            password: this.loginPassword
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Invalid email or password");
        }

        if (data.record.role !== "distributor" && data.record.role !== "admin") {
          throw new Error("Access denied: Your account role is " + data.record.role);
        }

        this.token = data.token;
        this.distributor = data.record;
        localStorage.setItem("pb_distributor_token", this.token);
        this.showToast(`Welcome, ${data.record.name}!`, "success");
        await this.loadAll();
      } catch (err) {
        this.loginError = err.message;
      } finally {
        this.loading = false;
      }
    },

    logout() {
      this.token = "";
      this.distributor = null;
      localStorage.removeItem("pb_distributor_token");
      this.showToast("Signed out successfully", "info");
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
        await Promise.all([
          this.fetchAnalytics(),
          this.fetchAgents(),
          this.fetchDelinquents(),
          this.fetchHandovers()
        ]);
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
        this.metrics = data.metrics;
      }
    },

    async fetchAgents() {
      const res = await fetch("/api/distributor/agents", { headers: this.getHeaders() });
      if (res.ok) {
        const data = await res.json();
        this.agents = data.agents || [];
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

    async verifyHandover(handoverId) {
      const otp = (this.otpInputs[handoverId] || "").trim();
      if (!otp || otp.length !== 4) {
        this.showToast("Please enter a valid 4-digit numeric OTP code", "error");
        return;
      }

      this.loading = true;
      try {
        const res = await fetch("/api/handover/verify", {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            handover_id: handoverId,
            otp_code: otp
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "OTP verification failed");
        }

        this.showToast(`✓ Cash handover verified! ${data.installments_confirmed} installments confirmed.`, "success");
        this.otpInputs[handoverId] = "";
        await this.loadAll();
      } catch (err) {
        this.showToast(err.message, "error");
      } finally {
        this.loading = false;
      }
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
