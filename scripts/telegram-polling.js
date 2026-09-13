// Load environment variables
require('dotenv').config({ path: '.env.local' });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

let offset = 0;
const POLL_INTERVAL_MS = 1000;

async function pollUpdates() {
  try {
    const response = await fetch(`${API_BASE}/getUpdates?offset=${offset}&timeout=30`, {
      signal: AbortSignal.timeout(35_000),
    });

    const data = await response.json();

    if (!data.ok || !data.result) {
      console.error("Failed to fetch updates:", data);
      return;
    }

    for (const update of data.result) {
      console.log("📨 Received update:", update.update_id);
      console.log("Message:", JSON.stringify(update.message, null, 2));
      
      // Send update to API route for processing
      try {
        const apiResponse = await fetch('http://localhost:3000/api/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update),
        });
        console.log("✅ Update processed:", apiResponse.status);
      } catch (apiError) {
        console.error("❌ Failed to process update via API:", apiError);
      }
      
      offset = update.update_id + 1;
    }
  } catch (error) {
    console.error("Polling error:", error);
  }
}

async function startPolling() {
  console.log("🤖 Telegram polling started...");
  console.log("🔗 API Base:", API_BASE);
  console.log("📡 Dev server: http://localhost:3000");
  
  while (true) {
    await pollUpdates();
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

startPolling().catch(console.error);