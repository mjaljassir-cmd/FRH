import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runCron } from "@/lib/cron";

export async function POST(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return NextResponse.json(await runCron());
}

export const GET = POST;
