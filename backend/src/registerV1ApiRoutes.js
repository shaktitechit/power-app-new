import { apiRateLimiter } from "./middlewares/rateLimitLoggerMiddleware.js";

// Core & shared
import usersRoute from "./modules/auth/auth.routes.js";
import facilityRoute from "./modules/facility/facility.routes.js";
import enquiryRoute from "./modules/enquiry/enquiry.routes.js";
import auditRoutes from "./modules/audit/audit.routes.js";
import utilityRoutes from "./modules/utility/utility.routes.js";
import reportRoutes from "./modules/report/report.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import analyticsRoutes from "./modules/analytics/analytics.routes.js";
import userProfileRoutes from "./modules/auth/auth.routes.js";
import userPerformanceRoutes from "./modules/user-performance/user-performance.routes.js";
import adminRoutes from "./modules/super-admin/super-admin.routes.js";
import emailRoutes from "./modules/email/email.routes.js";
import fileManagementRoute from "./modules/file-management/file-management.routes.js";
import notificationRoutes from "./modules/notification/notification.routes.js";

// Electrical audit (utility account domain)
import utilityTarrifRoutes from "./modules/electrical-audit/utility-tarrif/utility-tarrif.routes.js";
import utilityBillingRecordRoutes from "./modules/electrical-audit/utility-billing-audit/utility-billing-audit.routes.js";
import solarPlantRoutes from "./modules/electrical-audit/solar-plant/solar-plant.routes.js";
import dgSetRoutes from "./modules/electrical-audit/dg-set/dg-set.routes.js";
import transformerRoutes from "./modules/electrical-audit/transformer/transformer.routes.js";
import pumpRoutes from "./modules/electrical-audit/pump/pump.routes.js";
import hvacAuditRoutes from "./modules/electrical-audit/hvac-audit/hvac-audit.routes.js";
import lightingAuditRoutes from "./modules/electrical-audit/lighting-audit/lighting-audit.routes.js";
import streetLightAuditRoutes from "./modules/electrical-audit/street-light-audit/street-light-audit.routes.js";
import upsAuditRoutes from "./modules/electrical-audit/ups-audit/ups-audit.routes.js";
import luxMeasurementRoutes from "./modules/electrical-audit/lux-measurement/lux-measurement.routes.js";
import miscLoadAuditRoutes from "./modules/electrical-audit/misc-load-audit/misc-load-audit.routes.js";
import solarGenerationRecordRoutes from "./modules/electrical-audit/solar-generation-audit/solar-generation-audit.routes.js";
import dgAuditRecordRoutes from "./modules/electrical-audit/dg-audit/dg-audit.routes.js";
import transformerAuditRecordRoutes from "./modules/electrical-audit/transformer-audit/transformer-audit.routes.js";
import pumpAuditRecordRoutes from "./modules/electrical-audit/pump-audit/pump-audit.routes.js";
import acAuditRecordRoutes from "./modules/electrical-audit/ac-audit/ac-audit.routes.js";
import fanAuditRecordRoutes from "./modules/electrical-audit/fan-audit/fan-audit.routes.js";

// Safety audit
import safetyGeneralAuditRoutes from "./modules/safety-audit/safety-general/safety-general.routes.js";
import safetyDocumentsAuditRoutes from "./modules/safety-audit/safety-documents/safety-documents.routes.js";
import safetyTransformerAuditRoutes from "./modules/safety-audit/safety-transformer/safety-transformer.routes.js";
import safetyMeteringRoomAuditRoutes from "./modules/safety-audit/safety-metering-room/safety-metering-room.routes.js";
import safetyPanelRoomAuditRoutes from "./modules/safety-audit/safety-panel-room/safety-panel-room.routes.js";
import safetyLdbAuditRoutes from "./modules/safety-audit/safety-ldb/safety-ldb.routes.js";
import safetyDgAuditRoutes from "./modules/safety-audit/safety-dg/safety-dg.routes.js";
import safetyEarthingAuditRoutes from "./modules/safety-audit/safety-earthing/safety-earthing.routes.js";
import safetyUpsAuditRoutes from "./modules/safety-audit/safety-ups/safety-ups.routes.js";
import safetyThermographyAuditRoutes from "./modules/safety-audit/safety-thermography/safety-thermography.routes.js";
import safetyElevatorAuditRoutes from "./modules/safety-audit/safety-elevator/safety-elevator.routes.js";
import safetyLoadAnalysisAuditRoutes from "./modules/safety-audit/safety-load-analysis/safety-load-analysis.routes.js";
import safetyLeakInspectionAuditRoutes from "./modules/safety-audit/safety-leak-inspection/safety-leak-inspection.routes.js";
import safetyPacVentilationAuditRoutes from "./modules/safety-audit/safety-pac-ventilation/safety-pac-ventilation.routes.js";
import safetyWiringAuditRoutes from "./modules/safety-audit/safety-wiring/safety-wiring.routes.js";
import safetyPumpCompressorAuditRoutes from "./modules/safety-audit/safety-pump-compressor/safety-pump-compressor.routes.js";
import safetyAdditionalItemsAuditRoutes from "./modules/safety-audit/safety-additional-items/safety-additional-items.routes.js";

