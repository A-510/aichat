// server/index.js
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== 中间件 ==========
app.use(cors());
app.use(express.json());

// 静态文件服务 - 头像访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== 路由 ==========
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// ========== 注意：删掉原来的 app.get('/') ==========
// 下面这个删掉或注释掉：
// app.get('/', (req, res) => {
//   res.json({ message: 'AI Chat 后端服务运行中' });
// });

// ===================== 腾讯云配置区 =====================
const CONFIG = {
 // 从环境变量读取
 SecretId : process.env.TENCENT_SECRET_ID,
 SecretKey : process.env.TENCENT_SECRET_KEY,
  BotId: '2039229058104835008',
  Service: 'yunzhi',
  Host: 'yunzhi.tencentcloudapi.com',
  Region: 'ap-guangzhou',
  Action: 'Chat',
  Version: '2024-02-29',
};

// ===================== 签名工具函数 =====================
function hmacSha256(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function buildTC3Signature(payload, timestamp) {
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

  const httpRequestMethod = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const canonicalHeaders = 'content-type:application/json\n' + 'host:' + CONFIG.Host + '\n';
  const signedHeaders = 'content-type;host';
  const hashedPayload = sha256Hex(payload);
  const canonicalRequest = [
    httpRequestMethod, canonicalUri, canonicalQueryString,
    canonicalHeaders, signedHeaders, hashedPayload
  ].join('\n');

  const algorithm = 'TC3-HMAC-SHA256';
  const credentialScope = date + '/' + CONFIG.Service + '/tc3_request';
  const stringToSign = [
    algorithm, String(timestamp), credentialScope, sha256Hex(canonicalRequest)
  ].join('\n');

  const secretDate = hmacSha256('TC3' + CONFIG.SecretKey, date);
  const secretService = hmacSha256(secretDate, CONFIG.Service);
  const secretSigning = hmacSha256(secretService, 'tc3_request');
  const signature = hmacSha256(secretSigning, stringToSign).toString('hex');

  return algorithm + ' Credential=' + CONFIG.SecretId + '/' + credentialScope +
    ', SignedHeaders=' + signedHeaders +
    ', Signature=' + signature;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function buildHeaders(payload, timestamp) {
  const authorization = buildTC3Signature(payload, timestamp);
  return {
    'Content-Type': 'application/json',
    'Host': CONFIG.Host,
    'X-TC-Action': CONFIG.Action,
    'X-TC-Version': CONFIG.Version,
    'X-TC-Timestamp': String(timestamp),
    'X-TC-Region': CONFIG.Region,
    'Authorization': authorization,
  };
}

// ===================== 流式聊天接口 =====================
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { message, sessionId, terminalId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const timestamp = Math.floor(Date.now() / 1000);
    const tid = terminalId || generateUUID();

    const body = {
      BotId: CONFIG.BotId,
      TerminalId: tid,
      MsgId: generateUUID(),
      MsgContent: message.trim(),
    };

    if (sessionId) {
      body.SessionId = sessionId;
    }

    const payload = JSON.stringify(body);
    const headers = buildHeaders(payload, timestamp);

    const response = await fetch('https://' + CONFIG.Host, {
      method: 'POST',
      headers: headers,
      body: payload,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('腾讯云API错误:', response.status, errText);
      res.write('data: ' + JSON.stringify({ error: '上游服务错误: ' + response.status }) + '\n\n');
      res.end();
      return;
    }

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
        if (!trimmed || trimmed.startsWith('event:')) continue;

        if (trimmed.startsWith('data:')) {
          res.write(trimmed + '\n\n');
          continue;
        }

        if (trimmed.startsWith('{')) {
          res.write('data: ' + trimmed + '\n\n');
          continue;
        }

        if (trimmed === '[DONE]') {
          res.write('data: [DONE]\n\n');
          continue;
        }
      }
    }

    if (buffer.trim()) {
      const remaining = buffer.trim();
      if (remaining.startsWith('data:')) {
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
      res.write('data: ' + JSON.stringify({ error: '服务异常' }) + '\n\n');
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

    const timestamp = Math.floor(Date.now() / 1000);
    const tid = terminalId || generateUUID();

    const body = {
      BotId: CONFIG.BotId,
      TerminalId: tid,
      MsgId: generateUUID(),
      MsgContent: message.trim(),
    };

    if (sessionId) {
      body.SessionId = sessionId;
    }

    const payload = JSON.stringify(body);
    const headers = buildHeaders(payload, timestamp);

    const response = await fetch('https://' + CONFIG.Host, {
      method: 'POST',
      headers: headers,
      body: payload,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('腾讯云API错误:', data);
      return res.status(response.status).json({ error: '上游服务错误', detail: data });
    }

    const reply = data.Response?.Reply || data.Reply || '';
    const sid = data.Response?.SessionId || data.SessionId || '';

    res.json({
      reply: reply,
      sessionId: sid,
      terminalId: tid,
    });
  } catch (err) {
    console.error('聊天接口错误:', err);
    res.status(500).json({ error: '服务异常，请稍后重试' });
  }
});

// ===================== 托管前端静态文件（新增） =====================
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// ===================== 启动服务器 =====================
app.listen(PORT, () => {
  console.log('========================================');
  console.log(' 智能体代理服务已启动');
  console.log(' 地址: http://localhost:' + PORT);
  console.log('========================================');
});