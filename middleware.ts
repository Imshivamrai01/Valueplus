import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith("/login");

    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return null;
    }

    if (!isAuth) {
      let from = req.nextUrl.pathname;
      if (req.nextUrl.search) {
        from += req.nextUrl.search;
      }
      return NextResponse.redirect(
        new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
      );
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => true, // We handle redirects in the middleware function
    },
    secret: process.env.NEXTAUTH_SECRET || "fallback_secret_value_for_development",
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/warehouse/:path*",
    "/sales/:path*",
    "/purchase/:path*",
    "/inventory/:path*",
    "/masters/:path*",
    "/finance/:path*",
    "/staff/:path*",
    "/marketing/:path*",
    "/banking/:path*",
    "/accounting/:path*",
    "/gst/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/login",
  ],
};
