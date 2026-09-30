// pb_hooks/09_admin_api.pb.js
// Admin portal routes: portfolio metrics, risk watchlist (ADMN-01, ADMN-02, SEC-04)
// NOTE: PocketBase re-evaluates each handler outside file scope, so every shared
// helper must be declared inside the handler (same pattern as 08_distributor_api.pb.js).

// Route mapping for /admin/dashboard
routerAdd("GET", "/admin/dashboard", (c) => {
  return c.redirect(302, "/admin/index.html");
});

// 1. GET /api/admin/portfolio (ADMN-01)
routerAdd("GET", "/api/admin/portfolio", (c) => {
  function adminError(code, message) {
    c.json(code, { code: code, message: message });
    return null;
  }

  function requireAdmin() {
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
          const info2 = $apis.requestInfo(c);
          if (info2 && info2.headers) {
            authHeader = info2.headers["authorization"] || info2.headers["Authorization"] || "";
          }
        }
        if (authHeader) {
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (token) {
            try {
              auth = $app.dao().findAuthRecordByToken(token, $app.settings().recordAuthToken.secret);
            } catch (e) {
              auth = null;
            }
            if (!auth) {
              try {
                auth = $app.dao().findAdminByToken(token, $app.settings().adminAuthToken.secret);
              } catch (e2) {}
            }
          }
        }
      } catch (e) {}
    }

    if (!auth) return adminError(401, "Authentication required. Please provide a valid Bearer token.");
    // Accept users with role 'admin' and PocketBase superusers (Admin records have no role field)
    let role = "";
    try { role = auth.getString("role") || ""; } catch (e) { role = ""; }
    if (role && role !== "admin") return adminError(403, "Forbidden: Access restricted to administrators.");
    return auth;
  }

  function nowSql() {
    return new Date().toISOString().replace("T", " ").substring(0, 19);
  }

  const auth = requireAdmin();
  if (!auth) return;

  // Read the admin_portfolio_overview SQLite view first (DAT-07)
  let row = null;
  try {
    row = $app.dao().findRecordById("admin_portfolio_overview", "portfolio_summary");
  } catch (e) {
    try {
      const rows = $app.dao().findRecordsByExpr("admin_portfolio_overview", $dbx.exp("id = {:id}", { id: "portfolio_summary" }));
      if (rows && rows.length > 0) row = rows[0];
    } catch (e2) {}
  }

  const view = {
    gross: row ? Number(row.get("gross_portfolio_value")) || 0 : 0,
    realized: row ? Number(row.get("total_realized_cash")) || 0 : 0,
    overdue: row ? Number(row.get("total_overdue_cash")) || 0 : 0,
    defaults: row ? Number(row.get("post_travel_default_count")) || 0 : 0,
    fieldFloat: row ? Number(row.get("field_float")) || 0 : 0
  };

  // DAO recompute: always computed, then used to override any zero view metric (real-time accuracy)
  let daoGross = 0;
  let daoRealized = 0;
  let daoOverdue = 0;
  let daoFloat = 0;
  const defaultSubIds = {};

  try {
    const subs = $app.dao().findRecordsByExpr("subscriptions", $dbx.exp("1 = 1")) || [];
    for (const s of subs) daoGross += Number(s.get("total_amount")) || 0;

    const insts = $app.dao().findRecordsByExpr("installments", $dbx.exp("1 = 1")) || [];
    const now = nowSql();
    const subStatus = {};

    for (const i of insts) {
      const amount = Number(i.get("amount")) || 0;
      const status = i.getString("status");
      const dueDate = i.getString("due_date");
      const handover = i.getString("handover_status");

      if (status === "paid") {
        daoRealized += amount;
        if (handover === "agent_custody") daoFloat += amount;
      } else if (dueDate && dueDate <= now) {
        daoOverdue += amount;

        const subId = i.getString("subscription_id");
        if (!(subId in subStatus)) {
          try {
            const sub = $app.dao().findRecordById("subscriptions", subId);
            subStatus[subId] = sub ? sub.getString("travel_status") : "";
          } catch (e) {
            subStatus[subId] = "";
          }
        }
        const st = subStatus[subId];
        if (st === "scheduled" || st === "completed") defaultSubIds[subId] = true;
      }
    }
  } catch (err) {
    console.error("Error recomputing portfolio metrics:", err);
  }

  const metrics = {
    total_booked_value: view.gross || daoGross,
    total_realized_cash: view.realized || daoRealized,
    total_defaults: view.overdue || daoOverdue,
    cash_in_transit: view.fieldFloat || daoFloat,
    post_travel_default_count: view.defaults || Object.keys(defaultSubIds).length
  };

  return c.json(200, {
    metrics: metrics,
    source: row ? "view+dao" : "dao"
  });
});