import modeRoutes from "./modules/mode/mode.routes.js";


/**
 * Mounts `/api` rate limiter and all `/api/v1/...` routers.
 * @param {import("express").Application} app
 */
export function registerV1ApiRoutes(app) {
  app.use("/api", apiRateLimiter);

  // --- Email & files ---
  app.use("/api/v1/email", emailRoutes);
  app.use("/api/v1/file-management", fileManagementRoute);

  // --- Users, facilities, utilities (root shared) ---
  app.use("/api/v1/users", usersRoute);
  app.use("/api/v1/facilities", facilityRoute);
  app.use("/api/v1/enquiries", enquiryRoute);
  app.use("/api/v1/audits", auditRoutes);
  app.use("/api/v1/utilities", utilityRoutes);
  app.use("/api/v1/notifications", notificationRoutes);

  // --- Electrical audit (`routes/electrical-audit`): tariffs, billing, equipment, records ---
  app.use("/api/v1/utility-tariffs", utilityTarrifRoutes);
  app.use("/api/v1/utility-billing-records", utilityBillingRecordRoutes);
  app.use("/api/v1/solar-plants", solarPlantRoutes);
  app.use("/api/v1/dg-sets", dgSetRoutes);
  app.use("/api/v1/transformers", transformerRoutes);
  app.use("/api/v1/pumps", pumpRoutes);
  app.use("/api/v1/hvac-audits", hvacAuditRoutes);
  app.use("/api/v1/lighting-audits", lightingAuditRoutes);
  app.use("/api/v1/street-light-audits", streetLightAuditRoutes);
  app.use("/api/v1/ups-audits", upsAuditRoutes);
  app.use("/api/v1/lux-measurements", luxMeasurementRoutes);
  app.use("/api/v1/misc-load-audits", miscLoadAuditRoutes);
  app.use("/api/v1/solar-generation-records", solarGenerationRecordRoutes);
  app.use("/api/v1/dg-audit-records", dgAuditRecordRoutes);
  app.use("/api/v1/transformer-audit-records", transformerAuditRecordRoutes);
  app.use("/api/v1/pump-audit-records", pumpAuditRecordRoutes);
  app.use("/api/v1/ac-audit-records", acAuditRecordRoutes);
  app.use("/api/v1/fan-audit-records", fanAuditRecordRoutes);

  // --- Safety audit (`routes/safety-audit`): checklists & inspections ---
  app.use("/api/v1/safety-general-audits", safetyGeneralAuditRoutes);
  app.use("/api/v1/safety-documents-audits", safetyDocumentsAuditRoutes);
  app.use("/api/v1/safety-transformer-audits", safetyTransformerAuditRoutes);
  app.use("/api/v1/safety-metering-room-audits", safetyMeteringRoomAuditRoutes);
  app.use("/api/v1/safety-panel-room-audits", safetyPanelRoomAuditRoutes);
  app.use("/api/v1/safety-ldb-audits", safetyLdbAuditRoutes);
  app.use("/api/v1/safety-dg-audits", safetyDgAuditRoutes);
  app.use("/api/v1/safety-earthing-audits", safetyEarthingAuditRoutes);
  app.use("/api/v1/safety-ups-audits", safetyUpsAuditRoutes);
  app.use("/api/v1/safety-thermography-audits", safetyThermographyAuditRoutes);
  app.use("/api/v1/safety-elevator-audits", safetyElevatorAuditRoutes);
  app.use("/api/v1/safety-load-analysis-audits", safetyLoadAnalysisAuditRoutes);
  app.use("/api/v1/safety-leak-inspection-audits", safetyLeakInspectionAuditRoutes);
  app.use("/api/v1/safety-pac-ventilation-audits", safetyPacVentilationAuditRoutes);
  app.use("/api/v1/safety-wiring-audits", safetyWiringAuditRoutes);
  app.use("/api/v1/safety-pump-compressor-audits", safetyPumpCompressorAuditRoutes);
  app.use("/api/v1/safety-additional-items-audits", safetyAdditionalItemsAuditRoutes);

  // --- Reports, dashboard, analytics, profiles ---
  app.use("/api/v1/reports", reportRoutes);
  app.use("/api/v1/dashboard", dashboardRoutes);
  app.use("/api/v1/analytics", analyticsRoutes);
  app.use("/api/v1/user", userProfileRoutes);
  app.use("/api/v1/user-performance", userPerformanceRoutes);

  // --- Admin ---
  app.use("/api/v1/admin/users", adminRoutes);

  // --- Mode ---
  app.use("/api/v1/mode", modeRoutes);
}
