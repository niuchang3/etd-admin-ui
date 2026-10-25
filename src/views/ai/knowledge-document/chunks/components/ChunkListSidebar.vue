<template>
  <aside class="chunk-list-sidebar du-panel">
    <!-- 侧栏顶部工具条：勾选合并控制区 -->
    <div class="sidebar-header">
      <div class="header-left">
        <span class="sidebar-title">分片列表</span>
        <span class="chunk-count-badge">共 {{ total }} 片</span>
      </div>

      <div class="header-actions">
        <a-tooltip :title="mergeDisabledReason">
          <a-button
            type="primary"
            size="small"
            :disabled="!canMerge || !canWrite"
            :loading="mergeLoading"
            @click="handleTriggerMerge"
          >
            合并所选
          </a-button>
        </a-tooltip>
        <a-button
          v-if="selectedChunkIds.length > 0"
          type="link"
          size="small"
          class="clear-select-btn"
          @click="clearSelection"
        >
          清空 ({{ selectedChunkIds.length }})
        </a-button>
      </div>
    </div>

    <!-- 列表展示区 -->
    <div class="chunk-items-container">
      <a-spin :spinning="loading">
        <div v-if="chunks.length > 0" class="chunk-item-list">
          <div
            v-for="(chunk, idx) in chunks"
            :key="chunk.id"
            class="chunk-item-card"
            :class="{
              'is-active': activeChunkId === chunk.id,
              'is-selected': selectedChunkSet.has(chunk.id),
              'is-dirty': dirtyChunkIds.has(chunk.id),
            }"
            @click="handleSelectActive(chunk)"
          >
            <!-- 勾选复选框 -->
            <div class="chunk-checkbox" @click.stop>
              <a-checkbox
                :checked="selectedChunkSet.has(chunk.id)"
                :disabled="!canWrite"
                @change="handleToggleSelect(chunk.id)"
              />
            </div>

            <!-- 卡片主体内容 -->
            <div class="chunk-card-body">
              <div class="chunk-meta-row">
                <span class="chunk-display-index">#{{ getDisplayIndex(idx) }}</span>
                <span class="chunk-raw-index du-mono">idx: {{ chunk.chunkIndex }}</span>
                <span
                  class="chunk-tokens du-mono"
                  :class="{ 'is-low-token': (chunk.tokenCount ?? 0) < 100 }"
                  :title="(chunk.tokenCount ?? 0) < 100 ? '当前分片偏小 (< 100t)，建议勾选并与相邻分片合并以提升召回效果' : undefined"
                >
                  {{ chunk.tokenCount ?? 0 }}t
                  <span v-if="(chunk.tokenCount ?? 0) < 100" class="low-token-badge">偏小</span>
                </span>
                <span v-if="chunk.source?.pageNumbers?.length" class="chunk-pages">
                  P.{{ chunk.source.pageNumbers.join(',') }}
                </span>
                <span v-if="dirtyChunkIds.has(chunk.id)" class="chunk-dirty-tag">
                  已修改
                </span>
              </div>

              <!-- 正文平滑摘要 -->
              <div class="chunk-summary-text" :title="chunk.content">
                {{ getChunkSummary(getEffectiveContent(chunk), 65) }}
              </div>
            </div>
          </div>
        </div>
        <a-empty v-else description="暂无分片数据" class="empty-chunks" />
      </a-spin>
    </div>

    <!-- 侧栏底部紧凑分页栏 -->
    <div class="sidebar-pagination">
      <a-pagination
        :current="current"
        :page-size="size"
        :total="total"
        size="small"
        :page-size-options="['10', '20', '50', '100', '200']"
        :show-size-changer="true"
        :show-total="(count: number) => `共 ${count} 条`"
        @change="handlePageChange"
      />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { KnowledgeChunkItem } from '@/apis/ai/document/type'
import { checkAdjacentChunks, getChunkSummary } from '../helper'

const props = defineProps<{
  chunks: KnowledgeChunkItem[]
  allOrderedIds: string[]
  activeChunkId?: string | null
  selectedChunkIds: string[]
  dirtyChunkIds: Set<string>
  modifiedContentMap: Map<string, string>
  loading?: boolean
  mergeLoading?: boolean
  canWrite?: boolean
  current: number
  size: number
  total: number
}>()

const emit = defineEmits<{
  'update:activeChunkId': [id: string]
  'update:selectedChunkIds': [ids: string[]]
  pageChange: [page: number, pageSize: number]
  merge: [orderedIds: string[]]
}>()

const selectedChunkSet = computed(() => new Set(props.selectedChunkIds))

/**
 * 校验所选分片是否可以合并
 */
const adjacentCheckResult = computed(() => {
  return checkAdjacentChunks(props.allOrderedIds, props.selectedChunkIds)
})

