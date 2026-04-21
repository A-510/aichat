<!-- frontend/src/components/ChatMessage.vue -->
<template>
  <div class="message-row" :class="'message-row--' + role">
    <!-- AI 头像 -->
    <div v-if="role === 'assistant'" class="avatar avatar--ai">
      <img src="../assets/ai-avatar.png" alt="AI" class="avatar-img" />
    </div>

    <!-- 气泡 + 按钮 包一层，方便按钮和气泡左对齐 -->
    <div class="bubble-wrap" :class="'bubble-wrap--' + role">
      <!-- 气泡 -->
      <div class="bubble" :class="'bubble--' + role">
        <!-- 加载态 -->
        <div v-if="isLoading" class="bubble-loading">
          <span class="loading-dot"></span>
          <span class="loading-dot"></span>
          <span class="loading-dot"></span>
        </div>
        
        <!-- 内容 -->
        <!-- 内容 -->
    <div v-else class="bubble-content">
      <!-- ✅ 附件展示 -->
  <div v-if="files && files.length" class="msg-files">
    <div v-for="(f, i) in files" :key="i" class="msg-file">
      <a
        v-if="f.type === 'image'"
        :href="f.url"
        target="_blank"
        class="msg-file-image"
      >
        <img :src="f.url" :alt="f.name" />
      </a>
      <a
        v-else
        :href="f.url"
        target="_blank"
        class="msg-file-doc"
      >
        <span class="material-icons-round">description</span>
        <span class="msg-file-name">{{ f.name }}</span>
      </a>
    </div>
  </div>

  <p v-for="(line, idx) in contentLines" :key="idx">{{ line }}</p>
  <span v-if="isStreaming" class="streaming-cursor"></span>
</div>
      </div>

      <!-- ✅ 选项按钮（仅 AI 消息、非加载、非流式中、有 options 时显示） -->
      <div
        v-if="role === 'assistant' && !isLoading && !isStreaming && options && options.length"
        class="options-row"
      >
        <button
          v-for="opt in options"
          :key="opt"
          class="option-btn"
          @click="$emit('option-click', opt)"
        >
          {{ opt }}
        </button>
      </div>
    </div>

    <!-- 用户头像 -->
    <div v-if="role === 'user'" class="avatar avatar--user">
      <img v-if="userAvatar" :src="userAvatar" alt="Me" class="avatar-img" />
      <img v-else src="../assets/user-avatar.png" alt="Me" class="avatar-img" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  role: { type: String, required: true },
  content: { type: String, default: '' },
  isLoading: { type: Boolean, default: false },
  isStreaming: { type: Boolean, default: false },
  userAvatar: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  files: { type: Array, default: () => [] },// ✅ 新增
});

defineEmits(['option-click']);   // ✅ 新增

const contentLines = computed(function () {
  if (!props.content) return [];
  return props.content.split('\n');
});
</script>

<style scoped>
/* ====== 消息附件 ====== */
.msg-files {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.msg-file-image {
  display: block;
  max-width: 220px;
  max-height: 220px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.msg-file-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.msg-file-doc {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 10px;
  color: var(--accent, #10b981);
  text-decoration: none;
  font-size: 13px;
  max-width: 260px;
}
.msg-file-doc:hover { background: rgba(16, 185, 129, 0.15); }
.msg-file-doc .material-icons-round { font-size: 18px; }
.msg-file-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* 用户气泡里的文件按钮在深色背景上用白色 */
.bubble--user .msg-file-doc {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
}
.message-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  animation: msgIn 0.35s var(--transition-slow) both;
}

.message-row--user { justify-content: flex-end; }
.message-row--assistant { justify-content: flex-start; }

@keyframes msgIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ====== 头像 ====== */
.avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar--ai {
  background: var(--accent-dim);
  color: var(--accent);
  border: 1px solid rgba(16, 185, 129, 0.2);
}
.avatar--user {
  background: rgba(255, 255, 255, 0.08);
  color: var(--fg-secondary);
  border: 1px solid var(--border);
}

/* ====== 气泡包裹层 ====== */
.bubble-wrap {
  display: flex;
  flex-direction: column;
  max-width: 72%;
}
.bubble-wrap--user { align-items: flex-end; }
.bubble-wrap--assistant { align-items: flex-start; }

/* ====== 气泡 ====== */
.bubble {
  border-radius: var(--radius-lg);
  padding: 12px 18px;
  line-height: 1.7;
  font-size: 14.5px;
  word-break: break-word;
}
.bubble--user {
  background: var(--user-bubble);
  color: var(--user-bubble-text);
  border-bottom-right-radius: 6px;
  font-weight: 500;
}
.bubble--assistant {
  background: var(--ai-bubble);
  color: var(--fg);
  border: 1px solid var(--ai-bubble-border);
  border-bottom-left-radius: 6px;
}

.bubble-content p { margin: 0; }
.bubble-content p + p { margin-top: 8px; }

/* ====== 选项按钮 ====== */
.options-row {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  animation: msgIn 0.3s ease both;
}
.option-btn {
  padding: 7px 14px;
  font-size: 13.5px;
  font-family: inherit;
  color: var(--accent, #10b981);
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.35);
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.option-btn:hover {
  background: var(--accent, #10b981);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}
.option-btn:active {
  transform: translateY(0);
}

/* ====== 加载动画 ====== */
.bubble-loading {
  display: flex; align-items: center; gap: 5px; padding: 4px 0;
}
.loading-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--fg-muted);
  animation: dotBounce 1.2s ease-in-out infinite;
}
.loading-dot:nth-child(2) { animation-delay: 0.15s; }
.loading-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes dotBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-6px); opacity: 1; }
}

/* ====== 流式光标 ====== */
.streaming-cursor {
  display: inline-block;
  width: 2px; height: 16px;
  background: var(--accent);
  margin-left: 2px;
  vertical-align: text-bottom;
  border-radius: 1px;
  animation: cursorBlink 0.8s steps(2) infinite;
}
@keyframes cursorBlink {
  0% { opacity: 1; }
  100% { opacity: 0; }
}

/* ====== 响应式 ====== */
@media (max-width: 640px) {
  .bubble { font-size: 14px; padding: 10px 14px; }
  .bubble-wrap { max-width: 85%; }
  .avatar { width: 30px; height: 30px; }
  .option-btn { font-size: 12.5px; padding: 6px 12px; }
}
</style>