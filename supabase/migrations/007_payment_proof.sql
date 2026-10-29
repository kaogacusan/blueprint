-- Simpler payment: no code in the GCash message, no reference number to type.
-- Each sign-up gets a private payment link (pay_token). On /pay they see the QR and upload a
-- screenshot of their GCash receipt. The team opens the screenshot, checks GCash, and clicks Paid.

alter table public.registrations
  add column pay_token uuid not null unique default gen_random_uuid(),
  add column proof_path text not null default '' check (char_length(proof_path) <= 200),
  add column proof_at timestamptz;

-- Screenshots go in the private "payment" bucket under proofs/. Only the server (api/pay.js) uploads them.
-- The core team (owner + viewers, not guests) can open them to check; the owner deletes them with the sign-ups.
create policy "staff reads payment proofs" on storage.objects for select to authenticated
  using (bucket_id = 'payment' and name like 'proofs/%' and public.is_staff());
create policy "owner deletes payment files" on storage.objects for delete to authenticated
  using (bucket_id = 'payment' and public.is_owner());