// 2. GET /api/admin/risk-watchlist (ADMN-02)
routerAdd("GET", "/api/admin/risk-watchlist", (c) => {
  function adminError(code, message) {
    c.json(code, { code: code, message: message });
    return null;
  }

  function requireAdmin() {
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
          const info2 = $apis.requestInfo(c);
          if (info2 && info2.headers) {
            authHeader = info2.headers["authorization"] || info2.headers["Authorization"] || "";
          }
        }
        if (authHeader) {
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (token) {
            try {
              auth = $app.dao().findAuthRecordByToken(token, $app.settings().recordAuthToken.secret);
            } catch (e) {
              auth = null;
            }
            if (!auth) {
              try {
                auth = $app.dao().findAdminByToken(token, $app.settings().adminAuthToken.secret);
              } catch (e2) {}
            }
          }
        }
      } catch (e) {}
    }

    if (!auth) return adminError(401, "Authentication required. Please provide a valid Bearer token.");
    // Accept users with role 'admin' and PocketBase superusers (Admin records have no role field)
    let role = "";
    try { role = auth.getString("role") || ""; } catch (e) { role = ""; }
    if (role && role !== "admin") return adminError(403, "Forbidden: Access restricted to administrators.");
    return auth;
  }

  const auth = requireAdmin();
  if (!auth) return;

  const sort = (c.queryParam("sort") || "days").toLowerCase();
  const order = (c.queryParam("order") || "desc").toLowerCase();
  const now = new Date().toISOString().replace("T", " ").substring(0, 19);

  let subs = [];
  try {
    subs = $app.dao().findRecordsByExpr(
      "subscriptions",
      $dbx.exp("travel_status IN ('scheduled', 'completed')")
    ) || [];
  } catch (err) {
    console.error("Error loading watchlist subscriptions:", err);
  }

  const watchlist = [];

  for (const sub of subs) {
    let insts = [];
    try {
      insts = $app.dao().findRecordsByExpr(
        "installments",
        $dbx.exp("subscription_id = {:subId}", { subId: sub.id })
      ) || [];
    } catch (e) {
      continue;
    }

    let overdueAmount = 0;
    let overdueCount = 0;
    let maxDaysOverdue = 0;

    for (const inst of insts) {
      if (inst.getString("status") === "paid") continue;
      const dueDate = inst.getString("due_date");
      if (!dueDate || dueDate > now) continue;

      overdueAmount += Number(inst.get("amount")) || 0;
      overdueCount += 1;
      // due_date and "now" are ISO strings with a trailing "Z" (e.g. "YYYY-MM-DD HH:MM:SS.mmmZ");
      // only append Z when parsing a naive timestamp so Date.parse never returns NaN.
      const parseStamp = (s) => {
        const t = s.replace(" ", "T");
        const v = Date.parse(t);
        return isNaN(v) ? Date.parse(t + "Z") : v;
      };
      const days = Math.floor((parseStamp(now) - parseStamp(dueDate)) / 86400000);
      if (days > maxDaysOverdue) maxDaysOverdue = days;
    }

    if (overdueCount === 0) continue;

    let agentName = "";
    let distributorName = "";
    let packageTitle = "";
    try {
      const agent = $app.dao().findRecordById("users", sub.getString("agent_id"));
      if (agent) agentName = agent.getString("name");
    } catch (e) {}
    try {
      const dist = $app.dao().findRecordById("users", sub.getString("distributor_id"));
      if (dist) distributorName = dist.getString("name");
    } catch (e) {}
    try {
      const pkg = $app.dao().findRecordById("packages", sub.getString("package_id"));
      if (pkg) packageTitle = pkg.getString("title");
    } catch (e) {}

    watchlist.push({
      subscription_id: sub.id,
      booking_code: sub.getString("booking_code"),
      customer_name: sub.getString("customer_name"),
      customer_phone: sub.getString("customer_phone"),
      package_title: packageTitle,
      travel_status: sub.getString("travel_status"),
      overdue_amount: overdueAmount,
      overdue_count: overdueCount,
      max_days_overdue: maxDaysOverdue,
      agent_name: agentName,
      distributor_name: distributorName
    });
  }

  const dir = order === "asc" ? 1 : -1;
  watchlist.sort((a, b) => {
    if (sort === "amount") return (a.overdue_amount - b.overdue_amount) * dir;
    if (sort === "name") return a.customer_name.localeCompare(b.customer_name) * dir;
    return (a.max_days_overdue - b.max_days_overdue) * dir;
  });

  return c.json(200, {
    count: watchlist.length,
    sort: sort,
    order: order,
    watchlist: watchlist
  });
});

// 3. GET /api/admin/packages (ADMN-03)
routerAdd("GET", "/api/admin/packages", (c) => {
  function requireAdmin() {
    let auth = null;
    try { auth = $apis.requestInfo(c).authRecord; } catch (e) {}
    if (!auth) {
      try { const inf = $apis.requestInfo(c); if (inf && inf.admin) auth = inf.admin; } catch (e) {}
    }
    if (!auth) {
      try {
        const info = $apis.requestInfo(c);
        let h = (info && info.headers && (info.headers["authorization"] || info.headers["Authorization"])) || "";
        if (!h) {
          const req = c.request();
          if (req && req.header && typeof req.header.get === "function") h = req.header.get("Authorization") || req.header.get("authorization") || "";
        }
        const t = h.replace(/^Bearer\s+/i, "").trim();
        if (t) {
          try { auth = $app.dao().findAuthRecordByToken(t, $app.settings().recordAuthToken.secret); } catch (e2) { auth = null; }
          if (!auth) { try { auth = $app.dao().findAdminByToken(t, $app.settings().adminAuthToken.secret); } catch (e3) {} }
        }
      } catch (e4) {}
    }
    if (!auth) { c.json(401, { code: 401, message: "Authentication required." }); return null; }
    let role = "";
    try { role = auth.getString("role") || ""; } catch (e5) { role = ""; }
    if (role && role !== "admin") { c.json(403, { code: 403, message: "Forbidden: Access restricted to administrators." }); return null; }
    return auth;
  }

  const auth = requireAdmin();
  if (!auth) return;

  let packages = [];
  try {
    packages = $app.dao().findRecordsByExpr("packages", $dbx.exp("1 = 1 ORDER BY created DESC")) || [];
  } catch (err) {
    console.error("Error listing packages:", err);
  }

  const items = [];
  for (const p of packages) {
    let subsCount = 0;
    try {
      const subs = $app.dao().findRecordsByExpr("subscriptions", $dbx.exp("package_id = {:pid}", { pid: p.id })) || [];
      subsCount = subs.length;
    } catch (e) {}

    let tenures = [];
    try { tenures = p.get("allowed_tenures") || []; } catch (e) { tenures = []; }

    items.push({
      id: p.id,
      title: p.getString("title"),
      destination: p.getString("destination"),
      duration_days: p.getInt("duration_days"),
      total_price: p.getFloat("total_price"),
      allowed_tenures: tenures,
      min_emis_to_travel: p.getInt("min_emis_to_travel"),
      itinerary: p.getString("itinerary"),
      is_active: p.getBool("is_active"),
      cover_image_url: p.getString("cover_image") ? "/api/files/packages/" + p.id + "/" + p.getString("cover_image") : "",
      subscriptions_count: subsCount,
      created: p.getString("created"),
      updated: p.getString("updated")
    });
  }

  return c.json(200, { count: items.length, packages: items });
});

