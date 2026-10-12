// pb_hooks/08_distributor_api.pb.js
// Custom API routes for Distributor Dashboard, Territory Analytics, Sahayak Management, & Settlements (DIST-01..05, SEC-04)

// Route mapping for /distributor/dashboard
routerAdd("GET", "/distributor/dashboard", (c) => {
  return c.redirect(302, "/distributor/index.html");
});

// 1. GET /api/distributor/analytics (DIST-01, SEC-04)
routerAdd("GET", "/api/distributor/analytics", (c) => {
  function getDistributorAuth(c) {
    let auth = null;
    try { auth = $apis.requestInfo(c).authRecord; } catch (e) {}
    if (!auth) {
      try {
        let authHeader = "";
        const req = c.request();
        if (req) {
          if (req.header && typeof req.header.get === "function") authHeader = req.header.get("Authorization") || req.header.get("authorization") || "";
          else if (req.Header && typeof req.Header.Get === "function") authHeader = req.Header.Get("Authorization") || req.Header.Get("authorization") || "";
        }
        if (!authHeader) {
          const info = $apis.requestInfo(c);
          if (info && info.headers) authHeader = info.headers["authorization"] || info.headers["Authorization"] || "";
        }
        if (authHeader) {
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (token) auth = $app.dao().findAuthRecordByToken(token, $app.settings().recordAuthToken.secret);
        }
      } catch (e) {}
    }
    if (!auth) { c.json(401, { code: 401, message: "Authentication required." }); return null; }
    const role = auth.getString("role");
    if (role !== "distributor" && role !== "admin") { c.json(403, { code: 403, message: "Forbidden: Access restricted to distributors." }); return null; }
    if (!auth.getBool("is_active")) { c.json(403, { code: 403, message: "Forbidden: Account deactivated." }); return null; }
    return auth;
  }

  const auth = getDistributorAuth(c);
  if (!auth) return;

  const todayStr = new Date().toISOString().substring(0, 10);
  const now = new Date();

  let totalActiveSubs = 0;
  let collectedToday = 0;
  let cashInCustody = 0;
  let totalSettled = 0;
  let totalRealized = 0;
  let totalOverdue = 0;

  const packageCounts = {};

  try {
    const subs = $app.dao().findRecordsByExpr("subscriptions", $dbx.exp("distributor_id = {:distId}", { distId: auth.id })) || [];
    totalActiveSubs = subs.length;

    for (const sub of subs) {
      const pkgId = sub.getString("package_id");
      if (pkgId) {
        if (!packageCounts[pkgId]) packageCounts[pkgId] = { count: 0, total_collected: 0, title: "Tour Circuit" };
        packageCounts[pkgId].count++;
      }

      const insts = $app.dao().findRecordsByExpr("installments", $dbx.exp("subscription_id = {:subId}", { subId: sub.id })) || [];
      for (const inst of insts) {
        const amt = Number(inst.get("amount")) || 0;
        const status = inst.getString("status");
        const handover = inst.getString("handover_status");
        const paidAt = inst.getString("paid_at") || "";
        const dueDate = inst.getString("due_date") || "";

        if (status === "paid") {
          totalRealized += amt;
          if (pkgId && packageCounts[pkgId]) packageCounts[pkgId].total_collected += amt;

          if (paidAt.startsWith(todayStr)) {
            collectedToday += amt;
          }
          if (handover === "agent_custody") {
            cashInCustody += amt;
          } else if (handover === "distributor_confirmed") {
            totalSettled += amt;
          }
        } else if (dueDate && new Date(dueDate.replace(" ", "T")) < now) {
          totalOverdue += amt;
        }
      }
    }
  } catch (errDao) {
    console.error("Error computing territory analytics:", errDao);
  }

  // Populate package titles
  const packageList = [];
  for (const pid in packageCounts) {
    let title = "Tour Package";
    try {
      const p = $app.dao().findRecordById("packages", pid);
      if (p) title = p.getString("title");
    } catch (e) {}
    packageList.push({
      package_id: pid,
      title: title,
      subscribers_count: packageCounts[pid].count,
      total_collected: packageCounts[pid].total_collected
    });
  }

  // Count sahayaks
  let sahayaksCount = 0;
  try {
    const agents = $app.dao().findRecordsByExpr("users", $dbx.exp("role = 'agent' AND distributor_id = {:distId}", { distId: auth.id })) || [];
    sahayaksCount = agents.length;
  } catch (e) {}

  return c.json(200, {
    distributor: {
      id: auth.id,
      name: auth.getString("name"),
      phone: auth.getString("phone"),
      email: auth.getString("email"),
      is_active: auth.getBool("is_active")
    },
    active_sahayaks_count: sahayaksCount,
    devotees_count: totalActiveSubs,
    total_cash_in_custody: totalSettled,
    total_settled_amount: totalSettled,
    metrics: {
      total_active_subscriptions: totalActiveSubs,
      total_sahayaks: sahayaksCount,
      active_sahayaks_count: sahayaksCount,
      devotees_count: totalActiveSubs,
      total_realized_cash: totalRealized,
      total_settled_cash: totalSettled,
      total_settled_amount: totalSettled,
      cash_in_agents_custody: cashInCustody,
      total_cash_in_custody: totalSettled,
      collected_today: collectedToday,
      total_overdue_amount: totalOverdue
    },
    packages: packageList
  });
});

