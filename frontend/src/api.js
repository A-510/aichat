export async function chatStream(message, sessionId, terminalId, onChunk, onSuccess, onError) {
  try {
    const response = await fetch('/api/chat/stream', {
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
        // 兼容绝大多数后端字段名
        const content = parsed.content || parsed.text || parsed.answer || parsed.data || parsed.message || parsed.result;
        if (typeof content === 'string' && content) {
          onChunk(content);
        } else {
          // 如果实在不知道字段名，把原始 JSON 直接显示出来，保证你能看到东西
          onChunk(JSON.stringify(parsed));
        }
      } catch (e) {
        // 连 JSON 都不是，当纯文本直接显示
        if (data) onChunk(data);
      }
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // 最后一个元素可能不完整，先存起来
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        processText(trimmed);
      }
    }
    
    // 【最关键的修复】：流结束后，把最后剩在缓冲区里的内容也处理掉
    if (buffer.trim()) {
      processText(buffer.trim());
    }

    onSuccess({ sessionId, terminalId });
  } catch (error) {
    onError(error);
  }
}