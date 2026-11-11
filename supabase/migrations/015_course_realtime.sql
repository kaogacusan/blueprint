-- The workspace's Course page and its "to check" badge update live when a receipt comes in.
-- Only course_orders: learners stays off realtime so sign-in fields never leave the database.
alter publication supabase_realtime add table public.course_orders;
