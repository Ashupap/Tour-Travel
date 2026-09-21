// pb_hooks/05_handover_api.pb.js
// Custom API routes for Cash Handover Initiation and OTP Verification (API-03, API-04, SEC-04)

// 1. POST /api/handover/initiate (API-03, SEC-04)
routerAdd("POST", "/api/handover/initiate", (c) => {
  function getAuth(c) {
    let auth = null;
    try {
      const info = $apis.requestInfo(c);
      auth = info.authRecord;
    } catch (e) {}

    if (!auth) {
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
            auth = $app.dao().findAuthRecordByToken(token, $app.settings().recordAuthToken.secret);
          }
        }
      } catch (e) {}
    }
    return auth;
  }

  const auth = getAuth(c);
  if (!auth) {
    return c.json(401, { code: 401, message: "Authentication required." });
  }
  if (auth.getString("role") !== "agent") {
    return c.json(403, { code: 403, message: "Forbidden: Only agents can initiate cash handovers." });
  }

  // Find all cash installments currently in agent custody
  const installments = $app.dao().findRecordsByExpr(
    "installments",
    $dbx.exp(
      "collected_by = {:agentId} AND payment_mode = 'cash' AND handover_status = 'agent_custody' AND status = 'paid'",
      { agentId: auth.id }
    )
  ) || [];

  if (installments.length === 0) {
    return c.json(400, { error: "No cash in custody available to hand over" });
  }

  let totalAmount = 0;
  const coveredIds = [];
  for (const inst of installments) {
    totalAmount += inst.getFloat("amount");
    coveredIds.push(inst.id);
  }

  // Generate random 4-digit OTP
  const otpCode = String(Math.floor(1000 + Math.random() * 9000));
  const distributorId = auth.getString("distributor_id");

  if (!distributorId) {
    return c.json(400, { error: "Agent does not have an assigned distributor" });
  }

  const handoversCol = $app.dao().findCollectionByNameOrId("cash_handovers");
  const handover = new Record(handoversCol);
  handover.set("agent_id", auth.id);
  handover.set("distributor_id", distributorId);
  handover.set("total_amount", totalAmount);
  handover.set("installments_covered", coveredIds);
  handover.set("otp_code", otpCode);
  handover.set("status", "initiated");

  $app.dao().saveRecord(handover);

  console.log(`Initiated cash handover ${handover.id} for agent ${auth.id}: ₹${totalAmount} across ${coveredIds.length} installments. OTP: ${otpCode}`);

  return c.json(200, {
    success: true,
    handover_id: handover.id,
    total_amount: totalAmount,
    installments_count: coveredIds.length,
    otp_code: otpCode
  });
});

// 2. POST /api/handover/verify (API-04, SEC-04)
routerAdd("POST", "/api/handover/verify", (c) => {
  function getAuth(c) {
    let auth = null;
    try {
      const info = $apis.requestInfo(c);
      auth = info.authRecord;
    } catch (e) {}

    if (!auth) {
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
            auth = $app.dao().findAuthRecordByToken(token, $app.settings().recordAuthToken.secret);
          }
        }
      } catch (e) {}
    }
    return auth;
  }

  const auth = getAuth(c);
  if (!auth) {
    return c.json(401, { code: 401, message: "Authentication required." });
  }

  const role = auth.getString("role");
  if (role !== "distributor" && role !== "admin") {
    return c.json(403, { code: 403, message: "Forbidden: Only distributors or admins can verify cash handovers." });
  }

  const data = $apis.requestInfo(c).data;
  const handoverId = data ? data.handover_id : null;
  const inputOtp = data ? String(data.otp_code).trim() : null;

  if (!handoverId || !inputOtp) {
    return c.json(400, { error: "Both 'handover_id' and 'otp_code' are required" });
  }

  let handover;
  try {
    handover = $app.dao().findRecordById("cash_handovers", handoverId);
  } catch (e) {
    return c.json(404, { code: 404, error: `Cash handover record ${handoverId} not found` });
  }

  if (!handover) {
    return c.json(404, { code: 404, error: `Cash handover record ${handoverId} not found` });
  }

  // Scoping check: Distributor must be assigned to this handover (or admin)
  if (role === "distributor" && handover.getString("distributor_id") !== auth.id) {
    return c.json(403, { code: 403, error: "Forbidden: You are not authorized to verify handovers for another territory" });
  }

  if (handover.getString("status") !== "initiated") {
    return c.json(400, { error: `Cannot verify handover in '${handover.getString("status")}' status` });
  }

  if (handover.getString("otp_code") !== inputOtp) {
    return c.json(400, { error: "Invalid OTP verification code" });
  }

  // OTP verified: transition handover and covered installments inside atomic transaction
  const coveredIds = handover.get("installments_covered") || [];

  $app.dao().runInTransaction((txDao) => {
    // 1. Mark handover as confirmed
    handover.set("status", "confirmed");
    handover.set("confirmed_at", new Date().toISOString().replace("T", " "));
    txDao.saveRecord(handover);

    // 2. Lock covered installments to distributor_confirmed (now immutable via rule)
    for (const instId of coveredIds) {
      try {
        const inst = txDao.findRecordById("installments", instId);
        if (inst) {
          inst.set("handover_status", "distributor_confirmed");
          txDao.saveRecord(inst);
        }
      } catch (err) {
        console.warn(`Could not update installment ${instId} to distributor_confirmed:`, err);
      }
    }
  });

  console.log(`Verified cash handover ${handover.id} by distributor ${auth.id}. ${coveredIds.length} installments marked distributor_confirmed.`);

  return c.json(200, {
    success: true,
    handover_id: handover.id,
    status: "confirmed",
    installments_confirmed: coveredIds.length
  });
});
