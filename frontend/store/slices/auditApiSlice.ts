import { apiSlice } from "./apiSlice";

/** Matches backend `aggregateElectricalEnergyAuditForFacility` nested keys.
 * Solar/DG/transformer/pump audit rows are nested on each equipment doc:
 * `solar_plants[].solar_generation_records`, `dg_sets[].dg_audit_records`, etc.
 */
export interface FacilityAuditEnergyUtilityNest {
  utility_account: unknown;
  tariffs: unknown[];
  billing_records: unknown[];
  solar_plants: unknown[];
  /** Flat fallback when nested join misses rows */
  solar_generation_records?: unknown[];
  dg_sets: unknown[];
  dg_audit_records?: unknown[];
  transformers: unknown[];
  transformer_audit_records?: unknown[];
  pumps: unknown[];
  pump_audit_records?: unknown[];
  hvac_audits: unknown[];
  lighting_audits: unknown[];
  lux_measurements: unknown[];
  misc_load_audits: unknown[];
  ac_audit_records: unknown[];
  fan_audit_records: unknown[];
  street_light_audits?: unknown[];
  ups_audits?: unknown[];
}

export interface FacilityAuditSnapshotEnergyData {
  audit_type: "Electrical Energy Audit";
  facility_id: string;
  facility: unknown;
  utility_accounts: FacilityAuditEnergyUtilityNest[];
}

/** Matches backend safety checklist registry keys under `safety_sections`. */
export interface FacilityAuditSafetyUtilityNest {
  utility_account: unknown;
  safety_sections: Record<string, unknown[]>;
}

export interface FacilityAuditSnapshotSafetyData {
  audit_type: "Electrical Safety Audit";
  facility_id: string;
  facility: unknown;
  utility_accounts: FacilityAuditSafetyUtilityNest[];
}

export interface FacilityAuditSnapshotSuccess<TData> {
  success: boolean;
  data: TData;
}

export interface FacilityAuditSnapshotQueryArg {
  facility_id: string;
}

export interface FacilityAuditSnapshotByTypeQueryArg
  extends FacilityAuditSnapshotQueryArg {
  /** Facility enum label or backend aliases (`electrical_energy`, `safety`, …). */
  audit_type: string;
}

export interface AuditAiContextMeta {
  total_records: number;
  included_records: number;
  truncated: boolean;
  payload_truncated?: boolean;
  compact_mode: boolean;
  char_count: number;
  max_chars: number;
  map_reduce?: boolean;
  chunks_processed?: number;
}

export interface AuditAiContextRequest {
  facility_id: string;
  audit_type: string;
  question_id: string;
  options?: { max_chars?: number; max_records?: number; utility_account_id?: string };
}

export interface AuditAiAnalyzeRequest extends AuditAiContextRequest {
  follow_up_text?: string;
  prior_turns?: Array<{ role: "user" | "assistant"; content: string }>;
  options?: AuditAiContextRequest["options"] & { max_tokens?: number; force_map_reduce?: boolean };
}

export interface AuditAiAnalyzeResponse {
  question: { id: string; label: string; prompt: string };
  structured: unknown;
  raw: string;
  meta: AuditAiContextMeta;
}

const buildFacilityQuery = (params: Record<string, string | undefined>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, value);
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
};

export const auditApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getElectricalEnergyAuditSnapshot: builder.query<
      FacilityAuditSnapshotSuccess<FacilityAuditSnapshotEnergyData>,
      FacilityAuditSnapshotQueryArg
    >({
      query: ({ facility_id }) => ({
        url: `/v1/audits/electrical-energy${buildFacilityQuery({
          facility_id,
        })}`,
        method: "GET",
      }),
      providesTags: (_result, _err, { facility_id }) => [
        "AuditSnapshot",
        { type: "AuditSnapshot", id: `${facility_id}:energy` },
      ],
    }),

    getElectricalSafetyAuditSnapshot: builder.query<
      FacilityAuditSnapshotSuccess<FacilityAuditSnapshotSafetyData>,
      FacilityAuditSnapshotQueryArg
    >({
      query: ({ facility_id }) => ({
        url: `/v1/audits/electrical-safety${buildFacilityQuery({
          facility_id,
        })}`,
        method: "GET",
      }),
      providesTags: (_result, _err, { facility_id }) => [
        "AuditSnapshot",
        { type: "AuditSnapshot", id: `${facility_id}:safety` },
      ],
    }),

    getFacilityAuditSnapshot: builder.query<
      FacilityAuditSnapshotSuccess<
        FacilityAuditSnapshotEnergyData | FacilityAuditSnapshotSafetyData
      >,
      FacilityAuditSnapshotByTypeQueryArg
    >({
      query: ({ facility_id, audit_type }) => ({
        url: `/v1/audits/facility-snapshot${buildFacilityQuery({
          facility_id,
          audit_type,
        })}`,
        method: "GET",
      }),
      providesTags: (_result, _err, { facility_id, audit_type }) => [
        "AuditSnapshot",
        {
          type: "AuditSnapshot",
          id: `${facility_id}:${audit_type}`,
        },
      ],
    }),

    postAuditAiContext: builder.mutation<
      FacilityAuditSnapshotSuccess<{
        compact_payload: unknown;
        meta: AuditAiContextMeta;
        stats: unknown;
        question: { id: string; label: string; prompt: string };
      }>,
      AuditAiContextRequest
    >({
      query: (body) => ({
        url: "/v1/audits/ai-context",
        method: "POST",
        body,
      }),
    }),

    postAuditAiAnalyze: builder.mutation<
      FacilityAuditSnapshotSuccess<AuditAiAnalyzeResponse>,
      AuditAiAnalyzeRequest
    >({
      query: (body) => ({
        url: "/v1/audits/ai-analyze",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetElectricalEnergyAuditSnapshotQuery,
  useLazyGetElectricalEnergyAuditSnapshotQuery,
  useGetElectricalSafetyAuditSnapshotQuery,
  useLazyGetElectricalSafetyAuditSnapshotQuery,
  useGetFacilityAuditSnapshotQuery,
  useLazyGetFacilityAuditSnapshotQuery,
  usePostAuditAiContextMutation,
  usePostAuditAiAnalyzeMutation,
} = auditApiSlice;
