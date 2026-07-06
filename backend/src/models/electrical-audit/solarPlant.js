import documentSchema from "../document.js";
import mongoose from "mongoose";

import { softDeletePlugin } from "../plugins/softDelete.js";
import { registerAuditWorkflowHooks } from "../../modules/utility-workflow/utilityWorkflowHook.js";

const solarPlantSchema = new mongoose.Schema(
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

    plant_name: {
      type: String,
      trim: true,
    },

    rating_kWp: {
      type: Number,
      min: 0,
    },

    panel_rating_watt: {
      type: Number,
      min: 0,
    },

    no_of_panels: {
      type: Number,
      min: 0,
    },

    inverter_make: {
      type: String,
      trim: true,
    },

    inverter_rating_kW: {
      type: Number,
      min: 0,
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

    // 📂 Documents (Plant layout, invoices, images, reports)
    documents: [documentSchema],
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

solarPlantSchema.plugin(softDeletePlugin);
registerAuditWorkflowHooks(solarPlantSchema, { sheetKey: "solar", hasCompletenessField: false });

// 🔍 Indexes
solarPlantSchema.index({ facility_id: 1 });
solarPlantSchema.index({ utility_account_id: 1 });

const SolarPlant = mongoose.model("SolarPlant", solarPlantSchema);

export default SolarPlant;
