"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/portal/layout/dashboard-layout";
import { DataTable, Column } from "@/components/portal/ui/data-table";
import { Button } from "@/components/portal/ui/button";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { StatsCard } from "@/components/portal/ui/stats-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/portal/ui/select";
import {
  Plus,
  Search,
  Receipt,
  Send,
  CircleCheck,
  FileEdit,
  ScrollText,
  Building2,
  Pencil,
} from "lucide-react";
import {
  type Quotation,
  useGetQuotationsQuery,
} from "@/store/slices/quotationApiSlice";
import {
  type Enquiry,
  useGetEnquiryByIdQuery,
} from "@/store/slices/enquiryApiSlice";
import {
  useGetFacilitiesQuery,
} from "@/store/slices/facilityApiSlice";
import { useAppSelector } from "@/store/hooks";
import { CreateQuotationForm } from "@/components/portal/shared/components/quotation/create-quotation-form";
import { CreateFacilityForm } from "@/components/portal/shared/components/facility/create-facility-form";
import { EditFacilityForm } from "@/components/portal/shared/components/facility/edit-facility-form";
import { QuotationStatusPill } from "@/components/portal/shared/components/quotation/quotation-status-pill";
import { QuotationPdfListActions } from "@/components/portal/shared/components/quotation/quotation-pdf-preview";
import { facilityExpectedValue } from "@/components/portal/lib/facilityConstants";
import {
  buildFacilitiesByEnquiryNumber,
  linkedFacilitiesForQuotation,
} from "@/components/portal/lib/facilityQuotationLink";
import {
  QUOTATION_STATUS_OPTIONS,
  formatDisplayDate,
  formatInr,
  quotationCustomerName,
  quotationEnquiryId,
  quotationEnquiryLabel,
} from "@/components/portal/lib/quotationConstants";

const PAGE_SIZE = 10;

