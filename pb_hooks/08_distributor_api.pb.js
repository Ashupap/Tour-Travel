// pb_hooks/08_distributor_api.pb.js
// Custom API routes for Distributor Dashboard, Territory Analytics & Delinquent Warnings (DIST-01, DIST-03, DIST-04, SEC-04)

// Route mapping for /distributor/dashboard
routerAdd("GET", "/distributor/dashboard", (c) => {
  return c.redirect(302, "/distributor/index.html");
});

// 1. GET /api/distributor/analytics (DIST-01, SEC-04)
routerAdd("GET", "/api/distributor/analytics", (c) => {
  function getDistributorAuth(c) {
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

    if (!auth) {
      c.json(401, { code: 401, message: "Authentication required. Please provide a valid Bearer token." });
      return null;
    }

    const role = auth.getString("role");
    if (role !== "distributor" && role !== "admin") {
      c.json(403, { code: 403, message: "Forbidden: Access restricted to distributors." });
      return null;
    }

    return auth;
  }

  const auth = getDistributorAuth(c);
  if (!auth) return;

  // Query distributor_daily_analytics SQLite view
  let analyticsRow = null;
  try {
    analyticsRow = $app.dao().findRecordById("distributor_daily_analytics", auth.id);
  } catch (e) {
    try {
      const records = $app.dao().findRecordsByExpr(
        "distributor_daily_analytics",
        $dbx.exp("distributor_id = {:distId}", { distId: auth.id })
      );
      if (records && records.length > 0) {
        analyticsRow = records[0];
      }
    } catch (err2) {
      console.error("Error reading distributor_daily_analytics:", err2);
    }
  }

  // Also query directly via DAO to ensure accurate real-time metrics
  let totalActiveSubs = 0;
  let collectedToday = 0;
  let cashInCustody = 0;
  let totalOverdue = 0;

  try {
    const subs = $app.dao().findRecordsByExpr(
      "subscriptions",
      $dbx.exp("distributor_id = {:distId}", { distId: auth.id })
    );
    totalActiveSubs = subs ? subs.length : 0;
    const subIds = subs ? subs.map((s) => s.id) : [];

    if (subIds.length > 0) {
      // Find all installments for these subscriptions
      for (const sub of subs) {
        const insts = $app.dao().findRecordsByExpr(
          "installments",
          $dbx.exp("subscription_id = {:subId}", { subId: sub.id })
        );
        for (const inst of insts) {
          const amt = Number(inst.get("amount")) || 0;
          const status = inst.getString("status");
          const handover = inst.getString("handover_status");
          const paidAt = inst.getString("paid_at");
          const dueDate = inst.getString("due_date");

          if (status === "paid") {
            const todayStr = new Date().toISOString().substring(0, 10);
            if (paidAt && paidAt.startsWith(todayStr)) {
              collectedToday += amt;
            }
            if (handover === "agent_custody") {
              cashInCustody += amt;
            }
          } else if (dueDate && new Date(dueDate.replace(" ", "T")) < new Date()) {
            totalOverdue += amt;
          }
        }
      }
    }
  } catch (errDao) {
    console.error("Error computing DAO fallback metrics:", errDao);
  }

  // Use view row if non-zero, else use verified DAO computed metrics
  const finalActiveSubs = analyticsRow && Number(analyticsRow.get("total_active_subscriptions")) > 0
    ? Number(analyticsRow.get("total_active_subscriptions"))
    : totalActiveSubs;
  const finalCollectedToday = analyticsRow && Number(analyticsRow.get("collected_today")) > 0
    ? Number(analyticsRow.get("collected_today"))
    : collectedToday;
  const finalCashInCustody = analyticsRow && Number(analyticsRow.get("cash_in_agents_custody")) > 0
    ? Number(analyticsRow.get("cash_in_agents_custody"))
    : cashInCustody;
  const finalOverdue = analyticsRow && Number(analyticsRow.get("total_overdue_amount")) > 0
    ? Number(analyticsRow.get("total_overdue_amount"))
    : totalOverdue;

  return c.json(200, {
    distributor: {
      id: auth.id,
      name: auth.getString("name"),
      phone: auth.getString("phone")
    },
    metrics: {
      total_active_subscriptions: finalActiveSubs,
      total_overdue_amount: finalOverdue,
      collected_today: finalCollectedToday,
      cash_in_agents_custody: finalCashInCustody
    }
  });
});

