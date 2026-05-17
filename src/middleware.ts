import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Role-based access control
    
    // Admin routes - Only ADMIN
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Manager routes - MANAGER and ADMIN
    if (path.startsWith("/manager")) {
      const allowedRoles = ["MANAGER", "ADMIN"];
      if (!token?.role || !allowedRoles.includes(token.role)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    // Employee routes - All authenticated users (EMPLOYEE, MANAGER, ADMIN)
    // withAuth already ensures there is a token for the matched routes
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/employee/:path*",
    "/manager/:path*",
    "/admin/:path*",
  ],
};
