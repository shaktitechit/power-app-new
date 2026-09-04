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
import { Tabs, TabsList, TabsTrigger } from "@/components/portal/ui/tabs";
import {
  Plus,
  Search,
  Mail,
  Send,
  CircleCheck,
  FileEdit,
} from "lucide-react";
import {
  type ExpressionOfInterest,
  useGetEoisQuery,
  useApproveEoiSignatoryMutation,
} from "@/store/slices/eoiApiSlice";
import { CreateEoiForm } from "@/components/portal/shared/components/eoi/create-eoi-form";
import { EoiStatusPill } from "@/components/portal/shared/components/eoi/eoi-status-pill";
import { EoiPdfListActions } from "@/components/portal/shared/components/eoi/eoi-pdf-preview";
import { SignatoryApprovalPill } from "@/components/portal/shared/components/signatory-approval-pill";
import { SignatoryApproveButton } from "@/components/portal/shared/components/signatory-approve-button";
import { useAppSelector } from "@/store/hooks";
import { formatDisplayDate } from "@/components/portal/lib/quotationConstants";
import {
  EOI_STATUS_OPTIONS,
  eoiEnquiryLabel,
  eoiRecipientLabel,
} from "@/components/portal/lib/eoiConstants";
import { canListSignatoryDocument, isSignatoryApprovalPending } from "@/components/portal/lib/signatoryApproval";

const PAGE_SIZE = 10;
type EoisTab = "all" | "awaiting-signatory";

export default function EoisPage() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [listTab, setListTab] = useState<EoisTab>("all");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, refetch } = useGetEoisQuery();
  const [approveEoiSignatory, { isLoading: approving }] = useApproveEoiSignatoryMutation();

  const eois = useMemo(
    () => (data?.data ?? []).filter((row) => canListSignatoryDocument(row, user)),
    [data?.data, user],
  );

  const awaitingCount = useMemo(
    () => eois.filter((row) => isSignatoryApprovalPending(row)).length,
    [eois],
  );

  const filtered = useMemo(() => {
    let list = eois;
    if (listTab === "awaiting-signatory") {
      list = list.filter((row) => isSignatoryApprovalPending(row));
    }
    if (filterStatus !== "all") {
      list = list.filter((row) => row.status === filterStatus);
    }
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter((row) => {
        const haystack = [
          row.eoiRef,
          row.subject,
          eoiRecipientLabel(row),
          eoiEnquiryLabel(row),
          row.status,
          row.recipient?.email,
          row.recipient?.designation,
          row.recipient?.organization,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }
    return list;
  }, [eois, filterStatus, searchQuery, listTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const counts = useMemo(() => {
    return {
      total: eois.length,
      draft: eois.filter((row) => row.status === "DRAFT").length,
      sent: eois.filter((row) => row.status === "SENT").length,
      accepted: eois.filter((row) => row.status === "ACCEPTED").length,
    };
  }, [eois]);

  const columns: Column<ExpressionOfInterest>[] = useMemo(
    () => [
      {
        key: "eoiRef",
        header: "Reference",
        render: (row) => (
          <span className="font-medium text-foreground">{row.eoiRef}</span>
        ),
      },
      {
        key: "recipient",
        header: "Recipient",
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">{eoiRecipientLabel(row)}</p>
            {row.recipient?.designation ? (
              <p className="truncate text-xs text-muted-foreground">
                {row.recipient.designation}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        key: "enquiry",
        header: "Enquiry",
        hideOnMobile: true,
        render: (row) => (
          <span className="text-sm text-foreground">{eoiEnquiryLabel(row)}</span>
        ),
      },
      {
        key: "eoiDate",
        header: "Date",
        hideOnMobile: true,
        render: (row) => (
          <span className="text-sm text-foreground">{formatDisplayDate(row.eoiDate)}</span>
        ),
      },
      {
        key: "subject",
        header: "Subject",
        hideOnMobile: true,
        render: (row) => (
          <p className="max-w-xs truncate text-sm text-foreground">{row.subject || "—"}</p>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <div className="flex flex-col items-start gap-1">
            <EoiStatusPill status={row.status} />
            <SignatoryApprovalPill doc={row} />
          </div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
            <EoiPdfListActions eoi={row} />
            <SignatoryApproveButton
              doc={row}
              documentLabel="EOI"
              refLabel={row.eoiRef}
              isLoading={approving}
              onApprove={() => approveEoiSignatory({ id: row._id }).unwrap()}
            />
          </div>
        ),
      },
    ],
    [approveEoiSignatory, approving],
  );

  const EoisTable = DataTable as any;

  return (
    <DashboardLayout title="EOI" subtitle="Expressions of interest">
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatsCard title="Total" value={counts.total} icon={Mail} />
        <StatsCard title="Draft" value={counts.draft} icon={FileEdit} />
        <StatsCard title="Sent" value={counts.sent} icon={Send} />
        <StatsCard title="Accepted" value={counts.accepted} icon={CircleCheck} />
      </div>

      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="relative min-w-0 w-full flex-1 sm:max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by reference, recipient, enquiry…"
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
                {EOI_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto whitespace-nowrap">
            <Plus className="mr-2 h-4 w-4" />
            Create EOI
          </Button>
        </div>
      </div>

      <Tabs
        value={listTab}
        onValueChange={(value) => {
          setListTab(value as EoisTab);
          setPage(1);
        }}
        className="mb-4"
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="all" className="gap-1.5 px-3 py-2 text-xs sm:text-sm">
            All
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
              {eois.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="awaiting-signatory"
            className="gap-1.5 px-3 py-2 text-xs sm:text-sm"
          >
            Awaiting signatory
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
              {awaitingCount}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <EoisTable
        columns={columns}
        data={paginated}
        loading={isLoading}
        onRowClick={(row?: ExpressionOfInterest) => row && router.push(`/eois/${row._id}`)}
        emptyMessage={
          listTab === "awaiting-signatory"
            ? "No EOIs awaiting signatory approval"
            : "No EOIs yet"
        }
      />

      <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground sm:text-sm">
          {filtered.length === 0
            ? eois.length === 0
              ? "No EOIs yet."
              : listTab === "awaiting-signatory"
                ? "No EOIs awaiting signatory approval."
                : "No EOIs match your search or filters."
            : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length} EOIs`}
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

      <CreateEoiForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onComplete={() => {
          setPage(1);
          void refetch();
        }}
      />
    </DashboardLayout>
  );
}
