<template>
  <!-- 首页：完整模型广场页面 -->
  <section class="management-page dashboard-square-page">
    <div class="square-container">
      <!-- 1. 顶部介绍区 Banner -->
      <header class="square-hero-banner">
        <div class="hero-content">
          <div class="hero-eyebrow">MODEL CONNECTIONS</div>
          <h1 class="hero-title">连接模型，拓展 AI 的可能</h1>
          <p class="hero-subtitle">
            从熟悉的模型品牌开始，为你的应用接入合适的 AI 能力。
          </p>
        </div>

        <!-- 使用下载的品牌 PNG 素材作为装饰。 -->
        <div class="hero-glass-cards-decoration" aria-hidden="true">
          <div class="glass-float-card card-left">
            <img class="deco-image" :src="claudeLogo" alt="" />
          </div>
          <div class="glass-float-card card-top-right">
            <img class="deco-image" :src="geminiLogo" alt="" />
          </div>
          <div class="glass-float-card card-bottom-right">
            <img class="deco-image" :src="openaiLogo" alt="" />
          </div>
        </div>
      </header>

      <!-- 2. 筛选区：无多余包裹面板 -->
      <div class="square-filter-section">
        <!-- 筛选区第一行：下划线 Tab 切换 + 右侧搜索框 -->
        <div class="filter-primary-row">
          <div class="underline-tabs">
            <button
              type="button"
              class="underline-tab-btn"
              :class="{ active: queryParams.connected === undefined }"
              @click="handleTabChange(undefined)"
            >
              发现模型
            </button>
            <button
              type="button"
              class="underline-tab-btn"
              :class="{ active: queryParams.connected === true }"
              @click="handleTabChange(true)"
            >
              已接入
            </button>
          </div>

          <div class="filter-actions-right">
            <!-- 搜索框（药丸全圆角样式） -->
            <a-input
              v-model:value="queryParams.keyword"
              placeholder="搜索模型名称或代码..."
              allow-clear
              class="search-model-input"
              @press-enter="handleSearch"
              @change="handleKeywordChange"
            >
              <template #prefix>
                <SearchOutlined class="search-prefix-icon" />
              </template>
            </a-input>

            <a-tooltip title="刷新广场">
              <a-button :loading="loading" class="reload-btn" @click="loadModelList">
                <ReloadOutlined />
              </a-button>
            </a-tooltip>
          </div>
        </div>

        <!-- 筛选区第二行：平铺轻量模型类型标签 -->
        <div class="filter-types-row">
          <div class="types-pills-wrap">
            <button
              type="button"
              class="type-pill-btn"
              :class="{ active: !queryParams.modelType }"
              @click="handleTypeFilter(undefined)"
            >
              全部
            </button>
            <button
              v-for="item in modelTypeDictItems"
              :key="item.dictValue"
              type="button"
              class="type-pill-btn"
              :class="{ active: queryParams.modelType === item.dictValue }"
              @click="handleTypeFilter(item.dictValue)"
            >
              {{ item.dictLabel }}
            </button>
          </div>
        </div>
      </div>

      <!-- 3. 模型卡片网格 -->
      <a-spin :spinning="loading">
        <div v-if="modelList.length === 0" class="square-empty-wrap">
          <a-empty
            :description="
              queryParams.connected === true
                ? '暂无已接入连接的模型，切换至「发现模型」选择模型开始接入'
                : '未找到符合条件的 AI 模型'
            "
          >
            <a-button
              v-if="queryParams.connected === true"
              type="primary"
              @click="handleTabChange(undefined)"
            >
              去发现模型
            </a-button>
            <a-button v-else @click="handleResetFilters">重置筛选条件</a-button>
          </a-empty>
        </div>

        <div v-else class="model-cards-grid">
          <div
            v-for="model in modelList"
            :key="model.id"
            class="model-square-card"
            :class="{ 'is-model-disabled': model.dataStatus === 0 }"
            @click="openModelDrawer(model)"
          >
            <!-- 紧凑品牌展示区 -->
            <div
              class="card-top-stage"
              :style="{ background: getTheme(model.providerCode).bgGradient }"
            >
              <!-- 右上角小标记：“已接入”状态胶囊 或 停用标记 -->
              <div class="top-status-group">
                <div v-if="model.connectionCount > 0" class="top-status-badge">
                  <span class="green-indicator-dot"></span>
                  <span>已接入</span>
                </div>
                <div v-if="model.dataStatus === 0" class="top-disabled-badge">
                  <span>已停用</span>
                </div>
              </div>

              <!-- Logo与品牌字标整体居中展示 -->
              <div class="card-hero-centered">
                <BrandLogoView
                  :provider-code="model.providerCode"
                  :provider-name="model.modelName"
                  :logo="model.logo || model.logoPath"
                  :logo-path="model.logoPath || model.logo"
                />
              </div>
            </div>

            <!-- 卡片主体：模型名称与代码 → 描述 → 类型与维度 → 连接配置数量 -->
            <div class="card-body">
              <div class="model-title-line">
                <h3 class="model-entity-name" :title="model.modelName">
                  {{ model.modelName }}
                </h3>
                <span class="model-code-chip du-mono" :title="model.modelCode">
                  {{ model.modelCode }}
                </span>
              </div>

              <p class="model-summary-desc" :title="model.description || ''">
                {{ model.description }}
              </p>

              <!-- 类型标签与向量维度 -->
              <div class="model-tags-row">
                <span class="compact-type-tag">
                  {{ getModelTypeLabel(model.modelType) }}
                </span>
                <!-- 若为向量模型且支持维度，根据字典 ai_embedding_dimension 过滤后展示 -->
                <template v-if="model.modelType === 'embedding'">
                  <span
                    v-for="dim in filterEmbeddingByDict(model.embedding)"
                    :key="dim"
                    class="compact-dim-tag du-mono"
                  >
                    {{ getEmbeddingDimLabel(dim) }}
                  </span>
                </template>
              </div>

              <!-- 连接配置数量 -->
              <div class="card-bottom-row">
                <span class="connection-status-text">
                  <template v-if="model.connectionCount > 0">
                    已配置 {{ model.connectionCount }} 个连接
                    <span v-if="model.enabledConnectionCount > 0" class="enabled-tip">
                      ({{ model.enabledConnectionCount }} 启用)
                    </span>
                  </template>
                  <template v-else>
                    尚未配置连接
                  </template>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. 底部分页控制区 -->
        <div v-if="total > 0" class="square-pagination-wrap">
          <a-pagination
            :current="queryParams.current"
            :page-size="queryParams.size"
            :total="total"
            :show-total="(t: number) => `共 ${t} 个模型`"
            :page-size-options="['12', '24', '36', '48']"
            show-size-changer
            size="small"
            @change="handlePageChange"
          />
        </div>
      </a-spin>
    </div>

    <!-- 模型详情与连接管理抽屉 -->
    <ModelDetailDrawer
      v-model:open="drawerOpen"
      :model="selectedModel"
      :can-write="canWrite"
      @success="handleSquareSuccess"
    />

  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { getSquareModelPage } from '@/apis/ai/square'
