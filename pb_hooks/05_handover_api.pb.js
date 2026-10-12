// pb_hooks/05_handover_api.pb.js
// Custom API routes for Cash Handover Initiation and OTP Verification (API-03, API-04, SEC-04)

// 1. POST /api/handover/initiate (API-03, SEC-04)
routerAdd("POST", "/api/handover/initiate", (c) => {
  const HANDOVER_EXPIRY_MS = 15 * 60 * 1000;
  function parsePbDateMs(dateStr) {
    if (!dateStr) return 0;
    try {
      let s = String(dateStr).trim();
      if (!s.includes("T")) s = s.replace(" ", "T");
      if (!s.endsWith("Z") && !s.includes("+")) s += "Z";
      const t = new Date(s).getTime();
      return isNaN(t) ? 0 : t;
    } catch (e) {
      return 0;
    }
  }

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

  const now = Date.now();

  // 1. Guard against duplicate code generation: Check if an active unexpired passcode already exists
  let existingHandovers = [];
  try {
    existingHandovers = $app.dao().findRecordsByExpr(
      "cash_handovers",
      $dbx.exp("agent_id = {:agentId} AND status = 'initiated' ORDER BY created DESC", { agentId: auth.id })
    ) || [];
  } catch (e) {}

  let activeHandover = null;
  for (const h of existingHandovers) {
    const createdMs = parsePbDateMs(h.getString("created"));
    const elapsed = now - createdMs;

    if (createdMs > 0 && elapsed < HANDOVER_EXPIRY_MS) {
      if (!activeHandover) {
        activeHandover = h;
      }
    } else {
      // Prior initiated handover has expired (>= 15 minutes). Auto-mark rejected/expired.
      try {
        h.set("status", "rejected");
        $app.dao().saveRecord(h);
      } catch (e) {}
    }
  }

  // If an unexpired passcode is already active, PREVENT generating a new passcode!
  if (activeHandover) {
    const createdMs = parsePbDateMs(activeHandover.getString("created"));
    const remainingSec = Math.max(0, Math.floor((HANDOVER_EXPIRY_MS - (now - createdMs)) / 1000));
    const covered = activeHandover.get("installments_covered") || [];
    const passcode = activeHandover.getString("otp_code");

    return c.json(200, {
      success: true,
      already_active: true,
      message: "An active settlement passcode is already pending verification at the hub desk.",
      handover_id: activeHandover.id,
      total_amount: Number(activeHandover.get("total_amount")) || 0,
      installments_count: Array.isArray(covered) ? covered.length : 0,
      passcode: passcode,
      otp_code: passcode,
      created: activeHandover.getString("created"),
      expires_at: new Date(createdMs + HANDOVER_EXPIRY_MS).toISOString(),
      expires_in_seconds: remainingSec
    });
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
    totalAmount += Number(inst.get("amount")) || 0;
    coveredIds.push(inst.id);
  }

  // Generate secure 6-digit Sahayak Settlement Passcode
  const passcode = String(Math.floor(100000 + Math.random() * 900000));
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
  handover.set("otp_code", passcode);
  handover.set("status", "initiated");

  $app.dao().saveRecord(handover);

  console.log(`Initiated cash handover ${handover.id} for agent ${auth.id}: ₹${totalAmount} across ${coveredIds.length} installments. Passcode: ${passcode} (Expires in 15 mins)`);

  return c.json(200, {
    success: true,
    already_active: false,
    handover_id: handover.id,
    total_amount: totalAmount,
    installments_count: coveredIds.length,
    passcode: passcode,
    otp_code: passcode,
    created: handover.getString("created"),
    expires_at: new Date(now + HANDOVER_EXPIRY_MS).toISOString(),
    expires_in_seconds: Math.floor(HANDOVER_EXPIRY_MS / 1000)
  });
});

