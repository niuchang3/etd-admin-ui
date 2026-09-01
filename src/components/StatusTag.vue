<template>
  <span class="status-tag-container">
    <a-tag v-if="tagConfig" :color="tagConfig.color" class="status-tag">
      <component :is="tagConfig.icon" v-if="tagConfig.icon" />
      {{ tagConfig.label }}
    </a-tag>
    <span v-else class="plain-status">{{ statusText }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { LockOutlined } from '@ant-design/icons-vue'

const props = withDefaults(
  defineProps<{
    value?: boolean | number | string | null
    type?: 'enabled' | 'locked' | 'custom'
    activeText?: string
    inactiveText?: string
  }>(),
  {
    value: undefined,
    type: 'enabled',
    activeText: '',
    inactiveText: '',
  }
)

interface TagDisplay {
  color?: string
  label: string
  icon?: Component
}

const isTruthy = computed(() => {
  const v = props.value
  return v === true || v === 1 || v === '1' || v === 'true'
})

const tagConfig = computed<TagDisplay | null>(() => {
  if (props.type === 'enabled') {
    return isTruthy.value
      ? { color: 'success', label: props.activeText || '启用' }
      : { color: 'error', label: props.inactiveText || '停用' }
  }

  if (props.type === 'locked') {
    if (isTruthy.value) {
      return { color: 'warning', label: props.activeText || '已锁定', icon: LockOutlined }
    }
    return null // 未锁定时渲染为普通文本
  }

  return null
})

const statusText = computed(() => {
  if (props.type === 'locked' && !isTruthy.value) {
    return props.inactiveText || '正常'
  }
  return String(props.value ?? '—')
})
</script>

<style scoped>
.status-tag-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.status-tag {
  margin-right: 0;
  font-size: 10px;
  line-height: 18px;
  padding-inline: 6px;
}

.plain-status {
  color: var(--du-text-secondary, #595959);
  font-size: 11px;
}
</style>
