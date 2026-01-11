# Vonage SMS Setup Guide

Vonage (formerly Nexmo) is a reliable SMS provider with no trial restrictions and simpler setup than Twilio.

## Getting Started

### 1. Create a Vonage Account

1. Visit: https://dashboard.nexmo.com/sign-up
2. Sign up for a free account
3. Verify your email address

### 2. Get Your API Credentials

1. Go to: https://dashboard.nexmo.com/getting-started-guide
2. Find your **API Key** and **API Secret**
3. These are displayed on your account dashboard

**Note:** You can also find them at: https://dashboard.nexmo.com/settings

### 3. Set Up Your Sender ID (`VONAGE_FROM_NUMBER`)

`VONAGE_FROM_NUMBER` is the "from" number/name that appears when recipients receive your SMS. You have two options:

#### Option A: Alphanumeric Sender ID (FREE - Recommended for Testing) ✅

**What it is:** A text name (up to 11 characters) that appears as the sender, like "Lumenta" or "AlertSys"

**How to set it up:**
- **No setup needed in Vonage dashboard!** Just put it in your `.env` file
- You can use any alphanumeric string (letters and numbers)
- Examples: `Lumenta`, `AlertSys`, `MyApp123`

**Limitations:**
- Some countries don't support alphanumeric sender IDs (US, Canada require phone numbers)
- Check country support: https://developer.vonage.com/messaging/sms/guides/country-specific-features

**For your `.env` file:**
```bash
VONAGE_FROM_NUMBER=Lumenta  # Just use any name you want!
```

#### Option B: Vonage Phone Number (Requires Purchase)

**What it is:** A real phone number that recipients see (e.g., `+14155552671`)