// 2. POST /api/handover/verify (API-04, SEC-04)
routerAdd("POST", "/api/handover/verify", (c) => {
  const HANDOVER_EXPIRY_MS = 15 * 60 * 1000;
  function parsePbDateMs(dateStr) {
    if (!dateStr) return 0;
    try {
      let s = String(dateStr).trim();
      if (!s.includes("T")) s = s.replace(" ", "T");
      if (!s.endsWith("Z") && !s.includes("+")) s += "Z";
      const t = new Date(s).getTime();
      return isNaN(t) ? 0 : t;
    } catch (e) {
      return 0;
    }
  }

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
  const inputPasscode = data ? String(data.passcode || data.otp_code || "").trim() : "";

  if (!handoverId || !inputPasscode) {
    return c.json(400, { error: "Both 'handover_id' and 'passcode' are required" });
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

  // Check 15-minute passcode expiration
  const createdMs = parsePbDateMs(handover.getString("created"));
  if (createdMs > 0 && (Date.now() - createdMs) > HANDOVER_EXPIRY_MS) {
    try {
      handover.set("status", "rejected");
      $app.dao().saveRecord(handover);
    } catch (e) {}
    return c.json(400, {
      code: 400,
      error: "Settlement passcode has expired (valid for 15 minutes). Please ask the Sahayak to generate a fresh passcode."
    });
  }

  if (handover.getString("otp_code") !== inputPasscode) {
    return c.json(400, { error: "Invalid Sahayak verification passcode" });
  }

  // Passcode verified: transition handover and covered installments inside atomic transaction
  const coveredIds = handover.get("installments_covered") || [];

  $app.dao().runInTransaction((txDao) => {
    // 1. Mark handover as verified
    handover.set("status", "verified");
    handover.set("verified_at", new Date().toISOString().replace("T", " "));
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

// 3. GET /api/agent/handovers (Agent Handover Status & History)
routerAdd("GET", "/api/agent/handovers", (c) => {
  const HANDOVER_EXPIRY_MS = 15 * 60 * 1000;
  function parsePbDateMs(dateStr) {
    if (!dateStr) return 0;
    try {
      let s = String(dateStr).trim();
      if (!s.includes("T")) s = s.replace(" ", "T");
      if (!s.endsWith("Z") && !s.includes("+")) s += "Z";
      const t = new Date(s).getTime();
      return isNaN(t) ? 0 : t;
    } catch (e) {
      return 0;
    }
  }

  function getAgent(c) {
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

  const auth = getAgent(c);
  if (!auth) {
    return c.json(401, { code: 401, message: "Authentication required." });
  }
  if (auth.getString("role") !== "agent") {
    return c.json(403, { code: 403, message: "Forbidden: Access restricted to field agents." });
  }

  try {
    // Find handovers for this agent
    let allHandovers = [];
    try {
      allHandovers = $app.dao().findRecordsByExpr(
        "cash_handovers",
        $dbx.exp("agent_id = {:agentId} ORDER BY created DESC", { agentId: auth.id })
      ) || [];
    } catch (e) {
      console.warn("findRecordsByExpr error:", e);
    }

    let activeHandover = null;
    const history = [];

    for (const h of allHandovers) {
      const covered = h.get("installments_covered") || [];
      const count = Array.isArray(covered) ? covered.length : 0;
      const st = h.getString("status");

      let distName = "Distributor Hub";
      const dId = h.getString("distributor_id");
      if (dId) {
        try {
          const d = $app.dao().findRecordById("users", dId);
          if (d) distName = d.getString("name");
        } catch (e) {}
      }

      const item = {
        id: h.id,
        total_amount: Number(h.get("total_amount")) || 0,
        installments_count: count,
        passcode: h.getString("otp_code"),
        status: st,
        distributor_name: distName,
        created: h.getString("created"),
        verified_at: h.getString("verified_at") || h.getString("confirmed_at")
      };

      if (st === "initiated") {
        const createdMs = parsePbDateMs(h.getString("created"));
        const elapsed = Date.now() - createdMs;
        if (createdMs > 0 && elapsed < HANDOVER_EXPIRY_MS) {
          item.expires_at = new Date(createdMs + HANDOVER_EXPIRY_MS).toISOString();
          item.expires_in_seconds = Math.max(0, Math.floor((HANDOVER_EXPIRY_MS - elapsed) / 1000));
          if (!activeHandover) {
            activeHandover = item;
            continue;
          }
        } else {
          // Expired initiated handover: auto-mark rejected
          try {
            h.set("status", "rejected");
            $app.dao().saveRecord(h);
          } catch (e) {}
          item.status = "rejected";
          item.expired = true;
        }
      }
      history.push(item);
    }

    return c.json(200, {
      active_handover: activeHandover,
      history: history
    });
  } catch (err) {
    console.error("GET /api/agent/handovers error:", err);
    return c.json(500, { error: err.toString() });
  }
});

