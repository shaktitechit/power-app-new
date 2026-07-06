/**
 * Ensures soft-delete-aware partial unique indexes exist on utility tariffs
 * and billing records. Drops legacy non-partial indexes if present.
 *
 * Usage: npm run migrate:soft-delete-indexes
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../config/db.js";

dotenv.config();

const COLLECTIONS = [
  {
    name: "utilitytariffs",
    indexes: [
      {
        key: { utility_account_id: 1, effective_from: 1 },
        options: {
          unique: true,
          partialFilterExpression: { deleted_at: null },
          name: "utility_account_id_1_effective_from_1",
        },
      },
    ],
  },
  {
    name: "utilitybillingrecords",
    indexes: [
      {
        key: {
          utility_account_id: 1,
          billing_period_start: 1,
          billing_period_end: 1,
        },
        options: {
          unique: true,
          partialFilterExpression: { deleted_at: null },
          name:
            "utility_account_id_1_billing_period_start_1_billing_period_end_1",
        },
      },
    ],
  },
];

async function migrateCollection(db, { name, indexes }) {
  const collection = db.collection(name);

  for (const target of indexes) {
    const targetName = target.options.name;
    let existing = await collection.indexes();

    const legacy = existing.find(
      (index) => index.name === targetName && !index.partialFilterExpression,
    );

    if (legacy) {
      console.log(`Dropping legacy index ${name}.${targetName}`);
      await collection.dropIndex(targetName);
      existing = await collection.indexes();
    }

    const hasPartial = existing.some(
      (index) =>
        index.name === targetName &&
        index.partialFilterExpression?.deleted_at === null,
    );

    if (!hasPartial) {
      console.log(`Creating partial unique index ${name}.${targetName}`);
      await collection.createIndex(target.key, target.options);
    } else {
      console.log(`Partial index already present ${name}.${targetName}`);
    }
  }
}

async function main() {
  await connectDB();
  const db = mongoose.connection.db;

  for (const collection of COLLECTIONS) {
    await migrateCollection(db, collection);
  }

  console.log("Soft-delete unique index migration complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
