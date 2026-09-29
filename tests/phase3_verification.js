// tests/phase3_verification.js
// Automated End-to-End Integration Verification Suite for Phase 3: Public Landing & Distributor
// Verifies: LAND-01..05, DIST-01..04, SEC-04

import { spawn } from "child_process";
import { setTimeout as sleep } from "timers/promises";
import fs from "fs";

const PB_PORT = 8090;
const BASE_URL = `http://127.0.0.1:${PB_PORT}`;
const ADMIN_EMAIL = "admin@bharatyatra.local";
const ADMIN_PASSWORD = "password123456";

let pbProcess = null;

async function startPocketBase() {
  console.log("Starting PocketBase server for Phase 3 test suite...");
  pbProcess = spawn(".\\pocketbase.exe", ["serve", `--http=127.0.0.1:${PB_PORT}`], {
    stdio: "pipe"
  });

  pbProcess.stdout.on("data", (d) => {
    console.log("[PB]", d.toString().trim());
  });
  pbProcess.stderr.on("data", (d) => {
    console.error("[PB-ERR]", d.toString().trim());
  });

  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) {
        console.log("✓ PocketBase server is healthy on port", PB_PORT);
        return;
      }
    } catch (e) {
      await sleep(300);
    }
  }
  throw new Error("PocketBase failed to start within timeout");
}

function stopPocketBase() {
  if (pbProcess) {
    console.log("Shutting down PocketBase server...");
    pbProcess.kill();
    pbProcess = null;
  }
}

