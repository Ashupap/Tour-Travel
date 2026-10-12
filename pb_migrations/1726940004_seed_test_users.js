// pb_migrations/1726940004_seed_test_users.js
// Auto-seeds initial admin, test distributor, and field sahayak users into the SQLite database.

migrate((db) => {
  const dao = new Dao(db);

  // 1. Ensure Superuser Admin Account in _pb_admins_
  try {
    dao.findAdminByEmail("admin@bharatyatra.local");
  } catch (e) {
    try {
      const admin = new Admin();
      admin.email = "admin@bharatyatra.local";
      admin.setPassword("password123456");
      dao.saveAdmin(admin);
      console.log("[Migration] Created superuser admin@bharatyatra.local");
    } catch (err) {
      console.log("[Migration] Note: Admin creation skipped:", err);
    }
  }

  // 2. Ensure Users Collection Records
  const usersCol = dao.findCollectionByNameOrId("users");

  function getOrCreateUser(email, password, name, role, phone, distributorId = "") {
    try {
      return dao.findAuthRecordByEmail("users", email);
    } catch (e) {
      const rec = new Record(usersCol);
      rec.setEmail(email);
      rec.setPassword(password);
      rec.set("name", name);
      rec.set("role", role);
      rec.set("phone", phone);
      rec.set("is_active", true);
      if (distributorId) {
        rec.set("distributor_id", distributorId);
      }
      dao.saveRecord(rec);
      console.log(`[Migration] Created ${role} record: ${name} (${email})`);
      return rec;
    }
  }

  // Create Portal Admin
  getOrCreateUser("admin@bharatyatra.local", "password123456", "System Administrator", "admin", "9876543211");
  getOrCreateUser("portaladmin@bharatyatra.local", "password123456", "Portal Admin", "admin", "9876543210");

  // Create Primary Distributor (Puri Central Hub)
  const distPuri = getOrCreateUser("tarini_hub@bharatyatra.local", "password123456", "Maa Tarini Travel Agency (Puri Central Hub)", "distributor", "9861099881");

  // Create Primary Sahayak (Balaram)
  const distId = distPuri ? distPuri.id : "";
  getOrCreateUser("balaram_puri@bharatyatra.local", "password123456", "Balaram Sahoo (Puri Field Sahayak)", "agent", "9437102030", distId);

}, (db) => {
  // Rollback logic (no-op to preserve operational data)
});
