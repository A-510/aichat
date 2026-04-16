// server/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== 中间件 ==========
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://atrichat.top',
    // 如有其他前端域名也加上
  ],
  credentials: true
}));
app.use(express.json());

// 静态文件服务 - 头像访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== 路由 ==========
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// ===================== 智能体配置 =====================
// 在 Render 环境变量中配置：
// TENCENT_APP_KEY = 你已启用的那个 S******U 的 AppKey
// TENCENT_BOT_ID = 从智能体体验链接中获取（pzMUAu 或完整ID）
const APP_KEY = process.env.TENCENT_APP_KEY;
const BOT_ID = process.env.TENCENT_BOT_ID || 'pzMUAu';

// ===================== 流式聊天接口（SSE） =====================
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { message, sessionId, terminalId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // 生成唯一ID
    const visitorBizId = terminalId || generateUUID();

    // 构建请求体 —— 腾讯云智能体 HTTP SSE 接口
    const requestBody = {
      content: {
        type: 'text',
        text: message.trim()
      },
      bot_appkey: BOT_ID,
      visitor_biz_id: visitorBizId
    };

    if (sessionId) {
      requestBody.session_id = sessionId;
    }

    // 调用腾讯云智能体 API（AppKey 鉴权）
    const apiUrl = 'https://aiadp.cloud.tencent.com/aiadp/api/v1/chat/completions';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'openapi',
        'Authorization': `Bearer ${APP_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('智能体API错误:', response.status, errText);
      res.write(`data: ${JSON.stringify({ error: '上游服务错误: ' + response.status, detail: errText })}\n\n`);
      res.end();
      return;
    }

    // 转发 SSE 流
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          res.write('\n');
          continue;
        }

        // 直接转发所有 SSE 事件
        if (trimmed.startsWith('event:') || trimmed.startsWith('data:') || trimmed.startsWith('id:')) {
          res.write(trimmed + '\n');
          continue;
        }

        if (trimmed === '[DONE]') {
          res.write('data: [DONE]\n\n');
          continue;
        }

        // JSON 数据
        if (trimmed.startsWith('{')) {
          res.write('data: ' + trimmed + '\n\n');
          continue;
        }
      }
    }

    // 处理剩余 buffer
    if (buffer.trim()) {
      const remaining = buffer.trim();
      if (remaining.startsWith('data:') || remaining.startsWith('event:')) {
        res.write(remaining + '\n\n');
      } else if (remaining.startsWith('{')) {
        res.write('data: ' + remaining + '\n\n');
      } else if (remaining === '[DONE]') {
        res.write('data: [DONE]\n\n');
      }
    }

    res.end();
  } catch (err) {
    console.error('流式聊天错误:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: '服务异常，请稍后重试' });
    } else {
      res.write(`data: ${JSON.stringify({ error: '服务异常' })}\n\n`);
      res.end();
    }
  }
});

// ===================== 非流式聊天接口 =====================
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId, terminalId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }

    const visitorBizId = terminalId || generateUUID();

    const requestBody = {
      content: {
        type: 'text',
        text: message.trim()
      },
      bot_appkey: BOT_ID,
      visitor_biz_id: visitorBizId,
      stream: false
    };

    if (sessionId) {
      requestBody.session_id = sessionId;
    }

    const apiUrl = 'https://aiadp.cloud.tencent.com/aiadp/api/v1/chat/completions';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'openapi',
        'Authorization': `Bearer ${APP_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('智能体API错误:', data);
      return res.status(response.status).json({ error: '上游服务错误', detail: data });
    }

    // 提取回复内容（根据实际返回格式调整）
    const reply = data.choices?.[0]?.message?.content
      || data.reply
      || data.Response?.Reply
      || JSON.stringify(data);

    const sid = data.session_id || data.Response?.SessionId || '';

    res.json({
      reply: reply,
      sessionId: sid,
      terminalId: visitorBizId,
    });
  } catch (err) {
    console.error('聊天接口错误:', err);
    res.status(500).json({ error: '服务异常，请稍后重试' });
  }
});

// ===================== 工具函数 =====================
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ===================== 托管前端静态文件 =====================
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// ===================== 启动服务器 =====================
app.listen(PORT, () => {
  console.log('========================================');
  console.log(' 智能体代理服务已启动');
  console.log(` 地址: http://localhost:${PORT}`);
  console.log(` AppKey: ${APP_KEY ? '已配置' : '❌ 未配置!'}`);
  console.log(` BotID: ${BOT_ID}`);
  console.log('========================================');
});