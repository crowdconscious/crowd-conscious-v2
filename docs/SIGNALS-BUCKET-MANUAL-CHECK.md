# Citizen Signals — Evidence Bucket Manual Verification

Migration `supabase/migrations/219_citizen_signals_mvp.sql` (section 12) creates
the private `citizen-signals-evidence` storage bucket. If a user reports that
uploads silently fail or that the bucket is missing in Supabase Studio, walk
through the checklist below before considering a follow-up migration.

## TL;DR — Verify in Supabase Studio

1. Open **Supabase → Storage → Buckets**.
2. Confirm a bucket named `citizen-signals-evidence` exists.
3. Click it. In the bucket settings panel verify:
   - **Public bucket:** `OFF` (must be private).
   - **File size limit:** `10 MB` (`10485760` bytes).
   - **Allowed MIME types:** at minimum `image/jpeg`, `image/png`,
     `image/webp`. (`image/gif` and `application/pdf` are also tolerated
     by the bucket because migration 219 inherited a wider list, but the
     application layer at `app/api/signals/upload/route.ts` rejects
     everything outside the image-only allow-list — see "Application
     contract" below.)

If everything matches, no further action is needed. The Citizen Signals
upload flow goes through the service-role client and writes objects under
`{user_id}/{timestamp}_{random}.{ext}`.

## If the bucket is missing

This means migration 219 did not apply cleanly (likely a manual partial run
on staging, or a permissions issue with the Postgres role used by the
Supabase CLI). Re-run the bucket-creation block by hand from the SQL editor:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'citizen-signals-evidence',
  'citizen-signals-evidence',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
```

This statement is idempotent and matches migration 219 verbatim. After
running, repeat the verification checklist above.

## If you also want to tighten the bucket to images-only at the storage layer

The application already rejects non-image uploads (see the next section), so
this step is defence-in-depth, not a correctness fix. From the SQL editor:

```sql
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
]
WHERE id = 'citizen-signals-evidence';
```

Do not encode this into the existing migration 219 — that migration is
already in the production history and must not be modified. Add it as a
future migration (e.g. `220_signals_evidence_images_only.sql`) if you decide
to lock the bucket policy itself.

## Application contract (enforced server-side)

Even if the bucket is permissive, the upload route
`app/api/signals/upload/route.ts` enforces the pilot contract:

- **Auth:** signed-in users only.
- **Rate limit:** moderate (`signals-upload:{user_id}`).
- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`,
  `image/heic`, `image/heif`. Anything else returns 400.
- **Max size:** 10 MB. Larger files return 400.
- **Path layout:** `{user_id}/{timestamp}_{random}.{ext}` so the orphan
  janitor cron can scope cleanup to a single user safely.

## RLS posture

Migration 219 deliberately does **not** add public `storage.objects` policies
for this bucket. All reads happen via signed URLs handed out by the API
after it verifies the requester is the author or an admin, or that the
attached `citizen_signal_evidence` row has `visibility = 'public'` AND its
parent signal is `published`. The service-role client bypasses storage RLS
for writes and signed-URL issuance.

If you ever need to expose the bucket more permissively (e.g. authenticated
SELECT for the uploader, scoped by path prefix), add the policy in a new
migration like:

```sql
CREATE POLICY citizen_signals_evidence_uploader_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'citizen-signals-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

Do not edit migration 219.
