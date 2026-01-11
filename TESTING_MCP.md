# Testing MCP - How to Test Calls, Emails, and Messages

This guide shows you how to test your MCP integrations for phone calls, emails, and SMS messages.

## Prerequisites

Make sure you have these environment variables set in your `.env` file:

### For Email (Resend)
```bash
RESEND_API_KEY=re_your_api_key_here
# RESEND_FROM_EMAIL=notifications@yourdomain.com  # Optional - uses onboarding@resend.dev by default
# Note: If you use a custom domain, verify it first at https://resend.com/domains
```

### For Phone Calls (Vapi)
```bash
# Vapi (for automated phone calls)
VAPI_API_KEY=your_vapi_api_key
VAPI_PHONE_NUMBER_ID=your_phone_number_id
VAPI_ASSISTANT_ID=your_assistant_id  # Optional, uses default if not provided
```

### For SMS (Vonage)
```bash
VONAGE_API_KEY=your_vonage_api_key
VONAGE_API_SECRET=your_vonage_api_secret
VONAGE_FROM_NUMBER=Lumenta  # Can be alphanumeric sender ID (e.g., "Lumenta") or phone number
```

## Quick Testing Steps

### 1. Go to MCP Test Panel

1. Start your dev server: `npm run dev`
2. Navigate to the **MCPs page** in your app
3. Scroll down to see the **"MCP Server Testing"** panel
4. Click on the **"Tools"** tab

### 2. Test Email Sending

**Option A: Use the Quick Test Button**
1. In the "Tools" tab, click **"📧 Test Send Email"** button
2. Enter your email address when prompted (e.g., `your-email@example.com`)
3. Check the **"Results"** tab for success/failure
4. Check your email inbox (including spam folder) for the test email

**Option B: Use Custom Tool Call**
1. Set tool name to: `send_notification`
2. Set arguments JSON:
   ```json
   {
     "title": "Test Email from Lumenta",
     "message": "This is a test email to verify email sending works!",
     "severity": "medium",
     "channels": ["email"],
     "metadata": {
       "recipientEmail": "your-email@example.com"
     }
   }
   ```
3. Click **"Call Tool"**
4. Check results tab and your inbox

**Expected Result:**
- ✅ Success message in Results tab
- ✅ Email received in your inbox
- ✅ Message contains "This notification was sent from Lumenta Platform"

### 3. Test SMS Sending

**Option A: Use the Quick Test Button**
1. In the "Tools" tab, click **"💬 Test Send SMS"** button
2. Enter your phone number with country code when prompted (e.g., `+1234567890`)
3. Check the **"Results"** tab for success/failure
4. Check your phone for the SMS message

**Option B: Use Custom Tool Call**
1. Set tool name to: `send_notification`
2. Set arguments JSON:
   ```json
   {
     "title": "Test SMS",
     "message": "This is a test SMS from Lumenta MCP!",
     "severity": "medium",
     "channels": ["sms"],
     "metadata": {
       "recipientPhone": "+1234567890"
     }
   }
   ```
3. Click **"Call Tool"**
4. Check results tab and your phone

**Expected Result:**
- ✅ Success message in Results tab
- ✅ SMS received on your phone
- ✅ Message contains both title and body

### 4. Test Phone Calls

**Option A: Use the Quick Test Button**
1. In the "Tools" tab, click **"📞 Test Call Phone"** button
2. Enter your phone number with country code when prompted (e.g., `+1234567890`)
3. Enter the message to say (optional, defaults to a test message)
4. Check the **"Results"** tab for success/failure
5. Answer your phone when it rings

**Option B: Use Custom Tool Call**
1. Set tool name to: `call_phone`
2. Set arguments JSON:
   ```json
   {
     "to": "+1234567890",
     "message": "Hello! This is a test call from Lumenta MCP.",
     "assistantId": "your-assistant-id"
   }
   ```
   - `assistantId` is optional - uses default from environment variable if not provided
3. Click **"Call Tool"**
4. Answer your phone

**Expected Result:**
- ✅ Success message in Results tab with call ID
- ✅ Your phone rings
- ✅ Message is spoken during the call (via Vapi assistant)

**Note:**
- Vapi handles webhooks internally, so **no ngrok setup needed!**
- Much simpler than Twilio for local development

## Troubleshooting

### Email Not Working?

**Error: "RESEND_API_KEY environment variable is not set"**
- ✅ Add `RESEND_API_KEY` to your `.env` file
- ✅ Restart your dev server

**Error: "Recipient email is required"**
- ✅ Make sure you're passing `recipientEmail` in the `metadata` field
- ✅ Or use the quick test button which prompts for email

**Email not received:**
- ✅ Check your spam folder
- ✅ Verify your Resend API key is valid
- ✅ Check Resend dashboard for delivery status
- ✅ **Domain Verification**: If using a custom domain, verify it at https://resend.com/domains
- ✅ **Or remove `RESEND_FROM_EMAIL`** from `.env` to use Resend's default domain (`onboarding@resend.dev`) - works immediately!

**Error: "domain is not verified"**
- ✅ **Quick Fix**: Remove or comment out `RESEND_FROM_EMAIL` from `.env` - the code automatically uses Resend's default domain
- ✅ **For Production**: Verify your domain at https://resend.com/domains, then set `RESEND_FROM_EMAIL`
- ✅ See `RESEND_DOMAIN_SETUP.md` for detailed instructions

