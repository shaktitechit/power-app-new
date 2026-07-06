import documentSchema from "../document.js";
import mongoose from "mongoose";

import { softDeletePlugin } from "../plugins/softDelete.js";
import { registerAuditWorkflowHooks } from "../../modules/utility-workflow/utilityWorkflowHook.js";

const upsAuditSchema = new mongoose.Schema(
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

    // 1. NAMEPLATE & IDENTIFICATION
    ups_tag_asset_id: { type: String, trim: true },
    make_model: { type: String, trim: true },
    year_of_manufacture_installation: { type: String, trim: true },
    technology_type: { type: String, trim: true },
    input_phases: {
      type: String,
      enum: ["1-Phase", "3-Phase"],
    },
    output_phases: {
      type: String,
      enum: ["1-Phase", "3-Phase"],
    },
    rated_capacity_kVA: { type: Number, min: 0 },
    rated_output_power_kW: { type: Number, min: 0 },
    rated_input_voltage_LL: { type: Number, min: 0 },
    rated_input_current_A: { type: Number, min: 0 },
    rated_output_voltage_LL: { type: Number, min: 0 },
    rated_input_frequency_Hz: { type: Number, min: 0 },
    rated_output_power_factor: { type: Number, min: -1, max: 1 },
    standard_compliance: { type: String, trim: true },
    bee_star_rating: { type: Number, min: 0, max: 5 },

    // 2. ELECTRICAL MEASUREMENTS — INPUT SIDE
    input_voltage_R: { type: Number, min: 0 },
    input_voltage_Y: { type: Number, min: 0 },
    input_voltage_B: { type: Number, min: 0 },
    input_current_R: { type: Number, min: 0 },
    input_current_Y: { type: Number, min: 0 },
    input_current_B: { type: Number, min: 0 },
    input_active_power_kW: { type: Number, min: 0 },
    input_apparent_power_kVA: { type: Number, min: 0 },
    input_reactive_power_kVAR: { type: Number },
    input_power_factor: { type: Number, min: -1, max: 1 },
    input_frequency_Hz: { type: Number, min: 0 },
    input_voltage_thd_R: { type: Number, min: 0 },
    input_voltage_thd_Y: { type: Number, min: 0 },
    input_voltage_thd_B: { type: Number, min: 0 },
    input_current_thd_R: { type: Number, min: 0 },
    input_current_thd_Y: { type: Number, min: 0 },
    input_current_thd_B: { type: Number, min: 0 },

    // 3. ELECTRICAL MEASUREMENTS — OUTPUT SIDE
    output_voltage_R: { type: Number, min: 0 },
    output_voltage_Y: { type: Number, min: 0 },
    output_voltage_B: { type: Number, min: 0 },
    output_current_R: { type: Number, min: 0 },
    output_current_Y: { type: Number, min: 0 },
    output_current_B: { type: Number, min: 0 },
    output_active_power_kW: { type: Number, min: 0 },
    output_apparent_power_kVA: { type: Number, min: 0 },
    output_power_factor: { type: Number, min: -1, max: 1 },
    output_frequency_Hz: { type: Number, min: 0 },
    output_voltage_thd_R: { type: Number, min: 0 },
    output_voltage_thd_Y: { type: Number, min: 0 },
    output_voltage_thd_B: { type: Number, min: 0 },

    // 4. LOADING & ENERGY CONSUMPTION
    loading_kVA_percent: { type: Number, min: 0 },
    loading_kW_percent: { type: Number, min: 0 },
    working_hours_per_day: { type: Number, min: 0, max: 24 },
    working_days_per_year: { type: Number, min: 0, max: 365 },
    load_factor: { type: Number, min: 0, max: 1 },
    annual_input_energy_kWh: { type: Number, min: 0 },
    annual_output_energy_kWh: { type: Number, min: 0 },
    annual_energy_loss_kWh: { type: Number },
    annual_co2_emission_t: { type: Number, min: 0 },

    // 5. EFFICIENCY BENCHMARKING
    measured_efficiency_percent: { type: Number, min: 0, max: 100 },
    nameplate_efficiency_100_percent: { type: Number, min: 0, max: 100 },
    nameplate_efficiency_75_percent: { type: Number, min: 0, max: 100 },
    nameplate_efficiency_50_percent: { type: Number, min: 0, max: 100 },
    nameplate_efficiency_25_percent: { type: Number, min: 0, max: 100 },
    efficiency_deviation_percentage_points: { type: Number },
    measured_losses_kW: { type: Number },

    // 6. BATTERY SYSTEM
    battery_type: { type: String, trim: true },
    battery_strings_count: { type: Number, min: 0 },
    battery_cells_per_string: { type: Number, min: 0 },
    rated_battery_bank_voltage_V: { type: Number, min: 0 },
    rated_ah_capacity: { type: Number, min: 0 },
    float_charge_voltage_V: { type: Number, min: 0 },
    float_charge_current_A: { type: Number, min: 0 },
    float_charge_power_W: { type: Number, min: 0 },
    cell_voltage_min: { type: Number, min: 0 },
    cell_voltage_max: { type: Number, min: 0 },
    cell_voltage_mean: { type: Number, min: 0 },
    cell_voltage_imbalance_V: { type: Number, min: 0 },
    battery_internal_resistance_mOhm: { type: Number, min: 0 },
    battery_temp_ambient: { type: Number },
    battery_temp_hottest_cell: { type: Number },
    actual_backup_time_min: { type: Number, min: 0 },
    rated_backup_time_full_load_min: { type: Number, min: 0 },
    battery_age_years: { type: String, trim: true },
    battery_health_assessment: { type: String, trim: true },

    // 7. THERMAL & OPERATIONAL DATA
    ups_room_temp_C: { type: Number },
    ups_room_humidity_percent: { type: Number, min: 0, max: 100 },
    ups_surface_temp_front_C: { type: Number },
    ups_surface_temp_rear_C: { type: Number },
    hotspot_temperature_C: { type: Number },
    hotspot_location: { type: String, trim: true },
    cooling_fan_status: { type: String, trim: true },
    operational_mode: { type: String, trim: true },
    transfer_time_ms: { type: Number, min: 0 },
    operating_hours_total: { type: Number, min: 0 },
    last_preventive_maintenance_date: { type: String, trim: true },
    snmp_card_installed: { type: Boolean, default: false },
    bypass_trips_12m: { type: Number, min: 0 },
    input_submeter_installed: { type: Boolean, default: false },

    // Standard/Remarks
    remarks: { type: String, trim: true },
    audit_date: { type: Date, default: Date.now },
    auditor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    documents: [documentSchema],
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

upsAuditSchema.index({ utility_account_id: 1, facility_id: 1 });
upsAuditSchema.index({ facility_id: 1 });
upsAuditSchema.plugin(softDeletePlugin);
registerAuditWorkflowHooks(upsAuditSchema, { sheetKey: "ups" });

// 🔍 Indexes
upsAuditSchema.index({ utility_account_id: 1 });
upsAuditSchema.index({ created_at: -1 });

const UPSAudit = mongoose.model("UPSAudit", upsAuditSchema);

export default UPSAudit;
