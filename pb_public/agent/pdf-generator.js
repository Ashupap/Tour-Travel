// pb_public/agent/pdf-generator.js
// High-Fidelity Client-Side PDF Generator & WhatsApp Native File Share for BharatYatra

(function (window) {
  function getJsPdf() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("jsPDF library not loaded");
    }
    return window.jspdf.jsPDF;
  }

  // ============================================================
  // 1. GENERATE EMI PAYMENT RECEIPT SLIP PDF (A5 FORMAT)
  // ============================================================
  function generateEmiReceiptPdf(data) {
    const jsPDF = getJsPdf();
    // A5 format: 148mm x 210mm
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a5"
    });

    const primaryColor = [217, 119, 6]; // Amber-600
    const darkSlate = [15, 23, 42];    // Slate-900
    const textMuted = [100, 116, 139];  // Slate-500

    // Top Header Banner
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 148, 28, "F");

    doc.setFillColor(217, 119, 6);
    doc.rect(0, 28, 148, 2, "F");

    // Company Title
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("ADITYA TOUR & TRAVELS", 74, 11, { align: "center" });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(245, 158, 11);
    doc.text("BHARATYATRA MICRO-COLLECTION SYSTEM", 74, 17, { align: "center" });

    doc.setTextColor(203, 213, 225);
    doc.setFontSize(7.5);
    doc.text("Official Pilgrimage EMI Collection Slip", 74, 23, { align: "center" });

    // Receipt Meta Badge
    const dateStr = data.date ? new Date(data.date).toLocaleString("en-IN") : new Date().toLocaleString("en-IN");
    const slipId = data.receipt_slip_id || ("SLIP-" + Date.now().toString().slice(-8));

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(10, 35, 128, 18, 2, 2, "FD");

    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.setFont("helvetica", "bold");
    doc.text("RECEIPT SLIP ID", 15, 42);
    doc.text("DATE & TIME", 85, 42);

    doc.setFontSize(9.5);
    doc.setTextColor(...darkSlate);
    doc.setFont("helvetica", "bold");
    doc.text(slipId, 15, 48);
    doc.setFontSize(8.5);
    doc.text(dateStr, 85, 48);

    // Devotee & Pilgrimage Details Box
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(10, 58, 128, 56, 2, 2, "D");

    doc.setFillColor(241, 245, 249);
    doc.rect(10, 58, 128, 7, "F");
    doc.setFontSize(8);
    doc.setTextColor(...darkSlate);
    doc.setFont("helvetica", "bold");
    doc.text("PILGRIM & BOOKING DETAILS", 14, 63);

    const rows = [
      ["Devotee Name:", data.customer_name || "N/A"],
      ["Mobile Phone:", data.customer_phone || "N/A"],
      ["Village / Address:", (data.customer_address || "On Record").substring(0, 38)],
      ["Booking Code:", data.booking_code || "N/A"],
      ["Pilgrimage Tour:", (data.package_title || "Bus Tour Package").substring(0, 36)],
      ["Installment Cycle:", `EMI #${data.installment_no || 1} of ${data.tenure_months || 6} Months`]
    ];

    let y = 71;
    doc.setFontSize(8);
    for (const [lbl, val] of rows) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textMuted);
      doc.text(lbl, 14, y);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkSlate);
      doc.text(String(val), 52, y);
      y += 6.8;
    }

    // Amount Paid Highlight Card
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(10, 119, 128, 22, 2, 2, "FD");

    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.setFont("helvetica", "bold");
    doc.text("AMOUNT COLLECTED & VERIFIED", 15, 126);

    const formattedAmt = Number(data.amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text("Rs. " + formattedAmt, 15, 136);

    doc.setFontSize(8.5);
    doc.setTextColor(180, 83, 9);
    doc.text(`MODE: ${(data.payment_mode || "CASH").toUpperCase()}`, 90, 128);
    doc.text(`STATUS: ${data.status ? data.status.toUpperCase() : "PAID"}`, 90, 135);

    // Collector & Custody Audit Details
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);
    doc.setFont("helvetica", "normal");
    doc.text(`Collecting Sahayak: ${data.agent_name || "Field Sahayak"}`, 12, 149);
    doc.text(`Custody Status: ${data.handover_status === "distributor_confirmed" ? "Reconciled in Hub Safe" : "Field Sahayak Custody"}`, 12, 154);
    doc.text("Toll-Free Helpline: 1800-ADITYA-YATRA (1800-234-892)", 12, 159);
    doc.text("Official Portal: https://adityatravels.in", 12, 164);

    // Bottom Decorative Bar
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 198, 148, 12, "F");
    doc.setTextColor(245, 158, 11);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("Thank you for traveling with Aditya Tour & Travels — Shubh Yatra!", 74, 205.5, { align: "center" });

    const filename = `AdityaTravels_Receipt_${slipId}.pdf`;
    const blob = doc.output("blob");

    return { doc, filename, blob };
  }

  // ============================================================
  // 2. GENERATE FULL ENROLLMENT CERTIFICATE & AGREEMENT PDF (A4)
  // ============================================================
  function generateEnrollmentAgreementPdf(enrollment) {
    const jsPDF = getJsPdf();
    // A4 format: 210mm x 297mm
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const primaryColor = [217, 119, 6]; // Amber-600
    const darkSlate = [15, 23, 42];    // Slate-900
    const textMuted = [100, 116, 139];  // Slate-500
    const borderGray = [226, 232, 240];

    // Header Background
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 36, "F");

    doc.setFillColor(217, 119, 6);
    doc.rect(0, 36, 210, 3, "F");

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("ADITYA TOUR & TRAVELS", 105, 14, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(245, 158, 11);
    doc.text("BHARATYATRA PILGRIMAGE ENROLLMENT CERTIFICATE", 105, 21, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(203, 213, 225);
    doc.setFontSize(8.5);
    doc.text("Official Pilgrimage Micro-Collection Agreement & Terms of Travel", 105, 28, { align: "center" });

    // Meta Badge Block
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...borderGray);
    doc.roundedRect(12, 44, 186, 18, 2, 2, "FD");

    const dateStr = enrollment.booking_date 
      ? new Date(enrollment.booking_date).toLocaleString("en-IN") 
      : new Date().toLocaleString("en-IN");

    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.setFont("helvetica", "bold");
    doc.text("CERTIFICATE NUMBER", 18, 51);
    doc.text("BOOKING CODE", 80, 51);
    doc.text("ENROLLMENT DATE", 145, 51);

    doc.setFontSize(10.5);
    doc.setTextColor(...darkSlate);
    doc.text(enrollment.certificate_id || "CERT-OFFLINE", 18, 58);
    doc.setTextColor(217, 119, 6);
    doc.text(enrollment.booking_code, 80, 58);
    doc.setTextColor(...darkSlate);
    doc.setFontSize(9);
    doc.text(dateStr, 145, 58);

    // Section 1: Devotee & Tour Particulars (2 columns)
    // Left: Devotee
    doc.setDrawColor(...borderGray);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(12, 67, 90, 48, 2, 2, "D");

    doc.setFillColor(241, 245, 249);
    doc.rect(12, 67, 90, 7, "F");
    doc.setFontSize(8);
    doc.setTextColor(...darkSlate);
    doc.setFont("helvetica", "bold");
    doc.text("PILGRIM / DEVOTEE PARTICULARS", 16, 72);

    // Safe extraction helpers supporting both nested and flat enrollment payloads
    const custName = enrollment.customer?.name || enrollment.customer_name || "N/A";
    const custPhone = enrollment.customer?.phone || enrollment.customer_phone || "N/A";
    const custAddress = enrollment.customer?.address || enrollment.customer_address || "On Record";

    const pkgTitle = enrollment.package?.title || enrollment.package_title || "Pilgrimage Bus Tour";
    const pkgDest = enrollment.package?.destination || enrollment.destination || "Sacred Shrine";
    const pkgDuration = enrollment.package?.duration_days || enrollment.duration_days || 7;

    const planTotal = Number(enrollment.plan?.total_amount ?? enrollment.total_price ?? 0);
    const planTenure = Number(enrollment.plan?.tenure_months ?? enrollment.tenure_months ?? 6);
    const planEmi = Number(enrollment.plan?.monthly_emi_amount ?? enrollment.monthly_emi ?? Math.round(planTotal / (planTenure || 1)));
    const planQualEmis = Number(enrollment.plan?.qualifying_emis ?? enrollment.min_emis_to_travel ?? 3);
    const planQualAmt = Number(enrollment.plan?.qualifying_amount ?? (planQualEmis * planEmi));

    const initPaid = enrollment.initial_payment?.paid ?? enrollment.initial_payment_done ?? false;
    const initAmt = Number(enrollment.initial_payment?.amount ?? enrollment.initial_payment_amount ?? (initPaid ? planEmi : 0));
    const initMode = enrollment.initial_payment?.payment_mode ?? enrollment.payment_mode ?? "CASH";
    const initReceiptSlip = enrollment.initial_payment?.receipt_slip_id ?? enrollment.receipt_slip_id ?? "RECORDED";

    const devFields = [
      ["Full Name:", custName],
      ["Mobile Phone:", custPhone],
      ["Village/Address:", custAddress.substring(0, 26)]
    ];
    let dy = 80;
    for (const [k, v] of devFields) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textMuted);
      doc.setFontSize(8);
      doc.text(k, 16, dy);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkSlate);
      doc.text(String(v), 42, dy);
      dy += 7;
    }

    // Right: Tour Details
    doc.roundedRect(108, 67, 90, 48, 2, 2, "D");
    doc.setFillColor(241, 245, 249);
    doc.rect(108, 67, 90, 7, "F");
    doc.setFontSize(8);
    doc.setTextColor(...darkSlate);
    doc.setFont("helvetica", "bold");
    doc.text("PILGRIMAGE TOUR PACKAGE", 112, 72);

    const tourFields = [
      ["Tour Package:", pkgTitle.substring(0, 26)],
      ["Destination:", pkgDest.substring(0, 26)],
      ["Duration:", `${pkgDuration} Days / ${Math.max(1, pkgDuration - 1)} Nights`]
    ];
    let ty = 80;
    for (const [k, v] of tourFields) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textMuted);
      doc.setFontSize(8);
      doc.text(k, 112, ty);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkSlate);
      doc.text(String(v), 138, ty);
      ty += 7;
    }

    // Section 2: Financial Plan & Initial Payment (Wide Block)
    doc.setFillColor(254, 243, 199); // Amber-100
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(12, 120, 186, 32, 2, 2, "FD");

    const totalAmt = planTotal.toLocaleString("en-IN");
    const emiAmt = planEmi.toLocaleString("en-IN");
    const qualAmt = planQualAmt.toLocaleString("en-IN");

    doc.setFontSize(8.5);
    doc.setTextColor(180, 83, 9);
    doc.setFont("helvetica", "bold");
    doc.text("MICRO-COLLECTION EMI PAYMENT PLAN", 18, 127);

    doc.setFontSize(8);
    doc.setTextColor(...darkSlate);
    doc.text(`Total Package Price: Rs. ${totalAmt}`, 18, 134);
    doc.text(`Tenure: ${planTenure} Months`, 18, 140);
    doc.text(`Monthly Installment: Rs. ${emiAmt} / month`, 18, 146);

    doc.text(`Travel Pass Qualification: ${planQualEmis} EMIs (Rs. ${qualAmt})`, 105, 134);

    if (initPaid) {
      const formattedInitAmt = initAmt.toLocaleString("en-IN");
      doc.setTextColor(5, 150, 105);
      doc.setFont("helvetica", "bold");
      doc.text(`1st EMI Collected: Rs. ${formattedInitAmt} (${initMode.toUpperCase()})`, 105, 140);
      doc.text(`Receipt Slip ID: ${initReceiptSlip}`, 105, 146);
    } else {
      doc.setTextColor(180, 83, 9);
      doc.text("1st EMI: Deferred (Due within 30 days of booking)", 105, 140);
    }

    // Section 3: Official Terms & Conditions Box
    let curY = 158;
    doc.setDrawColor(...borderGray);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(12, curY, 186, 52, 2, 2, "D");

    doc.setFillColor(241, 245, 249);
    doc.rect(12, curY, 186, 7, "F");
    doc.setFontSize(8);
    doc.setTextColor(...darkSlate);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT TERMS & CONDITIONS", 16, curY + 5);

    const terms = enrollment.terms_and_conditions || [
      "1. PAYMENT SCHEDULE: Monthly EMIs are due on or before the monthly anniversary of booking.",
      "2. AUTHORIZED RECEIPT: Cash payments must be made only to authorized BharatYatra Sahayaks against an official system-generated slip. For UPI payments, scan the official QR code.",
      "3. TRAVEL PASS ELIGIBILITY: The Golden Travel Pass unlocks automatically upon timely completion of minimum required qualifying EMIs.",
      "4. SEAT ALLOCATION: Bus seat assignment is confirmed by the distributor hub once the Travel Pass is unlocked.",
      "5. POST-TRAVEL OBLIGATION: The pilgrim undertakes to honor and complete all remaining monthly installments in full after returning from the pilgrimage."
    ];

    let tY = curY + 12;
    doc.setFontSize(7.5);
    doc.setTextColor(...darkSlate);
    for (const term of terms) {
      doc.setFont("helvetica", "normal");
      const splitText = doc.splitTextToSize(term, 178);
      doc.text(splitText, 16, tY);
      tY += (splitText.length * 3.8) + 1.2;
    }

    // Section 4: Non-Payment Guidelines Box
    curY = 215;
    doc.setDrawColor(...borderGray);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(12, curY, 186, 52, 2, 2, "D");

    doc.setFillColor(254, 226, 226); // Red-100
    doc.rect(12, curY, 186, 7, "F");
    doc.setFontSize(8);
    doc.setTextColor(185, 28, 28);
    doc.setFont("helvetica", "bold");
    doc.text("NON-PAYMENT & DEFAULT GUIDELINES", 16, curY + 5);

    const guidelines = enrollment.non_payment_guidelines || [
      "1. GRACE PERIOD: A 7-day grace window is granted after the due date with zero penalty or late fee.",
      "2. TRAVEL HOLD: If an EMI remains unpaid for > 15 days, travel eligibility and reserved bus seat allotment are immediately suspended.",
      "3. DEFICIT WATCHLIST: Accounts overdue by > 30 days are assigned to the territory recovery desk for in-person home coordination.",
      "4. CANCELLATION & REFUND: Voluntary cancellation before travel pass unlock is refundable after deducting a 5% administrative handling charge.",
      "5. POST-TRAVEL DEFAULT: Non-payment following completion of the tour is treated as contractual default subject to commercial recovery and credit bureau reporting.",
      "6. GRIEVANCE & SUPPORT: Toll-Free Helpline: 1800-ADITYA-YATRA | Hub Desk: " + (enrollment.distributor.phone || "9861099881")
    ];

    let gY = curY + 12;
    doc.setFontSize(7.5);
    doc.setTextColor(...darkSlate);
    for (const g of guidelines) {
      doc.setFont("helvetica", "normal");
      const splitText = doc.splitTextToSize(g, 178);
      doc.text(splitText, 16, gY);
      gY += (splitText.length * 3.8) + 1.2;
    }

    // Authorization & Hub Signatures
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textMuted);

    const agName = enrollment.agent?.name || enrollment.agent_name || "Aditya Travels Sahayak";
    const agPhone = enrollment.agent?.phone || enrollment.agent_phone || "";
    const dtName = enrollment.distributor?.name || enrollment.distributor_name || "Territory Hub Desk";
    const dtPhone = enrollment.distributor?.phone || enrollment.distributor_phone || "1800-ADITYA-YATRA";

    const agText = agPhone ? `Enrolling Sahayak: ${agName} (${agPhone})` : `Enrolling Sahayak: ${agName}`;
    const dtText = dtPhone ? `Territory Hub: ${dtName} (${dtPhone})` : `Territory Hub: ${dtName}`;

    doc.text(agText, 14, 274);
    doc.text(dtText, 14, 279);

    doc.text("Pilgrim Signature / Thumb Impression", 140, 279, { align: "center" });
    doc.line(115, 275, 165, 275);

    // Bottom Decorative Bar
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 285, 210, 12, "F");
    doc.setTextColor(245, 158, 11);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Aditya Tour & Travels — Shubh Yatra! Wishing you a divine and blessed pilgrimage.", 105, 292, { align: "center" });

    const filename = `AdityaTravels_Agreement_${enrollment.booking_code}.pdf`;
    const blob = doc.output("blob");

    return { doc, filename, blob };
  }

  // ============================================================
  // 3. WHATSAPP DIRECT FILE ATTACHMENT SHARER
  // ============================================================
  async function sharePdfViaWhatsApp({ doc, filename, blob, message, phone }) {
    if (!blob && doc) {
      blob = doc.output("blob");
    }

    let cleanPhone = String(phone || "").replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

    const file = new File([blob], filename, { type: "application/pdf" });

    // Check if Web Share API Level 2 (files sharing) is supported
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: filename,
          text: message
        });
        return { success: true, method: "native_share" };
      } catch (err) {
        if (err.name === "AbortError") {
          return { success: false, aborted: true };
        }
        console.warn("Native file share failed, falling back to download + wa.me:", err);
      }
    }

    // Fallback: Trigger instant PDF download + open WhatsApp web/app with prefilled text
    if (doc && typeof doc.save === "function") {
      doc.save(filename);
    } else {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    }

    // Open WhatsApp with prefilled message
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message + "\n\n(Official PDF attached / downloaded to your device)")}`;
    window.open(waUrl, "_blank");

    return { success: true, method: "download_and_whatsapp_open" };
  }

  // Export to global scope
  window.BharatYatraPdf = {
    generateEmiReceiptPdf,
    generateEnrollmentAgreementPdf,
    sharePdfViaWhatsApp
  };
})(window);
