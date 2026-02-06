# QUICK START GUIDE

## Get Your Site Online in 30 Minutes

### 1. GitHub (5 minutes)
- Go to https://github.com → Sign up (free)
- Create new repository called "roomswap-website" 
- Make it PUBLIC
- Upload all website files via drag-and-drop

### 2. Netlify (10 minutes)
- Go to https://netlify.com → Sign up with GitHub
- Click "Add new site" → "Import an existing project"
- Choose GitHub → Select "roomswap-website"
- Click "Deploy site"
- **Your site is live!** (You'll get a temporary URL)

### 3. Enable CMS (5 minutes)
In Netlify dashboard:
- Site settings → Identity → "Enable Identity"
- Set registration to "Invite only"
- Services → Git Gateway → "Enable"
- Identity → "Invite users" → Add your email
- Accept invite via email, set password
- **CMS is ready!** Access at: yoursite.netlify.app/admin

### 4. Connect GoDaddy Domain (10 minutes)
In Netlify:
- Domain settings → "Add domain" → Enter your domain
- Copy the DNS records Netlify shows you

In GoDaddy:
- My Products → Your domain → "Manage DNS"
- Add A record: `@` → Netlify's IP
- Add CNAME: `www` → your-site.netlify.app
- Save changes

**Wait 2-24 hours for DNS to propagate**

### 5. Update Photos Weekly
- Go to yourdomain.com/admin
- Login → Click "Gallery Photos"
- Click "New Gallery Photos"
- Upload photo, add details
- Click "Publish"
- **Done!** Photos appear instantly

## That's It!

**Total cost:** $0/month (besides your GoDaddy domain)
**Update frequency:** As often as you want
**Maintenance:** Zero - it just works

Questions? Check the full README.md
