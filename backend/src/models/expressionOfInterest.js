import mongoose from "mongoose";

import { softDeletePlugin } from "./plugins/softDelete.js";

const { Schema } = mongoose;

const DEFAULT_COMPANY_NAME = "Shakti Power Solutions Pvt. Ltd.";

const expressionOfInterestSchema = new Schema(
  {
    eoiRef: {
      type: String,
      required: true,
      trim: true,
    },

    eoiDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    salutation: {
      type: String,
      trim: true,
      default: "Dear Sir,",
    },

    body: {
      type: String,
      required: true,
      trim: true,
    },

    complimentaryClose: {
      type: String,
      trim: true,
      default: "Thanking you.\nYours faithfully,",
    },

    company: {
      name: {
        type: String,
        required: true,
        default: DEFAULT_COMPANY_NAME,
      },
      address: {
        type: String,
        default: "",
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
    },

    recipient: {
      designation: {
        type: String,
        required: true,
        trim: true,
      },
      organization: {
        type: String,
        required: true,
        trim: true,
      },
      address: {
        type: String,
        default: "",
        trim: true,
      },
      email: {
        type: String,
        default: "",
        trim: true,
      },
      phone: {
        type: String,
        default: "",
        trim: true,
      },
    },

    enquiryId: {
      type: Schema.Types.ObjectId,
      ref: "Enquiry",
      default: null,
      index: true,
    },

    signatory: {
      electronic: {
        type: Boolean,
        default: false,
      },
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      label: {
        type: String,
        default: "Authorized Signatory",
        trim: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
      designation: {
        type: String,
        default: "Director",
        trim: true,
      },
      companyName: {
        type: String,
        default: DEFAULT_COMPANY_NAME,
        trim: true,
      },
      phone: {
        type: String,
        default: "",
        trim: true,
      },
      signature: {
        type: String,
        default: "",
      },
    },

    signatoryApproval: {
      status: {
        type: String,
        enum: ["PENDING", "APPROVED"],
        default: "PENDING",
        index: true,
      },
      approvedAt: {
        type: Date,
        default: null,
      },
      approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },

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

    quotationId: {
      type: Schema.Types.ObjectId,
      ref: "Quotation",
      default: null,
    },

    pdfUrl: {
      type: String,
      default: "",
    },

    internalNotes: {
      type: String,
      default: "",
    },

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

expressionOfInterestSchema.index(
  { eoiRef: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deleted_at: null,
      eoiRef: { $exists: true, $nin: [null, ""] },
    },
  },
);

expressionOfInterestSchema.index({
  "recipient.organization": 1,
  eoiDate: -1,
});

expressionOfInterestSchema.index({
  status: 1,
  eoiDate: -1,
});

expressionOfInterestSchema.index({
  enquiryId: 1,
  eoiDate: -1,
});

expressionOfInterestSchema.plugin(softDeletePlugin);

delete mongoose.connection.models.ExpressionOfInterest;
delete mongoose.models.ExpressionOfInterest;

const ExpressionOfInterest = mongoose.model(
  "ExpressionOfInterest",
  expressionOfInterestSchema,
  "expression_of_interests",
);

export default ExpressionOfInterest;
