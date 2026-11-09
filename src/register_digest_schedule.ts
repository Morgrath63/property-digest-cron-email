import { infrai } from "./infrai_delivery.js";

const task = process.env.DIGEST_WEBHOOK_URL;
if (!task) throw new Error("Set DIGEST_WEBHOOK_URL to the public scheduled-digest URL.");

const job = await infrai.cron.create({ cron_expr: "0 8 * * 1-5", task });
console.log(`Scheduled property digest: ${job.job_id}`);
