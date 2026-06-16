import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Use getClaims() (cryptographically verifies the JWT) — the SAME check the
  // /auth page uses. Mixing getUser() here with getClaims() there made the two
  // disagree for some sessions, bouncing /profile -> /auth -> /dashboard.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  const { pathname } = request.nextUrl;

  const PROTECTED = ["/dashboard", "/upload", "/profile", "/settings"]
  const needsAuth = PROTECTED.some((p) => pathname.startsWith(p))

  if (!isAuthenticated && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && pathname === "/auth") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

// Only run on routes that actually need the session: the protected areas and
// the auth page (to bounce already-signed-in users to the dashboard). Public
// pages skip the Supabase getUser() round-trip entirely.
//
// Note: data access is still guarded by Postgres RLS, so narrowing the matcher
// only affects the UX redirect, not security.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/upload/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/auth",
  ],
};
