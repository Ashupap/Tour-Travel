// pb_hooks/04_agent_api.pb.js
// Custom API routes for Agent Manifest Sync and Atomic Batch Sync (API-01, API-02, SEC-04)

// 1. GET /api/agent/sync-manifest (API-02)
routerAdd("GET", "/api/agent/sync-manifest", (c) => {
  // Helper defined in handler scope for Goja VM pool safety
  function getAgent(c) {
    let authRecord = null;
    try {
      const info = $apis.requestInfo(c);
      authRecord = info.authRecord;
    } catch (e) {}

    if (!authRecord) {
      try {
        let authHeader = "";
        const req = c.request();
        if (req) {
          if (req.header && typeof req.header.get === "function") {
            authHeader = req.header.get("Authorization") || req.header.get("authorization") || "";
          } else if (req.Header && typeof req.Header.Get === "function") {
            authHeader = req.Header.Get("Authorization") || req.Header.Get("authorization") || "";
          }
        }
        if (!authHeader) {
          const info = $apis.requestInfo(c);
          if (info && info.headers) {
            authHeader = info.headers["authorization"] || info.headers["Authorization"] || "";
          }
        }
        if (authHeader) {
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (token) {
            authRecord = $app.dao().findAuthRecordByToken(token, $app.settings().recordAuthToken.secret);
          }
        }
      } catch (e) {}
    }

    if (!authRecord) {
      return { error: c.json(401, { code: 401, message: "Authentication required. Please provide a valid agent Bearer token." }) };
    }

    if (authRecord.getString("role") !== "agent") {
      return { error: c.json(403, { code: 403, message: "Forbidden: Access restricted to field agents." }) };
    }

    return { agent: authRecord };
  }

  const auth = getAgent(c);
  if (auth.error) return auth.error;
  const agent = auth.agent;

  // Fetch subscriptions assigned to this agent
  const subscriptions = $app.dao().findRecordsByExpr(
    "subscriptions",
    $dbx.exp("agent_id = {:agentId}", { agentId: agent.id })
  ) || [];

  const subIds = subscriptions.map((s) => s.id);

  let installments = [];
  if (subIds.length > 0) {
    // In Goja/dbx, construct IN clause using string joining of IDs
    const quotedIds = subIds.map((id) => `'${id}'`).join(",");
    installments = $app.dao().findRecordsByExpr(
      "installments",
      $dbx.exp(`subscription_id IN (${quotedIds})`)
    ) || [];
  }

  // Fetch all active packages for local reference
  const packages = $app.dao().findRecordsByExpr(
    "packages",
    $dbx.exp("is_active = true")
  ) || [];

  // Fetch distributor info for agent
  let distributorInfo = { id: "", name: "Puri Central Hub Desk", phone: "9861099881", email: "" };
  const distId = agent.getString("distributor_id");
  if (distId) {
    try {
      const d = $app.dao().findRecordById("users", distId);
      if (d) {
        distributorInfo = {
          id: d.id,
          name: d.getString("name"),
          phone: d.getString("phone") || "9861099881",
          email: d.getString("email")
        };
      }
    } catch (e) {}
  }

  return c.json(200, {
    synced_at: new Date().toISOString().replace("T", " "),
    agent: {
      id: agent.id,
      name: agent.getString("name"),
      phone: agent.getString("phone")
    },
    distributor: distributorInfo,
    packages: packages.map((p) => ({
      id: p.id,
      title: p.getString("title"),
      destination: p.getString("destination"),
      duration_days: p.getInt("duration_days"),
      total_price: Number(p.get("total_price")) || 0,
      allowed_tenures: p.get("allowed_tenures"),
      min_emis_to_travel: p.getInt("min_emis_to_travel")
    })),
    subscriptions: subscriptions.map((s) => ({
      id: s.id,
      booking_code: s.getString("booking_code"),
      customer_name: s.getString("customer_name"),
      customer_phone: s.getString("customer_phone"),
      customer_address: s.getString("customer_address"),
      package_id: s.getString("package_id"),
      agent_id: s.getString("agent_id"),
      distributor_id: s.getString("distributor_id"),
      tenure_months: s.getInt("tenure_months"),
      total_amount: Number(s.get("total_amount")) || 0,
      monthly_emi_amount: Number(s.get("monthly_emi_amount")) || 0,
      paid_emis_count: s.getInt("paid_emis_count"),
      travel_status: s.getString("travel_status"),
      booking_date: s.getString("booking_date")
    })),
    installments: installments.map((i) => ({
      id: i.id,
      subscription_id: i.getString("subscription_id"),
      installment_no: i.getInt("installment_no"),
      due_date: i.getString("due_date"),
      amount: Number(i.get("amount")) || 0,
      status: i.getString("status"),
      payment_mode: i.getString("payment_mode") || "cash",
      handover_status: i.getString("handover_status") || "",
      receipt_slip_id: i.getString("receipt_slip_id") || "",
      paid_at: i.getString("paid_at") || "",
      collected_by: i.getString("collected_by") || "",
      idempotency_key: i.getString("idempotency_key") || ""
    }))
  });
});

