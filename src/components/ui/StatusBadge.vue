<template>
  <!-- 通过色点与文字双重表达当前业务状态。 -->
  <span class="status" :class="`status--${tone}`">
    <span class="dot" />
    <slot />
  </span>
</template>

<script setup lang="ts">
// 默认使用中性状态，业务可指定其他语义色。
withDefaults(defineProps<{
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
}>(), {
  tone: 'neutral',
})
</script>

<style scoped>
/* 状态标签的通用外观。 */
.status {
  display: inline-flex;
  height: 20px;
  align-items: center;
  gap: 5px;
  padding: 0 7px;
  color: #566073;
  border: 1px solid #d9dee8;
  border-radius: 10px;
  background: #f6f7f9;
  font-size: 10px;
  font-weight: 650;
  line-height: 18px;
  white-space: nowrap;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #7d8798;
}

/* 信息、成功、警告和错误的语义配色。 */
.status--info { color: #1d4f9f; border-color: #bdd0f3; background: #eef4ff; }
.status--info .dot { background: #2563eb; }
.status--success { color: #166534; border-color: #b8dec4; background: #eef9f1; }
.status--success .dot { background: #159447; }
.status--warning { color: #92400e; border-color: #ead1a9; background: #fff8e9; }
.status--warning .dot { background: #d97706; }
.status--danger { color: #991b1b; border-color: #e9bcbc; background: #fff1f1; }
.status--danger .dot { background: #c62d2d; }
</style>
