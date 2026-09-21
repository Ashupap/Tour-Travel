// pb_hooks/02_installments.pb.js
// Travel Unlock Engine: on installment status update to 'paid' (HOOK-02)

onModelAfterUpdate((e) => {
  const inst = e.model;
  const status = inst.getString("status");
  const subId = inst.getString("subscription_id");

  if (!subId) return;

  try {
    const sub = $app.dao().findRecordById("subscriptions", subId);
    if (!sub) return;

    // Recalculate paid EMIs count for this subscription
    const paidRecords = $app.dao().findRecordsByExpr(
      "installments",
      $dbx.exp("subscription_id = {:subId} AND status = 'paid'", { subId: sub.id })
    );

    const paidCount = paidRecords ? paidRecords.length : 0;
    sub.set("paid_emis_count", paidCount);

    // Check package min_emis_to_travel threshold
    const packageId = sub.getString("package_id");
    if (packageId) {
      const pkg = $app.dao().findRecordById("packages", packageId);
      if (pkg) {
        const minEmis = pkg.getInt("min_emis_to_travel") || 2;
        if (paidCount >= minEmis && sub.getString("travel_status") === "locked") {
          sub.set("travel_status", "eligible");
          console.log(`Unlocked travel eligibility for subscription ${sub.id} (Paid EMIs: ${paidCount}/${minEmis})`);
        }
      }
    }

    $app.dao().saveRecord(sub);
  } catch (err) {
    console.error("Error in installment update hook:", err);
  }
}, "installments");

// Ensure paid_at timestamp is populated when status is updated to paid
onModelBeforeUpdate((e) => {
  const inst = e.model;
  if (inst.getString("status") === "paid" && !inst.getString("paid_at")) {
    inst.set("paid_at", new Date().toISOString());
  }
}, "installments");