import type { SquareModelQuery, SquareModelRecord } from '@/apis/ai/square/type'
import { menusStore } from '@/stores/modules/user'
import { useSystemDict } from '@/composables/useSystemDict'
import { AI_DICT_TYPE } from '@/constant'
import claudeLogo from '@/assets/images/providers/claude.png'
import geminiLogo from '@/assets/images/providers/gemini.png'
import openaiLogo from '@/assets/images/providers/openai.png'
import { getProviderTheme } from './types'
import BrandLogoView from './components/BrandLogoView.vue'
import ModelDetailDrawer from './components/ModelDetailDrawer.vue'

const route = useRoute()

/**
 * 权限统一：
 * 查询：ai:model-square:read
 * 接入、修改、启停、删除：ai:model-square:write
 * 页面读写授权通过 menusStore().canWritePath(route.path) 判断
 */
const canWrite = computed(() => menusStore().canWritePath(route.path))

// 加载字典：服务商、模型类型与向量维度
const { getDict: getDictItems, getLabel: getDictLabel } = useSystemDict([
  AI_DICT_TYPE.MODEL_PROVIDER,
  AI_DICT_TYPE.MODEL_TYPE,
  AI_DICT_TYPE.EMBEDDING_DIMENSION,
])

const loading = ref(false)
const modelList = ref<SquareModelRecord[]>([])
const total = ref(0)

