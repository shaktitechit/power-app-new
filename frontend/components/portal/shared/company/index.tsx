"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/portal/layout/dashboard-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/portal/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/portal/ui/card";
import { Button } from "@/components/portal/ui/button";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { Textarea } from "@/components/portal/ui/textarea";
import {
  Building2,
  ImagePlus,
  Landmark,
  Mail,
  MapPin,
  Palette,
  Plus,
  Save,
  Trash2,
  Wallet,
} from "lucide-react";
import { THEME_PALETTES } from "@/components/portal/lib/companyBranding";
import { toastHandler } from "@/components/portal/lib/toast";
import { cn } from "@/components/portal/lib/utils";
import { toFileManagementContentUrl } from "@/components/portal/lib/fileManagementUrls";
import type {
  Company,
  CompanyBranchOffice,
  CompanyWritableFields,
} from "@/store/slices/companyApiSlice";
import {
  useCreateCompanyMutation,
  useGetCompaniesQuery,
  useUpdateCompanyMutation,
} from "@/store/slices/companyApiSlice";

type BranchOfficeForm = CompanyBranchOffice & { client_id: string };

type CompanyFormState = Omit<
  CompanyWritableFields,
  | "invoice_footer_note"
  | "is_default"
  | "drug_license"
  | "fssai_license"
  | "gstin"
  | "cin"
  | "pan"
  | "address"
  | "city"
  | "state"
  | "pincode"
  | "country"
  | "branch_offices"
> & {
  branch_offices: BranchOfficeForm[];
};

function newClientId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyBranchOffice(isHead = false): BranchOfficeForm {
  return {
    client_id: newClientId(),
    name: isHead ? "Head Office" : "",
    gstin: "",
    cin: "",
    pan: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    country: "",
    is_head_office: isHead,
  };
}

function hydrateBranchOffices(company: Company): BranchOfficeForm[] {
  if (company.branch_offices?.length) {
    const offices = company.branch_offices.map((office) => ({
      client_id: office._id || newClientId(),
      _id: office._id,
      name: office.name || "",
      gstin: office.gstin || "",
      cin: office.cin || "",
      pan: office.pan || "",
      address: office.address || "",
      city: office.city || "",
      state: office.state || "",
      pincode: office.pincode || "",
      country: office.country || "",
      is_head_office: Boolean(office.is_head_office),
    }));
    if (!offices.some((office) => office.is_head_office) && offices[0]) {
      offices[0].is_head_office = true;
    }
    return offices;
  }

  return [
    {
      ...emptyBranchOffice(true),
      gstin: company.gstin || "",
      cin: company.cin || "",
      pan: company.pan || "",
      address: company.address || "",
      city: company.city || "",
      state: company.state || "",
      pincode: company.pincode || "",
      country: company.country || "",
    },
  ];
}

function sanitizeBranchOffices(offices: BranchOfficeForm[]): CompanyBranchOffice[] {
  const cleaned = offices.map((office) => ({
    ...(office._id ? { _id: office._id } : {}),
    name: office.name.trim(),
    gstin: office.gstin.trim(),
    cin: office.cin.trim(),
    pan: office.pan.trim(),
    address: office.address.trim(),
    city: office.city.trim(),
    state: office.state.trim(),
    pincode: office.pincode.trim(),
    country: office.country.trim(),
    is_head_office: Boolean(office.is_head_office),
  }));

  if (!cleaned.some((office) => office.is_head_office) && cleaned[0]) {
    cleaned[0].is_head_office = true;
  }

  const headIndex = cleaned.findIndex((office) => office.is_head_office);
  return cleaned.map((office, index) => ({
    ...office,
    is_head_office: index === headIndex,
  }));
}

const EMPTY_FORM: CompanyFormState = {
  legal_name: "",
  trade_name: "",
  tagline: "",
  email: "",
  billing_email: "",
  phone: "",
  website: "",
  logo_url: "",
  favicon_url: "",
  primary_color: "#636ccb",
  secondary_color: "#6e8cfb",
  theme_palette: "default",
  branch_offices: [emptyBranchOffice(true)],
  currency: "",
  timezone: "",
  financial_year: "",
  bank_name: "",
  account_name: "",
  account_number: "",
  ifsc_code: "",
  branch_name: "",
  account_type: "",
  upi_id: "",
  swift_code: "",
};