// 2. GET /api/distributor/sahayaks & /api/distributor/agents (DIST-03, SEC-04)
const getDistributorSahayaksHandler = (c) => {
  function getDistributorAuth(c) {
    let auth = null;
    try { auth = $apis.requestInfo(c).authRecord; } catch (e) {}
    if (!auth) {
      try {
        let authHeader = "";
        const req = c.request();
        if (req) {
          if (req.header && typeof req.header.get === "function") authHeader = req.header.get("Authorization") || req.header.get("authorization") || "";
          else if (req.Header && typeof req.Header.Get === "function") authHeader = req.Header.Get("Authorization") || req.Header.Get("authorization") || "";
        }
        if (!authHeader) {
          const info = $apis.requestInfo(c);
          if (info && info.headers) authHeader = info.headers["authorization"] || info.headers["Authorization"] || "";
        }
        if (authHeader) {
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (token) auth = $app.dao().findAuthRecordByToken(token, $app.settings().recordAuthToken.secret);
        }
      } catch (e) {}
    }
    if (!auth) { c.json(401, { code: 401, message: "Authentication required." }); return null; }
    const role = auth.getString("role");
    if (role !== "distributor" && role !== "admin") { c.json(403, { code: 403, message: "Forbidden: Access restricted to distributors." }); return null; }
    if (!auth.getBool("is_active")) { c.json(403, { code: 403, message: "Forbidden: Account deactivated." }); return null; }
    return auth;
  }

  const auth = getDistributorAuth(c);
  if (!auth) return;

  try {
    const rawAgents = $app.dao().findRecordsByExpr(
      "users",
      $dbx.exp("role = 'agent' AND distributor_id = {:distId}", { distId: auth.id })
    ) || [];

    const todayStr = new Date().toISOString().substring(0, 10);
    const roster = [];

    for (let aIdx = 0; aIdx < rawAgents.length; aIdx++) {
      const agent = rawAgents[aIdx];
      let cashInCustody = 0;
      try {
        const custodyInstallments = $app.dao().findRecordsByExpr(
          "installments",
          $dbx.exp("collected_by = {:agentId} AND payment_mode = 'cash' AND handover_status = 'agent_custody' AND status = 'paid'", { agentId: agent.id })
        ) || [];
        for (let cIdx = 0; cIdx < custodyInstallments.length; cIdx++) {
          cashInCustody += Number(custodyInstallments[cIdx].get("amount")) || 0;
        }
      } catch (e) {}

      let collectedToday = 0;
      let totalCollected = 0;
      try {
        const allPaid = $app.dao().findRecordsByExpr(
          "installments",
          $dbx.exp("collected_by = {:agentId} AND status = 'paid'", { agentId: agent.id })
        ) || [];
        for (let pIdx = 0; pIdx < allPaid.length; pIdx++) {
          const amt = Number(allPaid[pIdx].get("amount")) || 0;
          totalCollected += amt;
          const paidAt = allPaid[pIdx].getString("paid_at") || "";
          if (paidAt.startsWith(todayStr)) {
            collectedToday += amt;
          }
        }
      } catch (e) {}

      let subCount = 0;
      try {
        const subs = $app.dao().findRecordsByExpr(
          "subscriptions",
          $dbx.exp("agent_id = {:agentId}", { agentId: agent.id })
        ) || [];
        subCount = subs.length;
      } catch (e) {}

      roster.push({
        id: agent.id,
        name: agent.getString("name"),
        phone: agent.getString("phone"),
        email: agent.getString("email"),
        is_active: agent.getBool("is_active"),
        subscriptions_count: subCount,
        cash_in_custody: cashInCustody,
        collected_today: collectedToday,
        total_collected: totalCollected,
        created: agent.getString("created")
      });
    }

    roster.sort((a, b) => (b.created || "").localeCompare(a.created || ""));

    return c.json(200, {
      count: roster.length,
      agents: roster,
      items: roster
    });
  } catch (err) {
    console.error("Error in getSahayaksList:", err);
    return c.json(500, { error: err.toString() });
  }
};

routerAdd("GET", "/api/distributor/sahayaks", getDistributorSahayaksHandler);
routerAdd("GET", "/api/distributor/agents", getDistributorSahayaksHandler);

