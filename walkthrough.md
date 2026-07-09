# Walkthrough - Configuration, OpenAI Migration, Rename Quotation, & Bug Fixes

## Changes Made

### 1. OpenAI Integration Config & Module

#### [MODIFY] [openRouter.js](file:///Users/macbook/Desktop/power-app-main/backend/src/config/openRouter.js)
- Redirected the module configuration to use OpenAI credentials.
- Mapped config parameters to load `process.env.OPENAI_API_KEY` and `process.env.OPENAI_MODEL` (defaulting to `gpt-4o-mini`).
- Pointed the default endpoint url to OpenAI's base completions path (`https://api.openai.com/v1`).
- Updated startup credentials warnings to validate the `OPENAI_API_KEY`.

#### [MODIFY] [open-router.services.js](file:///Users/macbook/Desktop/power-app-main/backend/src/modules/open-router/open-router.services.js)
- Updated completions fetch requests to point directly to OpenAI endpoints.
- Cleaned up requests headers by removing OpenRouter-specific telemetry headers (referer, app title).
- Defaulted `max_tokens` to `1500` to prevent payment authorization failures.
- Maintained a robust parser to strip markdown blocks from JSON extraction completions.

#### [NEW] [open-router.controllers.js](file:///Users/macbook/Desktop/power-app-main/backend/src/modules/open-router/open-router.controllers.js)
- Mapped endpoints for chat completions, text generation, file chat, and utility bill extraction to direct OpenAI calls.