function companyToForm(company: Company): CompanyFormState {
  return {
    legal_name: company.legal_name || "",
    trade_name: company.trade_name || "",
    tagline: company.tagline || "",
    email: company.email || "",
    billing_email: company.billing_email || "",
    phone: company.phone || "",
    website: company.website || "",
    logo_url: company.logo_url || "",
    favicon_url: company.favicon_url || "",
    primary_color: company.primary_color || "#636ccb",
    secondary_color: company.secondary_color || "#6e8cfb",
    theme_palette: company.theme_palette || "default",
    branch_offices: hydrateBranchOffices(company),
    currency: company.currency || "",
    timezone: company.timezone || "",
    financial_year: company.financial_year || "",
    bank_name: company.bank_name || "",
    account_name: company.account_name || "",
    account_number: company.account_number || "",
    ifsc_code: company.ifsc_code || "",
    branch_name: company.branch_name || "",
    account_type: company.account_type || "",
    upi_id: company.upi_id || "",
    swift_code: company.swift_code || "",
  };
}

function formToPayload(form: CompanyFormState): Omit<
  CompanyWritableFields,
  | "drug_license"
  | "fssai_license"
  | "gstin"
  | "cin"
  | "pan"
  | "address"
  | "city"
  | "state"
  | "pincode"
  | "country"
  | "invoice_footer_note"
> {
  return {
    legal_name: form.legal_name.trim(),
    trade_name: form.trade_name.trim(),
    tagline: form.tagline.trim(),
    email: form.email.trim(),
    billing_email: form.billing_email.trim(),
    phone: form.phone.trim(),
    website: form.website.trim(),
    logo_url: form.logo_url.trim(),
    favicon_url: form.favicon_url.trim(),
    primary_color: form.primary_color.trim() || "#636ccb",
    secondary_color: form.secondary_color.trim() || "#6e8cfb",
    theme_palette: form.theme_palette.trim() || "default",
    branch_offices: sanitizeBranchOffices(form.branch_offices),
    currency: form.currency.trim(),
    timezone: form.timezone.trim(),
    financial_year: form.financial_year.trim(),
    bank_name: form.bank_name.trim(),
    account_name: form.account_name.trim(),
    account_number: form.account_number.trim(),
    ifsc_code: form.ifsc_code.trim(),
    branch_name: form.branch_name.trim(),
    account_type: form.account_type.trim(),
    upi_id: form.upi_id.trim(),
    swift_code: form.swift_code.trim(),
    is_default: true,
  };
}

function BranchTextField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-foreground">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-input"
      />
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  id: keyof CompanyFormState;
  label: string;
  value: string;
  onChange: (id: keyof CompanyFormState, value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(id, event.target.value)}
        className="bg-input"
      />
    </div>
  );
}

const MAX_BRAND_IMAGE_BYTES = 5 * 1024 * 1024;

function isAllowedBrandImage(file: File) {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|svg|ico|bmp)$/i.test(file.name);
}

