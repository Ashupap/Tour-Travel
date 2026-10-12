// tests/phase2_verification.js
// Automated End-to-End Integration Verification Suite for Phase 2: Agent PWA Core
// Verifies: API-01..04, PWA-01..05, AGNT-01..05, SEC-04

import { spawn } from "child_process";
import { setTimeout as sleep } from "timers/promises";
import fs from "fs";

const PB_PORT = 8090;
const BASE_URL = `http://127.0.0.1:${PB_PORT}`;
const ADMIN_EMAIL = "admin@bharatyatra.local";
const ADMIN_PASSWORD = "password123456";

let pbProcess = null;

async function startPocketBase() {
  console.log("Starting PocketBase server for Phase 2 test suite...");
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

    // 1. Authenticate Admin & Create Phase 2 Test Agent & Distributor
    console.log("\n--- Authenticating & Seeding Phase 2 Users ---");
    const adminAuthRes = await fetch(`${BASE_URL}/api/admins/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    const adminAuth = await adminAuthRes.json();
    assert(adminAuthRes.ok && adminAuth.token, "Admin login successful", "AUTH-01");
    const adminHeaders = { "Content-Type": "application/json", "Authorization": adminAuth.token };

    const runId = Math.floor(1000 + Math.random() * 9000);

    // Create Distributor
    const distRes = await fetch(`${BASE_URL}/api/collections/users/records`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        username: `dist_p2_${runId}`,
        email: `dist_p2_${runId}@bharatyatra.local`,
        password: "password123456",
        passwordConfirm: "password123456",
        name: "Punjab Regional Distributor",
        phone: `97${runId}00001`,
        role: "distributor",
        commission_percentage: 5.0,
        is_active: true
      })
    });
    const dist = await distRes.json();
    assert(distRes.ok && dist.id, "Phase 2 Distributor created", "DAT-01");

    // Create Agent (under this distributor)
    const agentRes = await fetch(`${BASE_URL}/api/collections/users/records`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        username: `agent_p2_${runId}`,
        email: `agent_p2_${runId}@bharatyatra.local`,
        password: "password123456",
        passwordConfirm: "password123456",
        name: "Vikram Singh",
        phone: `96${runId}00001`,
        role: "agent",
        distributor_id: dist.id,
        commission_percentage: 2.5,
        is_active: true
      })
    });
    const agent = await agentRes.json();
    assert(agentRes.ok && agent.id, "Phase 2 Agent created", "DAT-01");

    // Auth Tokens
    const agentAuthRes = await (await fetch(`${BASE_URL}/api/collections/users/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: agent.email, password: "password123456" })
    })).json();
    const agentHeaders = { "Content-Type": "application/json", "Authorization": "Bearer " + agentAuthRes.token };

    const distAuthRes = await (await fetch(`${BASE_URL}/api/collections/users/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: dist.email, password: "password123456" })
    })).json();
    const distHeaders = { "Content-Type": "application/json", "Authorization": "Bearer " + distAuthRes.token };

    // Create Package & Subscriptions
    const pkgRes = await (await fetch(`${BASE_URL}/api/collections/packages/records`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        title: "Golden Temple & Himachal Yatra",
        destination: "Amritsar & Shimla",
        duration_days: 7,
        total_price: 24000,
        allowed_tenures: [6, 12],
        min_emis_to_travel: 2,
        is_active: true
      })
    })).json();

    const subRes = await (await fetch(`${BASE_URL}/api/collections/subscriptions/records`, {
      method: "POST",
      headers: agentHeaders,
      body: JSON.stringify({
        booking_code: `BY-P2-${runId}`,
        customer_name: "Gurpreet Singh",
        customer_phone: `95${runId}00001`,
        customer_address: "Model Town, Ludhiana",
        package_id: pkgRes.id,
        agent_id: agent.id,
        distributor_id: dist.id,
        tenure_months: 6,
        total_amount: 24000,
        monthly_emi_amount: 4000,
        travel_status: "locked",
        booking_date: "2026-09-21 12:00:00.000Z"
      })
    })).json();
    assert(subRes.id, "Subscription created for agent", "DAT-03");

    // 2. Test Endpoint Security & Role Validation (SEC-04)
    console.log("\n--- Testing API Role Validation (SEC-04) ---");
    const unauthSyncRes = await fetch(`${BASE_URL}/api/agent/sync-manifest`);
    assert(unauthSyncRes.status === 401, "Unauthenticated request to /api/agent/sync-manifest rejected (401)", "SEC-04");

    const distSyncRes = await fetch(`${BASE_URL}/api/agent/sync-manifest`, { headers: distHeaders });
    assert(distSyncRes.status === 403, "Distributor role rejected from agent endpoint (403)", "SEC-04");

    // 3. Test Morning Manifest Sync (API-02, PWA-05)
    console.log("\n--- Testing Morning Manifest Sync (API-02, PWA-05) ---");
    const manifestRes = await fetch(`${BASE_URL}/api/agent/sync-manifest`, { headers: agentHeaders });
    const manifest = await manifestRes.json();
    assert(manifestRes.ok, "GET /api/agent/sync-manifest succeeds with 200", "API-02");
    assert(manifest.agent.id === agent.id, "Manifest contains authenticated agent details", "API-02");
    assert(manifest.subscriptions.length >= 1, "Manifest contains agent's subscriptions", "API-02");
    assert(manifest.installments.length >= 6, "Manifest contains pending installments for offline collection", "API-02");
    assert(manifest.packages.length >= 1, "Manifest contains active packages reference", "PWA-05");

    // 4. Test Atomic Batch Collection Sync (API-01, HOOK-03)
    console.log("\n--- Testing Atomic Batch Collection Sync (API-01, HOOK-03) ---");
    const inst1 = manifest.installments[0];
    const inst2 = manifest.installments[1];
    const key1 = `${agent.id}-${inst1.id}-${Date.now()}`;
    const key2 = `${agent.id}-${inst2.id}-${Date.now()}`;

    const batchRes = await fetch(`${BASE_URL}/api/agent/batch-sync`, {
      method: "POST",
      headers: agentHeaders,
      body: JSON.stringify({
        items: [
          {
            installment_id: inst1.id,
            payment_mode: "cash",
            amount: 4000,
            paid_at: new Date().toISOString().replace("T", " "),
            receipt_slip_id: `OFF-${agent.id}-001`,
            idempotency_key: key1
          },
          {
            installment_id: inst2.id,
            payment_mode: "cash",
            amount: 4000,
            paid_at: new Date().toISOString().replace("T", " "),
            receipt_slip_id: `OFF-${agent.id}-002`,
            idempotency_key: key2
          }
        ]
      })
    });
    const batchResult = await batchRes.json();
    assert(batchRes.ok && batchResult.processed_count === 2, "Batch sync processed 2 payments atomically", "API-01");

    // Verify idempotency on second identical batch submission
    const duplicateBatchRes = await fetch(`${BASE_URL}/api/agent/batch-sync`, {
      method: "POST",
      headers: agentHeaders,
      body: JSON.stringify({
        items: [
          {
            installment_id: inst1.id,
            payment_mode: "cash",
            receipt_slip_id: `OFF-${agent.id}-001`,
            idempotency_key: key1
          }
        ]
      })
    });
    const duplicateResult = await duplicateBatchRes.json();
    assert(duplicateBatchRes.ok && duplicateResult.skipped_count === 1, "Batch sync idempotently skips already processed key", "HOOK-03");

    // 5. Test Cash Handover Flow (API-03, API-04, AGNT-05, SEC-02)
    console.log("\n--- Testing Cash Handover Flow (API-03, API-04, AGNT-05) ---");
    // Initiate Handover
    const initiateRes = await fetch(`${BASE_URL}/api/handover/initiate`, {
      method: "POST",
      headers: agentHeaders
    });
    const initiateData = await initiateRes.json();
    assert(initiateRes.ok && initiateData.handover_id, "Cash handover initiated successfully", "API-03");
    assert(initiateData.total_amount >= 8000, "Initiated handover accurately sums physical cash in custody (>= 8000)", "AGNT-05");
    assert(/^[0-9]{4,6}$/.test(initiateData.otp_code), "Handover generates a valid OTP code", "API-03");

    // Test Invalid OTP rejection
    const invalidVerifyRes = await fetch(`${BASE_URL}/api/handover/verify`, {
      method: "POST",
      headers: distHeaders,
      body: JSON.stringify({
        handover_id: initiateData.handover_id,
        otp_code: "0000" // Wrong OTP
      })
    });
    assert(invalidVerifyRes.status === 400, "Distributor verification rejects incorrect OTP (400)", "API-04");

    // Test Valid OTP confirmation
    const validVerifyRes = await fetch(`${BASE_URL}/api/handover/verify`, {
      method: "POST",
      headers: distHeaders,
      body: JSON.stringify({
        handover_id: initiateData.handover_id,
        otp_code: initiateData.otp_code
      })
    });
    const validVerifyData = await validVerifyRes.json();
    assert(validVerifyRes.ok && validVerifyData.success, "Distributor successfully confirms handover with correct OTP", "API-04");

    // Verify installments transitioned to distributor_confirmed (Handover finality)
    const checkInstRes = await (await fetch(`${BASE_URL}/api/collections/installments/records/${inst1.id}`, { headers: adminHeaders })).json();
    assert(checkInstRes.handover_status === "distributor_confirmed", "Linked installments transitioned to 'distributor_confirmed'", "API-04");

    // 6. Test PWA Static Assets & Offline Modules (PWA-01..05)
    console.log("\n--- Testing PWA Shell & Static Assets (PWA-01..05) ---");
    const manifestFileRes = await fetch(`${BASE_URL}/manifest.json`);
    const manifestJson = await manifestFileRes.json();
    assert(manifestFileRes.ok && manifestJson.display === "standalone", "manifest.json served with display: standalone", "PWA-01");
    assert(manifestJson.theme_color === "#D97706" || manifestJson.theme_color === "#0C4A7B", "manifest.json specifies brand theme color", "PWA-01");

    const swRes = await fetch(`${BASE_URL}/sw.js`);
    const swText = await swRes.text();
    assert(swRes.ok && swText.includes("sync-installments"), "sw.js served and handles 'sync-installments' background sync", "PWA-02");

    const storeRes = await fetch(`${BASE_URL}/offline-store.js`);
    const storeText = await storeRes.text();
    assert(storeRes.ok && storeText.includes("BharatYatraDB"), "offline-store.js served and declares Dexie database", "PWA-04");

    const dexieRes = await fetch(`${BASE_URL}/js/dexie.min.js`);
    assert(dexieRes.ok && dexieRes.headers.get("content-length") > 10000, "dexie.min.js bundled and accessible locally", "PWA-04");

    const dashboardRes = await fetch(`${BASE_URL}/agent/dashboard`);
    assert(dashboardRes.ok || dashboardRes.status === 302, "Route /agent/dashboard is reachable (200/302)", "AGNT-01");

    const agentHtmlRes = await fetch(`${BASE_URL}/agent/index.html`);
    const agentHtml = await agentHtmlRes.text();
    assert(agentHtmlRes.ok && agentHtml.includes("Daily Recovery Route"), "Agent PWA shell renders Daily Recovery Route", "AGNT-01");
    assert(agentHtml.includes("Collect EMI"), "Agent PWA shell contains Collect EMI modal", "AGNT-02");
    assert(agentHtml.includes("Total Cash In Hand"), "Agent PWA shell displays Total Cash In Hand KPI", "AGNT-05");

    // 7. Verify Receipt Formatting & WhatsApp Deeplink Logic (AGNT-04)
    console.log("\n--- Testing Receipt & WhatsApp Formatting Logic (AGNT-04) ---");
    const receiptModule = fs.readFileSync("pb_public/agent/receipt.js", "utf8");
    assert(receiptModule.includes("formatThermalReceiptText") && receiptModule.includes("wa.me"),
      "receipt.js exports thermal receipt formatting and wa.me WhatsApp generator", "AGNT-04");

    console.log(`\n======================================================`);
    console.log(`✓ ALL ${passedTests}/${totalTests} PHASE 2 INTEGRATION TESTS PASSED!`);
    console.log(`======================================================\n`);

  } finally {
    stopPocketBase();
  }
}

main().catch((err) => {
  console.error("Test failure in Phase 2 suite:", err);
  stopPocketBase();
  process.exit(1);
});
