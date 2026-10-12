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
  const payload = {
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

  console.log("  + Seeding initial pilgrimage packages...");
  const samplePackages = [
    {
      name: "Chardham Mahayatra Express",
      destination: "Yamunotri - Gangotri - Kedarnath - Badrinath",
      duration_days: 12,
      total_price: 36000,
      emi_amount: 3000,
      emi_frequency: "monthly",
      total_emis: 12,
      min_emis_to_travel: 4,
      is_active: true,
      description: "Complete spiritual circuit covering all 4 holy Himalayan dhams with premium AC bus and stay."
    },
    {
      name: "Puri Rath Yatra & Konark Special",
      destination: "Puri - Konark - Bhubaneswar - Chilika",
      duration_days: 5,
      total_price: 15000,
      emi_amount: 2500,
      emi_frequency: "monthly",
      total_emis: 6,
      min_emis_to_travel: 2,
      is_active: true,
      description: "Sacred Jagannath darshan, Chandrabhaga beach sunrise, and Konark Sun Temple heritage tour."
    },
    {
      name: "Kashi Vishwanath & Ayodhya Ram Mandir",
      destination: "Varanasi - Prayagraj - Ayodhya",
      duration_days: 7,
      total_price: 21000,
      emi_amount: 3000,
      emi_frequency: "monthly",
      total_emis: 7,
      min_emis_to_travel: 3,
      is_active: true,
      description: "Holy Ganga Aarti at Dashashwamedh Ghat, Triveni Sangam snan, and magnificent Ram Mandir darshan."
    },
    {
      name: "Tirupati Balaji Darshan Express",
      destination: "Tirupati - Kalahasti - Kanchipuram",
      duration_days: 4,
      total_price: 12000,
      emi_amount: 2000,
      emi_frequency: "monthly",
      total_emis: 6,
      min_emis_to_travel: 2,
      is_active: true,
      description: "Special VIP darshan at Tirumala Sri Venkateswara Temple with AC bus travel."
    }
  ];

  for (const pkg of samplePackages) {
    await fetch(`${BASE_URL}/api/collections/packages/records`, {
      method: "POST",
      headers,
      body: JSON.stringify(pkg)
    });
  }
  console.log(`  ✓ Seeded 4 initial pilgrimage packages.`);
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
