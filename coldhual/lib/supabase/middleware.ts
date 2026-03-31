/**
 * Supabase Auth Middleware
 *
 * TODO: Replace this stub with real Supabase session refresh middleware:
 *
 * import { createServerClient } from "@supabase/ssr";
 * import { NextResponse, type NextRequest } from "next/server";
 *
 * export async function updateSession(request: NextRequest) {
 *   let supabaseResponse = NextResponse.next({ request });
 *
 *   const supabase = createServerClient(
 *     process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
 *     {
 *       cookies: {
 *         getAll() { return request.cookies.getAll(); },
 *         setAll(cookiesToSet) {
 *           cookiesToSet.forEach(({ name, value }) =>
 *             request.cookies.set(name, value)
 *           );
 *           supabaseResponse = NextResponse.next({ request });
 *           cookiesToSet.forEach(({ name, value, options }) =>
 *             supabaseResponse.cookies.set(name, value, options)
 *           );
 *         },
 *       },
 *     }
 *   );
 *
 *   const { data: { user } } = await supabase.auth.getUser();
 *
 *   // Route protection by role
 *   if (!user && !request.nextUrl.pathname.startsWith("/login")) {
 *     return NextResponse.redirect(new URL("/login", request.url));
 *   }
 *
 *   // Get profile role from DB and enforce role-based routing:
 *   // /dashboard/3pl/*     → requires role: '3pl'
 *   // /dashboard/carrier/* → requires role: 'carrier'
 *   // /admin/*             → requires role: 'admin'
 *
 *   return supabaseResponse;
 * }
 *
 * Route protection matrix:
 *   /login              → public
 *   /signup             → public
 *   /onboarding/*       → authenticated (any role)
 *   /dashboard/3pl/*    → role: '3pl'
 *   /dashboard/carrier/*→ role: 'carrier'
 *   /admin/*            → role: 'admin'
 */

// ─── DEMO STUB ────────────────────────────────────────────────────────────────
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // In demo mode, redirect / → /login if no demo session
  // Real auth middleware goes here (see above).
  return NextResponse.next();
}
