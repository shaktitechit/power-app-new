import { reportQueue } from "./reportQueue.js";

const buildJobId = (action, reportId) => `${action}-${reportId}`;

export const addReportJob = async ({ reportId, requestedBy, action }) => {
  const jobName =
    action === "regenerate" ? "regenerate-report" : "generate-report";
  const jobId = buildJobId(action, reportId);
  const payload = { reportId, requestedBy, action };

  try {
    return await reportQueue.add(jobName, payload, { jobId });
  } catch (error) {
    const message = error?.message || "";
    const isDuplicateJob =
      message.includes("Job") && message.includes("already exists");

    if (!isDuplicateJob) throw error;

    const existing = await reportQueue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === "completed" || state === "failed") {
        await existing.remove();
      } else {
        return existing;
      }
    }

    return reportQueue.add(jobName, payload, { jobId });
  }
};
