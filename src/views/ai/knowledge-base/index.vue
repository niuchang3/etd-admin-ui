<template>
  <div class="knowledge-base-page">
    <!-- 顶部工具栏与筛选区 -->
    <header class="du-panel toolbar-panel">
      <div class="filters">
        <a-input
          v-model:value="query.keyword"
          placeholder="按知识库名称搜索..."
          :maxlength="100"
          allow-clear
          class="keyword-input"
          @press-enter="handleSearch"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-button type="primary" :loading="loading" @click="handleSearch">
          <SearchOutlined />查询
        </a-button>
        <a-button @click="handleReset">重置</a-button>
      </div>

      <div class="toolbar-actions">
        <a-button v-if="canWrite" type="primary" @click="handleAdd">
          <PlusOutlined />新建知识库
        </a-button>
      </div>
    </header>

    <!-- 卡片列表网格 -->
    <div class="cards-container">
      <a-spin :spinning="loading">
        <div v-if="tableData.length" class="kb-grid">
          <div
            v-for="record in tableData"
            :key="record.id"
            class="kb-card du-panel"
            @click="handleEnterWorkspace(record)"
          >
            <!-- 卡片头部：图标、名称、公开标记与操作 -->
            <div class="card-header">
              <div class="kb-title-wrap">
                <BookOutlined class="kb-card-icon" />
                <span class="kb-name" :title="record.name">{{ record.name }}</span>
                <a-tag :color="record.isPublic ? 'blue' : 'default'" class="public-tag">
                  {{ record.isPublic ? '租户公开' : '私有' }}
                </a-tag>
              </div>

              <!-- 右侧独立操作区域：阻止冒泡，避免误触进入工作区 -->
              <div class="card-actions" @click.stop>
                <a-tooltip title="召回测试">
                  <a-button type="text" size="small" class="recall-btn" @click="handleGoRecallTest(record)">
                    <AimOutlined />
                  </a-button>
                </a-tooltip>

                <a-popconfirm
                  v-if="canWrite && record.writable !== false"
                  title="确定删除此知识库？操作将同时删除其所有分类与文档资料且不可恢复。"
                  ok-text="确定删除"
                  cancel-text="取消"
                  ok-type="danger"
                  @confirm="handleDelete(record)"
                >
                  <a-button type="text" size="small" danger :loading="deletingId === record.id">
                    <DeleteOutlined />
                  </a-button>
                </a-popconfirm>
              </div>
            </div>

            <!-- 卡片简介 -->
            <p class="card-desc" :title="record.description || ''">
              {{ record.description || '暂无简介描述' }}
            </p>

            <!-- 核心数据与配置 -->
            <div class="card-meta-list">
              <div class="meta-item">
                <span class="meta-label">文档数量</span>
                <span class="meta-value du-mono font-medium">{{ record.documentCount ?? 0 }} 篇</span>
              </div>

              <div class="meta-item">
                <span class="meta-label">检索模式</span>
                <span class="meta-value du-mono">
                  {{ getRetrievalModeLabel(record.retrievalMode) }}
                </span>
              </div>

              <div v-if="record.dimensions" class="meta-item">
                <span class="meta-label">向量维度</span>
                <span class="meta-value du-mono">{{ record.dimensions }} 维</span>
              </div>
            </div>

            <!-- 卡片底部进入按钮 -->
            <div class="card-footer">
              <span class="footer-time du-mono">{{ record.createTime || '' }}</span>
              <span class="enter-btn-text">进入工作区 →</span>
            </div>
          </div>
        </div>

        <a-empty
          v-else
          description="暂无知识库"
          class="empty-panel du-panel"
        >
          <a-button v-if="canWrite" type="primary" @click="handleAdd">
            <PlusOutlined />新建第一个知识库
          </a-button>
        </a-empty>
      </a-spin>
    </div>

    <!-- 底部标准分页 -->
    <footer class="pagination-footer du-panel">
      <a-pagination
        v-model:current="query.current"
        v-model:page-size="query.size"
        :total="total"
        :show-total="(t: number) => `共 ${t} 个知识库`"
        show-size-changer
        :page-size-options="['12', '24', '48']"
        size="small"
        @change="handlePageChange"
      />
    </footer>

    <!-- 新建知识库弹窗 -->
    <KnowledgeBaseCreateModal
      v-model:open="createModalOpen"
      @success="getList"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  AimOutlined,
  BookOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import { menusStore } from '@/stores/modules/user'
import { useKnowledgeBaseStore } from '@/stores/modules/knowledgeBase'
import {
  deleteKnowledgeBase,
  getKnowledgeBasePage,
} from '@/apis/ai/knowledge-base'
import type { KnowledgeBaseQuery, KnowledgeBaseRecord, RetrievalMode } from '@/apis/ai/knowledge-base/type'
import KnowledgeBaseCreateModal from './components/KnowledgeBaseCreateModal.vue'

