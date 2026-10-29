-- Receipt screenshots are now encrypted by the site's server before they're stored (api/_lib.js: seal),
-- and the team opens them through /api/signups ("receipt"), which checks the login and logs the view.
-- So nobody needs to read the files straight from storage anymore. The owner keeps access to the
-- bucket for the GCash QR and for deleting receipts with the sign-ups.
drop policy "staff reads payment proofs" on storage.objects;
