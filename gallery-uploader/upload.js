#!/usr/bin/env node

/**
 * Room Swap Gallery Auto-Uploader
 *
 * Watches a folder for new photos, generates AI auction-quality titles
 * and keyword-rich descriptions, then commits them to the gallery.
 *
 * Usage:
 *   npm run watch     -- Watch folder for new photos continuously
 *   npm run upload    -- Process any photos currently in the folder and exit
 */

require('dotenv').config({ path: __dirname + '/.env' });

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Anthropic = require('@anthropic-ai/sdk');
const simpleGit = require('simple-git');
const slugify = require('slugify');
const chokidar = require('chokidar');

// ── Config ──────────────────────────────────────────────────────────────────

const WATCH_FOLDER = process.env.WATCH_FOLDER || path.join(require('os').homedir(), 'Dropbox', 'Camera Uploads');
const REPO_ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '..');
const UPLOADS_DIR = path.join(REPO_ROOT, 'uploads');
const GALLERY_DIR = path.join(REPO_ROOT, '_gallery');
const PROCESSED_DIR = process.env.PROCESSED_DIR || path.join(WATCH_FOLDER, '_uploaded');

const MAX_WIDTH = parseInt(process.env.MAX_WIDTH) || 1600;
const JPEG_QUALITY = parseInt(process.env.JPEG_QUALITY) || 82;
const AUTO_PUSH = process.env.AUTO_PUSH !== 'false';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp']);

// ── AI Client ───────────────────────────────────────────────────────────────

const anthropic = new Anthropic();

const AI_PROMPT = `You are an expert consignment store listing writer for Room Swap Consignments, a furniture and home decor consignment shop in Holly Hill, South Carolina.

Analyze this photo and generate a listing with:

1. TITLE: Write an auction-quality title (5-12 words). Be specific about:
   - Item type (e.g., "Credenza" not "Furniture", "Wingback Chair" not "Chair")
   - Material (solid wood, teak, brass, porcelain, etc.)
   - Style/era (mid-century modern, farmhouse, Victorian, art deco, etc.)
   - Notable features (hand-carved, dovetail joinery, original hardware, etc.)
   - Color if distinctive
   Format: Title Case, no period at the end.
   Examples:
   - "Mid-Century Modern Teak Credenza with Brass Hardware"
   - "Antique Victorian Marble-Top Mahogany Washstand"
   - "Pair of Hand-Painted Chinoiserie Table Lamps"

2. DESCRIPTION: Write a keyword-rich description (2-4 sentences). Include:
   - Specific dimensions or size impression (e.g., "substantial", "petite")
   - Materials and construction details
   - Condition highlights (patina, original finish, restored, etc.)
   - Style keywords for search (farmhouse, coastal, bohemian, industrial, etc.)
   - Suggested use or room placement
   - Any maker, brand, or origin clues visible
   - SEO-friendly terms shoppers would search for

Respond in this exact JSON format only, no other text:
{"title": "Your Title Here", "description": "Your description here."}`;

// ── Processing Queue ────────────────────────────────────────────────────────

let processing = false;
const queue = [];

async function enqueue(filePath) {
  queue.push(filePath);
  if (!processing) processQueue();
}

async function processQueue() {
  processing = true;
  while (queue.length > 0) {
    const filePath = queue.shift();
    try {
      await processPhoto(filePath);
    } catch (err) {
      console.error(`  ✗ Failed: ${path.basename(filePath)} — ${err.message}`);
    }
  }
  processing = false;
}

// ── Core Processing ─────────────────────────────────────────────────────────

async function processPhoto(filePath) {
  const basename = path.basename(filePath);
  console.log(`\n→ Processing: ${basename}`);

  // 1. Wait for file to be fully written (important for synced folders)
  await waitForStableFile(filePath);

  // 2. Optimize image
  console.log('  Optimizing image...');
  const optimized = await optimizeImage(filePath);

  // 3. Generate AI title and description
  console.log('  Generating AI listing...');
  const listing = await generateListing(optimized.buffer);

  // 4. Save to repo
  const now = new Date();
  const dateStr = formatDate(now);
  const slug = slugify(listing.title, { lower: true, strict: true }).slice(0, 80);
  const imageFilename = `${dateStr}-${slug}.jpeg`;
  const jsonFilename = `${dateStr}-${slug}.json`;

  // Write optimized image to uploads/
  const imageDest = path.join(UPLOADS_DIR, imageFilename);
  fs.writeFileSync(imageDest, optimized.buffer);

  // Write gallery JSON metadata
  const metadata = {
    title: listing.title,
    description: listing.description,
    image: `/uploads/${imageFilename}`,
    date: now.toISOString(),
    featured: false
  };

  const jsonDest = path.join(GALLERY_DIR, jsonFilename);
  fs.writeFileSync(jsonDest, JSON.stringify(metadata, null, 2) + '\n');

  console.log(`  Title: "${listing.title}"`);
  console.log(`  Saved: uploads/${imageFilename}`);
  console.log(`  Saved: _gallery/${jsonFilename}`);

  // 5. Git commit
  const git = simpleGit(REPO_ROOT);
  await git.add([imageDest, jsonDest]);
  await git.commit(`Add gallery item: ${listing.title}`);
  console.log('  Committed to git.');

  // 6. Push if enabled
  if (AUTO_PUSH) {
    try {
      await git.push('origin', 'main');
      console.log('  Pushed to GitHub → Netlify will deploy automatically.');
    } catch (pushErr) {
      console.error(`  ⚠ Push failed (will retry next cycle): ${pushErr.message}`);
    }
  }

  // 7. Move original to processed folder
  moveToProcessed(filePath, basename);

  console.log(`  ✓ Done: "${listing.title}"`);
}