// 2. POST /api/agent/batch-sync (API-01, HOOK-03)
routerAdd("POST", "/api/agent/batch-sync", (c) => {
  // Helper defined in handler scope for Goja VM pool safety
  function getAgent(c) {
    let authRecord = null;
    try {
      const info = $apis.requestInfo(c);
      authRecord = info.authRecord;
    } catch (e) {}

    if (!authRecord) {
      try {
        let authHeader = "";
        const req = c.request();
        if (req) {
          if (req.header && typeof req.header.get === "function") {
            authHeader = req.header.get("Authorization") || req.header.get("authorization") || "";
          } else if (req.Header && typeof req.Header.Get === "function") {
            authHeader = req.Header.Get("Authorization") || req.Header.Get("authorization") || "";
          }
        }
        if (!authHeader) {
          const info = $apis.requestInfo(c);
          if (info && info.headers) {
            authHeader = info.headers["authorization"] || info.headers["Authorization"] || "";
          }
        }
        if (authHeader) {
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (token) {
            authRecord = $app.dao().findAuthRecordByToken(token, $app.settings().recordAuthToken.secret);
          }
        }
      } catch (e) {}
    }

    if (!authRecord) {
      return { error: c.json(401, { code: 401, message: "Authentication required. Please provide a valid agent Bearer token." }) };
    }

    if (authRecord.getString("role") !== "agent") {
      return { error: c.json(403, { code: 403, message: "Forbidden: Access restricted to field agents." }) };
    }

    return { agent: authRecord };
  }

  const auth = getAgent(c);
  if (auth.error) return auth.error;
  const agent = auth.agent;
  const data = $apis.requestInfo(c).data;
  const items = (data && data.items) ? data.items : [];

  if (!Array.isArray(items) || items.length === 0) {
    return c.json(400, { error: "Payload must contain a non-empty 'items' array" });
  }

  let processedCount = 0;
  let skippedCount = 0;
  const results = [];

  try {
    $app.dao().runInTransaction((txDao) => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const key = item.idempotency_key;

        // 1. Check idempotency
        if (key) {
          try {
            const existing = txDao.findFirstRecordByData("installments", "idempotency_key", key);
            if (existing && existing.getString("status") === "paid") {
              skippedCount++;
              results.push({
                installment_id: item.installment_id,
                status: "skipped_duplicate",
                idempotency_key: key
              });
              continue;
            }
          } catch (e) {
            // Record not found is normal for new syncs
          }
        }

        // 2. Find target installment
        if (!item.installment_id) {
          throw new BadRequestError(`Missing installment_id at index ${i}`);
        }

        const installment = txDao.findRecordById("installments", item.installment_id);
        if (!installment) {
          throw new NotFoundError(`Installment ${item.installment_id} not found`);
        }

        // 3. Verify ownership: must belong to a subscription assigned to this agent
        const sub = txDao.findRecordById("subscriptions", installment.getString("subscription_id"));
        if (!sub || sub.getString("agent_id") !== agent.id) {
          throw new ForbiddenError(`Unauthorized: installment ${item.installment_id} belongs to another agent`);
        }

        // 4. Update installment to paid status in agent custody
        installment.set("status", "paid");
        installment.set("payment_mode", item.payment_mode || "cash");
        installment.set("paid_at", item.paid_at || new Date().toISOString().replace("T", " "));
        installment.set("receipt_slip_id", item.receipt_slip_id || `OFF-${agent.id}-${Date.now()}`);
        if (key) {
          installment.set("idempotency_key", key);
        }
        installment.set("collected_by", agent.id);
        installment.set("handover_status", "agent_custody");

        txDao.saveRecord(installment);
        processedCount++;

        results.push({
          installment_id: installment.id,
          status: "synced",
          receipt_slip_id: installment.getString("receipt_slip_id"),
          idempotency_key: key
        });
      }
    });
  } catch (err) {
    console.error("BATCH SYNC ERROR:", err);
    return c.json(400, { error: err.message || String(err) });
  }

  return c.json(200, {
    success: true,
    total_items: items.length,
    processed: processedCount,
    processed_count: processedCount,
    skipped: skippedCount,
    skipped_count: skippedCount,
    results: results
  });
});

