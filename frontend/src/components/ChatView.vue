<!-- frontend/src/components/ChatView.vue -->
<template>
  <div class="app-container">
    <!-- 背景装饰层 -->
    <div class="bg-layer">
      <div class="bg-image"></div>
      <div class="bg-orb bg-orb-1"></div>
      <div class="bg-orb bg-orb-2"></div>
      <div class="bg-orb bg-orb-3"></div>
      <div class="bg-grid"></div>
    </div>

    <!-- 主聊天窗口 -->
    <main class="chat-window">
      <!-- 顶部标题栏 -->
      <header class="chat-header">
        <div class="header-left">
          <div class="status-dot"></div>
          <h1 class="header-title">{{ botName }}</h1>
        </div>
        <div class="header-right">
          <!-- 用户信息区域（可点击展开菜单） -->
          <div class="user-info" ref="userInfoRef" @click="showUserMenu = !showUserMenu">
            <div class="user-avatar-small">
              <img v-if="userAvatar" :src="userAvatar" alt="头像" />
              <span v-else class="material-icons-round">person</span>
            </div>
            <span class="user-display-name">{{ displayName }}</span>
            <span class="material-icons-round arrow-icon" :class="{ rotated: showUserMenu }">expand_more</span>

            <!-- 下拉菜单 -->
            <Transition name="dropdown">
              <div v-if="showUserMenu" class="user-dropdown">
                <div class="dropdown-item" @click.stop="openProfile">
                  <span class="material-icons-round">settings</span>
                  资料设置
                </div>
                <div class="dropdown-divider"></div>
                <div class="dropdown-item logout" @click.stop="handleLogout">
                  <span class="material-icons-round">logout</span>
                  退出登录
                </div>
              </div>
            </Transition>
          </div>

          <button class="header-btn" @click="clearChat" title="清空对话">
            <span class="material-icons-round">delete_outline</span>
          </button>
        </div>
      </header>

      <!-- 消息列表区域 -->
      <div class="chat-body" ref="chatBodyRef">
        <WelcomePanel
          v-if="messages.length === 0"
          :welcome-text="welcomeText"
          :quick-actions="quickActions"
          @send="handleQuickSend"
        />

        <div class="messages-list">
          <ChatMessage
            v-for="msg in messages"
            :key="msg.id"
            :role="msg.role"
            :content="msg.content"
            :is-loading="msg.isLoading"
            :is-streaming="msg.isStreaming"
            :user-avatar="userAvatar"
          />
        </div>
      </div>

      <!-- 底部输入栏 -->
      <InputBar
        :disabled="isGenerating"
        @send="handleSend"
      />
    </main>

    <div id="live2d-container"></div>
    <MusicPlayer />

    <!-- 资料设置弹窗 -->
    <ProfileModal
      :visible="showProfile"
      @close="showProfile = false"
      @updated="handleProfileUpdated"
    />
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import WelcomePanel from './WelcomePanel.vue'
import ChatMessage from './ChatMessage.vue'
import InputBar from './InputBar.vue'
import MusicPlayer from './MusicPlayer.vue'
import ProfileModal from './ProfileModal.vue'

const router = useRouter()

// ==========================================
// 用户相关
// ==========================================
const userAvatar = ref(null)
const userNickname = ref('')
const showUserMenu = ref(false)
const showProfile = ref(false)
const userInfoRef = ref(null)

// 显示名称优先级：昵称 > 用户名 > 默认
const displayName = computed(() => {
  return userNickname.value
    || localStorage.getItem('nickname')
    || localStorage.getItem('username')
    || '用户'
})

// 页面加载时读取本地存储
onMounted(() => {
  userNickname.value = localStorage.getItem('nickname') || localStorage.getItem('username') || ''
  userAvatar.value = localStorage.getItem('avatar') || null
})

