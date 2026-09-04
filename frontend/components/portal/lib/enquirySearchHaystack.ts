import { enquiryStatusLabel } from "@/components/portal/lib/enquiryConstants";
import { assigneeLabel } from "@/components/portal/lib/enquiryAccess";
import type { Enquiry } from "@/store/slices/enquiryApiSlice";

function assigneeSearchParts(
  value: Enquiry["assigned_to"],
): Array<string | undefined> {
  const label = assigneeLabel(value);
  if (!value) return [];
  if (typeof value === "object") {
    return [value.name, value.email, value._id, label ?? undefined];
  }
  return [String(value)];
}

export function enquirySearchHaystack(enquiry: Enquiry): string {
  const creator =
    enquiry.created_by &&
    typeof enquiry.created_by === "object" &&
    enquiry.created_by !== null
      ? [
          enquiry.created_by.name,
          enquiry.created_by.email,
          enquiry.created_by._id,
        ]
      : [String(enquiry.created_by)];

  const reps = (enquiry.client_representatives ?? []).flatMap((cr) =>
    [cr.name, cr.contact_number, cr.email].filter(Boolean),
  );

  const cf =
    enquiry.converted_facility_id &&
    typeof enquiry.converted_facility_id === "object"
      ? [
          enquiry.converted_facility_id._id,
          enquiry.converted_facility_id.name,
          enquiry.converted_facility_id.city,
        ].filter(Boolean)
      : enquiry.converted_facility_id
        ? [String(enquiry.converted_facility_id)]
        : [];

  const parts = [
    enquiry.name,
    enquiry.enquiry_number,
    enquiry.city,
    enquiry.address,
    enquiry.client_representative,
    enquiry.client_contact_number,
    enquiry.client_email,
    enquiry.enquiry_status,
    enquiryStatusLabel(enquiry.enquiry_status),
    enquiry.source,
    enquiry.notes,
    enquiry.expected_value,
    enquiry.requested_audit_types?.join(" "),
    enquiry.next_followup_date,
    enquiry._id,
    enquiry.is_converted_to_facility ? "converted facility" : "",
    ...assigneeSearchParts(enquiry.assigned_to),
    ...assigneeSearchParts(enquiry.assigned_manager_to),
    ...assigneeSearchParts(enquiry.assigned_admin_to),
    ...creator,
    ...reps,
    ...cf,
  ];

  return parts.filter(Boolean).join(" ").toLowerCase();
}
