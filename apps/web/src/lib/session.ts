import { prisma, type Organizer, type User } from "@events/db";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "./auth";

export async function pageUser(locale: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user || user.role === "CUSTOMER") {
    redirect({ href: "/login", locale });
    throw new Error("unreachable");
  }
  return user;
}

export async function requireAdminPage(locale: string) {
  const user = await pageUser(locale);
  if (user.role !== "ADMIN") redirect({ href: homeFor(user.role), locale });
  return user;
}

/** Organizer owner. With approved=true, unapproved organizers are sent to their dashboard. */
export async function requireOrganizerPage(locale: string, opts: { approved?: boolean } = {}) {
  const user = await pageUser(locale);
  if (user.role !== "ORGANIZER") {
    redirect({ href: homeFor(user.role), locale });
  }
  const organizer = await prisma.organizer.findUnique({ where: { ownerId: user.id } });
  if (!organizer) {
    redirect({ href: "/login", locale });
    throw new Error("unreachable");
  }
  if (opts.approved && organizer.status !== "APPROVED") redirect({ href: "/organizer", locale });
  return { user, organizer: organizer as Organizer };
}

export function homeFor(role: User["role"]) {
  if (role === "ADMIN") return "/admin";
  if (role === "STAFF") return "/organizer/scan";
  return "/organizer";
}
