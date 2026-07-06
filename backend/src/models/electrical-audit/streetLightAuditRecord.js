import documentSchema from "../document.js";
import mongoose from "mongoose";

import { softDeletePlugin } from "../plugins/softDelete.js";
import { registerAuditWorkflowHooks } from "../../modules/utility-workflow/utilityWorkflowHook.js";

const streetLightAuditRecordSchema = new mongoose.Schema(
  {
    facility_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
    },
    utility_account_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UtilityAccount",
      required: true,
    },

    area_location: {
      type: String,
      trim: true,
    },

    fixture_type: {
      type: String,
      trim: true,
    },

    lamp_type: {
      type: String,
      trim: true,
    },

    wattage_W: {
      type: Number,
      min: 0,
    },

    quantity_nos: {
      type: Number,
      min: 0,
    },

    control_type: {
      type: String,
      enum: ["manual", "timer", "sensor", "other"],
    },

    working_hours_per_day: {
      type: Number,
      min: 0,
      max: 24,
    },

    working_days_per_year: {
      type: Number,
      min: 0,
      max: 365,
    },

    connected_load_kW: {
      type: Number,
      min: 0,
    },

    annual_energy_kWh: {
      type: Number,
      min: 0,
    },

    remarks: {
      type: String,
      trim: true,
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

    // 📂 Documents (fixture photos, audit sheets, reports)
    documents: [documentSchema],
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

streetLightAuditRecordSchema.index({ utility_account_id: 1, facility_id: 1 });
streetLightAuditRecordSchema.index({ facility_id: 1 });
streetLightAuditRecordSchema.plugin(softDeletePlugin);
registerAuditWorkflowHooks(streetLightAuditRecordSchema, { sheetKey: "street-light" });

// 🔍 Indexes
streetLightAuditRecordSchema.index({ utility_account_id: 1 });
streetLightAuditRecordSchema.index({ created_at: -1 });

const StreetLightAuditRecord = mongoose.model(
  "StreetLightAuditRecord",
  streetLightAuditRecordSchema,
);

export default StreetLightAuditRecord;
