import mongoose from "mongoose";

import { softDeletePlugin } from "./plugins/softDelete.js";

const termsConditionsSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    lines: {
      type: [String],
      default: [],
    },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "terms_conditions",
  },
);

termsConditionsSchema.plugin(softDeletePlugin);

export default mongoose.model("TermsConditions", termsConditionsSchema);