// 3. GET /api/distributor/delinquents (DIST-04, SEC-04)
routerAdd("GET", "/api/distributor/delinquents", (c) => {
  function getDistributorAuth(c) {
    let auth = null;
    try { auth = $apis.requestInfo(c).authRecord; } catch (e) {}
    if (!auth) {
      try {
        let authHeader = "";
        const req = c.request();
        if (req) {
          if (req.header && typeof req.header.get === "function") authHeader = req.header.get("Authorization") || req.header.get("authorization") || "";
          else if (req.Header && typeof req.Header.Get === "function") authHeader = req.Header.Get("Authorization") || req.Header.Get("authorization") || "";
        }
        if (!authHeader) {
          const info = $apis.requestInfo(c);
          if (info && info.headers) authHeader = info.headers["authorization"] || info.headers["Authorization"] || "";
        }
        if (authHeader) {
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (token) auth = $app.dao().findAuthRecordByToken(token, $app.settings().recordAuthToken.secret);
        }
      } catch (e) {}
    }
    if (!auth) { c.json(401, { code: 401, message: "Authentication required." }); return null; }
    const role = auth.getString("role");
    if (role !== "distributor" && role !== "admin") { c.json(403, { code: 403, message: "Forbidden: Access restricted to distributors." }); return null; }
    if (!auth.getBool("is_active")) { c.json(403, { code: 403, message: "Forbidden: Account deactivated." }); return null; }
    return auth;
  }

  const auth = getDistributorAuth(c);
  if (!auth) return;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().replace("T", " ");

  const subscriptions = $app.dao().findRecordsByExpr(
    "subscriptions",
    $dbx.exp("distributor_id = {:distId}", { distId: auth.id })
  ) || [];

  const subMap = {};
  const subIds = [];
  for (const s of subscriptions) {
    subMap[s.id] = s;
    subIds.push(s.id);
  }

  const delinquents = [];

  if (subIds.length > 0) {
    const quotedIds = subIds.map((id) => `'${id}'`).join(",");
    const overdueInsts = $app.dao().findRecordsByExpr(
      "installments",
      $dbx.exp(`subscription_id IN (${quotedIds}) AND status IN ('pending', 'overdue') AND due_date < {:cutoff}`, { cutoff: thirtyDaysAgo })
    ) || [];

    for (const inst of overdueInsts) {
      const sub = subMap[inst.getString("subscription_id")];
      const dueDate = new Date(inst.getString("due_date").replace(" ", "T"));
      const daysOverdue = Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

      delinquents.push({
        installment_id: inst.id,
        subscription_id: sub ? sub.id : "",
        booking_code: sub ? sub.getString("booking_code") : "",
        customer_name: sub ? sub.getString("customer_name") : "Unknown",
        customer_phone: sub ? sub.getString("customer_phone") : "",
        installment_no: inst.getInt("installment_no"),
        due_date: inst.getString("due_date"),
        days_overdue: daysOverdue,
        amount: inst.getFloat("amount"),
        agent_id: sub ? sub.getString("agent_id") : ""
      });
    }
  }

  return c.json(200, {
    count: delinquents.length,
    delinquents: delinquents
  });
});

// 4. GET /api/distributor/pending-handovers (DIST-02, SEC-04)
routerAdd("GET", "/api/distributor/pending-handovers", (c) => {
  function getDistributorAuth(c) {
    let auth = null;
    try { auth = $apis.requestInfo(c).authRecord; } catch (e) {}
    if (!auth) {
      try {
        let authHeader = "";
        const req = c.request();
        if (req) {
          if (req.header && typeof req.header.get === "function") authHeader = req.header.get("Authorization") || req.header.get("authorization") || "";
          else if (req.Header && typeof req.Header.Get === "function") authHeader = req.Header.Get("Authorization") || req.Header.Get("authorization") || "";
        }
        if (!authHeader) {
          const info = $apis.requestInfo(c);
          if (info && info.headers) authHeader = info.headers["authorization"] || info.headers["Authorization"] || "";
        }
        if (authHeader) {
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (token) auth = $app.dao().findAuthRecordByToken(token, $app.settings().recordAuthToken.secret);
        }
      } catch (e) {}
    }
    if (!auth) { c.json(401, { code: 401, message: "Authentication required." }); return null; }
    const role = auth.getString("role");
    if (role !== "distributor" && role !== "admin") { c.json(403, { code: 403, message: "Forbidden: Access restricted to distributors." }); return null; }
    if (!auth.getBool("is_active")) { c.json(403, { code: 403, message: "Forbidden: Account deactivated." }); return null; }
    return auth;
  }

  const auth = getDistributorAuth(c);
  if (!auth) return;

  try {
    const handovers = $app.dao().findRecordsByExpr(
      "cash_handovers",
      $dbx.exp("distributor_id = {:distId} AND status = 'initiated'", { distId: auth.id })
    ) || [];

    handovers.sort((a, b) => (b.getString("created") || "").localeCompare(a.getString("created") || ""));

    const pendingList = [];
    const now = Date.now();
    const HANDOVER_EXPIRY_MS = 15 * 60 * 1000;

    for (const h of handovers) {
      let createdMs = 0;
      try {
        let cr = String(h.getString("created") || "").trim();
        if (cr) {
          if (!cr.includes("T")) cr = cr.replace(" ", "T");
          if (!cr.endsWith("Z") && !cr.includes("+")) cr += "Z";
          createdMs = new Date(cr).getTime();
        }
      } catch (e) {}

      const elapsed = now - createdMs;
      if (createdMs > 0 && elapsed >= HANDOVER_EXPIRY_MS) {
        // Expired initiated handover: auto-mark rejected
        try {
          h.set("status", "rejected");
          $app.dao().saveRecord(h);
        } catch (e) {}
        continue;
      }

      let agentName = "Field Agent";
      let agentPhone = "";
      try {
        const agent = $app.dao().findRecordById("users", h.getString("agent_id"));
        if (agent) {
          agentName = agent.getString("name");
          agentPhone = agent.getString("phone");
        }
      } catch (e) {}

      const covered = h.get("installments_covered") || [];
      const remainingSec = createdMs > 0 ? Math.max(0, Math.floor((HANDOVER_EXPIRY_MS - elapsed) / 1000)) : 900;

      pendingList.push({
        id: h.id,
        agent_id: h.getString("agent_id"),
        agent_name: agentName,
        agent_phone: agentPhone,
        total_amount: Number(h.get("total_amount")) || 0,
        installments_count: Array.isArray(covered) ? covered.length : 0,
        created: h.getString("created"),
        status: h.getString("status"),
        expires_at: createdMs > 0 ? new Date(createdMs + HANDOVER_EXPIRY_MS).toISOString() : null,
        expires_in_seconds: remainingSec
      });
    }

    return c.json(200, {
      count: pendingList.length,
      handovers: pendingList
    });
  } catch (err) {
    console.error("Error in pending-handovers:", err);
    return c.json(500, { error: err.toString() });
  }
});

