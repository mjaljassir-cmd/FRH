import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { HttpError } from "./auth";

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wrap a route handler: converts thrown errors into JSON responses. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.code }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json({ error: "VALIDATION_ERROR", issues: err.issues }, { status: 400 });
      }
      console.error(err);
      return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
    }
  };
}

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new HttpError(400, "INVALID_JSON");
  }
  return schema.parse(json);
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}
