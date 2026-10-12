// pb_public/agent/receipt.js
// Thermal Receipt Formatting, Enrollment Agreements, & WhatsApp Share Generators (AGNT-04)

function padLine(label, val, width = 36) {
  const left = label + ": ";
  const space = Math.max(0, width - left.length - String(val).length);
  return left + " ".repeat(space) + val;
}

function centerLine(text, width = 36) {
  const space = Math.max(0, Math.floor((width - text.length) / 2));
  return " ".repeat(space) + text;
}

// 1. Regular EMI Thermal Receipt
function formatThermalReceiptText(data) {
  const line = "-".repeat(36);
  const doubleLine = "=".repeat(36);

  const dateStr = data.date ? new Date(data.date).toLocaleString("en-IN") : new Date().toLocaleString("en-IN");
  const formattedAmount = Number(data.amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return [
    doubleLine,
    centerLine("ADITYA TOUR & TRAVELS"),
    centerLine("Official EMI Collection Slip"),
    doubleLine,
    padLine("Slip ID", data.receipt_slip_id || "N/A"),
    padLine("Date & Time", dateStr),
    line,
    padLine("Devotee", data.customer_name || "N/A"),
    padLine("Phone", data.customer_phone || "N/A"),
    data.customer_address ? padLine("Village", data.customer_address.substring(0, 22)) : "",
    padLine("Booking Code", data.booking_code || "N/A"),
    padLine("Pilgrimage", data.package_title || "Bus Tour Package"),
    padLine("EMI No", `${data.installment_no || 1} of ${data.tenure_months || 6}`),
    line,
    padLine("AMOUNT PAID", `Rs. ${formattedAmount}`),
    padLine("Payment Mode", (data.payment_mode || "CASH").toUpperCase()),
    padLine("Custody State", data.handover_status === "distributor_confirmed" ? "IN HUB SAFE" : "FIELD CUSTODY"),
    padLine("Status", data.status ? data.status.toUpperCase() : "COLLECTED"),
    padLine("Field Sahayak", data.agent_name || "Aditya Travels Sahayak"),
    doubleLine,
    centerLine("Thank You For Traveling With Us!"),
    centerLine("Helpline: 1800-ADITYA-YATRA"),
    doubleLine
  ].filter(Boolean).join("\n");
}

// 2. Official Pilgrimage Booking Enrollment & Terms Slip
function formatEnrollmentSlipText(enrollment) {
  const line = "-".repeat(40);
  const doubleLine = "=".repeat(40);

  const dateStr = enrollment.booking_date 
    ? new Date(enrollment.booking_date).toLocaleString("en-IN") 
    : new Date().toLocaleString("en-IN");

  const totalAmt = Number(enrollment.plan.total_amount || 0).toLocaleString("en-IN");
  const emiAmt = Number(enrollment.plan.monthly_emi_amount || 0).toLocaleString("en-IN");
  const qualAmt = Number(enrollment.plan.qualifying_amount || 0).toLocaleString("en-IN");

  const lines = [
    doubleLine,
    centerLine("ADITYA TOUR & TRAVELS", 40),
    centerLine("PILGRIMAGE ENROLLMENT CERTIFICATE", 40),
    centerLine("Official Booking Agreement", 40),
    doubleLine,
    padLine("Certificate No", enrollment.certificate_id || "N/A", 40),
    padLine("Booking Code", enrollment.booking_code, 40),
    padLine("Enrollment Date", dateStr, 40),
    line,
    centerLine("DEVOTEE PARTICULARS", 40),
    padLine("Full Name", enrollment.customer.name, 40),
    padLine("Mobile Phone", enrollment.customer.phone, 40),
    padLine("Village/Address", enrollment.customer.address.substring(0, 24), 40),
    line,
    centerLine("PILGRIMAGE TOUR DETAILS", 40),
    padLine("Tour Package", enrollment.package.title.substring(0, 24), 40),
    padLine("Destination", enrollment.package.destination || "Sacred Yatra", 40),
    padLine("Tour Duration", `${enrollment.package.duration_days} Days`, 40),
    line,
    centerLine("MICRO-COLLECTION EMI SCHEDULE", 40),
    padLine("Total Yatra Cost", `Rs. ${totalAmt}`, 40),
    padLine("Payment Plan", `${enrollment.plan.tenure_months} Months`, 40),
    padLine("Monthly EMI", `Rs. ${emiAmt} / month`, 40),
    padLine("Travel Unlock Req", `${enrollment.plan.qualifying_emis} EMIs (Rs. ${qualAmt})`, 40),
    line
  ];

  if (enrollment.initial_payment && enrollment.initial_payment.paid) {
    const initAmt = Number(enrollment.initial_payment.amount || 0).toLocaleString("en-IN");
    lines.push(
      centerLine("INITIAL EMI PAYMENT RECEIVED", 40),
      padLine("Receipt Slip ID", enrollment.initial_payment.receipt_slip_id, 40),
      padLine("Amount Paid", `Rs. ${initAmt}`, 40),
      padLine("Mode of Payment", (enrollment.initial_payment.payment_mode || "CASH").toUpperCase(), 40),
      line
    );
  } else {
    lines.push(
      centerLine("INITIAL EMI DEFERRED", 40),
      padLine("First EMI Due", "Within 30 Days of Booking", 40),
      line
    );
  }

  lines.push(
    padLine("Enrolling Sahayak", enrollment.agent.name, 40),
    padLine("Sahayak Phone", enrollment.agent.phone, 40),
    padLine("Territory Hub", enrollment.distributor.name, 40),
    padLine("Hub Desk Contact", enrollment.distributor.phone, 40),
    doubleLine,
    centerLine("PAYMENT TERMS & CONDITIONS", 40),
    doubleLine,
    "1. Fixed monthly installment is due on",
    "   or before the monthly booking cycle.",
    "2. Hand cash only to verified Sahayaks",
    "   against system physical slips or scan",
    "   the verified official BharatYatra QR.",
    "3. Golden Travel Pass unlocks automatically",
    `   when minimum ${enrollment.plan.qualifying_emis} EMIs (Rs. ${qualAmt})`,
    "   are reconciled in the hub system.",
    "4. Yatra bus seat allocation is reserved",
    "   upon Travel Pass eligibility.",
    "5. Devotee undertakes to honor remaining",
    "   installments post-travel in full.",
    line,
    centerLine("NON-PAYMENT & DEFAULT GUIDELINES", 40),
    line,
    "1. GRACE PERIOD: 7 days grace period",
    "   from due date with zero penalty fee.",
    "2. TRAVEL HOLD: Delinquency > 15 days",
    "   suspends Travel Pass and seat holds.",
    "3. DEFICIT WATCH: Overdue > 30 days is",
    "   placed on recovery watchlist.",
    "4. CANCELLATION: Voluntary exit prior to",
    "   travel pass has a nominal 5% fee.",
    "5. POST-TRAVEL DEFAULT: Subject to formal",
    "   commercial recovery & credit reporting.",
    "6. HELPLINE: 1800-ADITYA-YATRA",
    doubleLine,
    centerLine("Aditya Travels - Shubh Yatra!", 40),
    doubleLine
  );

  return lines.join("\n");
}

// 3. WhatsApp Receipt Share Link
function generateWhatsAppShareUrl(data) {
  const formattedAmount = Number(data.amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const dateStr = data.date ? new Date(data.date).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");

  const message = [
    `*ADITYA TOUR & TRAVELS — Official EMI Receipt*`,
    ``,
    `*Receipt Slip:* \`${data.receipt_slip_id || "OFFLINE-REC"}\``,
    `*Devotee:* ${data.customer_name}`,
    `*Booking Code:* ${data.booking_code}`,
    `*Pilgrimage Tour:* ${data.package_title || "Pilgrimage Yatra"}`,
    `*Installment:* EMI #${data.installment_no} of ${data.tenure_months || 6}`,
    `*Amount Collected:* ₹${formattedAmount} (${(data.payment_mode || "CASH").toUpperCase()})`,
    `*Collection Date:* ${dateStr}`,
    `*Collected By:* ${data.agent_name || "Field Sahayak"}`,
    ``,
    `Status: *Verified & Deposited*`,
    `Your pilgrimage journey is in progress!`,
    `Helpline: 1800-ADITYA-YATRA | https://adityatravels.in`
  ].join("\n");

  let phone = String(data.customer_phone || "").replace(/[^0-9]/g, "");
  if (phone.length === 10) phone = "91" + phone;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// 4. WhatsApp Full Enrollment & Agreement Share Link
function generateEnrollmentWhatsAppUrl(enrollment) {
  const totalAmt = Number(enrollment.plan.total_amount || 0).toLocaleString("en-IN");
  const emiAmt = Number(enrollment.plan.monthly_emi_amount || 0).toLocaleString("en-IN");
  const qualAmt = Number(enrollment.plan.qualifying_amount || 0).toLocaleString("en-IN");

  const message = [
    `*ADITYA TOUR & TRAVELS — Pilgrimage Booking Confirmation*`,
    `*Certificate No:* \`${enrollment.certificate_id}\``,
    `*Booking Code:* *${enrollment.booking_code}*`,
    ``,
    `Namaste *${enrollment.customer.name} ji*,`,
    `Your enrollment for *${enrollment.package.title}* (${enrollment.package.duration_days} Days) is successfully confirmed!`,
    ``,
    `*PAYMENT SCHEDULE DETAILS:*`,
    `• Total Yatra Cost: ₹${totalAmt}`,
    `• Plan Tenure: ${enrollment.plan.tenure_months} Months`,
    `• Monthly Installment: ₹${emiAmt} / month`,
    `• Travel Pass Unlock: ${enrollment.plan.qualifying_emis} EMIs (₹${qualAmt})`,
    enrollment.initial_payment && enrollment.initial_payment.paid 
      ? `• 1st EMI Paid: ₹${Number(enrollment.initial_payment.amount).toLocaleString('en-IN')} (Receipt: ${enrollment.initial_payment.receipt_slip_id})`
      : `• 1st EMI Due: Within 30 Days`,
    ``,
    `*KEY TERMS & CONDITIONS:*`,
    `1. Monthly EMIs are due on the monthly enrollment date.`,
    `2. Pay only to authorized Sahayaks against verified slips or official BharatYatra QR code.`,
    `3. Golden Bus Travel Pass unlocks upon payment of ${enrollment.plan.qualifying_emis} EMIs.`,
    `4. Post-travel remaining EMIs must be honored timely without default.`,
    ``,
    `*NON-PAYMENT POLICY:*`,
    `• 7 days grace period with zero penalty.`,
    `• Unpaid > 15 days puts travel pass and seat allocation on hold.`,
    `• Overdue > 30 days placed on territory delinquent watchlist.`,
    `• Post-travel default is subject to commercial recovery.`,
    ``,
    `*Hub Helpline:* 1800-ADITYA-YATRA | ${enrollment.distributor.phone}`,
    `*Enrolled by Sahayak:* ${enrollment.agent.name} (${enrollment.agent.phone})`,
    `Har Har Mahadev! Safe and blessed pilgrimage journey!`
  ].join("\n");

  let phone = String(enrollment.customer.phone || "").replace(/[^0-9]/g, "");
  if (phone.length === 10) phone = "91" + phone;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// 5. WhatsApp EMI Due Reminder Link
function generateDueReminderWhatsAppUrl(item) {
  const amt = Number(item.installment.amount || 0).toLocaleString("en-IN");
  const dueDate = item.installment.due_date 
    ? new Date(item.installment.due_date).toLocaleDateString("en-IN") 
    : "This Month";

  const message = [
    `*ADITYA TOUR & TRAVELS — EMI Reminder*`,
    ``,
    `Namaste *${item.subscription.customer_name} ji*,`,
    `This is a gentle reminder regarding your upcoming EMI for your *${item.package.title || "Pilgrimage Yatra"}* (Booking: *${item.subscription.booking_code}*).`,
    ``,
    `• Installment: *EMI #${item.installment.installment_no}*`,
    `• Amount Due: *₹${amt}*`,
    `• Due Date: *${dueDate}*`,
    ``,
    `Our route Sahayak will be visiting your area for collection. You can also pay via authorized UPI QR code.`,
    `Completing your EMIs on time ensures uninterrupted eligibility for your Golden Travel Pass!`,
    ``,
    `Helpline: 1800-ADITYA-YATRA`
  ].join("\n");

  let phone = String(item.subscription.customer_phone || "").replace(/[^0-9]/g, "");
  if (phone.length === 10) phone = "91" + phone;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// 6. Dynamic UPI URI Generator
function generateUpiUri({ vpa = "adityatravels@upi", name = "BharatYatra Aditya Travels", amount, refId, note = "Yatra EMI" }) {
  const cleanAmt = Number(amount || 0).toFixed(2);
  const cleanRef = encodeURIComponent(refId || ("BY" + Date.now()));
  const cleanNote = encodeURIComponent(note);
  const cleanName = encodeURIComponent(name);

  return `upi://pay?pa=${vpa}&pn=${cleanName}&am=${cleanAmt}&cu=INR&tr=${cleanRef}&tn=${cleanNote}`;
}

if (typeof window !== "undefined") {
  window.BharatYatraReceipt = {
    formatThermalReceiptText,
    formatEnrollmentSlipText,
    generateWhatsAppShareUrl,
    generateEnrollmentWhatsAppUrl,
    generateDueReminderWhatsAppUrl,
    generateUpiUri
  };
}
