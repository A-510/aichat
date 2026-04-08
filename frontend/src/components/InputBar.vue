<template>
  <div class="input-bar">
    <div class="input-wrapper">
      <textarea
        ref="textareaRef"
        v-model="inputText"
        class="input-field"
        :placeholder="disabled ? '正在生成中...' : '输入你想问的问题...'"
        :disabled="disabled"
        rows="1"
        @keydown.enter.exact="handleEnter"
        @input="autoResize"
      ></textarea>
      <button
        class="send-btn"
        :class="{ 'send-btn--active': canSend }"
        :disabled="!canSend"
        @click="handleSend"
        :title="canSend ? '发送' : '请输入内容'"
      >
        <span class="material-icons-round">send</span>
      </button>
    </div>
    <p class="input-hint">按 Enter 发送，Shift + Enter 换行</p>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';

const props = defineProps({
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['send']);

const inputText = ref('');
const textareaRef = ref(null);

const canSend = computed(function () {
  return inputText.value.trim().length > 0 && !props.disabled;
});

function handleSend() {
  if (!canSend.value) return;
  emit('send', inputText.value);
  inputText.value = '';
  nextTick(function () {
    resetHeight();
  });
}

function handleEnter(e) {
  // Shift+Enter 换行，直接 Enter 发送
  if (e.shiftKey) return;
  e.preventDefault();
  handleSend();
}

/** 自适应高度 */
function autoResize() {
  var el = textareaRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function resetHeight() {
  var el = textareaRef.value;
  if (!el) return;
  el.style.height = 'auto';
}
</script>

<style scoped>
.input-bar {
  flex-shrink: 0;
  padding: 16px 24px 12px;
  border-top: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.12);
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 6px 6px 6px 16px;
  transition: border-color var(--transition-normal), box-shadow var(--transition-normal);
}

.input-wrapper:focus-within {
  border-color: var(--border-active);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.08);
}

.input-field {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--fg);
  font-size: 14.5px;
  font-family: inherit;
  line-height: 1.5;
  resize: none;
  padding: 8px 0;
  max-height: 120px;
  overflow-y: auto;
}

.input-field::placeholder {
  color: var(--fg-muted);
}

.input-field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.06);
  color: var(--fg-muted);
  cursor: not-allowed;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-normal);
}

.send-btn--active {
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(16, 185, 129, 0.3);
}

.send-btn--active:hover {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.send-btn--active:active {
  transform: scale(0.97);
}

.send-btn .material-icons-round {
  font-size: 20px;
}

.input-hint {
  text-align: center;
  font-size: 11.5px;
  color: var(--fg-muted);
  margin-top: 8px;
  opacity: 0.6;
}

/* ====== 响应式 ====== */
@media (max-width: 640px) {
  .input-bar {
    padding: 12px 16px 8px;
  }

  .input-field {
    font-size: 14px;
  }
}
</style>