// 2. GET /api/distributor/agents (DIST-03, SEC-04)
routerAdd("GET", "/api/distributor/agents", (c) => {
  function getDistributorAuth(c) {
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

    if (!auth) {
      c.json(401, { code: 401, message: "Authentication required." });
      return null;
    }

    const role = auth.getString("role");
    if (role !== "distributor" && role !== "admin") {
      c.json(403, { code: 403, message: "Forbidden: Access restricted to distributors." });
      return null;
    }

    return auth;
  }

  const auth = getDistributorAuth(c);
  if (!auth) return;

  // Query agents where distributor_id = auth.id
  const agents = $app.dao().findRecordsByExpr(
    "users",
    $dbx.exp("role = 'agent' AND distributor_id = {:distId}", { distId: auth.id })
  ) || [];

  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const roster = [];

  for (const agent of agents) {
    // 1. Calculate cash in custody
    const custodyInstallments = $app.dao().findRecordsByExpr(
      "installments",
      $dbx.exp(
        "collected_by = {:agentId} AND payment_mode = 'cash' AND handover_status = 'agent_custody' AND status = 'paid'",
        { agentId: agent.id }
      )
    ) || [];

    let cashInCustody = 0;
    for (const inst of custodyInstallments) {
      cashInCustody += inst.getFloat("amount");
    }

    // 2. Calculate collections today
    const todayInstallments = $app.dao().findRecordsByExpr(
      "installments",
      $dbx.exp(
        "collected_by = {:agentId} AND status = 'paid' AND paid_at LIKE {:todayPrefix}",
        { agentId: agent.id, todayPrefix: `${todayStr}%` }
      )
    ) || [];

    let collectedToday = 0;
    for (const inst of todayInstallments) {
      collectedToday += inst.getFloat("amount");
    }

    // 3. Count assigned active subscriptions
    const subCount = $app.dao().findRecordsByExpr(
      "subscriptions",
      $dbx.exp("agent_id = {:agentId}", { agentId: agent.id })
    ) || [];

    roster.push({
      id: agent.id,
      name: agent.getString("name"),
      phone: agent.getString("phone"),
      email: agent.getString("email"),
      is_active: agent.getBool("is_active"),
      subscriptions_count: subCount.length,
      cash_in_custody: cashInCustody,
      collected_today: collectedToday
    });
  }

  return c.json(200, {
    count: roster.length,
    agents: roster
  });
});

// 3. GET /api/distributor/delinquents (DIST-04, SEC-04)
routerAdd("GET", "/api/distributor/delinquents", (c) => {
  function getDistributorAuth(c) {
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

    if (!auth) {
      c.json(401, { code: 401, message: "Authentication required." });
      return null;
    }

    const role = auth.getString("role");
    if (role !== "distributor" && role !== "admin") {
      c.json(403, { code: 403, message: "Forbidden: Access restricted to distributors." });
      return null;
    }

    return auth;
  }

  const auth = getDistributorAuth(c);
  if (!auth) return;

  // Delinquent cutoff: > 30 days overdue
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().replace("T", " ");

  // Subscriptions belonging to this territory
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

    if (!auth) {
      c.json(401, { code: 401, message: "Authentication required." });
      return null;
    }

    const role = auth.getString("role");
    if (role !== "distributor" && role !== "admin") {
      c.json(403, { code: 403, message: "Forbidden: Access restricted to distributors." });
      return null;
    }

    return auth;
  }

  const auth = getDistributorAuth(c);
  if (!auth) return;

  // Query initiated handovers for this distributor
  const handovers = $app.dao().findRecordsByExpr(
    "cash_handovers",
    $dbx.exp("distributor_id = {:distId} AND status = 'initiated' ORDER BY created DESC", { distId: auth.id })
  ) || [];

  const pendingList = [];

  for (const h of handovers) {
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

    pendingList.push({
      id: h.id,
      agent_id: h.getString("agent_id"),
      agent_name: agentName,
      agent_phone: agentPhone,
      total_amount: h.getFloat("total_amount"),
      installments_count: Array.isArray(covered) ? covered.length : 0,
      created: h.getString("created"),
      status: h.getString("status")
    });
  }

  return c.json(200, {
    count: pendingList.length,
    handovers: pendingList
  });
});