// 广场查询参数（默认每页 12 条）
const queryParams = reactive<SquareModelQuery>({
  current: 1,
  size: 12,
  keyword: '',
  modelType: undefined,
  providerCode: undefined,
  connected: undefined,
})

// 模型详情抽屉状态
const drawerOpen = ref(false)
const selectedModel = ref<SquareModelRecord | null>(null)

const getTheme = (code?: string) => getProviderTheme(code)

/** 获取模型类型字典项列表 */
const modelTypeDictItems = computed(() => {
  const items = getDictItems(AI_DICT_TYPE.MODEL_TYPE) || []
  if (items.length > 0) return items
  return [
    { dictLabel: '聊天模型', dictValue: 'llm' },
    { dictLabel: '向量模型', dictValue: 'embedding' },
    { dictLabel: '重排序模型', dictValue: 'rerank' },
    { dictLabel: '图片生成模型', dictValue: 'image' },
    { dictLabel: '语音识别模型', dictValue: 'stt' },
    { dictLabel: '语音合成模型', dictValue: 'tts' },
  ]
})

const getModelTypeLabel = (typeCode: string) => {
  return getDictLabel(AI_DICT_TYPE.MODEL_TYPE, typeCode) || typeCode
}

/** 根据字典 ai_embedding_dimension 返回的内容展示向量维度 */
const getEmbeddingDimLabel = (dim: number | string) => {
  return getDictLabel(AI_DICT_TYPE.EMBEDDING_DIMENSION, String(dim)) || String(dim)
}

/** 过滤 embedding 数组，仅保留字典 ai_embedding_dimension 中存在的维度值 */
const filterEmbeddingByDict = (embedding: number[] | null | undefined): number[] => {
  if (!embedding?.length) return []
  const dictItems = getDictItems(AI_DICT_TYPE.EMBEDDING_DIMENSION) || []
  const dictValues = new Set(dictItems.map((item) => item.dictValue))
  return embedding.filter((dim) => dictValues.has(String(dim)))
}

/** 加载模型广场模型列表数据 */
const loadModelList = async () => {
  loading.value = true
  try {
    const res = await getSquareModelPage({
      current: queryParams.current,
      size: queryParams.size,
      keyword: queryParams.keyword?.trim() || undefined,
      modelType: queryParams.modelType || undefined,
      providerCode: queryParams.providerCode || undefined,
      connected: queryParams.connected,
    })

    modelList.value = res.data?.records || []
    total.value = res.data?.total || 0

    // 若当前抽屉正在展示某个模型，同步更新引用
    if (selectedModel.value) {
      const refreshed = modelList.value.find((m) => String(m.id) === String(selectedModel.value?.id))
      if (refreshed) {
        selectedModel.value = refreshed
      }
    }
  } catch {
    // 拦截器已处理错误提示
  } finally {
    loading.value = false
  }
}

/** 切换 Tab：“发现模型”与“已接入” */
const handleTabChange = (connectedVal?: boolean) => {
  queryParams.connected = connectedVal
  queryParams.current = 1
  void loadModelList()
}

