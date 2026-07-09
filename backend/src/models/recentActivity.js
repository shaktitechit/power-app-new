import mongoose from "mongoose";

const recentActivitySchema = new mongoose.Schema(
  {
    actor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    actor_name: {
      type: String,
      trim: true,
    },

    actor_role: {
      type: String,
      trim: true,
    },

    action: {
      type: String,
      required: true,
      enum: [
        "created",
        "updated",
        "deleted",
        "assigned",
        "unassigned",
        "generated",
        "uploaded",
        "status_changed",
        "login",
        "logout",
      ],
      index: true,
    },

    entity_type: {
      type: String,
      required: true,
      enum: [
        "facility",
        "utility_account",
        "solar_plant",
        "dg_set",
        "transformer",
        "pump",
        "tariff",
        "billing_record",
        "hvac_audit",
        "ac_audit",
        "fan_audit",
        "lighting_audit",
        "lux_measurement",
        "misc_load",
        "report",
        "user",
        "document",
        "other",
        "enquiry",
        "follow_up",
        "enquiry_document",
        "utility_billing",
        "solar_generation",
        "transformer_audit",
        "pump_audit",
        "safety_transformer_audit",
        "safety_metering_room_audit",
        "safety_panel_room_audit",
        "safety_ldb_audit",
        "safety_dg_audit",
        "safety_earthing_audit",
        "safety_ups_audit",
        "safety_general_audit",
        "safety_wiring_audit",
        "safety_load_analysis_audit",
        "safety_leak_inspection_audit",
        "safety_thermography_audit",
        "safety_elevator_audit",
        "safety_pac_ventilation_audit",
        "safety_pump_compressor_audit",
        "safety_additional_items_audit",
        "safety_documents_audit",
        "street_light_audit",
        "ups_audit",
      ],
      index: true,
    },

    entity_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    entity_name: {
      type: String,
      trim: true,
    },

    facility_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      default: null,
      index: true,
    },

    utility_account_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UtilityAccount",
      default: null,
      index: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    created_by_system: {
      type: Boolean,
      default: false,
    },

    mode: {
      type: String,
      enum: ["onsite", "offsite", null],
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

recentActivitySchema.index({ createdAt: -1 });
recentActivitySchema.index({ facility_id: 1, createdAt: -1 });
recentActivitySchema.index({ utility_account_id: 1, createdAt: -1 });
recentActivitySchema.index({ entity_type: 1, entity_id: 1, createdAt: -1 });
recentActivitySchema.index({ mode: 1, createdAt: -1 });

const RecentActivity = mongoose.model("RecentActivity", recentActivitySchema);

export default RecentActivity;
