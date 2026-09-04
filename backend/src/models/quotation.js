import mongoose from "mongoose";

import { softDeletePlugin } from "./plugins/softDelete.js";

const { Schema } = mongoose;

/* =========================================================
   QUOTATION ITEM SCHEMA
========================================================= */

const quotationItemSchema = new Schema(
  {
    srNo: {
      type: Number,
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    hsnSac: {
      type: String,
      trim: true,
      default: "",
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    unit: {
      type: String,
      default: "Nos",
      trim: true,
    },

    rate: {
      type: Number,
      required: true,
      min: 0,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

/* =========================================================
   TERMS & CONDITIONS SCHEMA
========================================================= */

const quotationTermSchema = new Schema(
  {
    termNo: {
      type: Number,
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

/* =========================================================
   QUOTATION SCHEMA
========================================================= */

const quotationSchema = new Schema(
  {
    /* =====================================================
       QUOTATION INFORMATION
    ===================================================== */

    quotationRef: {
      type: String,
      required: true,
      trim: true,
    },

    quotationDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    validUntil: {
      type: Date,
    },

    reference: {
      type: String,
      trim: true,
      default: "",
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    /* =====================================================
       COMPANY INFORMATION
    ===================================================== */

    company: {
      name: {
        type: String,
        required: true,
        default: "Shakti Power Solutions Pvt. Ltd.",
      },

      address: {
        type: String,
        required: true,
      },

      phone: {
        type: String,
        default: "",
      },

      mobile: {
        type: String,
        default: "",
      },

      email: {
        type: String,
        default: "",
      },

      website: {
        type: String,
        default: "",
      },

      gstin: {
        type: String,
        default: "",
      },
    },

    /* =====================================================
       CUSTOMER INFORMATION
    ===================================================== */

    customer: {
      customerId: {
        type: Schema.Types.ObjectId,
        ref: "Enquiry",
        default: null,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      address: {
        type: String,
        required: true,
      },

      gstin: {
        type: String,
        default: "",
        trim: true,
      },

      phone: {
        type: String,
        default: "",
      },

      mobile: {
        type: String,
        default: "",
      },

      email: {
        type: String,
        default: "",
        trim: true,
      },

      kindAttn: {
        type: String,
        default: "",
        trim: true,
      },
    },

    /* =====================================================
       LEAD / ENQUIRY REFERENCE
    ===================================================== */

    enquiryId: {
      type: Schema.Types.ObjectId,
      ref: "Enquiry",
      default: null,
      index: true,
    },

    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Enquiry",
      default: null,
    },

    opportunityId: {
      type: Schema.Types.ObjectId,
      ref: "Enquiry",
      default: null,
    },

    /* =====================================================
       QUOTATION ITEMS
    ===================================================== */

    items: {
      type: [quotationItemSchema],
      required: true,

      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },

        message: "Quotation must contain at least one item.",
      },
    },

    /* =====================================================
       FINANCIAL INFORMATION
    ===================================================== */

    financials: {
      subtotal: {
        type: Number,
        required: true,
        min: 0,
      },

      /* -------------------------
         GST
      ------------------------- */

      gstRate: {
        type: Number,
        default: 18,
        min: 0,
      },

      cgst: {
        type: Number,
        default: 0,
        min: 0,
      },

      sgst: {
        type: Number,
        default: 0,
        min: 0,
      },

      igst: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalGst: {
        type: Number,
        required: true,
        min: 0,
      },

      /* -------------------------
         TOTALS
      ------------------------- */

      grandTotal: {
        type: Number,
        required: true,
        min: 0,
      },

      roundedGrandTotal: {
        type: Number,
        required: true,
        min: 0,
      },

      amountInWords: {
        type: String,
        required: true,
        trim: true,
      },
    },

    /* =====================================================
       TERMS & CONDITIONS
    ===================================================== */

    termsAndConditions: {
      type: [quotationTermSchema],
      default: [],
    },

    /* =====================================================
       BANK DETAILS
    ===================================================== */

    bankDetails: {
      beneficiaryName: {
        type: String,
        required: true,
        trim: true,
      },

      accountNo: {
        type: String,
        required: true,
        trim: true,
      },

      bankName: {
        type: String,
        required: true,
        trim: true,
      },

      branch: {
        type: String,
        default: "",
        trim: true,
      },

      ifscCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
      },

      swiftCode: {
        type: String,
        default: "",
        trim: true,
        uppercase: true,
      },

      micrCode: {
        type: String,
        default: "",
        trim: true,
      },
    },

    /* =====================================================
       AUTHORIZED SIGNATORY
    ===================================================== */

    signatory: {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      designation: {
        type: String,
        default: "Authorized Signatory",
        trim: true,
      },

      companyName: {
        type: String,
        default: "Shakti Power Solutions Pvt. Ltd.",
        trim: true,
      },

      signature: {
        type: String,
        default: "",
      },

      signatureDate: {
        type: Date,
      },

      seal: {
        type: String,
        default: "",
      },
    },

    /* =====================================================
       ORDER ACCEPTANCE
    ===================================================== */

    orderAcceptance: {
      enabled: {
        type: Boolean,
        default: true,
      },

      customerName: {
        type: String,
        default: "",
        trim: true,
      },

      companyName: {
        type: String,
        default: "",
        trim: true,
      },

      designation: {
        type: String,
        default: "",
        trim: true,
      },

      acceptedDate: {
        type: Date,
      },

      remarks: {
        type: String,
        default: "",
      },

      signature: {
        type: String,
        default: "",
      },

      companySeal: {
        type: String,
        default: "",
      },
    },

    /* =====================================================
       QUOTATION STATUS
    ===================================================== */

    status: {
      type: String,

      enum: [
        "DRAFT",
        "SENT",
        "ACCEPTED",
        "REJECTED",
        "EXPIRED",
        "CANCELLED",
      ],

      default: "DRAFT",

      index: true,
    },

    /* =====================================================
       CONVERSION REFERENCES
    ===================================================== */

    salesOrderId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    invoiceId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    /* =====================================================
       DOCUMENT
    ===================================================== */

    pdfUrl: {
      type: String,
      default: "",
    },

    /* =====================================================
       INTERNAL NOTES
    ===================================================== */

    internalNotes: {
      type: String,
      default: "",
    },

    /* =====================================================
       USER / AUDIT
    ===================================================== */

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },

  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

/* =========================================================
   INDEXES
========================================================= */

quotationSchema.index(
  { quotationRef: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deleted_at: null,
      quotationRef: { $exists: true, $nin: [null, ""] },
    },
  },
);

quotationSchema.index({
  "customer.name": 1,
  quotationDate: -1,
});

quotationSchema.index({
  status: 1,
  quotationDate: -1,
});

quotationSchema.index({
  enquiryId: 1,
  quotationDate: -1,
});

quotationSchema.index({
  leadId: 1,
});

quotationSchema.index({
  opportunityId: 1,
});

quotationSchema.plugin(softDeletePlugin);

const Quotation = mongoose.models.Quotation || mongoose.model("Quotation", quotationSchema);

export default Quotation;