/** 切换类型筛选 */
const handleTypeFilter = (typeVal?: string) => {
  queryParams.modelType = typeVal
  queryParams.current = 1
  void loadModelList()
}

const handleKeywordChange = () => {
  if (!queryParams.keyword) {
    handleSearch()
  }
}

const handleSearch = () => {
  queryParams.current = 1
  void loadModelList()
}

const handleResetFilters = () => {
  queryParams.keyword = ''
  queryParams.modelType = undefined
  queryParams.providerCode = undefined
  queryParams.connected = undefined
  queryParams.current = 1
  void loadModelList()
}

const handlePageChange = (page: number, pageSize: number) => {
  queryParams.current = page
  queryParams.size = pageSize
  void loadModelList()
}

/** 点击卡片主体：打开详情抽屉 */
const openModelDrawer = (model: SquareModelRecord) => {
  selectedModel.value = model
  drawerOpen.value = true
}

const handleSquareSuccess = () => {
  void loadModelList()
}

onMounted(() => {
  void loadModelList()
})
</script>

<style scoped>
.dashboard-square-page {
  padding: 16px 24px 40px;
}

.square-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1360px;
  margin: 0 auto;
  container-type: inline-size;
}

/* 1. 顶部介绍区 Banner */
.square-hero-banner {
  background: linear-gradient(135deg, #f0f3fd 0%, #f6f7fe 50%, #faf4ff 100%);
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 28px 36px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hero-content {
  max-width: 620px;
  position: relative;
  z-index: 2;
}

.hero-eyebrow {
  font-size: 11px;
  font-weight: 600;
  color: #6366f1;
  letter-spacing: 1.5px;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.hero-title {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px;
  line-height: 1.3;
}

.hero-subtitle {
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

/* 右侧浮空玻璃徽标卡片装饰 */
.hero-glass-cards-decoration {
  width: 220px;
  height: 100px;
  position: relative;
  flex-shrink: 0;
}

.glass-float-card {
  position: absolute;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 8px 24px -4px rgba(100, 116, 139, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-left {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  top: 14px;
  left: 10px;
  transform: rotate(-3deg);
}

.card-top-right {
  width: 66px;
  height: 66px;
  border-radius: 18px;
  top: 6px;
  right: 18px;
  transform: rotate(5deg);
}

.card-bottom-right {
  width: 58px;
  height: 48px;
  border-radius: 14px;
  bottom: 0px;
  right: 48px;
  transform: rotate(-2deg);
}

.deco-image {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

/* 2. 筛选区：无外层包裹面板 */
.square-filter-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 2px;
}

.filter-primary-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0;
}

.underline-tabs {
  display: flex;
  gap: 28px;
}

.underline-tab-btn {
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  padding: 6px 2px 10px;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  outline: none;
}

.underline-tab-btn:hover {
  color: #1e293b;
}

.underline-tab-btn.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
  font-weight: 600;
}

.connected-pill-badge {
  font-size: 11px;
  background-color: #f1f5f9;
  color: #64748b;
  border-radius: 10px;
  padding: 1px 7px;
  font-weight: 500;
}

.filter-actions-right {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 6px;
}

.search-model-input {
  width: 240px;
  border-radius: 9999px;
  background-color: #ffffff;
}

.search-model-input :deep(.ant-input) {
  border-radius: 9999px;
  font-size: 12.5px;
}

.search-prefix-icon {
  color: #94a3b8;
  font-size: 13px;
}

.reload-btn {
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-types-row {
  display: flex;
  align-items: center;
  padding: 0;
}

.types-pills-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.type-pill-btn {
  background: transparent;
  border: none;
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 12.5px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.4;
  outline: none;
}

.type-pill-btn:hover {
  color: #0f172a;
}

.type-pill-btn.active {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 500;
}

/* 按内容区宽度切换列数，兼容侧边栏展开和收起。 */
.model-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--du-space-4);
}

@container (max-width: 1040px) {
  .model-cards-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container (max-width: 680px) {
  .model-cards-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .model-cards-grid {
    grid-template-columns: 1fr;
  }
  .filter-primary-row {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .search-model-input {
    width: 100%;
  }
  .square-hero-banner {
    flex-direction: column;
    align-items: flex-start;
  }
  .hero-glass-cards-decoration {
    display: none;
  }
}

.model-square-card {
  min-width: 0;
  background: var(--du-bg-surface);
  border: 1px solid var(--du-border);
  border-radius: var(--du-radius-md);
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.model-square-card:hover {
  border-color: var(--du-accent);
  box-shadow: 0 2px 8px rgb(0 0 0 / 4%);
}

.model-square-card.is-model-disabled {
  opacity: 0.85;
  background: var(--du-bg-subtle);
}

.card-top-stage {
  height: 80px;
  padding: 20px var(--du-space-3) var(--du-space-2);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.top-status-group {
  position: absolute;
  top: 6px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: var(--du-space-1);
}

.top-status-badge,
.top-disabled-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--du-space-1);
  font-size: var(--du-font-size-xs);
  line-height: 18px;
  padding: 0 6px;
  background: var(--du-bg-surface);
  border: 1px solid var(--du-border);
  border-radius: var(--du-radius-sm);
  color: var(--du-text-secondary);
}

.top-disabled-badge {
  background: var(--du-bg-subtle);
  color: var(--du-text-muted);
}

.green-indicator-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--du-positive);
}

.card-hero-centered {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  max-width: 100%;
}

.card-hero-centered :deep(.brand-logo-view) {
  min-width: 0;
  max-width: 100%;
  gap: var(--du-space-2);
}

.card-hero-centered :deep(.brand-logo-img-box) {
  width: 32px;
  height: 32px;
  border-radius: var(--du-radius-md);
}

.card-hero-centered :deep(.brand-real-logo-img) {
  max-width: 24px;
  max-height: 24px;
}

.card-hero-centered :deep(.brand-wordmark) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--du-font-sans);
  font-size: var(--du-font-size-lg);
  font-weight: 500;
}

.card-body {
  padding: var(--du-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--du-space-2);
  flex: 1;
  min-width: 0;
}

.model-title-line {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--du-space-1);
  min-width: 0;
}