// 3. POST /api/agent/subscribe (New Pilgrimage Package Purchase & Enrollment)
routerAdd("POST", "/api/agent/subscribe", (c) => {
  function getAgent(c) {
    let authRecord = null;
    try {
      const info = $apis.requestInfo(c);
      authRecord = info.authRecord;
    } catch (e) {}

    if (!authRecord) {
      try {
        let authHeader = "";
        const req = c.request();
        if (req) {
          if (req.header && typeof req.header.get === "function") {
            authHeader = req.header.get("Authorization") || req.header.get("authorization") || "";
          } else if (req.Header && typeof req.Header.Get === "function") {
            authHeader = req.Header.Get("Authorization") || req.Header.Get("authorization") || "";
          }
        }
        if (!authHeader) {
          const info = $apis.requestInfo(c);
          if (info && info.headers) {
            authHeader = info.headers["authorization"] || info.headers["Authorization"] || "";
          }
        }
        if (authHeader) {
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (token) {
            authRecord = $app.dao().findAuthRecordByToken(token, $app.settings().recordAuthToken.secret);
          }
        }
      } catch (e) {}
    }

    if (!authRecord) {
      return { error: c.json(401, { code: 401, message: "Authentication required. Please provide a valid agent Bearer token." }) };
    }

    if (authRecord.getString("role") !== "agent") {
      return { error: c.json(403, { code: 403, message: "Forbidden: Access restricted to field agents." }) };
    }

    return { agent: authRecord };
  }

  const auth = getAgent(c);
  if (auth.error) return auth.error;
  const agent = auth.agent;

  const data = $apis.requestInfo(c).data || {};
  const packageId = (data.package_id || "").trim();
  const customerName = (data.customer_name || "").trim();
  const customerPhone = (data.customer_phone || "").replace(/[^0-9]/g, "");
  const customerAddress = (data.customer_address || "").trim();
  const tenureMonths = parseInt(data.tenure_months, 10);
  const payInitialEmi = Boolean(data.pay_initial_emi);
  const paymentMode = (data.payment_mode || "cash").toLowerCase();

  // Validations
  if (!packageId) return c.json(400, { error: "Pilgrimage package is required." });
  if (!customerName || customerName.length < 3) return c.json(400, { error: "Devotee full name is required (min 3 letters)." });
  if (!customerPhone || customerPhone.length !== 10) return c.json(400, { error: "Valid 10-digit mobile number is required." });
  if (!customerAddress || customerAddress.length < 5) return c.json(400, { error: "Devotee village / residential address is required." });
  if (!tenureMonths || isNaN(tenureMonths) || tenureMonths < 1) return c.json(400, { error: "Valid tenure months is required." });

  let pkg;
  try {
    pkg = $app.dao().findRecordById("packages", packageId);
  } catch (e) {
    return c.json(404, { error: "Selected pilgrimage tour package not found." });
  }

  if (!pkg || !pkg.getBool("is_active")) {
    return c.json(400, { error: "This pilgrimage package is currently unavailable for enrollment." });
  }

  // Validate tenure against package allowed_tenures if defined
  let allowedTenures = [];
  try {
    const raw = pkg.get("allowed_tenures");
    if (typeof raw === "string") {
      allowedTenures = JSON.parse(raw);
    } else if (raw && typeof raw.length === "number") {
      let str = "";
      for (let idx = 0; idx < raw.length; idx++) {
        str += String.fromCharCode(raw[idx]);
      }
      try {
        allowedTenures = JSON.parse(str);
      } catch (err) {
        allowedTenures = Array.from(raw).map(Number);
      }
    } else if (Array.isArray(raw)) {
      allowedTenures = raw.map(Number);
    }
  } catch (e) {
    allowedTenures = [3, 6, 9, 12];
  }

  if (Array.isArray(allowedTenures) && allowedTenures.length > 0) {
    const isAllowed = allowedTenures.some(t => Number(t) === tenureMonths);
    if (!isAllowed) {
      return c.json(400, { error: `Selected tenure (${tenureMonths} mo) is not allowed. Allowed: ${allowedTenures.join(", ")} months` });
    }
  }

  const totalPrice = Number(pkg.get("total_price")) || 0;
  const monthlyEmi = Math.round((totalPrice / tenureMonths) * 100) / 100;
  const minEmisToTravel = pkg.getInt("min_emis_to_travel") || 3;

  // Generate unique booking code: OD-PURI-YYYYMM-XXXX
  const now = new Date();
  const yearMonth = now.toISOString().slice(2, 7).replace("-", "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const bookingCode = `OD-PURI-${yearMonth}-${randomSuffix}`;

  const distributorId = agent.getString("distributor_id") || "";
  let distributorInfo = { id: "", name: "Puri Central Hub Desk", phone: "9861099881", email: "" };
  if (distributorId) {
    try {
      const d = $app.dao().findRecordById("users", distributorId);
      if (d) {
        distributorInfo = {
          id: d.id,
          name: d.getString("name"),
          phone: d.getString("phone") || "9861099881",
          email: d.getString("email")
        };
      }
    } catch (e) {}
  }

  let sub;
  let inst1Record = null;
  const bookingDateStr = now.toISOString().replace("T", " ");

  try {
    // 1. Create Subscription (HOOK-01 will auto-generate all installments)
    const subsCol = $app.dao().findCollectionByNameOrId("subscriptions");
    sub = new Record(subsCol);
    sub.set("booking_code", bookingCode);
    sub.set("customer_name", customerName);
    sub.set("customer_phone", customerPhone);
    sub.set("customer_address", customerAddress);
    sub.set("package_id", pkg.id);
    sub.set("agent_id", agent.id);
    sub.set("distributor_id", distributorId);
    sub.set("tenure_months", tenureMonths);
    sub.set("total_amount", totalPrice);
    sub.set("monthly_emi_amount", monthlyEmi);
    sub.set("paid_emis_count", payInitialEmi ? 1 : 0);
    sub.set("travel_status", "locked");
    sub.set("booking_date", bookingDateStr);

    $app.dao().saveRecord(sub);

    // 2. If initial EMI paid right now, mark installment #1 as paid
    if (payInitialEmi) {
      const instList = $app.dao().findRecordsByExpr(
        "installments",
        $dbx.exp("subscription_id = {:subId} ORDER BY installment_no ASC LIMIT 1", { subId: sub.id })
      ) || [];

      if (instList.length > 0) {
        inst1Record = instList[0];
        const receiptSlipId = `SLIP-${yearMonth}-${Math.floor(1000 + Math.random() * 9000)}`;
        inst1Record.set("status", "paid");
        inst1Record.set("payment_mode", paymentMode);
        inst1Record.set("paid_at", bookingDateStr);
        inst1Record.set("receipt_slip_id", receiptSlipId);
        inst1Record.set("collected_by", agent.id);
        inst1Record.set("handover_status", "agent_custody");
        inst1Record.set("idempotency_key", `${agent.id}-${inst1Record.id}-${Date.now()}`);
        $app.dao().saveRecord(inst1Record);
      }
    }
  } catch (err) {
    console.error("ERROR CREATING SUBSCRIPTION:", err);
    return c.json(500, { error: "Failed to create subscription: " + err.toString() });
  }

  // Calculate qualification threshold
  const qualifyingAmount = monthlyEmi * minEmisToTravel;

  // Build the complete Enrollment Certificate & Terms Slip
  const enrollmentSlip = {
    certificate_id: `CERT-${sub.id.substring(0, 8).toUpperCase()}`,
    booking_code: bookingCode,
    subscription_id: sub.id,
    booking_date: bookingDateStr,
    customer: {
      name: customerName,
      phone: customerPhone,
      address: customerAddress
    },
    package: {
      id: pkg.id,
      title: pkg.getString("title"),
      destination: pkg.getString("destination"),
      duration_days: pkg.getInt("duration_days"),
      total_price: totalPrice,
      min_emis_to_travel: minEmisToTravel
    },
    plan: {
      tenure_months: tenureMonths,
      monthly_emi_amount: monthlyEmi,
      total_amount: totalPrice,
      qualifying_emis: minEmisToTravel,
      qualifying_amount: qualifyingAmount,
      travel_status: "locked"
    },
    initial_payment: {
      paid: payInitialEmi,
      amount: inst1Record ? Number(inst1Record.get("amount")) : 0,
      receipt_slip_id: inst1Record ? inst1Record.getString("receipt_slip_id") : null,
      payment_mode: payInitialEmi ? paymentMode : null,
      paid_at: inst1Record ? inst1Record.getString("paid_at") : null
    },
    agent: {
      id: agent.id,
      name: agent.getString("name"),
      phone: agent.getString("phone")
    },
    distributor: distributorInfo,
    terms_and_conditions: [
      "1. PAYMENT SCHEDULE: Monthly EMIs are due on or before the monthly anniversary of booking.",
      "2. AUTHORIZED RECEIPT: Cash payments must be made only to authorized BharatYatra Sahayaks against an official system-generated slip. For UPI payments, scan the official QR code.",
      "3. TRAVEL PASS ELIGIBILITY: The Golden Travel Pass unlocks automatically upon timely completion of minimum " + minEmisToTravel + " EMIs (₹" + Math.round(qualifyingAmount) + ").",
      "4. SEAT ALLOCATION: Bus seat assignment is confirmed by the distributor hub once the Travel Pass is unlocked.",
      "5. POST-TRAVEL OBLIGATION: The pilgrim undertakes to honor and complete all remaining monthly installments in full after returning from the pilgrimage."
    ],
    non_payment_guidelines: [
      "1. GRACE PERIOD: A 7-day grace window is granted after the due date with zero penalty or late fee.",
      "2. TRAVEL HOLD: If an EMI remains unpaid for > 15 days, travel eligibility and reserved bus seat allotment are immediately suspended.",
      "3. DEFICIT WATCHLIST: Accounts overdue by > 30 days are assigned to the territory recovery desk for in-person home coordination.",
      "4. CANCELLATION & REFUND: Voluntary cancellation before travel pass unlock is refundable after deducting a 5% administrative handling charge.",
      "5. POST-TRAVEL DEFAULT: Non-payment following completion of the tour is treated as contractual default subject to commercial recovery and credit bureau reporting.",
      "6. GRIEVANCE & SUPPORT: Toll-Free Helpline: 1800-ADITYA-YATRA | Hub Desk: " + distributorInfo.phone
    ]
  };

  return c.json(200, {
    success: true,
    message: "Pilgrimage package booked successfully!",
    enrollment: enrollmentSlip
  });
});

// 4. POST /api/agent/change-password (Sahayak Self-Service Password Change)
routerAdd("POST", "/api/agent/change-password", (c) => {
  function getAgent(c) {
    let authRecord = null;
    try {
      const info = $apis.requestInfo(c);
      authRecord = info.authRecord;
    } catch (e) {}

    if (!authRecord) {
      try {
        let authHeader = "";
        const req = c.request();
        if (req) {
          if (req.header && typeof req.header.get === "function") {
            authHeader = req.header.get("Authorization") || req.header.get("authorization") || "";
          } else if (req.Header && typeof req.Header.Get === "function") {
            authHeader = req.Header.Get("Authorization") || req.Header.Get("authorization") || "";
          }
        }
        if (!authHeader) {
          const info = $apis.requestInfo(c);
          if (info && info.headers) {
            authHeader = info.headers["authorization"] || info.headers["Authorization"] || "";
          }
        }
        if (authHeader) {
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (token) {
            authRecord = $app.dao().findAuthRecordByToken(token, $app.settings().recordAuthToken.secret);
          }
        }
      } catch (e) {}
    }

    if (!authRecord) {
      return { error: c.json(401, { code: 401, message: "Authentication required. Please provide a valid agent Bearer token." }) };
    }

    if (authRecord.getString("role") !== "agent") {
      return { error: c.json(403, { code: 403, message: "Forbidden: Access restricted to field agents." }) };
    }

    return { agent: authRecord };
  }

  const auth = getAgent(c);
  if (auth.error) return auth.error;
  const agent = auth.agent;

  let body = {};
  try {
    body = $apis.requestInfo(c).data || {};
  } catch (e) {}

  const currentPassword = String(body.current_password || body.oldPassword || "").trim();
  const newPassword = String(body.new_password || body.password || "").trim();
  const confirmPassword = String(body.confirm_password || body.passwordConfirm || "").trim();

  if (!currentPassword) {
    return c.json(400, { error: "Current password is required." });
  }
  if (!newPassword) {
    return c.json(400, { error: "New password is required." });
  }
  if (newPassword.length < 8) {
    return c.json(400, { error: "New password must be at least 8 characters long." });
  }
  if (confirmPassword && newPassword !== confirmPassword) {
    return c.json(400, { error: "New password and confirmation do not match." });
  }

  // Validate current password
  let isValid = false;
  try {
    if (typeof agent.validatePassword === "function") {
      isValid = agent.validatePassword(currentPassword);
    } else if (typeof agent.ValidatePassword === "function") {
      isValid = agent.ValidatePassword(currentPassword);
    }
  } catch (e) {
    console.warn("Direct validatePassword check error:", e);
  }

  if (!isValid) {
    return c.json(400, { error: "Current password is incorrect. Please try again." });
  }

  if (currentPassword === newPassword) {
    return c.json(400, { error: "New password must be different from your current password." });
  }

  try {
    agent.setPassword(newPassword);
    $app.dao().saveRecord(agent);
    console.log(`Password changed successfully for Sahayak ${agent.id} (${agent.getString("name")})`);
    return c.json(200, {
      success: true,
      message: "Password changed successfully."
    });
  } catch (err) {
    console.error("Failed to update Sahayak password:", err);
    return c.json(500, { error: "Failed to update password: " + err.message });
  }
});

