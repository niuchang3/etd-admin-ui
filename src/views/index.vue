<template>
  <!-- 管理平台主页面负责组合侧边导航、顶栏和业务内容区。 -->
  <div class="app-shell">
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
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppBreadcrumb from '@/layouts/AppBreadcrumb.vue'
import AppHeader from '@/layouts/AppHeader.vue'
import AppSidebar from '@/layouts/AppSidebar.vue'

const collapsed = ref(false)
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
