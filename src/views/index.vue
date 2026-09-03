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
  </a-watermark>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppBreadcrumb from '@/layouts/AppBreadcrumb.vue'
import AppHeader from '@/layouts/AppHeader.vue'
import AppSidebar from '@/layouts/AppSidebar.vue'
import { useSystemConfigStore } from '@/stores/modules/config'
import { userStore } from '@/stores/modules/user'

const collapsed = ref(false)
const configStore = useSystemConfigStore()
const userState = userStore()

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
</style>
