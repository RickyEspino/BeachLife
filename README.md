This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
## BeachLife Routes

Key application routes (non-exhaustive):

- `/now` – Current beach conditions dashboard
- `/map` – Interactive beach / merchant map
	- Merchant locations with latitude/longitude are rendered as pins (🏪) refreshed every 2 minutes.
		- Supports focusing via query params: `/map?lat=..&lng=..&z=15&focus=<merchantId>` to center and open popup.
		- Category chips (Google / Snapchat inspired) overlay lets users filter visible merchant pins client-side by category. Toggle one (single-select) or extend component for multi-select.
			- Implemented in `CategoryChips` (`src/components/CategoryChips.tsx`) and injected on the map page with dynamic import (client only).
			- Current styling variants: `google` (pill buttons) and `snap` (blurred gradient rounded group). Adjust via `variant` prop.
			- Filtering is presently DOM-based (hides markers by data attributes) to avoid refetch; can be promoted to state-level filtering inside `MapComponent` later.
- `/community` – Community feed (placeholder)
- `/reels` – Short-form content (placeholder)
- `/me` – User dashboard
- `/merchant` – Merchant owner dashboard (requires auth & ownership)
- `/merchant/onboarding` – Create merchant profile
- `/merchants` – Public list of participating merchants
	- `/merchants/[id]` – Public merchant detail page
		- Shows basic info and last 5 reward issuances (masked codes, points, status) plus a View on Map CTA when coordinates exist.

## Avatar Storage & Upload

The avatar system uses Supabase Storage bucket `avatars` with per-user folders/paths:

- Object key pattern: `<user_id>/avatar.webp` (stable overwrite)  
- Public read policy (or switch to signed URLs if privacy needed)  
- RLS policies restrict INSERT/UPDATE/DELETE to `split_part(object_name,'/',1) = auth.uid()`

### Policies (reference)
```sql
create policy "avatars_insert_own" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and split_part(object_name,'/',1) = auth.uid()::text
);

create policy "avatars_update_own" on storage.objects
for update to authenticated
using (
  bucket_id = 'avatars'
  and split_part(object_name,'/',1) = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and split_part(object_name,'/',1) = auth.uid()::text
);

create policy "avatars_delete_own" on storage.objects
for delete to authenticated
using (
  bucket_id = 'avatars'
  and split_part(object_name,'/',1) = auth.uid()::text
);

create policy "avatars_read_public" on storage.objects
for select using ( bucket_id = 'avatars' );
```

### Client Flow
1. User selects an image file (max 8MB).  
2. Image resized client-side to max 512px (WebP, quality 0.85) stripping EXIF.  
3. Upload with `upsert: true` to stable path.  
4. Public URL retrieved and cache-busted with `?v=timestamp`.  
5. `profiles.avatar_url` updated (no insert; profile presumed to exist).  

### Why Stable Path
- Avoid storage clutter (only latest avatar kept)  
- Simplifies CDN caching (single object URL + cache-bust param)  

### Switching to Private Avatars
- Remove public select policy; generate signed URLs via `createSignedUrl(path, ttlSeconds)` on render.  
- Optionally store just relative path in `profiles` (e.g. `avatar.webp`) and build signed URL server-side.  

### Offline / Edge Cases
- If profile row might not exist, add an upsert before the update:  
  `supabase.from('profiles').upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })`  

---
# BeachLife
