<template>
  <!-- 通用数据表格组合了筛选栏、标题栏、工具区、表格和分页。 -->
  <section class="data-table">
    <FilterBar v-if="$slots.filters || $slots.filterActions">
      <slot name="filters" />
      <template #actions><slot name="filterActions" /></template>
    </FilterBar>

    <div class="table-panel du-panel" :class="{ 'has-filters': $slots.filters || $slots.filterActions }">
      <PanelHeader :title="title" :meta="displayMeta">
        <slot name="toolbar" />
      </PanelHeader>

      <a-table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :pagination="pagination"
        :row-key="rowKey"
        :row-selection="rowSelection"
        :scroll="scroll"
        :size="size"
      >
        <template #bodyCell="scope">
          <slot name="bodyCell" v-bind="scope">{{ scope.text }}</slot>
        </template>
      </a-table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TableColumnsType, TablePaginationConfig, TableProps } from 'ant-design-vue'
import FilterBar from '@/components/ui/FilterBar.vue'
import PanelHeader from '@/components/ui/PanelHeader.vue'

// 使用 object 而不是固定字段结构，让不同业务模块都能传入自己的行数据类型。
type RowKey = string | ((record: object) => string)

const props = withDefaults(defineProps<{
  title: string
  meta?: string
  columns: TableColumnsType
  dataSource: object[]
  loading?: boolean
  pagination?: false | TablePaginationConfig
  rowKey?: RowKey
  rowSelection?: TableProps['rowSelection']
  scroll?: TableProps['scroll']
  size?: 'small' | 'middle' | 'large'
}>(), {
  meta: '',
  loading: false,
  pagination: false,
  rowKey: 'id',
  rowSelection: undefined,
  scroll: undefined,
  size: 'small',
})

// 未显式传入记录说明时，默认显示当前数据条数。
const displayMeta = computed(() => props.meta || `${props.dataSource.length} 条记录`)
</script>

<style scoped>
/* 表格主体隐藏圆角之外的内容。 */
.table-panel {
  overflow: hidden;
}

/* 存在筛选栏时，将上下两部分连接为一个完整面板。 */
.table-panel.has-filters {
  border-top: 0;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.table-panel :deep(.ant-table-cell) {
  padding-top: 7px !important;
  padding-bottom: 7px !important;
}

.table-panel :deep(.ant-pagination) {
  margin: var(--du-space-3) !important;
}
</style>
