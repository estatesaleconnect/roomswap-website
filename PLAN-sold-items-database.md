# Room Swap Centralized Pricing Database — Implementation Plan

## Vision
A **centralized, multi-store pricing database** where any consignment store can photograph an item and get real pricing based on actual sold items. Room Swap's data seeds it first, then other stores can feed in, making the model smarter with every sale logged across the network.

---

## Current State

| What | How it works today | Limitation |
|------|-------------------|------------|
| Sales data | Browser `localStorage` | Lost on browser clear, single device only, no photos |
| Gallery photos | `/uploads/` folder + JSON files via Decap CMS | Not linked to sales/pricing data |
| Pricing AI | Claude API with hardcoded ranges + localStorage corrections | No persistent training data, no photo context |

---

## Proposed Architecture

### Core: **Supabase** (PostgreSQL + File Storage + Auth + API)

```
┌─────────────────────────────────────────────────────┐
│              CENTRALIZED PRICING DATABASE            │
│                    (Supabase)                        │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ PostgreSQL   │  │ Photo Storage │  │ Auth /    │  │
│  │ sold_items   │  │ (CDN-backed) │  │ API Keys  │  │
│  │ stores       │  │              │  │           │  │
│  │ corrections  │  │              │  │           │  │
│  └─────────────┘  └──────────────┘  └───────────┘  │
└──────────────┬──────────────────────────┬───────────┘
               │          API             │
     ┌─────────┴──────┐        ┌──────────┴──────────┐
     │  Room Swap      │        │  Future Store B     │
     │  (Netlify)      │        │  (any website)      │
     │                 │        │                     │
     │ • Pricing Tool  │        │ • Their own pricing │
     │ • Sold Items UI │        │   tool or app       │
     │ • Photo upload  │        │ • Feeds data in     │
     └────────────────┘        └─────────────────────┘
```

### Why Supabase?
| Option | Pros | Cons |
|--------|------|------|
| **Supabase** | Free PostgreSQL + file storage + auth + row-level security, JS client, REST API, multi-tenant ready | Requires account setup |
| Firebase | Similar free tier | More complex, Google lock-in, no SQL |
| Custom server (Express/Node) | Full control | Hosting cost, maintenance burden |
| Airtable | Simple UI | 1,200 records on free tier, no real API auth |

**Recommendation: Supabase** — real database, file storage, API keys for multi-store access, all free tier.

---

## Database Schema

### `stores` table (multi-tenant support)
```sql
CREATE TABLE stores (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT now(),
  name          TEXT NOT NULL,              -- "Room Swap Consignments"
  location      TEXT,                       -- "Holly Hill, SC"
  region        TEXT,                       -- "SC Lowcountry" (for regional pricing)
  api_key       TEXT UNIQUE,               -- Per-store API key for data submission
  is_active     BOOLEAN DEFAULT true,
  settings      JSONB DEFAULT '{}'         -- Store-specific config
);
```

### `sold_items` table
```sql
CREATE TABLE sold_items (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT now(),
  store_id      UUID REFERENCES stores(id), -- Which store sold this

  -- Item details
  title         TEXT NOT NULL,              -- "La-Z-Boy leather recliner"
  description   TEXT,                       -- Longer notes, features, flaws
  category      TEXT NOT NULL,              -- "Chairs", "Tables", etc.
  condition     TEXT,                       -- "Good", "Excellent", etc.

  -- Pricing data
  asking_price  DECIMAL(10,2),             -- What it was listed at
  sold_price    DECIMAL(10,2) NOT NULL,    -- What it actually sold for
  ai_suggested  DECIMAL(10,2),             -- What the AI recommended (accuracy tracking)

  -- Timing
  date_listed   DATE,
  date_sold     DATE,
  days_on_floor INTEGER,

  -- Item attributes (for pattern matching & search)
  brand         TEXT,                       -- "La-Z-Boy", "Ethan Allen"
  material      TEXT,                       -- "leather", "solid wood"
  color         TEXT,                       -- "brown", "white"
  style         TEXT,                       -- "modern", "farmhouse"
  dimensions    TEXT,                       -- "48x24x30 inches"

  -- Photos (array of Supabase Storage URLs)
  photos        TEXT[],                     -- ["/sold-photos/uuid/1.jpg", ...]

  -- Metadata
  entered_by    TEXT DEFAULT 'staff',
  notes         TEXT
);

-- Index for fast category + keyword lookups when pricing
CREATE INDEX idx_sold_items_category ON sold_items(category);
CREATE INDEX idx_sold_items_store ON sold_items(store_id);
CREATE INDEX idx_sold_items_date_sold ON sold_items(date_sold);
CREATE INDEX idx_sold_items_brand ON sold_items(brand);
```

