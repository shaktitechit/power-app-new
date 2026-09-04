"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/portal/layout/dashboard-layout";
import { DataTable, Column } from "@/components/portal/ui/data-table";
import { Button } from "@/components/portal/ui/button";
import { Input } from "@/components/portal/ui/input";
import { ArrowLeft, Plus, Search } from "lucide-react";
import {
  type TermsConditions,
  type TermsConditionsInput,
  useCreateTermsConditionsMutation,
  useGetTermsConditionsQuery,
} from "@/store/slices/termsConditionsApiSlice";
import { useAppSelector } from "@/store/hooks";
import { toastHandler } from "@/components/portal/lib/toast";
import { CreateTermsConditionsForm } from "@/components/portal/shared/components/quotation/create-terms-conditions-form";
import { htmlToPlainText } from "@/components/portal/lib/richText";
import { formatDisplayDate } from "@/components/portal/lib/quotationConstants";

const PAGE_SIZE = 10;

export default function TermsConditionsPage() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const canEdit = user?.role === "super_admin" || user?.role === "admin";

  const { data, isLoading } = useGetTermsConditionsQuery();
  const [createTerms, { isLoading: creating }] = useCreateTermsConditionsMutation();

  const termsSets = data?.data ?? [];
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return termsSets;
    return termsSets.filter((set) =>
      [set.title, ...set.lines.map(htmlToPlainText)].join(" ").toLowerCase().includes(query),
    );
  }, [termsSets, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handleCreate = async (value: TermsConditionsInput) => {
    await toastHandler({
      loading: "Creating terms & conditions…",
      success: "Terms & conditions created.",
      action: () => createTerms({ title: value.title, lines: value.lines }).unwrap(),
    });
    setPage(1);
  };

  const columns: Column<TermsConditions>[] = [
    {
      key: "title",
      header: "Title",
      render: (row) => (
        <span className="font-medium text-foreground">{row.title}</span>
      ),
    },
    {
      key: "lines",
      header: "Lines",
      render: (row) => (
        <span className="text-sm text-foreground">{row.lines.length}</span>
      ),
    },
    {
      key: "updated_at",
      header: "Updated",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-foreground">
          {formatDisplayDate(row.updated_at || row.created_at)}
        </span>
      ),
    },
  ];

  const TermsTable = DataTable as any;

  return (
    <DashboardLayout
      title="Terms & conditions"
      subtitle="Standard term sets copied onto new quotations"
    >
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild variant="ghost" size="sm" className="h-8 w-fit -ml-2 px-2">
            <Link href="/quotations" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Quotations
            </Link>
          </Button>
          <div className="relative min-w-0 w-full flex-1 sm:max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search titles or lines…"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
              className="bg-input pl-9"
            />
          </div>
        </div>
        {canEdit && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="w-full sm:w-auto whitespace-nowrap"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create terms & conditions
          </Button>
        )}
      </div>

      <TermsTable
        columns={columns}
        data={paginated}
        loading={isLoading}
        onRowClick={(row?: TermsConditions) =>
          row && router.push(`/terms-conditions/${row._id}`)
        }
        emptyMessage={
          termsSets.length === 0
            ? "No terms & conditions yet"
            : "No terms match your search"
        }
      />

      <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground sm:text-sm">
          {filtered.length === 0
            ? termsSets.length === 0
              ? "No terms & conditions yet."
              : "No terms match your search."
            : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length} terms`}
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

      <CreateTermsConditionsForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        saving={creating}
        onSubmit={handleCreate}
      />
    </DashboardLayout>
  );
}
