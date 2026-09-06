import { notFound } from "next/navigation";

// Shared page components accessible to Manager
import Analytics from "@/components/portal/shared/analytics";
import Dashboard from "@/components/portal/shared/dashboard";
import Enquiries from "@/components/portal/shared/enquiries";
import EnquiryAnalytics from "@/components/portal/shared/enquiries/analytics";
import EnquiryFollowUps from "@/components/portal/shared/enquiries/follow-ups";
import EnquiryDetails from "@/components/portal/shared/enquiries/[enquiryId]";
import Quotations from "@/components/portal/shared/quotations";
import QuotationDetails from "@/components/portal/shared/quotations/[quotationId]";
import Eois from "@/components/portal/shared/eois";
import EoiDetails from "@/components/portal/shared/eois/[eoiId]";
import TermsConditions from "@/components/portal/shared/terms-conditions";
import TermsConditionsDetails from "@/components/portal/shared/terms-conditions/[termsConditionsId]";
import Facilities from "@/components/portal/shared/facilities";
import FacilityAuditType from "@/components/portal/shared/facility/[auditType]";
import FacilityDetails from "@/components/portal/shared/facility/[auditType]/[facilityId]";
import UtilityAccountDetails from "@/components/portal/shared/facility/[auditType]/[facilityId]/utility-account/[utility_account_id]";
import Profile from "@/components/portal/shared/profile/[user_id]";
import Reports from "@/components/portal/shared/reports";
import Settings from "@/components/portal/shared/settings";
import WorkPlanner from "@/components/portal/shared/work-planner";
import WorkPlanDetails from "@/components/portal/shared/work-planner/[planId]";
import ExpenseManager from "@/components/portal/shared/expense-manager";

/**
 * Resolves URL path segments to the correct page component for the Manager portal.
 * Called from `app/[portal]/[[...rest]]/page.tsx`.
 */
export function render(segments: string[]) {
  if (segments.length === 0 || segments[0] === "dashboard") return <Dashboard />;
  if (segments[0] === "analytics") return <Analytics />;
  if (segments[0] === "settings") return <Settings />;
  if (segments[0] === "facilities") return <Facilities />;
  if (segments[0] === "reports") return <Reports />;
  if (segments[0] === "expense-manager") return <ExpenseManager />;

  if (segments[0] === "work-planner") {
    if (segments.length === 1) return <WorkPlanner />;
    if (segments.length === 2) return <WorkPlanDetails planIdProp={segments[1]} />;
  }

  if (segments[0] === "enquiries") {
    if (segments.length === 1) return <Enquiries />;
    if (segments[1] === "analytics") return <EnquiryAnalytics />;
    if (segments[1] === "follow-ups") return <EnquiryFollowUps />;
    if (segments.length === 2) return <EnquiryDetails />;
  }

  if (segments[0] === "quotations") {
    if (segments.length === 1) return <Quotations />;
    if (segments.length === 2) return <QuotationDetails />;
  }

  if (segments[0] === "eois") {
    if (segments.length === 1) return <Eois />;
    if (segments.length === 2) return <EoiDetails />;
  }

  if (segments[0] === "terms-conditions") {
    if (segments.length === 1) return <TermsConditions />;
    if (segments.length === 2) return <TermsConditionsDetails />;
  }

  if (segments[0] === "profile") {
    if (segments.length === 2) return <Profile />;
  }

  if (segments[0] === "facility") {
    if (segments.length === 2) return <FacilityAuditType />;
    if (segments.length === 3) return <FacilityDetails />;
    if (segments.length === 5 && segments[3] === "utility-account") {
      return <UtilityAccountDetails />;
    }

  }

  notFound();
}
