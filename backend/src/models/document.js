import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    fileUrl: { type: String },
    fileType: {
      type: String,
      enum: ["image", "pdf"],
    },
    fileName: { type: String },
    caption: { type: String, default: "" },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

export default documentSchema;