function BrandImageField({
  label,
  hint,
  storedUrl,
  file,
  variant,
  onSelect,
  onClear,
}: {
  label: string;
  hint: string;
  storedUrl: string;
  file: File | null;
  variant: "logo" | "favicon";
  onSelect: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setObjectUrl("");
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  const previewUrl = objectUrl || toFileManagementContentUrl(storedUrl);
  const previewBoxClass =
    variant === "favicon"
      ? "h-20 w-20"
      : "h-28 w-full max-w-[220px]";

  return (
    <div className="space-y-2">
      <Label className="text-foreground">{label}</Label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div
          className={cn(
            "flex items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30",
            previewBoxClass,
          )}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={`${label} preview`}
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-xs text-muted-foreground">{hint}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              {previewUrl ? "Replace" : "Upload"}
            </Button>
            {previewUrl ? (
              <Button type="button" variant="ghost" size="sm" onClick={onClear}>
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            ) : null}
          </div>
          {file ? (
            <p className="truncate text-xs text-muted-foreground">{file.name}</p>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.ico,.svg"
        className="hidden"
        onChange={(event) => {
          const nextFile = event.target.files?.[0];
          event.target.value = "";
          if (!nextFile) return;
          if (!isAllowedBrandImage(nextFile)) {
            toast.error("Please choose an image file");
            return;
          }
          if (nextFile.size > MAX_BRAND_IMAGE_BYTES) {
            toast.error("Image must be 5 MB or smaller");
            return;
          }
          onSelect(nextFile);
        }}
      />
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: keyof CompanyFormState;
  label: string;
  value: string;
  onChange: (id: keyof CompanyFormState, value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          type="color"
          value={value || "#636ccb"}
          onChange={(event) => onChange(id, event.target.value)}
          className="h-9 w-12 cursor-pointer p-1"
          aria-label={label}
        />
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(id, event.target.value)}
          className="bg-input"
        />
      </div>
    </div>
  );
}

export default function CompanyPage() {
  const { data, isLoading, isError, refetch } = useGetCompaniesQuery();
  const [createCompany, { isLoading: isCreating }] = useCreateCompanyMutation();
  const [updateCompany, { isLoading: isUpdating }] = useUpdateCompanyMutation();
  const [form, setForm] = useState<CompanyFormState>(EMPTY_FORM);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);

  const company = useMemo(() => {
    const rows = data?.data ?? [];
    return rows.find((row) => row.is_default) ?? rows[0] ?? null;
  }, [data]);

  useEffect(() => {
    if (company) {
      setForm(companyToForm(company));
      setLogoFile(null);
      setFaviconFile(null);
    }
  }, [company]);

  const selectedPaletteId = useMemo(() => {
    const match = THEME_PALETTES.find(
      (palette) =>
        palette.id === form.theme_palette ||
        (palette.primary.toLowerCase() === form.primary_color.toLowerCase() &&
          palette.secondary.toLowerCase() === form.secondary_color.toLowerCase()),
    );
    return match?.id ?? "custom";
  }, [form.theme_palette, form.primary_color, form.secondary_color]);

  const handleChange = (id: keyof CompanyFormState, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [id]: value };
      if (id === "primary_color" || id === "secondary_color") {
        const match = THEME_PALETTES.find(
          (palette) =>
            palette.primary.toLowerCase() === next.primary_color.toLowerCase() &&
            palette.secondary.toLowerCase() === next.secondary_color.toLowerCase(),
        );
        next.theme_palette = match?.id ?? "custom";
      }
      return next;
    });
  };

  const handlePaletteSelect = (palette: (typeof THEME_PALETTES)[number]) => {
    setForm((prev) => ({
      ...prev,
      theme_palette: palette.id,
      primary_color: palette.primary,
      secondary_color: palette.secondary,
    }));
  };

  const handleBranchChange = (
    clientId: string,
    field: keyof CompanyBranchOffice,
    value: string | boolean,
  ) => {
    setForm((prev) => ({
      ...prev,
      branch_offices: prev.branch_offices.map((office) => {
        if (office.client_id !== clientId) {
          if (field === "is_head_office" && value === true) {
            return { ...office, is_head_office: false };
          }
          return office;
        }
        return { ...office, [field]: value };
      }),
    }));
  };

  const addBranchOffice = () => {
    setForm((prev) => ({
      ...prev,
      branch_offices: [...prev.branch_offices, emptyBranchOffice(false)],
    }));
  };

  const removeBranchOffice = (clientId: string) => {
    setForm((prev) => {
      if (prev.branch_offices.length <= 1) return prev;
      const remaining = prev.branch_offices.filter((office) => office.client_id !== clientId);
      if (!remaining.some((office) => office.is_head_office) && remaining[0]) {
        remaining[0] = { ...remaining[0], is_head_office: true };
      }
      return { ...prev, branch_offices: remaining };
    });
  };

  const handleSave = async () => {
    const payload = formToPayload(form);

    await toastHandler({
      action: async () => {
        if (company?._id) {
          await updateCompany({
            id: company._id,
            ...payload,
            ...(logoFile ? { logo: logoFile } : {}),
            ...(faviconFile ? { favicon: faviconFile } : {}),
          }).unwrap();
        } else {
          await createCompany({
            ...payload,
            ...(logoFile ? { logo: logoFile } : {}),
            ...(faviconFile ? { favicon: faviconFile } : {}),
          }).unwrap();
        }
        setLogoFile(null);
        setFaviconFile(null);
        await refetch();
      },
      loading: company?._id ? "Saving company..." : "Creating company...",
      success: company?._id
        ? "Company updated successfully"
        : "Company created successfully",
    });
  };

  const isSaving = isCreating || isUpdating;

  if (isLoading) {
    return (
      <DashboardLayout title="Company" subtitle="Manage company profile">
        <p className="py-10 text-sm text-muted-foreground">Loading company...</p>
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout title="Company" subtitle="Manage company profile">
        <div className="flex flex-col items-start gap-3 py-10">
          <p className="text-sm text-muted-foreground">Unable to load company details.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Company" subtitle="Legal, branding, and billing details">
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
        <Tabs defaultValue="identity" className="gap-4">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 p-1 sm:w-fit">
            <TabsTrigger value="identity" className="gap-1.5 px-3 py-2 sm:py-1">
              <Building2 className="h-4 w-4" />
              Identity
            </TabsTrigger>
            <TabsTrigger value="contact" className="gap-1.5 px-3 py-2 sm:py-1">
              <Mail className="h-4 w-4" />
              Contact
            </TabsTrigger>
            <TabsTrigger value="branding" className="gap-1.5 px-3 py-2 sm:py-1">
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="address" className="gap-1.5 px-3 py-2 sm:py-1">
              <MapPin className="h-4 w-4" />
              Address
            </TabsTrigger>
            <TabsTrigger value="finance" className="gap-1.5 px-3 py-2 sm:py-1">
              <Wallet className="h-4 w-4" />
              Finance
            </TabsTrigger>
            <TabsTrigger value="bank" className="gap-1.5 px-3 py-2 sm:py-1">
              <Landmark className="h-4 w-4" />
              Bank
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identity">
            <Card className="border-border bg-card">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base text-card-foreground sm:text-lg">Identity</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Legal name, trade name, and tagline
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 p-4 pt-0 sm:grid-cols-2 sm:p-6 sm:pt-0">
                <Field id="legal_name" label="Legal name" value={form.legal_name} onChange={handleChange} />
                <Field id="trade_name" label="Trade name" value={form.trade_name} onChange={handleChange} />
                <div className="sm:col-span-2">
                  <Field
                    id="tagline"
                    label="Tagline"
                    value={form.tagline}
                    onChange={handleChange}
                    placeholder="Energy and Power Consultants • Chartered Engineer • BEE Certified Auditors"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <Card className="border-border bg-card">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base text-card-foreground sm:text-lg">Contact</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Email, phone, and website
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 p-4 pt-0 sm:grid-cols-2 sm:p-6 sm:pt-0">
                <Field id="email" label="Email" type="email" value={form.email} onChange={handleChange} />
                <Field id="billing_email" label="Billing email" type="email" value={form.billing_email} onChange={handleChange} />
                <Field id="phone" label="Phone" value={form.phone} onChange={handleChange} />
                <Field id="website" label="Website" value={form.website} onChange={handleChange} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding">
            <Card className="border-border bg-card">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base text-card-foreground sm:text-lg">Branding</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Logo, favicon, and theme colors
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 p-4 pt-0 sm:grid-cols-2 sm:p-6 sm:pt-0">
                <BrandImageField
                  label="Logo"
                  hint="PNG, JPG, SVG or WEBP. Shown on invoices and reports."
                  storedUrl={form.logo_url}
                  file={logoFile}
                  variant="logo"
                  onSelect={setLogoFile}
                  onClear={() => {
                    setLogoFile(null);
                    handleChange("logo_url", "");
                  }}
                />
                <BrandImageField
                  label="Favicon"
                  hint="Square PNG, ICO or SVG. Best at 32x32 or 64x64."
                  storedUrl={form.favicon_url}
                  file={faviconFile}
                  variant="favicon"
                  onSelect={setFaviconFile}
                  onClear={() => {
                    setFaviconFile(null);
                    handleChange("favicon_url", "");
                  }}
                />
                <div className="space-y-3 sm:col-span-2">
                  <div>
                    <Label className="text-foreground">Theme palette</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Choose a palette or fine-tune the colors below
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {THEME_PALETTES.map((palette) => {
                      const selected = selectedPaletteId === palette.id;
                      return (
                        <button
                          key={palette.id}
                          type="button"
                          onClick={() => handlePaletteSelect(palette)}
                          className={cn(
                            "rounded-lg border p-3 text-left transition-colors",
                            selected
                              ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                              : "border-border hover:border-primary/40 hover:bg-muted/40",
                          )}
                        >
                          <div className="mb-2 flex overflow-hidden rounded-md">
                            <span
                              className="h-7 flex-1"
                              style={{ backgroundColor: palette.primary }}
                            />
                            <span
                              className="h-7 flex-1"
                              style={{ backgroundColor: palette.secondary }}
                            />
                          </div>
                          <p className="text-sm font-medium text-foreground">{palette.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <ColorField id="primary_color" label="Primary color" value={form.primary_color} onChange={handleChange} />
                <ColorField
                  id="secondary_color"
                  label="Secondary color"
                  value={form.secondary_color}
                  onChange={handleChange}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="address">
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <CardTitle className="text-base text-card-foreground sm:text-lg">Address</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Head office and branch offices, each with GSTIN, PAN, and CIN
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addBranchOffice}>
                  <Plus className="h-4 w-4" />
                  Add branch
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                {form.branch_offices.map((office, index) => (
                  <div
                    key={office.client_id}
                    className="space-y-4 rounded-lg border border-border bg-muted/20 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-medium text-foreground">
                        {office.name.trim() || (office.is_head_office ? "Head office" : `Branch ${index + 1}`)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant={office.is_head_office ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleBranchChange(office.client_id, "is_head_office", true)}
                        >
                          {office.is_head_office ? "Head office" : "Set as head office"}
                        </Button>
                        {form.branch_offices.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBranchOffice(office.client_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <BranchTextField
                        id={`office-name-${office.client_id}`}
                        label="Office name"
                        value={office.name}
                        onChange={(value) => handleBranchChange(office.client_id, "name", value)}
                      />
                      <BranchTextField
                        id={`office-gstin-${office.client_id}`}
                        label="GSTIN"
                        value={office.gstin}
                        onChange={(value) => handleBranchChange(office.client_id, "gstin", value)}
                      />
                      <BranchTextField
                        id={`office-pan-${office.client_id}`}
                        label="PAN"
                        value={office.pan}
                        onChange={(value) => handleBranchChange(office.client_id, "pan", value)}
                      />
                      <BranchTextField
                        id={`office-cin-${office.client_id}`}
                        label="CIN"
                        value={office.cin}
                        onChange={(value) => handleBranchChange(office.client_id, "cin", value)}
                      />
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor={`office-address-${office.client_id}`} className="text-foreground">
                          Address
                        </Label>
                        <Textarea
                          id={`office-address-${office.client_id}`}
                          value={office.address}
                          onChange={(event) =>
                            handleBranchChange(office.client_id, "address", event.target.value)
                          }
                          className="bg-input min-h-20"
                        />
                      </div>
                      <BranchTextField
                        id={`office-city-${office.client_id}`}
                        label="City"
                        value={office.city}
                        onChange={(value) => handleBranchChange(office.client_id, "city", value)}
                      />
                      <BranchTextField
                        id={`office-state-${office.client_id}`}
                        label="State"
                        value={office.state}
                        onChange={(value) => handleBranchChange(office.client_id, "state", value)}
                      />
                      <BranchTextField
                        id={`office-pincode-${office.client_id}`}
                        label="Pincode"
                        value={office.pincode}
                        onChange={(value) => handleBranchChange(office.client_id, "pincode", value)}
                      />
                      <BranchTextField
                        id={`office-country-${office.client_id}`}
                        label="Country"
                        value={office.country}
                        onChange={(value) => handleBranchChange(office.client_id, "country", value)}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finance">
            <Card className="border-border bg-card">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base text-card-foreground sm:text-lg">Finance</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Currency, timezone, and financial year
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 p-4 pt-0 sm:grid-cols-2 sm:p-6 sm:pt-0">
                <Field id="currency" label="Currency" value={form.currency} onChange={handleChange} />
                <Field id="timezone" label="Timezone" value={form.timezone} onChange={handleChange} />
                <Field id="financial_year" label="Financial year" value={form.financial_year} onChange={handleChange} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bank">
            <Card className="border-border bg-card">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base text-card-foreground sm:text-lg">Bank details</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Account and payment information
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 p-4 pt-0 sm:grid-cols-2 sm:p-6 sm:pt-0">
                <Field id="bank_name" label="Bank name" value={form.bank_name} onChange={handleChange} />
                <Field id="account_name" label="Account name" value={form.account_name} onChange={handleChange} />
                <Field id="account_number" label="Account number" value={form.account_number} onChange={handleChange} />
                <Field id="ifsc_code" label="IFSC code" value={form.ifsc_code} onChange={handleChange} />
                <Field id="branch_name" label="Branch name" value={form.branch_name} onChange={handleChange} />
                <Field id="account_type" label="Account type" value={form.account_type} onChange={handleChange} />
                <Field id="upi_id" label="UPI ID" value={form.upi_id} onChange={handleChange} />
                <Field id="swift_code" label="SWIFT code" value={form.swift_code} onChange={handleChange} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pb-4">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : company?._id ? "Save changes" : "Create company"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
