migrate((db) => {
  const dao = new Dao(db);

  // 1. Extend Users Collection
  const users = dao.findCollectionByNameOrId("users");
  
  users.schema.addField(new SchemaField({
    name: "role",
    type: "select",
    required: true,
    options: {
      values: ["admin", "distributor", "agent"],
      maxSelect: 1
    }
  }));

  users.schema.addField(new SchemaField({
    name: "phone",
    type: "text",
    required: true,
    options: {
      min: 10,
      max: 15,
      pattern: "^[0-9+ ]{10,15}$"
    }
  }));

  users.schema.addField(new SchemaField({
    name: "distributor_id",
    type: "relation",
    required: false,
    options: {
      collectionId: users.id,
      cascadeDelete: false,
      maxSelect: 1
    }
  }));

  users.schema.addField(new SchemaField({
    name: "commission_percentage",
    type: "number",
    required: false,
    options: {
      min: 0,
      max: 100
    }
  }));

  users.schema.addField(new SchemaField({
    name: "is_active",
    type: "bool",
    required: false
  }));

  users.indexes = [
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users (phone) WHERE phone != ''"
  ];

  dao.saveCollection(users);

  // 2. Create Packages Collection
  const packages = new Collection({
    name: "packages",
    type: "base",
    schema: [
      {
        name: "title",
        type: "text",
        required: true,
        options: { min: 3, max: 200 }
      },
      {
        name: "destination",
        type: "text",
        required: true,
        options: { min: 2, max: 100 }
      },
      {
        name: "duration_days",
        type: "number",
        required: true,
        options: { min: 1, max: 60 }
      },
      {
        name: "total_price",
        type: "number",
        required: true,
        options: { min: 1 }
      },
      {
        name: "allowed_tenures",
        type: "json",
        required: true,
        options: {
          maxSize: 1048576
        }
      },
      {
        name: "min_emis_to_travel",
        type: "number",
        required: true,
        options: { min: 1, max: 12 }
      },
      {
        name: "cover_image",
        type: "file",
        required: false,
        options: {
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ["image/jpeg", "image/png", "image/webp"]
        }
      },
      {
        name: "itinerary",
        type: "editor",
        required: false
      },
      {
        name: "is_active",
        type: "bool",
        required: false
      }
    ],
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_packages_active ON packages (is_active)"
    ]
  });
  dao.saveCollection(packages);

  // 3. Create Subscriptions Collection
  const subscriptions = new Collection({
    name: "subscriptions",
    type: "base",
    schema: [
      {
        name: "booking_code",
        type: "text",
        required: true,
        options: { min: 4, max: 50 }
      },
      {
        name: "customer_name",
        type: "text",
        required: true,
        options: { min: 2, max: 150 }
      },
      {
        name: "customer_phone",
        type: "text",
        required: true,
        options: { min: 10, max: 15 }
      },
      {
        name: "customer_address",
        type: "text",
        required: false,
        options: { max: 500 }
      },
      {
        name: "package_id",
        type: "relation",
        required: true,
        options: {
          collectionId: packages.id,
          cascadeDelete: false,
          maxSelect: 1
        }
      },
      {
        name: "agent_id",
        type: "relation",
        required: true,
        options: {
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1
        }
      },
      {
        name: "distributor_id",
        type: "relation",
        required: true,
        options: {
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1
        }
      },
      {
        name: "tenure_months",
        type: "number",
        required: true,
        options: { min: 1, max: 24 }
      },
      {
        name: "total_amount",
        type: "number",
        required: true,
        options: { min: 0 }
      },
      {
        name: "monthly_emi_amount",
        type: "number",
        required: true,
        options: { min: 0 }
      },
      {
        name: "paid_emis_count",
        type: "number",
        required: false,
        options: { min: 0 }
      },
      {
        name: "travel_status",
        type: "select",
        required: true,
        options: {
          values: ["locked", "eligible", "scheduled", "completed"],
          maxSelect: 1
        }
      },
      {
        name: "booking_date",
        type: "date",
        required: true
      }
    ],
    indexes: [
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_booking_code ON subscriptions (booking_code)",
      "CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_phone ON subscriptions (customer_phone)",
      "CREATE INDEX IF NOT EXISTS idx_subscriptions_agent ON subscriptions (agent_id)",
      "CREATE INDEX IF NOT EXISTS idx_subscriptions_distributor ON subscriptions (distributor_id)"
    ]
  });
  dao.saveCollection(subscriptions);

  // 4. Create Installments Collection
  const installments = new Collection({
    name: "installments",
    type: "base",
    schema: [
      {
        name: "subscription_id",
        type: "relation",
        required: true,
        options: {
          collectionId: subscriptions.id,
          cascadeDelete: true,
          maxSelect: 1
        }
      },
      {
        name: "installment_no",
        type: "number",
        required: true,
        options: { min: 1, max: 24 }
      },
      {
        name: "due_date",
        type: "date",
        required: true
      },
      {
        name: "amount",
        type: "number",
        required: true,
        options: { min: 0 }
      },
      {
        name: "status",
        type: "select",
        required: true,
        options: {
          values: ["pending", "paid", "overdue"],
          maxSelect: 1
        }
      },
      {
        name: "paid_at",
        type: "date",
        required: false
      },
      {
        name: "collected_by",
        type: "relation",
        required: false,
        options: {
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1
        }
      },
      {
        name: "payment_mode",
        type: "select",
        required: false,
        options: {
          values: ["cash", "upi"],
          maxSelect: 1
        }
      },
      {
        name: "handover_status",
        type: "select",
        required: true,
        options: {
          values: ["agent_custody", "distributor_confirmed"],
          maxSelect: 1
        }
      },
      {
        name: "receipt_slip_id",
        type: "text",
        required: false
      },
      {
        name: "idempotency_key",
        type: "text",
        required: false
      }
    ],
    indexes: [
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_installments_receipt ON installments (receipt_slip_id) WHERE receipt_slip_id != ''",
      "CREATE INDEX IF NOT EXISTS idx_installments_idempotency ON installments (idempotency_key) WHERE idempotency_key != ''",
      "CREATE INDEX IF NOT EXISTS idx_installments_sub_status ON installments (subscription_id, status)"
    ]
  });
  dao.saveCollection(installments);

  // 5. Create Cash Handovers Collection
  const cashHandovers = new Collection({
    name: "cash_handovers",
    type: "base",
    schema: [
      {
        name: "agent_id",
        type: "relation",
        required: true,
        options: {
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1
        }
      },
      {
        name: "distributor_id",
        type: "relation",
        required: true,
        options: {
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1
        }
      },
      {
        name: "total_amount",
        type: "number",
        required: true,
        options: { min: 0 }
      },
      {
        name: "installments_covered",
        type: "relation",
        required: true,
        options: {
          collectionId: installments.id,
          cascadeDelete: false,
          maxSelect: null
        }
      },
      {
        name: "otp_code",
        type: "text",
        required: true,
        options: { min: 4, max: 4, pattern: "^[0-9]{4}$" }
      },
      {
        name: "status",
        type: "select",
        required: true,
        options: {
          values: ["initiated", "verified", "rejected"],
          maxSelect: 1
        }
      },
      {
        name: "verified_at",
        type: "date",
        required: false
      }
    ],
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_handovers_agent ON cash_handovers (agent_id)",
      "CREATE INDEX IF NOT EXISTS idx_handovers_distributor ON cash_handovers (distributor_id)",
      "CREATE INDEX IF NOT EXISTS idx_handovers_status ON cash_handovers (status)"
    ]
  });
  dao.saveCollection(cashHandovers);

  console.log("Successfully created all 5 BharatYatra collections!");
}, (db) => {
  const dao = new Dao(db);
  const tables = ["cash_handovers", "installments", "subscriptions", "packages"];
  for (const name of tables) {
    try {
      const col = dao.findCollectionByNameOrId(name);
      if (col) dao.deleteCollection(col);
    } catch (e) {}
  }
});
