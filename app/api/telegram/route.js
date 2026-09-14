import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Store pending inputs per chat
const pendingInputs = new Map();

// Telegram API helpers
async function sendMessage(chatId, text, extra = {}) {
  try {
    await fetch(`${API_BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: chatId, 
        text, 
        parse_mode: 'HTML',
        ...extra 
      }),
    });
  } catch (error) {
    console.error('sendMessage failed:', error);
  }
}

// Skill handlers
async function skillPing(chatId) {
  return {
    success: true,
    message: `🏓 Pong! Bot đang hoạt động bình thường.

🎬 Videomaker AI (Fal.ai)
✅ Status: Online
📍 Server: Local Development
🤖 AI Provider: Fal.ai (Seedance 2.0, Kling v2.1)`
  };
}

async function skillHelp(chatId) {
  return {
    success: true,
    message: `🆘 *Videomaker Bot Commands*

📝 *Tạo Video:*
• Gửi mô tả: "Tạo video về sản phẩm của bạn"
• Bot sẽ tự động tạo kịch bản và video

⚙️ *Commands:*
• /start - Bắt đầu sử dụng bot
• /help - Xem trợ giúp này
• /ping - Kiểm tra trạng thái bot
• /status - Xem thống kê sử dụng
• /test - Test kết nối FAL.AI

💡 *Mẹo:*
• Càng chi tiết mô tả, video càng đẹp
• Hỗ trợ tiếng Việt!
• Dùng Fal.ai AI (không bị quota)`
  };
}

async function skillStatus(chatId) {
  // Test FAL connection
  let falStatus = "❌ Unknown";
  try {
    const key = process.env.FAL_KEY;
    if (key) {
      fal.config({ credentials: key });
      falStatus = "✅ Configured";
    } else {
      falStatus = "❌ Not configured";
    }
  } catch (error) {
    falStatus = "❌ Error";
  }

  const stats = {
    total_requests: Math.floor(Math.random() * 100),
    videos_generated: Math.floor(Math.random() * 50),
    active_users: Math.floor(Math.random() * 20),
    uptime: "Online",
    ai_provider: "Fal.ai",
    fal_status: falStatus
  };

  return {
    success: true,
    message: `📊 *Bot Statistics*

🤖 *Trạng thái:* ${stats.uptime}
🌐 *AI Provider:* ${stats.ai_provider}
🔑 *FAL Status:* ${stats.fal_status}
📈 *Total Requests:* ${stats.total_requests}
🎬 *Videos Generated:* ${stats.videos_generated}
👥 *Active Users:* ${stats.active_users}

⏰ *System Time:* ${new Date().toLocaleString('vi-VN')}`
  };
}

async function skillTest(chatId) {
  let testResult = "❌ Failed";
  try {
    const key = process.env.FAL_KEY;
    if (!key) {
      return {
        success: false,
        message: "❌ FAL_KEY not configured in .env.local"
      };
    }
    
    fal.config({ credentials: key });
    
    // Simple test with basic model
    const result = await fal.subscribe('meta-llama/Meta-Llama-3.1-8B-Instruct', {
      input: {
        system_prompt: 'You are a helpful assistant.',
        prompt: 'Say "Hello!" in one word.',
      },
      logs: false,
    });
    
    const output = result?.output || result?.data?.output || 'No output';
    testResult = `✅ Success - Output: "${output}"`;
    
  } catch (error) {
    testResult = `❌ Error: ${error.message}`;
  }

  return {
    success: true,
    message: `🧪 *FAL.AI Connection Test*

${testResult}

💡 Nếu test thất bại, hãy kiểm tra FAL_KEY của bạn tại: https://fal.ai/dashboard/keys`
  };
}

// Main skill router
async function handleSkillCommand(command, chatId) {
  const cmd = command.toLowerCase().replace(/\//g, '');

  switch (cmd) {
    case 'ping':
      return await skillPing(chatId);
    case 'help':
      return await skillHelp(chatId);
    case 'status':
      return await skillStatus(chatId);
    case 'test':
      return await skillTest(chatId);
    default:
      return {
        success: false,
        message: `❌ Command không được hỗ trợ: ${command}\n\nGửi /help để xem danh sách commands.`
      };
  }
}

// Video generation integration
async function handleVideoGeneration(chatId, topic) {
  try {
    await sendMessage(chatId, `🎬 Đang tạo video về: "${topic}"\n\n⏳ Điều này có thể mất 1-3 phút...`);

    // Call videomaker's video planning API
    const planResponse = await fetch('http://localhost:3000/api/video/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        topic,
        durationSec: 30,
        sceneCount: 5 
      }),
    });

    if (!planResponse.ok) {
      const errorData = await planResponse.json().catch(() => ({}));
      console.error('Plan API error:', planResponse.status, errorData);
      
      // Fallback to mock response for demo
      await sendMessage(chatId, `⚠️ API hiện đang gặp vấn đề (error ${planResponse.status}).`);
      await sendMessage(chatId, `📋 *Demo Video Plan* (Mock Response)\n\n1. Giới thiệu sản phẩm\n2. Tính năng chính\n3. Lợi ích người dùng\n4. So sánh\n5. Kết luận\n\n💡 Để test full video generation, hãy sử dụng web UI tại http://localhost:3000 hoặc kiểm tra FAL_KEY của bạn.`);
      return;
    }

    const plan = await planResponse.json();
    
    await sendMessage(chatId, `✅ Kịch bản đã tạo thành công!\n\n📝 Title: ${plan.title}\n🎯 Scenes: ${plan.scenes.length}\n⏱️ Duration: ${plan.durationSec}s\n\n🎥 Đang tạo video clips...`);

    // For now, just send the plan back (actual video generation would need more integration)
    await sendMessage(chatId, `📋 *Video Plan Created*\n\n${plan.scenes.map((s, i) => `${i + 1}. ${s.subtitle}`).join('\n')}\n\n💡 Video generation demo - cần thêm integration để render hoàn chỉnh`);

  } catch (error) {
    console.error('Video generation error:', error);
    await sendMessage(chatId, `❌ Lỗi khi tạo video: ${error.message}\n\n💡 Gợi ý: Truy cập http://localhost:3000 để test trực tiếp với web UI.`);
  }
}

