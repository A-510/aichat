<!-- frontend/src/components/ProfileModal.vue -->
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="close">
        <div class="modal-card">
          <!-- 顶部 -->
          <div class="modal-header">
            <h2>个人资料设置</h2>
            <button class="close-btn" @click="close">
              <span class="material-icons-round">close</span>
            </button>
          </div>

          <!-- 头像区 -->
          <div class="avatar-section">
            <div class="avatar-wrapper" @click="triggerFileInput">
              <img
                v-if="avatarPreview"
                :src="avatarPreview"
                alt="头像"
                class="avatar-img"
              />
              <div v-else class="avatar-placeholder">
                <span class="material-icons-round">person</span>
              </div>
              <div class="avatar-overlay">
                <span class="material-icons-round">camera_alt</span>
                <span class="overlay-text">更换头像</span>
              </div>
            </div>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              style="display: none"
              @change="handleFileChange"
            />
            <p class="avatar-hint">点击头像更换，支持 jpg/png/gif/webp，最大 5MB</p>
          </div>

          <!-- 昵称区 -->
          <div class="form-section">
            <label class="form-label">昵称</label>
            <div class="input-row">
              <input
                v-model="nicknameInput"
                type="text"
                placeholder="输入你的昵称"
                maxlength="20"
                class="nickname-input"
              />
              <span class="char-count">{{ nicknameInput.length }}/20</span>
            </div>
          </div>

          <!-- 用户名（只读） -->
          <div class="form-section">
            <label class="form-label">用户名</label>
            <div class="readonly-field">{{ username }}</div>
          </div>

          <!-- 提示信息 -->
          <Transition name="fade">
            <div v-if="message" :class="['toast', messageType]">
              <span class="material-icons-round">
                {{ messageType === 'success' ? 'check_circle' : 'error' }}
              </span>
              {{ message }}
            </div>
          </Transition>

          <!-- 操作按钮 -->
          <div class="modal-actions">
            <button class="btn-cancel" @click="close">取消</button>
            <button class="btn-save" :disabled="saving" @click="saveProfile">
              <span v-if="saving" class="spinner"></span>
              <span v-else>保存修改</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import axios from 'axios'

const props = defineProps({
  visible: Boolean
})

const emit = defineEmits(['close', 'updated'])

// ★ 修改这两行
const API_URL = import.meta.env.VITE_API_URL || ''
const API_BASE = API_URL + '/api/user'

const username = ref('')
const nicknameInput = ref('')
const avatarPreview = ref(null)
const avatarFile = ref(null)
const fileInputRef = ref(null)
const saving = ref(false)
const message = ref('')
const messageType = ref('success')

// 获取 token
function getToken() {
  return localStorage.getItem('token')
}

function getHeaders() {
  return { Authorization: 'Bearer ' + getToken() }
}

// 弹窗打开时加载资料
watch(() => props.visible, async (val) => {
  if (val) {
    message.value = ''
    avatarFile.value = null
    await loadProfile()
  }
})

