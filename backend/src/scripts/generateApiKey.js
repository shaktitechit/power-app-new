import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { modelsRegistry } from "../data/modelRegistry.js";
import { generateApiKeyPair } from "../middlewares/apiKeyAuth.js";

async function run() {
  try {
    await connectDB();
    const { ApiKey } = modelsRegistry;

    // Parse args
    const args = process.argv.slice(2);
    let name = "Third-Party Integration";
    let scopes = ["enquiries:read", "facilities:read"];
    let description = "Generated via CLI script";

    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--name" && args[i + 1]) {
        name = args[i + 1];
        i++;
      } else if (args[i] === "--scopes" && args[i + 1]) {
        scopes = args[i + 1].split(",").map((s) => s.trim()).filter(Boolean);
        i++;
      } else if (args[i] === "--desc" && args[i + 1]) {
        description = args[i + 1];
        i++;
      }
    }

    const { rawKey, prefix, keyHash } = generateApiKeyPair();

    const apiKeyDoc = await ApiKey.create({
      name,
      prefix,
      key_hash: keyHash,
      scopes,
      status: "active",
      description,
    });

    console.log("\n=======================================================");
    console.log("  ✅ NEW API KEY GENERATED SUCCESSFULLY");
    console.log("=======================================================");
    console.log(`  Name:        ${apiKeyDoc.name}`);
    console.log(`  Prefix:      ${apiKeyDoc.prefix}`);
    console.log(`  API Key:     ${rawKey}`);
    console.log(`  Scopes:      ${apiKeyDoc.scopes.join(", ")}`);
    console.log(`  Status:      ${apiKeyDoc.status}`);
    console.log(`  Created At:  ${apiKeyDoc.created_at}`);
    console.log("=======================================================");
    console.log("  ⚠️  IMPORTANT: Copy the full API Key above now.");
    console.log("  You will not be able to retrieve the raw key again!");
    console.log("=======================================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error generating API key:", error);
    process.exit(1);
  }
}

run();
