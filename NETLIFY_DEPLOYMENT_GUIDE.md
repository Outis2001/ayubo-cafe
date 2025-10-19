# Netlify Deployment Guide for Ayubo Cafe

This guide will walk you through deploying your Ayubo Cafe application to Netlify.

## Prerequisites

- A Netlify account (sign up at https://www.netlify.com)
- Your Supabase project credentials
- Git repository with your code

## Step 1: Prepare Your Repository

1. Ensure all changes are committed to Git:
   ```bash
   git add .
   git commit -m "Prepare for Netlify deployment"
   git push origin main
   ```

## Step 2: Deploy to Netlify

### Option A: Deploy via Netlify Dashboard (Recommended)

1. **Log in to Netlify**
   - Go to https://app.netlify.com
   - Sign in with your GitHub/GitLab/Bitbucket account

2. **Import Your Repository**
   - Click "Add new site" → "Import an existing project"
   - Choose your Git provider (GitHub/GitLab/Bitbucket)
   - Authorize Netlify to access your repositories
   - Select the `ayubo_cafe` repository

3. **Configure Build Settings**
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Branch to deploy:** `main` (or your default branch)
   
   These settings should be auto-detected from `netlify.toml`.

4. **Set Environment Variables** (CRITICAL!)
   - Before deploying, click on "Show advanced" → "New variable"
   - Add the following environment variables:

   ```
   VITE_SUPABASE_URL = your_supabase_project_url
   VITE_SUPABASE_ANON_KEY = your_supabase_anon_key
   VITE_APP_URL = https://your-site-name.netlify.app
   VITE_EMAIL_ENABLED = false
   
   # Optional: For email functionality (leave blank to disable email)
   EMAIL_HOST = smtp.gmail.com
   EMAIL_PORT = 587
   EMAIL_SECURE = false
   EMAIL_USER = your-email@gmail.com
   EMAIL_PASSWORD = your-16-character-app-password
   EMAIL_FROM = "Ayubo Cafe <your-email@gmail.com>"
   ```

   **Get Supabase credentials:**
   - Go to your Supabase dashboard: https://app.supabase.com
   - Select your project
   - Go to Settings → API
   - Copy the Project URL and anon/public key

   **Note:** `VITE_APP_URL` will be your Netlify site URL. You can update this after deployment.

5. **Deploy**
   - Click "Deploy site"
   - Wait for the build to complete (usually 1-3 minutes)

### Option B: Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Initialize Netlify**
   ```bash
   netlify init
   ```
   Follow the prompts to connect your repository.

4. **Set Environment Variables**
   ```bash
   netlify env:set VITE_SUPABASE_URL "your_supabase_url"
   netlify env:set VITE_SUPABASE_ANON_KEY "your_supabase_anon_key"
   netlify env:set VITE_APP_URL "https://your-site-name.netlify.app"
   netlify env:set VITE_EMAIL_ENABLED "false"
   ```

5. **Deploy**
   ```bash
   netlify deploy --prod
   ```

## Step 3: Configure Your Site

### Update Site Name (Optional)

1. In Netlify dashboard, go to Site settings → General → Site details
2. Click "Change site name"
3. Choose a custom name (e.g., `ayubo-cafe`)
4. Your site will be at: `https://ayubo-cafe.netlify.app`

### Set Custom Domain (Optional)

1. Go to Site settings → Domain management
2. Click "Add custom domain"
3. Follow the instructions to configure DNS

### Update Environment Variables with Actual Site URL

After deployment, update the `VITE_APP_URL`:
1. Go to Site settings → Environment variables
2. Edit `VITE_APP_URL` to your actual Netlify URL (e.g., `https://ayubo-cafe.netlify.app`)
3. Trigger a new deploy (Deploy → Trigger deploy → Deploy site)

## Step 4: Configure Email (Optional but Recommended)

### Email functionality now works on Netlify! 🎉

I've set up Netlify Functions to handle email sending. Here's how to enable it:

### Enable Email Sending

1. **Get Gmail App Password**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification if not already enabled
   - Search for "App passwords" in the search bar
   - Generate a new app password for "Mail"
   - Copy the 16-character password

2. **Add Email Environment Variables in Netlify**
   - Go to Site settings → Environment variables
   - Add these variables:
   
   ```
   EMAIL_HOST = smtp.gmail.com
   EMAIL_PORT = 587
   EMAIL_SECURE = false
   EMAIL_USER = your-email@gmail.com
   EMAIL_PASSWORD = your-16-character-app-password
   EMAIL_FROM = "Ayubo Cafe <your-email@gmail.com>"
   VITE_EMAIL_ENABLED = true
   ```

3. **Trigger Redeploy**
   - Go to Deploys → Trigger deploy → Deploy site
   - Wait for build to complete

4. **Test Email Functionality**
   - Try password reset flow
   - Check if emails arrive
   - Check function logs in Netlify dashboard if issues

### Without Email Configuration

If you skip email setup:
- Emails will be logged to console (dev mode)
- Password resets must be done by owner via User Management
- Still fully functional, just without email notifications

## Step 5: Configure Supabase for Your Netlify Site

1. **Update Allowed URLs in Supabase**
   - Go to Supabase dashboard: https://app.supabase.com
   - Select your project
   - Go to Authentication → URL Configuration
   - Add your Netlify URL to "Site URL": `https://your-site-name.netlify.app`
   - Add to "Redirect URLs": `https://your-site-name.netlify.app/**`

## Step 6: Test Your Deployment

1. Visit your Netlify URL
2. Test the following functionality:
   - ✅ Login/logout
   - ✅ Product management
   - ✅ Inventory tracking
   - ✅ Sales recording
   - ✅ User management (if you're an admin)
   - ✅ Password reset email (if configured)
   - ✅ Welcome emails for new users (if configured)

## Important Notes

### ✅ Email Functionality Works!

**Email now works on Netlify via Netlify Functions!** 🎉

I've already set this up for you:
- `netlify/functions/send-email.js` - Serverless function that sends emails
- `src/utils/email.js` - Updated to call the Netlify Function
- Works exactly like a traditional server, but without server maintenance

**How it works:**
1. Frontend calls `/.netlify/functions/send-email`
2. Netlify runs the function on their servers
3. Function uses `nodemailer` to send email via Gmail SMTP
4. Email arrives in recipient's inbox

**To enable:**
- Add email environment variables in Netlify (see Step 4)
- Set `VITE_EMAIL_ENABLED=true`
- Redeploy

**To disable:**
- Set `VITE_EMAIL_ENABLED=false` or don't configure email variables
- Admins can manually reset passwords via user management

### 🔒 Security Best Practices

1. **Never commit `.env` file** - It's in `.gitignore`
2. **Use Netlify's environment variables** - They're secure and encrypted
3. **Rotate credentials regularly** - Update Supabase keys periodically
4. **Enable Supabase RLS** - Row Level Security policies protect your data
5. **Monitor usage** - Check Netlify and Supabase dashboards for anomalies

### 📊 Monitoring

- **Build logs:** Netlify dashboard → Deploys → [Latest deploy] → Deploy log
- **Function logs:** Netlify dashboard → Functions → [Function name]
- **Analytics:** Netlify dashboard → Analytics
- **Supabase logs:** Supabase dashboard → Logs

## Continuous Deployment

Netlify automatically deploys when you push to your Git repository:

1. Make changes locally
2. Commit and push to Git:
   ```bash
   git add .
   git commit -m "Update feature"
   git push origin main
   ```
3. Netlify automatically builds and deploys

## Troubleshooting

### Build Fails

- Check build logs in Netlify dashboard
- Ensure all dependencies are in `package.json`
- Verify Node version compatibility (using Node 18)

### Site Shows "Missing Supabase credentials" Error

- Check environment variables in Netlify dashboard
- Ensure variable names exactly match: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Redeploy after adding/updating environment variables

### Authentication Not Working

- Verify Supabase URL configuration includes your Netlify URL
- Check browser console for errors
- Ensure Supabase project is not paused (free tier pauses after inactivity)

### 404 Errors on Page Refresh

- Ensure `netlify.toml` is present with redirect rules
- Check that the redirect rule exists: `/* → /index.html`

### Styles Not Loading

- Clear browser cache
- Check that build completed successfully
- Verify `dist` folder was generated

## Rollback to Previous Version

If something goes wrong:

1. Go to Netlify dashboard → Deploys
2. Find a working previous deploy
3. Click "..." → "Publish deploy"

## Cost Information

- **Netlify Free Tier:**
  - 100 GB bandwidth/month
  - 300 build minutes/month
  - Automatic HTTPS
  - Perfect for small to medium cafes

- **Supabase Free Tier:**
  - 500 MB database
  - 1 GB file storage
  - 2 GB bandwidth
  - Sufficient for most cafe operations

## Need Help?

- **Netlify Docs:** https://docs.netlify.com
- **Supabase Docs:** https://supabase.com/docs
- **Vite Docs:** https://vitejs.dev

---

## Quick Reference Commands

```bash
# Local development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Netlify (if using CLI)
netlify deploy --prod

# Check environment variables
netlify env:list
```

## Post-Deployment Checklist

- [ ] Site is accessible at Netlify URL
- [ ] Environment variables are set correctly
- [ ] Supabase URLs are configured
- [ ] Login/authentication works
- [ ] All pages load correctly
- [ ] Product management works
- [ ] Sales tracking works
- [ ] Custom domain configured (if applicable)
- [ ] HTTPS is enabled (automatic)
- [ ] Site name is customized (optional)

---

**Congratulations! Your Ayubo Cafe is now live on Netlify! 🎉**

