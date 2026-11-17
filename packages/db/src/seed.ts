/**
 * Seed: admin account, cities, categories and platform settings.
 * With SEED_DEMO=1 also creates a demo organizer, events and a customer.
 *
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret123 pnpm db:seed
 */
import bcrypt from "bcryptjs";
import { prisma } from "./index";

const cities = [
  { nameAr: "الرياض", nameEn: "Riyadh", lat: 24.7136, lng: 46.6753 },
  { nameAr: "جدة", nameEn: "Jeddah", lat: 21.4858, lng: 39.1925 },
  { nameAr: "مكة المكرمة", nameEn: "Makkah", lat: 21.3891, lng: 39.8579 },
  { nameAr: "المدينة المنورة", nameEn: "Madinah", lat: 24.5247, lng: 39.5692 },
  { nameAr: "الدمام", nameEn: "Dammam", lat: 26.4207, lng: 50.0888 },
  { nameAr: "الخبر", nameEn: "Khobar", lat: 26.2172, lng: 50.1971 },
  { nameAr: "أبها", nameEn: "Abha", lat: 18.2465, lng: 42.5117 },
  { nameAr: "تبوك", nameEn: "Tabuk", lat: 28.3835, lng: 36.5662 },
  { nameAr: "العلا", nameEn: "AlUla", lat: 26.6084, lng: 37.9232 },
];

const categories = [
  { nameAr: "حفلات", nameEn: "Concerts" },
  { nameAr: "رياضة", nameEn: "Sports" },
  { nameAr: "مؤتمرات", nameEn: "Conferences" },
  { nameAr: "ورش عمل", nameEn: "Workshops" },
  { nameAr: "معارض", nameEn: "Exhibitions" },
  { nameAr: "عائلي", nameEn: "Family" },
  { nameAr: "مسرح", nameEn: "Theater" },
];

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin12345";
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Admin", role: "ADMIN", passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`Admin: ${email}`);

  if ((await prisma.city.count()) === 0) {
    await prisma.city.createMany({ data: cities.map((c, i) => ({ ...c, sortOrder: i })) });
  }
  if ((await prisma.category.count()) === 0) {
    await prisma.category.createMany({ data: categories.map((c, i) => ({ ...c, sortOrder: i })) });
  }
  await prisma.platformSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  if (process.env.SEED_DEMO === "1") await demo();
}

async function demo() {
  const pw = await bcrypt.hash("demo12345", 10);
  const riyadh = await prisma.city.findFirstOrThrow({ where: { nameEn: "Riyadh" } });
  const jeddah = await prisma.city.findFirstOrThrow({ where: { nameEn: "Jeddah" } });
  const concerts = await prisma.category.findFirstOrThrow({ where: { nameEn: "Concerts" } });
  const workshops = await prisma.category.findFirstOrThrow({ where: { nameEn: "Workshops" } });

  const owner = await prisma.user.upsert({
    where: { email: "organizer@example.com" },
    update: {},
    create: {
      email: "organizer@example.com",
      name: "Demo Organizer",
      phone: "0500000000",
      role: "ORGANIZER",
      passwordHash: pw,
      organizer: {
        create: {
          name: "Demo Events Co.",
          commercialRegNumber: "1010000000",
          commercialRegFileUrl: "http://localhost:3000/api/files/docs/demo.pdf",
          iban: "SA0380000000608010167519",
          bankName: "Al Rajhi Bank",
          accountHolderName: "Demo Events Co.",
          status: "APPROVED",
          commissionRate: 10,
        },
      },
    },
    include: { organizer: true },
  });
  await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: { email: "customer@example.com", name: "Demo Customer", role: "CUSTOMER", passwordHash: pw, cityId: riyadh.id },
  });

  if ((await prisma.event.count({ where: { organizerId: owner.organizer!.id } })) > 0) return;
  const day = 24 * 3600 * 1000;
  const now = Date.now();
  const img = (seed: string) => `https://picsum.photos/seed/${seed}/1200/600`;
  await prisma.event.create({
    data: {
      organizerId: owner.organizer!.id,
      titleAr: "ليلة موسيقية في الرياض",
      titleEn: "Music Night in Riyadh",
      descriptionAr: "أمسية موسيقية مميزة مع نخبة من الفنانين.",
      descriptionEn: "A special musical evening with top artists.",
      coverImageUrl: img("music"),
      categoryId: concerts.id,
      cityId: riyadh.id,
      venueName: "Boulevard City",
      address: "Riyadh, Boulevard City",
      lat: 24.7686,
      lng: 46.6023,
      startAt: new Date(now + 10 * day),
      endAt: new Date(now + 10 * day + 4 * 3600 * 1000),
      refundPolicyType: "REFUNDABLE_UNTIL",
      refundHoursBefore: 48,
      status: "PUBLISHED",
      isFeatured: true,
      ticketTypes: {
        create: [
          { nameAr: "عادي", nameEn: "Standard", price: 15000, quantity: 500, sortOrder: 0 },
          { nameAr: "VIP", nameEn: "VIP", price: 45000, quantity: 50, sortOrder: 1 },
        ],
      },
    },
  });
  await prisma.event.create({
    data: {
      organizerId: owner.organizer!.id,
      titleAr: "ورشة التصوير الفوتوغرافي",
      titleEn: "Photography Workshop",
      descriptionAr: "ورشة عملية لتعلم أساسيات التصوير.",
      descriptionEn: "A hands-on workshop on photography basics.",
      coverImageUrl: img("photo"),
      categoryId: workshops.id,
      cityId: jeddah.id,
      venueName: "Jeddah Art Hub",
      address: "Jeddah, Al Balad",
      lat: 21.4858,
      lng: 39.1868,
      startAt: new Date(now + 5 * day),
      endAt: new Date(now + 5 * day + 3 * 3600 * 1000),
      refundPolicyType: "NO_REFUND",
      status: "PUBLISHED",
      ticketTypes: { create: [{ nameAr: "مجاني", nameEn: "Free", price: 0, quantity: 30, sortOrder: 0 }] },
    },
  });
  console.log("Demo data: organizer@example.com / customer@example.com (password demo12345)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
