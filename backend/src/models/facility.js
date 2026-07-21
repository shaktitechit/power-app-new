import documentSchema from "./document.js";
import mongoose from "mongoose";
import { softDeletePlugin } from "./plugins/softDelete.js";

const facilitySchema = new mongoose.Schema(
  {
    owner_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    audit_number: {
      type: String,
      unique: true,
      sparse: true,
    },

    enquiry_number: {
      type: String,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    client_representative: {
      type: String,
      trim: true,
    },

    client_contact_number: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, "Please enter a valid phone number"],
    },

    client_email: {
      type: String,
      trim: true,
      match: [/.+\@.+\..+/, "Please enter a valid email"],
    },

    start_date: {
      type: Date,
      default: Date.now,
    },

    client_representatives: [
      {
        name: {
          type: String,
          trim: true,
        },
        contact_number: {
          type: String,
          trim: true,
          match: [/^[6-9]\d{9}$/, "Please enter a valid phone number"],
        },
        email: {
          type: String,
          trim: true,
          match: [/.+\@.+\..+/, "Please enter a valid email"],
        },
      },
    ],

    facility_type: {
      type: String,
      trim: true,
      default: "",
    },

    audit_type: {
      type: String,
      trim: true,
      enum: [
        "Electrical Energy Audit",
        "Electrical Safety Audit",
        "Thermal Audit",
        "Lightning Arrester Audit",
      ],
      default: "Electrical Energy Audit",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // 🔍 Audit metadata (recommended)
    audit_date: {
      type: Date,
      default: Date.now,
    },

    auditor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    closure_date: {
      type: Date,
    },

    // Facility-level audit closure (after all utility audits are completed)
    audit_closure: {
      closed_at: {
        type: Date,
      },
      closed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reopened_at: {
        type: Date,
      },
      reopened_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    // 📂 Documents (Images / PDFs)
    documents: [documentSchema],

    // 💰 Budget Information
    budget: {
      no_of_persons: {
        type: Number,
        default: null,
      },
      no_planned_site_visits: {
        type: Number,
        default: null,
      },
      tentative_budget: {
        type: Number,
        default: null,
      },
      actual_budget: {
        type: Number,
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

facilitySchema.pre("save", async function() {
  if (this.isNew && !this.audit_number) {
    const date = this.start_date || new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;
    const prefix = `SPL/${dateStr}/`;

    const latestFacility = await this.constructor.findOne({
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

    this.audit_number = `${prefix}${String(nextSerial).padStart(3, "0")}`;
  }
});

facilitySchema.plugin(softDeletePlugin);

// 🔍 Indexes
facilitySchema.index({ owner_user_id: 1 });
facilitySchema.index({ created_by: 1 });
facilitySchema.index({ city: 1 });

const Facility = mongoose.model("Facility", facilitySchema);

export default Facility;