// 4. POST /api/admin/packages (ADMN-03)
routerAdd("POST", "/api/admin/packages", (c) => {
  function adminError(code, message, data) {
    c.json(code, { code: code, message: message, data: data || {} });
    return null;
  }

  function requireAdmin() {
    let auth = null;
    try { auth = $apis.requestInfo(c).authRecord; } catch (e) {}
    if (!auth) {
      try { const inf = $apis.requestInfo(c); if (inf && inf.admin) auth = inf.admin; } catch (e) {}
    }
    if (!auth) {
      try {
        const info = $apis.requestInfo(c);
        let h = (info && info.headers && (info.headers["authorization"] || info.headers["Authorization"])) || "";
        if (!h) {
          const req = c.request();
          if (req && req.header && typeof req.header.get === "function") h = req.header.get("Authorization") || req.header.get("authorization") || "";
        }
        const t = h.replace(/^Bearer\s+/i, "").trim();
        if (t) {
          try { auth = $app.dao().findAuthRecordByToken(t, $app.settings().recordAuthToken.secret); } catch (e2) { auth = null; }
          if (!auth) { try { auth = $app.dao().findAdminByToken(t, $app.settings().adminAuthToken.secret); } catch (e3) {} }
        }
      } catch (e4) {}
    }
    if (!auth) return adminError(401, "Authentication required.");
    let role = "";
    try { role = auth.getString("role") || ""; } catch (e5) { role = ""; }
    if (role && role !== "admin") return adminError(403, "Forbidden: Access restricted to administrators.");
    return auth;
  }

  function validate(body) {
    const errors = {};
    if (!body || typeof body !== "object") return { errors: { body: "Invalid JSON body" } };

    const present = (k) => body[k] !== undefined && body[k] !== null && body[k] !== "";
    const required = ["title", "destination", "duration_days", "total_price", "allowed_tenures", "min_emis_to_travel"];
    for (const key of required) {
      if (!present(key)) errors[key] = "This field is required";
    }

    if (present("title")) {
      const title = String(body.title).trim();
      if (title.length < 3 || title.length > 200) errors.title = "Title must be 3-200 characters";
    }

    if (present("destination")) {
      const destination = String(body.destination).trim();
      if (destination.length < 2 || destination.length > 100) errors.destination = "Destination must be 2-100 characters";
    }

    if (present("duration_days")) {
      const d = Number(body.duration_days);
      if (!Number.isFinite(d) || d < 1 || d > 60) errors.duration_days = "Duration must be 1-60 days";
    }

    if (present("total_price")) {
      const p = Number(body.total_price);
      if (!Number.isFinite(p) || p <= 0) errors.total_price = "Price must be greater than 0";
    }

    if (present("allowed_tenures")) {
      const t = body.allowed_tenures;
      const valid = Array.isArray(t) && t.length > 0 && t.every((x) => Number.isInteger(Number(x)) && Number(x) >= 1 && Number(x) <= 24);
      if (!valid) errors.allowed_tenures = "Tenures must be a non-empty array of months (1-24)";
    }

    if (present("min_emis_to_travel")) {
      const m = Number(body.min_emis_to_travel);
      if (!Number.isFinite(m) || m < 1 || m > 12) errors.min_emis_to_travel = "Min EMIs to travel must be 1-12";
    }

    return { errors: errors };
  }

  const auth = requireAdmin();
  if (!auth) return;

  let body = null;
  try { body = $apis.requestInfo(c).data; } catch (e) {}
  const { errors } = validate(body);
  if (Object.keys(errors).length > 0) return adminError(400, "Validation failed", errors);

  try {
    const col = $app.dao().findCollectionByNameOrId("packages");
    const rec = new Record(col);
    rec.set("title", String(body.title).trim());
    rec.set("destination", String(body.destination).trim());
    rec.set("duration_days", Number(body.duration_days));
    rec.set("total_price", Number(body.total_price));
    rec.set("allowed_tenures", body.allowed_tenures.map((x) => Number(x)));
    rec.set("min_emis_to_travel", Number(body.min_emis_to_travel));
    if (body.itinerary !== undefined) rec.set("itinerary", String(body.itinerary));
    rec.set("is_active", body.is_active === undefined ? true : !!body.is_active);
    $app.dao().saveRecord(rec);

    return c.json(201, { id: rec.id, package: { id: rec.id, title: rec.getString("title"), is_active: rec.getBool("is_active") } });
  } catch (err) {
    console.error("Error creating package:", err);
    return adminError(500, "Failed to create package: " + String(err && err.message ? err.message : err));
  }
});

