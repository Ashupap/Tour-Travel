// pb_hooks/07_public_routes.pb.js
// Custom public routes for BharatYatra Landing Page and Customer Booking Status (LAND-04, LAND-05)

// 1. GET /api/public/booking-status (LAND-04, LAND-05)
routerAdd("GET", "/api/public/booking-status", (c) => {
  function isHtmxRequest(c) {
    try {
      const info = $apis.requestInfo(c);
      if (info && info.headers) {
        if (info.headers["hx-request"] === "true" || info.headers["HX-Request"] === "true") {
          return true;
        }
      }
    } catch (e) {}

    try {
      const req = c.request();
      if (req) {
        if (req.header && typeof req.header.get === "function") {
          if (req.header.get("HX-Request") === "true") return true;
        } else if (req.Header && typeof req.Header.Get === "function") {
          if (req.Header.Get("HX-Request") === "true") return true;
        }
      }
    } catch (e) {}

    return false;
  }

  function sendHtmlResponse(c, code, htmlStr) {
    try {
      if (typeof c.html === "function") return c.html(code, htmlStr);
      if (typeof c.HTML === "function") return c.HTML(code, htmlStr);
      if (typeof c.string === "function") {
        try { c.response().header().set("Content-Type", "text/html; charset=utf-8"); } catch (e) {}
        return c.string(code, htmlStr);
      }
      if (typeof c.String === "function") {
        try { c.response().header().set("Content-Type", "text/html; charset=utf-8"); } catch (e) {}
        return c.String(code, htmlStr);
      }
    } catch (err) {
      console.error("sendHtmlResponse error:", err);
    }
    return c.json(code, { html: htmlStr });
  }

  try {
    const queryParam = c.queryParam("query");
    const query = queryParam ? queryParam.trim() : "";

    if (!query) {
      return c.json(400, { error: "Please enter a valid Booking Reference Code or 10-digit Mobile Number." });
    }

    // 1. Search subscription by booking_code OR customer_phone
    let sub = null;
    try {
      sub = $app.dao().findFirstRecordByData("subscriptions", "booking_code", query);
    } catch (e) {}

    if (!sub) {
      try {
        sub = $app.dao().findFirstRecordByData("subscriptions", "customer_phone", query);
      } catch (e) {}
    }

    const isHtmx = isHtmxRequest(c);

    if (!sub) {
      if (isHtmx) {
        return sendHtmlResponse(c, 200, `
          <div class="rounded-xl border border-red-500/30 bg-red-950/40 p-5 text-center backdrop-blur-md">
            <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-400">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h4 class="text-base font-bold text-red-200">No Booking Found</h4>
            <p class="mt-1 text-xs text-red-300/80">No active reservation was found matching "${query}". Please check your booking code or mobile number.</p>
          </div>
        `);
      }

      return c.json(404, { error: `No active reservation found matching '${query}'` });
    }

    // 2. Fetch associated package
    let pkg = null;
    try {
      pkg = $app.dao().findRecordById("packages", sub.getString("package_id"));
    } catch (e) {}

    const minEmisToTravel = pkg ? pkg.getInt("min_emis_to_travel") : 2;
    const pkgTitle = pkg ? pkg.getString("title") : "Bharat Darshan Tour";
    const pkgDest = pkg ? pkg.getString("destination") : "India";
    const pkgDays = pkg ? pkg.getInt("duration_days") : 7;

    // 3. Fetch all installments sorted by installment_no ASC
    const installments = $app.dao().findRecordsByExpr(
      "installments",
      $dbx.exp("subscription_id = {:subId} ORDER BY installment_no ASC", { subId: sub.id })
    ) || [];

    const paidCount = sub.getInt("paid_emis_count");
    const travelStatus = sub.getString("travel_status");
    const isEligible = travelStatus === "eligible" || travelStatus === "scheduled" || travelStatus === "completed" || paidCount >= minEmisToTravel;

    // Mask phone for public privacy: 9876543210 -> 98*****210
    const phone = sub.getString("customer_phone");
    const maskedPhone = phone && phone.length >= 8
      ? phone.substring(0, 2) + "*****" + phone.substring(phone.length - 3)
      : phone;

    if (isHtmx) {
      // Generate Golden VIP Travel Eligibility Pass HTML snippet
      const statusBadge = isEligible
        ? `<span class="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3.5 py-1 text-xs font-bold text-emerald-300 shadow-lg shadow-emerald-500/10">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
            ELIGIBLE TO TRAVEL
          </span>`
        : `<span class="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/20 px-3.5 py-1 text-xs font-bold text-amber-300 shadow-lg shadow-amber-500/10">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            TRAVEL LOCKED (${paidCount}/${minEmisToTravel} EMIs)
          </span>`;

      const remainingEmis = Math.max(0, minEmisToTravel - paidCount);
      const unlockAdvice = isEligible
        ? `<div class="rounded-lg bg-emerald-900/30 p-2.5 text-center text-xs font-semibold text-emerald-200 border border-emerald-500/30">
            🎉 Congratulations! Your travel threshold has been unlocked. Your bus boarding pass will be dispatched by your distributor.
          </div>`
        : `<div class="rounded-lg bg-amber-900/30 p-2.5 text-center text-xs font-semibold text-amber-200 border border-amber-500/30">
            ⚡ Pay ${remainingEmis} more EMI (${remainingEmis === 1 ? 'month' : 'months'}) to automatically unlock your Luxury Sleeper Bus ticket!
          </div>`;

      let installmentsHtml = "";
      for (const inst of installments) {
        const isPaid = inst.getString("status") === "paid";
        const paidDate = inst.getString("paid_at") ? inst.getString("paid_at").split(" ")[0] : "-";
        const receiptId = inst.getString("receipt_slip_id") || "N/A";
        const statusPill = isPaid
          ? `<span class="text-xs font-bold text-emerald-400">✓ Paid</span>`
          : `<span class="text-xs font-bold text-amber-400/90">Pending</span>`;

        installmentsHtml += `
          <div class="flex items-center justify-between border-b border-amber-500/15 py-2.5 text-xs last:border-0">
            <div>
              <div class="font-medium text-amber-100">EMI #${inst.getInt("installment_no")} — ₹${Math.round(inst.getFloat("amount"))}</div>
              <div class="text-[10px] text-amber-300/60 font-mono">Slip: ${receiptId} • Due: ${inst.getString("due_date").split(" ")[0]}</div>
            </div>
            <div class="text-right">
              <div>${statusPill}</div>
              <div class="text-[10px] text-slate-400">${paidDate}</div>
            </div>
          </div>
        `;
      }

      const html = `
        <div class="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 p-6 text-white shadow-2xl shadow-amber-500/20 backdrop-blur-xl">
          <!-- VIP Card Header -->
          <div class="flex items-start justify-between border-b border-amber-500/30 pb-4">
            <div class="flex items-center gap-3.5">
              <img src="/images/logo.png" alt="Aditya Logo" class="h-11 w-auto object-contain filter drop-shadow" />
              <div>
                <div class="text-[10px] font-bold tracking-widest text-amber-400 uppercase">ADITYA TOUR AND TRAVELS • BHARATYATRA OFFICIAL TRAVEL PASS</div>
                <h3 class="text-xl font-black text-amber-100 mt-0.5">${sub.getString("customer_name")}</h3>
                <div class="text-xs text-amber-200/70 font-mono mt-0.5">Booking ID: <span class="font-bold text-amber-300">${sub.getString("booking_code")}</span></div>
              </div>
            </div>
            <div class="text-right">
              ${statusBadge}
            </div>
          </div>

          <!-- Tour & Package Info -->
          <div class="my-4 grid grid-cols-2 gap-3 rounded-xl border border-amber-500/20 bg-black/40 p-3.5 text-xs">
            <div>
              <div class="text-[10px] text-amber-300/60 uppercase">Destination Package</div>
              <div class="font-bold text-amber-100">${pkgTitle}</div>
              <div class="text-[11px] text-amber-200/80">${pkgDest} • ${pkgDays} Days</div>
            </div>
            <div class="text-right">
              <div class="text-[10px] text-amber-300/60 uppercase">Progress Milestone</div>
              <div class="font-bold text-amber-300">${paidCount} of ${sub.getInt("tenure_months")} EMIs Paid</div>
              <div class="text-[10px] text-amber-400/80">Threshold: ${minEmisToTravel} EMIs to travel</div>
            </div>
          </div>

          <!-- Unlock Advice -->
          <div class="mb-4">
            ${unlockAdvice}
          </div>

          <!-- Payment History Breakdown (LAND-05) -->
          <div class="rounded-xl border border-amber-500/20 bg-black/40 p-3.5">
            <div class="flex items-center justify-between pb-2 border-b border-amber-500/20">
              <h4 class="text-xs font-bold uppercase tracking-wider text-amber-300">Payment Breakdown & Slips</h4>
              <button onclick="window.print()" class="text-[11px] text-amber-400 hover:text-amber-300 underline flex items-center gap-1">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Print Pass
              </button>
            </div>
            <div class="divide-y divide-amber-500/10 max-h-48 overflow-y-auto pr-1 mt-1">
              ${installmentsHtml}
            </div>
          </div>

          <div class="mt-4 text-center text-[10px] text-amber-300/50">
            Official digital receipt slips registered under BharatYatra Micro-Collection Network • Verifiable at any village counter.
          </div>
        </div>
      `;

      return sendHtmlResponse(c, 200, html);
    }

    // JSON format for API consumers
    return c.json(200, {
      success: true,
      subscription: {
        id: sub.id,
        booking_code: sub.getString("booking_code"),
        customer_name: sub.getString("customer_name"),
        customer_phone: maskedPhone,
        tenure_months: sub.getInt("tenure_months"),
        total_amount: sub.getFloat("total_amount"),
        monthly_emi_amount: sub.getFloat("monthly_emi_amount"),
        paid_emis_count: paidCount,
        travel_status: travelStatus,
        is_eligible_to_travel: isEligible,
        min_emis_to_travel: minEmisToTravel
      },
      package: {
        title: pkgTitle,
        destination: pkgDest,
        duration_days: pkgDays
      },
      installments: installments.map((i) => ({
        installment_no: i.getInt("installment_no"),
        amount: i.getFloat("amount"),
        due_date: i.getString("due_date"),
        status: i.getString("status"),
        paid_at: i.getString("paid_at"),
        receipt_slip_id: i.getString("receipt_slip_id")
      }))
    });
  } catch (err) {
    console.error("CRITICAL ERROR in booking-status route:", err);
    return c.json(500, { error: String(err) });
  }
});

// 2. GET /login -> Redirect to /login.html
routerAdd("GET", "/login", (c) => {
  return c.redirect(302, "/login.html");
});

