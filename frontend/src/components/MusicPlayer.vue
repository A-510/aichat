<template>
  <div class="music-wrapper" @mouseenter="showPanel = true" @mouseleave="showPanel = false">
    <!-- 真实的音频标签 (隐藏) -->
    <audio ref="audioRef" :src="playlist[currentIndex].src" preload="auto" @ended="nextTrack"></audio>

    <!-- 左下角的触发圆点 -->
    <div class="music-trigger">
      <span v-if="isPlaying" class="material-icons-round icon-spin">music_note</span>
      <span v-else class="material-icons-round">pause_circle_outline</span>
    </div>

    <!-- 展开的小胶囊面板 -->
    <div class="music-capsule" :class="{ 'is-show': showPanel }">
      <!-- 歌曲名称 (超出会滚动) -->
      <div class="song-name">{{ playlist[currentIndex].name }}</div>

      <!-- 控制按钮组 -->
      <div class="controls">
        <button @click.stop="prevTrack" class="ctrl-btn" title="上一首">
          <span class="material-icons-round">skip_previous</span>
        </button>
        <button @click.stop="togglePlay" class="ctrl-btn play-btn" :title="isPlaying ? '暂停' : '播放'">
          <span class="material-icons-round">{{ isPlaying ? 'pause' : 'play_arrow' }}</span>
        </button>
        <button @click.stop="nextTrack" class="ctrl-btn" title="下一首">
          <span class="material-icons-round">skip_next</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

// ================= 配置区域 =================
// 注意：这里的 src 建议你把mp3文件放进 public/music/ 文件夹，直接用 '/music/xxx.mp3' 引用
// 这里我暂时写了3个免费的测试在线音乐链接，你可以替换成你自己的本地路径
const playlist = ref([
  { name: '忍 - さくら、Reincarnation -Arrange-', src: '/music/忍 - さくら、Reincarnation -Arrange-.mp3' },
  { name: '舞い上がる因果交流のひかり', src: '/music/舞い上がる因果交流のひかり.mp3' },
  { name: '鈴湯 - 終わらない物語', src: '/music/鈴湯 - 終わらない物語.mp3' }
]);
// ============================================

const audioRef = ref(null);
const currentIndex = ref(0);
const isPlaying = ref(false);
const showPanel = ref(false);

/** 播放/暂停 */
const togglePlay = () => {
  if (!audioRef.value) return;
  if (isPlaying.value) {
    audioRef.value.pause();
  } else {
    audioRef.value.play().catch(err => console.log('音频播放被浏览器阻止:', err));
  }
  isPlaying.value = !isPlaying.value;
};

/** 切换歌曲核心逻辑 */
const loadAndPlay = (index) => {
  if (!audioRef.value) return;
  isPlaying.value = false;
  currentIndex.value = index;
  // Vue 更新 DOM 需要 tick，确保 src 改变了再 play
  setTimeout(() => {
    audioRef.value.load();
    audioRef.value.play().then(() => {
      isPlaying.value = true;
    }).catch(err => console.log('自动播放被阻止，请点击播放按钮'));
  }, 50);
};

const prevTrack = () => {
  let newIndex = currentIndex.value - 1;
  if (newIndex < 0) newIndex = playlist.value.length - 1;
  loadAndPlay(newIndex);
};

const nextTrack = () => {
  let newIndex = currentIndex.value + 1;
  if (newIndex >= playlist.value.length) newIndex = 0;
  loadAndPlay(newIndex);
};
</script>

<style scoped>
/* ===== 容器布局 ===== */
.music-wrapper {
  position: fixed;
  bottom: 24px;
  left: 24px;
  display: flex;
  align-items: center;
  gap: 0; 
  z-index: 9999; /* 确保在最顶层 */
  flex-direction: row-reverse; /* 让胶囊在左边，触发器在右边贴边 */
}

/* ===== 触发小圆点 ===== */
.music-trigger {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.music-trigger:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.music-trigger .material-icons-round {
  font-size: 22px;
}

/* 旋转动画 */
.icon-spin {
  animation: spin 3s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ===== 胶囊面板 ===== */
.music-capsule {
  width: 0;
  overflow: hidden;
  background: rgba(30, 30, 35, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  display: flex;
  align-items: center;
  padding: 0;
  margin-right: -10px; /* 默认隐藏在圆点底下 */
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}

/* 鼠标移入展开 */
.music-capsule.is-show {
  width: 220px;
  padding: 8px 12px 8px 16px;
  margin-right: 10px;
  opacity: 1;
}

/* ===== 歌曲名 ===== */
.song-name {
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  margin-right: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
}

/* ===== 控制按钮 ===== */
.controls {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.ctrl-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.ctrl-btn .material-icons-round {
  font-size: 20px;
}

.play-btn {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 4px;
}

.play-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}
</style>