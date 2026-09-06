import {
  MICROSOFT_GRAPH_SENDER_EMAIL,
  isMicrosoftGraphConfigured,
} from "../config/microsoftGraph.js";
import { sendGraphMail } from "./microsoftGraph/graphMail.js";
import { buildBrandedEmailHtml } from "../modules/message/emailTemplate.js";
import { transporter } from "../config/email.js";

/**
 * Generates a random 6-digit numeric OTP code.
 */
export function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Mask an email address for safe frontend UI display (e.g. j***n@example.com).
 */
export function maskEmailAddress(email) {
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return email || "";
  }
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 2) {
    return `${localPart[0] || "*"}***@${domain}`;
  }
  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
}

/**
 * Send an OTP code to a user's email address.
 * Uses Microsoft Graph service with MICROSOFT_GRAPH_SENDER_EMAIL if configured.
 * Reuses branded email template from message module.
 * Falls back to Nodemailer transporter or console logging in development mode.
 */
export async function sendOtpEmail({ recipientEmail, recipientName, otpCode }) {
  const subject = `${otpCode} is your verification code`;
  const messageText = `Your one-time login verification code is: ${otpCode}\n\nThis code is valid for 5 minutes. Please do not share this code with anyone.`;

  // Always log to server console for development / troubleshooting
  console.log(`[OTP LOGIN] Verification code for ${recipientEmail}: ${otpCode}`);

  let emailSent = false;
  let deliveryMethod = "console";

  // 1. Try Microsoft Graph Service
  if (isMicrosoftGraphConfigured()) {
    try {
      const branded = await buildBrandedEmailHtml({
        senderName: "Power Audit Security",
        senderEmail: MICROSOFT_GRAPH_SENDER_EMAIL,
        recipientName: recipientName || "User",
        subject,
        message: messageText,
      });

      await sendGraphMail({
        fromMailbox: MICROSOFT_GRAPH_SENDER_EMAIL,
        toEmail: recipientEmail,
        subject,
        body: messageText,
        html: branded.html,
        attachments: branded.logoAttachment ? [branded.logoAttachment] : undefined,
      });

      emailSent = true;
      deliveryMethod = "microsoft_graph";
      console.log(`[OTP LOGIN] Email delivered via Microsoft Graph from ${MICROSOFT_GRAPH_SENDER_EMAIL} to ${recipientEmail}`);
    } catch (err) {
      console.error("[OTP LOGIN] Failed to send via Microsoft Graph:", err.message);
    }
  }

  // 2. Fallback to Nodemailer transporter if Graph is not configured or failed
  if (!emailSent && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await transporter.sendMail({
        from: `Power Audit <${process.env.SMTP_USER}>`,
        to: recipientEmail,
        subject,
        text: messageText,
        html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4f46e5;">Login Verification Code</h2>
          <p>Hello ${recipientName || "there"},</p>
          <p>Your one-time verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #4f46e5; margin: 20px 0;">
            ${otpCode}
          </div>
          <p>This code will expire in <strong>5 minutes</strong>. If you did not request this, please ignore this email.</p>
        </div>`,
      });
      emailSent = true;
      deliveryMethod = "nodemailer";
      console.log(`[OTP LOGIN] Email delivered via Nodemailer to ${recipientEmail}`);
    } catch (err) {
      console.error("[OTP LOGIN] Failed to send via Nodemailer:", err.message);
    }
  }

  return {
    success: true,
    deliveryMethod,
    emailSent,
  };
}
