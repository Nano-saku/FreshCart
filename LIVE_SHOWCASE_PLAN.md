# Live Product Showcase — Implementation Plan
> **FreshCart** · Feature: Live Shots + Request a Live Look  
> Status: 🔄 In Progress  
> Stack: Expo 55 · Supabase · Zustand · expo-image-picker

---

## Background

FreshCart sells **fresh, perishable goods** from local vendors. A customer browsing a product
like tomatoes or fish has no way to verify the actual current quality of what's in the stall.
The goal is to give customers a **live-inspection feel** — seeing real, timestamped photos that prove
the product they're about to buy looks exactly as advertised *right now*, not weeks ago.

This is NOT live video streaming. Based on your stack (Expo + Supabase), the ideal solution is:

> **"Live Shots"** — a seller-posted, timestamped photo feed per product, displayed with real-time
> updates in the customer's product detail screen. Combined with a **"Request a Live Look"** button
> that pings the seller through the existing notification system to snap a fresh photo on demand.

---

## Why NOT full live video streaming?

| Option | Feasibility | Cost | What's needed |
|---|---|---|---|
| Agora / LiveKit WebRTC | Hard — needs separate SDK, media server | Paid tiers | Major new dependency |
| Supabase Realtime + Photos | ✅ Already have everything | Free | Just new DB table + UI |
| Expo Camera live preview | Only works locally on same device | — | Not useful for remote viewers |

**Verdict**: Live timestamped photos over Supabase Realtime is the correct approach for this app.
It is honest, practical, and builds trust without infrastructure overhead.

---

## Design Decisions (Defaults applied)

| Decision | Chosen Value | Rationale |
|---|---|---|
| Shot expiry window | **6 hours** | One full market-day; short enough to feel live |
| Max shots shown to customer | **Latest 3** in horizontal scroll | Enough to show product from multiple angles |
| Seller capture source | **Camera only** (no gallery) | Enforces authenticity — no posting old photos |
| Request cooldown | **1 per customer per product per hour** | Prevents spam, enforced in DB |
| Notification type | `general` (existing) | Reuses existing notification system |

---

## Task Checklist

- [x] Step 1: Write SQL setup file (`FreshCart Live Showcase Setup.sql`)
- [x] Step 2: Build Zustand store (`src/stores/liveShowcaseStore.ts`)
- [x] Step 3: Build seller `LiveShotUploader` modal component (`src/components/LiveShotUploader.tsx`)
- [x] Step 4: Build `SellerLiveRequestsBadge` component (`src/components/SellerLiveRequestsBadge.tsx`)
- [x] Step 5: Wire seller products screen — add Live Shots button per product (`app/(seller)/products.tsx`)
- [x] Step 6: Update seller dashboard — add Live Look Requests stat card (`app/(seller)/index.tsx`)
- [x] Step 7: Enhance customer product detail — add Live Shots carousel + Request button (`app/(customer)/product/[id].tsx`)
- [ ] Step 8: Apply SQL to Supabase & verify end-to-end flows

---

## Proposed Changes

### 1. Database — `FreshCart Live Showcase Setup.sql`

```sql
-- product_live_shots table
CREATE TABLE public.product_live_shots (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  seller_id        uuid NOT NULL REFERENCES public.profiles(id),
  image_url        text NOT NULL,
  caption          text,
  taken_at         timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '6 hours')
);

-- live_look_requests table (customer → seller ping)
CREATE TABLE public.live_look_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  customer_id      uuid NOT NULL REFERENCES public.profiles(id),
  seller_id        uuid NOT NULL REFERENCES public.profiles(id),
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','fulfilled','dismissed')),
  requested_at     timestamptz NOT NULL DEFAULT now()
);
```

**RLS Policies:**
- `product_live_shots` — public read, seller-only insert/delete (own store only)
- `live_look_requests` — customer insert, seller read+update (own store only)

**Realtime** enabled on both tables.

**Trigger** on `live_look_requests INSERT` → inserts notification row for the seller via existing notification system.

---

### 2. Zustand Store — `src/stores/liveShowcaseStore.ts`

Manages:
- `liveShots[]` — non-expired shots for the currently viewed product
- `pendingRequests[]` — pending live look requests (seller view)
- `fetchShotsForProduct(storeProductId)` — load active shots
- `subscribeToProduct(storeProductId)` — Realtime INSERT listener
- `postShot(storeProductId, imageUrl, caption?)` — seller upload
- `deleteShot(id)` — seller remove
- `requestLiveLook(storeProductId, sellerId)` — customer request
- `fetchPendingRequests(storeId)` — seller incoming requests
- `fulfillRequest(requestId)` — mark fulfilled

---

### 3. Seller Components

#### `src/components/LiveShotUploader.tsx` [NEW]
Modal sheet for sellers to manage Live Shots per product:
- Current shots grid with timestamp badges
- "📸 Take Live Shot" (camera only)
- Optional caption input
- Delete button per shot
- "X shots active · expires in Yh" header

#### `src/components/SellerLiveRequestsBadge.tsx` [NEW]
Badge component for seller screens:
- Shows count of pending "Request a Live Look" pings
- Pulsing dot animation when > 0 requests
- Tapping shows a list of requesting products

---

### 4. Modified Files

#### `app/(seller)/products.tsx` [MODIFY]
- Add "📸 Live" button to each product card
- Opens `LiveShotUploader` modal for that product

#### `app/(seller)/index.tsx` [MODIFY]
- New "Live Requests" stat card
- Shows pending request count from `liveShowcaseStore`

#### `app/(customer)/product/[id].tsx` [MODIFY]
- **Live Shots Carousel** between hero image and body
  - Horizontal scroll, latest 3, pulsing 🔴 LIVE badge
  - "Taken X min ago" relative timestamp per shot
  - Real-time: auto-updates on seller post
- **"Request a Live Look" button**
  - Creates `live_look_requests` row
  - Changes to "✓ Request Sent · checking..." on tap
  - Shows "Seller recently active 🟢" if shot < 30 min old

---

## Verification Plan

```
1. Apply SQL migration in Supabase dashboard → SQL Editor
2. Seller flow:
   a. Open Products → tap 📸 Live on a product
   b. Take photo → verify it uploads and shows timestamp badge
   c. Check Dashboard → Live Requests card visible
3. Customer flow:
   a. Open same product → Live Shots carousel appears
   b. Shots have "Taken X min ago" + 🔴 LIVE badge
   c. Tap "Request a Live Look" → button changes to ✓ sent
4. Realtime check:
   a. Seller posts new shot while customer screen is open
   b. Shot appears in carousel WITHOUT customer refreshing
5. Expiry check (optional):
   a. Temporarily change interval to '1 minute' in SQL
   b. Shot disappears from carousel after 1 min
```

---

## Notes for resuming

If you are picking this up in a new session:
1. The notification system (Zustand store + banner + DB triggers) was completed in a previous session.
   SQL file: `FreshCart Notification System Setup.sql` in the project root.
2. The main schema is in `FreshCart Schema Reset & RLS Setupv4.3.sql`.
3. Image uploads use `src/hooks/useImageUpload.ts` → Supabase `images` bucket.
4. Theme system is in `src/contexts/ThemeContext.tsx` and `src/constants/colors.ts`.
5. All screens use `src/components/AppScreen.tsx` as the root wrapper.
