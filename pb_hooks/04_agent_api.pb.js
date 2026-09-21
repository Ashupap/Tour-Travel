// pb_hooks/04_agent_api.pb.js
// Custom API routes for Agent Manifest Sync and Atomic Batch Sync (API-01, API-02, SEC-04)

function getAgentAuth(c) {
  // Check authRecord from request info
  const info = $apis.requestInfo(c);
  let authRecord = info.authRecord;

  // Fallback: parse Authorization header token if authRecord wasn't automatically populated
  if (!authRecord) {
    const authHeader = c.request().header.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (token) {
        try {
          authRecord = $app.dao().findAuthRecordByToken(token, $app.settings().recordAuthToken.secret);
        } catch (e) {}
      }
    }
  }

  if (!authRecord) {
    throw new UnauthorizedError("Authentication required. Please provide a valid agent Bearer token.");
  }

  if (authRecord.getString("role") !== "agent") {
    throw new ForbiddenError("Forbidden: Access restricted to field agents.");
  }

  return authRecord;
}

// 1. GET /api/agent/sync-manifest (API-02)
routerAdd("GET", "/api/agent/sync-manifest", (c) => {
  const agent = getAgentAuth(c);

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
      $dbx.exp(`subscription_id IN (${quotedIds}) AND status IN ('pending', 'overdue')`)
    ) || [];
  }

  // Fetch all active packages for local reference
  const packages = $app.dao().findRecordsByExpr(
    "packages",
    $dbx.exp("is_active = true")
  ) || [];

  return c.json(200, {
    synced_at: new Date().toISOString().replace("T", " "),
    agent: {
      id: agent.id,
      name: agent.getString("name"),
      phone: agent.getString("phone")
    },
    packages: packages.map((p) => ({
      id: p.id,
      title: p.getString("title"),
      destination: p.getString("destination"),
      duration_days: p.getInt("duration_days"),
      total_price: p.getFloat("total_price"),
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
      total_amount: s.getFloat("total_amount"),
      monthly_emi_amount: s.getFloat("monthly_emi_amount"),
      paid_emis_count: s.getInt("paid_emis_count"),
      travel_status: s.getString("travel_status"),
      booking_date: s.getString("booking_date")
    })),
    installments: installments.map((i) => ({
      id: i.id,
      subscription_id: i.getString("subscription_id"),
      installment_no: i.getInt("installment_no"),
      due_date: i.getString("due_date"),
      amount: i.getFloat("amount"),
      status: i.getString("status"),
      handover_status: i.getString("handover_status")
    }))
  });
});

// 2. POST /api/agent/batch-sync (API-01, HOOK-03)
routerAdd("POST", "/api/agent/batch-sync", (c) => {
  const agent = getAgentAuth(c);
  const data = $apis.requestInfo(c).data;
  const items = (data && data.items) ? data.items : [];

  if (!Array.isArray(items) || items.length === 0) {
    return c.json(400, { error: "Payload must contain a non-empty 'items' array" });
  }

  let processedCount = 0;
  let skippedCount = 0;
  const results = [];

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
        installment_id: item.installment_id,
        status: "processed",
        receipt_slip_id: installment.getString("receipt_slip_id")
      });
    }
  });

  return c.json(200, {
    success: true,
    processed_count: processedCount,
    skipped_count: skippedCount,
    results: results
  });
});
