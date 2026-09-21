// pb_migrations/1726940002_security_access_rules.js
// Configure zero-trust access control rules for collections (SEC-01, SEC-02, SEC-03)

migrate((db) => {
  const dao = new Dao(db);

  // 1. Packages Access Rules
  const packages = dao.findCollectionByNameOrId("packages");
  packages.listRule = "is_active = true || @request.auth.role = 'admin'";
  packages.viewRule = "is_active = true || @request.auth.role = 'admin'";
  packages.createRule = "@request.auth.role = 'admin'";
  packages.updateRule = "@request.auth.role = 'admin'";
  packages.deleteRule = "@request.auth.role = 'admin'";
  dao.saveCollection(packages);

  // 2. Subscriptions Access Rules (SEC-01, SEC-03)
  const subscriptions = dao.findCollectionByNameOrId("subscriptions");
  subscriptions.listRule = "@request.auth.role = 'admin' || (@request.auth.role = 'distributor' && distributor_id = @request.auth.id) || (@request.auth.role = 'agent' && agent_id = @request.auth.id)";
  subscriptions.viewRule = "@request.auth.role = 'admin' || (@request.auth.role = 'distributor' && distributor_id = @request.auth.id) || (@request.auth.role = 'agent' && agent_id = @request.auth.id)";
  subscriptions.createRule = "@request.auth.role = 'admin' || (@request.auth.role = 'agent' && agent_id = @request.auth.id)";
  subscriptions.updateRule = "@request.auth.role = 'admin'";
  subscriptions.deleteRule = "@request.auth.role = 'admin'";
  dao.saveCollection(subscriptions);

  // 3. Installments Access Rules (SEC-01, SEC-02 Handover Finality)
  const installments = dao.findCollectionByNameOrId("installments");
  installments.listRule = "@request.auth.role = 'admin' || (@request.auth.role = 'distributor' && subscription_id.distributor_id = @request.auth.id) || (@request.auth.role = 'agent' && subscription_id.agent_id = @request.auth.id)";
  installments.viewRule = "@request.auth.role = 'admin' || (@request.auth.role = 'distributor' && subscription_id.distributor_id = @request.auth.id) || (@request.auth.role = 'agent' && subscription_id.agent_id = @request.auth.id)";
  installments.createRule = "@request.auth.role = 'admin'";
  installments.updateRule = "@request.auth.role = 'admin' || (@request.auth.role = 'agent' && subscription_id.agent_id = @request.auth.id && handover_status != 'distributor_confirmed')";
  installments.deleteRule = "@request.auth.role = 'admin'";
  dao.saveCollection(installments);

  // 4. Cash Handovers Access Rules
  const cashHandovers = dao.findCollectionByNameOrId("cash_handovers");
  cashHandovers.listRule = "@request.auth.role = 'admin' || agent_id = @request.auth.id || distributor_id = @request.auth.id";
  cashHandovers.viewRule = "@request.auth.role = 'admin' || agent_id = @request.auth.id || distributor_id = @request.auth.id";
  cashHandovers.createRule = "@request.auth.role = 'agent' && agent_id = @request.auth.id";
  cashHandovers.updateRule = "@request.auth.role = 'admin' || (@request.auth.role = 'distributor' && distributor_id = @request.auth.id)";
  cashHandovers.deleteRule = "@request.auth.role = 'admin'";
  dao.saveCollection(cashHandovers);

  // 5. Users Access Rules
  const users = dao.findCollectionByNameOrId("users");
  users.listRule = "@request.auth.role = 'admin' || (@request.auth.role = 'distributor' && distributor_id = @request.auth.id) || id = @request.auth.id";
  users.viewRule = "@request.auth.role = 'admin' || (@request.auth.role = 'distributor' && distributor_id = @request.auth.id) || id = @request.auth.id";
  users.createRule = "@request.auth.role = 'admin'";
  users.updateRule = "id = @request.auth.id || @request.auth.role = 'admin'";
  users.deleteRule = "@request.auth.role = 'admin'";
  dao.saveCollection(users);

  console.log("Applied security access rules successfully!");
}, (db) => {
  const dao = new Dao(db);
  const collections = ["packages", "subscriptions", "installments", "cash_handovers", "users"];
  for (const name of collections) {
    try {
      const col = dao.findCollectionByNameOrId(name);
      if (col) {
        col.listRule = null;
        col.viewRule = null;
        col.createRule = null;
        col.updateRule = null;
        col.deleteRule = null;
        dao.saveCollection(col);
      }
    } catch (e) {}
  }
});
