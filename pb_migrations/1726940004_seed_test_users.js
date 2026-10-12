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
      const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_");
      rec.setUsername(username);
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

  // 3. Ensure Initial Packages in Database (so Admin and Public page show real database packages)
  const pkgsCol = dao.findCollectionByNameOrId("packages");
  let existingPkgs = [];
  try {
    existingPkgs = dao.findRecordsByExpr("packages", $dbx.exp("1=1")) || [];
  } catch (e) {
    existingPkgs = [];
  }

  if (existingPkgs.length === 0) {
    const defaultPkgs = [
      {
        title: "Char Dham Himalayan Yatra",
        destination: "Yamunotri • Gangotri • Kedarnath • Badrinath",
        duration_days: 12,
        total_price: 36000,
        allowed_tenures: [6, 9, 12],
        min_emis_to_travel: 2,
        is_active: true,
        itinerary: "Complete spiritual circuit covering all 4 holy Himalayan dhams with premium AC bus and stay."
      },
      {
        title: "Ayodhya & Kashi Vishwanath Darshan",
        destination: "Ayodhya Ram Mandir • Kashi Vishwanath • Prayagraj",
        duration_days: 6,
        total_price: 18000,
        allowed_tenures: [3, 6, 9],
        min_emis_to_travel: 2,
        is_active: true,
        itinerary: "Ram Lalla VIP darshan, Ganga Maha Aarti boat ride, and Triveni Sangam holy snan."
      },
      {
        title: "12 Jyotirlinga Mahayatra",
        destination: "Somnath • Mahakaleshwar Ujjain • Omkareshwar • Nageshwar",
        duration_days: 9,
        total_price: 27000,
        allowed_tenures: [6, 9, 12],
        min_emis_to_travel: 2,
        is_active: true,
        itinerary: "Bhasma Aarti access, Purohit special puja service, and deluxe coach travel."
      },
      {
        title: "South India & Rameswaram Circuit",
        destination: "Rameswaram Ramanathaswamy • Madurai Meenakshi • Kanyakumari",
        duration_days: 8,
        total_price: 24000,
        allowed_tenures: [6, 9, 12],
        min_emis_to_travel: 2,
        is_active: true,
        itinerary: "22 Holy Theertham snan, Odisha special satvik cooks, and Pamban sea bridge view."
      }
    ];

    for (const dp of defaultPkgs) {
      const rec = new Record(pkgsCol);
      rec.set("title", dp.title);
      rec.set("destination", dp.destination);
      rec.set("duration_days", dp.duration_days);
      rec.set("total_price", dp.total_price);
      rec.set("allowed_tenures", dp.allowed_tenures);
      rec.set("min_emis_to_travel", dp.min_emis_to_travel);
      rec.set("is_active", dp.is_active);
      rec.set("itinerary", dp.itinerary);
      dao.saveRecord(rec);
      console.log(`[Migration] Seeded initial package: ${dp.title}`);
    }
  }

}, (db) => {
  // Rollback logic (no-op to preserve operational data)
});
