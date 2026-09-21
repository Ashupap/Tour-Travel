// pb_public/offline-store.js
// Dexie.js Client-Side Persistence Layer for BharatYatra Agent PWA (PWA-04, PWA-05)

let dbInstance = null;

function getDB() {
  if (!dbInstance) {
    // Dexie is loaded from dexie.min.js
    if (typeof Dexie === "undefined") {
      console.error("Dexie library is not loaded!");
      return null;
    }
    dbInstance = new Dexie("BharatYatraDB");
    dbInstance.version(1).stores({
      packages: "id, title, min_emis_to_travel",
      subscriptions: "id, booking_code, customer_name, customer_phone, agent_id, travel_status",
      installments: "id, subscription_id, installment_no, due_date, amount, status, handover_status, idempotency_key",
      outbox: "++local_id, installment_id, subscription_id, amount, payment_mode, receipt_slip_id, idempotency_key, collected_at, sync_status"
    });
  }
  return dbInstance;
}

// 1. Download & Hydrate Morning Manifest into Dexie (PWA-05)
async function syncManifestDown(manifestData) {
  const db = getDB();
  if (!db) return false;

  await db.transaction("rw", db.packages, db.subscriptions, db.installments, async () => {
    // Upsert packages
    if (manifestData.packages && manifestData.packages.length > 0) {
      await db.packages.bulkPut(manifestData.packages);
    }
    // Upsert subscriptions
    if (manifestData.subscriptions && manifestData.subscriptions.length > 0) {
      await db.subscriptions.bulkPut(manifestData.subscriptions);
    }
    // Upsert installments
    if (manifestData.installments && manifestData.installments.length > 0) {
      await db.installments.bulkPut(manifestData.installments);
    }
  });

  console.log("IndexedDB successfully hydrated from server manifest!");
  return true;
}

// 2. Record Offline Payment Collection into Dexie & Outbox (PWA-04, AGNT-02)
async function recordOfflinePayment({ installmentId, subscriptionId, paymentMode, amount, agentId, customerPhone, customerName, bookingCode }) {
  const db = getDB();
  if (!db) throw new Error("IndexedDB unavailable");

  const timestamp = Date.now();
  const idempotencyKey = `${agentId}-${installmentId}-${timestamp}`;
  const receiptSlipId = `OFF-${agentId}-${timestamp}`;
  const collectedAt = new Date().toISOString();

  await db.transaction("rw", db.installments, db.outbox, async () => {
    // Update local installment state
    const existing = await db.installments.get(installmentId);
    if (existing) {
      existing.status = "paid";
      existing.payment_mode = paymentMode;
      existing.handover_status = "agent_custody";
      existing.receipt_slip_id = receiptSlipId;
      existing.idempotency_key = idempotencyKey;
      await db.installments.put(existing);
    }

    // Queue in Outbox
    await db.outbox.add({
      installment_id: installmentId,
      subscription_id: subscriptionId,
      amount: amount,
      payment_mode: paymentMode,
      receipt_slip_id: receiptSlipId,
      idempotency_key: idempotencyKey,
      collected_at: collectedAt,
      sync_status: "pending_push"
    });
  });

  // Request Service Worker background sync if supported
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register("sync-installments");
      console.log("Background sync registered: sync-installments");
    } catch (e) {
      console.warn("Background sync registration skipped:", e);
    }
  }

  return {
    receiptSlipId,
    idempotencyKey,
    collectedAt
  };
}

// 3. Query Pending Outbox Queue
async function getPendingOutbox() {
  const db = getDB();
  if (!db) return [];
  return await db.outbox.where("sync_status").equals("pending_push").toArray();
}

// 4. Mark Outbox Item as Synced
async function markOutboxSynced(idempotencyKey) {
  const db = getDB();
  if (!db) return;
  const item = await db.outbox.where("idempotency_key").equals(idempotencyKey).first();
  if (item) {
    item.sync_status = "synced";
    await db.outbox.put(item);
  }
}

// 5. Query Cash in Hand Total (Cash in agent custody)
async function getCashInHandTotal() {
  const db = getDB();
  if (!db) return 0;
  const cashPaid = await db.installments
    .filter((i) => i.status === "paid" && i.payment_mode === "cash" && i.handover_status === "agent_custody")
    .toArray();
  return cashPaid.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
}

// 6. Get Daily Recovery List (Joined view of subscriptions and pending installments)
async function getDailyRecoveryList() {
  const db = getDB();
  if (!db) return [];

  const installments = await db.installments
    .filter((i) => i.status === "pending" || i.status === "overdue")
    .toArray();

  const recoveryList = [];
  for (const inst of installments) {
    const sub = await db.subscriptions.get(inst.subscription_id);
    const pkg = sub ? await db.packages.get(sub.package_id) : null;
    recoveryList.push({
      installment: inst,
      subscription: sub || {},
      package: pkg || {}
    });
  }

  return recoveryList;
}

// Export functions to global scope for Alpine.js & scripts
if (typeof window !== "undefined") {
  window.BharatYatraStore = {
    getDB,
    syncManifestDown,
    recordOfflinePayment,
    getPendingOutbox,
    markOutboxSynced,
    getCashInHandTotal,
    getDailyRecoveryList
  };
}