async function main() {
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message, reqId) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] [${reqId}] ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] [${reqId}] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    await startPocketBase();

    // 1. Authenticate Admin
    console.log("\n--- Authenticating Admin & Seeding Phase 3 Test Data ---");
    const adminLoginRes = await fetch(`${BASE_URL}/api/admins/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    const adminData = await adminLoginRes.json();
    assert(adminLoginRes.ok && adminData.token, "Admin login successful", "AUTH-01");
    const adminHeaders = {
      "Authorization": adminData.token,
      "Content-Type": "application/json"
    };

    const rand = Math.floor(1000 + Math.random() * 9000);

    // Create Distributor
    const distEmail = `dist_p3_${rand}@bharatyatra.local`;
    const distRes = await (await fetch(`${BASE_URL}/api/collections/users/records`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        email: distEmail,
        password: "password123456",
        passwordConfirm: "password123456",
        name: `Distributor P3 ${rand}`,
        role: "distributor",
        phone: `9811${rand}00`,
        is_active: true
      })
    })).json();
    assert(distRes.id, "Phase 3 Distributor created", "DAT-01");

    // Create Agent under Distributor
    const agentEmail = `agent_p3_${rand}@bharatyatra.local`;
    const agentRes = await (await fetch(`${BASE_URL}/api/collections/users/records`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        email: agentEmail,
        password: "password123456",
        passwordConfirm: "password123456",
        name: `Agent P3 ${rand}`,
        role: "agent",
        phone: `9822${rand}00`,
        distributor_id: distRes.id,
        is_active: true
      })
    })).json();
    assert(agentRes.id, "Phase 3 Agent created under Distributor", "DAT-01");

    // Authenticate Distributor & Agent
    const distAuth = await (await fetch(`${BASE_URL}/api/collections/users/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: distEmail, password: "password123456" })
    })).json();
    const distHeaders = {
      "Authorization": `Bearer ${distAuth.token}`,
      "Content-Type": "application/json"
    };

    const agentAuth = await (await fetch(`${BASE_URL}/api/collections/users/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: agentEmail, password: "password123456" })
    })).json();
    const agentHeaders = {
      "Authorization": `Bearer ${agentAuth.token}`,
      "Content-Type": "application/json"
    };

    // Create Tour Package
    const pkgRes = await (await fetch(`${BASE_URL}/api/collections/packages/records`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        title: "Char Dham Yatra Phase 3",
        destination: "Uttarakhand",
        duration_days: 12,
        total_price: 36000,
        allowed_tenures: [6, 9, 12],
        min_emis_to_travel: 2,
        is_active: true
      })
    })).json();
    assert(pkgRes.id, "Phase 3 Tour Package created", "DAT-02");

    // Create Subscription
    const customerPhone = `9833${rand}11`;
    const bookingCode = `BY-P3-${rand}`;
    const subRes = await (await fetch(`${BASE_URL}/api/collections/subscriptions/records`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        booking_code: bookingCode,
        customer_name: "Ramesh Sharma",
        customer_phone: customerPhone,
        customer_address: "Village Rampur, Ward 4",
        package_id: pkgRes.id,
        agent_id: agentRes.id,
        distributor_id: distRes.id,
        tenure_months: 6,
        total_amount: 36000,
        monthly_emi_amount: 6000,
        paid_emis_count: 0,
        travel_status: "locked",
        booking_date: "2026-09-21 12:00:00.000Z"
      })
    })).json();
    assert(subRes.id, "Subscription created for customer", "DAT-03");

    // 2. Test LAND-01: Three.js Hero 3D Bus Experience & Public Landing
    console.log("\n--- Testing Public Landing & 3D Bus Assets (LAND-01) ---");
    const indexRes = await fetch(`${BASE_URL}/index.html`);
    const indexHtml = await indexRes.text();
    assert(indexRes.ok, "GET /index.html serves public landing page (200)", "LAND-01");
    assert(indexHtml.includes("hero-slide") && indexHtml.includes("/images/hero-1.jpg"), "Landing hero renders Ken Burns image slides", "LAND-01");
    assert(indexHtml.includes("/js/reveal.js"), "Landing page links reveal.js scroll animation script", "LAND-01");
    assert(!indexHtml.includes("/js/bus-3d.js") && !indexHtml.includes("hero-bus-canvas-container"), "Landing page no longer loads old 3D bus canvas", "LAND-01");

    const swRes = await fetch(`${BASE_URL}/sw.js`);
    const swJs = await swRes.text();
    assert(swRes.ok && swJs.includes("/js/reveal.js"), "Service worker precaches reveal.js asset", "LAND-01");

    const manifestRes = await fetch(`${BASE_URL}/manifest.json`);
    const manifest = await manifestRes.json();
    assert(manifestRes.ok && manifest.start_url === "/", "Manifest start_url points at public landing", "LAND-01");

    // 3. Test LAND-02 & LAND-03: Dynamic EMI Calculator & Vanilla-Tilt 3D Cards
    console.log("\n--- Testing Package Catalog, Vanilla-Tilt & EMI Calculator (LAND-02, LAND-03) ---");
    const tiltRes = await fetch(`${BASE_URL}/js/vanilla-tilt.min.js`);
    assert(tiltRes.ok, "GET /js/vanilla-tilt.min.js is bundled locally (200)", "LAND-03");

    const landingJsRes = await fetch(`${BASE_URL}/js/landing.js`);
    const landingJs = await landingJsRes.text();
    assert(landingJsRes.ok && landingJs.includes("TOUR_PACKAGES"), "landing.js provides tour packages catalog", "LAND-03");
    assert(landingJs.includes("monthlyEmi"), "landing.js computes reactive monthly EMI", "LAND-02");
    assert(landingJs.includes("VanillaTilt.init"), "landing.js initializes Vanilla-Tilt on package cards", "LAND-03");

    assert(indexHtml.includes("package-tilt-card"), "Landing page renders package-tilt-card elements", "LAND-03");
    assert(indexHtml.includes("emi-calculator-section"), "Landing page contains interactive EMI calculator section", "LAND-02");

    // 4. Test LAND-04 & LAND-05: Public Booking Status & Golden Travel Eligibility Pass
    console.log("\n--- Testing Public Booking Status & Golden Pass (LAND-04, LAND-05) ---");
    const notFoundRes = await fetch(`${BASE_URL}/api/public/booking-status?query=INVALID_CODE_9999`);
    assert(notFoundRes.status === 404, "Invalid booking lookup returns 404 Not Found", "LAND-04");

    // JSON lookup by booking code
    const statusJsonRes = await fetch(`${BASE_URL}/api/public/booking-status?query=${bookingCode}`);
    const statusJson = await statusJsonRes.json();
    assert(statusJsonRes.ok && statusJson.success, "GET /api/public/booking-status returns verified booking data (200)", "LAND-04");
    assert(statusJson.subscription.booking_code === bookingCode, "Booking code matches query", "LAND-04");
    assert(statusJson.subscription.is_eligible_to_travel === false, "Travel status is initially locked (0/2 EMIs)", "LAND-04");
    assert(statusJson.installments.length === 6, "Payment history includes all 6 installments", "LAND-05");

    // HTMX lookup by phone number -> returns Golden VIP Pass HTML snippet
    const statusHtmxRes = await fetch(`${BASE_URL}/api/public/booking-status?query=${customerPhone}`, {
      headers: { "HX-Request": "true" }
    });
    const statusHtml = await statusHtmxRes.text();
    console.log("statusHtmxRes status:", statusHtmxRes.status, "body:", statusHtml);
    assert(statusHtmxRes.ok, "HTMX query to /api/public/booking-status returns 200 OK", "LAND-04");
    assert(statusHtml.includes("BHARATYATRA OFFICIAL TRAVEL PASS"), "HTMX response renders Golden VIP Travel Pass", "LAND-04");
    assert(statusHtml.includes("TRAVEL LOCKED"), "Travel pass displays TRAVEL LOCKED badge", "LAND-04");
    assert(statusHtml.includes("Print Pass"), "Travel pass includes Print Pass button", "LAND-05");

    // Now pay 2 installments to unlock travel threshold (HOOK-02) via batch-sync
    const instList = await (await fetch(
      `${BASE_URL}/api/collections/installments/records?filter=subscription_id='${subRes.id}'&sort=installment_no`,
      { headers: adminHeaders }
    )).json();

    const batchRes = await fetch(`${BASE_URL}/api/agent/batch-sync`, {
      method: "POST",
      headers: agentHeaders,
      body: JSON.stringify({
        items: [
          {
            installment_id: instList.items[0].id,
            payment_mode: "cash",
            amount: 6000,
            paid_at: new Date().toISOString().replace("T", " "),
            receipt_slip_id: `SLIP-202609-${rand}-01`,
            idempotency_key: `${agentRes.id}-${instList.items[0].id}-${Date.now()}`
          },
          {
            installment_id: instList.items[1].id,
            payment_mode: "cash",
            amount: 6000,
            paid_at: new Date().toISOString().replace("T", " "),
            receipt_slip_id: `SLIP-202609-${rand}-02`,
            idempotency_key: `${agentRes.id}-${instList.items[1].id}-${Date.now()}`
          }
        ]
      })
    });
    const batchData = await batchRes.json();
    assert(batchRes.ok, "Paid 2 installments via batch-sync", "HOOK-02");

    // Verify unlocked Golden Pass
    const unlockedRes = await fetch(`${BASE_URL}/api/public/booking-status?query=${bookingCode}`, {
      headers: { "HX-Request": "true" }
    });
    const unlockedHtml = await unlockedRes.text();
    console.log("unlockedHtml contains ELIGIBLE:", unlockedHtml.includes("ELIGIBLE TO TRAVEL"));
    console.log("unlockedHtml snippet:", unlockedHtml.substring(0, 500));
    assert(unlockedHtml.includes("ELIGIBLE TO TRAVEL"), "Travel pass flips to ELIGIBLE TO TRAVEL upon reaching 2 EMIs", "LAND-04");

    // 5. Test DIST-01, DIST-03, DIST-04, SEC-04: Distributor Dashboard & Analytics
    console.log("\n--- Testing Distributor Dashboard & Security (DIST-01, DIST-03, DIST-04, SEC-04) ---");
    // SEC-04 Role validation
    const unauthDistRes = await fetch(`${BASE_URL}/api/distributor/analytics`);
    assert(unauthDistRes.status === 401, "Unauthenticated request to /api/distributor/analytics rejected (401)", "SEC-04");

    const agentDistRes = await fetch(`${BASE_URL}/api/distributor/analytics`, { headers: agentHeaders });
    assert(agentDistRes.status === 403, "Agent role rejected from distributor analytics (403)", "SEC-04");

    // DIST-01 Territory Analytics
    const distAnalyticsRes = await fetch(`${BASE_URL}/api/distributor/analytics`, { headers: distHeaders });
    const distAnalytics = await distAnalyticsRes.json();
    console.log("distAnalytics metrics:", JSON.stringify(distAnalytics.metrics));
    assert(distAnalyticsRes.ok, "GET /api/distributor/analytics succeeds with 200", "DIST-01");
    assert(distAnalytics.metrics.total_active_subscriptions >= 1, "Analytics reflects active territory subscriptions", "DIST-01");
    assert(distAnalytics.metrics.collected_today >= 12000, "Analytics reflects today's collections (₹12,000)", "DIST-01");
    assert(distAnalytics.metrics.cash_in_agents_custody >= 12000, "Analytics reflects cash held in agent custody", "DIST-01");

    // DIST-03 Subordinate Agent Roster
    const agentsRes = await fetch(`${BASE_URL}/api/distributor/agents`, { headers: distHeaders });
    const agentsData = await agentsRes.json();
    assert(agentsRes.ok && agentsData.count >= 1, "GET /api/distributor/agents returns territory agents", "DIST-03");
    const agentInRoster = agentsData.agents.find((a) => a.id === agentRes.id);
    assert(agentInRoster != null, "Created agent appears in territory roster", "DIST-03");
    assert(agentInRoster.cash_in_custody >= 12000, "Roster correctly aggregates agent's cash in hand (₹12,000)", "DIST-03");

    // DIST-04 Delinquent Warnings API
    const delinquentsRes = await fetch(`${BASE_URL}/api/distributor/delinquents`, { headers: distHeaders });
    const delinquentsData = await delinquentsRes.json();
    assert(delinquentsRes.ok && Array.isArray(delinquentsData.delinquents), "GET /api/distributor/delinquents succeeds with 200", "DIST-04");

    // Route mapping for /distributor/dashboard
    const distDashboardRes = await fetch(`${BASE_URL}/distributor/dashboard`);
    assert(distDashboardRes.ok || distDashboardRes.status === 302, "Route /distributor/dashboard is reachable (200/302)", "DIST-01");

    // 6. Test DIST-02: Pending Handovers & OTP Verification
    console.log("\n--- Testing Distributor Handover Panel (DIST-02) ---");
    // Agent initiates handover
    const initiateRes = await fetch(`${BASE_URL}/api/handover/initiate`, {
      method: "POST",
      headers: agentHeaders
    });
    const initiateData = await initiateRes.json();
    assert(initiateRes.ok && initiateData.handover_id, "Agent initiates cash handover", "DIST-02");
    const otp = initiateData.otp_code;

    // Distributor fetches pending handovers
    const pendingRes = await fetch(`${BASE_URL}/api/distributor/pending-handovers`, { headers: distHeaders });
    const pendingData = await pendingRes.json();
    assert(pendingRes.ok && pendingData.count >= 1, "GET /api/distributor/pending-handovers lists initiated handover", "DIST-02");
    const pendingHandover = pendingData.handovers.find((h) => h.id === initiateData.handover_id);
    assert(pendingHandover != null, "Pending handovers includes the initiated handover", "DIST-02");
    assert(pendingHandover.total_amount >= 12000, "Handover total accurately sums ₹12,000 cash", "DIST-02");

    // Verify with invalid OTP
    const invalidVerifyRes = await fetch(`${BASE_URL}/api/handover/verify`, {
      method: "POST",
      headers: distHeaders,
      body: JSON.stringify({
        handover_id: initiateData.handover_id,
        otp_code: "9999" // incorrect
      })
    });
    assert(invalidVerifyRes.status === 400, "Distributor verification rejects invalid OTP (400)", "DIST-02");

    // Verify with correct OTP
    const validVerifyRes = await fetch(`${BASE_URL}/api/handover/verify`, {
      method: "POST",
      headers: distHeaders,
      body: JSON.stringify({
        handover_id: initiateData.handover_id,
        otp_code: otp
      })
    });
    const validVerifyData = await validVerifyRes.json();
    assert(validVerifyRes.ok && validVerifyData.status === "confirmed", "Distributor confirms handover with correct OTP", "DIST-02");

    // Assert installments locked to distributor_confirmed
    const checkInst = await (await fetch(`${BASE_URL}/api/collections/installments/records/${instList.items[0].id}`, { headers: adminHeaders })).json();
    assert(checkInst.handover_status === "distributor_confirmed", "Covered installments locked to distributor_confirmed", "DIST-02");

    console.log("\n======================================================");
    console.log(`✓ ALL ${passedTests}/${totalTests} PHASE 3 INTEGRATION TESTS PASSED!`);
    console.log("======================================================\n");

  } catch (err) {
    console.error("Test failure in Phase 3 suite:", err);
    process.exitCode = 1;
  } finally {
    stopPocketBase();
  }
}

main();
