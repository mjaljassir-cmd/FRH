// Calls the cron endpoint every minute. Run alongside the web server:
//   APP_URL=https://your-domain CRON_SECRET=... node scripts/cron.mjs
// (Or schedule POST {APP_URL}/api/cron with "Authorization: Bearer $CRON_SECRET" in your host's scheduler.)
const url = `${(process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")}/api/cron`;
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET is required");
  process.exit(1);
}

async function tick() {
  try {
    const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${secret}` } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) console.error(`[cron] ${res.status}`, body);
    else if (body.expired || body.ended || body.reminders) console.log(`[cron] ${new Date().toISOString()}`, body);
  } catch (err) {
    console.error("[cron] request failed", err.message);
  }
}

tick();
setInterval(tick, 60_000);
