import { z } from "zod";

export const digestRequest = z.object({
  subscribers: z.array(z.string().email()).min(1),
  maintenance_requests: z.array(z.object({
    unit: z.string().min(1),
    summary: z.string().min(1),
    priority: z.enum(["routine", "urgent"]),
  })),
  tenant_documents: z.array(z.object({
    tenant: z.string().min(1),
    document: z.string().min(1),
  })),
  inspection_reminders: z.array(z.object({
    unit: z.string().min(1),
    due_date: z.string().min(1),
  })),
});

export type DigestRequest = z.infer<typeof digestRequest>;

export function shouldSendDigest(input: DigestRequest): boolean {
  return input.maintenance_requests.some((request) => request.priority === "urgent")
    || input.tenant_documents.length > 0
    || input.inspection_reminders.length > 0;
}

export function renderDigest(input: DigestRequest): { subject: string; html: string } {
  const urgent = input.maintenance_requests.filter((request) => request.priority === "urgent");
  const lines = [
    ...urgent.map((request) => `Urgent maintenance: ${request.unit} - ${request.summary}`),
    ...input.tenant_documents.map((document) => `Tenant document: ${document.tenant} - ${document.document}`),
    ...input.inspection_reminders.map((reminder) => `Inspection: ${reminder.unit} due ${reminder.due_date}`),
  ];
  return {
    subject: `Property digest: ${lines.length} item${lines.length === 1 ? "" : "s"}`,
    html: `<h1>Property digest</h1><ul>${lines.map((line) => `<li>${line}</li>`).join("")}</ul>`,
  };
}
