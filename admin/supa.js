/* Shared Supabase client for /admin and /present. The session is kept in localStorage,
   so signing in on /admin also signs you in to the presentations.
   The library is served from our own site (assets/vendor/supabase.js, v2.45.4), not a CDN,
   so nobody else's server can change the code that handles the team's data. */
import "/assets/vendor/supabase.js";

const { supabaseUrl, supabaseAnonKey } = window.BLUEPRINT;
export const supa = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

/* true only for signed-in people on the team list */
export async function isTeam() {
  const { data, error } = await supa.rpc("is_team");
  return !error && data === true;
}