.model-entity-name {
  max-width: 100%;
  font-size: var(--du-font-size-base);
  font-weight: 400;
  color: var(--du-text);
  margin: 0;
  line-height: 18px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-code-chip {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--du-font-size-xs);
  color: var(--du-text-secondary);
  background: var(--du-bg-subtle);
  border: 1px solid var(--du-border);
  border-radius: var(--du-radius-sm);
  padding: 0 var(--du-space-1);
  line-height: 16px;
  white-space: nowrap;
}

.model-summary-desc {
  font-size: var(--du-font-size-base);
  color: var(--du-text-secondary);
  line-height: 18px;
  margin: 0;
  min-height: 36px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.model-tags-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--du-space-1);
}

.compact-type-tag,
.compact-dim-tag {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--du-font-size-xs);
  border-radius: var(--du-radius-sm);
  padding: 0 6px;
  line-height: 18px;
}

.compact-type-tag {
  color: var(--du-text-secondary);
  background: var(--du-bg-subtle);
}

.compact-dim-tag {
  color: var(--du-accent);
  background: var(--du-accent-subtle);
}

.card-bottom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--du-space-2);
  margin-top: auto;
  padding-top: var(--du-space-2);
}

.connection-status-text {
  min-width: 0;
  font-size: var(--du-font-size-xs);
  line-height: 18px;
  color: var(--du-text-muted);
}

.enabled-tip {
  color: var(--du-positive);
}

.square-empty-wrap {
  padding: 60px 0;
  background: #ffffff;
  border-radius: 14px;
  border: 1px dashed #e2e8f0;
}

.square-pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 8px 0 0;
}
</style>
