<template>
  <div class="json-viewer">
    <div v-if="title || showCopy" class="json-viewer-header">
      <span v-if="title" class="json-viewer-title">{{ title }}</span>
      <span v-else></span>
      <a-button
        v-if="showCopy && formattedText"
        type="link"
        size="small"
        class="copy-btn"
        @click="handleCopy"
      >
        <template #icon><CopyOutlined /></template>
        {{ copied ? '已复制' : '复制 JSON' }}
      </a-button>
    </div>

    <div
      class="json-viewer-body du-mono"
      :style="{ maxHeight: maxHeight || '320px' }"
    >
      <template v-if="formattedText">
        <pre class="json-pre"><code><div
          v-for="(line, lineIdx) in tokenizedLines"
          :key="lineIdx"
          class="json-line"
        ><span class="line-number">{{ lineIdx + 1 }}</span><span class="line-content"><span
            v-for="(token, tokenIdx) in line"
            :key="tokenIdx"
            :class="`token-${token.type}`"
          >{{ token.text }}</span></span></div></code></pre>
      </template>
      <div v-else class="json-empty">
        {{ emptyText || '（无数据）' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import { CopyOutlined } from '@ant-design/icons-vue'

interface Token {
  type: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation' | 'whitespace' | 'plain'
  text: string
}

const props = withDefaults(
  defineProps<{
    data?: any
    title?: string
    maxHeight?: string
    emptyText?: string
    showCopy?: boolean
  }>(),
  {
    data: undefined,
    title: '',
    maxHeight: '320px',
    emptyText: '（无内容）',
    showCopy: true,
  }
)

const copied = ref(false)

const formattedText = computed<string>(() => {
  if (props.data === undefined || props.data === null || props.data === '') {
    return ''
  }
  let parsed = props.data
  if (typeof props.data === 'string') {
    const trimmed = props.data.trim()
    if (!trimmed) return ''
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      return props.data
    }
  }
  try {
    return JSON.stringify(parsed, null, 2)
  } catch {
    return String(props.data)
  }
})

// 安全分词解析（XSS-safe，纯文本渲染，不使用 v-html）
const tokenizedLines = computed<Token[][]>(() => {
  const text = formattedText.value
  if (!text) return []

  const lines = text.split('\n')
  return lines.map((line) => {
    const tokens: Token[] = []
    // 匹配正则：缩进、键名、字符串、数值、布尔、null、标点符号
    const regex = /(\s+)|("(?:\\.|[^"\\])*"(?=\s*:))|("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}[\],:])/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({
          type: 'plain',
          text: line.slice(lastIndex, match.index),
        })
      }
      if (match[1]) {
        tokens.push({ type: 'whitespace', text: match[1] })
      } else if (match[2]) {
        tokens.push({ type: 'key', text: match[2] })
      } else if (match[3]) {
        tokens.push({ type: 'string', text: match[3] })
      } else if (match[4]) {
        tokens.push({ type: 'number', text: match[4] })
      } else if (match[5]) {
        tokens.push({ type: 'boolean', text: match[5] })
      } else if (match[6]) {
        tokens.push({ type: 'null', text: match[6] })
      } else if (match[7]) {
        tokens.push({ type: 'punctuation', text: match[7] })
      }
      lastIndex = regex.lastIndex
    }

    if (lastIndex < line.length) {
      tokens.push({ type: 'plain', text: line.slice(lastIndex) })
    }

    return tokens
  })
})

const handleCopy = async () => {
  if (!formattedText.value) return
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(formattedText.value)
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = formattedText.value
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    copied.value = true
    message.success('已复制到剪贴板')
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    message.error('复制失败，请手动选择复制')
  }
}
</script>

<style scoped>
.json-viewer {
  border: 1px solid var(--du-border, #e5e7eb);
  border-radius: 4px;
  background-color: var(--du-bg-secondary, #fafafa);
  overflow: hidden;
}

.json-viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  border-bottom: 1px solid var(--du-border, #e5e7eb);
  background-color: var(--du-bg-tertiary, #f3f4f6);
  min-height: 28px;
}

.json-viewer-title {
  font-size: var(--du-font-size-xs, 11px);
  font-weight: 600;
  color: var(--du-text, #1f2937);
}

.copy-btn {
  font-size: var(--du-font-size-xs, 11px);
  padding: 0 4px;
  height: 22px;
}

.json-viewer-body {
  overflow: auto;
  padding: 6px 0;
  font-size: 11.5px;
  line-height: 1.5;
  background-color: #1e1e1e;
  color: #d4d4d4;
}

.json-pre {
  margin: 0;
  padding: 0;
  font-family: var(--du-font-mono, 'JetBrains Mono', monospace);
}

.json-line {
  display: flex;
  padding: 0 8px;
  white-space: pre-wrap;
  word-break: break-all;
}

.json-line:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.line-number {
  display: inline-block;
  width: 32px;
  min-width: 32px;
  color: #6e7681;
  text-align: right;
  padding-right: 12px;
  user-select: none;
}

.line-content {
  flex: 1;
}

.json-empty {
  padding: 16px;
  text-align: center;
  color: #8c8c8c;
  font-size: var(--du-font-size-xs, 11px);
}

/* 语法高亮主题配色（深色控制台风格） */
.token-key {
  color: #9cdcfe;
  font-weight: 500;
}

.token-string {
  color: #ce9178;
}

.token-number {
  color: #b5cea8;
}

.token-boolean {
  color: #569cd6;
}

.token-null {
  color: #569cd6;
}

.token-punctuation {
  color: #ffd700;
}

.token-plain {
  color: #d4d4d4;
}
</style>
