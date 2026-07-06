const syncAuditSectionForDocument = async (utilityAccountId, sheetKey) => {
  if (!utilityAccountId || !sheetKey) return;

  try {
    const { syncAuditSectionStatus } = await import(
      "./utility-workflow.sync.js"
    );
    await syncAuditSectionStatus(utilityAccountId, sheetKey);
  } catch (error) {
    console.error(
      `[utilityWorkflowHook] Failed to sync ${sheetKey} for utility ${utilityAccountId}:`,
      error,
    );
  }
};

const resolveUtilityAccountId = (doc) => {
  const value = doc?.utility_account_id;
  if (!value) return null;
  return String(value._id ?? value);
};

/**
 * Registers post-save/delete hooks that keep UtilityAccount.dataSheet in sync.
 *
 * @param {import("mongoose").Schema} schema
 * @param {{ sheetKey: string, hasCompletenessField?: boolean }} options
 */
export const registerAuditWorkflowHooks = (schema, options) => {
  const { sheetKey, hasCompletenessField = true } = options;

  if (hasCompletenessField !== false) {
    schema.add({
      is_completed: { type: Boolean, default: false },
    });
  }

  const triggerSync = async (doc) => {
    const utilityAccountId = resolveUtilityAccountId(doc);
    await syncAuditSectionForDocument(utilityAccountId, sheetKey);
  };

  schema.post("save", async function postSaveSync() {
    await triggerSync(this);
  });

  schema.post("deleteOne", { document: true, query: false }, async function postDeleteSync() {
    await triggerSync(this);
  });

  schema.post("findOneAndDelete", async function postFindOneAndDeleteSync(doc) {
    if (doc) await triggerSync(doc);
  });
};
