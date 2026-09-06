import mongoose from "mongoose";
import { softDeletePlugin } from "./plugins/softDelete.js";

const WORK_PLAN_STATUS = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "active",
  "completed",
  "cancelled",
];

const PERIOD_TYPES = ["daily", "weekly", "monthly", "quarterly", "custom"];
const PLAN_TYPES = ["visits", "work_from_office", "work_from_home", "leave"];

const visitSchema = new mongoose.Schema(
  {
    facility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      default: null,
    },
    facilityName: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    clientName: { type: String, trim: true, default: "" },
    clientContactNumber: { type: String, trim: true, default: "" },
    clientEmail: { type: String, trim: true, default: "" },
    purpose: { type: String, trim: true, default: "" },
    expectedOutcome: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "cancelled"],
      default: "scheduled",
    },
    checkInTime: { type: Date, default: null },
    checkOutTime: { type: Date, default: null },
    notes: { type: String, trim: true, default: "" },
  },
  { _id: true, timestamps: true }
);

const workItemSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: "" },
    category: { type: String, trim: true, default: "general" },
    estimatedHours: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
    },
    notes: { type: String, trim: true, default: "" },
  },
  { _id: true, timestamps: true }
);

const workPlanSchema = new mongoose.Schema(
  {
    /** The user this plan belongs to (may differ from created_by when manager plans for auditor) */
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /** Who created the plan */
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    /** Plan type for daily work plan */
    planType: {
      type: String,
      enum: PLAN_TYPES,
      default: "work_from_office",
      required: true,
      index: true,
    },

    /** Plan date for daily work plan */
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },

    /** Legacy / alias plan date for backward compatibility with database indexes */
    plan_date: {
      type: Date,
      default: Date.now,
      index: true,
    },

    /** Reason if planType is leave */
    leaveReason: {
      type: String,
      trim: true,
      default: "",
    },

    /** Visits inside plan if planType is visits */
    visits: [visitSchema],

    /** Works inside plan if planType is work_from_office or work_from_home */
    works: [workItemSchema],

    period: {
      type: {
        type: String,
        enum: PERIOD_TYPES,
        default: "daily",
      },
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
    },

    status: {
      type: String,
      enum: WORK_PLAN_STATUS,
      default: "draft",
      index: true,
    },

    approval: {
      requiredFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      approvedAt: {
        type: Date,
        default: null,
      },
      rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      rejectedAt: {
        type: Date,
        default: null,
      },
      rejectionReason: {
        type: String,
        trim: true,
        default: null,
      },
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

workPlanSchema.plugin(softDeletePlugin);
workPlanSchema.index({ owner: 1, status: 1 });
workPlanSchema.index({ created_by: 1 });
workPlanSchema.index({ "period.startDate": 1, "period.endDate": 1 });

const WorkPlan = mongoose.model("WorkPlan", workPlanSchema);

// Safely drop legacy unique index to prevent E11000 duplicate key error on plan_date
WorkPlan.collection.dropIndex("owner_1_plan_date_1").catch(() => {});

export default WorkPlan;
