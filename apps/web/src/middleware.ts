import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const m = pathname.match(/^\/(ar|en)\/(admin|organizer)(\/|$)/);
  if (m && !req.cookies.get("session")) {
    const url = req.nextUrl.clone();
    url.pathname = `/${m[1]}/login`;
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return intl(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
