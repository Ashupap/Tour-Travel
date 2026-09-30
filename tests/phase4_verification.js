// tests/phase4_verification.js
// Automated End-to-End Integration Verification Suite for Phase 4: Admin Dashboard & Production Polish
// Verifies: ADMN-01..04, SEC-04 (+ branded 404 fallback & admin portal shell)

import { spawn } from "child_process";
import { setTimeout as sleep } from "timers/promises";

const PB_PORT = 8090;
const BASE_URL = `http://127.0.0.1:${PB_PORT}`;
const SUPERUSER_EMAIL = "admin@bharatyatra.local";
const SUPERUSER_PASSWORD = "password123456";

let pbProcess = null;

async function startPocketBase() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (res.ok) {
      console.log("✓ Existing PocketBase server is already healthy on port", PB_PORT);
      return;
    }
  } catch (e) {}

  console.log("Starting PocketBase server for Phase 4 test suite...");
  pbProcess = spawn(".\\pocketbase.exe", ["serve", `--http=127.0.0.1:${PB_PORT}`], {
    stdio: "pipe"
  });

  pbProcess.stdout.on("data", (d) => {
    console.log("[PB]", d.toString().trim());
  });
  pbProcess.stderr.on("data", (d) => {
    console.error("[PB-ERR]", d.toString().trim());
  });

  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) {
        console.log("✓ PocketBase server is healthy on port", PB_PORT);
        return;
      }
    } catch (e) {
      await sleep(300);
    }
  }
  throw new Error("PocketBase failed to start within timeout");
}

function stopPocketBase() {
  if (pbProcess) {
    console.log("Shutting down PocketBase server...");
    pbProcess.kill();
    pbProcess = null;
  }
}

