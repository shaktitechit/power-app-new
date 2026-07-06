import mongoose from "mongoose";
import safetyAuditDocumentSchema from "./safetyAuditDocuments.js";

const safetyAuditChecklistItemSchema = new mongoose.Schema(
  {
    sr_no: Number,

    activity_description: {
      type: String,
      required: true,
      trim: true,
    },

    requirement: {
      type: String,
      trim: true,
    },

    compliance: {
      type: String,
      enum: ["yes", "no", "na", "partial", ""],
      default: "",
    },

    remarks: {
      type: String,
      trim: true,
    },

    recommendations: {
      type: String,
      trim: true,
    },

    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical", ""],
      default: "",
    },

    photos: [safetyAuditDocumentSchema],
  },
  { _id: false }
);

export default safetyAuditChecklistItemSchema;