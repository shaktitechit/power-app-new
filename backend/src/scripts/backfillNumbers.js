import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { modelsRegistry } from "../data/modelRegistry.js";

async function backfill() {
  try {
    await connectDB();
    const { Facility, Enquiry } = modelsRegistry;

    console.log("Starting backfill for existing Enquiry records...");
    // Find all enquiries that do not have enquiry_number
    const enquiries = await Enquiry.find({
      $or: [
        { enquiry_number: { $exists: false } },
        { enquiry_number: null },
        { enquiry_number: "" }
      ]
    }).sort({ created_at: 1 });

    console.log(`Found ${enquiries.length} enquiries to process.`);

    for (const eq of enquiries) {
      const date = eq.created_at || new Date();
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}${mm}${dd}`;
      const prefix = `ENQ-SPL/${dateStr}/`;

      const latestEnquiry = await Enquiry.findOne({
        enquiry_number: new RegExp(`^ENQ-SPL\\/${dateStr}\\/`)
      }).sort({ enquiry_number: -1 }).exec();

      let nextSerial = 1;
      if (latestEnquiry && latestEnquiry.enquiry_number) {
        const parts = latestEnquiry.enquiry_number.split("/");
        const lastPart = parts[parts.length - 1];
        const parsedSerial = parseInt(lastPart, 10);
        if (!isNaN(parsedSerial)) {
          nextSerial = parsedSerial + 1;
        }
      }

      eq.enquiry_number = `${prefix}${String(nextSerial).padStart(3, "0")}`;
      await eq.save();
      console.log(`Updated Enquiry: "${eq.name}" -> Enquiry Number: ${eq.enquiry_number}`);
    }

    console.log("\nStarting backfill for existing Facility records...");
    // Find all facilities that do not have audit_number
    const facilities = await Facility.find({
      $or: [
        { audit_number: { $exists: false } },
        { audit_number: null },
        { audit_number: "" }
      ]
    }).sort({ start_date: 1, created_at: 1 });

    console.log(`Found ${facilities.length} facilities to process.`);

    for (const fac of facilities) {
      const date = fac.start_date || new Date();
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}${mm}${dd}`;
      const prefix = `SPL/${dateStr}/`;

      const latestFacility = await Facility.findOne({
        audit_number: new RegExp(`^SPL\\/${dateStr}\\/`)
      }).sort({ audit_number: -1 }).exec();

      let nextSerial = 1;
      if (latestFacility && latestFacility.audit_number) {
        const parts = latestFacility.audit_number.split("/");
        const lastPart = parts[parts.length - 1];
        const parsedSerial = parseInt(lastPart, 10);
        if (!isNaN(parsedSerial)) {
          nextSerial = parsedSerial + 1;
        }
      }

      fac.audit_number = `${prefix}${String(nextSerial).padStart(3, "0")}`;

      // Also try to backfill enquiry_number if it is missing and this facility was converted from an enquiry
      if (!fac.enquiry_number) {
        const linkedEnquiry = await Enquiry.findOne({ converted_facility_id: fac._id });
        if (linkedEnquiry && linkedEnquiry.enquiry_number) {
          fac.enquiry_number = linkedEnquiry.enquiry_number;
          console.log(`Linked Facility: "${fac.name}" -> Enquiry Number: ${fac.enquiry_number}`);
        }
      }

      await fac.save();
      console.log(`Updated Facility: "${fac.name}" -> Audit Number: ${fac.audit_number}`);
    }

    console.log("\nBackfill operation completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Backfill operation failed:", error);
    process.exit(1);
  }
}

backfill();
