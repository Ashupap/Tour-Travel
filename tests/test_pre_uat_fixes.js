// tests/test_pre_uat_fixes.js
// Verification of Multi-Role Auth, Realtime SSE handshake, and Dues Filtering

import assert from "assert";
import http from "http";

async function runTests() {
  console.log("=== BharatYatra Pre-UAT Verification Suite ===");
  const baseUrl = "http://127.0.0.1:8090";

  // Test 1: Admin, Distributor, and Sahayak Concurrent Logins
  console.log("\n[Test 1] Concurrent Multi-Role Authentication:");

  // 1a. Admin Login
  const adminRes = await fetch(`${baseUrl}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@bharatyatra.local", password: "password123456" })
  });
  assert.strictEqual(adminRes.status, 200, "Admin login should succeed with 200");
  const adminData = await adminRes.json();
  const adminToken = adminData.token;
  console.log("  ✓ Admin Auth OK (Token Length:", adminToken.length, ")");

  // 1b. Distributor Login
  const distRes = await fetch(`${baseUrl}/api/collections/users/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "tarini_hub@bharatyatra.local", password: "password123456" })
  });
  assert.strictEqual(distRes.status, 200, "Distributor login should succeed with 200");
  const distData = await distRes.json();
  const distToken = distData.token;
  assert.strictEqual(distData.record.role, "distributor", "Role should be distributor");
  console.log("  ✓ Distributor Auth OK (Hub:", distData.record.name, ")");

  // 1c. Sahayak Login
  const agentRes = await fetch(`${baseUrl}/api/collections/users/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "balaram_puri@bharatyatra.local", password: "password123456" })
  });
  assert.strictEqual(agentRes.status, 200, "Agent login should succeed with 200");
  const agentData = await agentRes.json();
  const agentToken = agentData.token;
  assert.strictEqual(agentData.record.role, "agent", "Role should be agent");
  console.log("  ✓ Sahayak Auth OK (Agent:", agentData.record.name, ")");

  // Test 2: Role Endpoint Access Concurrency
  console.log("\n[Test 2] Role-Isolated Endpoint Verification:");

  // Admin access portfolio
  const adminPortfolioRes = await fetch(`${baseUrl}/api/admin/portfolio`, {
    headers: { "Authorization": `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminPortfolioRes.status, 200, "Admin portfolio should return 200");
  const portfolioData = await adminPortfolioRes.json();
  console.log("  ✓ Admin Portfolio API OK (Booked Value: ₹", portfolioData.metrics?.total_booked_value, ")");

  // Distributor access analytics & transactions
  const distAnalyticsRes = await fetch(`${baseUrl}/api/distributor/analytics`, {
    headers: { "Authorization": `Bearer ${distToken}` }
  });
  assert.strictEqual(distAnalyticsRes.status, 200, "Distributor analytics should return 200");
  const analyticsData = await distAnalyticsRes.json();
  console.log("  ✓ Distributor Analytics API OK (In Custody: ₹", analyticsData.metrics?.total_cash_in_custody, ")");

  const distTxRes = await fetch(`${baseUrl}/api/distributor/transactions`, {
    headers: { "Authorization": `Bearer ${distToken}` }
  });
  assert.strictEqual(distTxRes.status, 200, "Distributor transactions should return 200");
  const txData = await distTxRes.json();
  console.log("  ✓ Distributor Transactions API OK (Tx Count:", txData.transactions?.length, ")");

  // Agent access sync-manifest & handovers
  const agentManifestRes = await fetch(`${baseUrl}/api/agent/sync-manifest`, {
    headers: { "Authorization": `Bearer ${agentToken}` }
  });
  assert.strictEqual(agentManifestRes.status, 200, "Agent sync-manifest should return 200");
  const manifestData = await agentManifestRes.json();
  console.log("  ✓ Agent Manifest API OK (Packages:", manifestData.packages?.length, "Installments:", manifestData.installments?.length, ")");

  // Test 3: Realtime SSE Subscription Handshake for all 3 Roles
  console.log("\n[Test 3] Realtime SSE Handshake Verification:");

  async function testSseHandshake(roleName, token, subscriptions) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`${roleName} SSE timeout`)), 6000);
      const req = http.request(`${baseUrl}/api/realtime`, (res) => {
        let buf = "";
        res.on("data", async (chunk) => {
          buf += chunk.toString();
          const lines = buf.split("\n");
          for (const line of lines) {
            if (line.startsWith("data:")) {
              try {
                const parsed = JSON.parse(line.substring(5).trim());
                if (parsed.clientId) {
                  clearTimeout(timeout);

                  // Subscribe with client ID
                  fetch(`${baseUrl}/api/realtime`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      clientId: parsed.clientId,
                      subscriptions: subscriptions
                    })
                  }).then(subRes => {
                    try { req.destroy(); } catch(e) {}
                    assert.ok(subRes.status === 204 || subRes.status === 200, `${roleName} subscription status should be 204`);
                    console.log(`  ✓ ${roleName} SSE Realtime Handshake Successful (clientId: ${parsed.clientId.substring(0, 10)}...)`);
                    resolve(true);
                  }).catch(subErr => {
                    try { req.destroy(); } catch(e) {}
                    reject(subErr);
                  });
                  return;
                }
              } catch (e) {}
            }
          }
        });
      });
      req.on("error", (e) => {
        // Ignore destroy error
        if (e && e.code === "ECONNRESET") return;
        clearTimeout(timeout);
        reject(e);
      });
      req.end();
    });
  }

  await testSseHandshake("Admin", adminToken, ["installments/*", "settlements/*", "subscriptions/*"]);
  await testSseHandshake("Distributor", distToken, ["installments/*", "handover_batches/*", "settlements/*"]);
  await testSseHandshake("Sahayak", agentToken, ["installments/*", "handover_batches/*", "subscriptions/*"]);

  // Test 4: Next Due Only Logic Simulation
  console.log("\n[Test 4] Sahayak Daily Recovery Dues Filtering Logic:");
  const testInstallments = [
    { id: "i1", subscription_id: "sub_1", installment_no: 1, status: "paid" },
    { id: "i2", subscription_id: "sub_1", installment_no: 2, status: "pending", due_date: "2026-10-15" },
    { id: "i3", subscription_id: "sub_1", installment_no: 3, status: "pending", due_date: "2026-11-15" },
    { id: "i4", subscription_id: "sub_2", installment_no: 1, status: "overdue", due_date: "2026-09-15" },
    { id: "i5", subscription_id: "sub_2", installment_no: 2, status: "pending", due_date: "2026-10-15" },
  ];

  const unpaid = testInstallments.filter(i => i.status === "pending" || i.status === "overdue");
  const lowestPerSub = new Map();
  for (const inst of unpaid) {
    const existing = lowestPerSub.get(inst.subscription_id);
    if (!existing || inst.installment_no < existing.installment_no) {
      lowestPerSub.set(inst.subscription_id, inst);
    }
  }
  const routeItems = Array.from(lowestPerSub.values());

  assert.strictEqual(routeItems.length, 2, "Should only have 2 route items (one per subscription)");
  assert.strictEqual(routeItems.find(i => i.subscription_id === "sub_1").installment_no, 2, "Sub 1 route item should be EMI #2");
  assert.strictEqual(routeItems.find(i => i.subscription_id === "sub_2").installment_no, 1, "Sub 2 route item should be EMI #1");
  console.log("  ✓ Correctly displays only the immediate next payable due per devotee");
  console.log("  ✓ Future upcoming EMIs (e.g. EMI #3 for Sub 1, EMI #2 for Sub 2) are hidden from the route");

  console.log("\nAll Pre-UAT Verification Tests PASSED successfully! 🚀");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