// 5. PATCH /api/admin/packages/:id (ADMN-03)
routerAdd("PATCH", "/api/admin/packages/:id", (c) => {
  function adminError(code, message, data) {
    c.json(code, { code: code, message: message, data: data || {} });
    return null;
  }

  function requireAdmin() {
    let auth = null;
    try { auth = $apis.requestInfo(c).authRecord; } catch (e) {}
    if (!auth) {
      try { const inf = $apis.requestInfo(c); if (inf && inf.admin) auth = inf.admin; } catch (e) {}
    }
    if (!auth) {
      try {
        const info = $apis.requestInfo(c);
        let h = (info && info.headers && (info.headers["authorization"] || info.headers["Authorization"])) || "";
        if (!h) {
          const req = c.request();
          if (req && req.header && typeof req.header.get === "function") h = req.header.get("Authorization") || req.header.get("authorization") || "";
        }
        const t = h.replace(/^Bearer\s+/i, "").trim();
        if (t) {
          try { auth = $app.dao().findAuthRecordByToken(t, $app.settings().recordAuthToken.secret); } catch (e2) { auth = null; }
          if (!auth) { try { auth = $app.dao().findAdminByToken(t, $app.settings().adminAuthToken.secret); } catch (e3) {} }
        }
      } catch (e4) {}
    }
    if (!auth) return adminError(401, "Authentication required.");
    let role = "";
    try { role = auth.getString("role") || ""; } catch (e5) { role = ""; }
    if (role && role !== "admin") return adminError(403, "Forbidden: Access restricted to administrators.");
    return auth;
  }

  const auth = requireAdmin();
  if (!auth) return;

  let id = "";
  try { id = c.pathParam("id"); } catch (e) {}
  if (!id) return adminError(400, "Missing package id");

  let rec = null;
  try { rec = $app.dao().findRecordById("packages", id); } catch (e) {}
  if (!rec) return adminError(404, "Package not found");

  let body = null;
  try { body = $apis.requestInfo(c).data; } catch (e) {}
  if (!body || typeof body !== "object") return adminError(400, "Invalid JSON body");

  try {
    if (body.title !== undefined) {
      const t = String(body.title).trim();
      if (t.length < 3 || t.length > 200) return adminError(400, "Validation failed", { title: "Title must be 3-200 characters" });
      rec.set("title", t);
    }
    if (body.destination !== undefined) {
      const d = String(body.destination).trim();
      if (d.length < 2 || d.length > 100) return adminError(400, "Validation failed", { destination: "Destination must be 2-100 characters" });
      rec.set("destination", d);
    }
    if (body.duration_days !== undefined) {
      const d = Number(body.duration_days);
      if (!Number.isFinite(d) || d < 1 || d > 60) return adminError(400, "Validation failed", { duration_days: "Duration must be 1-60 days" });
      rec.set("duration_days", d);
    }
    if (body.total_price !== undefined) {
      const p = Number(body.total_price);
      if (!Number.isFinite(p) || p <= 0) return adminError(400, "Validation failed", { total_price: "Price must be greater than 0" });
      rec.set("total_price", p);
    }
    if (body.allowed_tenures !== undefined) {
      const t = body.allowed_tenures;
      const valid = Array.isArray(t) && t.length > 0 && t.every((x) => Number.isInteger(Number(x)) && Number(x) >= 1 && Number(x) <= 24);
      if (!valid) return adminError(400, "Validation failed", { allowed_tenures: "Tenures must be a non-empty array of months (1-24)" });
      rec.set("allowed_tenures", t.map((x) => Number(x)));
    }
    if (body.min_emis_to_travel !== undefined) {
      const m = Number(body.min_emis_to_travel);
      if (!Number.isFinite(m) || m < 1 || m > 12) return adminError(400, "Validation failed", { min_emis_to_travel: "Min EMIs to travel must be 1-12" });
      rec.set("min_emis_to_travel", m);
    }
    if (body.itinerary !== undefined) rec.set("itinerary", String(body.itinerary));
    if (body.is_active !== undefined) rec.set("is_active", !!body.is_active);

    $app.dao().saveRecord(rec);
    return c.json(200, { id: rec.id, updated: Object.keys(body) });
  } catch (err) {
    console.error("Error updating package:", err);
    return adminError(500, "Failed to update package: " + String(err && err.message ? err.message : err));
  }
});

// 6. DELETE /api/admin/packages/:id (ADMN-03) — soft-deactivate when referenced
routerAdd("DELETE", "/api/admin/packages/:id", (c) => {
  function adminError(code, message, data) {
    c.json(code, { code: code, message: message, data: data || {} });
    return null;
  }

  function requireAdmin() {
    let auth = null;
    try { auth = $apis.requestInfo(c).authRecord; } catch (e) {}
    if (!auth) {
      try { const inf = $apis.requestInfo(c); if (inf && inf.admin) auth = inf.admin; } catch (e) {}
    }
    if (!auth) {
      try {
        const info = $apis.requestInfo(c);
        let h = (info && info.headers && (info.headers["authorization"] || info.headers["Authorization"])) || "";
        if (!h) {
          const req = c.request();
          if (req && req.header && typeof req.header.get === "function") h = req.header.get("Authorization") || req.header.get("authorization") || "";
        }
        const t = h.replace(/^Bearer\s+/i, "").trim();
        if (t) {
          try { auth = $app.dao().findAuthRecordByToken(t, $app.settings().recordAuthToken.secret); } catch (e2) { auth = null; }
          if (!auth) { try { auth = $app.dao().findAdminByToken(t, $app.settings().adminAuthToken.secret); } catch (e3) {} }
        }
      } catch (e4) {}
    }
    if (!auth) return adminError(401, "Authentication required.");
    let role = "";
    try { role = auth.getString("role") || ""; } catch (e5) { role = ""; }
    if (role && role !== "admin") return adminError(403, "Forbidden: Access restricted to administrators.");
    return auth;
  }

  const auth = requireAdmin();
  if (!auth) return;

  let id = "";
  try { id = c.pathParam("id"); } catch (e) {}
  if (!id) return adminError(400, "Missing package id");

  let rec = null;
  try { rec = $app.dao().findRecordById("packages", id); } catch (e) {}
  if (!rec) return adminError(404, "Package not found");

  try {
    const subs = $app.dao().findRecordsByExpr("subscriptions", $dbx.exp("package_id = {:pid}", { pid: id })) || [];
    if (subs.length > 0) {
      rec.set("is_active", false);
      $app.dao().saveRecord(rec);
      return c.json(200, { soft_deactivated: true, subscriptions_count: subs.length, id: id });
    }
    $app.dao().deleteRecord(rec);
    return c.json(200, { deleted: true, id: id });
  } catch (err) {
    console.error("Error deleting package:", err);
    return adminError(500, "Failed to delete package: " + String(err && err.message ? err.message : err));
  }
});

