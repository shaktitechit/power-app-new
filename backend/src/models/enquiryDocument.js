import documentSchema from "./document.js";
import mongoose from "mongoose";
import { softDeletePlugin } from "./plugins/softDelete.js";

const enquiryDocumentSchema = new mongoose.Schema(
  {
    enquiry_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
      required: true,
    },

    document_number: {
      type: String,
      trim: true,
    },

    document: {
      type: documentSchema,
      required: true,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

enquiryDocumentSchema.plugin(softDeletePlugin);

// Non-deleted rows only — allows reusing a number after soft-delete
enquiryDocumentSchema.index(
  { document_number: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deleted_at: null,
      document_number: { $exists: true, $nin: [null, ""] },
    },
  },
);

enquiryDocumentSchema.index({ enquiry_id: 1, createdAt: -1 });

export default mongoose.model("EnquiryDocument", enquiryDocumentSchema);
