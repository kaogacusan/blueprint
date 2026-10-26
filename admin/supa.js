/* Shared Supabase client for /admin and /present. The session is kept in localStorage,
   so signing in on /admin also signs you in to the presentations. */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

const { supabaseUrl, supabaseAnonKey } = window.BLUEPRINT;
export const supa = createClient(supabaseUrl, supabaseAnonKey);

/* true only for signed-in people on the team list */
export async function isTeam() {
  const { data, error } = await supa.rpc("is_team");
  return !error && data === true;
}
