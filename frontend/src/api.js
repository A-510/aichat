// API 基础地址配置
const API_URL = import.meta.env.VITE_API_URL || '';

export async function chatStream(message, sessionId, terminalId, onChunk, onSuccess, onError) {
  try {
    const response = await fetch(`${API_URL}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId, terminalId })
    });
    

    if (!response.ok) {
      throw new Error('服务器请求失败 (' + response.status + ')');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    
    // 统一处理文本的函数
    function processText(text) {
      let data = text;
      if (text.startsWith('data:')) {
        data = text.slice(5).trim();
      }
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.content || parsed.text || parsed.answer || parsed.data || parsed.message || parsed.result;
        if (typeof content === 'string' && content) {
          onChunk(content);
        } else {
          onChunk(JSON.stringify(parsed));
        }
      } catch (e) {
        if (data) onChunk(data);
      }
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        processText(trimmed);
      }
    }
    
    if (buffer.trim()) {
      processText(buffer.trim());
    }

    onSuccess({ sessionId, terminalId });
  } catch (error) {
    onError(error);
  }
}