// 点击页面其他地方关闭下拉菜单
const handleClickOutside = (e) => {
  if (userInfoRef.value && !userInfoRef.value.contains(e.target)) {
    showUserMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 打开资料设置
const openProfile = () => {
  showUserMenu.value = false
  showProfile.value = true
}

// 资料更新回调
const handleProfileUpdated = ({ nickname, avatar }) => {
  if (nickname) {
    userNickname.value = nickname
    localStorage.setItem('nickname', nickname)
  }
  if (avatar) {
    userAvatar.value = avatar
    localStorage.setItem('avatar', avatar)
  }
  showProfile.value = false
}

// 退出登录
const handleLogout = () => {
  showUserMenu.value = false
  if (confirm('确定要退出登录吗？')) {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('nickname')
    localStorage.removeItem('avatar')
    router.push('/login')
  }
}

// ==========================================
// 聊天相关
// ==========================================
const botName = ref("ATRI教育助手")
const messages = ref([])
const isGenerating = ref(false)
const chatBodyRef = ref(null)
const welcomeText = "你好，我是AI助手，有什么可以帮你的吗？"
const quickActions = ref([
  { text: "写一首诗", value: "请帮我写一首关于春天的诗" },
  { text: "讲个笑话", value: "给我讲个有趣的笑话" }
])

const scrollToBottom = async () => {
  await nextTick()
  if (chatBodyRef.value) {
    chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
  }
}

const clearChat = () => {
  messages.value = []
}

const handleQuickSend = (text) => {
  handleSend(text)
}

// 在 <script setup> 中，找到 handleSend 函数，整个替换为：

const API_URL = import.meta.env.VITE_API_URL || ''

// 会话状态
const sessionId = ref('')
const terminalId = ref('')

const handleSend = async (text) => {
  if (!text?.trim() || isGenerating.value) return

  // 添加用户消息
  messages.value.push({
    id: Date.now(),
    role: 'user',
    content: text.trim()
  })
  await scrollToBottom()

  // 添加AI消息占位
  const aiMsgId = Date.now() + 1
  messages.value.push({
    id: aiMsgId,
    role: 'assistant',
    content: '',
    isLoading: true,
    isStreaming: false
  })
  isGenerating.value = true
  await scrollToBottom()

  try {
    // 调用后端流式接口
    const response = await fetch(API_URL + '/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text.trim(),
        sessionId: sessionId.value,
        terminalId: terminalId.value
      })
    })

    if (!response.ok) {
      throw new Error('请求失败: ' + response.status)
    }

    const targetMsg = messages.value.find(m => m.id === aiMsgId)
    if (!targetMsg) return

    targetMsg.isLoading = false
    targetMsg.isStreaming = true

    // 读取 SSE 流
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()

        if (!trimmed || trimmed.startsWith('event:')) continue

        if (trimmed === 'data: [DONE]') {
          // 流结束
          continue
        }

        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.slice(5).trim()
          if (!jsonStr || jsonStr === '[DONE]') continue

          try {
            const data = JSON.parse(jsonStr)

            // 提取回复文本（根据腾讯云智能体返回格式）
            // 格式1: choices[0].delta.content（流式）
            // 格式2: choices[0].message.content（非流式）
            // 格式3: Response.Reply（腾讯云旧格式）
            const delta = data.choices?.[0]?.delta?.content
              || data.choices?.[0]?.message?.content
              || data.Response?.Reply
              || data.reply
              || ''

            if (delta) {
              targetMsg.content += delta
              await scrollToBottom()
            }

            // 保存 sessionId
            if (data.session_id) {
              sessionId.value = data.session_id
            }
            if (data.Response?.SessionId) {
              sessionId.value = data.Response.SessionId
            }

          } catch (e) {
            // 非JSON数据，可能是纯文本，直接追加
            if (jsonStr && jsonStr !== '[DONE]') {
              targetMsg.content += jsonStr
              await scrollToBottom()
            }
          }
        }
      }
    }

    // 流结束
    targetMsg.isStreaming = false

    // 如果流式没拿到内容，降级用非流式接口
    if (!targetMsg.content) {
      targetMsg.isLoading = true
      targetMsg.isStreaming = false

      const fallbackRes = await fetch(API_URL + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          sessionId: sessionId.value,
          terminalId: terminalId.value
        })
      })

      const fallbackData = await fallbackRes.json()
      targetMsg.isLoading = false
      targetMsg.content = fallbackData.reply || '抱歉，暂时无法回复'

      if (fallbackData.sessionId) {
        sessionId.value = fallbackData.sessionId
      }
      if (fallbackData.terminalId) {
        terminalId.value = fallbackData.terminalId
      }
    }

  } catch (err) {
    console.error('聊天请求失败:', err)
    const targetMsg = messages.value.find(m => m.id === aiMsgId)
    if (targetMsg) {
      targetMsg.isLoading = false
      targetMsg.isStreaming = false
      targetMsg.content = '网络异常，请检查连接后重试'
    }
  } finally {
    isGenerating.value = false
    await scrollToBottom()
  }
}

