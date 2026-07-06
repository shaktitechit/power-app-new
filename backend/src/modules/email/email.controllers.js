import asyncHandler from "../../middlewares/asyncHandler.js";
import { sendNewLeadsEmailService } from "./email.services.js";

// @route POST /api/v1/email/leads
// @desc Email notification for new Leads
// @access Public
export const newLeads = asyncHandler(async (req, res) => {
  const { name, email, message } = req.body;
  await sendNewLeadsEmailService({ name, email, message });
  res.json({ message: "Email sent successfully" });
});