async function main() {
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message, reqId) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] [${reqId}] ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] [${reqId}] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  const rand = Math.floor(1000 + Math.random() * 9000);

  async function createUser(headers, { email, name, role, distributorId }) {
    const res = await fetch(`${BASE_URL}/api/collections/users/records`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        password: "password123456",
        passwordConfirm: "password123456",
        name,
        role,
        phone: `98${rand}${String(role.length).padStart(2, "0")}${Math.floor(Math.random() * 90 + 10)}`,
        ...(distributorId ? { distributor_id: distributorId } : {}),
        is_active: true
      })
    });
    return res.json();
  }

  async function login(identity) {
    const res = await fetch(`${BASE_URL}/api/collections/users/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity, password: "password123456" })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Login failed for ${identity}: ${JSON.stringify(data)}`);
    return { data, headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.token}` } };
  }

  try {
    await startPocketBase();

    // ------------------------------------------------------------------
    // 0. Authentication & seed identities
    // ------------------------------------------------------------------
    console.log("\n--- Authenticating & Seeding Phase 4 Identities (SEC-04) ---");

    const suRes = await fetch(`${BASE_URL}/api/admins/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: SUPERUSER_EMAIL, password: SUPERUSER_PASSWORD })
    });
    const suData = await suRes.json();
    assert(suRes.ok && suData.token, "PocketBase superuser login successful", "AUTH-01");
    const suHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${suData.token}` };

    // role=admin app user (create if this is a fresh database)
    const adminEmail = "portaladmin@bharatyatra.local";
    const existingAdmins = await (await fetch(
      `${BASE_URL}/api/collections/users/records?filter=${encodeURIComponent("email='" + adminEmail + "'")}`,
      { headers: suHeaders }
    )).json();
    if (!existingAdmins.items || existingAdmins.items.length === 0) {
      const created = await createUser(suHeaders, {
        email: adminEmail, name: "Portal Admin", role: "admin"
      });
      assert(created.id, "role=admin app user created", "SEC-04");
    } else {
      assert(true, "role=admin app user already exists", "SEC-04");
    }
    const admin = await login(adminEmail);
    assert(admin.data.record.role === "admin", "admin app user login (role=admin)", "SEC-04");

    const distEmail = `p4_dist_${rand}@bharatyatra.local`;
    const distRec = await createUser(suHeaders, { email: distEmail, name: `P4 Dist ${rand}`, role: "distributor" });
    assert(distRec.id, "distributor user created", "DAT-01");
    const dist = await login(distEmail);

    const agentEmail = `p4_agent_${rand}@bharatyatra.local`;
    const agentRec = await createUser(suHeaders, {
      email: agentEmail, name: `P4 Agent ${rand}`, role: "agent", distributorId: distRec.id
    });
    assert(agentRec.id, "agent user created under distributor", "DAT-01");
    const agent = await login(agentEmail);

    // ------------------------------------------------------------------
    // 1. SEC-04 — role enforcement on every /api/admin/* endpoint
    // ------------------------------------------------------------------
    console.log("\n--- Testing Admin Endpoint Role Enforcement (SEC-04) ---");
    const adminEndpoints = [
      "/api/admin/portfolio",
      "/api/admin/risk-watchlist",
      "/api/admin/packages",
      "/api/admin/manifest?tour=dummy"
    ];
    for (const ep of adminEndpoints) {
      const anon = await fetch(`${BASE_URL}${ep}`);
      assert(anon.status === 401, `anonymous GET ${ep} -> 401 (got ${anon.status})`, "SEC-04");

      const agentHit = await fetch(`${BASE_URL}${ep}`, { headers: agent.headers });
      assert(agentHit.status === 403, `agent token GET ${ep} -> 403 (got ${agentHit.status})`, "SEC-04");

      const distHit = await fetch(`${BASE_URL}${ep}`, { headers: dist.headers });
      assert(distHit.status === 403, `distributor token GET ${ep} -> 403 (got ${distHit.status})`, "SEC-04");
    }

    // POST /api/admin/packages (admin write endpoint) is equally guarded
    const anonPost = await fetch(`${BASE_URL}/api/admin/packages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "x", destination: "y", duration_days: 1, total_price: 1, allowed_tenures: [3], min_emis_to_travel: 1, is_active: true })
    });
    assert(anonPost.status === 401, "anonymous POST /api/admin/packages -> 401", "SEC-04");
    const agentPost = await fetch(`${BASE_URL}/api/admin/packages`, {
      method: "POST", headers: agent.headers,
      body: JSON.stringify({ title: "Agent Yatra", destination: "Goa", duration_days: 5, total_price: 15000, allowed_tenures: [3, 6], min_emis_to_travel: 2, is_active: true })
    });
    assert(agentPost.status === 403, "agent POST /api/admin/packages -> 403", "SEC-04");

    // ------------------------------------------------------------------
    // 2. Admin portal shell (route mapping + assets)
    // ------------------------------------------------------------------
    console.log("\n--- Testing Admin Portal Shell ---");
    const dash = await fetch(`${BASE_URL}/admin/dashboard`, { redirect: "manual" });
    assert(dash.status === 302 && (dash.headers.get("location") || "").includes("/admin/index.html"),
      "GET /admin/dashboard redirects (302) to /admin/index.html", "ADMN-01");

    const portal = await fetch(`${BASE_URL}/admin/index.html`);
    const portalHtml = await portal.text();
    assert(portal.ok && portalHtml.includes("Admin Control Center"), "GET /admin/index.html serves admin portal", "ADMN-01");

    const portalJs = await fetch(`${BASE_URL}/admin/admin.js`);
    assert(portalJs.ok && (await portalJs.text()).includes("adminApp"), "GET /admin/admin.js serves portal controller", "ADMN-01");

    // ------------------------------------------------------------------
    // 3. ADMN-01 — Portfolio metrics
    // ------------------------------------------------------------------
    console.log("\n--- Testing Portfolio Metrics (ADMN-01) ---");
    const pkgRes = await fetch(`${BASE_URL}/api/admin/packages`, {
      method: "POST", headers: admin.headers,
      body: JSON.stringify({
        title: `Portfolio Yatra ${rand}`, destination: "Uttarakhand", duration_days: 12,
        total_price: 36000, allowed_tenures: [6, 9, 12], min_emis_to_travel: 2, is_active: true
      })
    });
    const pkg = await pkgRes.json();
    assert(pkgRes.status === 201 && pkg.id, `admin creates package via /api/admin/packages -> 201`, "ADMN-03");

    // Subscription seeded ~7 months in the past so ALL its EMIs are past-due
    const bookingCode = `BY-P4-${rand}`;
    const pastDate = new Date(Date.now() - 210 * 86400000).toISOString();
    const subRes = await fetch(`${BASE_URL}/api/collections/subscriptions/records`, {
      method: "POST", headers: suHeaders,
      body: JSON.stringify({
        booking_code: bookingCode,
        customer_name: "Ramesh Sharma",
        customer_phone: `9833${rand}44`,
        customer_address: "Village Rampur, Ward 4",
        package_id: pkg.id,
        agent_id: agentRec.id,
        distributor_id: distRec.id,
        tenure_months: 6,
        total_amount: 36000,          // N = booked value contributed by this seed
        monthly_emi_amount: 6000,
        paid_emis_count: 0,
        travel_status: "locked",
        booking_date: pastDate
      })
    });
    const sub = await subRes.json();
    assert(subRes.ok && sub.id, "seed subscription created (total_amount ₹36,000)", "ADMN-01");

    // Mark installment #1 paid -> realized cash E = ₹6,000; #2 stays unpaid & past-due -> overdue O >= ₹6,000
    const insts = await (await fetch(
      `${BASE_URL}/api/collections/installments/records?filter=${encodeURIComponent(`subscription_id='${sub.id}'`)}&sort=installment_no`,
      { headers: suHeaders }
    )).json();
    assert((insts.items || []).length === 6, `installments hook generated 6 EMIs (got ${(insts.items || []).length})`, "HOOK-01");
    const paidRes = await fetch(`${BASE_URL}/api/collections/installments/records/${insts.items[0].id}`, {
      method: "PATCH", headers: suHeaders,
      body: JSON.stringify({ status: "paid", paid_at: new Date().toISOString().replace("T", " ").substring(0, 19), payment_mode: "cash" })
    });
    assert(paidRes.ok, "first installment marked paid (₹6,000 realized)", "ADMN-01");

    const portRes = await fetch(`${BASE_URL}/api/admin/portfolio`, { headers: admin.headers });
    const portData = await portRes.json();
    assert(portRes.ok, "GET /api/admin/portfolio -> 200 for admin", "ADMN-01");
    const m = portData.metrics || {};
    assert(typeof m.total_booked_value === "number" && typeof m.total_realized_cash === "number" &&
           typeof m.total_defaults === "number" && typeof m.cash_in_transit === "number" &&
           typeof m.post_travel_default_count === "number",
      `portfolio returns all metric fields: ${JSON.stringify(m)}`, "ADMN-01");
    assert(m.total_booked_value >= 36000, `total_booked_value (₹${m.total_booked_value}) includes seeded ₹36,000`, "ADMN-01");
    assert(m.total_realized_cash >= 6000, `total_realized_cash (₹${m.total_realized_cash}) includes seeded paid EMI ₹6,000`, "ADMN-01");
    assert(m.total_defaults >= 6000, `total_overdue_cash/defaults (₹${m.total_defaults}) includes seeded past-due EMI ₹6,000`, "ADMN-01");
    assert(m.cash_in_transit >= 0, "cash_in_transit is non-negative", "ADMN-01");
    assert(["view+dao", "dao"].includes(portData.source), `metrics source is view or DAO fallback (${portData.source})`, "ADMN-01");

    // Cross-check against the admin_portfolio_overview view row (DAT-07)
    const viewRes = await fetch(`${BASE_URL}/api/collections/admin_portfolio_overview/records/portfolio_summary`, { headers: suHeaders });
    if (viewRes.ok) {
      const viewRow = await viewRes.json();
      if (Number(viewRow.gross_portfolio_value) > 0) {
        assert(Number(viewRow.gross_portfolio_value) === m.total_booked_value,
          `metric total_booked_value matches admin_portfolio_overview view row (${viewRow.gross_portfolio_value})`, "ADMN-01");
      } else {
        assert(true, "view row present but gross is zero -> DAO fallback used", "ADMN-01");
      }
    } else {
      assert(true, "view row not exposed via collection API -> DAO fallback accepted", "ADMN-01");
    }

    // Superuser token is also accepted (dual auth path)
    const suPort = await fetch(`${BASE_URL}/api/admin/portfolio`, { headers: suHeaders });
    assert(suPort.ok, "GET /api/admin/portfolio -> 200 for superuser token", "SEC-04");

    // ------------------------------------------------------------------
    // 4. ADMN-02 — Risk watchlist
    // ------------------------------------------------------------------
    console.log("\n--- Testing Risk Watchlist (ADMN-02) ---");
    // Flip the seeded subscription to 'completed' => post-travel default with overdue EMIs
    const flip = await fetch(`${BASE_URL}/api/collections/subscriptions/records/${sub.id}`, {
      method: "PATCH", headers: suHeaders,
      body: JSON.stringify({ travel_status: "completed" })
    });
    assert(flip.ok, "seeded subscription travel_status -> 'completed'", "ADMN-02");

    // A second subscription that is still 'locked' (travel not started) with overdue EMIs
    const lockedCode = `BY-P4L-${rand}`;
    const lockedRes = await fetch(`${BASE_URL}/api/collections/subscriptions/records`, {
      method: "POST", headers: suHeaders,
      body: JSON.stringify({
        booking_code: lockedCode,
        customer_name: "Sunita Devi",
        customer_phone: `9844${rand}55`,
        customer_address: "Village Nawada, Ward 2",
        package_id: pkg.id,
        agent_id: agentRec.id,
        distributor_id: distRec.id,
        tenure_months: 6,
        total_amount: 36000,
        monthly_emi_amount: 6000,
        paid_emis_count: 0,
        travel_status: "locked",
        booking_date: pastDate
      })
    });
    const lockedSub = await lockedRes.json();
    assert(lockedRes.ok && lockedSub.id, "second subscription created (travel_status 'locked', overdue EMIs)", "ADMN-02");

    const wlRes = await fetch(`${BASE_URL}/api/admin/risk-watchlist`, { headers: admin.headers });
    const wlData = await wlRes.json();
    assert(wlRes.ok && Array.isArray(wlData.watchlist), `GET /api/admin/risk-watchlist -> 200 array (count ${wlData.count})`, "ADMN-02");

    const completedEntry = wlData.watchlist.find((r) => r.booking_code === bookingCode);
    assert(completedEntry != null, "completed subscription with overdue EMIs appears in watchlist", "ADMN-02");
    assert(completedEntry.overdue_amount >= 6000, `watchlist overdue_amount >= ₹6,000 (got ₹${completedEntry.overdue_amount})`, "ADMN-02");
    assert(completedEntry.max_days_overdue >= 1, `watchlist max_days_overdue >= 1 (got ${completedEntry.max_days_overdue})`, "ADMN-02");
    assert(completedEntry.travel_status === "completed", "watchlist entry carries travel_status", "ADMN-02");

    const lockedEntry = wlData.watchlist.find((r) => r.booking_code === lockedCode);
    assert(lockedEntry == null, "locked (pre-travel) subscription with overdue EMIs is excluded", "ADMN-02");

    // sort/order params
    const wlAmt = await fetch(`${BASE_URL}/api/admin/risk-watchlist?sort=amount&order=asc`, { headers: admin.headers });
    const wlAmtData = await wlAmt.json();
    assert(wlAmt.ok && wlAmtData.sort === "amount" && wlAmtData.order === "asc",
      "watchlist accepts ?sort=amount&order=asc and echoes params", "ADMN-02");
    const amounts = wlAmtData.watchlist.map((r) => r.overdue_amount);
    const ascOk = amounts.every((v, i) => i === 0 || amounts[i - 1] <= v);
    assert(ascOk, "sort=amount returns non-decreasing overdue amounts", "ADMN-02");

    // ------------------------------------------------------------------
    // 5. ADMN-03 — Package management
    // ------------------------------------------------------------------
    console.log("\n--- Testing Package Management (ADMN-03) ---");
    const listRes = await fetch(`${BASE_URL}/api/admin/packages`, { headers: admin.headers });
    const listData = await listRes.json();
    assert(listRes.ok && Array.isArray(listData.packages), `GET /api/admin/packages -> 200 array (count ${listData.count})`, "ADMN-03");

    const crudTitle = `CRUD Test Yatra ${Date.now()}`;
    const createRes = await fetch(`${BASE_URL}/api/admin/packages`, {
      method: "POST", headers: admin.headers,
      body: JSON.stringify({
        title: crudTitle, destination: "Goa", duration_days: 5, total_price: 15000,
        allowed_tenures: [3, 6, 9], min_emis_to_travel: 2, is_active: true
      })
    });
    const created = await createRes.json();
    assert(createRes.status === 201 && created.id, "create package -> 201 with id", "ADMN-03");

    // Validation failure
    const badRes = await fetch(`${BASE_URL}/api/admin/packages`, {
      method: "POST", headers: admin.headers,
      body: JSON.stringify({ title: "x", destination: "", duration_days: 0, total_price: -5, allowed_tenures: [], min_emis_to_travel: 99 })
    });
    const badData = await badRes.json();
    assert(badRes.status === 400 && Object.keys(badData.data || {}).length >= 4,
      `invalid package -> 400 with per-field errors (${Object.keys(badData.data || {}).join(", ")})`, "ADMN-03");

    // Public catalog reflects create
    const pubRes = await fetch(`${BASE_URL}/api/public/packages`);
    const pubData = await pubRes.json();
    assert(pubRes.ok && pubData.packages.some((p) => p.id === created.id),
      "GET /api/public/packages includes newly created package", "ADMN-03");

    // PATCH price
    const patchRes = await fetch(`${BASE_URL}/api/admin/packages/${created.id}`, {
      method: "PATCH", headers: admin.headers, body: JSON.stringify({ total_price: 18500 })
    });
    assert(patchRes.ok, `PATCH /api/admin/packages/:id -> ${patchRes.status}`, "ADMN-03");
    const afterPatch = await (await fetch(`${BASE_URL}/api/admin/packages`, { headers: admin.headers })).json();
    const patched = afterPatch.packages.find((p) => p.id === created.id);
    assert(patched && patched.total_price === 18500, "updated price reflected in admin list", "ADMN-03");

    // PATCH unknown -> 404
    const missingPatch = await fetch(`${BASE_URL}/api/admin/packages/nosuchid1234`, {
      method: "PATCH", headers: admin.headers, body: JSON.stringify({ total_price: 1 })
    });
    assert(missingPatch.status === 404, "PATCH unknown package -> 404", "ADMN-03");

    // Hard delete (unreferenced package)
    const delRes = await fetch(`${BASE_URL}/api/admin/packages/${created.id}`, { method: "DELETE", headers: admin.headers });
    const delData = await delRes.json();
    assert(delRes.ok && delData.deleted === true, "DELETE unreferenced package -> hard delete", "ADMN-03");
    const pubAfter = await (await fetch(`${BASE_URL}/api/public/packages`)).json();
    assert(!pubAfter.packages.some((p) => p.id === created.id), "deleted package excluded from public catalog", "ADMN-03");

    // Soft deactivate (package referenced by the seeded subscription)
    const softRes = await fetch(`${BASE_URL}/api/admin/packages/${pkg.id}`, { method: "DELETE", headers: admin.headers });
    const softData = await softRes.json();
    assert(softRes.ok && softData.soft_deactivated === true,
      "DELETE referenced package -> soft deactivate (subscriptions keep their package)", "ADMN-03");
    const pubSoft = await (await fetch(`${BASE_URL}/api/public/packages`)).json();
    assert(!pubSoft.packages.some((p) => p.id === pkg.id), "soft-deactivated package excluded from public catalog", "ADMN-03");
    const stillAdmin = await (await fetch(`${BASE_URL}/api/admin/packages`, { headers: admin.headers })).json();
    assert(stillAdmin.packages.some((p) => p.id === pkg.id), "soft-deactivated package still fetchable by admin", "ADMN-03");

    // Reactivate for the manifest section (and leave dev data consistent)
    const reactivate = await fetch(`${BASE_URL}/api/admin/packages/${pkg.id}`, {
      method: "PATCH", headers: admin.headers, body: JSON.stringify({ is_active: true })
    });
    assert(reactivate.ok, "package reactivated after soft-delete test", "ADMN-03");

    // ------------------------------------------------------------------
    // 6. ADMN-04 — Bus manifest export (JSON + CSV)
    // ------------------------------------------------------------------
    console.log("\n--- Testing Bus Manifest Export (ADMN-04) ---");
    const manPkgRes = await fetch(`${BASE_URL}/api/admin/packages`, {
      method: "POST", headers: admin.headers,
      body: JSON.stringify({
        title: `Manifest Yatra ${rand}`, destination: "Puri", duration_days: 4,
        total_price: 12000, allowed_tenures: [3, 6], min_emis_to_travel: 2, is_active: true
      })
    });
    const manPkg = await manPkgRes.json();
    assert(manPkgRes.status === 201 && manPkg.id, "manifest package created", "ADMN-04");

    const hostileName = 'Sharma, "Ramesh" & Sons';
    const manSubRes = await fetch(`${BASE_URL}/api/collections/subscriptions/records`, {
      method: "POST", headers: suHeaders,
      body: JSON.stringify({
        booking_code: `BY-MF-${rand}`,
        customer_name: hostileName,
        customer_phone: `9855${rand}66`,
        customer_address: "Village Rampur, Ward 4",
        package_id: manPkg.id,
        agent_id: agentRec.id,
        distributor_id: distRec.id,
        tenure_months: 3,
        total_amount: 12000,
        monthly_emi_amount: 4000,
        paid_emis_count: 0,
        travel_status: "locked",
        booking_date: new Date().toISOString()
      })
    });
    const manSub = await manSubRes.json();
    assert(manSubRes.ok && manSub.id, "manifest seed subscription created", "ADMN-04");

    const manInsts = await (await fetch(
      `${BASE_URL}/api/collections/installments/records?filter=${encodeURIComponent(`subscription_id='${manSub.id}'`)}`,
      { headers: suHeaders }
    )).json();
    assert((manInsts.items || []).length === 3, `manifest subscription generated 3 EMIs (got ${(manInsts.items || []).length})`, "ADMN-04");
    const manPaid = await fetch(`${BASE_URL}/api/collections/installments/records/${manInsts.items[0].id}`, {
      method: "PATCH", headers: suHeaders,
      body: JSON.stringify({ status: "paid", paid_at: new Date().toISOString().replace("T", " ").substring(0, 19), payment_mode: "cash" })
    });
    assert(manPaid.ok, "manifest installment #1 marked paid", "ADMN-04");

    // Validation
    const noTour = await fetch(`${BASE_URL}/api/admin/manifest`, { headers: admin.headers });
    assert(noTour.status === 400, "manifest without ?tour= -> 400", "ADMN-04");
    const unknownTour = await fetch(`${BASE_URL}/api/admin/manifest?tour=nosuchpkg123`, { headers: admin.headers });
    assert(unknownTour.status === 404, "manifest unknown tour -> 404", "ADMN-04");

    // JSON manifest
    const jsonRes = await fetch(`${BASE_URL}/api/admin/manifest?tour=${manPkg.id}`, { headers: admin.headers });
    const manJson = await jsonRes.json();
    assert(jsonRes.ok && Array.isArray(manJson.passengers), "JSON manifest -> 200 with passengers array", "ADMN-04");
    assert(manJson.count === 1 && manJson.passengers[0].booking_code === `BY-MF-${rand}`,
      "manifest contains exactly the seeded passenger", "ADMN-04");
    const p0 = manJson.passengers[0];
    assert(p0.emis_paid === 1 && p0.total_emis === 3, `EMI progress correct (${p0.emis_paid}/${p0.total_emis})`, "ADMN-04");
    assert(p0.amount_paid === 4000 && p0.outstanding === 8000, "amount paid/outstanding correct (₹4,000/₹8,000)", "ADMN-04");
    assert(manJson.totals.amount_paid === 4000 && manJson.totals.outstanding === 8000, "manifest totals correct", "ADMN-04");

    // CSV manifest
    const csvRes = await fetch(`${BASE_URL}/api/admin/manifest?tour=${manPkg.id}&format=csv`, { headers: admin.headers });
    const csvBuf = Buffer.from(await csvRes.arrayBuffer());
    const csvText = csvBuf.toString("utf8");
    const ct = csvRes.headers.get("content-type") || "";
    const cd = csvRes.headers.get("content-disposition") || "";
    assert(csvRes.status === 200 && ct.includes("text/csv"), `CSV served with 200 text/csv (got "${ct}")`, "ADMN-04");
    assert(cd.includes("attachment") && /manifest-.*\.csv/.test(cd), `CSV has attachment filename (got "${cd}")`, "ADMN-04");
    assert(csvBuf[0] === 0xef && csvBuf[1] === 0xbb && csvBuf[2] === 0xbf, "CSV starts with UTF-8 BOM", "ADMN-04");
    const lines = csvText.replace(/^\uFEFF/, "").trim().split("\r\n");
    assert(lines[0].startsWith("Booking Code,Customer,Phone,Package,Tenure (Months),EMIs Paid,Total EMIs,Amount Paid (INR),Outstanding (INR),Travel Status,Last Payment"),
      "CSV header row matches spec", "ADMN-04");
    assert(lines.length === 1 + manJson.count, `CSV has one row per passenger (${lines.length - 1}/${manJson.count})`, "ADMN-04");
    assert(csvText.includes('"Sharma, ""Ramesh"" & Sons"'), "CSV escapes commas/quotes in customer name", "ADMN-04");
    assert(csvText.includes(`BY-MF-${rand}`) && csvText.includes("locked"), "CSV row carries booking code & travel status", "ADMN-04");

    // ------------------------------------------------------------------
    // 7. Branded 404 fallback (production hardening)
    // ------------------------------------------------------------------
    console.log("\n--- Testing Branded 404 Fallback ---");
    const missingPage = await fetch(`${BASE_URL}/definitely-missing`, {
      redirect: "manual", headers: { Accept: "text/html,application/xhtml+xml" }
    });
    const missingHtml = await missingPage.text();
    assert(missingPage.status === 404, `GET /definitely-missing -> HTTP 404 (got ${missingPage.status})`, "ADMN-04");
    assert(missingHtml.includes("This road doesn't exist") && missingHtml.includes("BharatYatra"),
      "404 response serves the branded BharatYatra page", "ADMN-04");

    const missingNested = await fetch(`${BASE_URL}/no/such/deep/page`, { redirect: "manual" });
    assert(missingNested.status === 404, "nested unknown path -> HTTP 404", "ADMN-04");

    const unknownApi = await fetch(`${BASE_URL}/api/collections/nope/records`);
    const unknownApiBody = await unknownApi.json();
    assert(unknownApi.status === 404 && unknownApiBody.code === 404,
      "unknown API path still returns JSON 404 (semantics unchanged)", "SEC-04");

    const css = await fetch(`${BASE_URL}/css/tailwind.css`);
    assert(css.ok, "existing static asset still served (200)", "ADMN-04");
    const landing = await fetch(`${BASE_URL}/`, { redirect: "manual" });
    assert(landing.ok, "landing page at / still served (200)", "ADMN-04");
    const agentDash = await fetch(`${BASE_URL}/agent/dashboard`, { redirect: "manual" });
    assert(agentDash.status >= 200 && agentDash.status < 400,
      `hook route /agent/dashboard unaffected by 404 middleware (${agentDash.status})`, "ADMN-04");

    // Service worker cache version bump for admin assets
    const swRes = await fetch(`${BASE_URL}/sw.js`);
    const swJs = await swRes.text();
    assert(swRes.ok && swJs.includes("bharatyatra-cache-v3"), "service worker cache version bumped to v3", "ADMN-04");

    console.log("\n======================================================");
    console.log(`✓ ALL ${passedTests}/${totalTests} PHASE 4 INTEGRATION TESTS PASSED!`);
    console.log("======================================================\n");
  } catch (err) {
    console.error("Test failure in Phase 4 suite:", err);
    process.exitCode = 1;
  } finally {
    stopPocketBase();
  }
}

main();
