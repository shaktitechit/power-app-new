import type { Facility } from "@/store/slices/facilityApiSlice";
import type { Quotation } from "@/store/slices/quotationApiSlice";

export function enquiryNumberFromQuotation(quotation: Quotation): string | undefined {
  const enquiry = quotation.enquiryId;
  if (enquiry && typeof enquiry === "object") {
    return enquiry.enquiry_number?.trim() || undefined;
  }
  return undefined;
}

export function buildFacilitiesByEnquiryNumber(facilities: Facility[]) {
  const map = new Map<string, Facility[]>();
  for (const facility of facilities) {
    const key = facility.enquiry_number?.trim();
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(facility);
    map.set(key, list);
  }
  return map;
}

export function linkedFacilitiesForQuotation(
  quotation: Quotation,
  facilities: Facility[],
  facilitiesByEnquiryNumber: Map<string, Facility[]>,
): Facility[] {
  const enquiryNumber = enquiryNumberFromQuotation(quotation);
  if (!enquiryNumber) return [];

  const matched = facilitiesByEnquiryNumber.get(enquiryNumber) ?? [];
  return [...matched].sort((a, b) =>
    (a.audit_type ?? "").localeCompare(b.audit_type ?? ""),
  );
}
