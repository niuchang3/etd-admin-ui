<template>
  <!-- 通用面板标题栏，可选显示元数据和右侧操作。 -->
  <div class="panel-header">
    <div>
      <strong>{{ title }}</strong>
      <span v-if="meta">{{ meta }}</span>
    </div>
    <div class="panel-actions"><slot /></div>
  </div>
</template>

<script setup lang="ts">
// 面板标题和辅助信息。
defineProps<{
  title: string
  meta?: string
}>()
</script>

<style scoped>
/* 面板头使用固定高度与底部分隔线。 */
.panel-header {
  display: flex;
  height: 40px;
  align-items: center;
  justify-content: space-between;
  gap: var(--du-space-3);
  padding: 0 var(--du-space-3);
  border-bottom: 1px solid var(--du-border);
}

.panel-header > div,
.panel-actions {
  display: flex;
  align-items: center;
  gap: var(--du-space-2);
}

strong {
  font-size: 12px;
  font-weight: 650;
}

span {
  color: var(--du-text-muted);
  font-size: 10px;
}
</style>
