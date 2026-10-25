<template>
  <div class="chunk-editor-panel">
    <template v-if="chunk">
      <!-- 顶部元信息工具栏 -->
      <header class="editor-header">
        <div class="meta-section">
          <div class="title-row">
            <span class="chunk-title">
              分片 #{{ displayIndex }}
              <span class="chunk-sub-title du-mono">(序号: {{ chunk.chunkIndex }})</span>
            </span>
            <span v-if="isModified" class="dirty-badge">未保存修改</span>
          </div>

          <!-- 元数据 Tags 区域 -->
          <div class="meta-tags-row">
            <!-- Token 数统计 -->
            <a-tag color="blue" class="meta-tag">
              <template #icon><FieldTimeOutlined /></template>
              {{ chunk.tokenCount ?? 0 }} Tokens
            </a-tag>

            <!-- 来源页码 -->
            <template v-if="chunk.source?.pageNumbers?.length">
              <a-tag
                v-for="pageNum in chunk.source.pageNumbers"
                :key="`p-${pageNum}`"
                color="cyan"
                class="meta-tag"
              >
                第 {{ pageNum }} 页
              </a-tag>
            </template>

            <!-- 来源标题：按标签展示，不强制解释为单一面包屑 -->
            <template v-if="chunk.source?.headings?.length">
              <a-tag
                v-for="(heading, hIdx) in chunk.source.headings"
                :key="`h-${hIdx}`"
                color="purple"
                class="meta-tag heading-tag"
                :title="heading"
              >
                {{ heading }}
              </a-tag>
              <a-tooltip title="系统在确认分片向量化时将自动继承此章节路径，增强检索语义，无需在正文中重复手写标题">
                <a-tag color="processing" class="meta-tag context-boost-tag">
                  <template #icon><InfoCircleOutlined /></template>
                  向量上下文已关联
                </a-tag>
              </a-tooltip>
            </template>

            <!-- 文档元素项引用 -->
            <template v-if="chunk.source?.documentItemRefs?.length">
              <a-tag
                v-for="(refItem, rIdx) in chunk.source.documentItemRefs"
                :key="`ref-${rIdx}`"
                class="meta-tag ref-tag"
                :title="refItem"
              >
                {{ refItem }}
              </a-tag>
            </template>
          </div>
        </div>

        <div class="actions-section">
          <a-button
            v-if="isModified"
            size="small"
            @click="handleRevert"
          >
            还原此分片
          </a-button>

          <a-button
            v-if="canWrite"
            size="small"
            :disabled="disabled || !canWrite"
            @mousedown.prevent
            @click="handleTriggerSplit"
          >
            <ScissorOutlined /> 在光标处拆分
          </a-button>

          <a-button
            v-if="canWrite"
            danger
            size="small"
            :disabled="disabled || !canWrite"
            :loading="deleteLoading"
            @click="handleDelete"
          >
            <DeleteOutlined /> 删除此分片
          </a-button>
        </div>
      </header>

      <!-- 正文编辑器容器 -->
      <div class="editor-body">
        <div class="editor-tip">
          <span v-if="!canWrite" class="readonly-tip-text">当前仅具备共享读取权限，无法编辑或保存分片正文。</span>
          <span v-else>分片正文支持包含 Markdown 格式文本、LaTeX 数学公式与 Mermaid 图表；请勿输入包含恶意脚本的未过滤 HTML。正文不能为空白，上限 200,000 字符。</span>
        </div>

        <div class="md-editor-container">
          <MdEditor
            ref="editorRef"
            :model-value="currentContent"
            :max-length="200000"
            :disabled="!canWrite || disabled"
            :read-only="!canWrite || disabled"
            placeholder="请输入分片正文内容（支持 Markdown、LaTeX 公式、Mermaid 图表）..."
            class="chunk-md-editor"
            preview
            :toolbars="toolbars"
            :footers="['scrollSwitch', '=', 0]"
            language="zh-CN"
            @on-change="handleContentChange"
          >
            <template #defFooters>
              <span class="char-count" :class="{ 'char-warning': currentContent.length > 190000 }">
                {{ currentContent.length }} / 200,000 字符
              </span>
            </template>
          </MdEditor>
        </div>
      </div>
    </template>

    <div v-else class="empty-editor">
      <a-empty description="请在左侧列表中选择一个分片进行查看与编辑" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { DeleteOutlined, FieldTimeOutlined, InfoCircleOutlined, ScissorOutlined } from '@ant-design/icons-vue'
import { config, MdEditor, type ToolbarNames } from 'md-editor-v3'
import katex from 'katex'
import mermaid from 'mermaid'
import 'md-editor-v3/lib/style.css'
import 'katex/dist/katex.min.css'
import type { KnowledgeChunkItem } from '@/apis/ai/document/type'

// 全局配置 md-editor-v3 离线 LaTeX (KaTeX) 与 Mermaid 实例
config({
  editorExtensions: {
    katex: {
      instance: katex,
    },
    mermaid: {
      instance: mermaid,
    },
  },
  katexConfig: (baseConfig: any) => ({
    ...baseConfig,
    throwOnError: false,
  }),
})

const props = defineProps<{
  chunk?: KnowledgeChunkItem | null
  displayIndex: number
  modifiedContent?: string
  canWrite?: boolean
  disabled?: boolean
  deleteLoading?: boolean
}>()

const emit = defineEmits<{
  'update:modifiedContent': [content: string]
  revert: []
  delete: []
  split: [payload: { chunk: KnowledgeChunkItem; firstContent: string; secondContent: string }]
}>()

const editorRef = ref<any>(null)
const lastCursorPos = ref<number | null>(null)

