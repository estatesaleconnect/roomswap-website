# Setting Up Your Online Shop with Square

Your website now has a **Shop Online** page (`shop.html`) linked in the menu on
every page. This guide walks you through connecting it to Square so customers
can actually buy your new items online. No coding required — the whole thing is
one line to fill in.

There are two parts:
1. **Set up Square + import your Faire items** (done in Square, one time)
2. **Point your website's Shop page at your Square store** (one line to edit)

---

## Part 1 — Set Up Square (one time)

### Step 1: Create a free Square account
1. Go to https://squareup.com and click **Get Started** (it's free to start).
2. Sign up with your business email (`roomswapsc@gmail.com`).
3. Enter your business info: **Room Swap Consignments**, Holly Hill, SC.

### Step 2: Turn on your free Square Online store
1. In the Square Dashboard, go to **Online** in the left menu.
2. Follow the prompts to create your **Square Online** site. The free plan is
   fine to start — you only pay a small fee per sale.
3. Square will give your store a web address like
   `https://roomswap.square.site`. **Write this address down — you'll need it in
   Part 2.**

### Step 3: Connect Faire so your new items flow in
1. In Square, go to the **App Marketplace** (search "Faire").
2. Click the **Faire** integration and **Connect** it to your Square account.
   - Alternatively, log in to https://faire.com, open **Settings → Integrations**,
     and connect Square from there. Either direction works.
3. Once connected, the items you've **purchased on Faire** can be brought into
   Square as products — with their photos, descriptions, and your retail prices.
4. Set your **retail price** on each item (Faire shows wholesale cost; you decide
   the selling price). Double-check quantities so you don't oversell.

> **Tip:** Faire is your *supplier* — customers don't need to see the word
> "Faire" anywhere. Your website simply presents these as Room Swap's new
> arrivals, which is exactly how the Shop page is written.

### Step 4: Choose pickup and/or shipping
1. In Square Online, go to **Settings → Fulfillment**.
2. Turn on **In-store pickup** (free) so local customers can grab orders at the
   showroom.
3. Optionally turn on **Shipping** for smaller items you're willing to mail.

---

## Part 2 — Connect Your Website (one line)

Once your Square store address is ready (from Step 2 above):

1. Open the file **`shop.html`** in your website.
2. Near the bottom, find this line:

   ```js
   var SQUARE_STORE_URL = "";
   ```

3. Paste your Square store address between the quotes, for example:

   ```js
   var SQUARE_STORE_URL = "https://roomswap.square.site";
   ```

4. Save the file, commit, and let Netlify publish (same as any other update). Or
   just ask Claude to paste it in for you.

That's it. The **Shop Online Now** buttons will now take customers straight to
your Square store.

> **Before you fill this in:** the Shop page automatically shows a friendly
> "Our online shop is launching soon!" message and hides the buy buttons — so
> it's safe to publish right away, even before Square is ready.

---

## Optional — Feature Specific Items on the Shop Page

If you'd rather show a few products **directly on your website** (instead of only
linking out to Square), you can:

1. In Square Online, open an item and look for a **Share** or **Embed** option to
   copy that item's embed code.
2. In `shop.html`, find the section that says
   `<div id="square-featured" class="shop-featured"></div>` and paste each item's
   embed code inside that `<div>`.

Anything you add there shows up in a neat grid. Leave it empty and the section
simply stays hidden. Ask Claude if you'd like help with this part.

---

## Quick Reference

| What | Where |
|------|-------|
| Create Square store | https://squareup.com → **Online** |
| Your store web address | `https://something.square.site` (from Step 2) |
| Connect Faire | Square **App Marketplace** → Faire, or faire.com → Integrations |
| Turn on pickup/shipping | Square Online → **Settings → Fulfillment** |
| Line to edit on your site | `var SQUARE_STORE_URL = "";` in `shop.html` |

## Costs (starting out)

- **Square account:** Free
- **Square Online (free plan):** $0/month, small fee per online sale
- **Your website / Netlify:** Still $0/month
- You only pay Square a percentage when you actually make a sale.

---

Questions? Just ask Claude to walk you through any step or to make the edits for
you.
