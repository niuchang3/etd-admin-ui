<template>
  <!-- 未实现业务模块的统一占位页面，后续可直接替换对应路由组件。 -->
  <section>
    <PageHeader section="ETD Console" :title="title" :description="description" />
    <div class="placeholder-panel du-panel">
      <ToolOutlined />
      <strong>{{ title }}正在搭建</strong>
      <span>当前应用外壳、导航和基础组件已经可以直接复用。</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ToolOutlined } from '@ant-design/icons-vue'
import PageHeader from '@/components/ui/PageHeader.vue'

const route = useRoute()
const title = computed(() => String(route.meta.title ?? '功能页面'))
const description = computed(() => String(route.meta.description ?? '该功能将在这里接入。'))
</script>

<style scoped>
/* 占位区域维持与管理页面一致的边框和紧凑间距。 */
.placeholder-panel {
  display: grid;
  min-height: 320px;
  place-items: center;
  align-content: center;
  gap: var(--du-space-2);
  color: var(--du-text-muted);
}

.placeholder-panel :deep(.anticon) {
  margin-bottom: var(--du-space-2);
  font-size: 28px;
}

.placeholder-panel strong {
  color: var(--du-text);
  font-size: 14px;
}

.placeholder-panel span {
  font-size: 11px;
}
</style>
