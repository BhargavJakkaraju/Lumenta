# Discord Integration Setup Guide

Discord integration allows you to send alerts and notifications directly to your Discord server via webhooks. **It's completely FREE!**

## How to Set Up Discord Webhook

### Step 1: Create a Discord Webhook

1. **Open Discord** and go to your server
2. **Click on Server Settings** (gear icon next to server name)
3. **Go to "Integrations"** in the left sidebar
4. **Click "Webhooks"** → **"New Webhook"** (or "Create Webhook")
5. **Configure your webhook:**
   - **Name**: Give it a name (e.g., "Lumenta Alerts")
   - **Channel**: Select which channel to send messages to
   - **Copy the Webhook URL** (looks like: `https://discord.com/api/webhooks/1234567890/abcdefghijklmnop`)
6. **Click "Save Changes"**

### Step 2: Add Discord Integration in Lumenta

1. Go to **MCPs page** in your app
2. Click **"Add New Tool"** button (top right)
3. Select **"Discord Integration"**
4. Click **"Configure"**
5. **Paste your Discord Webhook URL** in the "Discord Webhook URL" field
6. **Optional**: Set a custom bot username (defaults to webhook name)
7. Click **"Save Configuration"**
8. **Toggle ON** the integration to activate it

### Step 3: Test Discord Integration

#### Option A: Via MCP Test Panel

1. Go to MCPs page → Scroll to "MCP Server Testing" panel
2. Click **"Tools"** tab
3. Set tool name to: `send_notification`
4. Set arguments JSON:
   ```json
   {
     "title": "Test Discord Alert",
     "message": "This is a test notification from Lumenta! If you see this in Discord, the integration is working correctly.",
     "severity": "medium",
     "channels": ["webhook"],
     "metadata": {
       "integrationId": "discord-xxxxx"
     }
   }
   ```
5. Click **"Call Tool"**
6. Check your Discord channel for the message!

#### Option B: Via Integration

When the Discord integration is active, any notification sent through the `send_notification` tool will automatically be sent to Discord if configured.

## Discord Message Format

Discord messages will appear as embeds with:
- **Title**: Notification title
- **Description**: Notification message
- **Color**: Based on severity
  - 🟦 Blue for "low" severity
  - 🟨 Gold for "medium" severity
  - 🟥 Red for "high" severity
- **Timestamp**: When the notification was sent
- **Bot Username**: Custom username (if set) or webhook name

## Troubleshooting

### Error: "Webhook URL is required"

**Fix:**
- ✅ Make sure you've configured the Discord integration with a webhook URL
- ✅ Copy the webhook URL from Discord → Server Settings → Integrations → Webhooks
- ✅ Format should be: `https://discord.com/api/webhooks/1234567890/abcdefghijklmnop`

### Discord Message Not Received

**Check These:**
- ✅ Webhook URL is correct and active in Discord
- ✅ Integration is toggled ON in Lumenta
- ✅ Webhook hasn't been deleted or disabled in Discord
- ✅ You have permission to view the channel the webhook is configured for
- ✅ Check Discord server logs for any errors

### Invalid Webhook Format Error

**Fix:**
- ✅ Make sure webhook URL starts with `https://discord.com/api/webhooks/`
- ✅ Webhook URL should not have any spaces or extra characters
- ✅ Try creating a new webhook in Discord if the URL is invalid

## Discord Webhook Security

⚠️ **Important Security Notes:**

- **Webhook URLs are sensitive** - Anyone with the URL can send messages to your channel
- **Don't share your webhook URL** publicly
- **Revoke old webhooks** if you suspect they've been compromised
- **Use environment variables** for production (webhook URLs should be stored securely)

## Advantages of Discord Integration

✅ **Completely FREE** - No limits, no cost  
✅ **Real-time notifications** - Instant alerts in your Discord server  
✅ **Rich formatting** - Beautiful embeds with colors and formatting  
✅ **Easy setup** - Just copy-paste webhook URL  
✅ **Team collaboration** - Share alerts with your entire team  
✅ **Mobile support** - Get Discord notifications on your phone  
✅ **History** - All alerts are stored in Discord for reference

## Example Use Cases

- 🔴 **Security alerts** - Get notified when unauthorized access is detected
- 🟡 **System status** - Receive updates about system health and performance
- 🔵 **Workflow events** - Get notified when workflows complete or fail
- 🟢 **Camera detections** - Receive alerts when specific objects or people are detected
- 🔔 **Custom events** - Any event you want to track and share with your team

## Next Steps

1. Set up your Discord webhook (takes 2 minutes!)
2. Add the Discord integration in Lumenta
3. Configure it with your webhook URL
4. Test it using the MCP Test Panel
5. Start receiving real-time alerts in Discord! 🎉

---

**Need help?** Check the Discord webhook documentation: https://discord.com/developers/docs/resources/webhook
