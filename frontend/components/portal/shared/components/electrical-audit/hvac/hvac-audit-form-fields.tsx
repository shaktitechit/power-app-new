"use client";

import { Button } from "@/components/portal/ui/button";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { Textarea } from "@/components/portal/ui/textarea";
import { Checkbox } from "@/components/portal/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import {
  autoInputClass,
  CHECKLIST_FIELDS,
  createAuxiliaryComponent,
  createChillerReading,
  createCoolingTowerReading,
  createEquipmentItem,
  editableInputClass,
  mergeDocumentsChecklist,
  type HVACAuditFormState,
  updateHVACForm,
} from "./hvac-audit-utils";

type Props = {
  form: HVACAuditFormState;
  onFormChange: (updater: (prev: HVACAuditFormState) => HVACAuditFormState) => void;
};

export function HVACAuditFormFields({ form, onFormChange }: Props) {
  const setForm = (updater: (prev: HVACAuditFormState) => HVACAuditFormState) => {
    onFormChange((prev) => updateHVACForm(prev, updater));
  };

  return (
    <div className="space-y-8">
                          <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Facility Name</Label>
                  <Input
                    value={form.pre_audit_information.facility_name}
                    className={autoInputClass}
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label>Location Address</Label>
                  <Input
                    value={form.pre_audit_information.location_address}
                    className={autoInputClass}
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label>Client Contact Person</Label>
                  <Input
                    value={form.pre_audit_information.client_contact_person}
                    className={autoInputClass}
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contact Number / Email</Label>
                  <Input
                    value={form.pre_audit_information.contact_number_email}
                    className={autoInputClass}
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type of Facility</Label>
                  <Input
                    value={form.pre_audit_information.type_of_facility}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pre_audit_information: {
                          ...prev.pre_audit_information,
                          type_of_facility: e.target.value,
                        },
                      }))
                    }
                    className={editableInputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Audit Date</Label>
                  <Input
                    type="date"
                    value={form.audit_date}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        audit_date: e.target.value,
                      }))
                    }
                    className={editableInputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Total Operating Hours / Day</Label>
                  <Input
                    type="number"
                    value={
                      form.pre_audit_information.total_operating_hours_per_day
                    }
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pre_audit_information: {
                          ...prev.pre_audit_information,
                          total_operating_hours_per_day: e.target.value,
                        },
                      }))
                    }
                    className={editableInputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label>HVAC Operating Hours / Day</Label>
                  <Input
                    type="number"
                    value={
                      form.pre_audit_information.hvac_operating_hours_per_day
                    }
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pre_audit_information: {
                          ...prev.pre_audit_information,
                          hvac_operating_hours_per_day: e.target.value,
                        },
                      }))
                    }
                    className={editableInputClass}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Season / Ambient Conditions</Label>
                <Textarea
                  value={form.pre_audit_information.season_ambient_conditions}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      pre_audit_information: {
                        ...prev.pre_audit_information,
                        season_ambient_conditions: e.target.value,
                      },
                    }))
                  }
                  className={editableInputClass}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Audit Dates</Label>
                  {(
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          pre_audit_information: {
                            ...prev.pre_audit_information,
                            audit_dates: [
                              ...prev.pre_audit_information.audit_dates,
                              "",
                            ],
                          },
                        }))
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Date
                    </Button>
                  )}
                </div>

                {form.pre_audit_information.audit_dates.map((date, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) =>
                        setForm((prev) => {
                          const next = [
                            ...prev.pre_audit_information.audit_dates,
                          ];
                          next[idx] = e.target.value;
                          return {
                            ...prev,
                            pre_audit_information: {
                              ...prev.pre_audit_information,
                              audit_dates: next,
                            },
                          };
                        })
                      }
                      className={editableInputClass}
                    />
                    {form.pre_audit_information.audit_dates.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              pre_audit_information: {
                                ...prev.pre_audit_information,
                                audit_dates:
                                  prev.pre_audit_information.audit_dates.filter(
                                    (_, i) => i !== idx,
                                  ),
                              },
                            }))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Auditor Team Members</Label>
                  {(
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          pre_audit_information: {
                            ...prev.pre_audit_information,
                            auditor_team_members_names: [
                              ...prev.pre_audit_information
                                .auditor_team_members_names,
                              "",
                            ],
                          },
                        }))
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Member
                    </Button>
                  )}
                </div>

                {form.pre_audit_information.auditor_team_members_names.map(
                  (member, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={member}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [
                              ...prev.pre_audit_information
                                .auditor_team_members_names,
                            ];
                            next[idx] = e.target.value;
                            return {
                              ...prev,
                              pre_audit_information: {
                                ...prev.pre_audit_information,
                                auditor_team_members_names: next,
                              },
                            };
                          })
                        }
                        className={editableInputClass}
                        placeholder={`Member ${idx + 1}`}
                      />
                      {form.pre_audit_information.auditor_team_members_names
                          .length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                pre_audit_information: {
                                  ...prev.pre_audit_information,
                                  auditor_team_members_names:
                                    prev.pre_audit_information.auditor_team_members_names.filter(
                                      (_, i) => i !== idx,
                                    ),
                                },
                              }))
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  ),
                )}
              </div>

              <div className="space-y-4">
                <Label className="text-base">Documents Checklist</Label>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {CHECKLIST_FIELDS.map((item) => (
                    <div
                      key={item.key}
                      className="space-y-3 rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={
                            form.documents_records_to_collect[item.key]
                              ?.available || false
                          }
                          onCheckedChange={(checked) =>
                            setForm((prev) => ({
                              ...prev,
                              documents_records_to_collect:
                                mergeDocumentsChecklist({
                                  ...prev.documents_records_to_collect,
                                  [item.key]: {
                                    ...prev.documents_records_to_collect[
                                      item.key
                                    ],
                                    available: Boolean(checked),
                                  },
                                }),
                            }))
                          }
                          className={editableInputClass}
                        />
                        <Label>{item.label}</Label>
                      </div>
                      <Textarea
                        placeholder="Remarks"
                        value={
                          form.documents_records_to_collect[item.key]
                            ?.remarks || ""
                        }
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            documents_records_to_collect:
                              mergeDocumentsChecklist({
                                ...prev.documents_records_to_collect,
                                [item.key]: {
                                  ...prev.documents_records_to_collect[
                                    item.key
                                  ],
                                  remarks: e.target.value,
                                },
                              }),
                          }))
                        }
                        className={editableInputClass}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">HVAC Equipment Register</Label>
                  {(
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          hvac_equipment_register: [
                            ...prev.hvac_equipment_register,
                            createEquipmentItem(),
                          ],
                        }))
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Equipment
                    </Button>
                  )}
                </div>

                {form.hvac_equipment_register.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-3"
                  >
                    <div className="space-y-2">
                      <Label>Equipment Name</Label>
                      <Input
                        value={item.equipment_name}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [...prev.hvac_equipment_register];
                            next[idx] = {
                              ...next[idx],
                              equipment_name: e.target.value,
                            };
                            return { ...prev, hvac_equipment_register: next };
                          })
                        }
                        className={editableInputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Input
                        value={item.type}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [...prev.hvac_equipment_register];
                            next[idx] = { ...next[idx], type: e.target.value };
                            return { ...prev, hvac_equipment_register: next };
                          })
                        }
                        className={editableInputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Capacity</Label>
                      <Input
                        type="number"
                        value={item.capacity}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [...prev.hvac_equipment_register];
                            next[idx] = {
                              ...next[idx],
                              capacity: e.target.value,
                            };
                            return { ...prev, hvac_equipment_register: next };
                          })
                        }
                        className={editableInputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Power Rating (kW)</Label>
                      <Input
                        type="number"
                        value={item.power_rating_kW}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [...prev.hvac_equipment_register];
                            next[idx] = {
                              ...next[idx],
                              power_rating_kW: e.target.value,
                            };
                            return { ...prev, hvac_equipment_register: next };
                          })
                        }
                        className={editableInputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [...prev.hvac_equipment_register];
                            next[idx] = {
                              ...next[idx],
                              quantity: e.target.value,
                            };
                            return { ...prev, hvac_equipment_register: next };
                          })
                        }
                        className={editableInputClass}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-3">
                      <Label>Remarks</Label>
                      <Textarea
                        value={item.remarks}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [...prev.hvac_equipment_register];
                            next[idx] = {
                              ...next[idx],
                              remarks: e.target.value,
                            };
                            return { ...prev, hvac_equipment_register: next };
                          })
                        }
                        className={editableInputClass}
                      />
                    </div>

                    {form.hvac_equipment_register.length > 1 && (
                        <div className="flex justify-end md:col-span-3">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                hvac_equipment_register:
                                  prev.hvac_equipment_register.filter(
                                    (_, i) => i !== idx,
                                  ),
                              }))
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      )}
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">
                    Chiller Field Test Readings
                  </Label>
                  {(
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          chiller_field_test: {
                            ...prev.chiller_field_test,
                            readings: [
                              ...prev.chiller_field_test.readings,
                              createChillerReading(),
                            ],
                          },
                        }))
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Reading
                    </Button>
                  )}
                </div>

                {form.chiller_field_test.readings.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-3"
                  >
                    <div className="space-y-2">
                      <Label>Chiller Load (TR)</Label>
                      <Input
                        type="number"
                        value={item.chiller_load_TR}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [...prev.chiller_field_test.readings];
                            next[idx] = {
                              ...next[idx],
                              chiller_load_TR: e.target.value,
                            };
                            return {
                              ...prev,
                              chiller_field_test: {
                                ...prev.chiller_field_test,
                                readings: next,
                              },
                            };
                          })
                        }
                        className={editableInputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Power Input (kW)</Label>
                      <Input
                        type="number"
                        value={item.power_input_kW}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [...prev.chiller_field_test.readings];
                            next[idx] = {
                              ...next[idx],
                              power_input_kW: e.target.value,
                            };
                            return {
                              ...prev,
                              chiller_field_test: {
                                ...prev.chiller_field_test,
                                readings: next,
                              },
                            };
                          })
                        }
                        className={editableInputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>CHW In Temp</Label>
                      <Input
                        type="number"
                        value={item.chilled_water_in_temp}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [...prev.chiller_field_test.readings];
                            next[idx] = {
                              ...next[idx],
                              chilled_water_in_temp: e.target.value,
                            };
                            return {
                              ...prev,
                              chiller_field_test: {
                                ...prev.chiller_field_test,
                                readings: next,
                              },
                            };
                          })
                        }
                        className={editableInputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>CHW Out Temp</Label>
                      <Input
                        type="number"
                        value={item.chilled_water_out_temp}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [...prev.chiller_field_test.readings];
                            next[idx] = {
                              ...next[idx],
                              chilled_water_out_temp: e.target.value,
                            };
                            return {
                              ...prev,
                              chiller_field_test: {
                                ...prev.chiller_field_test,
                                readings: next,
                              },
                            };
                          })
                        }
                        className={editableInputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Condenser Water In Temp</Label>
                      <Input
                        type="number"
                        value={item.condenser_water_in_temp}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [...prev.chiller_field_test.readings];
                            next[idx] = {
                              ...next[idx],
                              condenser_water_in_temp: e.target.value,
                            };
                            return {
                              ...prev,
                              chiller_field_test: {
                                ...prev.chiller_field_test,
                                readings: next,
                              },
                            };
                          })
                        }
                        className={editableInputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Condenser Water Out Temp</Label>
                      <Input
                        type="number"
                        value={item.condenser_water_out_temp}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [...prev.chiller_field_test.readings];
                            next[idx] = {
                              ...next[idx],
                              condenser_water_out_temp: e.target.value,
                            };
                            return {
                              ...prev,
                              chiller_field_test: {
                                ...prev.chiller_field_test,
                                readings: next,
                              },
                            };
                          })
                        }
                        className={editableInputClass}
                      />
                    </div>

                    {form.chiller_field_test.readings.length > 1 && (
                        <div className="flex justify-end md:col-span-3">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                chiller_field_test: {
                                  ...prev.chiller_field_test,
                                  readings:
                                    prev.chiller_field_test.readings.filter(
                                      (_, i) => i !== idx,
                                    ),
                                },
                              }))
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      )}
                  </div>
                ))}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Average Load (TR)</Label>
                    <Input
                      value={form.chiller_field_test.average.avg_load_TR}
                      disabled
                      className={editableInputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Average Power (kW)</Label>
                    <Input
                      value={form.chiller_field_test.average.avg_power_kW}
                      disabled
                      className={editableInputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">
                    Auxiliary Power Components
                  </Label>
                  {(
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          auxiliary_power: {
                            ...prev.auxiliary_power,
                            components: [
                              ...prev.auxiliary_power.components,
                              createAuxiliaryComponent(),
                            ],
                          },
                        }))
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Component
                    </Button>
                  )}
                </div>

                {form.auxiliary_power.components.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-2"
                  >
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={item.name}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [...prev.auxiliary_power.components];
                            next[idx] = { ...next[idx], name: e.target.value };
                            return {
                              ...prev,
                              auxiliary_power: {
                                ...prev.auxiliary_power,
                                components: next,
                              },
                            };
                          })
                        }
                        className={editableInputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Power (kW)</Label>
                      <Input
                        type="number"
                        value={item.power_kW}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [...prev.auxiliary_power.components];
                            next[idx] = {
                              ...next[idx],
                              power_kW: e.target.value,
                            };
                            return {
                              ...prev,
                              auxiliary_power: {
                                ...prev.auxiliary_power,
                                components: next,
                              },
                            };
                          })
                        }
                        className={editableInputClass}
                      />
                    </div>

                    {form.auxiliary_power.components.length > 1 && (
                        <div className="flex justify-end md:col-span-2">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                auxiliary_power: {
                                  ...prev.auxiliary_power,
                                  components:
                                    prev.auxiliary_power.components.filter(
                                      (_, i) => i !== idx,
                                    ),
                                },
                              }))
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      )}
                  </div>
                ))}

                <div className="space-y-2">
                  <Label>Total Auxiliary Power Used (kW)</Label>
                  <Input
                    value={form.auxiliary_power.total_auxiliary_power_used_kW}
                    disabled
                    className={editableInputClass}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Cooling Tower Quick Test</Label>
                  {(
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          cooling_tower_quick_test: {
                            ...prev.cooling_tower_quick_test,
                            readings: [
                              ...prev.cooling_tower_quick_test.readings,
                              createCoolingTowerReading(),
                            ],
                          },
                        }))
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Reading
                    </Button>
                  )}
                </div>

                {form.cooling_tower_quick_test.readings.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-3"
                  >
                    <div className="space-y-2">
                      <Label>Inlet Temp</Label>
                      <Input
                        type="number"
                        value={item.inlet_temp}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [
                              ...prev.cooling_tower_quick_test.readings,
                            ];
                            next[idx] = {
                              ...next[idx],
                              inlet_temp: e.target.value,
                            };
                            return {
                              ...prev,
                              cooling_tower_quick_test: {
                                ...prev.cooling_tower_quick_test,
                                readings: next,
                              },
                            };
                          })
                        }
                        className={editableInputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Outlet Temp</Label>
                      <Input
                        type="number"
                        value={item.outlet_temp}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [
                              ...prev.cooling_tower_quick_test.readings,
                            ];
                            next[idx] = {
                              ...next[idx],
                              outlet_temp: e.target.value,
                            };
                            return {
                              ...prev,
                              cooling_tower_quick_test: {
                                ...prev.cooling_tower_quick_test,
                                readings: next,
                              },
                            };
                          })
                        }
                        className={editableInputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Ambient Temp</Label>
                      <Input
                        type="number"
                        value={item.ambient_temp}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [
                              ...prev.cooling_tower_quick_test.readings,
                            ];
                            next[idx] = {
                              ...next[idx],
                              ambient_temp: e.target.value,
                            };
                            return {
                              ...prev,
                              cooling_tower_quick_test: {
                                ...prev.cooling_tower_quick_test,
                                readings: next,
                              },
                            };
                          })
                        }
                        className={editableInputClass}
                      />
                    </div>

                    {form.cooling_tower_quick_test.readings.length > 1 && (
                        <div className="flex justify-end md:col-span-3">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                cooling_tower_quick_test: {
                                  ...prev.cooling_tower_quick_test,
                                  readings:
                                    prev.cooling_tower_quick_test.readings.filter(
                                      (_, i) => i !== idx,
                                    ),
                                },
                              }))
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      )}
                  </div>
                ))}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Average Inlet Temp</Label>
                    <Input
                      value={
                        form.cooling_tower_quick_test.average.avg_inlet_temp
                      }
                      disabled
                      className={editableInputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Average Outlet Temp</Label>
                    <Input
                      value={
                        form.cooling_tower_quick_test.average.avg_outlet_temp
                      }
                      disabled
                      className={editableInputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base">Summary</Label>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Average Cooling Produced (TR)</Label>
                    <Input
                      value={form.summary.average_cooling_produced_TR}
                      disabled
                      className={editableInputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Average Chiller Power Used (kW)</Label>
                    <Input
                      value={form.summary.average_chiller_power_used_kW}
                      disabled
                      className={editableInputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Auxiliary Power Used (kW)</Label>
                    <Input
                      value={form.summary.total_auxiliary_power_used_kW}
                      disabled
                      className={editableInputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Plant Power (kW)</Label>
                    <Input
                      value={form.summary.total_plant_power_kW}
                      disabled
                      className={editableInputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plant Efficiency (kW/TR)</Label>
                    <Input
                      value={form.summary.plant_efficiency_kW_per_TR}
                      disabled
                      className={editableInputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Coefficient of Performance</Label>
                    <Input
                      value={form.summary.coefficient_of_performance}
                      disabled
                      className={editableInputClass}
                    />
                  </div>
                </div>
              </div>
    </div>
  );
}
