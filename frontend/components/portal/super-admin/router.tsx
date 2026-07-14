import { notFound } from "next/navigation";

// Shared page components — super-admin has access to all pages
import Analytics from "@/components/portal/shared/analytics";
import Audits from "@/components/portal/shared/audit-lab";
import Dashboard from "@/components/portal/shared/dashboard";
import Enquiries from "@/components/portal/shared/enquiries";
import EnquiryDetails from "@/components/portal/shared/enquiries/[enquiryId]";
import Facilities from "@/components/portal/shared/facilities";
import FacilityAuditType from "@/components/portal/shared/facility/[auditType]";
import FacilityDetails from "@/components/portal/shared/facility/[auditType]/[facilityId]";
import UtilityAccountDetails from "@/components/portal/shared/facility/[auditType]/[facilityId]/utility-account/[utility_account_id]";
import Performance from "@/components/portal/shared/performance";
import PerformanceUser from "@/components/portal/shared/performance/[user_id]";
import Profile from "@/components/portal/shared/profile/[user_id]";
import Reports from "@/components/portal/shared/reports";
import Settings from "@/components/portal/shared/settings";
import SubmittedEnquiries from "@/components/portal/shared/submited-enquiries";
import Users from "@/components/portal/shared/users";
import UserDetails from "@/components/portal/shared/users/[user_id]";

/**
 * Resolves URL path segments to the correct page component for the Super Admin portal.
 * Called from `app/[portal]/[[...rest]]/page.tsx`.
 */
export function render(segments: string[]) {
  if (segments.length === 0 || segments[0] === "dashboard") return <Dashboard />;
  if (segments[0] === "analytics") return <Analytics />;
  if (segments[0] === "audits") return <Audits />;
  if (segments[0] === "settings") return <Settings />;
  if (segments[0] === "submited-enquiries") return <SubmittedEnquiries />;
  if (segments[0] === "facilities") return <Facilities />;
  if (segments[0] === "reports") return <Reports />;

  if (segments[0] === "enquiries") {
    if (segments.length === 1) return <Enquiries />;
    if (segments.length === 2) return <EnquiryDetails />;
  }

  if (segments[0] === "users") {
    if (segments.length === 1) return <Users />;
    if (segments.length === 2) return <UserDetails />;
  }

  if (segments[0] === "performance") {
    if (segments.length === 1) return <Performance />;
    if (segments.length === 2) return <PerformanceUser />;
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
