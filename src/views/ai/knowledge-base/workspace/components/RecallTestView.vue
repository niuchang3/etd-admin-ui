<template>
  <div class="recall-test-view du-panel">
    <!-- 头部说明与操作 -->
    <header class="recall-header">
      <div class="header-main">
        <div class="header-title-box">
          <AimOutlined class="header-icon" />
          <span class="title-text">召回测试</span>
          <span class="kb-name-badge" v-if="kb?.name">知识库: {{ kb.name }}</span>
        </div>
        <span class="header-sub">
          输入测试问题验证检索效果。召回测试允许查询未启用的已确认资料，仍受数据权限限制。
        </span>
      </div>

      <div class="header-actions">
        <a-button size="small" @click="handleGoSettings">
          <SettingOutlined /> 知识库设置
        </a-button>
        <a-button size="small" @click="handleBack">
          <RollbackOutlined /> 返回知识库
        </a-button>
      </div>
    </header>

    <!-- 当前检索配置只读展示条 -->
    <section class="kb-config-strip" v-if="kb">
      <div class="strip-header">
        <div class="strip-title-box">
          <ControlOutlined class="strip-icon" />
          <span class="strip-title">当前生效检索配置（只读）</span>
        </div>
        <a-button type="link" size="small" class="settings-link" @click="handleGoSettings">
          修改检索设置 →
        </a-button>
      </div>

      <div class="strip-items">
        <div class="strip-item">
          <span class="item-label">检索模式:</span>
          <a-tag color="blue" class="config-tag">{{ retrievalModeLabel }}</a-tag>
        </div>

        <div class="strip-item" v-if="kb.dimensions">
          <span class="item-label">向量维度:</span>
          <span class="item-val du-mono">{{ kb.dimensions }} 维</span>
        </div>

        <div class="strip-item">
          <span class="item-label">全文候选数:</span>
          <span class="item-val du-mono">{{ kb.keywordRecallSize ?? 10 }}</span>
        </div>

        <div class="strip-item" v-if="isVectorMode">
          <span class="item-label">向量候选数:</span>
          <span class="item-val du-mono">{{ kb.vectorRecallSize ?? 10 }}</span>
        </div>

        <div class="strip-item">
          <span class="item-label">最终输出 Top K:</span>
          <span class="item-val du-mono font-medium">{{ kb.topK ?? 5 }}</span>
        </div>

        <div class="strip-item" v-if="isVectorMode && isNumeric(kb.similarityThreshold)">
          <span class="item-label">相似度阈值:</span>
          <span class="item-val du-mono">{{ kb.similarityThreshold }}</span>
        </div>

        <div class="strip-item">
          <span class="item-label">重排策略:</span>
          <a-tag :color="kb.rerankEnabled ? 'green' : 'default'" class="config-tag">
            {{ kb.rerankEnabled ? '已启用重排' : '未启用' }}
          </a-tag>
          <span v-if="kb.rerankEnabled && isNumeric(kb.rerankThreshold)" class="item-val du-mono rerank-sub">
            (阈值: {{ kb.rerankThreshold }})
          </span>
        </div>
      </div>
    </section>

    <!-- 问题输入测试区 -->
    <section class="query-input-section">
      <div class="input-container">
        <a-textarea
          v-model:value="searchQuery"
          placeholder="请输入用于召回测试的问题或检索词（最多 2,000 字符，按 Ctrl+Enter 快速发起检索）..."
          :rows="3"
          :maxlength="2000"
          show-count
          allow-clear
          :disabled="testing"
          class="query-textarea"
          @keydown="handleKeyDown"
        />
        <div class="input-actions-bar">
          <div class="actions-left">
            <span class="shortcut-tip">提示：本次请求仅提交问题；检索模式、候选数及重排策略均读取知识库已生效配置。</span>
          </div>
          <div class="actions-right">
            <a-button
              type="primary"
              :loading="testing"
              :disabled="!isQueryValid"
              class="test-btn"
              @click="handleRunRecall"
            >
              <SearchOutlined v-if="!testing" />
              {{ testing ? '正在检索...' : '测试召回' }}
            </a-button>
          </div>
        </div>
      </div>

      <!-- 加载提示浮条 -->
      <a-alert
        v-if="testing"
        type="info"
        show-icon
        message="正在检索，可能包含向量生成和重排，请稍候..."
        class="loading-alert"
      />
    </section>

    <!-- 结果展示区 -->
    <main class="results-main">
      <!-- 状态一：加载骨架 -->
      <div v-if="testing" class="results-loading-box">
        <a-spin tip="正在检索，可能包含向量生成和重排..." />
      </div>

      <!-- 状态二：已测试但无命中结果 -->
      <div v-else-if="hasTested && results.length === 0" class="empty-results-box">
        <a-empty
          description="未找到匹配分片，可尝试调整问题，或检查资料是否已确认分片"
        />
      </div>

      <!-- 状态三：初始未测试引导 -->
      <div v-else-if="!hasTested" class="initial-guide-box">
        <div class="guide-content">
          <SearchOutlined class="guide-icon" />
          <h3 class="guide-title">等待发起召回测试</h3>
          <p class="guide-desc">
            在上方输入框输入测试问题并点击“测试召回”。系统将直接调用检索流水线，返回命中的原始分片、正文、来源信息与得分明细。
          </p>
        </div>
      </div>

      <!-- 状态四：展示命中卡片列表 -->
      <div v-else class="results-content-list">
        <div class="results-summary-bar">
          <span class="summary-text">
            共命中 <strong class="du-mono count-highlight">{{ results.length }}</strong> 个分片
            <span class="summary-sub">（严格按相关性得分降序排列，展示检索初筛或重排后的原始分片）</span>
          </span>
          <a-button size="small" type="link" @click="toggleAllExpand">
            {{ isAllExpanded ? '全部收起' : '全部展开' }}
          </a-button>
        </div>

        <div class="hit-card-list">
          <article
            v-for="(hit, index) in results"
            :key="hit.chunkId || `${hit.documentId}-${hit.chunkIndex}-${index}`"
            class="hit-card"
          >
            <!-- 卡片头部：排名、资料信息、分片序号与得分 -->
            <header class="hit-card-header">
              <div class="header-left">
                <span class="rank-badge" :class="`rank-${index + 1}`">#{{ index + 1 }}</span>
                <span class="doc-title" :title="hit.documentName">
                  <FileTextOutlined class="doc-icon" />
                  {{ hit.documentName }}
                </span>
                <span class="chunk-index-badge du-mono">第 {{ hit.chunkIndex + 1 }} 片</span>
              </div>

              <!-- 得分指标展示栏 -->
              <div class="header-scores">
                <!-- 最终综合排序得分 -->
                <div class="score-pill total-score" title="后端综合排序最终分数">
                  <span class="score-name">最终得分</span>
                  <span class="score-val du-mono">{{ formatScore(hit.score) }}</span>
                </div>

                <!-- 重排得分（非空展示，支持 0） -->
                <div
                  v-if="isNumeric(hit.rerankScore)"
                  class="score-pill rerank-score"
                  title="Cross-Encoder 语义重排分数"
                >
                  <span class="score-name">重排</span>
                  <span class="score-val du-mono">{{ formatScore(hit.rerankScore) }}</span>
                </div>

                <!-- 向量相似度得分（余弦相似度 [-1, 1]） -->
                <div
                  v-if="isNumeric(hit.vectorScore)"
                  class="score-pill vector-score"
                  title="向量余弦相似度 [-1, 1]"
                >
                  <span class="score-name">余弦相似度</span>
                  <span class="score-val du-mono">{{ formatScore(hit.vectorScore) }}</span>
                </div>

                <!-- 全文检索得分（非空展示，支持 0） -->
                <div
                  v-if="isNumeric(hit.keywordScore)"
                  class="score-pill keyword-score"
                  title="全文倒排匹配分数"
                >
                  <span class="score-name">全文</span>
                  <span class="score-val du-mono">{{ formatScore(hit.keywordScore) }}</span>
                </div>
              </div>
            </header>

            <!-- 来源信息（若 headings、pageNumbers、documentItemRefs 任一存在） -->
            <div class="hit-source-section" v-if="hasSourceInfo(hit.source)">
              <!-- 标题路径 -->
              <template v-if="hit.source?.headings?.length">
                <a-tag
                  v-for="(heading, hIdx) in hit.source.headings"
                  :key="`h-${hIdx}`"
                  color="purple"
                  class="source-tag heading-tag"
                  :title="heading"
                >
                  <FolderOutlined /> {{ heading }}
                </a-tag>
              </template>

              <!-- 页码 -->
              <template v-if="hit.source?.pageNumbers?.length">
                <a-tag
                  v-for="page in hit.source.pageNumbers"
                  :key="`p-${page}`"
                  color="cyan"
                  class="source-tag"
                >
                  第 {{ page }} 页
                </a-tag>
              </template>

              <!-- 原文块引用 -->
              <template v-if="hit.source?.documentItemRefs?.length">
                <a-tag
                  v-for="(refItem, rIdx) in hit.source.documentItemRefs"
                  :key="`ref-${rIdx}`"
                  class="source-tag ref-tag"
                  :title="refItem"
                >
                  引用: {{ refItem }}
                </a-tag>
              </template>
            </div>

            <!-- 正文区域：纯文本安全渲染，支持长文本展开/收起 -->
            <div class="hit-content-container">
              <div
                class="hit-content-text"
                :class="{ 'is-collapsed': !isExpanded(hit) && isLongContent(hit.content) }"
              >
                {{ hit.content }}
              </div>

              <!-- 展开/收起切换按钮 -->
              <div v-if="isLongContent(hit.content)" class="expand-action-row">
                <a-button type="link" size="small" class="expand-btn" @click="toggleExpand(hit)">
                  {{ isExpanded(hit) ? '收起正文 ↑' : '展开全文 ↓' }}
                </a-button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  AimOutlined,
  ControlOutlined,
  FileTextOutlined,
  FolderOutlined,
  RollbackOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'
