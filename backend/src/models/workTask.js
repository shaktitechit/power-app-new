import mongoose from "mongoose";
import { softDeletePlugin } from "./plugins/softDelete.js";

const WORK_TASK_STATUS = [
  "draft",
  "assigned",
  "in_progress",
  "completed",
  "overdue",
  "cancelled",
];

const TASK_PRIORITY = ["low", "medium", "high", "critical"];

const TASK_TYPES = [
  "site_visit",
  "data_collection",
  "analysis",
  "report_preparation",
  "client_meeting",
  "audit_execution",
  "review",
  "other",
];

const workTaskSchema = new mongoose.Schema(
  {
    workPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkPlan",
      default: null,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    taskType: {
      type: String,
      enum: TASK_TYPES,
      default: "other",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /** Optional link to a facility for traceability */
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      default: null,
      index: true,
    },

    priority: {
      type: String,
      enum: TASK_PRIORITY,
      default: "medium",
    },

    startDate: {
      type: Date,
      default: null,
    },

    dueDate: {
      type: Date,
      default: null,
      index: true,
    },

    estimatedMinutes: {
      type: Number,
      default: null,
      min: 0,
    },

    status: {
      type: String,
      enum: WORK_TASK_STATUS,
      default: "draft",
      index: true,
    },

    completion: {
      completedAt: {
        type: Date,
        default: null,
      },
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      remarks: {
        type: String,
        trim: true,
        default: null,
      },
      actualMinutes: {
        type: Number,
        default: null,
        min: 0,
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

workTaskSchema.plugin(softDeletePlugin);
workTaskSchema.index({ assignedTo: 1, status: 1 });
workTaskSchema.index({ assignedBy: 1 });
workTaskSchema.index({ dueDate: 1, status: 1 });

const WorkTask = mongoose.model("WorkTask", workTaskSchema);

export default WorkTask;