// 7. GET /api/public/packages (ADMN-03) — active packages for the landing catalog
routerAdd("GET", "/api/public/packages", (c) => {
  let packages = [];
  try {
    packages = $app.dao().findRecordsByExpr("packages", $dbx.exp("is_active = true ORDER BY created DESC")) || [];
  } catch (err) {
    console.error("Error listing public packages:", err);
  }

  const items = [];
  for (const p of packages) {
    let tenures = [];
    try { tenures = p.get("allowed_tenures") || []; } catch (e) { tenures = []; }

    items.push({
      id: p.id,
      title: p.getString("title"),
      destination: p.getString("destination"),
      duration_days: p.getInt("duration_days"),
      total_price: p.getFloat("total_price"),
      allowed_tenures: tenures,
      min_emis_to_travel: p.getInt("min_emis_to_travel"),
      itinerary: p.getString("itinerary"),
      cover_image_url: p.getString("cover_image") ? "/api/files/packages/" + p.id + "/" + p.getString("cover_image") : ""
    });
  }

  return c.json(200, { count: items.length, packages: items });
});

// 8. GET /api/admin/manifest?tour=<package_id>&format=json|csv (ADMN-04)
routerAdd("GET", "/api/admin/manifest", (c) => {
  function adminError(code, message, data) {
    c.json(code, { code: code, message: message, data: data || {} });
    return null;
  }

  function requireAdmin() {
    let auth = null;
    try { auth = $apis.requestInfo(c).authRecord; } catch (e) {}
    if (!auth) {
      try { const inf = $apis.requestInfo(c); if (inf && inf.admin) auth = inf.admin; } catch (e) {}
    }
    if (!auth) {
      try {
        const info = $apis.requestInfo(c);
        let h = (info && info.headers && (info.headers["authorization"] || info.headers["Authorization"])) || "";
        if (!h) {
          const req = c.request();
          if (req && req.header && typeof req.header.get === "function") h = req.header.get("Authorization") || req.header.get("authorization") || "";
        }
        const t = h.replace(/^Bearer\s+/i, "").trim();
        if (t) {
          try { auth = $app.dao().findAuthRecordByToken(t, $app.settings().recordAuthToken.secret); } catch (e2) { auth = null; }
          if (!auth) { try { auth = $app.dao().findAdminByToken(t, $app.settings().adminAuthToken.secret); } catch (e3) {} }
        }
      } catch (e4) {}
    }
    if (!auth) return adminError(401, "Authentication required.");
    let role = "";
    try { role = auth.getString("role") || ""; } catch (e5) { role = ""; }
    if (role && role !== "admin") return adminError(403, "Forbidden: Access restricted to administrators.");
    return auth;
  }

  function csvCell(value) {
    let s = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  const auth = requireAdmin();
  if (!auth) return;

  const tour = (c.queryParam("tour") || "").trim();
  const format = (c.queryParam("format") || "json").toLowerCase();
  if (!tour) return adminError(400, "Missing required query parameter: tour");

  let pkg = null;
  try { pkg = $app.dao().findRecordById("packages", tour); } catch (e) {}
  if (!pkg) return adminError(404, "Package/tour not found");

  let subs = [];
  try {
    subs = $app.dao().findRecordsByExpr("subscriptions", $dbx.exp("package_id = {:pid}", { pid: tour })) || [];
  } catch (err) {
    console.error("Error loading manifest subscriptions:", err);
  }
  subs.sort((a, b) => a.getString("booking_code").localeCompare(b.getString("booking_code")));

  const now = new Date().toISOString().replace("T", " ").substring(0, 19);
  const rows = [];
  let totalPaid = 0;
  let totalOutstanding = 0;

  for (const sub of subs) {
    let insts = [];
    try {
      insts = $app.dao().findRecordsByExpr("installments", $dbx.exp("subscription_id = {:sid}", { sid: sub.id })) || [];
    } catch (e) {}

    let emisPaid = 0;
    let amountPaid = 0;
    let lastPayment = "";
    for (const i of insts) {
      if (i.getString("status") === "paid") {
        emisPaid += 1;
        amountPaid += Number(i.get("amount")) || 0;
        const paidAt = i.getString("paid_at");
        if (paidAt && paidAt > lastPayment) lastPayment = paidAt;
      }
    }

    const totalAmount = Number(sub.get("total_amount")) || 0;
    const outstanding = Math.max(0, totalAmount - amountPaid);
    totalPaid += amountPaid;
    totalOutstanding += outstanding;

    rows.push({
      booking_code: sub.getString("booking_code"),
      customer_name: sub.getString("customer_name"),
      customer_phone: sub.getString("customer_phone"),
      tenure_months: Number(sub.get("tenure_months")) || insts.length,
      emis_paid: emisPaid,
      total_emis: insts.length,
      amount_paid: amountPaid,
      outstanding: outstanding,
      travel_status: sub.getString("travel_status"),
      last_payment: lastPayment || "-"
    });
  }

  const generatedAt = now;

  if (format === "csv") {
    const header = [
      "Booking Code", "Customer", "Phone", "Package", "Tenure (Months)",
      "EMIs Paid", "Total EMIs", "Amount Paid (INR)", "Outstanding (INR)",
      "Travel Status", "Last Payment"
    ];
    const lines = [header.map(csvCell).join(",")];
    for (const r of rows) {
      lines.push([
        r.booking_code, r.customer_name, r.customer_phone, pkg.getString("title"), r.tenure_months,
        r.emis_paid, r.total_emis, r.amount_paid, r.outstanding, r.travel_status, r.last_payment
      ].map(csvCell).join(","));
    }
    const csv = "\uFEFF" + lines.join("\r\n") + "\r\n";
    const slug = (pkg.getString("title") || "tour").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const filename = "manifest-" + slug + "-" + generatedAt.substring(0, 10) + ".csv";
    try {
      c.response().header().set("Content-Disposition", 'attachment; filename="' + filename + '"');
    } catch (e) {}
    return c.blob(200, "text/csv; charset=utf-8", csv);
  }

  return c.json(200, {
    package: {
      id: pkg.id,
      title: pkg.getString("title"),
      destination: pkg.getString("destination"),
      duration_days: pkg.getInt("duration_days"),
      total_price: pkg.getFloat("total_price")
    },
    count: rows.length,
    totals: { amount_paid: totalPaid, outstanding: totalOutstanding },
    generated_at: generatedAt,
    passengers: rows
  });
});

// 9. GET /api/admin/subscriptions (Devotee & Bookings Ledger)
routerAdd("GET", "/api/admin/subscriptions", (c) => {
  function adminError(code, message) {
    c.json(code, { code: code, message: message });
    return null;
  }

  function requireAdmin() {
    let auth = null;
    try { auth = $apis.requestInfo(c).authRecord; } catch (e) {}
    if (!auth) {
      try { const inf = $apis.requestInfo(c); if (inf && inf.admin) auth = inf.admin; } catch (e) {}
    }
    if (!auth) {
      try {
        const info = $apis.requestInfo(c);
        let h = (info && info.headers && (info.headers["authorization"] || info.headers["Authorization"])) || "";
        if (!h) {
          const req = c.request();
          if (req && req.header && typeof req.header.get === "function") h = req.header.get("Authorization") || req.header.get("authorization") || "";
        }
        const t = h.replace(/^Bearer\s+/i, "").trim();
        if (t) {
          try { auth = $app.dao().findAuthRecordByToken(t, $app.settings().recordAuthToken.secret); } catch (e2) { auth = null; }
          if (!auth) { try { auth = $app.dao().findAdminByToken(t, $app.settings().adminAuthToken.secret); } catch (e3) {} }
        }
      } catch (e4) {}
    }
    if (!auth) return adminError(401, "Authentication required.");
    let role = "";
    try { role = auth.getString("role") || ""; } catch (e5) { role = ""; }
    if (role && role !== "admin") return adminError(403, "Forbidden: Access restricted to administrators.");
    return auth;
  }

  const auth = requireAdmin();
  if (!auth) return;

  const searchQuery = (c.queryParam("search") || "").trim().toLowerCase();
  const statusFilter = (c.queryParam("status") || "all").trim().toLowerCase();
  const pkgFilter = (c.queryParam("package_id") || "").trim();

  let subs = [];
  try {
    subs = $app.dao().findRecordsByExpr("subscriptions", $dbx.exp("1 = 1 ORDER BY created DESC")) || [];
  } catch (err) {
    return c.json(200, { count: 0, subscriptions: [] });
  }

  const nowIso = new Date().toISOString().substring(0, 10);
  const rows = [];

  for (let i = 0; i < subs.length; i++) {
    const s = subs[i];
    const bookingCode = s.getString("booking_code") || "";
    const customerName = s.getString("customer_name") || "";
    const customerPhone = s.getString("customer_phone") || "";
    const packageId = s.getString("package_id") || "";

    if (pkgFilter && packageId !== pkgFilter) continue;

    if (searchQuery) {
      const match = bookingCode.toLowerCase().includes(searchQuery) ||
                    customerName.toLowerCase().includes(searchQuery) ||
                    customerPhone.toLowerCase().includes(searchQuery);
      if (!match) continue;
    }

    let pkgTitle = "Sacred Tour";
    let minEmis = 2;
    try {
      const p = $app.dao().findRecordById("packages", packageId);
      if (p) {
        pkgTitle = p.getString("title") || pkgTitle;
        minEmis = p.getInt("min_emis_to_travel") || minEmis;
      }
    } catch (e) {}

    let agentName = "Sahayak";
    try {
      const ag = $app.dao().findRecordById("users", s.getString("agent_id"));
      if (ag) agentName = ag.getString("name") || agentName;
    } catch (e) {}

    let distName = "Distributor";
    try {
      const di = $app.dao().findRecordById("users", s.getString("distributor_id"));
      if (di) distName = di.getString("name") || distName;
    } catch (e) {}

    // Inspect installments for accurate badge & financial status
    let insts = [];
    try {
      insts = $app.dao().findRecordsByExpr("installments", $dbx.exp("subscription_id = {:sid} ORDER BY installment_no ASC", { sid: s.id })) || [];
    } catch (e) {}

    let paidCount = 0;
    let amountPaid = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    const totalEmis = s.getInt("tenure_months") || insts.length || 6;
    const totalAmount = s.getFloat("total_amount") || 0;

    for (let j = 0; j < insts.length; j++) {
      const inst = insts[j];
      const st = inst.getString("status") || "pending";
      const amt = inst.getFloat("amount") || 0;
      const due = (inst.getString("due_date") || "").substring(0, 10);

      if (st === "paid") {
        paidCount++;
        amountPaid += amt;
      } else if (st === "overdue" || (due && due < nowIso)) {
        overdueCount++;
        overdueAmount += amt;
      }
    }

    // Badge calculation rules:
    // 1. Red: Missed/Overdue EMI (has >= 1 overdue installment)
    // 2. Green: Eligible/Ready (paid_emis_count >= min_emis_to_travel, 0 overdue)
    // 3. Orange: In Progress/Saving (< min_emis_to_travel, 0 overdue)
    let badge = "saving";
    let badgeLabel = "In Progress";
    let badgeColor = "orange";

    if (overdueCount > 0) {
      badge = "overdue";
      badgeLabel = "Missed EMI";
      badgeColor = "red";
    } else if (paidCount >= minEmis) {
      badge = "eligible";
      badgeLabel = "Travel Ready";
      badgeColor = "green";
    }

    if (statusFilter !== "all" && badge !== statusFilter) {
      continue;
    }

    rows.push({
      id: s.id,
      booking_code: bookingCode,
      customer_name: customerName,
      customer_phone: customerPhone,
      package_id: packageId,
      package_title: pkgTitle,
      agent_name: agentName,
      distributor_name: distName,
      total_amount: totalAmount,
      monthly_emi_amount: s.getFloat("monthly_emi_amount"),
      paid_emis_count: paidCount,
      total_emis: totalEmis,
      min_emis_to_travel: minEmis,
      amount_paid: amountPaid,
      outstanding_amount: Math.max(0, totalAmount - amountPaid),
      overdue_emis_count: overdueCount,
      overdue_amount: overdueAmount,
      travel_status: s.getString("travel_status") || "locked",
      badge: badge,
      badge_label: badgeLabel,
      badge_color: badgeColor,
      created: s.getString("created")
    });
  }

  return c.json(200, {
    count: rows.length,
    subscriptions: rows
  });
});

// 10. GET /api/admin/subscriptions/:id (Full Passbook & Installment Ledger)
routerAdd("GET", "/api/admin/subscriptions/:id", (c) => {
  function adminError(code, message) {
    c.json(code, { code: code, message: message });
    return null;
  }

  function requireAdmin() {
    let auth = null;
    try { auth = $apis.requestInfo(c).authRecord; } catch (e) {}
    if (!auth) {
      try { const inf = $apis.requestInfo(c); if (inf && inf.admin) auth = inf.admin; } catch (e) {}
    }
    if (!auth) {
      try {
        const info = $apis.requestInfo(c);
        let h = (info && info.headers && (info.headers["authorization"] || info.headers["Authorization"])) || "";
        if (!h) {
          const req = c.request();
          if (req && req.header && typeof req.header.get === "function") h = req.header.get("Authorization") || req.header.get("authorization") || "";
        }
        const t = h.replace(/^Bearer\s+/i, "").trim();
        if (t) {
          try { auth = $app.dao().findAuthRecordByToken(t, $app.settings().recordAuthToken.secret); } catch (e2) { auth = null; }
          if (!auth) { try { auth = $app.dao().findAdminByToken(t, $app.settings().adminAuthToken.secret); } catch (e3) {} }
        }
      } catch (e4) {}
    }
    if (!auth) return adminError(401, "Authentication required.");
    let role = "";
    try { role = auth.getString("role") || ""; } catch (e5) { role = ""; }
    if (role && role !== "admin") return adminError(403, "Forbidden: Access restricted to administrators.");
    return auth;
  }

  const auth = requireAdmin();
  if (!auth) return;

  const id = c.pathParam("id");
  let sub = null;
  try {
    sub = $app.dao().findRecordById("subscriptions", id);
  } catch (err) {
    return adminError(404, "Subscription not found.");
  }

  let pkg = null;
  try { pkg = $app.dao().findRecordById("packages", sub.getString("package_id")); } catch (e) {}

  let agent = null;
  try { agent = $app.dao().findRecordById("users", sub.getString("agent_id")); } catch (e) {}

  let distributor = null;
  try { distributor = $app.dao().findRecordById("users", sub.getString("distributor_id")); } catch (e) {}

  let insts = [];
  try {
    insts = $app.dao().findRecordsByExpr("installments", $dbx.exp("subscription_id = {:sid} ORDER BY installment_no ASC", { sid: sub.id })) || [];
  } catch (e) {}

  const installments = insts.map((inst) => ({
    id: inst.id,
    installment_no: inst.getInt("installment_no"),
    due_date: (inst.getString("due_date") || "").substring(0, 10),
    amount: inst.getFloat("amount"),
    status: inst.getString("status") || "pending",
    paid_at: inst.getString("paid_at") || "",
    payment_mode: inst.getString("payment_mode") || "cash",
    handover_status: inst.getString("handover_status") || "agent_custody",
    receipt_slip_id: inst.getString("receipt_slip_id") || ""
  }));

  return c.json(200, {
    subscription: {
      id: sub.id,
      booking_code: sub.getString("booking_code"),
      customer_name: sub.getString("customer_name"),
      customer_phone: sub.getString("customer_phone"),
      total_amount: sub.getFloat("total_amount"),
      monthly_emi_amount: sub.getFloat("monthly_emi_amount"),
      tenure_months: sub.getInt("tenure_months"),
      paid_emis_count: sub.getInt("paid_emis_count"),
      travel_status: sub.getString("travel_status") || "locked",
      created: sub.getString("created")
    },
    package: pkg ? {
      id: pkg.id,
      title: pkg.getString("title"),
      destination: pkg.getString("destination"),
      duration_days: pkg.getInt("duration_days"),
      total_price: pkg.getFloat("total_price"),
      min_emis_to_travel: pkg.getInt("min_emis_to_travel")
    } : null,
    agent: agent ? {
      id: agent.id,
      name: agent.getString("name"),
      phone: agent.getString("phone")
    } : null,
    distributor: distributor ? {
      id: distributor.id,
      name: distributor.getString("name"),
      phone: distributor.getString("phone")
    } : null,
    installments: installments
  });
});

// 11. PATCH /api/admin/subscriptions/:id/travel-status
routerAdd("PATCH", "/api/admin/subscriptions/:id/travel-status", (c) => {
  function adminError(code, message) {
    c.json(code, { code: code, message: message });
    return null;
  }

  function requireAdmin() {
    let auth = null;
    try { auth = $apis.requestInfo(c).authRecord; } catch (e) {}
    if (!auth) {
      try { const inf = $apis.requestInfo(c); if (inf && inf.admin) auth = inf.admin; } catch (e) {}
    }
    if (!auth) {
      try {
        const info = $apis.requestInfo(c);
        let h = (info && info.headers && (info.headers["authorization"] || info.headers["Authorization"])) || "";
        if (!h) {
          const req = c.request();
          if (req && req.header && typeof req.header.get === "function") h = req.header.get("Authorization") || req.header.get("authorization") || "";
        }
        const t = h.replace(/^Bearer\s+/i, "").trim();
        if (t) {
          try { auth = $app.dao().findAuthRecordByToken(t, $app.settings().recordAuthToken.secret); } catch (e2) { auth = null; }
          if (!auth) { try { auth = $app.dao().findAdminByToken(t, $app.settings().adminAuthToken.secret); } catch (e3) {} }
        }
      } catch (e4) {}
    }
    if (!auth) return adminError(401, "Authentication required.");
    let role = "";
    try { role = auth.getString("role") || ""; } catch (e5) { role = ""; }
    if (role && role !== "admin") return adminError(403, "Forbidden: Access restricted to administrators.");
    return auth;
  }

  const auth = requireAdmin();
  if (!auth) return;

  const id = c.pathParam("id");
  let sub = null;
  try {
    sub = $app.dao().findRecordById("subscriptions", id);
  } catch (err) {
    return adminError(404, "Subscription not found.");
  }

  let body = {};
  try { body = $apis.requestInfo(c).data || {}; } catch (e) {}
  const status = body.travel_status;
  const allowed = ["locked", "eligible", "scheduled", "completed"];
  if (!allowed.includes(status)) {
    return adminError(400, "Invalid travel status. Allowed: " + allowed.join(", "));
  }

  sub.set("travel_status", status);
  try {
    $app.dao().saveRecord(sub);
  } catch (err) {
    return adminError(500, "Failed to update travel status: " + err.message);
  }

  return c.json(200, {
    id: sub.id,
    booking_code: sub.getString("booking_code"),
    travel_status: status
  });
});

// 12. GET /api/admin/field-network (Sahayaks, Distributors, Cash Custody Float)
routerAdd("GET", "/api/admin/field-network", (c) => {
  function adminError(code, message) {
    c.json(code, { code: code, message: message });
    return null;
  }

  function requireAdmin() {
    let auth = null;
    try { auth = $apis.requestInfo(c).authRecord; } catch (e) {}
    if (!auth) {
      try { const inf = $apis.requestInfo(c); if (inf && inf.admin) auth = inf.admin; } catch (e) {}
    }
    if (!auth) {
      try {
        const info = $apis.requestInfo(c);
        let h = (info && info.headers && (info.headers["authorization"] || info.headers["Authorization"])) || "";
        if (!h) {
          const req = c.request();
          if (req && req.header && typeof req.header.get === "function") h = req.header.get("Authorization") || req.header.get("authorization") || "";
        }
        const t = h.replace(/^Bearer\s+/i, "").trim();
        if (t) {
          try { auth = $app.dao().findAuthRecordByToken(t, $app.settings().recordAuthToken.secret); } catch (e2) { auth = null; }
          if (!auth) { try { auth = $app.dao().findAdminByToken(t, $app.settings().adminAuthToken.secret); } catch (e3) {} }
        }
      } catch (e4) {}
    }
    if (!auth) return adminError(401, "Authentication required.");
    let role = "";
    try { role = auth.getString("role") || ""; } catch (e5) { role = ""; }
    if (role && role !== "admin") return adminError(403, "Forbidden: Access restricted to administrators.");
    return auth;
  }

  const auth = requireAdmin();
  if (!auth) return;

  let distributors = [];
  let agents = [];
  try {
    distributors = $app.dao().findRecordsByExpr("users", $dbx.exp("role = 'distributor'")) || [];
    agents = $app.dao().findRecordsByExpr("users", $dbx.exp("role = 'agent'")) || [];
  } catch (e) {}

  // Compute float (cash in custody) per agent
  const agentList = agents.map((ag) => {
    let floatAmt = 0;
    let subsCount = 0;
    try {
      const unpaidHandovers = $app.dao().findRecordsByExpr(
        "installments",
        $dbx.exp("collected_by = {:agId} AND status = 'paid' AND handover_status = 'agent_custody'", { agId: ag.id })
      ) || [];
      for (let k = 0; k < unpaidHandovers.length; k++) {
        floatAmt += unpaidHandovers[k].getFloat("amount") || 0;
      }
    } catch (err) {}

    try {
      const agSubs = $app.dao().findRecordsByExpr(
        "subscriptions",
        $dbx.exp("agent_id = {:agId}", { agId: ag.id })
      ) || [];
      subsCount = agSubs.length;
    } catch (err) {}

    let distName = "";
    try {
      const d = $app.dao().findRecordById("users", ag.getString("distributor_id"));
      if (d) distName = d.getString("name");
    } catch (e) {}

    return {
      id: ag.id,
      name: ag.getString("name"),
      phone: ag.getString("phone"),
      distributor_name: distName,
      cash_in_custody: floatAmt,
      total_subscriptions: subsCount,
      is_active: ag.getBool("is_active")
    };
  });

  const distList = distributors.map((d) => {
    let agentCount = 0;
    try {
      const dAgents = $app.dao().findRecordsByExpr(
        "users",
        $dbx.exp("role = 'agent' AND distributor_id = {:did}", { did: d.id })
      ) || [];
      agentCount = dAgents.length;
    } catch (e) {}

    return {
      id: d.id,
      name: d.getString("name"),
      phone: d.getString("phone"),
      agent_count: agentCount,
      is_active: d.getBool("is_active")
    };
  });

  let handovers = [];
  try {
    const hRecords = $app.dao().findRecordsByExpr("cash_handovers", $dbx.exp("1 = 1 ORDER BY created DESC LIMIT 15")) || [];
    handovers = hRecords.map((h) => {
      let aName = "Sahayak";
      let dName = "Distributor";
      try {
        const a = $app.dao().findRecordById("users", h.getString("agent_id"));
        if (a) aName = a.getString("name");
      } catch (e) {}
      try {
        const di = $app.dao().findRecordById("users", h.getString("distributor_id"));
        if (di) dName = di.getString("name");
      } catch (e) {}

      return {
        id: h.id,
        agent_name: aName,
        distributor_name: dName,
        total_amount: h.getFloat("total_amount"),
        status: h.getString("status"),
        verified_at: h.getString("verified_at"),
        created: h.getString("created")
      };
    });
  } catch (e) {}

  return c.json(200, {
    distributors: distList,
    agents: agentList,
    recent_handovers: handovers
  });
});

