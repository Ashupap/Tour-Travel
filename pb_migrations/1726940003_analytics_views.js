// pb_migrations/1726940003_analytics_views.js
// Create SQLite analytical view collections for Distributor and Admin dashboards (DAT-06, DAT-07)

migrate((db) => {
  const dao = new Dao(db);

  // 1. Distributor Daily Analytics View Collection (DAT-06)
  const distributorQuery = `
    SELECT 
      u.id AS id,
      u.id AS distributor_id,
      COUNT(DISTINCT s.id) AS total_active_subscriptions,
      COALESCE(SUM(CASE WHEN i.due_date <= CURRENT_TIMESTAMP AND i.status != 'paid' THEN i.amount ELSE 0 END), 0) AS total_overdue_amount,
      COALESCE(SUM(CASE WHEN i.paid_at >= date('now', 'start of day') THEN i.amount ELSE 0 END), 0) AS collected_today,
      COALESCE(SUM(CASE WHEN i.handover_status = 'agent_custody' AND i.status = 'paid' THEN i.amount ELSE 0 END), 0) AS cash_in_agents_custody
    FROM users u
    LEFT JOIN subscriptions s ON s.distributor_id = u.id
    LEFT JOIN installments i ON i.subscription_id = s.id
    WHERE u.role = 'distributor'
    GROUP BY u.id
  `;

  const distributorAnalytics = new Collection({
    name: "distributor_daily_analytics",
    type: "view",
    options: {
      query: distributorQuery
    },
    listRule: "@request.auth.role = 'admin' || distributor_id = @request.auth.id",
    viewRule: "@request.auth.role = 'admin' || distributor_id = @request.auth.id"
  });

  dao.saveCollection(distributorAnalytics);

  // 2. Admin Portfolio Overview View Collection (DAT-07)
  const adminQuery = `
    SELECT 
      'portfolio_summary' AS id,
      (SELECT COALESCE(SUM(total_amount), 0) FROM subscriptions) AS gross_portfolio_value,
      COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END), 0) AS total_realized_cash,
      COALESCE(SUM(CASE WHEN i.due_date <= CURRENT_TIMESTAMP AND i.status != 'paid' THEN i.amount ELSE 0 END), 0) AS total_overdue_cash,
      COUNT(DISTINCT CASE WHEN s.travel_status IN ('scheduled', 'completed') AND i.status != 'paid' AND i.due_date <= CURRENT_TIMESTAMP THEN s.id END) AS post_travel_default_count,
      COALESCE(SUM(CASE WHEN i.handover_status = 'agent_custody' AND i.status = 'paid' THEN i.amount ELSE 0 END), 0) AS field_float
    FROM subscriptions s
    LEFT JOIN installments i ON i.subscription_id = s.id
  `;

  const adminOverview = new Collection({
    name: "admin_portfolio_overview",
    type: "view",
    options: {
      query: adminQuery
    },
    listRule: "@request.auth.role = 'admin'",
    viewRule: "@request.auth.role = 'admin'"
  });

  dao.saveCollection(adminOverview);

  console.log("Created SQLite analytical views successfully!");
}, (db) => {
  const dao = new Dao(db);
  const views = ["admin_portfolio_overview", "distributor_daily_analytics"];
  for (const name of views) {
    try {
      const col = dao.findCollectionByNameOrId(name);
      if (col) dao.deleteCollection(col);
    } catch (e) {}
  }
});
