"use client";

import { Button } from "@/components/portal/ui/button";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";

export type EnquiryClientRepresentative = {
  name: string;
  contact_number: string;
  email: string;
};

export const emptyClientRepresentative = (): EnquiryClientRepresentative => ({
  name: "",
  contact_number: "",
  email: "",
});

export function hydrateEnquiryClientRepresentatives(enquiry?: {
  client_representatives?: {
    name?: string;
    contact_number?: string;
    email?: string;
  }[];
  client_representative?: string;
  client_contact_number?: string;
  client_email?: string;
}): EnquiryClientRepresentative[] {
  const reps = enquiry?.client_representatives ?? [];
  if (reps.length > 0) {
    return reps.map((rep) => ({
      name: rep?.name || "",
      contact_number: rep?.contact_number || "",
      email: rep?.email || "",
    }));
  }

  return [
    {
      name: enquiry?.client_representative || "",
      contact_number: enquiry?.client_contact_number || "",
      email: enquiry?.client_email || "",
    },
  ];
}

export function sanitizeEnquiryClientRepresentatives(
  reps: EnquiryClientRepresentative[],
): EnquiryClientRepresentative[] {
  return reps
    .map((rep) => ({
      name: rep.name.trim(),
      contact_number: rep.contact_number.trim(),
      email: rep.email.trim(),
    }))
    .filter((rep) => rep.name || rep.contact_number || rep.email);
}

export function getEnquiryClientRepresentatives(enquiry?: {
  client_representatives?: {
    name?: string;
    contact_number?: string;
    email?: string;
  }[];
  client_representative?: string;
  client_contact_number?: string;
  client_email?: string;
}): EnquiryClientRepresentative[] {
  return hydrateEnquiryClientRepresentatives(enquiry).filter(
    (rep) => rep.name || rep.contact_number || rep.email,
  );
}

type Props = {
  value: EnquiryClientRepresentative[];
  onChange: (next: EnquiryClientRepresentative[]) => void;
  idPrefix: string;
  disabled?: boolean;
};

export function EnquiryClientRepresentativesFields({
  value,
  onChange,
  idPrefix,
  disabled = false,
}: Props) {
  const updateRep = (
    index: number,
    field: keyof EnquiryClientRepresentative,
    fieldValue: string,
  ) => {
    onChange(
      value.map((rep, i) =>
        i === index ? { ...rep, [field]: fieldValue } : rep,
      ),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Client representatives</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...value, emptyClientRepresentative()])}
          disabled={disabled}
        >
          Add representative
        </Button>
      </div>

      <div className="space-y-3">
        {value.map((rep, index) => (
          <div
            key={`${idPrefix}-rep-${index}`}
            className="space-y-3 rounded-lg border border-border p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Representative {index + 1}</p>
              {value.length > 1 ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  disabled={disabled}
                >
                  Remove
                </Button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-cr-name-${index}`}>Name</Label>
                <Input
                  id={`${idPrefix}-cr-name-${index}`}
                  value={rep.name}
                  onChange={(e) => updateRep(index, "name", e.target.value)}
                  placeholder="Representative name"
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-cr-phone-${index}`}>
                  Contact number
                </Label>
                <Input
                  id={`${idPrefix}-cr-phone-${index}`}
                  type="tel"
                  value={rep.contact_number}
                  onChange={(e) =>
                    updateRep(index, "contact_number", e.target.value)
                  }
                  placeholder="10-digit mobile"
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-cr-email-${index}`}>Email</Label>
                <Input
                  id={`${idPrefix}-cr-email-${index}`}
                  type="email"
                  value={rep.email}
                  onChange={(e) => updateRep(index, "email", e.target.value)}
                  placeholder="Email address"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
