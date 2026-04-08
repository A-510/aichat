<template>
  <div class="welcome-panel">
    <div class="welcome-icon">
      <span class="material-icons-round">school</span>
    </div>
    <h2 class="welcome-title">{{ botName }}</h2>
    <p class="welcome-text">{{ welcomeText }}</p>

    <!-- 五个快捷按钮 -->
    <div class="quick-actions">
      <button
        v-for="action in quickActions"
        :key="action.id"
        class="quick-btn"
        @click="$emit('send', action.text)"
      >
        <span class="material-icons-round quick-btn-icon">{{ action.icon }}</span>
        <span class="quick-btn-text">{{ action.text }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  welcomeText: { type: String, default: '' },
  quickActions: { type: Array, default: function () { return []; } },
});

// botName 从 App.vue 注入或直接用
const botName = '教育智能体';

defineEmits(['send']);
</script>

<style scoped>
.welcome-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 20px 20px;
  animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

.welcome-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--accent-dim);
  border: 1px solid rgba(16, 185, 129, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.welcome-icon .material-icons-round {
  font-size: 30px;
  color: var(--accent);
}

.welcome-title {
  font-size: 22px;
  font-weight: 900;
  color: var(--fg);
  margin-bottom: 10px;
  letter-spacing: 0.5px;
}

.welcome-text {
  font-size: 14.5px;
  color: var(--fg-secondary);
  max-width: 400px;
  line-height: 1.6;
  margin-bottom: 32px;
}

/* ====== 快捷按钮 ====== */
.quick-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  max-width: 600px;
  width: 100%;
}

.quick-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  border-radius: 100px;
  color: var(--fg-secondary);
  font-size: 13.5px;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition-normal);
  white-space: nowrap;
}

.quick-btn:hover {
  background: var(--accent-dim);
  border-color: var(--border-active);
  color: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.1);
}

.quick-btn:active {
  transform: translateY(0);
}

.quick-btn-icon {
  font-size: 18px;
  color: var(--accent);
  opacity: 0.7;
  transition: opacity var(--transition-fast);
}

.quick-btn:hover .quick-btn-icon {
  opacity: 1;
}

.quick-btn-text {
  font-weight: 500;
}

/* ====== 响应式 ====== */
@media (max-width: 640px) {
  .welcome-panel {
    padding: 24px 16px 16px;
  }

  .welcome-title {
    font-size: 18px;
  }

  .quick-btn {
    padding: 8px 14px;
    font-size: 12.5px;
  }

  .quick-btn-icon {
    font-size: 16px;
  }
}
</style>