// 5. POST /api/distributor/sahayaks (Register Sahayak under this distributor)
routerAdd("POST", "/api/distributor/sahayaks", (c) => {
  function getDistributorAuth(c) {
    let auth = null;
    try { auth = $apis.requestInfo(c).authRecord; } catch (e) {}
    if (!auth) {
      try {
        let authHeader = "";
        const req = c.request();
        if (req) {
          if (req.header && typeof req.header.get === "function") authHeader = req.header.get("Authorization") || req.header.get("authorization") || "";
          else if (req.Header && typeof req.Header.Get === "function") authHeader = req.Header.Get("Authorization") || req.Header.Get("authorization") || "";
        }
        if (!authHeader) {
          const info = $apis.requestInfo(c);
          if (info && info.headers) authHeader = info.headers["authorization"] || info.headers["Authorization"] || "";
        }
        if (authHeader) {
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (token) auth = $app.dao().findAuthRecordByToken(token, $app.settings().recordAuthToken.secret);
        }
      } catch (e) {}
    }
    if (!auth) { c.json(401, { code: 401, message: "Authentication required." }); return null; }
    const role = auth.getString("role");
    if (role !== "distributor" && role !== "admin") { c.json(403, { code: 403, message: "Forbidden: Access restricted to distributors." }); return null; }
    if (!auth.getBool("is_active")) { c.json(403, { code: 403, message: "Forbidden: Account deactivated." }); return null; }
    return auth;
  }

  const auth = getDistributorAuth(c);
  if (!auth) return;

  let body = {};
  try { body = $apis.requestInfo(c).data || {}; } catch (e) {}

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim();
  const password = String(body.password || "").trim();

  if (name.length < 2) return c.json(400, { message: "Name must be at least 2 characters." });
  if (!email || !email.includes("@")) return c.json(400, { message: "Valid email address is required." });
  if (phone.length < 10 || phone.length > 15) return c.json(400, { message: "Phone number must be 10-15 digits." });
  if (password.length < 8) return c.json(400, { message: "Password must be at least 8 characters." });

  try {
    const existing = $app.dao().findRecordsByExpr("users", $dbx.exp("email = {:e} OR phone = {:p}", { e: email, p: phone })) || [];
    if (existing.length > 0) {
      return c.json(400, { message: "A user with this email or phone already exists." });
    }

    const col = $app.dao().findCollectionByNameOrId("users");
    const rec = new Record(col);
    const baseUser = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
    const username = (baseUser || "agent") + "_" + Math.floor(10000 + Math.random() * 90000);
    rec.set("username", username);
    rec.set("name", name);
    rec.set("email", email);
    rec.set("phone", phone);
    rec.set("role", "agent");
    rec.set("distributor_id", auth.id);
    rec.set("commission_percentage", 0);
    rec.set("is_active", true);
    rec.setPassword(password);
    $app.dao().saveRecord(rec);

    return c.json(201, {
      id: rec.id,
      name: name,
      email: email,
      phone: phone,
      distributor_id: auth.id,
      role: "agent",
      is_active: true
    });
  } catch (err) {
    return c.json(500, { message: "Failed to register Sahayak: " + err.message });
  }
});

// 6. PATCH /api/distributor/sahayaks/:id (Update Sahayak details & active status)
routerAdd("PATCH", "/api/distributor/sahayaks/:id", (c) => {
  function getDistributorAuth(c) {
    let auth = null;
    try { auth = $apis.requestInfo(c).authRecord; } catch (e) {}
    if (!auth) {
      try {
        let authHeader = "";
        const req = c.request();
        if (req) {
          if (req.header && typeof req.header.get === "function") authHeader = req.header.get("Authorization") || req.header.get("authorization") || "";
          else if (req.Header && typeof req.Header.Get === "function") authHeader = req.Header.Get("Authorization") || req.Header.Get("authorization") || "";
        }
        if (!authHeader) {
          const info = $apis.requestInfo(c);
          if (info && info.headers) authHeader = info.headers["authorization"] || info.headers["Authorization"] || "";
        }
        if (authHeader) {
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (token) auth = $app.dao().findAuthRecordByToken(token, $app.settings().recordAuthToken.secret);
        }
      } catch (e) {}
    }
    if (!auth) { c.json(401, { code: 401, message: "Authentication required." }); return null; }
    const role = auth.getString("role");
    if (role !== "distributor" && role !== "admin") { c.json(403, { code: 403, message: "Forbidden: Access restricted to distributors." }); return null; }
    if (!auth.getBool("is_active")) { c.json(403, { code: 403, message: "Forbidden: Account deactivated." }); return null; }
    return auth;
  }

  const auth = getDistributorAuth(c);
  if (!auth) return;

  const id = c.pathParam("id");
  let rec = null;
  try { rec = $app.dao().findRecordById("users", id); } catch (e) {}

  if (!rec || rec.getString("role") !== "agent" || rec.getString("distributor_id") !== auth.id) {
    return c.json(404, { message: "Sahayak not found in your territory." });
  }

  let body = {};
  try { body = $apis.requestInfo(c).data || {}; } catch (e) {}

  if (body.name !== undefined) rec.set("name", String(body.name).trim());
  if (body.phone !== undefined) rec.set("phone", String(body.phone).trim());
  if (body.is_active !== undefined) rec.set("is_active", !!body.is_active);

  try {
    $app.dao().saveRecord(rec);
    return c.json(200, {
      id: rec.id,
      name: rec.getString("name"),
      phone: rec.getString("phone"),
      email: rec.getString("email"),
      is_active: rec.getBool("is_active")
    });
  } catch (err) {
    return c.json(500, { message: "Failed to update Sahayak: " + err.message });
  }
});

