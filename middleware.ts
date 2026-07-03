import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  
  // Get hostname (e.g., 'admin.meetshatter.com', 'localhost:3000')
  const hostname = req.headers.get("host") || "";
  
  // We only care about the subdomain part
  let currentSubdomain = "";
  if (hostname.includes("admin.meetshatter.com") || hostname.startsWith("admin.localhost")) {
    currentSubdomain = "admin";
  } else if (hostname.includes("team.meetshatter.com") || hostname.startsWith("team.localhost")) {
    currentSubdomain = "team";
  } else if (hostname.includes("client.meetshatter.com") || hostname.startsWith("client.localhost")) {
    currentSubdomain = "client";
  }

  // Allow static files, api routes, and next-auth routes to pass through natively
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.includes(".") // e.g., favicon.ico
  ) {
    return NextResponse.next();
  }

  // Authentication & RBAC Check
  const session = await auth();
  
  // If not logged in, and trying to access a portal route, redirect to login
  if (!session && url.pathname !== "/login") {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // RBAC checks for authenticated users
  if (session && session.user) {
    const role = session.user.role; // 'administrator', 'freelancer', 'employee', 'client'
    
    // If they are on the login page but already logged in, redirect them to their dashboard
    if (url.pathname === "/login") {
      if (role === "administrator") currentSubdomain = "admin";
      else if (role === "client") currentSubdomain = "client";
      else currentSubdomain = "team";
      url.pathname = "/dashboard";
    }

    // Role vs Subdomain validation
    if (currentSubdomain === "admin" && role !== "administrator") {
      return new NextResponse("Forbidden: You do not have admin access.", { status: 403 });
    }
    if (currentSubdomain === "team" && role === "client") {
      return new NextResponse("Forbidden: Clients cannot access the team portal.", { status: 403 });
    }
    if (currentSubdomain === "client" && role !== "client") {
      return new NextResponse("Forbidden: Internal staff cannot access the client portal directly.", { status: 403 });
    }
  }

  // Subdomain Rewriting
  if (currentSubdomain) {
    // Prevent double rewriting if URL is already rewritten internally (some edge cases)
    if (!url.pathname.startsWith(`/${currentSubdomain}`)) {
      url.pathname = `/${currentSubdomain}${url.pathname === "/" ? "/dashboard" : url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
