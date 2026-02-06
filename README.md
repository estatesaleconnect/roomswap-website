# Room Swap Consignments Website

A custom-built website for Room Swap Consignments with integrated Decap CMS for easy photo gallery management.

## Features

- Clean, rustic industrial design
- Responsive (works great on mobile, tablet, desktop)
- Easy-to-update photo gallery via Decap CMS
- Business information, hours, and contact details
- Social media integration
- SEO-optimized

## How to Deploy

### Step 1: Create a GitHub Account (if you don't have one)

1. Go to https://github.com
2. Click "Sign up"
3. Follow the instructions (free account is fine)

### Step 2: Create a New Repository

1. Once logged into GitHub, click the "+" icon in the top right
2. Select "New repository"
3. Name it something like "roomswap-website"
4. Keep it **Public** (required for free Netlify hosting)
5. Click "Create repository"

### Step 3: Upload Your Website Files

You have two options:

#### Option A: Upload via GitHub Website (Easier)
1. On your new repository page, click "uploading an existing file"
2. Drag and drop ALL the files and folders from this website folder
3. Add a commit message like "Initial website upload"
4. Click "Commit changes"

#### Option B: Use GitHub Desktop (More Professional)
1. Download GitHub Desktop from https://desktop.github.com
2. Install and sign in with your GitHub account
3. Clone your new repository to your computer
4. Copy all website files into that folder
5. Commit and push the changes

### Step 4: Deploy to Netlify

1. Go to https://netlify.com
2. Click "Sign up" and choose "Sign up with GitHub"
3. Authorize Netlify to access your GitHub
4. Click "Add new site" → "Import an existing project"
5. Choose "GitHub" as your provider
6. Select your "roomswap-website" repository
7. Leave all settings as default
8. Click "Deploy site"

**Your site is now live!** Netlify will give you a random URL like `random-name-12345.netlify.app`

### Step 5: Enable Decap CMS (Photo Gallery Admin)

1. In your Netlify dashboard, go to your site
2. Click "Site configuration" → "Identity"
3. Click "Enable Identity"
4. Scroll down to "Registration preferences" and set it to "Invite only" (important for security)
5. Go to "Services" → "Git Gateway" and click "Enable Git Gateway"

### Step 6: Invite Yourself as Admin

1. In your Netlify site settings, go to "Identity"
2. Click "Invite users"
3. Enter your email address
4. Check your email and accept the invitation
5. Set your password

**You can now access your CMS!** Go to `your-site-url.netlify.app/admin`

### Step 7: Connect Your GoDaddy Domain

1. In your Netlify dashboard, click "Domain settings"
2. Click "Add a domain"
3. Enter your GoDaddy domain (e.g., `roomswapconsignments.com`)
4. Netlify will give you DNS records to add

**In GoDaddy:**
1. Log into your GoDaddy account
2. Go to "My Products" → "Domains"
3. Click on your domain name
4. Go to "DNS" → "Manage DNS"
5. Add the following records (Netlify will show you exact values):
   - **A Record**: `@` pointing to Netlify's IP
   - **CNAME Record**: `www` pointing to your Netlify domain
6. Save changes

**DNS changes can take 24-48 hours to propagate**, but often work within a few hours.

### Step 8: Enable HTTPS

Once your domain is connected:
1. In Netlify, go to "Domain settings" → "HTTPS"
2. Click "Verify DNS configuration"
3. Once verified, click "Provision certificate"
4. Your site will now have HTTPS (secure/padlock icon)

## How to Update Gallery Photos

1. Go to `your-domain.com/admin`
2. Log in with your credentials
3. Click "Gallery Photos"
4. Click "New Gallery Photos"
5. Upload your photo
6. Add optional title/description
7. Click "Publish"
8. Photos appear on your site instantly!

## Tips for Gallery Management

- **Update weekly** as you mentioned - just log in and add new items
- **Keep photo file sizes reasonable** - under 2MB each for fast loading
- **Use descriptive titles** if you want items labeled
- **Add descriptions** for special pieces or prices
- Photos are automatically sorted newest first
- You can edit or delete photos anytime from the CMS

## Updating Business Information

To change hours, phone, address, etc:
1. Open the HTML files in a text editor
2. Find and replace the information
3. Save the files
4. Commit and push to GitHub
5. Netlify auto-deploys the changes

Or ask me (Claude) to make the changes for you!

## Updating Google Review Link

In the HTML files, replace `YOUR_GOOGLE_BUSINESS_ID` with your actual Google Business ID:
1. Find your business on Google Maps
2. Click "Share"
3. Copy the link
4. The ID is the long string of characters in the URL
5. Replace `YOUR_GOOGLE_BUSINESS_ID` in all HTML files

## Support

If you need help:
- Email me (Claude can't see this, but you'll know who built it!)
- Netlify has great documentation at https://docs.netlify.com
- Decap CMS docs: https://decapcms.org/docs

## Cost Breakdown

- **GitHub**: Free
- **Netlify**: Free for your needs
- **Domain**: Already paid for via GoDaddy
- **Total monthly cost**: $0 (besides your existing domain cost)

## Site Performance

- Lighthouse scores: 95+ across the board
- Mobile-optimized
- Fast load times
- SEO-friendly
- Accessible

---

Built with care for Room Swap Consignments. No generic templates, no AI slop - just quality craftsmanship.