// 7. POST /api/distributor/sahayaks/:id/reset-password (Reset Sahayak Password)
routerAdd("POST", "/api/distributor/sahayaks/:id/reset-password", (c) => {
  function getDistributorAuth(c) {
    let auth = null;
    try { auth = $apis.requestInfo(c).authRecord; } catch (e) {}
    if (!auth) {
      try {
        let authHeader = "";
        const req = c.request();
        if (req) {
          if (req.header && typeof req.header.get === "function") authHeader = req.header.get("Authorization") || req.header.get("authorization") || "";
          else if (req.Header && typeof req.Header.Get === "function") authHeader = req.Header.Get("Authorization") || req.Header.Get("authorization") || "";
        }
        if (!authHeader) {
          const info = $apis.requestInfo(c);
          if (info && info.headers) authHeader = info.headers["authorization"] || info.headers["Authorization"] || "";
        }
        if (authHeader) {
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (token) auth = $app.dao().findAuthRecordByToken(token, $app.settings().recordAuthToken.secret);
        }
      } catch (e) {}
    }
    if (!auth) { c.json(401, { code: 401, message: "Authentication required." }); return null; }
    const role = auth.getString("role");
    if (role !== "distributor" && role !== "admin") { c.json(403, { code: 403, message: "Forbidden: Access restricted to distributors." }); return null; }
    if (!auth.getBool("is_active")) { c.json(403, { code: 403, message: "Forbidden: Account deactivated." }); return null; }
    return auth;
  }

  const auth = getDistributorAuth(c);
  if (!auth) return;

  const id = c.pathParam("id");
  let rec = null;
  try { rec = $app.dao().findRecordById("users", id); } catch (e) {}

  if (!rec || rec.getString("role") !== "agent" || rec.getString("distributor_id") !== auth.id) {
    return c.json(404, { message: "Sahayak not found in your territory." });
  }

  let body = {};
  try { body = $apis.requestInfo(c).data || {}; } catch (e) {}

  const password = String(body.password || "").trim();
  if (password.length < 8) {
    return c.json(400, { message: "Password must be at least 8 characters." });
  }

  try {
    rec.setPassword(password);
    $app.dao().saveRecord(rec);
    return c.json(200, { message: "Password updated successfully." });
  } catch (err) {
    return c.json(500, { message: "Failed to reset password: " + err.message });
  }
});

