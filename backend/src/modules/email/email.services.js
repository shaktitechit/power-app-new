import { transporter } from "../../config/email.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sends a new lead email notification using a templates/leads.html template.
 */
export const sendNewLeadsEmailService = async ({ name, email, message }) => {
  // Read HTML template
  const templatePath = path.join(__dirname, "../../templates", "leads.html");
  let html = fs.readFileSync(templatePath, "utf8");

  // Replace placeholders
  html = html
    .replace("{{name}}", name)
    .replace("{{email}}", email)
    .replace("{{message}}", message);

  await transporter.sendMail({
    from: `"Landing Page" <${process.env.SMTP_USER}>`,
    to: process.env.SMTP_USER,
    subject: `New message from ${name}`,
    html: html,
  });
};
