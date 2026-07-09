import Enquiry from "../models/enquiry.js";
import Facility from "../models/facility.js";
import FacilityAuditor from "../models/facilityAuditor.js";
import FollowUp from "../models/followUp.js";
import Notification from "../models/notification.js";
import PresenceLog from "../models/presenceLog.js";
import EnquiryDocument from "../models/enquiryDocument.js";
import RecentActivity from "../models/recentActivity.js";
import Report from "../models/report.js";
import User from "../models/user.js";
import UserSession from "../models/userSession.js";
import UtilityAccount from "../models/utilityAccount.js";

// Electrical Audit Models
import ACAuditRecord from "../models/electrical-audit/acAuditRecord.js";
import DGAuditRecord from "../models/electrical-audit/dgAuditRecord.js";
import DGSet from "../models/electrical-audit/dgSet.js";
import FanAuditRecord from "../models/electrical-audit/fanAuditRecord.js";
import HVACAudit from "../models/electrical-audit/hvacAudit.js";
import LightingAuditRecord from "../models/electrical-audit/lightingAuditRecord.js";
import StreetLightAuditRecord from "../models/electrical-audit/streetLightAuditRecord.js";
import LuxMeasurement from "../models/electrical-audit/luxMeasurement.js";
import MiscLoadAuditRecord from "../models/electrical-audit/miscLoadAuditRecord.js";
import Pump from "../models/electrical-audit/pump.js";
import PumpAuditRecord from "../models/electrical-audit/pumpAuditRecord.js";
import SolarGenerationRecord from "../models/electrical-audit/solarGenerationRecord.js";
import SolarPlant from "../models/electrical-audit/solarPlant.js";
import Transformer from "../models/electrical-audit/transformer.js";
import TransformerAuditRecord from "../models/electrical-audit/transformerAuditRecord.js";
import UtilityBillingRecord from "../models/electrical-audit/utilityBillingRecord.js";
import UtilityTariff from "../models/electrical-audit/utilityTarrif.js";
import UPSAudit from "../models/electrical-audit/upsAudit.js";

// Safety Audit Models
import {
  SafetyAdditionalItemsAudit,
  SafetyDgAudit,
  SafetyDocumentsAudit,
  SafetyEarthingAudit,
  SafetyElevatorAudit,
  SafetyGeneralAudit,
  SafetyLeakInspectionAudit,
  SafetyLdbAudit,
  SafetyLoadAnalysisAudit,
  SafetyMeteringRoomAudit,
  SafetyPacVentilationAudit,
  SafetyPanelRoomAudit,
  SafetyPumpCompressorAudit,
  SafetyThermographyAudit,
  SafetyTransformerAudit,
  SafetyUpsAudit,
  SafetyWiringAudit,
} from "../models/safety-audit/index.js";

export const modelsRegistry = {
  // Core Models
  Enquiry,
  Facility,
  FacilityAuditor,
  FollowUp,
  Notification,
  PresenceLog,
  EnquiryDocument,
  RecentActivity,
  Report,
  User,
  UserSession,
  UtilityAccount,

  // Electrical Audit Models
  ACAuditRecord,
  DGAuditRecord,
  DGSet,
  FanAuditRecord,
  HVACAudit,
  LightingAuditRecord,
  StreetLightAuditRecord,
  LuxMeasurement,
  MiscLoadAuditRecord,
  Pump,
  PumpAuditRecord,
  SolarGenerationRecord,
  SolarPlant,
  Transformer,
  TransformerAuditRecord,
  UtilityBillingRecord,
  UtilityTariff,
  UPSAudit,

  // Safety Audit Models
  SafetyAdditionalItemsAudit,
  SafetyDgAudit,
  SafetyDocumentsAudit,
  SafetyEarthingAudit,
  SafetyElevatorAudit,
  SafetyGeneralAudit,
  SafetyLeakInspectionAudit,
  SafetyLdbAudit,
  SafetyLoadAnalysisAudit,
  SafetyMeteringRoomAudit,
  SafetyPacVentilationAudit,
  SafetyPanelRoomAudit,
  SafetyPumpCompressorAudit,
  SafetyThermographyAudit,
  SafetyTransformerAudit,
  SafetyUpsAudit,
  SafetyWiringAudit,
};

export default modelsRegistry;
