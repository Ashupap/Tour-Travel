// scripts/seed-test-users.js
// Seeds development test users, packages, and demo records into PocketBase.

import { execSync } from "child_process";

const BASE_URL = process.env.PB_URL || "http://127.0.0.1:8090";
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || "admin@bharatyatra.local";
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || "password123456";

console.log("=== Seeding BharatYatra Development Test Users ===");

async function getAdminToken() {
  // Try authenticating as admin
  try {
    const res = await fetch(`${BASE_URL}/api/admins/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    if (res.ok) {
      const data = await res.json();
      return data.token;
    }
  } catch (e) {}

  // If failed, create admin via CLI (works on both Linux and Windows)
  console.log(`[INFO] Creating admin superuser '${ADMIN_EMAIL}' via PocketBase CLI...`);
  const pbCmd = process.platform === "win32" ? ".\\pocketbase.exe" : "./pocketbase";
  try {
    execSync(`${pbCmd} admin create "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}"`, { stdio: "pipe" });
  } catch (err) {
    // Might already exist, try update
    try {
      execSync(`${pbCmd} admin update "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}"`, { stdio: "pipe" });
    } catch (e) {}
  }

  // Re-attempt authentication
  const res = await fetch(`${BASE_URL}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });
  if (!res.ok) {
    throw new Error(`Failed to authenticate admin: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.token;
}

async function ensureUser(adminToken, userData) {
  const headers = {
    "Authorization": adminToken,
    "Content-Type": "application/json"
  };

  // Check if user exists by email
  const filter = encodeURIComponent(`email="${userData.email}"`);
  const searchRes = await fetch(`${BASE_URL}/api/collections/users/records?filter=${filter}`, { headers });
  const searchData = await searchRes.json();

  if (searchData.items && searchData.items.length > 0) {
    const existing = searchData.items[0];
    console.log(`  ✓ User exists: [${existing.role.toUpperCase()}] ${existing.name} (${existing.email})`);
    return existing;
  }

  // Create new user
  const username = userData.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_");
  const payload = {
    username,
    email: userData.email,
    password: userData.password,
    passwordConfirm: userData.password,
    name: userData.name,
    role: userData.role,
    phone: userData.phone,
    is_active: true,
    emailVisibility: false
  };
  if (userData.distributor_id) {
    payload.distributor_id = userData.distributor_id;
  }

  const createRes = await fetch(`${BASE_URL}/api/collections/users/records`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    console.warn(`  ⚠ Warning creating ${userData.email}:`, errText);
    return null;
  }
  const created = await createRes.json();
  console.log(`  + Created user: [${created.role.toUpperCase()}] ${created.name} (${created.email})`);
  return created;
}

async function ensurePackages(adminToken) {
  const headers = {
    "Authorization": adminToken,
    "Content-Type": "application/json"
  };

  const listRes = await fetch(`${BASE_URL}/api/collections/packages/records?perPage=1`, { headers });
  const listData = await listRes.json();
  if (listData.items && listData.items.length > 0) {
    console.log(`  ✓ Packages collection already contains ${listData.totalItems} packages.`);
    return;
  }

  console.log("  + Ensuring initial pilgrimage packages in database...");
  const samplePackages = [
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

  for (const pkg of samplePackages) {
    const res = await fetch(`${BASE_URL}/api/collections/packages/records`, {
      method: "POST",
      headers,
      body: JSON.stringify(pkg)
    });
    if (!res.ok) {
      console.warn(`  ⚠ Warning creating package '${pkg.title}':`, res.status, await res.text());
    } else {
      console.log(`  + Seeded package: ${pkg.title}`);
    }
  }
}

async function run() {
  const adminToken = await getAdminToken();
  console.log("✓ Authenticated admin superuser successfully.");

  console.log("\n[1] Verifying & Creating Test Portal Users...");

  // 1. Portal Admin
  await ensureUser(adminToken, {
    email: "portaladmin@bharatyatra.local",
    password: "password123456",
    name: "Aditya Travels Portal Admin",
    role: "admin",
    phone: "9876543210"
  });

  // Also ensure admin@bharatyatra.local in users collection
  await ensureUser(adminToken, {
    email: "admin@bharatyatra.local",
    password: "password123456",
    name: "System Control Administrator",
    role: "admin",
    phone: "9876543211"
  });

  // 2. Primary Distributor (Puri Central Hub)
  const distPuri = await ensureUser(adminToken, {
    email: "tarini_hub@bharatyatra.local",
    password: "password123456",
    name: "Maa Tarini Travel Agency (Puri Central Hub)",
    role: "distributor",
    phone: "9861099881"
  });

  // 3. Secondary Distributor (Cuttack Hub)
  const distCuttack = await ensureUser(adminToken, {
    email: "cuttack_hub@bharatyatra.local",
    password: "password123456",
    name: "Utkal Travels (Cuttack-Bhubaneswar Hub)",
    role: "distributor",
    phone: "9861234567"
  });

  // 4. Primary Field Sahayak (Balaram - Puri Route)
  await ensureUser(adminToken, {
    email: "balaram_puri@bharatyatra.local",
    password: "password123456",
    name: "Balaram Sahoo (Puri Field Sahayak)",
    role: "agent",
    phone: "9437102030",
    distributor_id: distPuri ? distPuri.id : undefined
  });

  // 5. Secondary Field Sahayak (Soumya - Cuttack Route)
  await ensureUser(adminToken, {
    email: "soumya_cuttack@bharatyatra.local",
    password: "password123456",
    name: "Soumya Ranjan Dash (Cuttack Sahayak)",
    role: "agent",
    phone: "9438112233",
    distributor_id: distCuttack ? distCuttack.id : undefined
  });

  console.log("\n[2] Verifying & Creating Initial Packages...");
  await ensurePackages(adminToken);

  console.log("\n🎉 Test users & packages are verified and ready for login!");
  console.log("------------------------------------------------------------------");
  console.log("  Admin Login:       admin@bharatyatra.local       / password123456");
  console.log("  Distributor Login: tarini_hub@bharatyatra.local  / password123456");
  console.log("  Sahayak Login:     balaram_puri@bharatyatra.local / password123456");
  console.log("------------------------------------------------------------------");
}

run().catch(err => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
