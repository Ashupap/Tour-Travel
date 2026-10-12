// tests/test_password_and_handover_expiry.js
import assert from "assert";

async function run() {
  console.log("=== Testing Sahayak Password Change & Active Passcode Expiry ===");
  const baseUrl = "http://127.0.0.1:8090";

  // 1. Authenticate Sahayak (Balaram)
  console.log("\n[1] Authenticating Sahayak...");
  const agentLoginRes = await fetch(`${baseUrl}/api/collections/users/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "balaram_puri@bharatyatra.local", password: "password123456" })
  });
  assert.strictEqual(agentLoginRes.status, 200, "Agent login must succeed");
  const agentData = await agentLoginRes.json();
  const agentToken = agentData.token;
  const agentHeaders = {
    "Authorization": `Bearer ${agentToken}`,
    "Content-Type": "application/json"
  };
  console.log("  ✓ Logged in as agent:", agentData.record.name);

  // 2. Test Sahayak Password Change API
  console.log("\n[2] Testing Sahayak Password Change (/api/agent/change-password)...");

  // 2a. Rejection of incorrect current password
  const wrongPwdRes = await fetch(`${baseUrl}/api/agent/change-password`, {
    method: "POST",
    headers: agentHeaders,
    body: JSON.stringify({
      current_password: "wrong_password_xyz",
      new_password: "newpassword1234",
      confirm_password: "newpassword1234"
    })
  });
  assert.strictEqual(wrongPwdRes.status, 400, "Wrong current password should return 400");
  const wrongPwdData = await wrongPwdRes.json();
  console.log("  ✓ Correctly rejected wrong current password:", wrongPwdData.error);

  // 2b. Rejection of mismatched confirmation
  const mismatchRes = await fetch(`${baseUrl}/api/agent/change-password`, {
    method: "POST",
    headers: agentHeaders,
    body: JSON.stringify({
      current_password: "password123456",
      new_password: "newpassword1234",
      confirm_password: "differentpassword"
    })
  });
  assert.strictEqual(mismatchRes.status, 400, "Mismatched passwords should return 400");
  console.log("  ✓ Correctly rejected mismatched confirm password");

  // 2c. Rejection of too-short password (< 8 chars)
  const shortRes = await fetch(`${baseUrl}/api/agent/change-password`, {
    method: "POST",
    headers: agentHeaders,
    body: JSON.stringify({
      current_password: "password123456",
      new_password: "short",
      confirm_password: "short"
    })
  });
  assert.strictEqual(shortRes.status, 400, "Too-short password should return 400");
  console.log("  ✓ Correctly rejected short password");

  // 2d. Successful password change
  const successChangeRes = await fetch(`${baseUrl}/api/agent/change-password`, {
    method: "POST",
    headers: agentHeaders,
    body: JSON.stringify({
      current_password: "password123456",
      new_password: "newStrongPassword2026",
      confirm_password: "newStrongPassword2026"
    })
  });
  assert.strictEqual(successChangeRes.status, 200, "Password change should succeed with 200");
  const successData = await successChangeRes.json();
  assert(successData.success, "Response should have success: true");
  console.log("  ✓ Password changed successfully to newStrongPassword2026");

  // 2e. Verify login works with new password
  const newLoginRes = await fetch(`${baseUrl}/api/collections/users/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "balaram_puri@bharatyatra.local", password: "newStrongPassword2026" })
  });
  assert.strictEqual(newLoginRes.status, 200, "Login with new password must succeed");
  const newLoginData = await newLoginRes.json();
  const refreshedToken = newLoginData.token;
  console.log("  ✓ Verified login with new password!");

  // 2f. Restore password back to standard password123456 so test suites remain repeatable
  const restoreRes = await fetch(`${baseUrl}/api/agent/change-password`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${refreshedToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      current_password: "newStrongPassword2026",
      new_password: "password123456",
      confirm_password: "password123456"
    })
  });
  assert.strictEqual(restoreRes.status, 200, "Restoring password to password123456 should succeed");
  console.log("  ✓ Restored password to password123456 for test suite stability");

  // Re-login to get fresh token with restored password
  const finalLoginRes = await fetch(`${baseUrl}/api/collections/users/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "balaram_puri@bharatyatra.local", password: "password123456" })
  });
  const finalLoginData = await finalLoginRes.json();
  console.log("  finalLogin status:", finalLoginRes.status, "data:", finalLoginData);
  assert.strictEqual(finalLoginRes.status, 200, "finalLogin must succeed");
  const freshAgentHeaders = {
    "Authorization": `Bearer ${finalLoginData.token}`,
    "Content-Type": "application/json"
  };

  // 3. Test Active Settlement Passcode & Expiry
  console.log("\n[3] Testing Active Settlement Passcode & Anti-Duplication Guard...");

  // First fetch handovers
  const initialHandoversRes = await fetch(`${baseUrl}/api/agent/handovers`, {
    headers: freshAgentHeaders
  });
  if (!initialHandoversRes.ok) {
    console.log("  initialHandoversRes failed:", initialHandoversRes.status, await initialHandoversRes.text());
  }
  assert.strictEqual(initialHandoversRes.status, 200);
  const initialHandovers = await initialHandoversRes.json();
  console.log("  Initial active handover:", initialHandovers.active_handover ? initialHandovers.active_handover.passcode : "none");

  // Check agent custody / manifest to ensure cashInHand > 0
  const manifestRes = await fetch(`${baseUrl}/api/agent/sync-manifest`, { headers: freshAgentHeaders });
  const manifest = await manifestRes.json();
  const pendingInst = manifest.installments ? manifest.installments.find(i => i.status !== "paid") : null;

  if (pendingInst) {
    console.log("  Seeding payment for installment:", pendingInst.id);
    const syncRes = await fetch(`${baseUrl}/api/agent/batch-sync`, {
      method: "POST",
      headers: freshAgentHeaders,
      body: JSON.stringify({
        items: [{
          installment_id: pendingInst.id,
          payment_mode: "cash",
          amount: pendingInst.amount || 4000,
          paid_at: new Date().toISOString().replace("T", " "),
          receipt_slip_id: `TEST-${Date.now()}`,
          idempotency_key: `seed-${Date.now()}`
        }]
      })
    });
    console.log("  Seed sync response status:", syncRes.status);
  }

  // Initiate handover
  const initRes1 = await fetch(`${baseUrl}/api/handover/initiate`, {
    method: "POST",
    headers: freshAgentHeaders
  });
  const initData1 = await initRes1.json();
  console.log("  Handover initiate response 1:", initData1);
  assert(initRes1.ok, "First handover initiate should succeed or return existing active");
  assert(initData1.passcode, "Passcode should exist");
  assert(initData1.expires_in_seconds > 0, "expires_in_seconds should be > 0");
  assert(initData1.expires_at, "expires_at timestamp should exist");

  const originalPasscode = initData1.passcode;
  const originalHandoverId = initData1.handover_id;

  // 3b. Call initiate AGAIN while previous code is active: MUST NOT GENERATE A NEW CODE!
  console.log("\n[4] Calling /api/handover/initiate again while code is active...");
  const initRes2 = await fetch(`${baseUrl}/api/handover/initiate`, {
    method: "POST",
    headers: freshAgentHeaders
  });
  assert.strictEqual(initRes2.status, 200, "Second call should return 200 with existing active");
  const initData2 = await initRes2.json();
  console.log("  Handover initiate response 2:", initData2);
  assert.strictEqual(initData2.already_active, true, "Should report already_active: true");
  assert.strictEqual(initData2.handover_id, originalHandoverId, "Handover ID should remain identical");
  assert.strictEqual(initData2.passcode, originalPasscode, "Passcode should NOT change when clicked again");
  console.log("  ✓ Duplicate passcode generation was successfully prevented!");

  // 3c. Check GET /api/agent/handovers includes countdown info
  const checkAgentHandoversRes = await fetch(`${baseUrl}/api/agent/handovers`, {
    headers: freshAgentHeaders
  });
  const agentHandoversData = await checkAgentHandoversRes.json();
  assert(agentHandoversData.active_handover, "Active handover must be present");
  assert.strictEqual(agentHandoversData.active_handover.passcode, originalPasscode);
  assert(agentHandoversData.active_handover.expires_in_seconds > 0, "expires_in_seconds should be returned");
  console.log("  ✓ GET /api/agent/handovers returned active passcode with", agentHandoversData.active_handover.expires_in_seconds, "seconds remaining");

  // 3d. Check Distributor Pending Handovers endpoint
  const distLoginRes = await fetch(`${baseUrl}/api/collections/users/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "tarini_hub@bharatyatra.local", password: "password123456" })
  });
  assert.strictEqual(distLoginRes.status, 200);
  const distData = await distLoginRes.json();
  const distToken = distData.token;
  const distHeaders = {
    "Authorization": `Bearer ${distToken}`,
    "Content-Type": "application/json"
  };

  const distPendingRes = await fetch(`${baseUrl}/api/distributor/pending-handovers`, {
    headers: distHeaders
  });
  const distPendingData = await distPendingRes.json();
  console.log("  Distributor pending handovers count:", distPendingData.count);
  const foundPending = distPendingData.handovers.find(h => h.id === originalHandoverId);
  assert(foundPending, "Pending handover should appear in distributor list");
  assert(foundPending.expires_in_seconds > 0, "Pending handover should include expires_in_seconds");
  console.log("  ✓ Distributor sees active handover with timer:", foundPending.expires_in_seconds, "s remaining");

  // 3e. Test OTP Verification by Distributor
  console.log("\n[5] Verifying handover by distributor...");
  const verifyRes = await fetch(`${baseUrl}/api/handover/verify`, {
    method: "POST",
    headers: distHeaders,
    body: JSON.stringify({
      handover_id: originalHandoverId,
      passcode: originalPasscode
    })
  });
  assert.strictEqual(verifyRes.status, 200, "Verification should succeed with 200");
  const verifyData = await verifyRes.json();
  assert(verifyData.success, "Verification response success should be true");
  console.log("  ✓ Handover successfully confirmed and verified by distributor!");

  // 3f. Verify that active_handover is now null for the agent
  const finalHandoversRes = await fetch(`${baseUrl}/api/agent/handovers`, {
    headers: freshAgentHeaders
  });
  const finalHandoversData = await finalHandoversRes.json();
  assert.strictEqual(finalHandoversData.active_handover, null, "Active handover should now be null after settlement verification");
  console.log("  ✓ Active handover cleared after hub confirmation!");

  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! Both features verified end-to-end.");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
