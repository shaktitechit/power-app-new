import { useParams as useNextParams } from "next/navigation";

export function useParams() {
  const params = useNextParams();
  if (!params) return {};

  const portal = params.portal as string;
  const rest = params.rest as string[] | undefined;
  const pathSegments = rest || [];

  const parsed: Record<string, string | string[]> = {
    ...params,
  };

  if (pathSegments[0] === "facility" && pathSegments.length >= 2) {
    parsed.auditType = pathSegments[1];
    if (pathSegments.length >= 3) {
      parsed.facilityId = pathSegments[2];
    }
    if (pathSegments.length >= 5 && pathSegments[3] === "utility-account") {
      parsed.utility_account_id = pathSegments[4];
    }
    if (pathSegments.length >= 7 && pathSegments[3] === "utility-account") {
      parsed.dg_audit_id = pathSegments[6];
      parsed.pump_audit_id = pathSegments[6];
      parsed.solar_audit_id = pathSegments[6];
      parsed.transformer_audit_id = pathSegments[6];
    }
  } else if (pathSegments[0] === "users" && pathSegments.length >= 2) {
    parsed.user_id = pathSegments[1];
  } else if (pathSegments[0] === "performance" && pathSegments.length >= 2) {
    parsed.user_id = pathSegments[1];
  } else if (pathSegments[0] === "profile" && pathSegments.length >= 2) {
    parsed.user_id = pathSegments[1];
  } else if (pathSegments[0] === "enquiries" && pathSegments.length >= 2) {
    parsed.enquiryId = pathSegments[1];
  }

  return parsed;
}
