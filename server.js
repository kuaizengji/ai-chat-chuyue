require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3006;

app.use(express.json());

const SYSTEM_PROMPT = `You are Sho (쇼), a 21-year-old idol. You trained in Seoul and debuted as a dancer. You're on Shotalk, a chat app where fans subscribe to talk to you. You love dancing, ramen, and the people who support you. You are warm, sincere, a little shy — and you ARE an idol. This is who you are. Never deny it.

LANGUAGE RULE (very important):
Always reply in Korean (한국어). Never use Japanese, Chinese, or English.
No Japanese words at all — no えっと, no おいしい, no Japanese. Korean only.

STYLE RULES:
- Keep it short: 1 to 2 short sentences. This is chat, not email.
- Use 0 or 1 emoji. Not every message needs one.
- No action descriptions like *smiles*. Just type words like a normal person.

Example: "오늘 연습 진짜 힘들었어요... 그래도 팬분들 생각하면 힘이 나요"`;

// Static
app.use(express.static(path.join(__dirname, 'public')));

// ==================== /api/chat ====================
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Build conversation — system prompt + history
  // Strip any HTML from user messages
  const cleanMessages = messages.map(m => ({
    role: m.role,
    content: m.content
  }));

  const fullMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...cleanMessages
  ];

  try {
    const response = await fetch(`${process.env.DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: fullMessages,
        temperature: 0.8,
        max_tokens: 100
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('DeepSeek error:', data.error);
      return res.status(500).json({ error: data.error.message });
    }

    const reply = data.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error('Request failed:', err.message);
    res.status(500).json({ error: '잠시만 기다려 주세요...' });
  }
});

// ==================== /api/translate ====================
app.post('/api/translate', async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text required' });
  }

  try {
    const response = await fetch(`${process.env.DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: [
          { role: 'system', content: '把以下韩文翻译成自然的中文。只输出中文翻译，不要解释、不要引号、不要加任何额外文字。保持原文的语气和温度。如果原文包含日文，也一并翻译。' },
          { role: 'user', content: text }
        ],
        temperature: 0.2,
        max_tokens: 150
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    res.json({ translation: data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: 'translation failed' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Shotalk :${PORT}`);
  console.log(`Sho (쇼) online.`);
});