// 8. GET /api/distributor/sahayaks/:id/analytics (Sahayak drill-down within territory)
routerAdd("GET", "/api/distributor/sahayaks/:id/analytics", (c) => {
  function getDistributorAuth(c) {
    let auth = null;
    try { auth = $apis.requestInfo(c).authRecord; } catch (e) {}
    if (!auth) {
      try {
        let authHeader = "";
        const req = c.request();
        if (req) {
          if (req.header && typeof req.header.get === "function") authHeader = req.header.get("Authorization") || req.header.get("authorization") || "";
          else if (req.Header && typeof req.Header.Get === "function") authHeader = req.Header.Get("Authorization") || req.Header.Get("authorization") || "";
        }
        if (!authHeader) {
          const info = $apis.requestInfo(c);
          if (info && info.headers) authHeader = info.headers["authorization"] || info.headers["Authorization"] || "";
        }
        if (authHeader) {
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (token) auth = $app.dao().findAuthRecordByToken(token, $app.settings().recordAuthToken.secret);
        }
      } catch (e) {}
    }
    if (!auth) { c.json(401, { code: 401, message: "Authentication required." }); return null; }
    const role = auth.getString("role");
    if (role !== "distributor" && role !== "admin") { c.json(403, { code: 403, message: "Forbidden: Access restricted to distributors." }); return null; }
    if (!auth.getBool("is_active")) { c.json(403, { code: 403, message: "Forbidden: Account deactivated." }); return null; }
    return auth;
  }

  const auth = getDistributorAuth(c);
  if (!auth) return;

  const id = c.pathParam("id");
  let ag = null;
  try { ag = $app.dao().findRecordById("users", id); } catch (e) {}

  if (!ag || ag.getString("role") !== "agent" || ag.getString("distributor_id") !== auth.id) {
    return c.json(404, { message: "Sahayak not found in your territory." });
  }

  let subs = [];
  try {
    subs = $app.dao().findRecordsByExpr("subscriptions", $dbx.exp("agent_id = {:id}", { id: id })) || [];
    subs.sort((a, b) => (b.getString("created") || "").localeCompare(a.getString("created") || ""));
  } catch (e) {}

  const nowIso = new Date().toISOString().substring(0, 10);
  const devoteeList = [];
  let totalCollected = 0;
  let cashInCustody = 0;
  let totalSettled = 0;
  let overdueCount = 0;

  for (let i = 0; i < subs.length; i++) {
    const s = subs[i];
    let pkgTitle = "Tour Package";
    let minEmis = 2;
    try {
      const p = $app.dao().findRecordById("packages", s.getString("package_id"));
      if (p) {
        pkgTitle = p.getString("title");
        minEmis = p.getInt("min_emis_to_travel") || 2;
      }
    } catch (e) {}

    let sPaid = 0;
    let sOverdue = 0;
    try {
      const insts = $app.dao().findRecordsByExpr("installments", $dbx.exp("subscription_id = {:sid}", { sid: s.id })) || [];
      for (let k = 0; k < insts.length; k++) {
        const amt = Number(insts[k].get("amount")) || 0;
        const st = insts[k].getString("status");
        const dt = insts[k].getString("due_date");
        if (st === "paid") {
          sPaid += amt;
        } else if (dt && dt <= nowIso) {
          sOverdue += amt;
        }
      }
    } catch (e) {}

    const paidCount = s.getInt("paid_emis_count");
    const travelStatus = s.getString("travel_status") || "locked";
    let badge = "saving";
    if (sOverdue > 0) {
      badge = "overdue";
      overdueCount++;
    } else if (travelStatus === "eligible" || travelStatus === "scheduled" || travelStatus === "completed" || paidCount >= minEmis) {
      badge = "eligible";
    }

    devoteeList.push({
      id: s.id,
      booking_code: s.getString("booking_code"),
      customer_name: s.getString("customer_name"),
      customer_phone: s.getString("customer_phone"),
      package_title: pkgTitle,
      total_amount: Number(s.get("total_amount")) || 0,
      paid_emis_count: paidCount,
      total_emis: s.getInt("tenure_months"),
      amount_paid: sPaid,
      overdue_amount: sOverdue,
      badge: badge,
      travel_status: travelStatus
    });
  }

  // Handover & custody stats
  try {
    const insts = $app.dao().findRecordsByExpr("installments", $dbx.exp("collected_by = {:agId} AND status = 'paid'", { agId: id })) || [];
    for (let j = 0; j < insts.length; j++) {
      const amt = Number(insts[j].get("amount")) || 0;
      totalCollected += amt;
      const hStatus = insts[j].getString("handover_status");
      if (hStatus === "agent_custody") {
        cashInCustody += amt;
      } else if (hStatus === "distributor_confirmed") {
        totalSettled += amt;
      }
    }
  } catch (e) {}

  let handovers = [];
  try {
    const hRecs = $app.dao().findRecordsByExpr(
      "cash_handovers",
      $dbx.exp("agent_id = {:aid} AND distributor_id = {:did}", { aid: id, did: auth.id })
    ) || [];
    hRecs.sort((a, b) => (b.getString("created") || "").localeCompare(a.getString("created") || ""));
    handovers = hRecs.slice(0, 15).map(h => ({
      id: h.id,
      total_amount: Number(h.get("total_amount")) || 0,
      status: h.getString("status"),
      verified_at: h.getString("verified_at"),
      created: h.getString("created")
    }));
  } catch (e) {}

  return c.json(200, {
    sahayak: {
      id: ag.id,
      name: ag.getString("name"),
      email: ag.getString("email"),
      phone: ag.getString("phone"),
      is_active: ag.getBool("is_active"),
      created: ag.getString("created")
    },
    summary: {
      total_devotees: subs.length,
      overdue_devotees: overdueCount,
      total_collected: totalCollected,
      cash_in_custody: cashInCustody,
      cash_float: cashInCustody,
      total_settled: totalSettled
    },
    devotees: devoteeList,
    recent_handovers: handovers
  });
});

// 9. GET /api/distributor/devotees (All devotees enrolled in territory)
routerAdd("GET", "/api/distributor/devotees", (c) => {
  function getDistributorAuth(c) {
    let auth = null;
    try { auth = $apis.requestInfo(c).authRecord; } catch (e) {}
    if (!auth) {
      try {
        let authHeader = "";
        const req = c.request();
        if (req) {
          if (req.header && typeof req.header.get === "function") authHeader = req.header.get("Authorization") || req.header.get("authorization") || "";
          else if (req.Header && typeof req.Header.Get === "function") authHeader = req.Header.Get("Authorization") || req.Header.Get("authorization") || "";
        }
        if (!authHeader) {
          const info = $apis.requestInfo(c);
          if (info && info.headers) authHeader = info.headers["authorization"] || info.headers["Authorization"] || "";
        }
        if (authHeader) {
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (token) auth = $app.dao().findAuthRecordByToken(token, $app.settings().recordAuthToken.secret);
        }
      } catch (e) {}
    }
    if (!auth) { c.json(401, { code: 401, message: "Authentication required." }); return null; }
    const role = auth.getString("role");
    if (role !== "distributor" && role !== "admin") { c.json(403, { code: 403, message: "Forbidden: Access restricted to distributors." }); return null; }
    if (!auth.getBool("is_active")) { c.json(403, { code: 403, message: "Forbidden: Account deactivated." }); return null; }
    return auth;
  }

  const auth = getDistributorAuth(c);
  if (!auth) return;

  const searchQuery = (c.queryParam("search") || "").trim().toLowerCase();
  const statusFilter = (c.queryParam("status") || "all").trim().toLowerCase();

  const subs = $app.dao().findRecordsByExpr(
    "subscriptions",
    $dbx.exp("distributor_id = {:distId}", { distId: auth.id })
  ) || [];

  subs.sort((a, b) => (b.getString("created") || "").localeCompare(a.getString("created") || ""));

  const nowIso = new Date().toISOString().substring(0, 10);
  const results = [];

  for (const s of subs) {
    const custName = s.getString("customer_name") || "";
    const custPhone = s.getString("customer_phone") || "";
    const bookingCode = s.getString("booking_code") || "";

    if (searchQuery) {
      const match = custName.toLowerCase().includes(searchQuery) ||
                    custPhone.includes(searchQuery) ||
                    bookingCode.toLowerCase().includes(searchQuery);
      if (!match) continue;
    }

    let pkgTitle = "Tour Package";
    let minEmis = 2;
    try {
      const p = $app.dao().findRecordById("packages", s.getString("package_id"));
      if (p) {
        pkgTitle = p.getString("title");
        minEmis = p.getInt("min_emis_to_travel") || 2;
      }
    } catch (e) {}

    let agName = "Sahayak";
    let agPhone = "";
    try {
      const a = $app.dao().findRecordById("users", s.getString("agent_id"));
      if (a) {
        agName = a.getString("name");
        agPhone = a.getString("phone");
      }
    } catch (e) {}

    let sPaid = 0;
    let sOverdue = 0;
    try {
      const insts = $app.dao().findRecordsByExpr("installments", $dbx.exp("subscription_id = {:sid}", { sid: s.id })) || [];
      for (let k = 0; k < insts.length; k++) {
        const amt = Number(insts[k].get("amount")) || 0;
        const st = insts[k].getString("status");
        const dt = insts[k].getString("due_date");
        if (st === "paid") {
          sPaid += amt;
        } else if (dt && dt <= nowIso) {
          sOverdue += amt;
        }
      }
    } catch (e) {}

    const paidCount = s.getInt("paid_emis_count");
    const travelStatus = s.getString("travel_status") || "locked";
    let badge = "saving";
    if (sOverdue > 0) {
      badge = "overdue";
    } else if (travelStatus === "eligible" || travelStatus === "scheduled" || travelStatus === "completed" || paidCount >= minEmis) {
      badge = "eligible";
    }

    if (statusFilter !== "all" && statusFilter !== badge) continue;

    results.push({
      id: s.id,
      booking_code: bookingCode,
      customer_name: custName,
      customer_phone: custPhone,
      customer_address: s.getString("customer_address"),
      package_title: pkgTitle,
      agent_name: agName,
      agent_phone: agPhone,
      total_amount: Number(s.get("total_amount")) || 0,
      monthly_emi: Number(s.get("monthly_emi_amount")) || 0,
      paid_emis_count: paidCount,
      total_emis: s.getInt("tenure_months"),
      amount_paid: sPaid,
      overdue_amount: sOverdue,
      badge: badge,
      travel_status: travelStatus,
      booking_date: s.getString("booking_date") || s.getString("created")
    });
  }

  return c.json(200, {
    count: results.length,
    devotees: results
  });
});

