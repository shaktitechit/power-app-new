import mongoose from "mongoose";
import { softDeletePlugin } from "./plugins/softDelete.js";

export const API_KEY_SCOPES = [
  "enquiries:read",
  "enquiries:write",
  "facilities:read",
  "facilities:write",
  "all:read",
  "*",
];

const apiKeySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    prefix: {
      type: String,
      required: true,
      trim: true,
    },
    key_hash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    scopes: {
      type: [String],
      enum: API_KEY_SCOPES,
      default: ["enquiries:read", "facilities:read"],
    },
    status: {
      type: String,
      enum: ["active", "revoked", "inactive"],
      default: "active",
      index: true,
    },
    expires_at: {
      type: Date,
      default: null,
    },
    last_used_at: {
      type: Date,
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

apiKeySchema.plugin(softDeletePlugin);

apiKeySchema.index({ status: 1, deleted_at: 1 });

const ApiKey = mongoose.model("ApiKey", apiKeySchema);

export default ApiKey;