### `pricing_corrections` table
```sql
CREATE TABLE pricing_corrections (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       TIMESTAMPTZ DEFAULT now(),
  store_id         UUID REFERENCES stores(id),
  item_description TEXT NOT NULL,
  condition        TEXT,
  ai_price         DECIMAL(10,2),
  correct_price    DECIMAL(10,2) NOT NULL,
  note             TEXT
);
```

### Row-Level Security (multi-store isolation)
```sql
-- Stores can only read/write their own data by default
-- But ALL stores can READ sold_items from ALL stores (shared pricing intelligence)
-- Only the owning store can UPDATE/DELETE their own records
ALTER TABLE sold_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stores can read all sold items" ON sold_items
  FOR SELECT USING (true);

CREATE POLICY "Stores can insert their own items" ON sold_items
  FOR INSERT WITH CHECK (store_id = current_setting('app.current_store_id')::uuid);

CREATE POLICY "Stores can update their own items" ON sold_items
  FOR UPDATE USING (store_id = current_setting('app.current_store_id')::uuid);
```

### Supabase Storage
```
sold-item-photos/
  ├── {store-id}/
  │   ├── {item-id}/
  │   │   ├── photo-1.jpg
  │   │   ├── photo-2.jpg
  │   │   └── photo-3.jpg
```

---

## Implementation Phases

