import { createClient } from "@supabase/supabase-js";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser client — used in the admin dashboard for staff auth and for
 * RLS-protected reads (subscribers/alerts are readable only to team members).
 */

if (!url || !anon) {
  throw new Error('Missing Supabase environment variables');
}

export function createBrowserClient() {
  return createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true },
    realtime: { params: { eventsPerSecond: 5 } },
  });
}


/**
 * Server client with the service role key. Bypasses RLS — used by the Telegram
 * webhook and by the send/team endpoints AFTER an RBAC check. Never import this
 * into a Client Component.
 */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Server client bound to a caller's access token. Used to identify the staff
 * member behind an admin API request (getUser) so we can look up their role.
 */
export function createTokenClient(accessToken: string) {
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
