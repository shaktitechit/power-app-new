import mongoose from "mongoose";

import { softDeletePlugin } from "./plugins/softDelete.js";

const enquirySchema = new mongoose.Schema({

    enquiry_number: {
        type: String,
        unique: true,
        sparse: true,
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

    assigned_to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },

    assigned_admin_to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },

    enquiry_status: {
        type: String,
        enum: [
            "new",
            "contacted",
            "in_discussion",
            "quoted",
            "eoq_uploaded",
            "negotiation",
            "won",
            "lost",
            "dropped"
        ],
        default: "new",
    },

    source: String,

    expected_value: Number,

    requested_audit_types: [
        {
            type: String,
            enum: [
                "Electrical Energy Audit",
                "Electrical Safety Audit",
                "Thermal Audit",
                "Lightning Arrester Audit"
            ],
        }
    ],

    notes: String,

    next_followup_date: {
        type: Date,
    },

    // 🔥 critical for your flow
    is_converted_to_facility: {
        type: Boolean,
        default: false,
    },

    converted_facility_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Facility",
    },

    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at",
    },
});

enquirySchema.pre("save", async function() {
    if (this.isNew && !this.enquiry_number) {
        const date = this.created_at || new Date();
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}${mm}${dd}`;
        const prefix = `ENQ-SPL/${dateStr}/`;

        const latestEnquiry = await this.constructor.findOne({
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

        this.enquiry_number = `${prefix}${String(nextSerial).padStart(3, "0")}`;
    }
});

enquirySchema.plugin(softDeletePlugin);

// List/sort pipelines by assignee + funnel stage (prefix covers assigned_to-only filters)
enquirySchema.index({ assigned_to: 1, enquiry_status: 1, updated_at: -1 });

// Creator-owned lists (sales pipeline views)
enquirySchema.index({ created_by: 1, created_at: -1 });

// Due-date / reminder queues
enquirySchema.index({ next_followup_date: 1 });

// Conversion lookups
enquirySchema.index({ converted_facility_id: 1 });

export default mongoose.model("Enquiry", enquirySchema);
