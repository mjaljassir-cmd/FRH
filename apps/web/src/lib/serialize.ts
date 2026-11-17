import type { User } from "@events/db";

export function serializeMe(u: User) {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, cityId: u.cityId, locale: u.locale };
}
