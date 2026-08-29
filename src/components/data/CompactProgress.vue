<template>
  <!-- 适用于表格单元格和配额列表的紧凑进度条。 -->
  <div class="compact-progress" :style="{ '--progress-width': `${normalizedValue}%` }">
    <div class="progress-track"><span /></div>
    <span v-if="showValue" class="progress-value du-mono">{{ normalizedValue }}%</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  value: number
  showValue?: boolean
}>(), {
  showValue: true,
})

// 将外部数值限制在 0 到 100，避免异常数据破坏布局。
const normalizedValue = computed(() => Math.min(100, Math.max(0, Math.round(props.value))))
</script>

<style scoped>
.compact-progress {
  display: flex;
  align-items: center;
  gap: var(--du-space-2);
}

.progress-track {
  width: 78px;
  height: 4px;
  overflow: hidden;
  border-radius: 2px;
  background: #e6e9ef;
}

.progress-track span {
  display: block;
  width: var(--progress-width);
  height: 100%;
  background: var(--du-accent);
}

.progress-value {
  width: 30px;
  color: var(--du-text-secondary);
  font-size: 9px;
  text-align: right;
}
</style>