**How to find/buy one:**
1. Log in to Vonage Dashboard: https://dashboard.nexmo.com/
2. Go to **"Numbers"** in the sidebar (or visit https://dashboard.nexmo.com/numbers)
3. Click **"Buy Numbers"**
4. Select country/region and features
5. Choose and purchase a number
6. Your number will appear in your **"Numbers"** list
7. Copy the number (with country code, e.g., `+14155552671`) and use it in `.env`

**For your `.env` file:**
```bash
VONAGE_FROM_NUMBER=+14155552671  # Use the phone number you purchased
```

**Recommended for testing:** Use Option A (alphanumeric sender ID) - it's free and works in most countries!

### 4. Configure Environment Variables

Add these to your `.env` file:

```bash
# Vonage SMS
VONAGE_API_KEY=your_api_key_here        # Get from https://dashboard.nexmo.com/settings
VONAGE_API_SECRET=your_api_secret_here  # Get from https://dashboard.nexmo.com/settings
VONAGE_FROM_NUMBER=Lumenta              # OPTIONAL: Alphanumeric sender ID (e.g., "Lumenta") or phone number (e.g., "+14155552671")
                                        # If not set, defaults to "Lumenta"
                                        # For FREE testing: Just use "Lumenta" or any name you want!
```

**Important Notes:**
- `VONAGE_FROM_NUMBER` is **optional** - if you don't set it, it defaults to "Lumenta"
- For **free testing**: Just use an alphanumeric name like `Lumenta` (no purchase needed!)
- For **production/US/Canada**: You may need to purchase a phone number from Vonage dashboard

**Restart your dev server** after updating `.env`.

## Testing SMS

### Quick Test via MCP Test Panel

1. Go to MCPs page → Scroll to "MCP Server Testing" panel
2. Click the **"Tools"** tab
3. Click **"💬 Test Send SMS"** button
4. Enter your phone number with country code (e.g., `+1234567890`)
5. Check the Results tab for success/failure
6. Check your phone for the SMS

### Expected Response Format

```json
{
  "success": true,
  "results": {
    "sms": {
      "success": true,
      "messageId": "0A00000001234567",
      "recipient": "+1234567890",
      "from": "Lumenta",
      "status": "0",
      "remainingBalance": "10.50"
    }
  }
}
```

## Common Errors and Fixes

### Error: "VONAGE_API_KEY and VONAGE_API_SECRET environment variables are required"

**Fix:**
- ✅ Add `VONAGE_API_KEY` and `VONAGE_API_SECRET` to your `.env` file
- ✅ Get them from: https://dashboard.nexmo.com/settings
- ✅ Restart your dev server

### Error: "Invalid phone number format"

**Fix:**
- ✅ Phone number **must include country code** with `+` prefix
- ✅ Correct format: `+1234567890` (includes `+1` for US)
- ✅ Wrong format: `1234567890` or `(123) 456-7890`
- ✅ Make sure the number starts with `+` followed by country code

**Examples:**
- ✅ `+1234567890` (US)
- ✅ `+447911123456` (UK)
- ✅ `+551234567890` (Brazil)
- ❌ `1234567890` (missing + and country code)
- ❌ `(123) 456-7890` (wrong format)

### Error: "Vonage SMS API error (Status: 1)" or "Status: 2"

**Fix:**
- ✅ Check your `VONAGE_API_KEY` and `VONAGE_API_SECRET` are correct
- ✅ Verify them at: https://dashboard.nexmo.com/settings
- ✅ Make sure there are no extra spaces in your `.env` file
- ✅ Restart your dev server after updating

### Error: "Vonage SMS API error (Status: 3)"

**Fix:**
- ✅ Invalid phone number format
- ✅ Make sure phone number includes country code with `+` (e.g., `+1234567890`)
- ✅ Remove any spaces, dashes, or parentheses from the number

### Error: "Vonage SMS API error (Status: 4)"

**Fix:**
- ✅ Invalid sender ID (`VONAGE_FROM_NUMBER`)
- ✅ For alphanumeric sender IDs: Must be 1-11 characters, letters and numbers only
- ✅ For phone numbers: Must be a valid Vonage phone number
- ✅ Try using a simple alphanumeric sender ID like "Lumenta"
- ✅ Some countries don't support alphanumeric sender IDs - try using a phone number instead

### Error: "Vonage SMS API error (Status: 6/7/8)"

**Fix:**
- ✅ Message was rejected (may be blocked content, spam, or account issue)
- ✅ Check your Vonage account status
- ✅ Verify your account balance/credits
- ✅ Try a different message content
- ✅ Check Vonage dashboard for account restrictions

### Error: "Vonage SMS API error (Status: 9/10/11)"

**Fix:**
- ✅ Too many requests or rate limit exceeded
- ✅ Wait a few minutes and try again
- ✅ Check your Vonage account limits
- ✅ Upgrade your account if needed

### SMS Not Received

**Check These:**

1. **Phone Number Format**
   - ✅ Must include country code with `+` (e.g., `+1234567890`)
   - ✅ No spaces, dashes, or parentheses
   - ✅ The number is removed from the `+` before sending (Vonage API requirement)

2. **Vonage Dashboard**
   - ✅ Go to: https://dashboard.nexmo.com/messages
   - ✅ Check message status and any errors
   - ✅ Look at the message details to see what happened

3. **Account Status**
   - ✅ Make sure your Vonage account is active
   - ✅ Check if you have credits/balance
   - ✅ Verify your account isn't suspended

4. **Sender ID Restrictions**
   - ✅ Some countries don't support alphanumeric sender IDs
   - ✅ If using alphanumeric sender ID and SMS not received, try purchasing a Vonage phone number
   - ✅ Check country-specific requirements: https://developer.vonage.com/messaging/sms/guides/country-specific-features

5. **Message Status Codes:**
   - `0` - Success (message sent successfully)
   - `1` - Throttled (too many requests)
   - `2` - Missing required parameters
   - `3` - Invalid parameters
   - `4` - Invalid credentials
   - `5` - Internal error
   - `6` - Invalid message (content blocked)
   - `7` - Number barred (recipient blocked)
   - `8` - Partner account barred
   - `9` - Partner quota exceeded
   - `10` - Account not enabled for REST
   - `11` - Message too long
   - `15` - Invalid destination address

## Quick Checklist

Before testing SMS:

- [ ] `VONAGE_API_KEY` is set in `.env`
- [ ] `VONAGE_API_SECRET` is set in `.env`
- [ ] `VONAGE_FROM_NUMBER` is set in `.env` (optional, defaults to "Lumenta")
- [ ] Phone number includes country code with `+` (e.g., `+1`)
- [ ] Dev server restarted after updating `.env`
- [ ] Checking Vonage Dashboard → Messages for message status

## Advantages Over Twilio

✅ **No trial restrictions** - Send to any number immediately  
✅ **Simpler setup** - Just API key and secret, no phone number required for basic testing  
✅ **Alphanumeric sender IDs** - Use friendly names like "Lumenta" for free  
✅ **Better developer experience** - Cleaner API, better error messages  
✅ **Transparent pricing** - Clear pricing structure, no hidden fees

## Additional Resources

- **Vonage Dashboard**: https://dashboard.nexmo.com
- **API Documentation**: https://developer.vonage.com/api/sms
- **Getting Started Guide**: https://developer.vonage.com/messaging/sms/overview
- **Country-Specific Features**: https://developer.vonage.com/messaging/sms/guides/country-specific-features
- **Error Code Reference**: https://developer.vonage.com/api/errors

## Troubleshooting Tips

1. **Always check the Vonage Dashboard first** - It shows detailed message logs and status
2. **Use alphanumeric sender IDs for testing** - No need to purchase a phone number
3. **Format phone numbers correctly** - Always include country code with `+`
4. **Check account balance** - Make sure you have credits available
5. **Review country restrictions** - Some countries have specific requirements for sender IDs
