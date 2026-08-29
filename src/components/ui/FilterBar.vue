<template>
  <!-- 统一容纳搜索、筛选和表格工具按钮。 -->
  <div class="filter-bar du-panel">
    <div class="filter-main"><slot /></div>
    <div class="filter-actions"><slot name="actions" /></div>
  </div>
</template>

<style scoped>
/* 筛选条左右分区布局。 */
.filter-bar,
.filter-main,
.filter-actions {
  display: flex;
  align-items: center;
}

/* 与下方数据面板无缝连接。 */
.filter-bar {
  min-height: 48px;
  justify-content: space-between;
  gap: var(--du-space-3);
  padding: var(--du-space-2) var(--du-space-3);
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}

.filter-main,
.filter-actions {
  gap: var(--du-space-2);
}

.filter-main {
  min-width: 0;
  flex: 1;
}
</style>
