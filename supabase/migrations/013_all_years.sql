-- Blueprint is open to every year level (Nov 11). The site and api/register.js offer 1st and 2nd year too.
alter table public.registrations drop constraint if exists registrations_year_check;
alter table public.registrations add constraint registrations_year_check
  check (year = any (array['1st year', '2nd year', '3rd year', '4th year', 'Fresh grad', 'Other']));
