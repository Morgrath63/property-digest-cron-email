import { createServer } from "node:http";
import { digestRequest, renderDigest, shouldSendDigest } from "./digest_decision.js";
import { InfraiError, infrai } from "./infrai_delivery.js";

const port = Number(process.env.PORT ?? "3000");

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  let body = "";
  for await (const chunk of request) body += chunk;
  return JSON.parse(body);
}

export async function deliverDigest(body: unknown): Promise<{ message_ids: string[]; skipped: boolean }> {
  const input = digestRequest.parse(body);
  if (!shouldSendDigest(input)) return { message_ids: [], skipped: true };
  const message = renderDigest(input);
  const sent = await Promise.all(input.subscribers.map((to) => infrai.email.batch.send({ messages: [{ to, ...message }] })));
  return { message_ids: sent.map((item) => item.message_id), skipped: false };
}

createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/scheduled-digest") {
    response.writeHead(404).end();
    return;
  }
  try {
    const result = await deliverDigest(await readJson(request));
    response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(result));
  } catch (error) {
    const status = error instanceof InfraiError ? (error.status < 500 ? error.status : 502) : 400;
    response.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify({ error: (error as Error).message }));
  }
}).listen(port, () => console.log(`Digest webhook listening on ${port}`));
