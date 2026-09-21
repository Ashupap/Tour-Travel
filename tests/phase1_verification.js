// tests/phase1_verification.js
// Automated End-to-End Integration Verification Suite for Phase 1
// Verifies: DAT-01..07, HOOK-01..03, SEC-01..03

import { spawn } from "child_process";
import { setTimeout as sleep } from "timers/promises";

const PB_PORT = 8090;
const BASE_URL = `http://127.0.0.1:${PB_PORT}`;
const ADMIN_EMAIL = "admin@bharatyatra.local";
const ADMIN_PASSWORD = "password123456";

let pbProcess = null;

async function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { shell: true, stdio: "pipe" });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function startPocketBase() {
  console.log("Starting PocketBase server...");
  pbProcess = spawn(".\\pocketbase.exe", ["serve", `--http=127.0.0.1:${PB_PORT}`], {
    stdio: "pipe"
  });

  pbProcess.stdout.on("data", (d) => {
    console.log("[PB]", d.toString().trim());
  });
  pbProcess.stderr.on("data", (d) => {
    console.error("[PB-ERR]", d.toString().trim());
  });

  // Wait for healthcheck
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) {
        console.log("✓ PocketBase server is healthy and responding on port", PB_PORT);
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

    // 1. Admin Authentication
    console.log("\n--- Authenticating Admin ---");
    const adminAuthRes = await fetch(`${BASE_URL}/api/admins/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    const adminAuth = await adminAuthRes.json();
    assert(adminAuthRes.ok && adminAuth.token, "Admin login successful", "AUTH-01");
    const adminToken = adminAuth.token;
    const adminHeaders = {
      "Content-Type": "application/json",
      "Authorization": adminToken
    };

    // 2. Collection Schemas Verification (DAT-01 to DAT-05)
    console.log("\n--- Checking Collections Schema (DAT-01..05) ---");
    const colListRes = await fetch(`${BASE_URL}/api/collections?perPage=50`, { headers: adminHeaders });
    const colList = await colListRes.json();
    const collectionNames = colList.items.map(c => c.name);

    assert(collectionNames.includes("users"), "users auth collection exists", "DAT-01");
    assert(collectionNames.includes("packages"), "packages collection exists", "DAT-02");
    assert(collectionNames.includes("subscriptions"), "subscriptions collection exists", "DAT-03");
    assert(collectionNames.includes("installments"), "installments collection exists", "DAT-04");
    assert(collectionNames.includes("cash_handovers"), "cash_handovers collection exists", "DAT-05");

    // 3. Seed Users & Packages
    console.log("\n--- Seeding Test Users & Packages ---");
    const runId = Math.floor(1000 + Math.random() * 9000);
    
    // Create Distributor 1
    const dist1Res = await fetch(`${BASE_URL}/api/collections/users/records`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        username: `dist1_${runId}`,
        email: `dist1_${runId}@bharatyatra.local`,
        password: "password123456",
        passwordConfirm: "password123456",
        name: "North Region Distributor",
        phone: `98${runId}00001`,
        role: "distributor",
        commission_percentage: 5.0,
        is_active: true
      })
    });
    const dist1 = await dist1Res.json();
    if (!dist1Res.ok) console.error("dist1 error:", dist1);
    assert(dist1Res.ok && dist1.id, "Distributor 1 created", "DAT-01");

    // Create Distributor 2 (for cross-territory isolation testing)
    const dist2Res = await fetch(`${BASE_URL}/api/collections/users/records`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        username: `dist2_${runId}`,
        email: `dist2_${runId}@bharatyatra.local`,
        password: "password123456",
        passwordConfirm: "password123456",
        name: "South Region Distributor",
        phone: `98${runId}00002`,
        role: "distributor",
        commission_percentage: 5.0,
        is_active: true
      })
    });
    const dist2 = await dist2Res.json();
    if (!dist2Res.ok) console.error("dist2 error:", dist2);
    assert(dist2Res.ok && dist2.id, "Distributor 2 created", "DAT-01");

    // Create Agent 1 (under Dist 1)
    const agent1Res = await fetch(`${BASE_URL}/api/collections/users/records`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        username: `agent1_${runId}`,
        email: `agent1_${runId}@bharatyatra.local`,
        password: "password123456",
        passwordConfirm: "password123456",
        name: "Ramesh Sharma",
        phone: `91${runId}00001`,
        role: "agent",
        distributor_id: dist1.id,
        commission_percentage: 2.0,
        is_active: true
      })
    });
    const agent1 = await agent1Res.json();
    if (!agent1Res.ok) console.error("agent1 error:", agent1);
    assert(agent1Res.ok && agent1.id, "Agent 1 created under Distributor 1", "DAT-01");

    // Create Agent 2 (under Dist 2)
    const agent2Res = await fetch(`${BASE_URL}/api/collections/users/records`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        username: `agent2_${runId}`,
        email: `agent2_${runId}@bharatyatra.local`,
        password: "password123456",
        passwordConfirm: "password123456",
        name: "Suresh Kumar",
        phone: `91${runId}00002`,
        role: "agent",
        distributor_id: dist2.id,
        commission_percentage: 2.0,
        is_active: true
      })
    });
    const agent2 = await agent2Res.json();
    if (!agent2Res.ok) console.error("agent2 error:", agent2);
    assert(agent2Res.ok && agent2.id, "Agent 2 created under Distributor 2", "DAT-01");

    // Create Package
    const packageRes = await fetch(`${BASE_URL}/api/collections/packages/records`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        title: "Char Dham Yatra Deluxe",
        destination: "Uttarakhand",
        duration_days: 10,
        total_price: 36000,
        allowed_tenures: [6, 9, 12],
        min_emis_to_travel: 2,
        is_active: true
      })
    });
    const pkg = await packageRes.json();
    if (!packageRes.ok) {
      console.error("Package creation error:", pkg);
    }
    assert(packageRes.ok && pkg.id, "Tour Package created with min_emis_to_travel=2", "DAT-02");

    // Authenticate Agent 1 & Agent 2
    const agent1AuthRes = await fetch(`${BASE_URL}/api/collections/users/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: agent1.email, password: "password123456" })
    });
    const agent1Auth = await agent1AuthRes.json();
    console.log("agent1 auth:", agent1AuthRes.status, agent1Auth.token ? "token present" : agent1Auth);
    const agent1Headers = { "Content-Type": "application/json", "Authorization": agent1Auth.token };

    const agent2AuthRes = await fetch(`${BASE_URL}/api/collections/users/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: agent2.email, password: "password123456" })
    });
    const agent2Auth = await agent2AuthRes.json();
    const agent2Headers = { "Content-Type": "application/json", "Authorization": agent2Auth.token };

    // 4. Hook Verification 1: Auto Installment Generation (HOOK-01)
    console.log("\n--- Testing Hook 01: Installment Schedule Generation (HOOK-01) ---");
    const subRes = await fetch(`${BASE_URL}/api/collections/subscriptions/records`, {
      method: "POST",
      headers: agent1Headers,
      body: JSON.stringify({
        booking_code: `BY-2026-${runId}`,
        customer_name: "Amit Verma",
        customer_phone: `98${runId}00003`,
        customer_address: "Sector 14, Gurgaon",
        package_id: pkg.id,
        agent_id: agent1.id,
        distributor_id: dist1.id,
        tenure_months: 6,
        total_amount: 36000,
        monthly_emi_amount: 6000,
        travel_status: "locked",
        booking_date: "2026-09-21 12:00:00.000Z"
      })
    });
    const sub = await subRes.json();
    if (!subRes.ok) {
      console.error("sub error:", sub);
    }
    assert(subRes.ok && sub.id, "Subscription created by Agent 1", "DAT-03");

    // Query generated installments
    await sleep(200); // Allow hook to finish async DB operations
    const instListRes = await fetch(
      `${BASE_URL}/api/collections/installments/records?filter=(subscription_id='${sub.id}')&sort=installment_no`,
      { headers: adminHeaders }
    );
    const instList = await instListRes.json();
    assert(instList.totalItems === 6, "Exactly 6 installments auto-generated for 6-month tenure", "HOOK-01");
    assert(instList.items[0].amount === 6000, "First installment amount is 6000", "HOOK-01");
    assert(instList.items[5].installment_no === 6, "Installments are sequentially numbered 1..6", "HOOK-01");

    // 5. Hook Verification 2: Travel Unlock Engine (HOOK-02)
    console.log("\n--- Testing Hook 02: Travel Unlock Engine (HOOK-02) ---");
    const inst1 = instList.items[0];
    const inst2 = instList.items[1];

    // Mark installment 1 as paid
    const pay1Res = await fetch(`${BASE_URL}/api/collections/installments/records/${inst1.id}`, {
      method: "PATCH",
      headers: agent1Headers,
      body: JSON.stringify({
        status: "paid",
        payment_mode: "cash",
        collected_by: agent1.id
      })
    });
    assert(pay1Res.ok, "Installment 1 marked as paid", "DAT-04");

    // Check subscription state (threshold is 2, paid is 1 -> travel_status should still be locked)
    await sleep(200);
    const checkSub1 = await (await fetch(`${BASE_URL}/api/collections/subscriptions/records/${sub.id}`, { headers: adminHeaders })).json();
    assert(checkSub1.paid_emis_count === 1, "Subscription paid_emis_count updated to 1", "HOOK-02");
    assert(checkSub1.travel_status === "locked", "Subscription travel_status remains 'locked' when below threshold", "HOOK-02");

    // Mark installment 2 as paid (reaches threshold 2)
    const pay2Res = await fetch(`${BASE_URL}/api/collections/installments/records/${inst2.id}`, {
      method: "PATCH",
      headers: agent1Headers,
      body: JSON.stringify({
        status: "paid",
        payment_mode: "upi",
        collected_by: agent1.id
      })
    });
    assert(pay2Res.ok, "Installment 2 marked as paid", "DAT-04");

    // Check subscription state (paid is 2 -> travel_status should flip to 'eligible')
    await sleep(200);
    const checkSub2 = await (await fetch(`${BASE_URL}/api/collections/subscriptions/records/${sub.id}`, { headers: adminHeaders })).json();
    assert(checkSub2.paid_emis_count === 2, "Subscription paid_emis_count updated to 2", "HOOK-02");
    assert(checkSub2.travel_status === "eligible", "Subscription travel_status automatically transitions to 'eligible'", "HOOK-02");

    // 6. Hook Verification 3: Idempotency Guard (HOOK-03)
    console.log("\n--- Testing Hook 03: Idempotency Guard (HOOK-03) ---");
    const testKey = `IDEM-TEST-${Date.now()}`;
    const inst3 = instList.items[2];

    // Assign idempotency key to inst3
    const idemFirstRes = await fetch(`${BASE_URL}/api/collections/installments/records/${inst3.id}`, {
      method: "PATCH",
      headers: agent1Headers,
      body: JSON.stringify({
        idempotency_key: testKey
      })
    });
    assert(idemFirstRes.ok, "Successfully saved initial installment with idempotency_key", "HOOK-03");

    // Attempt duplicate write on another installment with the same idempotency key
    const inst4 = instList.items[3];
    const idemDupRes = await fetch(`${BASE_URL}/api/collections/installments/records/${inst4.id}`, {
      method: "PATCH",
      headers: agent1Headers,
      body: JSON.stringify({
        idempotency_key: testKey
      })
    });
    assert(!idemDupRes.ok && idemDupRes.status === 400, "Rejected duplicate idempotency_key with HTTP 400 Bad Request", "HOOK-03");

    // 7. Security Isolation: Agent & Distributor Scoping (SEC-01, SEC-03)
    console.log("\n--- Testing Security Isolation (SEC-01, SEC-03) ---");
    // Agent 2 attempts to view Agent 1's subscription
    const agent2SubRes = await fetch(`${BASE_URL}/api/collections/subscriptions/records/${sub.id}`, {
      headers: agent2Headers
    });
    assert(!agent2SubRes.ok && (agent2SubRes.status === 404 || agent2SubRes.status === 403),
      "Agent 2 cannot access Agent 1's subscription (404/403)", "SEC-01");

    // Agent 2 lists subscriptions
    const agent2ListRes = await (await fetch(`${BASE_URL}/api/collections/subscriptions/records`, { headers: agent2Headers })).json();
    assert(agent2ListRes.totalItems === 0, "Agent 2 cannot see any of Agent 1's subscriptions in list query", "SEC-01");

    // 8. Handover Finality: Confirmed Installments are Immutable (SEC-02)
    console.log("\n--- Testing Handover Finality (SEC-02) ---");
    // Admin confirms handover for installment 1
    const confirmRes = await fetch(`${BASE_URL}/api/collections/installments/records/${inst1.id}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({
        handover_status: "distributor_confirmed"
      })
    });
    assert(confirmRes.ok, "Installment 1 handover_status updated to distributor_confirmed by Admin", "DAT-04");

    // Agent 1 attempts to update confirmed installment
    const agentTamperRes = await fetch(`${BASE_URL}/api/collections/installments/records/${inst1.id}`, {
      method: "PATCH",
      headers: agent1Headers,
      body: JSON.stringify({
        amount: 1000 // Attempting to alter confirmed payment
      })
    });
    assert(!agentTamperRes.ok && (agentTamperRes.status === 403 || agentTamperRes.status === 404),
      "Agent 1 is forbidden from updating an installment after distributor confirmation", "SEC-02");

    // 9. Analytical Views: Distributor & Admin Dashboards (DAT-06, DAT-07)
    console.log("\n--- Testing SQLite Analytical Views (DAT-06, DAT-07) ---");
    // Query distributor_daily_analytics
    const distAnalyticsRes = await fetch(
      `${BASE_URL}/api/collections/distributor_daily_analytics/records?filter=(distributor_id='${dist1.id}')`,
      { headers: adminHeaders }
    );
    const distAnalytics = await distAnalyticsRes.json();
    assert(distAnalyticsRes.ok && distAnalytics.items.length > 0, "distributor_daily_analytics view returns row for Distributor 1", "DAT-06");
    const distRow = distAnalytics.items[0];
    assert(distRow.total_active_subscriptions === 1, "distributor_daily_analytics shows 1 active subscription", "DAT-06");
    assert(distRow.collected_today >= 12000, "distributor_daily_analytics collected_today reflects paid EMIs (12000)", "DAT-06");

    // Query admin_portfolio_overview
    const adminOverviewRes = await fetch(
      `${BASE_URL}/api/collections/admin_portfolio_overview/records`,
      { headers: adminHeaders }
    );
    const adminOverview = await adminOverviewRes.json();
    assert(adminOverviewRes.ok && adminOverview.items.length > 0, "admin_portfolio_overview view returns portfolio metrics", "DAT-07");
    const adminRow = adminOverview.items[0];
    assert(adminRow.gross_portfolio_value >= 36000, "admin_portfolio_overview gross_portfolio_value reflects subscriptions (>= 36000)", "DAT-07");
    assert(adminRow.total_realized_cash >= 12000, "admin_portfolio_overview total_realized_cash reflects collected payments", "DAT-07");

    console.log(`\n======================================================`);
    console.log(`✓ ALL ${passedTests}/${totalTests} INTEGRATION TESTS PASSED SUCCESSFULLY!`);
    console.log(`======================================================\n`);

  } finally {
    stopPocketBase();
  }
}

main().catch((err) => {
  console.error("Test failure:", err);
  stopPocketBase();
  process.exit(1);
});
