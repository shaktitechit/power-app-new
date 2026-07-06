import documentSchema from "../document.js";
﻿import mongoose from "mongoose";

import { softDeletePlugin } from "../plugins/softDelete.js";
import { registerAuditWorkflowHooks } from "../../modules/utility-workflow/utilityWorkflowHook.js";

const luxMeasurementSchema = new mongoose.Schema(
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

    room_type: {
      type: String,
      enum: [
        "office",
        "corridor",
        "warehouse",
        "hospital",
        "classroom",
        "outdoor",
        "other",
      ],
    },

    required_lux: {
      type: Number,
      min: 0,
    },

    measured_lux_point_1: {
      type: Number,
      min: 0,
    },

    measured_lux_point_2: {
      type: Number,
      min: 0,
    },

    measured_lux_point_3: {
      type: Number,
      min: 0,
    },

    average_lux: {
      type: Number,
      min: 0,
    },

    compliance: {
      type: Boolean,
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

    // 📂 Documents (lux meter photos, readings proof, reports)
    documents: [documentSchema],
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

luxMeasurementSchema.index({ utility_account_id: 1, facility_id: 1 });
luxMeasurementSchema.index({ facility_id: 1 });
luxMeasurementSchema.plugin(softDeletePlugin);
registerAuditWorkflowHooks(luxMeasurementSchema, { sheetKey: "lux" });

// 🔍 Indexes
luxMeasurementSchema.index({ utility_account_id: 1 });
luxMeasurementSchema.index({ created_at: -1 });

const LuxMeasurement = mongoose.model("LuxMeasurement", luxMeasurementSchema);

export default LuxMeasurement;
