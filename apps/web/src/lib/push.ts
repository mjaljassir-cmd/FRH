import { prisma } from "@events/db";

interface PushMessage {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  data?: Record<string, string>;
}

/** Send a push notification to users, each in their own language. Returns number of devices targeted. */
export async function sendPushToUsers(userIds: string[], msg: PushMessage): Promise<number> {
  if (userIds.length === 0) return 0;
  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: userIds }, user: { isActive: true } },
    select: { token: true, user: { select: { locale: true } } },
  });
  const messages = tokens.map((t) => ({
    to: t.token,
    sound: "default",
    title: t.user.locale === "en" ? msg.titleEn : msg.titleAr,
    body: t.user.locale === "en" ? msg.bodyEn : msg.bodyAr,
    data: msg.data ?? {},
  }));

  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(chunk),
      });
      const body = (await res.json().catch(() => null)) as {
        data?: { status: string; details?: { error?: string } }[];
      } | null;
      // Remove tokens for uninstalled apps
      const dead = (body?.data ?? [])
        .map((r, idx) => (r.details?.error === "DeviceNotRegistered" ? chunk[idx].to : null))
        .filter((t): t is string => !!t);
      if (dead.length) await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
    } catch (err) {
      console.error("[push] send failed", err);
    }
  }
  return messages.length;
}
