<template>
  <!-- 管理平台主页面负责组合侧边导航、顶栏和业务内容区，支持全局合规水印。 -->
  <a-watermark
    :content="watermarkContent"
    :font="watermarkFont"
    :gap="[120, 120]"
    class="app-shell"
  >
    <!-- 侧边栏 -->
    <AppSidebar :collapsed="collapsed" @toggle="collapsed = !collapsed" />
    <div class="app-main">
      <!-- 顶部工具栏。 -->
      <AppHeader />
      <main class="app-content">
        <!-- 所有子路由共用同一个动态面包屑。 -->
        <AppBreadcrumb />
        <!-- 子路由页面统一渲染在应用外壳内部。 -->
        <router-view />
      </main>
    </div>

    <!-- 右下角常驻全局 AI 浮层气泡（不受菜单与页面切换影响） -->
    <a-tooltip title="AI 助手工作台" placement="left">
      <div
        class="global-ai-float-bubble"
        role="button"
        tabindex="0"
        aria-label="打开 AI 助手工作台"
        @click="handleOpenChat"
      >
        <div class="bubble-ambient-glow"></div>
        <div class="bubble-crystal-surface">
          <svg
            class="ai-sparkle-svg"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="aiSparkleMain" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#2563eb" />
                <stop offset="55%" stop-color="#7c3aed" />
                <stop offset="100%" stop-color="#ec4899" />
              </linearGradient>
              <linearGradient id="aiSparkleSub" x1="14" y1="2" x2="22" y2="10" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#38bdf8" />
                <stop offset="100%" stop-color="#a855f7" />
              </linearGradient>
            </defs>
            <!-- 主星芒：流线四角星 -->
            <path
              d="M11.5 2C11.5 7.25 7.25 11.5 2 11.5C7.25 11.5 11.5 15.75 11.5 21C11.5 15.75 15.75 11.5 21 11.5C15.75 11.5 11.5 7.25 11.5 2Z"
              fill="url(#aiSparkleMain)"
            />
            <!-- 伴随微星 -->
            <path
              d="M18.5 2C18.5 4.2 16.7 6 14.5 6C16.7 6 18.5 7.8 18.5 10C18.5 7.8 20.3 6 22.5 6C20.3 6 18.5 4.2 18.5 2Z"
              fill="url(#aiSparkleSub)"
            />
          </svg>
        </div>
      </div>
    </a-tooltip>
  </a-watermark>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppBreadcrumb from '@/layouts/AppBreadcrumb.vue'
import AppHeader from '@/layouts/AppHeader.vue'
import AppSidebar from '@/layouts/AppSidebar.vue'
import { useSystemConfigStore } from '@/stores/modules/config'
import { userStore } from '@/stores/modules/user'

const router = useRouter()
const collapsed = ref(false)
const configStore = useSystemConfigStore()
const userState = userStore()

const handleOpenChat = () => {
  router.push('/chat')
}

/**
 * 动态水印内容：组合展示系统平台名称与当前操作人员，层次丰富自然
 */
const watermarkContent = computed<string | string[]>(() => {
  if (!configStore.branding.watermark?.enabled) {
    return ''
  }
  const systemName = configStore.branding.name || 'ETD Console'
  const userName = userState.userInfo?.userName || userState.userInfo?.nickName || ''

  if (systemName && userName) {
    return [systemName, userName]
  }
  return systemName || userName || ''
})

/**
 * 动态水印字体与透明度
 */
const watermarkFont = computed(() => {
  const opacity = configStore.branding.watermark?.opacity ?? 0.15
  const fontSize = configStore.branding.watermark?.fontSize || 14
  return {
    fontSize,
    color: `rgba(0, 0, 0, ${opacity})`,
  }
})

onMounted(() => {
  if (!configStore.isLoaded) {
    void configStore.fetchConfigs()
  }
})
</script>

<style scoped>
/* 根布局横向排列导航与主内容。 */
.app-shell {
  display: flex;
  width: 100%;
  height: 100vh;
  background: var(--du-bg-app);
}

.app-main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

/* 只让内容区滚动，顶栏和导航保持固定。 */
.app-content {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: var(--du-space-4);
}

/* 右下角常驻全局 AI 浮层气泡（现代极简星辉微晶球） */
.global-ai-float-bubble {
  position: fixed;
  right: 28px;
  bottom: 28px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  cursor: pointer;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.28s ease;
  user-select: none;
}

.global-ai-float-bubble:hover {
  transform: translateY(-3px) scale(1.08);
}

.global-ai-float-bubble:active {
  transform: translateY(0) scale(0.96);
}

/* 环境背景微光光晕（柔和弥散，不突兀） */
.bubble-ambient-glow {
  position: absolute;
  top: -3px;
  left: -3px;
  right: -3px;
  bottom: -3px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.25), rgba(124, 58, 237, 0.25), rgba(236, 72, 153, 0.2));
  filter: blur(6px);
  opacity: 0.7;
  transition: opacity 0.3s ease, filter 0.3s ease;
  pointer-events: none;
}

.global-ai-float-bubble:hover .bubble-ambient-glow {
  opacity: 1;
  filter: blur(8px);
}

/* 晶体白瓷质感外壳 */
.bubble-crystal-surface {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow:
    0 10px 24px -4px rgba(37, 99, 235, 0.2),
    0 4px 10px -2px rgba(15, 23, 42, 0.06),
    inset 0 1px 1px rgba(255, 255, 255, 0.8);
  overflow: hidden;
}

/* 矢量星芒图标与微动效 */
.ai-sparkle-svg {
  width: 24px;
  height: 24px;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  filter: drop-shadow(0 2px 4px rgba(124, 58, 237, 0.25));
}

.global-ai-float-bubble:hover .ai-sparkle-svg {
  transform: rotate(12deg) scale(1.1);
}
</style>