async function loadProfile() {
  try {
    const res = await axios.get(API_BASE + '/profile', {
      headers: getHeaders()
    })
    username.value = res.data.username
    nicknameInput.value = res.data.nickname || res.data.username
    if (res.data.avatar) {
      // ★ 修改这里
      avatarPreview.value = API_URL + res.data.avatar
    } else {
      avatarPreview.value = null
    }
  } catch (err) {
    console.error('加载资料失败:', err)
  }
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileChange(e) {
  const file = e.target.files[0]
  if (!file) return

  if (file.size > 5 * 1024 * 1024) {
    showMessage('图片大小不能超过 5MB', 'error')
    return
  }

  avatarFile.value = file
  // 本地预览
  const reader = new FileReader()
  reader.onload = (ev) => {
    avatarPreview.value = ev.target.result
  }
  reader.readAsDataURL(file)

  // 清空 input 以便重复选同一文件
  e.target.value = ''
}

async function saveProfile() {
  if (!nicknameInput.value.trim()) {
    showMessage('昵称不能为空', 'error')
    return
  }

  saving.value = true
  message.value = ''

  try {
    // 1. 如果有新头像，先上传头像
    let newAvatarUrl = null
    if (avatarFile.value) {
      const formData = new FormData()
      formData.append('avatar', avatarFile.value)

      const avatarRes = await axios.post(API_BASE + '/avatar', formData, {
        headers: {
          ...getHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      })
      newAvatarUrl = avatarRes.data.avatar
    }

    // 2. 更新昵称
    const profileRes = await axios.put(API_BASE + '/profile', {
      nickname: nicknameInput.value.trim()
    }, {
      headers: getHeaders()
    })

    // 3. 更新本地存储
    localStorage.setItem('nickname', nicknameInput.value.trim())
    if (newAvatarUrl) {
      // ★ 修改这里
      localStorage.setItem('avatar', API_URL + newAvatarUrl)
    }

    showMessage('保存成功！', 'success')
    avatarFile.value = null

    // 通知父组件
    setTimeout(() => {
      emit('updated', {
        nickname: nicknameInput.value.trim(),
        avatar: newAvatarUrl
          // ★ 修改这里
          ? API_URL + newAvatarUrl
          : avatarPreview.value
      })
    }, 800)
  } catch (err) {
    const msg = err.response?.data?.message || '保存失败，请重试'
    showMessage(msg, 'error')
  } finally {
    saving.value = false
  }
}

function showMessage(text, type) {
  message.value = text
  messageType.value = type
  if (type === 'success') {
    setTimeout(() => { message.value = '' }, 2000)
  }
}

function close() {
  emit('close')
}
</script>

<style scoped>
/* ========== 遮罩层 ========== */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
}

/* ========== 卡片 ========== */
.modal-card {
  width: 440px;
  max-width: 92vw;
  max-height: 90vh;
  overflow-y: auto;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
}

/* ========== 顶部 ========== */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: #f1f5f9;
}

.close-btn {
  background: rgba(255, 255, 255, 0.06);
  border: none;
  border-radius: 10px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #f1f5f9;
}

/* ========== 头像区域 ========== */
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 28px;
}

.avatar-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  cursor: pointer;
  overflow: hidden;
  border: 3px solid rgba(16, 185, 129, 0.3);
  transition: border-color 0.3s;
}

.avatar-wrapper:hover {
  border-color: #10b981;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1e3a5f, #0f172a);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-placeholder .material-icons-round {
  font-size: 48px;
  color: #475569;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.25s;
}

.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.avatar-overlay .material-icons-round {
  font-size: 24px;
  color: white;
}

.overlay-text {
  font-size: 11px;
  color: white;
  margin-top: 4px;
}

.avatar-hint {
  margin-top: 10px;
  font-size: 12px;
  color: #64748b;
}

/* ========== 表单区 ========== */
.form-section {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 8px;
}

.input-row {
  position: relative;
}

.nickname-input {
  width: 100%;
  padding: 12px 60px 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #f1f5f9;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.nickname-input:focus {
  border-color: rgba(16, 185, 129, 0.5);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.nickname-input::placeholder {
  color: #64748b;
}

.char-count {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: #475569;
}

.readonly-field {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  color: #64748b;
  font-size: 14px;
}

/* ========== 提示消息 ========== */
.toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 16px;
}

.toast.success {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #6ee7b7;
}

.toast.error {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #fca5a5;
}

.toast .material-icons-round {
  font-size: 18px;
}

/* ========== 操作按钮 ========== */
.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.btn-cancel,
.btn-save {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
}

.btn-save {
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  color: white;
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ========== 过渡动画 ========== */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-card {
  transform: scale(0.92) translateY(10px);
  opacity: 0;
}

.modal-leave-to .modal-card {
  transform: scale(0.95);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ========== 滚动条 ========== */
.modal-card::-webkit-scrollbar {
  width: 4px;
}

.modal-card::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}
</style>