import { useKnowledgeBaseStore } from '@/stores/modules/knowledgeBase'
import { testRecall } from '@/apis/ai/knowledge-base'
import type { RecallTestHit, RecallTestHitSource } from '@/apis/ai/knowledge-base/type'

const props = defineProps<{
  knowledgeBaseId: string
}>()

const router = useRouter()
const kbStore = useKnowledgeBaseStore()

const kb = computed(() => kbStore.currentKb)
const searchQuery = ref('')
const testing = ref(false)
const hasTested = ref(false)
const results = ref<RecallTestHit[]>([])

// 并发请求防覆盖计数器
const latestRequestId = ref(0)

// 展开卡片集合
const expandedSet = ref<Set<string>>(new Set())

// 输入校验
const isQueryValid = computed(() => {
  const trimmed = searchQuery.value.trim()
  return trimmed.length > 0 && trimmed.length <= 2000
})

const isVectorMode = computed(() => {
  return kb.value?.retrievalMode === 'vector' || kb.value?.retrievalMode === 'hybrid'
})

const retrievalModeLabel = computed(() => {
  const mode = kb.value?.retrievalMode
  if (mode === 'keyword') return '全文检索 (keyword)'
  if (mode === 'vector') return '向量检索 (vector)'
  if (mode === 'hybrid') return '混合检索 (hybrid)'
  return mode || '未知模式'
})

