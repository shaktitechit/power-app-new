"use client";

import { Checkbox } from "@/components/portal/ui/checkbox";
import {
  ENERGY_SECTIONS,
  type DataSheetInclusions,
  type DataSheetKey,
} from "@/components/portal/lib/electrical-audit/utility-data-sheet-sections";

interface UtilityDataSheetFieldsProps {
  values: DataSheetInclusions;
  onChange: (key: DataSheetKey, checked: boolean) => void;
  is_transformer_maintained_by_facility: boolean;
  onTransformerMaintainedChange: (checked: boolean) => void;
}

function CheckboxRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
      />
      <span className="min-w-0 space-y-0.5">
        <span className="block text-sm font-medium">{label}</span>
        {description ? (
          <span className="block text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function UtilityDataSheetFields({
  values,
  onChange,
  is_transformer_maintained_by_facility,
  onTransformerMaintainedChange,
}: UtilityDataSheetFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">Audit Data Sheet</h3>
        <p className="text-xs text-muted-foreground">
          Select which audit sheets apply to this utility account. Checked
          sheets are saved with status pending and included in the workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ENERGY_SECTIONS.map((section) => (
          <CheckboxRow
            key={section.key}
            id={`data-sheet-${section.key}`}
            label={section.label}
            description={section.description}
            checked={values[section.key]}
            onCheckedChange={(checked) => onChange(section.key, checked)}
          />
        ))}

        <CheckboxRow
          id="is_transformer_maintained_by_facility"
          label="Transformer Maintained by Facility"
          description="Facility is responsible for transformer maintenance"
          checked={is_transformer_maintained_by_facility}
          onCheckedChange={onTransformerMaintainedChange}
        />
      </div>
    </div>
  );
}
