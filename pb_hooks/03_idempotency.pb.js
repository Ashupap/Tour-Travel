// pb_hooks/03_idempotency.pb.js
// Reject duplicate sync entries if idempotency_key exists (HOOK-03)

onModelBeforeCreate((e) => {
  const key = e.model.getString("idempotency_key");
  if (!key || key.trim() === "") {
    return;
  }

  try {
    const existing = $app.dao().findFirstRecordByData("installments", "idempotency_key", key);
    if (existing && existing.id !== e.model.id) {
      throw new BadRequestError(`Duplicate idempotency_key detected: ${key}`);
    }
  } catch (err) {
    if (err.message && err.message.includes("Duplicate idempotency_key")) {
      throw err;
    }
  }
}, "installments");

onModelBeforeUpdate((e) => {
  const key = e.model.getString("idempotency_key");
  if (!key || key.trim() === "") {
    return;
  }

  try {
    const existing = $app.dao().findFirstRecordByData("installments", "idempotency_key", key);
    if (existing && existing.id !== e.model.id) {
      throw new BadRequestError(`Duplicate idempotency_key detected: ${key}`);
    }
  } catch (err) {
    if (err.message && err.message.includes("Duplicate idempotency_key")) {
      throw err;
    }
  }
}, "installments");