#### [MODIFY] [.env](file:///Users/macbook/Desktop/power-app-main/.env) & [.env.prod](file:///Users/macbook/Desktop/power-app-main/.env.prod)
- Removed `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and `OPENROUTER_BASE_URL`.
- Added `OPENAI_API_KEY` and configured `OPENAI_MODEL=gpt-4o-mini`.

---

### 2. Frontend Integration & Layout Logo Customizations

#### [NEW] [openRouterApiSlice.ts](file:///Users/macbook/Desktop/power-app-main/frontend/store/slices/openRouterApiSlice.ts)
- Maintained endpoints for chatbot messaging, file uploads, and billing extraction, connecting drop-in to the optimized OpenAI backend service.

#### [MODIFY] [chatbot-widget.tsx](file:///Users/macbook/Desktop/power-app-main/frontend/components/portal/shared/components/chatbot-widget.tsx)
- Replaced general `Bot` and `MessageSquare` icons with a custom, premium customer-service themed vector SVG lady avatar wearing a headset (`LadyAvatar`).
- Displayed the custom `LadyAvatar` directly on the minimized floating chatbot toggle button rendered at the bottom-right corner of the dashboard layout.
- Added key micro-animations: a pulsing background ring on hover/attention, smooth transitions, rotation elements, and bubble entries.
- Renamed the assistant to **Shakti AI** in greetings, panel headers, and system prompts.

#### [MODIFY] [index.tsx](file:///Users/macbook/Desktop/power-app-main/frontend/components/portal/shared/dashboard/index.tsx)
- Filtered the `recentFacilities` list on the dashboard to only show facilities with an open audit status.

#### [MODIFY] [index.tsx](file:///Users/macbook/Desktop/power-app-main/frontend/components/portal/shared/facilities/index.tsx)
- Changed the default select filter state for the facilities closure status filter from `"all"` to `"open"` to show open audits on page load.
- Integrated the "View in Sheet" trigger button next to the "Create Facility" button.
- Mounted the newly created `<FacilitiesSheetModal />` component to render the full-screen interactive grid.

#### [NEW] [facilities-sheet-modal.tsx](file:///Users/macbook/Desktop/power-app-main/frontend/components/portal/shared/facilities/facilities-sheet-modal.tsx)
- Implemented a premium full-screen spreadsheet modal:
  - Connects to `GoogleSheetGrid` to output clean tabular columns representing all facility attributes (Address, Auditor, Client Representatives, Start Date, etc.).
  - Separates data into "Open Audits" and "Closed Audits" tabs.
  - Implements multi-dimensional selectors to filter listings by: Audit Type, Team/Auditor, Start Date Ranges (From/To), and Target Closure Date Ranges (From/To).
  - Resolved dynamic facility auditors by parsing populated assignments from the junction model (`assignedAuditors`), supporting comma-separated multi-auditor representation and filtering.
  - Replaced CSV export functionality with standard Excel XLSX file downloads by dynamically loading `exceljs` on demand and applying primary indigo table formatting.
  - Added the **Address** field column representation and value mappings inside sheetRows definitions.

#### [MODIFY] [facilityApiSlice.ts](file:///Users/macbook/Desktop/power-app-main/frontend/store/slices/facilityApiSlice.ts)
- Updated the `Facility` type interface to support the optional `assignedAuditors?: AssignedAuditor[];` field.

#### [MODIFY] [facility.services.js](file:///Users/macbook/Desktop/power-app-main/backend/src/modules/facility/facility.services.js)
- Updated the `getFacilitiesService` service to query the `FacilityAuditor` junction table, populate user details (names, emails), group them by facility, and attach them directly as `assignedAuditors` to each facility list element returned.

---

### 3. File Management Service Integration for Enquiries

#### [MODIFY] [electrical-audit.helpers.js](file:///Users/macbook/Desktop/power-app-main/backend/src/modules/shared/electrical-audit.helpers.js) & [fileManagementUpload.js](file:///Users/macbook/Desktop/power-app-main/backend/src/utils/fileManagementUpload.js)
- Registered the `"enquiries": "enquiry_document"` folder key to resource type mapping in the upload orchestrator configurations. This binds document uploads for enquiries directly to the central file management API, correctly creating and tracking their presigned uploads.

---

### 4. Rename Quotations to Enquiry Documents (Clean Removal of legacy "Quotation")

#### [MODIFY] [enquiryDocument.js](file:///Users/macbook/Desktop/power-app-main/backend/src/models/enquiryDocument.js)
- Renamed schema property `quotation_number` to `document_number` and re-indexed the unique partial index constraints under the new key name.

#### [MODIFY] [modelRegistry.js](file:///Users/macbook/Desktop/power-app-main/backend/src/data/modelRegistry.js)
- Registered `EnquiryDocument` as a standalone first-class model key inside the global Mongoose model map registry.

#### [MODIFY] [enquiry.services.js](file:///Users/macbook/Desktop/power-app-main/backend/src/modules/enquiry/enquiry.services.js)
- Renamed all functions and references from Quotation to EnquiryDocument (e.g. `getEnquiryDocumentsService`, `createEnquiryDocumentService`, `deleteEnquiryDocumentService`).
- Changed the generated number prefix from `QT-` to `DOC-` to follow correct branding nomenclature.
- Deleted the obsolete `ENQUIRY_DOCUMENT_STATUSES` constant array definition block.

#### [MODIFY] [enquiry.controllers.js](file:///Users/macbook/Desktop/power-app-main/backend/src/modules/enquiry/enquiry.controllers.js) & [enquiry.routes.js](file:///Users/macbook/Desktop/power-app-main/backend/src/modules/enquiry/enquiry.routes.js)
- Renamed all controller operations and imports.
- Updated router handlers to map logic matching the new REST `/enquiry-documents` endpoints.

#### [MODIFY] [recentActivity.js](file:///Users/macbook/Desktop/power-app-main/backend/src/models/recentActivity.js)
- Added `"enquiry"`, `"follow_up"`, and `"enquiry_document"` to the `entity_type` validation enum list to support activity tracking logs cleanly without validation warnings.

#### [MODIFY] [apiSlice.ts](file:///Users/macbook/Desktop/power-app-main/frontend/store/slices/apiSlice.ts) & [enquiryApiSlice.ts](file:///Users/macbook/Desktop/power-app-main/frontend/store/slices/enquiryApiSlice.ts)
- Replaced `"Quotation"` cache tags and references with `"EnquiryDocument"`.
- Cleaned up unused definitions by deleting `EnquiryDocumentStatus` and `EnquiryDocumentLineItem` structures.
- Renamed RTK mutations, queries, request bodies, query endpoints, and exported hooks (e.g., `useGetEnquiryDocumentsQuery`, `useCreateEnquiryDocumentMutation`).

#### [MODIFY] [index.tsx](file:///Users/macbook/Desktop/power-app-main/frontend/components/portal/shared/enquiries/[enquiryId]/index.tsx) & [index.tsx](file:///Users/macbook/Desktop/power-app-main/frontend/components/portal/shared/enquiries/index.tsx)
- Correctly imported `useDeleteFollowUpMutation` from `enquiryApiSlice` to resolve the undefined hook ReferenceError.
- Fixed the `quoteBusy` logic by referencing the correct `updatingQ` and `creatingQ` loading indicators, replacing the undefined legacy `updatingQuote` state.
- Replaced table column definitions to render `row.document_number` instead of `row.quotation_number`.
- Updated all labels, triggers, alert descriptions, dialog instructions, and button captions to standard "Document" conventions.

---

## Verification

### Syntax Check
- Ran `node --check` validation on backend files.

### Schema & Registry Initialization
- Booted backend server inside Docker container to verify successful model compilation and connection.

### Type Checking
- Executed `npx tsc --noEmit` on the frontend workspace to confirm zero compilation errors in the modified files.

### Docker Production Rebuild
- Built frontend next.js package successfully with no SSR compilation or hydration bugs.
