import { eventListQuerySchema } from "@events/shared";
import { json, route } from "@/lib/api";
import { listPublicEvents } from "@/lib/events";

export const GET = route(async (req) => {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const q = eventListQuerySchema.parse(params);
  return json(await listPublicEvents(q));
});
