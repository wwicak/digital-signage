import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Add CORS headers
  const response = NextResponse.next();

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: response.headers });
  }

  // Check authentication for protected routes
  const protectedPaths = ["/layout-admin", "/screens", "/slideshows"];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath) {
    // Check for authentication cookie or session
    const sessionCookie = request.cookies.get("sessionId");

    if (!sessionCookie) {
      // Redirect to login if not authenticated
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - uploads (upload files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|uploads).*)",
  ],
};
