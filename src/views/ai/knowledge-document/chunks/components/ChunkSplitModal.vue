<template>
  <a-modal
    :open="open"
    title="在光标处拆分分片"
    :width="720"
    :confirm-loading="loading"
    :mask-closable="false"
    :closable="!loading"
    :cancel-button-props="{ disabled: loading }"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div class="chunk-split-modal-content">
      <!-- 提示说明与元数据提示 -->
      <a-alert
        type="info"
        show-icon
        class="split-top-alert"
        message="当前正文已按光标位置拆分为前后两段。拆分确认后，第一片将保留原分片 ID，第二片将作为新分片紧接在后；两片来源信息继承原分片，不代表各自页码已精确重新定位。"
      />

      <!-- Markdown 语法完整性提醒 -->
      <a-alert
        v-if="markdownWarning"
        type="warning"
        show-icon
        class="markdown-warning-alert"
        :message="markdownWarning"
      />

      <!-- 拆分段落一 -->
      <div class="split-section">
        <div class="section-header">
          <div class="section-title">
            <span>第一片正文</span>
            <span class="section-badge du-mono">保留分片 ID: {{ chunk?.id }}</span>
          </div>
          <div class="char-count" :class="{ 'char-warning': firstContent.length > 190000 }">
            {{ firstContent.length }} / 200,000 字符
          </div>
        </div>
        <a-textarea
          v-model:value="firstContent"
          :rows="6"
          :maxlength="200000"
          :disabled="loading"
          placeholder="请输入第一片分片正文..."
          class="split-textarea du-mono"
        />
      </div>

      <!-- 拆分段落二 -->
      <div class="split-section">
        <div class="section-header">
          <div class="section-title">
            <span>第二片正文</span>
            <span class="section-badge section-badge-new">新增分片（ID 由系统分配）</span>
          </div>
          <div class="char-count" :class="{ 'char-warning': secondContent.length > 190000 }">
            {{ secondContent.length }} / 200,000 字符
          </div>
        </div>
        <a-textarea
          v-model:value="secondContent"
          :rows="6"
          :maxlength="200000"
          :disabled="loading"
          placeholder="请输入第二片分片正文..."
          class="split-textarea du-mono"
        />
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { KnowledgeChunkItem } from '@/apis/ai/document/type'

const props = defineProps<{
  open: boolean
  chunk: KnowledgeChunkItem | null
  initialFirstContent: string
  initialSecondContent: string
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  confirm: [payload: { firstContent: string; secondContent: string }]
}>()

const firstContent = ref('')
const secondContent = ref('')

// 当弹窗打开时，初始化两段文本
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      firstContent.value = props.initialFirstContent
      secondContent.value = props.initialSecondContent
    }
  },
  { immediate: true }
)

/**
 * 智能检测切分点是否落在 Markdown 代码块或表格中间
 */
const markdownWarning = computed(() => {
  const fText = firstContent.value
  const sText = secondContent.value

  // 1. 检查代码块是否未闭合（``` 数量为奇数）
  const codeBlockMatches = fText.match(/```/g)
  const isInsideCodeBlock = codeBlockMatches && codeBlockMatches.length % 2 === 1
  if (isInsideCodeBlock) {
    return '检测到切分点位于 Markdown 代码块（```）内部，可能导致两段分片的代码块语法不完整，请检查并按需补全闭合标记。'
  }

  // 2. 检查是否在 Markdown 表格行中间截断
  const fLines = fText.split('\n')
  const sLines = sText.split('\n')
  const lastLine = fLines[fLines.length - 1]?.trim() || ''
  const firstLine = sLines[0]?.trim() || ''

  // 若第一段末尾包含表格竖线，且第二段开头也包含表格竖线，但缺少表头结构
  const isTableLine = (line: string) => line.startsWith('|') || (line.includes('|') && line.endsWith('|'))
  if (isTableLine(lastLine) && isTableLine(firstLine)) {
    // 检查第二段是否自带表头分隔线（如 |---|）
    const hasHeaderDivider = sLines.slice(0, 3).some((l) => /\|?\s*[-:]+[-| :]*\|?/.test(l))
    if (!hasHeaderDivider) {
      return '检测到切分点可能位于 Markdown 表格内部，第二段分片将作为独立文本存储，缺少表格表头，请确认两段表格结构完整性。'
    }
  }

  return null
})

const handleOk = () => {
  const f = firstContent.value
  const s = secondContent.value

  if (!f.trim()) {
    message.error('第一片正文不能为空白')
    return
  }
  if (!s.trim()) {
    message.error('第二片正文不能为空白')
    return
  }
  if (f.length > 200000 || s.length > 200000) {
    message.error('单片正文上限为 200,000 字符')
    return
  }

  emit('confirm', {
    firstContent: f,
    secondContent: s,
  })
}

const handleCancel = () => {
  if (props.loading) return
  emit('update:open', false)
}
</script>

<style scoped>
.chunk-split-modal-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.split-top-alert {
  font-size: var(--du-font-size-xs, 11px);
}

.markdown-warning-alert {
  font-size: var(--du-font-size-xs, 11px);
}

.split-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--du-font-size-sm, 12px);
  font-weight: 600;
  color: var(--du-text-primary, #0f172a);
}

.section-badge {
  font-size: 10px;
  color: var(--du-text-secondary, #475569);
  background: var(--du-bg-subtle, #f1f5f9);
  padding: 1px 6px;
  border-radius: var(--du-radius-sm, 3px);
  border: 1px solid var(--du-border-subtle, #e2e8f0);
}

.section-badge-new {
  color: #0284c7;
  background: #f0f9ff;
  border-color: #bae6fd;
}

.char-count {
  font-size: 11px;
  color: var(--du-text-muted, #64748b);
  font-family: var(--du-font-mono);
}

.char-warning {
  color: #ef4444;
  font-weight: 600;
}

.split-textarea {
  font-size: var(--du-font-size-sm, 12px);
  line-height: 1.5;
  resize: vertical;
}
</style>
