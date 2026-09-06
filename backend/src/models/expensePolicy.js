import mongoose from "mongoose";

/**
 * ExpensePolicy defines configurable approval thresholds.
 * Default policy: manager approves <= 2000, admin <= 10000, super_admin > 10000.
 * Admins can customize these thresholds via the Expense Manager settings.
 */
const expensePolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    /**
     * Ordered rules — evaluated from lowest to highest maxAmount.
     * The first rule whose maxAmount >= expense.amount is used.
     * If no rule matches, the last rule's approvalLevel is used.
     */
    rules: [
      {
        /** Maximum amount (inclusive) for this rule. null = no upper limit. */
        maxAmount: {
          type: Number,
          default: null,
        },
        approverRole: {
          type: String,
          enum: ["manager", "admin", "super_admin"],
          required: true,
        },
        approvalLevel: {
          type: Number,
          required: true,
          min: 1,
        },
        label: {
          type: String,
          trim: true,
          default: "",
        },
      },
    ],

    /** True = applies to all users unless overridden */
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

const ExpensePolicy = mongoose.model("ExpensePolicy", expensePolicySchema);

export default ExpensePolicy;
