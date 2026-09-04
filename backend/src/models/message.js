import mongoose from "mongoose";

import { softDeletePlugin } from "./plugins/softDelete.js";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    body: {
      type: String,
      required: true,
      trim: true,
    },

    subject: {
      type: String,
      trim: true,
      default: "",
    },

    channel: {
      type: String,
      enum: ["internal", "graph"],
      default: "internal",
      index: true,
    },

    direction: {
      type: String,
      enum: ["outbound", "inbound"],
      default: "outbound",
    },

    sender_email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    recipient_email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    graph_message_id: {
      type: String,
      default: null,
    },

    graph_conversation_id: {
      type: String,
      default: null,
    },

    graph_status: {
      type: String,
      enum: ["pending", "sent", "failed", "received", null],
      default: null,
    },

    graph_error: {
      type: String,
      default: null,
    },

    conversation_key: {
      type: String,
      required: true,
      index: true,
    },

    reference_type: {
      type: String,
      enum: ["enquiry", "facility", "utility", "system", null],
      default: null,
    },

    reference_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    is_read: {
      type: Boolean,
      default: false,
      index: true,
    },

    read_at: {
      type: Date,
      default: null,
    },

    hidden_for: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

messageSchema.index({ conversation_key: 1, created_at: -1 });
messageSchema.index({ recipient: 1, is_read: 1, created_at: -1 });
messageSchema.index({ sender: 1, created_at: -1 });
messageSchema.index(
  { graph_message_id: 1 },
  { unique: true, sparse: true },
);

messageSchema.plugin(softDeletePlugin);

export default mongoose.model("Message", messageSchema);