const isNumeric = (val: any): val is number => {
  return typeof val === 'number' && !Number.isNaN(val)
}

const formatScore = (val: any) => {
  if (typeof val === 'number') {
    return Number.isInteger(val) ? String(val) : val.toFixed(4)
  }
  return '--'
}

const hasSourceInfo = (source?: RecallTestHitSource | null) => {
  if (!source) return false
  return Boolean(
    source.headings?.length ||
    source.pageNumbers?.length ||
    source.documentItemRefs?.length
  )
}

const isLongContent = (content?: string) => {
  if (!content) return false
  return content.length > 300 || content.split('\n').length > 5
}

const getHitKey = (hit: RecallTestHit) => {
  return hit.chunkId || `${hit.documentId}-${hit.chunkIndex}`
}

const isExpanded = (hit: RecallTestHit) => {
  return expandedSet.value.has(getHitKey(hit))
}

const toggleExpand = (hit: RecallTestHit) => {
  const key = getHitKey(hit)
  if (expandedSet.value.has(key)) {
    expandedSet.value.delete(key)
  } else {
    expandedSet.value.add(key)
  }
}

const isAllExpanded = computed(() => {
  if (!results.value.length) return false
  return results.value.every((h) => expandedSet.value.has(getHitKey(h)))
})

const toggleAllExpand = () => {
  if (isAllExpanded.value) {
    expandedSet.value.clear()
  } else {
    results.value.forEach((h) => expandedSet.value.add(getHitKey(h)))
  }
}

/**
 * 执行召回测试
 */
