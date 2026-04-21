<template>
  <div class="input-bar">
    <!-- ========== 附件预览区 ========== -->
    <div v-if="pendingFiles.length" class="attachments">
      <div
        v-for="(f, i) in pendingFiles"
        :key="i"
        class="att-item"
        :class="{ 'att-item--image': f.type === 'image' }"
      >
        <!-- 图片 -->
        <img v-if="f.type === 'image'" :src="f.previewUrl || f.url" alt="" class="att-thumb" />
        <!-- 文件 -->
        <div v-else class="att-file">
          <span class="material-icons-round att-file-icon">description</span>
          <div class="att-file-info">
            <div class="att-file-name">{{ f.name }}</div>
            <div class="att-file-size">{{ formatSize(f.size) }}</div>
          </div>
        </div>

        <!-- 上传中遮罩 -->
        <div v-if="f.uploading" class="att-mask">
          <span class="material-icons-round att-spin">progress_activity</span>
        </div>

        <!-- 删除按钮 -->
        <button
          class="att-remove"
          @click="removeFile(i)"
          :disabled="f.uploading"
          title="移除"
        >
          <span class="material-icons-round">close</span>
        </button>
      </div>
    </div>

    <!-- ========== 输入区 ========== -->
    <div class="input-wrapper">
      <!-- 📎 附件按钮 -->
      <button
        class="attach-btn"
        :disabled="disabled || uploading"
        @click="triggerFile"
        :title="uploading ? '上传中...' : '上传图片或文件'"
      >
        <span class="material-icons-round">attach_file</span>
      </button>
      <input
        ref="fileInputRef"
        type="file"
        multiple
        hidden
        accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.pptx,.md"
        @change="onFilePick"
      />

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
        :title="canSend ? '发送' : '请输入内容或选择文件'"
      >
        <span class="material-icons-round">send</span>
      </button>
    </div>
    <p class="input-hint">按 Enter 发送，Shift + Enter 换行</p>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';

const API_URL = import.meta.env.VITE_API_URL || '';

const props = defineProps({
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['send']);

const inputText = ref('');
const textareaRef = ref(null);
const fileInputRef = ref(null);
const pendingFiles = ref([]); // {name,size,mime,type,url,previewUrl,uploading}

const uploading = computed(function () {
  return pendingFiles.value.some(function (f) { return f.uploading; });
});

const canSend = computed(function () {
  if (props.disabled || uploading.value) return false;
  return inputText.value.trim().length > 0 || pendingFiles.value.length > 0;
});

function triggerFile() {
  if (fileInputRef.value) fileInputRef.value.click();
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

async function onFilePick(e) {
  const files = Array.from(e.target.files || []);
  e.target.value = '';
  for (const file of files) {
    if (file.size > 20 * 1024 * 1024) {
      alert('文件 ' + file.name + ' 超过 20MB');
      continue;
    }
    const isImage = file.type.startsWith('image/');
    const item = {
      name: file.name,
      size: file.size,
      mime: file.type,
      type: isImage ? 'image' : 'file',
      previewUrl: isImage ? URL.createObjectURL(file) : '',
      url: '',
      uploading: true,
    };
    pendingFiles.value.push(item);
    // ✅ 拿到数组里的响应式代理
    const reactiveItem = pendingFiles.value[pendingFiles.value.length - 1];

    try {
      const fd = new FormData();
      fd.append('file', file);
      const token = localStorage.getItem('token') || '';
      const res = await fetch(API_URL + '/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: 'Bearer ' + token } : {},
        body: fd,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      // ✅ 改代理，触发响应式
      reactiveItem.url = data.url;
      reactiveItem.uploading = false;
    } catch (err) {
      console.error('上传失败', err);
      alert('文件 ' + file.name + ' 上传失败');
      const idx = pendingFiles.value.indexOf(reactiveItem);
      if (idx >= 0) pendingFiles.value.splice(idx, 1);
    }
  }
}

function removeFile(i) {
  const f = pendingFiles.value[i];
  if (f && f.previewUrl) URL.revokeObjectURL(f.previewUrl);
  pendingFiles.value.splice(i, 1);
}

function handleSend() {
  if (!canSend.value) return;
  // 只传已成功上传的文件
  const files = pendingFiles.value
    .filter(function (f) { return !f.uploading && f.url; })
    .map(function (f) {
      return {
        name: f.name,
        size: f.size,
        mime: f.mime,
        type: f.type,
        url: f.url,
      };
    });

  emit('send', {
    text: inputText.value,
    files: files,
  });

  inputText.value = '';
  pendingFiles.value = [];
  nextTick(function () {
    resetHeight();
  });
}

function handleEnter(e) {
  if (e.shiftKey) return;
  e.preventDefault();
  handleSend();
}

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

/* ===== 附件预览 ===== */
.attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.att-item {
  position: relative;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.att-item--image {
  width: 64px;
  height: 64px;
}
.att-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.att-file {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 28px 8px 10px;
  min-width: 160px;
  max-width: 240px;
}
.att-file-icon {
  font-size: 22px;
  color: var(--accent);
  flex-shrink: 0;
}
.att-file-info {
  flex: 1;
  min-width: 0;
}
.att-file-name {
  font-size: 12.5px;
  color: var(--fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.att-file-size {
  font-size: 11px;
  color: var(--fg-muted);
  margin-top: 2px;
}
.att-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.65);
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}
.att-remove:hover:not(:disabled) { background: rgba(0, 0, 0, 0.85); }
.att-remove:disabled { opacity: 0.5; cursor: not-allowed; }
.att-remove .material-icons-round { font-size: 12px; }
.att-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.att-spin {
  font-size: 22px;
  animation: attSpin 1s linear infinite;
}
@keyframes attSpin { to { transform: rotate(360deg); } }

/* ===== 输入区 ===== */
.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 6px 6px 6px 8px;
  transition: border-color var(--transition-normal), box-shadow var(--transition-normal);
}

.input-wrapper:focus-within {
  border-color: var(--border-active);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.08);
}

.attach-btn {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--fg-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-normal);
}
.attach-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
  color: var(--accent);
}
.attach-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.attach-btn .material-icons-round { font-size: 20px; }

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

.input-field::placeholder { color: var(--fg-muted); }
.input-field:disabled { opacity: 0.5; cursor: not-allowed; }

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
.send-btn--active:active { transform: scale(0.97); }
.send-btn .material-icons-round { font-size: 20px; }

.input-hint {
  text-align: center;
  font-size: 11.5px;
  color: var(--fg-muted);
  margin-top: 8px;
  opacity: 0.6;
}

@media (max-width: 640px) {
  .input-bar { padding: 12px 16px 8px; }
  .input-field { font-size: 14px; }
}
</style>