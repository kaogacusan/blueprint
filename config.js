/* Public Supabase settings, shared by the site, /admin and /present.
   The anon key is meant to be public: the database rules (supabase/migrations) decide what it can do.
   Without signing in, it can only add a registration. */
window.BLUEPRINT = {
  supabaseUrl: "https://rzuiynekwmzsaybgpyfd.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6dWl5bmVrd216c2F5YmdweWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMjc2NjAsImV4cCI6MjEwODYwMzY2MH0.3QvUn-lSVY1oyqE6gN_QSGZw3wY5dJCMVVO-hNdwtcQ",
};
