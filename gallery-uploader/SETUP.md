# Room Swap Gallery Auto-Uploader

Snap a photo on your iPhone → it shows up on roomswapsc.com with an AI-generated auction-quality listing. No manual typing, no admin panel.

## How It Works

1. You take a photo on your iPhone
2. Dropbox syncs it to your PC automatically
3. This script detects the new photo and:
   - Optimizes it for web (shrinks file size ~60-80%)
   - Sends it to Claude AI which writes an auction-style title and keyword-rich description
   - Saves the image and metadata to your website repo
   - Commits and pushes to GitHub
4. Netlify auto-deploys — photo is live on your site in ~30 seconds

## One-Time Setup (15 minutes)

### Step 1: Install Dropbox (iPhone + PC)

1. **iPhone**: Install Dropbox from the App Store
2. **PC**: Install Dropbox from https://www.dropbox.com/install
3. **Enable Camera Upload** on the iPhone Dropbox app:
   - Open Dropbox app → Account tab → Camera Uploads → Turn ON
   - This syncs every photo you take to `Dropbox/Camera Uploads` on your PC

### Step 2: Install Node.js on your PC

Download and install from https://nodejs.org (LTS version).

### Step 3: Clone the website repo (if you haven't already)

```
git clone https://github.com/estatesaleconnect/roomswap-website.git
cd roomswap-website
```

### Step 4: Install the uploader

```
cd gallery-uploader
npm install
```

### Step 5: Configure your API key

```
copy .env.example .env
```

Edit `.env` and add:
- Your `ANTHROPIC_API_KEY` (same key used for the pricing tool)
- Your `WATCH_FOLDER` path (Dropbox Camera Uploads folder on your PC)

**Windows example:**
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
WATCH_FOLDER=C:\Users\YourName\Dropbox\Camera Uploads
```

## Usage

### Watch Mode (recommended) — leave running while you work

```
npm run watch
```

This watches your Dropbox folder continuously. Every time a new photo syncs from your iPhone, it automatically processes and uploads it to the site.

### One-Shot Mode — process whatever is in the folder right now

```
npm run upload
```

Processes all images currently in the watch folder, then exits.

## Tips

- **Batch uploads**: Take all your photos, wait for Dropbox to sync, then run `npm run upload`
- **Review before pushing**: Set `AUTO_PUSH=false` in `.env` to review commits before pushing
- **Originals are preserved**: Processed photos are moved to a `_uploaded` subfolder, not deleted
- **Already optimized**: Images are resized to 1600px wide and compressed — no manual editing needed
- **Still works with admin**: You can still use the `/admin` CMS to add photos manually anytime

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Watch folder does not exist" | Check your `WATCH_FOLDER` path in `.env` |
| "API key" error | Make sure `ANTHROPIC_API_KEY` is set in `.env` |
| Photos not syncing from iPhone | Open Dropbox on iPhone, check Camera Uploads is ON |
| Push failed | Make sure you have git credentials configured for GitHub |
| Image too dark/blurry | The AI will still generate a listing, but retake for better results |
