# Vapi Setup Guide - Phone Calls

## Important: VAPI_PHONE_NUMBER_ID Must Be a UUID!

The `VAPI_PHONE_NUMBER_ID` in your `.env` file must be a **UUID from your Vapi dashboard**, NOT a phone number.

### How to Get the Correct VAPI_PHONE_NUMBER_ID

1. **Go to Vapi Dashboard**
   - Visit: https://dashboard.vapi.ai
   - Log in to your account

2. **Navigate to Phone Numbers**
   - Click on **"Phone Numbers"** in the left sidebar
   - You'll see a list of phone numbers

3. **Copy the ID (UUID), NOT the Phone Number**
   - For each phone number, you'll see:
     - **Phone Number**: `+17604915325` (this is the actual phone number - DON'T use this!)
     - **ID**: `a1b2c3d4-e5f6-7890-abcd-ef1234567890` (this is the UUID - USE THIS!)
   
   - Click on the phone number you want to use
   - Copy the **ID** field (it's a UUID like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
   - **Do NOT copy the phone number itself!**

4. **Update Your .env File**
   ```bash
   # ❌ WRONG - This is a phone number, not a UUID
   VAPI_PHONE_NUMBER_ID=+17604915325
   
   # ✅ CORRECT - This is a UUID from Vapi dashboard
   VAPI_PHONE_NUMBER_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
   ```

## Current Issue

Your `.env` file currently has:
```bash
VAPI_PHONE_NUMBER_ID=+17604915325  # ❌ This is a phone number!
```

**Fix it by:**
1. Getting the UUID from Vapi dashboard (see steps above)
2. Replacing `+17604915325` with the UUID
3. Restarting your dev server

## How Phone Calls Work in Vapi

1. **Phone Number ID (UUID)**: Identifies which Vapi phone number resource to use
   - Found in: Vapi Dashboard → Phone Numbers → Copy the ID (UUID)
   - Used in: `VAPI_PHONE_NUMBER_ID` environment variable

2. **Customer Phone Number**: The actual phone number to call
   - Format: `+1234567890` (with country code)
   - Provided when calling: `{ "to": "+17609843627" }`

3. **Assistant ID (REQUIRED)**: Which assistant to use for the call
   - Found in: Vapi Dashboard → Assistants → Copy the ID (UUID)
   - Used in: `VAPI_ASSISTANT_ID` environment variable or passed in call request
   - **REQUIRED**: Vapi API requires either `assistantId`, `assistant`, `squad`, or `squadId`

4. **Message**: **NOT passed in the API call!**
   - The message/prompt is configured in your **Vapi assistant settings**
   - Go to: Vapi Dashboard → Assistants → Select your assistant → Configure the message/prompt there
   - You can also use functions/scripts in the assistant to customize messages

## Required Environment Variables

```bash
# Required
VAPI_API_KEY=your_vapi_api_key_here
VAPI_PHONE_NUMBER_ID=your-uuid-here-not-phone-number  # Must be a UUID!
VAPI_ASSISTANT_ID=your-assistant-uuid-here  # REQUIRED - Must be a UUID!
```

### How to Get VAPI_ASSISTANT_ID

1. **Go to Vapi Dashboard**
   - Visit: https://dashboard.vapi.ai
   - Log in to your account

2. **Navigate to Assistants**
   - Click on **"Assistants"** in the left sidebar
   - You'll see a list of assistants

3. **Copy the Assistant ID (UUID)**
   - Click on the assistant you want to use
   - Copy the **ID** field (it's a UUID like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
   - Or find it in the assistant list view - look for the "ID" column

4. **Update Your .env File**
   ```bash
   VAPI_ASSISTANT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890  # ✅ Correct UUID
   ```

## Testing

After fixing your `.env` file:

1. **Restart your dev server:**
   ```bash
   npm run dev
   ```

2. **Test the phone call:**
   - Go to MCP Test Panel → Tools tab
   - Click "📞 Test Call Phone"
   - Enter the phone number to call (e.g., `+17609843627`)
   - The call will use the assistant configured in Vapi dashboard

3. **Check the Results:**
   - Should see: `✅ Call initiated successfully!`
   - Your phone should ring
   - The message is whatever you configured in your Vapi assistant

## Troubleshooting

### Error: "phoneNumberId must be a UUID"
- ✅ Make sure `VAPI_PHONE_NUMBER_ID` is a UUID, not a phone number
- ✅ Get the UUID from Vapi Dashboard → Phone Numbers → Copy the ID

### Error: "Couldn't Get Assistant. Need Either `assistant`, `assistantId`, `squad`, Or `squadId`"
- ✅ **REQUIRED**: Set `VAPI_ASSISTANT_ID` in your `.env` file
- ✅ Get the Assistant ID (UUID) from: Vapi Dashboard → Assistants → Copy the ID
- ✅ Make sure it's a UUID, not the assistant name
- ✅ Or provide `assistantId` parameter when calling the tool

### Error: "property message should not exist"
- ✅ This is fixed! The code no longer sends `message` in the API call
- ✅ Configure your message in Vapi Dashboard → Assistants → Your Assistant

### Error: "Vapi Assistant ID is required"
- ✅ Set `VAPI_ASSISTANT_ID` in your `.env` file with a UUID from Vapi dashboard
- ✅ Or provide `assistantId` parameter when calling the tool
- ✅ Get it from: Vapi Dashboard → Assistants → Copy the ID (UUID)

### Call not received
- ✅ Check Vapi Dashboard → Calls for call status
- ✅ Verify the phone number format (must include country code, e.g., `+1`)
- ✅ Make sure `VAPI_ASSISTANT_ID` is set correctly (UUID from dashboard)
- ✅ Check Vapi dashboard for any errors

### Need to customize the message
- ✅ Go to Vapi Dashboard → Assistants
- ✅ Select or create your assistant
- ✅ Configure the first message/prompt in the assistant settings
- ✅ You can also use functions or scripts to make it dynamic

---

## Quick Fixes

1. **Fix VAPI_PHONE_NUMBER_ID**: Replace `+17604915325` with the UUID from Vapi Dashboard → Phone Numbers
2. **Add VAPI_ASSISTANT_ID**: Add `VAPI_ASSISTANT_ID=your-assistant-uuid-here` to your `.env` file
   - Get it from: Vapi Dashboard → Assistants → Copy the ID (UUID)

**Both are REQUIRED!**
