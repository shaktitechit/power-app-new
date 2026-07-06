import documentSchema from "./document.js";
import mongoose from "mongoose";
import { softDeletePlugin } from "./plugins/softDelete.js";
import {
  prepareUtilityAccountWorkflowForSave,
  utilityAccountWorkflowFields,
} from "../modules/utility-workflow/index.js";

const utilityAccountSchema = new mongoose.Schema(
  {
    facility_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
    },

    account_number: {
      type: String,
      required: true,
      trim: true,
    },

    connection_type: {
      type: String,
      enum: ["LT", "HT"],
      required: true,
    },

    category: {
      type: String,
      trim: true,
    },

    location: {
      type: String,
      trim: true,
    },

    sanctioned_demand_kVA: {
      type: Number,
      min: 0,
    },
    sanctioned_demand_value: {
      type: Number,
      min: 0,
    },
    sanctioned_demand_unit: {
      type: String,
      enum: ["kVA", "kW", "BHP"],
      default: "kVA",
    },
    is_transformer_maintained_by_facility: {
      type: Boolean,
      default: false,
    },

    provider: {
      type: String, // PSPCL, DHBVN, etc.
    },
    billing_cycle: {
      type: String, // monthly, bi-monthly
    },

    // 🔍 Audit metadata (recommended)
    audit_date: {
      type: Date,
      default: Date.now,
    },

    auditor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // 📂 Documents (Bills, Agreements, Images, etc.)
    documents: [documentSchema],

    ...utilityAccountWorkflowFields,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

utilityAccountSchema.pre("save", function () {
  prepareUtilityAccountWorkflowForSave(this);
});

utilityAccountSchema.plugin(softDeletePlugin);

// 🔒 Prevent duplicate account per facility (among non-deleted rows)
utilityAccountSchema.index(
  { facility_id: 1, account_number: 1 },
  { unique: true, partialFilterExpression: { deleted_at: null } },
);

// 🔍 Indexes
utilityAccountSchema.index({ facility_id: 1 });

const UtilityAccount = mongoose.model("UtilityAccount", utilityAccountSchema);

export default UtilityAccount;