const handleRunRecall = async () => {
  const query = searchQuery.value.trim()
  if (!query) {
    message.warning('请输入召回测试问题')
    return
  }
  if (query.length > 2000) {
    message.warning('问题长度不能超过 2000 个字符')
    return
  }
  if (testing.value) return

  testing.value = true
  const currentReqId = ++latestRequestId.value

  try {
    const res = await testRecall(props.knowledgeBaseId, { query })

    // 丢弃过时响应，防止竞态覆盖
    if (currentReqId !== latestRequestId.value) return

    results.value = Array.isArray(res.data) ? res.data : []
    hasTested.value = true
    expandedSet.value.clear()
  } catch (err: any) {
    if (currentReqId !== latestRequestId.value) return
    message.error(err?.message || '召回测试失败，请检查模型连接与接口状态')
  } finally {
    if (currentReqId === latestRequestId.value) {
      testing.value = false
    }
  }
}

/**
 * 快捷键响应
 */
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    if (isQueryValid.value && !testing.value) {
      void handleRunRecall()
    }
  }
}

/**
 * 跳转与返回
 */
const handleGoSettings = () => {
  void router.push(`/ai/knowledge-bases/${props.knowledgeBaseId}/settings`)
}

const handleBack = () => {
  void router.push({
    path: '/ai/knowledge-bases',
    query: kbStore.listQuery,
  })
}
</script>

<style scoped>
.recall-test-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 20px;
  overflow-y: auto;
  background: var(--du-bg-surface, #ffffff);
}

/* 顶部头部 */
.recall-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--du-border, #d9dee8);
}

.header-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-title-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  color: var(--du-accent, #2563eb);
  font-size: 16px;
}

