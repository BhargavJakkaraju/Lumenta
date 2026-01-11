# Resend Email Domain Setup Guide

## The Issue

You're getting this error:
```
The lumenta.ai domain is not verified. Please, add and verify your domain on https://resend.com/domains
```

This happens when you try to send emails from a domain (like `notifications@lumenta.ai`) that isn't verified in your Resend account.

## Quick Fix: Use Resend's Default Domain

**Good news!** The code now automatically uses Resend's default domain (`onboarding@resend.dev`) if your custom domain isn't verified.

### What Changed

1. ✅ **Automatic Fallback**: If your custom domain isn't verified, the code automatically retries with Resend's default domain
2. ✅ **No Configuration Needed**: Works immediately without domain verification
3. ✅ **Better Error Messages**: Clear guidance on what's happening

### Current Setup

Your `.env` file should have:
```bash
RESEND_API_KEY=re_QNw2mLhK_37eKSxTTB7cbqNV38NCxk5ka
# RESEND_FROM_EMAIL is optional - uses onboarding@resend.dev by default
```

**That's it!** Emails will work now using `onboarding@resend.dev` as the "from" address.

## Option 1: Use Resend's Default Domain (Easiest - Already Working!)

**No setup needed!** The code automatically uses `onboarding@resend.dev` if no custom domain is set.

- ✅ Works immediately
- ✅ No domain verification needed
- ✅ Free tier: 100 emails/day
- ✅ Emails come from `onboarding@resend.dev`

### Update Your .env

```bash
# Just remove or comment out the custom domain
RESEND_API_KEY=re_QNw2mLhK_37eKSxTTB7cbqNV38NCxk5ka
# RESEND_FROM_EMAIL=notifications@lumenta.ai  # Commented out - using default
```

## Option 2: Verify Your Domain (For Production)

If you want to use a custom "from" address like `notifications@lumenta.ai`:

### Step 1: Add Domain to Resend

1. Go to: https://resend.com/domains
2. Click **"Add Domain"**
3. Enter your domain: `lumenta.ai`
4. Click **"Add"**

### Step 2: Verify Domain (DNS Setup)

Resend will show you DNS records to add to your domain:

1. **Get DNS Records from Resend:**
   - Go to your domain in Resend dashboard
   - Copy the DNS records (usually SPF, DKIM, and/or DMARC records)

2. **Add DNS Records:**
   - Go to your domain registrar (where you bought `lumenta.ai`)
   - Access DNS management
   - Add the records Resend provided:
     - **Type**: TXT or CNAME
     - **Name**: As specified by Resend (e.g., `_resend` or `@`)
     - **Value**: The value Resend provided

3. **Wait for Verification:**
   - DNS changes can take a few minutes to propagate
   - Resend will automatically verify when DNS records are detected
   - Check Resend dashboard for verification status

### Step 3: Update Your .env

Once verified:

```bash
RESEND_API_KEY=re_QNw2mLhK_37eKSxTTB7cbqNV38NCxk5ka
RESEND_FROM_EMAIL=notifications@lumenta.ai  # Now works!
```

### Step 4: Restart Dev Server

```bash
npm run dev
```

## How It Works Now

### Automatic Domain Handling

The code now:

1. **Tries custom domain first** (if `RESEND_FROM_EMAIL` is set)
2. **If domain not verified** → Automatically retries with `onboarding@resend.dev`
3. **If no custom domain set** → Uses `onboarding@resend.dev` directly

This means **emails will always work**, even without domain verification!

## Testing

### Test Email Now

1. Go to MCP Test Panel → Tools tab
2. Click **"📧 Test Send Email"**
3. Enter your email address
4. **Should work immediately!** ✅
5. Email will come from `onboarding@resend.dev`

### Check Results

In the Results tab, you'll see:
- ✅ **Success**: Email sent from `onboarding@resend.dev`
- ℹ️ **Note**: "Using Resend's default domain because custom domain is not verified"

## Resend's Default Domain

**Default Domain**: `onboarding@resend.dev`

- ✅ Works immediately - no setup needed
- ✅ No domain verification required
- ✅ Perfect for development and testing
- ✅ Free tier: 100 emails/day
- ⚠️ **Limitation**: Can't customize the "from" name/address

## Domain Verification Status

To check if your domain is verified:

1. Go to: https://resend.com/domains
2. Look for `lumenta.ai`
3. Status will show:
   - ✅ **Verified** - Can use custom "from" addresses
   - ⚠️ **Pending** - Waiting for DNS verification
   - ❌ **Not Added** - Domain not in your account

## Troubleshooting

### "Domain is not verified" Error

**Solution 1 (Recommended for Testing):**
- ✅ Remove or comment out `RESEND_FROM_EMAIL` from `.env`
- ✅ Code will automatically use `onboarding@resend.dev`
- ✅ Works immediately!

**Solution 2 (For Production):**
- ✅ Verify your domain at https://resend.com/domains
- ✅ Add DNS records as instructed
- ✅ Wait for verification (usually a few minutes)
- ✅ Then set `RESEND_FROM_EMAIL=notifications@lumenta.ai`

### Email Not Received

- ✅ Check your spam folder
- ✅ Check Resend dashboard → Emails for delivery status
- ✅ Verify `RESEND_API_KEY` is correct
- ✅ Make sure recipient email is correct

### DNS Records Not Working

- ✅ DNS changes can take up to 48 hours (usually much faster)
- ✅ Use `dig` or `nslookup` to check if DNS records are live
- ✅ Double-check you copied the exact values from Resend
- ✅ Make sure record type matches (TXT, CNAME, etc.)

## Summary

### For Development/Testing (Recommended)

```bash
# .env file - simple setup
RESEND_API_KEY=re_your_api_key_here
# No RESEND_FROM_EMAIL needed - uses onboarding@resend.dev automatically
```

✅ Works immediately  
✅ No domain verification needed  
✅ Perfect for testing  

### For Production

1. Verify domain at https://resend.com/domains
2. Add DNS records
3. Wait for verification
4. Set `RESEND_FROM_EMAIL=notifications@lumenta.ai` in `.env`

✅ Custom "from" address  
✅ Professional appearance  
✅ Better deliverability  

---

**Quick Fix**: Remove or comment out `RESEND_FROM_EMAIL` from your `.env` file. Emails will work using Resend's default domain (`onboarding@resend.dev`)!
