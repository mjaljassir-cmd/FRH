// End-to-end test of the full flow against a running server (default http://localhost:3000).
// Requires: seeded admin (admin@example.com / admin12345) and Moyasar mock mode (no MOYASAR_SECRET_KEY).
//   node scripts/e2e.mjs
import { createRequire } from "node:module";
// Uses the project dependency if installed, otherwise a globally installed Playwright (NODE_PATH).
const { chromium } = createRequire(import.meta.url)("playwright");
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
const ADMIN = { email: process.env.ADMIN_EMAIL || "admin@example.com", password: process.env.ADMIN_PASSWORD || "admin12345" };
const SHOTS = process.env.E2E_SCREENSHOTS || path.resolve("test-results");
mkdirSync(SHOTS, { recursive: true });

const run = Date.now().toString(36);
const orgEmail = `org-${run}@test.local`;
const custEmail = `cust-${run}@test.local`;
const pw = "Passw0rd!";
let failures = 0;

function check(cond, msg) {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    failures++;
    console.error(`  ✗ ${msg}`);
  }
}

async function api(method, url, body, token) {
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

function riyadhLocal(daysAhead, hour) {
  const d = new Date(Date.now() + daysAhead * 86400000);
  const r = new Date(d.getTime() + 3 * 3600000);
  return `${r.toISOString().slice(0, 10)}T${String(hour).padStart(2, "0")}:00`;
}

const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
// 1x1 PNG
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

const browser = await chromium.launch();

async function login(page, email, password, locale = "ar") {
  await page.goto(`${BASE}/${locale}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([page.waitForURL((u) => !u.pathname.endsWith("/login")), page.click('button[type="submit"]')]);
}

try {
  // ---------- 1. Organizer registers ----------
  console.log("1. Organizer registration");
  const orgCtx = await browser.newContext();
  const org = await orgCtx.newPage();
  await org.goto(`${BASE}/ar/register`);
  check((await org.getAttribute("html", "dir")) === "rtl", "Arabic page is RTL");
  await org.fill('input[name="name"]', "منظم تجريبي");
  await org.fill('input[name="phone"]', "0555555555");
  await org.fill('input[name="email"]', orgEmail);
  await org.fill('input[name="password"]', pw);
  await org.fill('input[name="orgName"]', `E2E Org ${run}`);
  await org.fill('input[name="commercialRegNumber"]', "1010123456");
  await org.setInputFiles('input[name="commercialRegFile"]', { name: "cr.pdf", mimeType: "application/pdf", buffer: pdf });
  await org.fill('input[name="bankName"]', "Bank");
  await org.fill('input[name="accountHolderName"]', "E2E Org");
  await org.fill('input[name="iban"]', "SA03 8000 0000 6080 1016 7519");
  await Promise.all([org.waitForURL(/\/ar\/organizer$/), org.click('button[type="submit"]')]);
  check((await org.textContent("main")).includes("قيد المراجعة"), "Organizer sees pending-review notice");
  await org.goto(`${BASE}/ar/organizer/events/new`);
  check(org.url().endsWith("/ar/organizer"), "Unapproved organizer can't create events");

  // ---------- 2. Admin approves organizer ----------
  console.log("2. Admin approval");
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await login(admin, ADMIN.email, ADMIN.password);
  await admin.goto(`${BASE}/ar/admin/organizers?q=${encodeURIComponent(orgEmail)}`);
  await admin.click(`text=E2E Org ${run}`);
  await admin.fill('input[name="commissionRate"]', "12");
  await admin.click('form:has(input[name="commissionRate"]) button[type="submit"]');
  await admin.waitForSelector("text=تم الحفظ");
  await admin.click('button[value="APPROVED"]');
  await admin.waitForSelector("text=معتمد");
  check(true, "Organizer approved with 12% commission");

  // ---------- 3. Organizer creates event ----------
  console.log("3. Organizer creates event");
  await org.goto(`${BASE}/ar/organizer/events/new`);
  await org.fill('input[name="titleAr"]', `فعالية اختبار ${run}`);
  await org.fill('input[name="titleEn"]', `E2E Event ${run}`);
  await org.fill('textarea[name="descriptionAr"]', "وصف تجريبي للفعالية للاختبار");
  await org.fill('textarea[name="descriptionEn"]', "Test description for the event");
  await org.selectOption('select[name="categoryId"]', { index: 1 });
  await org.selectOption('select[name="cityId"]', { index: 1 });
  await org.fill('input[name="startAt"]', riyadhLocal(7, 18));
  await org.fill('input[name="endAt"]', riyadhLocal(7, 22));
  await org.fill('input[name="venueName"]', "Test Venue");
  await org.fill('input[name="address"]', "Test Address");
  await org.setInputFiles('input[name="cover"]', { name: "c.png", mimeType: "image/png", buffer: png });
  await org.fill('input[name="tickets[0][nameAr]"]', "عادي");
  await org.fill('input[name="tickets[0][nameEn]"]', "Standard");
  await org.fill('input[name="tickets[0][price]"]', "115");
  await org.fill('input[name="tickets[0][quantity]"]', "100");
  await org.click("text=إضافة نوع");
  await org.fill('input[name="tickets[1][nameAr]"]', "محدود");
  await org.fill('input[name="tickets[1][nameEn]"]', "Limited");
  await org.fill('input[name="tickets[1][price]"]', "50");
  await org.fill('input[name="tickets[1][quantity]"]', "3");
  await org.selectOption('select[name="refundPolicyType"]', "REFUNDABLE_UNTIL");
  await org.fill('input[name="refundHoursBefore"]', "24");
  await Promise.all([
    org.waitForURL((u) => /\/organizer\/events\/[a-z0-9]+$/.test(u.pathname) && !u.pathname.endsWith("/new")),
    org.click('button[value="submit"]'),
  ]);
  await org.waitForSelector("text=الفعالية بانتظار مراجعة الإدارة");
  const eventId = org.url().split("/").pop();
  check((await org.textContent("main")).includes("بانتظار"), "Event submitted for review");

  const before = await api("GET", `/api/v1/events?q=${run}`);
  check(before.json.total === 0, "Event not visible in app before approval");

  // ---------- 4. Admin approves & features ----------
  console.log("4. Admin approves and features event");
  await admin.goto(`${BASE}/ar/admin/events/${eventId}`);
  await admin.click('button[value="approve"]');
  await admin.waitForSelector('button[value="1"]');
  await admin.click('button[value="1"]');
  await admin.waitForSelector("text=تم الحفظ");
  const featured = await api("GET", `/api/v1/events?featured=1&q=${run}`);
  check(featured.json.total === 1 && featured.json.items[0].isFeatured, "Event published and featured");

  // ---------- 5. Customer buys tickets ----------
  console.log("5. Customer purchase");
  const reg = await api("POST", "/api/v1/auth/register", { name: "عميل", email: custEmail, password: pw, locale: "ar" });
  check(reg.status === 201, "Customer registered");
  const token = reg.json.token;
  const detail = await api("GET", `/api/v1/events/${eventId}`, null, token);
  const [standard, limited] = detail.json.event.ticketTypes;
  check(standard.price === 11500 && limited.remaining === 3, "Ticket types returned in halalas with stock");

  const over = await api("POST", "/api/v1/orders", { eventId, items: [{ ticketTypeId: limited.id, quantity: 4 }] }, token);
  check(over.status === 409 && over.json.error === "SOLD_OUT", "Cannot buy more than available");

  // Concurrent purchases of the last 3 limited tickets: exactly 3 succeed
  const race = await Promise.all(
    Array.from({ length: 6 }, () => api("POST", "/api/v1/orders", { eventId, items: [{ ticketTypeId: limited.id, quantity: 1 }] }, token)),
  );
  check(race.filter((r) => r.status === 201).length === 3, "No overselling under concurrent orders");

  const order = await api("POST", "/api/v1/orders", { eventId, items: [{ ticketTypeId: standard.id, quantity: 2 }] }, token);
  check(order.status === 201 && order.json.paymentUrl, "Order created with payment URL");
  const pay = await (await browser.newContext()).newPage();
  await pay.goto(order.json.paymentUrl);
  await pay.screenshot({ path: path.join(SHOTS, "pay-ar.png") });
  await Promise.all([pay.waitForURL(/\/pay\/result/), pay.click('[data-testid="mock-pay-success"]')]);
  check(pay.url().includes("status=paid"), "Payment completed (mock)");

  const o = await api("GET", `/api/v1/orders/${order.json.order.id}`, null, token);
  const od = o.json.order;
  // 230 SAR total: VAT 30, subtotal 200, commission 12% of 200 = 24
  check(od.status === "PAID" && od.totalAmount === 23000 && od.vatAmount === 3000 && od.subtotalAmount === 20000, "Receipt shows VAT-inclusive breakdown");
  check(od.tickets.length === 2 && od.tickets.every((t) => t.qr?.startsWith("T1.")), "Two QR tickets issued");
  check(od.refund.eligible === true, "Order refundable under organizer policy");

  // ---------- 6. Check-in ----------
  console.log("6. QR check-in");
  await org.goto(`${BASE}/ar/organizer/scan?event=${eventId}`);
  await org.fill('[data-testid="manual-code"]', od.tickets[0].qr);
  await org.click("text=تحقق");
  await org.waitForSelector('[data-testid="scan-result"][data-status="OK"]');
  check(true, "First scan admitted");
  await org.fill('[data-testid="manual-code"]', od.tickets[0].qr);
  await org.click("text=تحقق");
  await org.waitForSelector('[data-testid="scan-result"][data-status="ALREADY_USED"]');
  check(true, "Second scan rejected as already used");
  await org.fill('[data-testid="manual-code"]', od.tickets[1].qr.slice(0, -2) + "xx");
  await org.click("text=تحقق");
  await org.waitForSelector('[data-testid="scan-result"][data-status="INVALID"]');
  check(true, "Tampered QR rejected");

  const usedRefund = await api("POST", `/api/v1/orders/${od.id}/refund`, null, token);
  check(usedRefund.status === 400 && usedRefund.json.error === "TICKET_USED", "Refund blocked after ticket used");

  const review = await api("POST", `/api/v1/events/${eventId}/reviews`, { rating: 5, comment: "ممتاز" }, token);
  check(review.status === 201, "Attendee can review");

  // ---------- 7. Customer refund ----------
  console.log("7. Customer refund");
  const order2 = await api("POST", "/api/v1/orders", { eventId, items: [{ ticketTypeId: standard.id, quantity: 1 }] }, token);
  const pay2 = await (await browser.newContext()).newPage();
  await pay2.goto(order2.json.paymentUrl);
  await Promise.all([pay2.waitForURL(/\/pay\/result/), pay2.click('[data-testid="mock-pay-success"]')]);
  const ref = await api("POST", `/api/v1/orders/${order2.json.order.id}/refund`, null, token);
  check(ref.status === 200, "Refund within policy succeeds");
  const after = await api("GET", `/api/v1/events/${eventId}`, null, token);
  check(after.json.event.ticketTypes[0].remaining === 98, "Refunded ticket returned to stock");

  // ---------- 8. Staff scanner ----------
  console.log("8. Staff account");
  await org.goto(`${BASE}/ar/organizer/staff`);
  await org.fill('input[name="name"]', "Gate staff");
  await org.fill('input[name="email"]', `staff-${run}@test.local`);
  await org.fill('input[name="password"]', pw);
  await org.click('form:has(input[name="password"]) button[type="submit"]');
  await org.waitForSelector(`text=staff-${run}@test.local`);
  const staffCtx = await browser.newContext();
  const staff = await staffCtx.newPage();
  await login(staff, `staff-${run}@test.local`, pw);
  check(staff.url().endsWith("/organizer/scan"), "Staff lands on scanner");
  await staff.goto(`${BASE}/ar/organizer/balance`);
  check(!staff.url().endsWith("/balance"), "Staff can't open balance");

  // ---------- 9. Balance & payout ----------
  console.log("9. Balance");
  await org.goto(`${BASE}/en/organizer/balance`);
  check((await org.getAttribute("html", "dir")) === "ltr", "English page is LTR");
  await org.screenshot({ path: path.join(SHOTS, "organizer-balance-en.png"), fullPage: true });

  // ---------- 10. Cancel event refunds everyone ----------
  console.log("10. Cancel event");
  org.on("dialog", (d) => d.accept());
  await org.goto(`${BASE}/ar/organizer/events/${eventId}`);
  await org.click("button.btn-danger:has-text('إلغاء الفعالية')");
  await org.waitForSelector("text=ملغاة");
  const o1 = await api("GET", `/api/v1/orders/${od.id}`, null, token);
  check(o1.json.order.status === "REFUNDED", "Paid orders refunded on cancellation");
  const gone = await api("GET", `/api/v1/events?q=${run}`);
  check(gone.json.total === 0, "Cancelled event hidden from app");

  // Screenshots for RTL/LTR review
  for (const loc of ["ar", "en"]) {
    await admin.goto(`${BASE}/${loc}/admin`);
    await admin.screenshot({ path: path.join(SHOTS, `admin-dashboard-${loc}.png`), fullPage: true });
    await admin.goto(`${BASE}/${loc}/admin/events/${eventId}`);
    await admin.screenshot({ path: path.join(SHOTS, `admin-event-${loc}.png`), fullPage: true });
  }
  await org.goto(`${BASE}/ar/organizer/events/new`);
  await org.screenshot({ path: path.join(SHOTS, "organizer-new-event-ar.png"), fullPage: true });
} catch (err) {
  failures++;
  console.error(err);
} finally {
  await browser.close();
}

writeFileSync(path.join(SHOTS, "e2e-result.txt"), failures ? `FAILED (${failures})` : "PASSED");
console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
