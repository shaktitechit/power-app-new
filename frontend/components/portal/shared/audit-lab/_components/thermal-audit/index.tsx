"use client";

import type { Facility } from "@/store/slices/facilityApiSlice";

export default function ThermalLab({
  facility,
}: {
  facility: Facility;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.02] p-6">
        <h3 className="text-lg font-bold text-red-600 dark:text-red-400">
          Thermal Audit Lab
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Active Workspace for: <span className="font-semibold text-foreground">{facility.name}</span> ({facility.city})
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h4 className="font-semibold text-sm">Thermography & Hotspots</h4>
          <p className="text-xs text-muted-foreground mt-2">IR scanning, temperature delta measurements, and thermal hot spot classifications.</p>
        </div>
      </div>
    </div>
  );
}