// 10. GET /api/distributor/handover-history (Verified settlements ledger)
routerAdd("GET", "/api/distributor/handover-history", (c) => {
  function getDistributorAuth(c) {
    let auth = null;
    try { auth = $apis.requestInfo(c).authRecord; } catch (e) {}
    if (!auth) {
      try {
        let authHeader = "";
        const req = c.request();
        if (req) {
          if (req.header && typeof req.header.get === "function") authHeader = req.header.get("Authorization") || req.header.get("authorization") || "";
          else if (req.Header && typeof req.Header.Get === "function") authHeader = req.Header.Get("Authorization") || req.Header.Get("authorization") || "";
        }
        if (!authHeader) {
          const info = $apis.requestInfo(c);
          if (info && info.headers) authHeader = info.headers["authorization"] || info.headers["Authorization"] || "";
        }
        if (authHeader) {
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (token) auth = $app.dao().findAuthRecordByToken(token, $app.settings().recordAuthToken.secret);
        }
      } catch (e) {}
    }
    if (!auth) { c.json(401, { code: 401, message: "Authentication required." }); return null; }
    const role = auth.getString("role");
    if (role !== "distributor" && role !== "admin") { c.json(403, { code: 403, message: "Forbidden: Access restricted to distributors." }); return null; }
    if (!auth.getBool("is_active")) { c.json(403, { code: 403, message: "Forbidden: Account deactivated." }); return null; }
    return auth;
  }

  const auth = getDistributorAuth(c);
  if (!auth) return;

  try {
    const handovers = $app.dao().findRecordsByExpr(
      "cash_handovers",
      $dbx.exp("distributor_id = {:distId} AND status = 'verified'", { distId: auth.id })
    ) || [];

    handovers.sort((a, b) => (b.getString("verified_at") || b.getString("created") || "").localeCompare(a.getString("verified_at") || a.getString("created") || ""));

    const list = [];
    const sliced = handovers.slice(0, 50);
    for (const h of sliced) {
      let agentName = "Field Sahayak";
      let agentPhone = "";
      try {
        const a = $app.dao().findRecordById("users", h.getString("agent_id"));
        if (a) {
          agentName = a.getString("name");
          agentPhone = a.getString("phone");
        }
      } catch (e) {}

      const covered = h.get("installments_covered") || [];

      list.push({
        id: h.id,
        agent_name: agentName,
        agent_phone: agentPhone,
        total_amount: Number(h.get("total_amount")) || 0,
        installments_count: Array.isArray(covered) ? covered.length : 0,
        otp_code: h.getString("otp_code"),
        status: h.getString("status"),
        verified_at: h.getString("verified_at"),
        created: h.getString("created")
      });
    }

    return c.json(200, {
      count: list.length,
      handovers: list
    });
  } catch (err) {
    console.error("Error in handover-history:", err);
    return c.json(500, { error: err.toString() });
  }
});

