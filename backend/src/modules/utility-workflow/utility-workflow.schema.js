import mongoose from "mongoose";
import { buildDefaultDataSheet } from "./utility-workflow.defaults.js";

export const auditSectionStatusSchema = new mongoose.Schema(
  {
    connected: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    completed_at: { type: Date, default: null },
    completed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { _id: false },
);

export const connectedAuditSectionSchema = new mongoose.Schema(
  {
    connected: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    completed_at: { type: Date, default: null },
    completed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { _id: false },
);

export const utilityAccountDataSheetSchema = new mongoose.Schema(
  {
    solar: { type: connectedAuditSectionSchema, default: () => ({}) },
    dg: { type: connectedAuditSectionSchema, default: () => ({}) },
    transformer: { type: connectedAuditSectionSchema, default: () => ({}) },
    pump: { type: connectedAuditSectionSchema, default: () => ({}) },
    tariff: { type: auditSectionStatusSchema, default: () => ({}) },
    billing: { type: auditSectionStatusSchema, default: () => ({}) },
    hvac: { type: auditSectionStatusSchema, default: () => ({}) },
    ac: { type: auditSectionStatusSchema, default: () => ({}) },
    lighting: { type: auditSectionStatusSchema, default: () => ({}) },
    "street-light": { type: auditSectionStatusSchema, default: () => ({}) },
    fan: { type: auditSectionStatusSchema, default: () => ({}) },
    lux: { type: auditSectionStatusSchema, default: () => ({}) },
    ups: { type: auditSectionStatusSchema, default: () => ({}) },
    misc: { type: auditSectionStatusSchema, default: () => ({}) },
    transformers: { type: auditSectionStatusSchema, default: () => ({}) },
    "metering-room": { type: auditSectionStatusSchema, default: () => ({}) },
    "panel-room": { type: auditSectionStatusSchema, default: () => ({}) },
    "light-db": { type: auditSectionStatusSchema, default: () => ({}) },
    "dg-set": { type: auditSectionStatusSchema, default: () => ({}) },
    "earthing-system": { type: auditSectionStatusSchema, default: () => ({}) },
    "ups-battery": { type: auditSectionStatusSchema, default: () => ({}) },
    "general-safety": { type: auditSectionStatusSchema, default: () => ({}) },
    "wiring-inspection": { type: auditSectionStatusSchema, default: () => ({}) },
    "load-analysis": { type: auditSectionStatusSchema, default: () => ({}) },
    "leak-inspection": { type: auditSectionStatusSchema, default: () => ({}) },
    thermography: { type: auditSectionStatusSchema, default: () => ({}) },
    "elevator-safety": { type: auditSectionStatusSchema, default: () => ({}) },
    "pac-ventilation": { type: auditSectionStatusSchema, default: () => ({}) },
    "pump-compressor": { type: auditSectionStatusSchema, default: () => ({}) },
    "additional-items": { type: auditSectionStatusSchema, default: () => ({}) },
    "documents-review": { type: auditSectionStatusSchema, default: () => ({}) },
  },
  { _id: false },
);

/** Mongoose path definitions for UtilityAccount workflow fields */
export const utilityAccountWorkflowFields = {
  accountStatus: {
    type: String,
    enum: ["pending", "completed"],
    default: "pending",
  },
  account_completed_at: { type: Date, default: null },
  account_completed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  dataSheet: {
    type: utilityAccountDataSheetSchema,
    default: () => buildDefaultDataSheet(),
  },
  /**
   * @deprecated Safety-audit steps only. Energy audit uses `dataSheet` + `accountStatus`.
   */
  audit_step_submissions: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
};
