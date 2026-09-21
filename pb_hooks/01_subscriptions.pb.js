// pb_hooks/01_subscriptions.pb.js
// Auto-generate installment schedule on subscription creation (HOOK-01)

onModelAfterCreate((e) => {
  const sub = e.model;
  const tenureMonths = sub.getInt("tenure_months");
  const totalAmount = sub.getFloat("total_amount");
  const bookingDateStr = sub.getString("booking_date");

  if (!tenureMonths || tenureMonths <= 0) {
    console.warn("Skipping installment generation: invalid tenure_months", tenureMonths);
    return;
  }

  const installmentsCol = $app.dao().findCollectionByNameOrId("installments");
  const baseMonthly = Math.floor((totalAmount / tenureMonths) * 100) / 100;
  // Calculate remainder to avoid fractional penny loss on total
  const remainder = Math.round((totalAmount - (baseMonthly * tenureMonths)) * 100) / 100;

  let baseDate = new Date();
  if (bookingDateStr) {
    const parsed = new Date(bookingDateStr);
    if (!isNaN(parsed.getTime())) {
      baseDate = parsed;
    }
  }

  for (let i = 1; i <= tenureMonths; i++) {
    const installment = new Record(installmentsCol);
    installment.set("subscription_id", sub.id);
    installment.set("installment_no", i);

    // Allocate remainder to first installment
    const amount = (i === 1) ? Math.round((baseMonthly + remainder) * 100) / 100 : baseMonthly;
    installment.set("amount", amount);
    installment.set("status", "pending");
    installment.set("handover_status", "agent_custody");

    // Rolling monthly due date
    const dueDate = new Date(baseDate.getTime());
    dueDate.setMonth(dueDate.getMonth() + i);
    installment.set("due_date", dueDate.toISOString());

    $app.dao().saveRecord(installment);
  }

  console.log(`Generated ${tenureMonths} installments for subscription ${sub.id} (booking: ${sub.getString("booking_code")})`);
}, "subscriptions");