// 11. GET /api/distributor/transactions (Complete Territory Collections & Payments Ledger)
routerAdd("GET", "/api/distributor/transactions", (c) => {
  function getDistributorAuth(c) {
    let auth = null;
    try { auth = $apis.requestInfo(c).authRecord; } catch (e) {}
    if (!auth) {
      try {
        let authHeader = "";
        const req = c.request();
        if (req) {
          if (req.header && typeof req.header.get === "function") authHeader = req.header.get("Authorization") || req.header.get("authorization") || "";
          else if (req.Header && typeof req.Header.Get === "function") authHeader = req.Header.Get("Authorization") || req.Header.Get("authorization") || "";
        }
        if (!authHeader) {
          const info = $apis.requestInfo(c);
          if (info && info.headers) authHeader = info.headers["authorization"] || info.headers["Authorization"] || "";
        }
        if (authHeader) {
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (token) auth = $app.dao().findAuthRecordByToken(token, $app.settings().recordAuthToken.secret);
        }
      } catch (e) {}
    }
    if (!auth) { c.json(401, { code: 401, message: "Authentication required." }); return null; }
    const role = auth.getString("role");
    if (role !== "distributor" && role !== "admin") { c.json(403, { code: 403, message: "Forbidden: Access restricted to distributors." }); return null; }
    if (!auth.getBool("is_active")) { c.json(403, { code: 403, message: "Forbidden: Account deactivated." }); return null; }
    return auth;
  }

  const auth = getDistributorAuth(c);
  if (!auth) return;

  try {
    const subs = $app.dao().findRecordsByExpr(
      "subscriptions",
      $dbx.exp("distributor_id = {:distId}", { distId: auth.id })
    ) || [];

    const subMap = {};
    const subIds = [];
    const pkgCache = {};
    const agentCache = {};

    for (const s of subs) {
      subMap[s.id] = s;
      subIds.push(s.id);

      const pkgId = s.getString("package_id");
      if (pkgId && !pkgCache[pkgId]) {
        try {
          const p = $app.dao().findRecordById("packages", pkgId);
          if (p) pkgCache[pkgId] = p.getString("title");
        } catch (e) {}
      }

      const agId = s.getString("agent_id");
      if (agId && !agentCache[agId]) {
        try {
          const a = $app.dao().findRecordById("users", agId);
          if (a) {
            agentCache[agId] = {
              name: a.getString("name"),
              phone: a.getString("phone")
            };
          }
        } catch (e) {}
      }
    }

    if (subIds.length === 0) {
      return c.json(200, {
        count: 0,
        summary: {
          total_transactions: 0,
          total_collected: 0,
          total_in_safe: 0,
          total_in_transit: 0
        },
        transactions: []
      });
    }

    const quotedIds = subIds.map((id) => `'${id}'`).join(",");
    const installments = $app.dao().findRecordsByExpr(
      "installments",
      $dbx.exp(`subscription_id IN (${quotedIds}) AND status = 'paid'`)
    ) || [];

    // Sort by paid_at or updated or created desc
    installments.sort((a, b) => {
      const timeA = a.getString("paid_at") || a.getString("updated") || a.getString("created") || "";
      const timeB = b.getString("paid_at") || b.getString("updated") || b.getString("created") || "";
      return timeB.localeCompare(timeA);
    });

    let totalCollected = 0;
    let totalInSafe = 0;
    let totalInTransit = 0;

    const txList = [];

    for (const inst of installments) {
      const sub = subMap[inst.getString("subscription_id")];
      const amt = Number(inst.get("amount")) || 0;
      const handoverStatus = inst.getString("handover_status") || "agent_custody";
      const paymentMode = inst.getString("payment_mode") || "cash";

      totalCollected += amt;
      if (handoverStatus === "distributor_confirmed") {
        totalInSafe += amt;
      } else if (handoverStatus === "agent_custody") {
        totalInTransit += amt;
      }

      let agentId = inst.getString("collected_by") || (sub ? sub.getString("agent_id") : "");
      let agentInfo = agentCache[agentId] || { name: "Field Sahayak", phone: "" };
      if (!agentCache[agentId] && agentId) {
        try {
          const a = $app.dao().findRecordById("users", agentId);
          if (a) {
            agentInfo = { name: a.getString("name"), phone: a.getString("phone") };
            agentCache[agentId] = agentInfo;
          }
        } catch (e) {}
      }

      const pkgTitle = (sub && pkgCache[sub.getString("package_id")]) ? pkgCache[sub.getString("package_id")] : "Pilgrimage Tour";
      const receiptId = inst.getString("receipt_slip_id") || ("SLIP-" + inst.id.substring(0, 8).toUpperCase());

      txList.push({
        id: inst.id,
        receipt_slip_id: receiptId,
        subscription_id: sub ? sub.id : "",
        booking_code: sub ? sub.getString("booking_code") : "",
        customer_name: sub ? sub.getString("customer_name") : "Devotee",
        customer_phone: sub ? sub.getString("customer_phone") : "",
        customer_address: sub ? sub.getString("customer_address") : "",
        package_title: pkgTitle,
        installment_no: inst.getInt("installment_no"),
        amount: amt,
        payment_mode: paymentMode,
        status: inst.getString("status"),
        handover_status: handoverStatus,
        collected_at: inst.getString("paid_at") || inst.getString("updated") || inst.getString("created"),
        due_date: inst.getString("due_date"),
        agent_id: agentId,
        agent_name: agentInfo.name,
        agent_phone: agentInfo.phone
      });
    }

    return c.json(200, {
      count: txList.length,
      summary: {
        total_transactions: txList.length,
        total_collected: totalCollected,
        total_in_safe: totalInSafe,
        total_in_transit: totalInTransit
      },
      transactions: txList
    });
  } catch (err) {
    console.error("Error in /api/distributor/transactions:", err);
    return c.json(500, { error: err.toString() });
  }
});
