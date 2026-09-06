import mongoose from "mongoose";
import { softDeletePlugin } from "./plugins/softDelete.js";

const EXPENSE_STATUS = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "reimbursed",
  "cancelled",
];

const EXPENSE_CATEGORIES = [
  "travel",
  "accommodation",
  "food",
  "communication",
  "client_entertainment",
  "marketing",
  "office",
  "office_supplies",
  "miscellaneous",
  "other",
];

const TRAVEL_SUBCATEGORIES = ["fuel", "cab", "train", "flight", "toll", "parking", "other_travel"];

const expenseSchema = new mongoose.Schema(
  {
    /** Employee who incurred the expense */
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /** Optional link to a work plan for traceability */
    workPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkPlan",
      default: null,
      index: true,
    },

    /** Optional link to a specific site visit */
    visitId: {
      type: String,
      default: null,
    },

    /** Optional link to a specific task */
    taskId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    /** Optional link to a facility for reporting */
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      default: null,
      index: true,
    },

    expenseDate: {
      type: Date,
      required: true,
      index: true,
    },

    category: {
      type: String,
      enum: EXPENSE_CATEGORIES,
      required: true,
    },

    subcategory: {
      type: String,
      trim: true,
      default: null,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    description: {
      type: String,
      trim: true,
      required: true,
    },

    receiptUrl: {
      type: String,
      default: null,
    },

    receiptFileId: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: EXPENSE_STATUS,
      default: "draft",
      index: true,
    },

    approval: {
      /** Determined by ExpensePolicy based on amount */
      requiredFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      approvalLevel: {
        type: mongoose.Schema.Types.Mixed,
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

    reimbursement: {
      status: {
        type: String,
        enum: ["pending", "processing", "completed"],
        default: "pending",
      },
      processedAt: {
        type: Date,
        default: null,
      },
      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      reference: {
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

expenseSchema.plugin(softDeletePlugin);
expenseSchema.index({ employeeId: 1, status: 1 });
expenseSchema.index({ employeeId: 1, expenseDate: -1 });
expenseSchema.index({ status: 1, "approval.requiredFrom": 1 });

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;