// ==========================================
// Live2D 初始化
// ==========================================
import { loadOml2d } from 'oh-my-live2d'

onMounted(async () => {
  try {
    const container = document.getElementById('live2d-container')
    if (!container) return

    await loadOml2d({
      dockedPosition: 'right',
      parentElement: container,
      sayHello: false,
      models: [
        {
          path: '/Kobayaxi/Kobayaxi.model.json',
          scale: 0.12,
          position: [0, 60],
          stageStyle: { height: 350 },
        },
      ],
    })
  } catch (error) {
    console.error("Live2D加载失败:", error)
  }
})
</script>

<style scoped>
/* ===================== 背景装饰 ===================== */
.app-container {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.bg-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.bg-image {
  position: absolute;
  inset: 0;
  background-image: url('/bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.25;
  z-index: 1;
}

.bg-orb-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.4), transparent 70%);
  top: -200px;
  right: -100px;
  animation: orbFloat1 18s ease-in-out infinite;
}

.bg-orb-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.3), transparent 70%);
  bottom: -150px;
  left: -100px;
  animation: orbFloat2 22s ease-in-out infinite;
}

.bg-orb-3 {
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.2), transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: orbFloat3 15s ease-in-out infinite;
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
  background-size: 60px 60px;
  z-index: 1;
}

@keyframes orbFloat1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-40px, 30px) scale(1.05); }
  66% { transform: translate(20px, -20px) scale(0.95); }
}
@keyframes orbFloat2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -40px) scale(1.08); }
  66% { transform: translate(-20px, 20px) scale(0.92); }
}
@keyframes orbFloat3 {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.2; }
  50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.35; }
}

/* ===================== 聊天窗口 ===================== */
.chat-window {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  max-width: 820px;
  width: 92%;
  height: 90%;
  margin: 5vh auto;
  background: var(--bg-card);
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card), var(--shadow-glow);
  overflow: hidden;
}

/* ===================== 顶部栏 ===================== */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.15);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
  animation: dotPulse 2s ease-in-out infinite;
}

@keyframes dotPulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(16, 185, 129, 0.5); }
  50% { opacity: 0.6; box-shadow: 0 0 4px rgba(16, 185, 129, 0.3); }
}

.header-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: 0.3px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ===================== 用户信息区域 ===================== */
.user-info {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
  user-select: none;
}

.user-info:hover {
  background: rgba(255, 255, 255, 0.06);
}

.user-avatar-small {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #1e3a5f, #0f172a);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(16, 185, 129, 0.3);
  flex-shrink: 0;
}

.user-avatar-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar-small .material-icons-round {
  font-size: 18px;
  color: #475569;
}

.user-display-name {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow-icon {
  font-size: 18px;
  color: #64748b;
  transition: transform 0.25s ease;
}

.arrow-icon.rotated {
  transform: rotate(180deg);
}

/* ===================== 下拉菜单 ===================== */
.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 170px;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 6px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
  z-index: 200;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  color: #cbd5e1;
  cursor: pointer;
  transition: all 0.15s;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #f1f5f9;
}

.dropdown-item .material-icons-round {
  font-size: 18px;
  color: #64748b;
}

.dropdown-item:hover .material-icons-round {
  color: #10b981;
}

.dropdown-item.logout:hover {
  color: #fca5a5;
}

.dropdown-item.logout:hover .material-icons-round {
  color: #ef4444;
}

.dropdown-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 4px 8px;
}

/* ===================== 下拉动画 ===================== */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}

/* ===================== 清空按钮 ===================== */
.header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--fg-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.header-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--fg);
}

.header-btn .material-icons-round {
  font-size: 20px;
}

/* ===================== 消息区域 ===================== */
.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  scroll-behavior: smooth;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ===================== Live2D 容器 ===================== */
#live2d-container {
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 999;
  width: 300px;
  height: 400px;
  pointer-events: none;
}

#live2d-container :deep(canvas) {
  pointer-events: auto;
}

/* ===================== 响应式 ===================== */
@media (max-width: 640px) {
  .chat-window {
    width: 100%;
    height: 100%;
    margin: 0;
    border-radius: 0;
  }

  .chat-header {
    padding: 12px 16px;
  }

  .chat-body {
    padding: 16px;
  }

  .user-display-name {
    display: none;
  }

  .arrow-icon {
    display: none;
  }

  #live2d-container {
    width: 200px;
    height: 280px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bg-orb, .status-dot {
    animation: none;
  }
}
</style>