const route = useRoute()
const router = useRouter()
const currentMenus = menusStore()
const kbStore = useKnowledgeBaseStore()

const canWrite = computed(() => currentMenus.canWritePath(route.path))

const loading = ref(false)
const total = ref(0)
const tableData = ref<KnowledgeBaseRecord[]>([])
const deletingId = ref<string | null>(null)
const createModalOpen = ref(false)

// 优先从 store 恢复筛选条件和页码（实现从工作区“返回主菜单”时完全保留上下文）
const query = reactive<KnowledgeBaseQuery>({
  current: kbStore.listQuery.current || 1,
  size: kbStore.listQuery.size || 12,
  keyword: kbStore.listQuery.keyword || '',
})

const getRetrievalModeLabel = (mode?: RetrievalMode) => {
  if (mode === 'keyword') return '全文检索'
  if (mode === 'vector') return '向量检索'
  if (mode === 'hybrid') return '混合检索'
  return '—'
}

const getList = async () => {
  loading.value = true
  try {
    const res = await getKnowledgeBasePage(query)
    const data = res.data
    tableData.value = data?.records || []
    total.value = data?.total || 0

    // 同步到 store 中持久化
    kbStore.setListQuery({
      current: query.current,
      size: query.size,
      keyword: query.keyword,
    })
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.current = 1
  void getList()
}

const handleReset = () => {
  query.keyword = ''
  query.current = 1
  void getList()
}

const handlePageChange = (page: number, pageSize: number) => {
  query.current = page
  query.size = pageSize
  void getList()
}

const handleAdd = () => {
  createModalOpen.value = true
}

const handleEnterWorkspace = (record: KnowledgeBaseRecord) => {
  // 设置当前工作区知识库并导航
  kbStore.currentKb = record
  void router.push(`/ai/knowledge-bases/${record.id}/documents`)
}

const handleGoRecallTest = (record: KnowledgeBaseRecord) => {
  kbStore.currentKb = record
  void router.push(`/ai/knowledge-bases/${record.id}/recall-test`)
}

const handleDelete = async (record: KnowledgeBaseRecord) => {
  deletingId.value = String(record.id)
  try {
    await deleteKnowledgeBase(String(record.id))
    message.success('知识库已删除')
    if (tableData.value.length === 1 && (query.current || 1) > 1) {
      query.current = (query.current || 1) - 1
    }
    await getList()
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  // 检查 URL query 是否有覆盖参数
  if (route.query.keyword) {
    query.keyword = String(route.query.keyword)
  }
  if (route.query.current) {
    query.current = Number(route.query.current) || 1
  }
  void getList()
})
</script>

<style scoped>
.knowledge-base-page {
  display: flex;
  flex-direction: column;
  gap: var(--du-space-3, 10px);
  min-height: 100%;
}

.toolbar-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
}

.filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.keyword-input {
  width: 240px;
}

.cards-container {
  flex: 1;
}

.kb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.kb-card {
  display: flex;
  flex-direction: column;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 160ms ease;
  border: 1px solid var(--du-border-color, #e2e8f0);
  background: var(--du-panel-bg, #ffffff);
}

.kb-card:hover {
  border-color: var(--du-primary-color, #2563eb);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.kb-title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.kb-card-icon {
  color: var(--du-primary-color, #2563eb);
  font-size: 15px;
  flex: 0 0 15px;
}

.kb-name {
  font-size: var(--du-font-size-base, 13px);
  font-weight: 600;
  color: var(--du-text-primary, #0f172a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.public-tag {
  font-size: 10px;
  line-height: 16px;
  height: 18px;
  padding: 0 4px;
  margin-left: 4px;
}

.card-actions {
  display: flex;
  align-items: center;
}

.card-desc {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary, #64748b);
  line-height: 1.45;
  margin: 0 0 10px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 32px;
}

.card-meta-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px 10px;
  background: var(--du-bg-subtle, #f8fafc);
  border-radius: var(--du-radius-sm, 3px);
  margin-bottom: 10px;
  font-size: var(--du-font-size-xs, 11px);
}

.meta-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.meta-label {
  color: var(--du-text-muted, #94a3b8);
}

.meta-value {
  color: var(--du-text-primary, #1e293b);
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 6px;
  border-top: 1px dashed var(--du-border-color, #e2e8f0);
  font-size: var(--du-font-size-xs, 11px);
}

.footer-time {
  color: var(--du-text-muted, #94a3b8);
}

.enter-btn-text {
  color: var(--du-primary-color, #2563eb);
  font-weight: 500;
  transition: transform 120ms ease;
}

.kb-card:hover .enter-btn-text {
  transform: translateX(3px);
}

.empty-panel {
  padding: 48px 0;
  text-align: center;
}

.pagination-footer {
  display: flex;
  justify-content: flex-end;
  padding: 8px 12px;
}
</style>