// 常用精简工具栏，保持 B 端紧凑高密度风格
const toolbars: ToolbarNames[] = [
  'revoke',
  'next',
  '-',
  'bold',
  'italic',
  'strikeThrough',
  'title',
  '-',
  'quote',
  'unorderedList',
  'orderedList',
  'code',
  'table',
  '-',
  'katex',
  'mermaid',
  '=',
  'preview',
  'fullscreen',
]

const bindEditorEvents = () => {
  editorRef.value?.domEventHandlers({
    click: (_e: MouseEvent, view: any) => {
      if (typeof view?.state?.selection?.main?.head === 'number') {
        lastCursorPos.value = view.state.selection.main.head
      }
    },
    keyup: (_e: KeyboardEvent, view: any) => {
      if (typeof view?.state?.selection?.main?.head === 'number') {
        lastCursorPos.value = view.state.selection.main.head
      }
    },
    focus: (_e: FocusEvent, view: any) => {
      if (typeof view?.state?.selection?.main?.head === 'number') {
        lastCursorPos.value = view.state.selection.main.head
      }
    },
  })
}

onMounted(() => {
  bindEditorEvents()
})

watch(
  () => props.chunk?.id,
  () => {
    lastCursorPos.value = null
    nextTick(() => {
      bindEditorEvents()
    })
  }
)

const currentContent = computed(() => {
  if (props.modifiedContent !== undefined) {
    return props.modifiedContent
  }
  return props.chunk?.content || ''
})

const isModified = computed(() => {
  if (!props.chunk) return false
  return props.modifiedContent !== undefined && props.modifiedContent !== props.chunk.content
})

const handleContentChange = (newVal: string) => {
  emit('update:modifiedContent', newVal)
}

const handleRevert = () => {
  emit('revert')
}

const handleDelete = () => {
  emit('delete')
}

const handleTriggerSplit = () => {
  const view = editorRef.value?.getEditorView()
  let pos: number | null = null
  if (view && typeof view.state?.selection?.main?.head === 'number') {
    pos = view.state.selection.main.head
    lastCursorPos.value = pos
  } else if (lastCursorPos.value !== null) {
    pos = lastCursorPos.value
  }

  const content = currentContent.value || ''
  if (pos === null || pos === undefined) {
    message.warning('请先在正文中要拆分的位置放置光标')
    return
  }

  if (pos <= 0 || pos >= content.length) {
    message.warning('光标位于正文开头或结尾，无法在此处拆分，请将光标移动到正文中间位置')
    return
  }

  const firstPart = content.slice(0, pos)
  const secondPart = content.slice(pos)

  if (!firstPart.trim() || !secondPart.trim()) {
    message.warning('拆分后的前后两段正文均不能为空白，请调整光标位置')
    return
  }

  if (!props.chunk) return

  emit('split', {
    chunk: props.chunk,
    firstContent: firstPart,
    secondContent: secondPart,
  })
}
</script>

<style scoped>
.chunk-editor-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  background: var(--du-bg-surface, #ffffff);
  box-sizing: border-box;
}

.editor-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--du-border-subtle, #e2e8f0);
  background: var(--du-bg-panel, #f8fafc);
  gap: 12px;
}

.meta-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chunk-title {
  font-size: var(--du-font-size-base, 12px);
  font-weight: 600;
  color: var(--du-text-primary, #0f172a);
}

.chunk-sub-title {
  font-size: 11px;
  color: var(--du-text-muted, #64748b);
  font-weight: normal;
}

.dirty-badge {
  font-size: 10px;
  color: #b45309;
  background: #fef3c7;
  padding: 1px 6px;
  border-radius: 2px;
  font-weight: 500;
}

.meta-tags-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.meta-tag {
  margin: 0;
  font-size: 11px;
  line-height: 20px;
  border-radius: 2px;
}

.heading-tag {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ref-tag {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #64748b;
  background: #f1f5f9;
  border-color: #e2e8f0;
}

.actions-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.editor-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 12px 16px;
  overflow: hidden;
  min-height: 0;
}

.editor-tip {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted, #64748b);
  margin-bottom: 8px;
  line-height: 1.4;
  flex-shrink: 0;
}

.md-editor-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.chunk-md-editor {
  flex: 1;
  height: 100% !important;
  border: 1px solid var(--du-border-subtle, #cbd5e1) !important;
  border-radius: var(--du-radius-sm, 2px);
  font-size: var(--du-font-size-base, 12px);
}

.chunk-md-editor :deep(.cm-editor) {
  font-family: var(--du-font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
  font-size: 12px;
  line-height: 1.6;
}

.chunk-md-editor :deep(.md-editor-toolbar-wrapper) {
  padding: 2px 4px;
  min-height: 32px;
  background: var(--du-bg-panel, #f8fafc);
  border-bottom: 1px solid var(--du-border-subtle, #e2e8f0);
}

.chunk-md-editor :deep(.md-editor-toolbar-item) {
  height: 26px;
  width: 26px;
  line-height: 26px;
}

.chunk-md-editor :deep(.md-editor-footer) {
  height: 28px;
  line-height: 28px;
  padding: 0 10px;
  font-size: var(--du-font-size-xs, 11px);
  background: var(--du-bg-panel, #f8fafc);
  border-top: 1px solid var(--du-border-subtle, #e2e8f0);
}

/* 修复代码块粘性吸顶头部层级（原默认 10000 穿透 Drawer 抽屉与 Modal） */
.chunk-md-editor :deep(.md-editor-preview .md-editor-code .md-editor-code-head) {
  z-index: 2 !important;
}


.char-count {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted, #64748b);
}

.char-warning {
  color: #ea580c;
  font-weight: 600;
}

.empty-editor {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
}
</style>