// ── Image Optimization ──────────────────────────────────────────────────────

async function optimizeImage(filePath) {
  const buffer = await sharp(filePath)
    .rotate() // Auto-rotate based on EXIF
    .resize(MAX_WIDTH, null, {
      withoutEnlargement: true,
      fit: 'inside'
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  const originalSize = fs.statSync(filePath).size;
  const savings = Math.round((1 - buffer.length / originalSize) * 100);
  console.log(`  Optimized: ${formatBytes(originalSize)} → ${formatBytes(buffer.length)} (${savings}% smaller)`);

  return { buffer };
}

// ── AI Listing Generation ───────────────────────────────────────────────────

async function generateListing(imageBuffer) {
  const base64 = imageBuffer.toString('base64');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64
            }
          },
          {
            type: 'text',
            text: AI_PROMPT
          }
        ]
      }
    ]
  });

  const text = response.content[0].text.trim();

  // Parse JSON response (handle potential markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI did not return valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  if (!parsed.title) {
    throw new Error('AI response missing title');
  }

  return {
    title: parsed.title,
    description: parsed.description || ''
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function waitForStableFile(filePath, attempts = 10) {
  let lastSize = -1;
  for (let i = 0; i < attempts; i++) {
    await sleep(500);
    try {
      const stat = fs.statSync(filePath);
      if (stat.size === lastSize && stat.size > 0) return;
      lastSize = stat.size;
    } catch {
      // File might not be ready yet
    }
  }
}

function moveToProcessed(filePath, basename) {
  try {
    if (!fs.existsSync(PROCESSED_DIR)) {
      fs.mkdirSync(PROCESSED_DIR, { recursive: true });
    }
    const dest = path.join(PROCESSED_DIR, basename);
    fs.renameSync(filePath, dest);
  } catch {
    // If move fails (cross-device), copy and delete
    try {
      const dest = path.join(PROCESSED_DIR, basename);
      fs.copyFileSync(filePath, dest);
      fs.unlinkSync(filePath);
    } catch (e) {
      console.log(`  Note: Could not move original (${e.message}). It will be skipped on next run.`);
    }
  }
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isImageFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

// ── Watch Mode ──────────────────────────────────────────────────────────────

function startWatcher() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     Room Swap Gallery Auto-Uploader                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`Watching: ${WATCH_FOLDER}`);
  console.log(`Repo:     ${REPO_ROOT}`);
  console.log(`Auto-push: ${AUTO_PUSH ? 'ON' : 'OFF'}`);
  console.log();

  if (!fs.existsSync(WATCH_FOLDER)) {
    console.error(`Watch folder does not exist: ${WATCH_FOLDER}`);
    console.error('Create it or set WATCH_FOLDER in .env');
    process.exit(1);
  }

  const watcher = chokidar.watch(WATCH_FOLDER, {
    ignored: [
      /(^|[\/\\])\../, // dotfiles
      path.join(WATCH_FOLDER, '_uploaded', '**') // processed folder
    ],
    persistent: true,
    ignoreInitial: false, // Process existing files on startup
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 500
    },
    depth: 0 // Only watch top-level (not subfolders)
  });

  watcher.on('add', (filePath) => {
    if (isImageFile(filePath)) {
      console.log(`New photo detected: ${path.basename(filePath)}`);
      enqueue(filePath);
    }
  });

  watcher.on('error', (err) => {
    console.error('Watcher error:', err.message);
  });

  console.log('Waiting for photos... (drop images into the watch folder)\n');
}

// ── One-Shot Mode ───────────────────────────────────────────────────────────

async function processExisting() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     Room Swap Gallery Uploader (one-shot)               ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log();

  if (!fs.existsSync(WATCH_FOLDER)) {
    console.error(`Folder does not exist: ${WATCH_FOLDER}`);
    process.exit(1);
  }

  const files = fs.readdirSync(WATCH_FOLDER)
    .filter(f => isImageFile(f) && !f.startsWith('.'))
    .map(f => path.join(WATCH_FOLDER, f));

  if (files.length === 0) {
    console.log(`No images found in ${WATCH_FOLDER}`);
    return;
  }

  console.log(`Found ${files.length} image(s) to process.\n`);

  for (const file of files) {
    try {
      await processPhoto(file);
    } catch (err) {
      console.error(`  ✗ Failed: ${path.basename(file)} — ${err.message}`);
    }
  }

  console.log('\nAll done!');
}

// ── Main ────────────────────────────────────────────────────────────────────

const isWatch = process.argv.includes('--watch');

if (isWatch) {
  startWatcher();
} else {
  processExisting();
}
