import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { i18n, type Locale } from "@/lib/i18n/config";

const LOCALES = new Set<string>(i18n.locales);

function pickLocale(req: NextRequest): Locale {
  const cookie = req.cookies.get("NEXT_LOCALE")?.value;
  if (cookie && LOCALES.has(cookie)) return cookie as Locale;

  const accept = req.headers.get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase().split("-")[0];
    if (tag && LOCALES.has(tag)) return tag as Locale;
  }
  return i18n.defaultLocale;
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const [, first, ...rest] = pathname.split("/");

  if (first && LOCALES.has(first)) return NextResponse.next();

  const locale = pickLocale(req);
  const tail = rest.length ? `/${rest.join("/")}` : "";
  return NextResponse.redirect(new URL(`/${locale}${tail}${search}`, req.url));
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
