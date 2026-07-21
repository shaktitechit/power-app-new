import documentSchema from "../document.js";
﻿import mongoose from "mongoose";

import { softDeletePlugin } from "../plugins/softDelete.js";
import { registerAuditWorkflowHooks } from "../../modules/utility-workflow/utilityWorkflowHook.js";

const pumpAuditRecordSchema = new mongoose.Schema(
  {
    pump_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      required: true,
    },

    utility_account_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UtilityAccount",
      required: true,
    },
    facility_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
    },

    // 💧 Hydraulic Parameters
    suction_head_m: { type: Number, min: 0 },
    discharge_static_head_m: { type: Number, min: 0 },
    delivery_pipe_diameter_inches: { type: Number, min: 0 },
    pipe_friction_head_m: { type: Number, min: 0 },

    tank_or_sump_capacity: { type: Number, min: 0 },
    time_to_fill_tank_minutes: { type: Number, min: 0 },

    actual_flow_calculated_m3_per_hr: { type: Number, min: 0 },
    actual_flow_measured_m3_per_hr: { type: Number, min: 0 },
    actual_flow_m3_per_hr: { type: Number, min: 0 }, // fallback or alias for measured

    // ⚡ Electrical Parameters
    number_of_phases: { type: String, enum: ["1-Phase", "3-Phase"] },
    voltage_V: { type: Number, min: 0 },
    current_A: { type: Number, min: 0 },
    power_factor: { type: Number, min: 0, max: 1 },
    input_power_kW: { type: Number, min: 0 },

    operating_hours_per_day: { type: Number, min: 0 },
    operating_days_per_year: { type: Number, min: 0, max: 365 },
    daily_energy_consumption_kWh: { type: Number, min: 0 },

    // 📊 Performance
    total_dynamic_head_m: { type: Number, min: 0 },
    hydraulic_output_power_kW: { type: Number, min: 0 },
    input_power_to_pump_kW: { type: Number, min: 0 },
    pump_efficiency_percent: { type: Number, min: 0, max: 100 },
    overall_pump_set_efficiency_percent: {
      type: Number,
      min: 0,
      max: 100,
    },

    motor_loading_percent: { type: Number, min: 0, max: 100 },
    specific_energy_consumption_kWh_per_m3: { type: Number, min: 0 },

    annual_energy_consumption_kWh: { type: Number, min: 0 },

    // ⚙️ Operational Observations
    control_valve_throttling: { type: Boolean },
    vfd_installed: { type: Boolean },

    pump_condition: {
      type: String,
      enum: ["good", "moderate", "poor"],
    },

    leakages_observed: { type: Boolean },

    recommendations: {
      type: String,
      trim: true,
    },

    // 📂 Documents (test photos, readings, reports)
    documents: [documentSchema],

    // 🔍 Audit metadata (recommended)
    audit_date: {
      type: Date,
      default: Date.now,
    },

    auditor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

pumpAuditRecordSchema.plugin(softDeletePlugin);
registerAuditWorkflowHooks(pumpAuditRecordSchema, { sheetKey: "pump" });

// 🔍 Indexes
pumpAuditRecordSchema.index({ pump_id: 1 });
pumpAuditRecordSchema.index({ utility_account_id: 1 });
pumpAuditRecordSchema.index({ created_at: -1 });

pumpAuditRecordSchema.index({ utility_account_id: 1, facility_id: 1 });
pumpAuditRecordSchema.index({ facility_id: 1 });

const PumpAuditRecord = mongoose.model(
  "PumpAuditRecord",
  pumpAuditRecordSchema,
);

export default PumpAuditRecord;
