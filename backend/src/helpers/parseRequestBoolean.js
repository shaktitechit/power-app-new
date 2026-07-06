/** Parse boolean values from JSON bodies or multipart form fields. */
export const parseRequestBoolean = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return Boolean(value);
};

/** Apply optional is_completed from request body onto a mongoose document. */
export const applyIsCompletedFromBody = (record, body) => {
  if (!body || !("is_completed" in body)) return;
  const parsed = parseRequestBoolean(body.is_completed);
  if (parsed !== undefined) {
    record.is_completed = parsed;
  }
};
