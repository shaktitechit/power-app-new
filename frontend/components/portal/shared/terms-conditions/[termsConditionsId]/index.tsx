"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useParams } from "@/components/portal/hooks/useParams";
import { DashboardLayout } from "@/components/portal/layout/dashboard-layout";
import { Button } from "@/components/portal/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/portal/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import {
  type TermsConditionsInput,
  type TermsConditionsUserRef,
  useDeleteTermsConditionsMutation,
  useGetTermsConditionsByIdQuery,
  useUpdateTermsConditionsMutation,
} from "@/store/slices/termsConditionsApiSlice";
import { useAppSelector } from "@/store/hooks";
import { toastHandler } from "@/components/portal/lib/toast";
import { CreateTermsConditionsForm } from "@/components/portal/shared/components/quotation/create-terms-conditions-form";
import { RichText } from "@/components/portal/ui/rich-text";
import { formatDisplayDate } from "@/components/portal/lib/quotationConstants";

function userLabel(value?: string | TermsConditionsUserRef | null) {
  if (!value) return "—";
  if (typeof value === "string") return value;
  return value.name || value.email || "—";
}

export default function TermsConditionsDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const termsId = String(params.termsConditionsId || "");
  const user = useAppSelector((state) => state.auth.user);
  const canEdit = user?.role === "super_admin" || user?.role === "admin";

  const { data, isLoading, isError } = useGetTermsConditionsByIdQuery(termsId, {
    skip: !termsId,
  });
  const [updateTerms, { isLoading: updating }] = useUpdateTermsConditionsMutation();
  const [deleteTerms, { isLoading: deleting }] = useDeleteTermsConditionsMutation();

  const terms = data?.data;
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleUpdate = async (value: TermsConditionsInput) => {
    if (!terms) return;
    await toastHandler({
      loading: "Saving terms & conditions…",
      success: "Terms & conditions updated.",
      action: () =>
        updateTerms({
          id: terms._id,
          title: value.title,
          lines: value.lines,
        }).unwrap(),
    });
  };

  const handleDelete = async () => {
    if (!terms) return;
    await toastHandler({
      loading: "Deleting terms & conditions…",
      success: "Terms & conditions deleted.",
      action: () => deleteTerms(terms._id).unwrap(),
    });
    router.push("/terms-conditions");
  };

  if (!termsId || isError) {
    return (
      <DashboardLayout title="Terms & conditions" subtitle="Terms not found">
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="mb-4 text-sm text-muted-foreground">
            These terms & conditions could not be found.
          </p>
          <Button asChild variant="outline">
            <Link href="/terms-conditions">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to terms & conditions
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading || !terms) {
    return (
      <DashboardLayout title="Terms & conditions" subtitle="Loading…">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={terms.title}
      subtitle={`${terms.lines.length} ${terms.lines.length === 1 ? "line" : "lines"}`}
    >
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" size="sm" className="h-8 w-fit -ml-2 px-2">
          <Link href="/terms-conditions" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Terms & conditions
          </Link>
        </Button>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditorOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lines</CardTitle>
          </CardHeader>
          <CardContent>
            {terms.lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lines in this set.</p>
            ) : (
              <ol className="list-decimal space-y-3 pl-5">
                {terms.lines.map((line, index) => (
                  <li key={`${terms._id}-${index}`}>
                    <RichText html={line} />
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Updated</p>
              <p>{formatDisplayDate(terms.updated_at || terms.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Updated by</p>
              <p>{userLabel(terms.updated_by || terms.created_by)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p>{formatDisplayDate(terms.created_at)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateTermsConditionsForm
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={terms}
        saving={updating}
        onSubmit={handleUpdate}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete these terms & conditions?</AlertDialogTitle>
            <AlertDialogDescription>
              All lines in this set will be removed. Existing quotations are unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep terms</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