export default function QuotationsPage() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = user?.role === "super_admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createFacilityOpen, setCreateFacilityOpen] = useState(false);
  const [facilitySourceQuotation, setFacilitySourceQuotation] =
    useState<Quotation | null>(null);
  const [editFacilityOpen, setEditFacilityOpen] = useState(false);
  const [editFacilityId, setEditFacilityId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useGetQuotationsQuery();
  const { data: facilitiesData, refetch: refetchFacilities } = useGetFacilitiesQuery(
    undefined,
    { skip: !isSuperAdmin },
  );

  const sourceEnquiryId = facilitySourceQuotation
    ? quotationEnquiryId(facilitySourceQuotation)
    : undefined;

  const { data: enquiryDetailRes } = useGetEnquiryByIdQuery(sourceEnquiryId!, {
    skip: !createFacilityOpen || !sourceEnquiryId,
  });

  const enquiryForCreate = useMemo((): Enquiry | null => {
    const enquiry = enquiryDetailRes?.data;
    if (!enquiry || !facilitySourceQuotation) return null;
    return {
      ...enquiry,
      accepted_quotation_id: facilitySourceQuotation._id,
    };
  }, [enquiryDetailRes?.data, facilitySourceQuotation]);

  const quotations = data?.data ?? [];
  const facilities = facilitiesData?.data ?? [];

  const facilitiesByEnquiryNumber = useMemo(
    () => buildFacilitiesByEnquiryNumber(facilities),
    [facilities],
  );

  const refetchAll = async () => {
    await Promise.all([refetch(), ...(isSuperAdmin ? [refetchFacilities()] : [])]);
  };

  const filtered = useMemo(() => {
    let list = quotations;
    if (filterStatus !== "all") {
      list = list.filter((row) => row.status === filterStatus);
    }
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter((row) => {
        const haystack = [
          row.quotationRef,
          row.subject,
          row.reference,
          quotationCustomerName(row),
          quotationEnquiryLabel(row),
          row.status,
          row.customer?.email,
          row.customer?.kindAttn,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }
    return list;
  }, [quotations, filterStatus, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const counts = useMemo(() => {
    return {
      total: quotations.length,
      draft: quotations.filter((row) => row.status === "DRAFT").length,
      sent: quotations.filter((row) => row.status === "SENT").length,
      accepted: quotations.filter((row) => row.status === "ACCEPTED").length,
    };
  }, [quotations]);

  const columns: Column<Quotation>[] = useMemo(() => {
    const base: Column<Quotation>[] = [
      {
        key: "quotationRef",
        header: "Reference",
        render: (row) => (
          <span className="font-medium text-foreground">{row.quotationRef}</span>
        ),
      },
      {
        key: "customer",
        header: "Customer",
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">{quotationCustomerName(row)}</p>
            {row.customer?.kindAttn ? (
              <p className="truncate text-xs text-muted-foreground">{row.customer.kindAttn}</p>
            ) : null}
          </div>
        ),
      },
      {
        key: "enquiry",
        header: "Enquiry",
        hideOnMobile: true,
        render: (row) => (
          <span className="text-sm text-foreground">{quotationEnquiryLabel(row)}</span>
        ),
      },
      {
        key: "quotationDate",
        header: "Date",
        hideOnMobile: true,
        render: (row) => (
          <span className="text-sm text-foreground">{formatDisplayDate(row.quotationDate)}</span>
        ),
      },
      {
        key: "grandTotal",
        header: "Amount",
        render: (row) => (
          <span className="text-sm font-medium text-foreground">
            {formatInr(row.financials?.roundedGrandTotal ?? row.financials?.grandTotal)}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <QuotationStatusPill status={row.status} />,
      },
    ];

    if (isSuperAdmin) {
      base.push({
        key: "facilities",
        header: "Facilities",
        hideOnMobile: true,
        render: (row) => {
          if (row.status !== "ACCEPTED") {
            return <span className="text-muted-foreground">—</span>;
          }

          const linkedFacilities = linkedFacilitiesForQuotation(
            row,
            facilities,
            facilitiesByEnquiryNumber,
          );
          const linked = linkedFacilities.length > 0;
          const enquiryId = quotationEnquiryId(row);

          return (
            <div className="space-y-2" onClick={(event) => event.stopPropagation()}>
              <p className="text-sm">
                {linked ? (
                  <span className="text-emerald-700 dark:text-emerald-400">
                    {linkedFacilities.length > 1
                      ? `${linkedFacilities.length} facilities`
                      : "Linked"}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not created</span>
                )}
              </p>

              {linkedFacilities.length > 0 ? (
                <div className="flex max-w-xs flex-wrap gap-1.5">
                  {linkedFacilities.map((facility) => {
                    const expectedValue = facilityExpectedValue(facility);
                    return (
                      <span
                        key={facility._id}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium"
                      >
                        <span className="max-w-[9rem] truncate">
                          {facility.audit_type ?? "Facility"}
                        </span>
                        {expectedValue != null ? (
                          <span className="shrink-0 font-semibold text-primary">
                            {formatInr(expectedValue)}
                          </span>
                        ) : null}
                      </span>
                    );
                  })}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-1.5">
                {linked ? (
                  linkedFacilities.map((facility) => (
                    <Button
                      key={facility._id}
                      variant="outline"
                      size="sm"
                      className="h-8"
                      title={facility.audit_type ?? "Edit facility"}
                      onClick={() => {
                        setEditFacilityId(facility._id);
                        setEditFacilityOpen(true);
                      }}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      {linkedFacilities.length > 1
                        ? facility.audit_type?.split(" ")[0] ?? "Edit"
                        : "Edit"}
                    </Button>
                  ))
                ) : (
                  <Button
                    size="sm"
                    className="h-8"
                    disabled={!enquiryId}
                    title={
                      enquiryId
                        ? "Create facility from accepted quotation"
                        : "Link an enquiry before creating a facility"
                    }
                    onClick={() => {
                      setFacilitySourceQuotation(row);
                      setCreateFacilityOpen(true);
                    }}
                  >
                    <Building2 className="mr-1 h-3.5 w-3.5" />
                    Create
                  </Button>
                )}
              </div>
            </div>
          );
        },
      });
    }

    base.push({
      key: "actions",
      header: "Actions",
      render: (row) => <QuotationPdfListActions quotation={row} />,
    });

    return base;
  }, [facilities, facilitiesByEnquiryNumber, isSuperAdmin]);

  const QuotationsTable = DataTable as any;

  return (
    <DashboardLayout title="Quotations" subtitle="Sales quotations and commercial offers">
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatsCard title="Total" value={counts.total} icon={Receipt} />
        <StatsCard title="Draft" value={counts.draft} icon={FileEdit} />
        <StatsCard title="Sent" value={counts.sent} icon={Send} />
        <StatsCard title="Accepted" value={counts.accepted} icon={CircleCheck} />
      </div>

      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="relative min-w-0 w-full flex-1 sm:max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by reference, customer, enquiry…"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
            className="bg-input pl-9"
          />
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
          <div className="w-full sm:w-44">
            <Label className="sr-only">Status</Label>
            <Select
              value={filterStatus}
              onValueChange={(value) => {
                setFilterStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {QUOTATION_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/terms-conditions")}
            className="w-full sm:w-auto whitespace-nowrap"
          >
            <ScrollText className="mr-2 h-4 w-4" />
            Terms & conditions
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto whitespace-nowrap">
            <Plus className="mr-2 h-4 w-4" />
            Create quotation
          </Button>
        </div>
      </div>

      <QuotationsTable
        columns={columns}
        data={paginated}
        loading={isLoading}
        onRowClick={(row?: Quotation) => row && router.push(`/quotations/${row._id}`)}
        emptyMessage="No quotations yet"
      />

      <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground sm:text-sm">
          {filtered.length === 0
            ? quotations.length === 0
              ? "No quotations yet."
              : "No quotations match your search or filters."
            : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length} quotations`}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <CreateQuotationForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onComplete={() => {
          setPage(1);
          void refetchAll();
        }}
      />

      {isSuperAdmin ? (
        <>
          <CreateFacilityForm
            open={createFacilityOpen}
            fromEnquiry={enquiryForCreate}
            onOpenChange={(open) => {
              setCreateFacilityOpen(open);
              if (!open) setFacilitySourceQuotation(null);
            }}
            onComplete={() => void refetchAll()}
          />

          <EditFacilityForm
            open={editFacilityOpen}
            onOpenChange={(open) => {
              setEditFacilityOpen(open);
              if (!open) setEditFacilityId(null);
            }}
            onComplete={() => void refetchAll()}
            facilityId={editFacilityId}
          />
        </>
      ) : null}
    </DashboardLayout>
  );
}
