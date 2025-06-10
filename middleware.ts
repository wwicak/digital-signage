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
  const protectedPaths = [
    "/layout-admin",
    "/layouts",
    "/screens",
    "/slideshows",
    "/slideshows-with-query",
    "/slideshow",
    "/preview",
    "/users",
  ];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath) {
    // Check for authentication cookies from both auth systems
    const loggedInCookie = request.cookies.get("loggedIn");
    const authTokenCookie = request.cookies.get("auth-token");

    // User is authenticated if either cookie exists and is valid
    const isAuthenticated =
      (loggedInCookie && loggedInCookie.value === "true") ||
      (authTokenCookie && authTokenCookie.value);

    if (!isAuthenticated) {
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