.title-text {
  font-size: var(--du-font-size-md, 13px);
  font-weight: var(--du-font-weight-semibold, 600);
  color: var(--du-text, #172033);
}

.kb-name-badge {
  font-size: var(--du-font-size-xs, 11px);
  padding: 1px 8px;
  border-radius: var(--du-radius-sm, 3px);
  background: var(--du-accent-subtle, #eaf1ff);
  color: var(--du-accent, #2563eb);
  font-weight: 500;
}

.header-sub {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted, #8992a3);
  line-height: 1.4;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

/* 检索配置展示条 */
.kb-config-strip {
  padding: 10px 14px;
  margin-bottom: 14px;
  border: 1px solid var(--du-border, #d9dee8);
  border-radius: var(--du-radius-md, 4px);
  background: var(--du-bg-subtle, #f7f8fa);
}

.strip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.strip-title-box {
  display: flex;
  align-items: center;
  gap: 6px;
}

.strip-icon {
  color: var(--du-text-secondary, #5c667a);
  font-size: 13px;
}

.strip-title {
  font-size: var(--du-font-size-xs, 11px);
  font-weight: var(--du-font-weight-semibold, 600);
  color: var(--du-text-secondary, #5c667a);
}

.settings-link {
  font-size: var(--du-font-size-xs, 11px) !important;
  padding: 0 !important;
  height: auto !important;
}

.strip-items {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.strip-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--du-font-size-xs, 11px);
}

.item-label {
  color: var(--du-text-muted, #8992a3);
}

.item-val {
  color: var(--du-text, #172033);
}

.config-tag {
  line-height: 18px !important;
  font-size: 10.5px !important;
  padding: 0 6px !important;
  margin: 0 !important;
}

.rerank-sub {
  color: var(--du-text-secondary, #5c667a);
  margin-left: 2px;
}

/* 问题输入区 */
.query-input-section {
  margin-bottom: 16px;
}

.input-container {
  border: 1px solid var(--du-border, #d9dee8);
  border-radius: var(--du-radius-md, 4px);
  background: var(--du-bg-surface, #ffffff);
  padding: 10px 12px;
}

.query-textarea {
  font-size: var(--du-font-size-sm, 12px);
  resize: vertical;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}

.query-textarea:focus {
  border: none !important;
  box-shadow: none !important;
}

.input-actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--du-border, #d9dee8);
}

.shortcut-tip {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted, #8992a3);
}

.test-btn {
  height: 32px;
  min-width: 100px;
  font-size: var(--du-font-size-sm, 12px);
}

.loading-alert {
  margin-top: 10px;
  font-size: var(--du-font-size-xs, 11px);
}

/* 结果区主体 */
.results-main {
  flex: 1;
  min-height: 240px;
}

.results-loading-box,
.empty-results-box,
.initial-guide-box {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  border: 1px dashed var(--du-border, #d9dee8);
  border-radius: var(--du-radius-md, 4px);
  background: var(--du-bg-subtle, #f7f8fa);
}

.guide-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 460px;
}

.guide-icon {
  font-size: 32px;
  color: var(--du-accent, #2563eb);
  margin-bottom: 12px;
  opacity: 0.8;
}

.guide-title {
  font-size: var(--du-font-size-sm, 12.5px);
  font-weight: var(--du-font-weight-semibold, 600);
  color: var(--du-text, #172033);
  margin-bottom: 6px;
}

.guide-desc {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary, #5c667a);
  line-height: 1.5;
  margin: 0;
}

/* 命中列表 */
.results-summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 0 4px;
}

.summary-text {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary, #5c667a);
}

.count-highlight {
  color: var(--du-accent, #2563eb);
  font-size: 12px;
}

.summary-sub {
  color: var(--du-text-muted, #8992a3);
  margin-left: 6px;
}

.hit-card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hit-card {
  border: 1px solid var(--du-border, #d9dee8);
  border-radius: var(--du-radius-md, 4px);
  background: var(--du-bg-surface, #ffffff);
  overflow: hidden;
  transition: border-color 0.15s ease;
}

.hit-card:hover {
  border-color: var(--du-border-strong, #c3cad6);
}

/* 卡片头部 */
.hit-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  background: var(--du-bg-subtle, #f7f8fa);
  border-bottom: 1px solid var(--du-border, #d9dee8);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--du-radius-sm, 3px);
  font-size: 11px;
  font-weight: 700;
  background: #e2e8f0;
  color: #475569;
}

.rank-1 {
  background: #fef3c7;
  color: #b45309;
}

.rank-2 {
  background: #e0e7ff;
  color: #3730a3;
}

.rank-3 {
  background: #e0f2fe;
  color: #0369a1;
}

.doc-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--du-font-size-sm, 12px);
  font-weight: var(--du-font-weight-medium, 500);
  color: var(--du-text, #172033);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-icon {
  color: var(--du-text-muted, #8992a3);
}

.chunk-index-badge {
  font-size: 10.5px;
  color: var(--du-text-secondary, #5c667a);
  background: #ffffff;
  border: 1px solid var(--du-border, #d9dee8);
  padding: 1px 6px;
  border-radius: var(--du-radius-sm, 3px);
  white-space: nowrap;
}

.header-scores {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.score-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 6px;
  border-radius: var(--du-radius-sm, 3px);
  font-size: 11px;
  border: 1px solid transparent;
}

.total-score {
  background: var(--du-accent-subtle, #eaf1ff);
  border-color: #bfdbfe;
  color: var(--du-accent, #2563eb);
}

.total-score .score-name {
  font-weight: 600;
}

.rerank-score {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #15803d;
}

.vector-score {
  background: #faf5ff;
  border-color: #e9d5ff;
  color: #7e22ce;
}

.keyword-score {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #475569;
}

.score-name {
  font-size: 10.5px;
  opacity: 0.85;
}

.score-val {
  font-weight: 600;
}

/* 来源区域 */
.hit-source-section {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #fafbfc;
  border-bottom: 1px solid #f1f4f8;
}

.source-tag {
  line-height: 18px !important;
  font-size: 10.5px !important;
  padding: 0 6px !important;
  margin: 0 !important;
}

.heading-tag {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ref-tag {
  background: #f1f5f9 !important;
  border-color: #e2e8f0 !important;
  color: #475569 !important;
}

/* 正文区域 */
.hit-content-container {
  padding: 10px 12px;
}

.hit-content-text {
  font-size: var(--du-font-size-sm, 12px);
  color: var(--du-text, #172033);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  transition: max-height 0.2s ease;
}

.hit-content-text.is-collapsed {
  max-height: 110px;
  overflow: hidden;
  position: relative;
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 60%, rgba(0, 0, 0, 0) 100%);
  -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 60%, rgba(0, 0, 0, 0) 100%);
}

.expand-action-row {
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;
}

.expand-btn {
  font-size: var(--du-font-size-xs, 11px) !important;
  padding: 0 !important;
  height: 22px !important;
}
</style>
