<template>
  <!-- 表格行操作统一收纳到省略号下拉菜单中。 -->
  <a-dropdown :trigger="['click']" placement="bottomRight">
    <a-button type="text" size="small" aria-label="打开行操作"><MoreOutlined /></a-button>
    <template #overlay>
      <a-menu @click="handleClick">
        <a-menu-item
          v-for="action in actions"
          :key="action.key"
          :danger="action.danger"
          :disabled="action.disabled"
        >
          {{ action.label }}
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import type { MenuProps } from 'ant-design-vue'
import { MoreOutlined } from '@ant-design/icons-vue'

export interface RowAction {
  key: string
  label: string
  danger?: boolean
  disabled?: boolean
}

defineProps<{
  actions: RowAction[]
}>()

const emit = defineEmits<{
  select: [key: string]
}>()

const handleClick: MenuProps['onClick'] = ({ key }) => emit('select', String(key))
</script>
