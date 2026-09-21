// pb_public/agent/receipt.js
// Thermal Receipt Formatting & WhatsApp Share Generator (AGNT-04)

function formatThermalReceiptText(data) {
  const line = "--------------------------------";
  const doubleLine = "================================";
  const pad = (label, val, width = 32) => {
    const left = label + ": ";
    const space = Math.max(0, width - left.length - String(val).length);
    return left + " ".repeat(space) + val;
  };

  const center = (text, width = 32) => {
    const space = Math.max(0, Math.floor((width - text.length) / 2));
    return " ".repeat(space) + text;
  };

  const dateStr = data.date ? new Date(data.date).toLocaleString("en-IN") : new Date().toLocaleString("en-IN");
  const formattedAmount = Number(data.amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return [
    doubleLine,
    center("BHARAT YATRA"),
    center("Official EMI Collection Slip"),
    doubleLine,
    pad("Slip ID", data.receipt_slip_id || "N/A"),
    pad("Date", dateStr),
    line,
    pad("Customer", data.customer_name || "N/A"),
    pad("Phone", data.customer_phone || "N/A"),
    pad("Booking", data.booking_code || "N/A"),
    pad("Tour", data.package_title || "Bus Tour Package"),
    pad("EMI No", `${data.installment_no || 1} of ${data.tenure_months || 6}`),
    line,
    pad("AMOUNT PAID", `Rs. ${formattedAmount}`),
    pad("Payment Mode", (data.payment_mode || "CASH").toUpperCase()),
    pad("Status", data.status ? data.status.toUpperCase() : "COLLECTED"),
    pad("Agent", data.agent_name || "BharatYatra Agent"),
    doubleLine,
    center("Thank You For Traveling With Us!"),
    center("Helpline: 1800-BHARAT"),
    doubleLine
  ].join("\n");
}

function generateWhatsAppShareUrl(data) {
  const formattedAmount = Number(data.amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const dateStr = data.date ? new Date(data.date).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");

  const message = [
    `*BHARAT YATRA — Payment Receipt*`,
    ``,
    `*Receipt:* \`${data.receipt_slip_id || "OFFLINE-REC"}\``,
    `*Customer:* ${data.customer_name}`,
    `*Booking Code:* ${data.booking_code}`,
    `*Tour:* ${data.package_title || "Tour Package"}`,
    `*EMI:* #${data.installment_no} (${data.payment_mode ? data.payment_mode.toUpperCase() : "CASH"})`,
    `*Amount Paid:* ₹${formattedAmount}`,
    `*Date:* ${dateStr}`,
    ``,
    `Status: *Verified & Credited*`,
    `Thank you for traveling with BharatYatra!`,
    `Visit: https://bharatyatra.in`
  ].join("\n");

  let phone = String(data.customer_phone || "").replace(/[^0-9]/g, "");
  if (phone.length === 10) {
    phone = "91" + phone;
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

if (typeof window !== "undefined") {
  window.BharatYatraReceipt = {
    formatThermalReceiptText,
    generateWhatsAppShareUrl
  };
}