### Phase 1: Foundation — Database + API
1. **Create Supabase project** (manual — you sign up at supabase.com)
2. **Run SQL to create tables** (I'll provide the exact script)
3. **Create storage bucket** for photos with public read access
4. **New Netlify function: `netlify/functions/sold-items.js`**
   - `POST /sold-items` — Add a sold item (with photo URLs)
   - `GET /sold-items` — List/search/filter sold items
   - `GET /sold-items?similar=description` — Find similar items for pricing
   - `PUT /sold-items/:id` — Update a record
   - `DELETE /sold-items/:id` — Remove a record
5. **New Netlify function: `netlify/functions/upload-photo.js`**
   - Accepts photo upload, compresses, stores in Supabase Storage
   - Returns the CDN URL
6. **Store credentials** as Netlify env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`

### Phase 2: Staff UI — Sold Items Manager
7. **New page: `sold-items.html`** (PIN-protected, matches Room Swap design)
   - **Log Sale form**: Photo capture/upload (phone camera or file), description, category, condition, prices, dates
   - **Photo-first workflow**: Staff snaps photos → fills in details → saves
   - **Browse & search**: Gallery grid view of all sold items with photos, filterable by category/brand/date/price range
   - **Edit/delete** records
   - **CSV import** for bulk historical data
   - **Stats dashboard**: Revenue, avg prices by category, turnover speed, AI accuracy rate

### Phase 3: Smart Pricing Integration
8. **Upgrade pricing tool** to query the centralized database:
   - When pricing a new item, fetch 10-20 most similar sold items (by category + keyword matching)
   - Include them in Claude prompt: "Here are similar items that actually sold in our store..."
   - Much more accurate than hardcoded price ranges
9. **Photo-aware pricing**: Staff uploads a photo of a new item → Claude Vision analyzes it + cross-references similar sold items with photos
10. **AI accuracy tracking**: Log what the AI suggested vs. what it actually sold for → continuously measure and improve

### Phase 4: Multi-Store Network
11. **Store registration system**: New stores get an API key and can submit their sold items
12. **Aggregate pricing intelligence**: When pricing, pull data from ALL stores (weighted by region/similarity)
13. **Store dashboard**: Each store sees their own data + aggregate network stats
14. **API documentation**: Simple REST API so any store's website/POS can feed in data

### Phase 5: Data Migration
15. **Migrate existing localStorage** sales + corrections into the database
16. **Pricing tool falls back gracefully** if database is unreachable

---

## How the Centralized Model Works

### For Room Swap (Day 1)
```
Staff photographs a dining table
  → Photos uploaded to Supabase Storage
  → Staff fills in: "Oak dining table, 6 chairs, good condition"
  → AI checks database: "12 similar dining sets sold for $125-$275"
  → AI suggests: $200
  → Item sells for $185 after 18 days
  → Staff logs the sale → database gets smarter
```

### For Another Store (Future)
```
Store B in Charleston photographs a recliner
  → Sends to the centralized API
  → AI pulls: 8 recliners from Room Swap + 3 from Store B's own history
  → Adjusts for regional market differences
  → Returns pricing recommendation
  → Store B logs the sale when it sells → everyone benefits
```

### Network Effect
- **10 items**: Basic category pricing
- **100 items**: Brand and material patterns emerge
- **500 items**: Seasonal trends, regional differences, condition impact
- **1,000+ items across stores**: Highly accurate, photo-informed pricing

---

## New Files

| File | Purpose |
|------|---------|
| `sold-items.html` | Staff UI — sold items database manager |
| `netlify/functions/sold-items.js` | API: CRUD + search for sold items |
| `netlify/functions/upload-photo.js` | API: Photo upload + compression |
| `netlify/functions/lib/supabase.js` | Shared Supabase client |

## Modified Files

| File | Changes |
|------|---------|
| `pricing-tool.html` | Fetch training data from Supabase instead of localStorage |
| `netlify/functions/pricing-proxy.js` | Fetch similar sold items to enrich AI context |
| `netlify.toml` | Add redirects for new endpoints |

---

## Photo Storage Strategy

- **Client-side compression**: Resize to max 1200px wide, JPEG 80% quality (~100-200KB)
- **Phone camera support**: Direct capture from mobile device camera
- **Limit**: Up to 5 photos per item
- **Storage math**: 1GB free tier ≈ 5,000-10,000 photos ≈ **1,000-2,000 items with ~5 photos**
- **Upgrade path**: Supabase Pro ($25/mo) = 100GB storage = ~500,000 photos
- **CDN delivery**: Photos served via Supabase CDN — fast globally

---

## Cost Projections

### Free Tier (Room Swap only, first 1-2 years)
| Service | Free Limit | Estimated Usage |
|---------|-----------|-----------------|
| Supabase Database | 500MB | ~5MB first year |
| Supabase Storage | 1GB | ~200MB first year |
| Supabase API | 500K req/month | ~5K/month |
| Claude API | Pay per use | Already paying |
| **Total additional** | | **$0/month** |

### Growth Tier (Multi-store, 5+ stores)
| Service | Cost | What you get |
|---------|------|-------------|
| Supabase Pro | $25/month | 8GB database, 100GB storage, unlimited API |
| Claude API | ~$20-50/month | Higher volume pricing requests |
| **Total** | | **~$45-75/month** |

This could easily be offset by charging partner stores a small monthly fee ($10-25/store) for access to the pricing network.

---

## Setup Requirements (What You Need to Do)

1. **Sign up** at [supabase.com](https://supabase.com) (free, 2 minutes)
2. **Create a new project** (name: "roomswap-pricing" or similar)
3. **Share credentials** with me:
   - Project URL (`https://xxxx.supabase.co`)
   - Service role key
   - Anon/public key
4. **Add to Netlify env vars**: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`

I build everything else — the database tables, the API, the UI, and the pricing tool integration.

---

## Revenue Opportunity

This centralized database could become a **SaaS product for consignment stores**:

- **Free tier**: Store gets pricing suggestions from the network, must contribute their sales data
- **Paid tier ($25/mo)**: Priority support, custom branding, detailed analytics, API access
- **The data is the moat**: Every new store makes the pricing model better for everyone
- **Room Swap owns the platform** as the founding store and data seed

This is essentially building the **Kelley Blue Book for consignment furniture**.
