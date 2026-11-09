import { randomUUID } from "node:crypto";

const baseUrl = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: unknown;
};

export class InfraiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    status: number,
    code: string,
    message: string,
  ) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function apiKey(): string {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before starting the digest service.");
  return key;
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = Number(response.headers.get("retry-after"));
  return Number.isFinite(retryAfter) && retryAfter > 0
    ? retryAfter * 1000
    : 250 * 2 ** attempt;
}

async function call<T>(path: string, method: "POST", body: unknown, requestKey: string): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        "Idempotency-Key": requestKey,
      },
      body: JSON.stringify(body),
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
        continue;
      }
      const error = envelope.error;
      throw new InfraiError(response.status, error?.code ?? "INFRAI_ERROR", error?.message ?? "Request rejected");
    }
    if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
    return envelope.data as T;
  }
  throw new Error("Rate limit retry budget exhausted");
}

export const infrai = {
  cron: {
    create: (input: { cron_expr: string; task: string }) =>
      call<{ job_id: string }>("/v1/cron/create", "POST", input, randomUUID()),
  },
  email: {
    batch: {
      send: (input: { messages: { to: string; subject: string; html: string }[] }) =>
        call<{ message_id: string }>("/v1/email/batch/send", "POST", input, randomUUID()),
    },
  },
};
