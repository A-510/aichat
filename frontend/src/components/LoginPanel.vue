<!-- frontend/src/components/LoginPanel.vue -->
<template>
  <div class="login-page">
    <!-- 背景 -->
    <div class="bg-layer">
      <div class="bg-image"></div>
      <div class="bg-orb bg-orb-1"></div>
      <div class="bg-orb bg-orb-2"></div>
    </div>

    <!-- 登录卡片 -->
    <div class="login-card">
      <div class="card-header">
        <div class="logo-dot"></div>
        <h1>ATRI 教育助手</h1>
        <p class="subtitle">{{ isRegister ? '创建新账号' : '登录你的账号' }}</p>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMsg" class="error-toast">
        <span class="material-icons-round">error_outline</span>
        {{ errorMsg }}
      </div>

      <!-- 成功提示 -->
      <div v-if="successMsg" class="success-toast">
        <span class="material-icons-round">check_circle_outline</span>
        {{ successMsg }}
      </div>

      <!-- 表单 -->
      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="input-group">
          <span class="material-icons-round input-icon">person_outline</span>
          <input
            v-model="username"
            type="text"
            placeholder="请输入用户名"
            required
            autocomplete="username"
          />
        </div>

        <div class="input-group">
          <span class="material-icons-round input-icon">lock_outline</span>
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="请输入密码"
            required
            autocomplete="current-password"
          />
          <button type="button" class="toggle-pwd" @click="showPassword = !showPassword">
            <span class="material-icons-round">
              {{ showPassword ? 'visibility_off' : 'visibility' }}
            </span>
          </button>
        </div>

        <!-- 注册时需要确认密码 -->
        <div v-if="isRegister" class="input-group">
          <span class="material-icons-round input-icon">lock_outline</span>
          <input
            v-model="confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            placeholder="请确认密码"
            required
          />
        </div>

        <button type="submit" class="submit-btn" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          <span v-else>{{ isRegister ? '注 册' : '登 录' }}</span>
        </button>
      </form>

      <!-- 切换登录/注册 -->
      <div class="switch-mode">
        <span>{{ isRegister ? '已有账号？' : '没有账号？' }}</span>
        <button @click="toggleMode" class="switch-btn">
          {{ isRegister ? '去登录' : '去注册' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const isRegister = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

// ★ 修改这一行
const API_URL = import.meta.env.VITE_API_URL || ''
const API_BASE = API_URL + '/api/auth'

const toggleMode = () => {
  isRegister.value = !isRegister.value
  errorMsg.value = ''
  successMsg.value = ''
  username.value = ''
  password.value = ''
  confirmPassword.value = ''
}

const handleSubmit = async () => {
  errorMsg.value = ''
  successMsg.value = ''

  // 基础校验
  if (!username.value.trim() || !password.value.trim()) {
    errorMsg.value = '用户名和密码不能为空'
    return
  }

  if (username.value.trim().length < 2) {
    errorMsg.value = '用户名至少2个字符'
    return
  }

  if (password.value.length < 6) {
    errorMsg.value = '密码至少6个字符'
    return
  }

  if (isRegister.value && password.value !== confirmPassword.value) {
    errorMsg.value = '两次输入的密码不一致'
    return
  }

  loading.value = true

  try {
    if (isRegister.value) {
      // 注册
      const res = await axios.post(`${API_BASE}/register`, {
        username: username.value.trim(),
        password: password.value
      })
      successMsg.value = res.data.message || '注册成功，请登录'
      // 注册成功后自动切换到登录
      setTimeout(() => {
        isRegister.value = false
        successMsg.value = ''
        password.value = ''
        confirmPassword.value = ''
      }, 1500)
    } else {
      // 登录
      const res = await axios.post(`${API_BASE}/login`, {
        username: username.value.trim(),
        password: password.value
      })

      // 保存 token 和用户名
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('username', res.data.user.username)

      // 登录后立即拉取用户资料（头像、昵称）
      try {
        // ★ 修改这里
        const profileRes = await axios.get(API_URL + '/api/user/profile', {
          headers: { Authorization: 'Bearer ' + res.data.token }
        })
        if (profileRes.data.nickname) {
          localStorage.setItem('nickname', profileRes.data.nickname)
        }
        if (profileRes.data.avatar) {
          // ★ 修改这里
          localStorage.setItem('avatar', API_URL + profileRes.data.avatar)
        }
      } catch (e) {
        // 资料拉取失败不影响登录
        console.warn('拉取用户资料失败:', e)
      }

      // 跳转到聊天页
      router.push('/chat')
    }
  } catch (err) {
    if (err.response && err.response.data && err.response.data.message) {
      errorMsg.value = err.response.data.message
    } else {
      errorMsg.value = '网络错误，请检查后端是否启动'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

/* ========== 背景 ========== */
.bg-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.bg-image {
  position: absolute;
  inset: 0;
  background-image: url('/bg.png');
  background-size: cover;
  background-position: center;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.3;
}

.bg-orb-1 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.4), transparent 70%);
  top: -150px;
  right: -100px;
  animation: float1 18s ease-in-out infinite;
}

.bg-orb-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.3), transparent 70%);
  bottom: -100px;
  left: -80px;
  animation: float2 22s ease-in-out infinite;
}

@keyframes float1 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-30px, 20px); }
}
@keyframes float2 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(20px, -30px); }
}

/* ========== 登录卡片 ========== */
.login-card {
  position: relative;
  z-index: 1;
  width: 400px;
  max-width: 92vw;
  padding: 40px 36px;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.4),
    0 0 40px rgba(16, 185, 129, 0.05);
}

.card-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.5);
  margin: 0 auto 16px;
}

.card-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 6px;
}

.subtitle {
  font-size: 14px;
  color: #94a3b8;
}

/* ========== 提示框 ========== */
.error-toast,
.success-toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 16px;
  animation: slideDown 0.3s ease;
}

.error-toast {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #fca5a5;
}

.success-toast {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #6ee7b7;
}

.error-toast .material-icons-round,
.success-toast .material-icons-round {
  font-size: 18px;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ========== 表单 ========== */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  font-size: 20px;
  color: #64748b;
  pointer-events: none;
  z-index: 1;
}

.input-group input {
  width: 100%;
  padding: 14px 44px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #f1f5f9;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
}

.input-group input::placeholder {
  color: #64748b;
}

.input-group input:focus {
  border-color: rgba(16, 185, 129, 0.5);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  background: rgba(255, 255, 255, 0.07);
}

.toggle-pwd {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.toggle-pwd:hover {
  color: #94a3b8;
}

.toggle-pwd .material-icons-round {
  font-size: 20px;
}

/* ========== 提交按钮 ========== */
.submit-btn {
  width: 100%;
  padding: 14px;
  margin-top: 4px;
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ========== 加载动画 ========== */
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ========== 切换模式 ========== */
.switch-mode {
  text-align: center;
  margin-top: 24px;
  font-size: 13px;
  color: #94a3b8;
}

.switch-btn {
  background: none;
  border: none;
  color: #10b981;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  margin-left: 4px;
  transition: color 0.2s;
}

.switch-btn:hover {
  color: #34d399;
  text-decoration: underline;
}

/* ========== 响应式 ========== */
@media (max-width: 480px) {
  .login-card {
    padding: 32px 24px;
    border-radius: 16px;
  }
}
</style>