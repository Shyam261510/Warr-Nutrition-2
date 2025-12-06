import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const currentPath = req.nextUrl.pathname;

  if (currentPath === "/Protein") {
    return NextResponse.redirect(new URL("/Whey%20Performance", req.url));
  }

  if (currentPath === "/Multi%20Vitamin" || currentPath === "/Multi Vitamin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/Protein", "/Multi%20Vitamin", "/Multi Vitamin"],
};