const canMerge = computed(() => adjacentCheckResult.value.valid)

const mergeDisabledReason = computed(() => {
  if (!props.canWrite) {
    return '当前仅具备共享读取权限，无法合并分片'
  }
  if (!props.selectedChunkIds.length) {
    return '请在列表中勾选至少 2 个连续相邻的分片进行合并'
  }
  if (!adjacentCheckResult.value.valid) {
    return adjacentCheckResult.value.error || '只能合并连续相邻的分片'
  }
  return '将所选连续分片合并为一个分片'
})

const getDisplayIndex = (index: number) => {
  return (props.current - 1) * props.size + index + 1
}

const getEffectiveContent = (chunk: KnowledgeChunkItem) => {
  if (props.modifiedContentMap.has(chunk.id)) {
    return props.modifiedContentMap.get(chunk.id) || ''
  }
  return chunk.content
}

const handleSelectActive = (chunk: KnowledgeChunkItem) => {
  emit('update:activeChunkId', chunk.id)
}

const handleToggleSelect = (chunkId: string) => {
  const current = [...props.selectedChunkIds]
  const idx = current.indexOf(chunkId)
  if (idx > -1) {
    current.splice(idx, 1)
  } else {
    current.push(chunkId)
  }
  emit('update:selectedChunkIds', current)
}

const clearSelection = () => {
  emit('update:selectedChunkIds', [])
}

const handleTriggerMerge = () => {
  if (!canMerge.value) return
  emit('merge', adjacentCheckResult.value.orderedSelectedIds)
}

const handlePageChange = (page: number, pageSize: number) => {
  emit('pageChange', page, pageSize)
}
</script>

<style scoped>
.chunk-list-sidebar {
  display: flex;
  flex-direction: column;
  width: 320px;
  min-width: 280px;
  max-width: 360px;
  height: 100%;
  border-right: 1px solid var(--du-border-subtle, #e2e8f0);
  background: var(--du-bg-surface, #ffffff);
  box-sizing: border-box;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  height: 38px;
  border-bottom: 1px solid var(--du-border-subtle, #e2e8f0);
  background: var(--du-bg-panel, #f8fafc);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-title {
  font-size: var(--du-font-size-base, 12px);
  font-weight: 600;
  color: var(--du-text-primary, #0f172a);
}

.chunk-count-badge {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted, #64748b);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.clear-select-btn {
  padding: 0 4px;
  font-size: var(--du-font-size-xs, 11px);
}

.chunk-items-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.chunk-item-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chunk-item-card {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--du-border-subtle, #e2e8f0);
  border-radius: var(--du-radius-sm, 4px);
  background: var(--du-bg-surface, #ffffff);
  cursor: pointer;
  transition: all 0.15s ease;
}

.chunk-item-card:hover {
  border-color: var(--du-color-primary-light, #93c5fd);
  background: #f8fafc;
}

.chunk-item-card.is-active {
  border-color: var(--du-color-primary, #2563eb);
  background: #eff6ff;
  box-shadow: 0 0 0 1px var(--du-color-primary, #2563eb);
}

.chunk-item-card.is-selected {
  background: #f1f5f9;
}

.chunk-checkbox {
  padding-top: 1px;
}

.chunk-card-body {
  flex: 1;
  min-width: 0;
}

.chunk-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  line-height: 18px;
}

.chunk-display-index {
  font-size: var(--du-font-size-xs, 11px);
  font-weight: 600;
  color: var(--du-text-primary, #1e293b);
}

.chunk-raw-index {
  font-size: 10px;
  color: var(--du-text-muted, #94a3b8);
  background: #f1f5f9;
  padding: 0 4px;
  border-radius: 2px;
}

.chunk-tokens {
  font-size: 10.5px;
  color: #0284c7;
}

.chunk-tokens.is-low-token {
  color: #d97706;
}

.low-token-badge {
  font-size: 9px;
  background: #fef3c7;
  color: #b45309;
  padding: 0 3px;
  border-radius: 2px;
  margin-left: 2px;
}

.chunk-pages {
  font-size: 10px;
  color: #64748b;
}

.chunk-dirty-tag {
  font-size: 10px;
  color: #b45309;
  background: #fef3c7;
  padding: 0 4px;
  border-radius: 2px;
  margin-left: auto;
}

.chunk-summary-text {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary, #475569);
  line-height: 1.4;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty-chunks {
  margin: 32px 0;
}

.sidebar-pagination {
  padding: 8px 10px;
  border-top: 1px solid var(--du-border-subtle, #e2e8f0);
  background: var(--du-bg-panel, #f8fafc);
  display: flex;
  justify-content: center;
}

.sidebar-pagination :deep(.ant-pagination) {
  font-size: var(--du-font-size-xs, 11px);
}
</style>