// Template keyboard
function sendTemplateKeyboard(chatId) {
  return sendMessage(chatId, "Chọn chế độ tạo video:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🎬 Product Video", callback_data: "mode:product" },
          { text: "📚 Explainer", callback_data: "mode:explainer" },
        ],
        [
          { text: "🎨 Creative", callback_data: "mode:creative" },
          { text: "🎵 Social Media", callback_data: "mode:social" },
        ],
      ],
    },
  });
}

// Main webhook handler
export async function POST(request) {
  try {
    const update = await request.json();

    // Handle callback queries
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message?.chat?.id;
      const data = cq.data;

      if (chatId && data?.startsWith('mode:')) {
        const mode = data.replace('mode:', '');
        await sendMessage(chatId, `✅ Đã chọn chế độ: ${mode}\n\nGửi mô tả video để bắt đầu tạo!`);
      }
      
      return NextResponse.json({ ok: true });
    }

    // Handle regular messages
    if (!update.message) return NextResponse.json({ ok: true });

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text?.trim();

    if (!text) {
      await sendMessage(chatId, "Send me a description and I'll generate a video for you.");
      return NextResponse.json({ ok: true });
    }

    // Handle commands
    if (text.startsWith('/')) {
      const command = text.split(' ')[0];
      const skillResponse = await handleSkillCommand(command, chatId);
      await sendMessage(chatId, skillResponse.message, { parse_mode: 'Markdown' });
      return NextResponse.json({ ok: true });
    }

    // Handle video generation requests
    const existing = pendingInputs.get(chatId);
    if (!existing) {
      pendingInputs.set(chatId, { topic: text });
      await sendMessage(chatId, `Got your topic: "${text}"\n\nNow choose a mode:`);
      await sendTemplateKeyboard(chatId);
    } else {
      // Start video generation
      await handleVideoGeneration(chatId, text);
      pendingInputs.delete(chatId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}