### SMS Not Working?

**Error: "VONAGE_API_KEY environment variable is not set"**
- ✅ Add Vonage credentials to your `.env` file:
  ```bash
  VONAGE_API_KEY=your_vonage_api_key
  VONAGE_API_SECRET=your_vonage_api_secret
  VONAGE_FROM_NUMBER=Lumenta  # Optional: defaults to "Lumenta" if not set
  ```
- ✅ Restart your dev server

**Error: "Recipient phone number is required"**
- ✅ Make sure you're passing `recipientPhone` in the `metadata` field
- ✅ Phone number must include country code with `+` (e.g., `+1234567890`)

**Error: "Phone number must include country code" (Error Code 21211)**
- ✅ Phone number must start with `+` followed by country code
- ✅ Correct: `+1234567890`, `+447911123456`
- ✅ Wrong: `1234567890`, `(123) 456-7890`

**Error: "Trial accounts can only send SMS to verified numbers" (Error Code 21610, 21614)**
- ✅ **This is the most common issue!** 
- ✅ Verify your phone number first: https://console.twilio.com/us1/develop/phone-numbers/manage/verified
- ✅ Add your phone number → Verify via code → Then test SMS again
- ✅ Trial accounts can **only** send to verified numbers

**SMS not received:**
- ✅ Check Vonage Dashboard → SMS → Messages for delivery status
- ✅ Verify your `VONAGE_FROM_NUMBER` is correct (can be alphanumeric like "Lumenta" or a phone number)
- ✅ Make sure phone number format includes country code: `+1234567890`
- ✅ Check account balance/credits in Vonage Dashboard
- ✅ Verify your `VONAGE_API_KEY` and `VONAGE_API_SECRET` are correct

**See `VONAGE_SETUP.md` for detailed setup and troubleshooting guide!**

### Phone Calls Not Working?

**Error: "Vapi API key is required"**
- ✅ Add `VAPI_API_KEY` to your `.env` file
- ✅ Restart your dev server

**Error: "Vapi phone number ID is required"**
- ✅ Add `VAPI_PHONE_NUMBER_ID` to your `.env` file
- ✅ Get it from your Vapi dashboard

**Error: "Phone number is required"**
- ✅ Make sure you're providing the `to` parameter with country code (e.g., `+1234567890`)

**Call not received:**
- ✅ Check Vapi dashboard → Calls for call status
- ✅ Verify your phone number format (include country code, e.g., `+1` for US)
- ✅ Make sure you have an assistant configured in Vapi (or set `VAPI_ASSISTANT_ID` in `.env`)
- ✅ Check Vapi dashboard for any errors or restrictions

## Using Integrations vs Direct Tool Calls

### Option 1: Direct Tool Calls (Current Test Panel)
The test panel calls tools directly, which is great for testing. However, you need to provide recipient info each time.

### Option 2: Using Integrations (Recommended for Production)
1. **Add Email Service Integration:**
   - Go to MCPs page
   - Click "Add New Tool"
   - Select "Email Service"
   - Configure with your email address
   - Toggle ON

2. **Add SMS Service Integration:**
   - Click "Add New Tool"
   - Select "SMS Service"
   - Configure with your phone number (with country code)
   - Toggle ON

3. **Add Phone Calls Integration:**
   - Click "Add New Tool"
   - Select "Phone Calls"
   - Phone calls use Vapi (configured via environment variables)
   - Configure (optional phone number, optional Vapi Assistant ID)
   - Toggle ON

4. **Test with Integration:**
   - When you call `send_notification` or `call_phone`, the tool will automatically use your active integrations
   - No need to provide recipient info each time

## Example Test Sequence

### Complete Integration Test

1. **Test Email:**
   ```
   Click "📧 Test Send Email"
   → Enter: your-email@example.com
   → Check inbox ✅
   ```

2. **Test SMS:**
   ```
   Click "💬 Test Send SMS"
   → Enter: +1234567890
   → Check phone ✅
   ```

3. **Test Phone Call:**
   ```
   Click "📞 Test Call Phone"
   → Enter: +1234567890
   → Enter message: "Hello from Lumenta!"
   → Answer call ✅
   ```

## Checklist

- [ ] `RESEND_API_KEY` is set in `.env`
- [ ] `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID` are set for phone calls
- [ ] `VONAGE_API_KEY`, `VONAGE_API_SECRET`, `VONAGE_FROM_NUMBER` are set for SMS
- [ ] Dev server is running (`npm run dev`)
- [ ] Can access MCP Test Panel on MCPs page
- [ ] Test email successfully sent and received
- [ ] Test SMS successfully sent and received
- [ ] Test phone call successfully initiated and received
- [ ] (Optional) `VAPI_ASSISTANT_ID` is set if you want to use a specific assistant

## Next Steps

Once testing is successful:
1. Set up integrations with your real email/phone
2. Connect your workflow runtime to stream events
3. Start the Gemini orchestrator to automate actions
4. Monitor the Results tab for all actions taken

---

**Need Help?** Check the Results tab in the test panel for detailed error messages. Most issues are related to missing environment variables or incorrect credentials.
