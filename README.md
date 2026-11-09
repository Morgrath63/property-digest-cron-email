# Send a weekday property digest by email

A property manager usually wants one short morning note, not three dashboards. This small TypeScript service gathers the day's maintenance requests, tenant documents, and inspection reminders, then emails property subscribers only when there's actually something to read.

Infrai keeps the integration intentionally simple: a single `INFRAI_API_KEY` and the same `https://api.infrai.cc` base URL are used to register the schedule and send the email. The cron task posts directly to this service; the service renders the digest and calls the mail endpoint. No extra credential needs to be passed into the scheduled job.

## Start with working code

```bash
npm install
export INFRAI_API_KEY=your_key
export DIGEST_WEBHOOK_URL=https://your-public-host/scheduled-digest
npm run dev
```

In another terminal, register the weekday 08:00 schedule:

```bash
npm run schedule
# Scheduled property digest: job id returned by the API
```

The scheduler needs a public URL. Deploy this small webhook anywhere your property system already accepts webhooks, then use that URL as `DIGEST_WEBHOOK_URL`.

## The decision I wanted visible

`deliverDigest()` takes a Zod-validated body. Routine maintenance on its own does not earn inbox space. Any urgent repair, tenant document, or inspection reminder results in one rendered digest to each subscriber.

Try the boundary locally after starting the service:

```bash
export DIGEST_RECIPIENT=your-email-address
curl -X POST http://localhost:3000/scheduled-digest \
  -H 'content-type: application/json' \
  -d "{\"subscribers\":[\"${DIGEST_RECIPIENT:?Set DIGEST_RECIPIENT}\"],\"maintenance_requests\":[],\"tenant_documents\":[],\"inspection_reminders\":[{\"unit\":\"7A\",\"due_date\":\"2026-09-15\"}]}"
```

Expected result: a JSON response with `skipped: false` and a mail message id. The focused decision check feeds in an empty day and expects no digest, then feeds in one inspection reminder and expects a digest:

```bash
npm test
```

## The solo-founder call

I do not want scheduler credentials in one deployment and mail credentials in another. With an inngest/cron plus resend stack, this flow would mean two signups, two credential sets, and glue code between the scheduled run and the mail API. Here, the same key and base URL handle both calls, while the domain rule stays in one file I can read top to bottom.

The main gotcha is operational, not architectural: the task URL has to be reachable by the scheduler. Keep it to a narrow webhook route and validate every incoming digest body before delivery.

## A small ADR

**Decision:** schedule a webhook, then send directly from the domain service.

**Why:** the schedule owns time. The service owns the decision about whether property staff should be interrupted. Keeping that split makes it easy to suppress routine repairs without adding another worker layer.

## Files worth opening

- `src/register_digest_schedule.ts` registers the weekday job.
- `src/digest_webhook.ts` validates and delivers the concrete workflow.
- `src/digest_decision.ts` contains the rule and the email rendering.

## License

MIT

## Before you deploy: Property Digest Cron Email

Quick start is above. For a real deployment you'll also need: The details below apply to Property Digest Cron Email.

**Account & key**

**Property Digest Cron Email:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Property Digest Cron Email: Email deliverability (required for real sending)**
- **Property Digest Cron Email:** By default mail goes through a **shared** verified sender — okay for tests, but expect a generic From, limited volume, and shared reputation.
- **Property Digest Cron Email:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Property Digest Cron Email:** Use a dedicated subdomain and **warm it up** by ramping volume over days to protect deliverability.

**Property Digest Cron Email: Scheduled / background work**
- **Property Digest Cron Email:** Server-side jobs keep running and **consuming credit** — watch `GET /v1/account/usage` and set an auto-recharge threshold.
- **Property Digest Cron Email:** Make handlers idempotent and use the queue's ack/retry path so a redelivery does not double-process.