<template>
  <!-- Agent 管理主页面 -->
  <section class="management-page agent-page">
    <div class="du-panel table-panel">
      <!-- 页面顶部筛选栏与工具栏 -->
      <header class="page-toolbar">
        <div class="filters">
          <a-input
            v-model:value="query.keyword"
            placeholder="Agent 名称搜索..."
            :maxlength="100"
            allow-clear
            class="filter-input"
            style="width: 180px"
            @press-enter="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>

          <a-select
            v-model:value="query.dataStatus"
            placeholder="启用状态"
            allow-clear
            class="filter-select"
            style="width: 110px"
            @change="handleFilterChange"
          >
            <a-select-option :value="1">已启用</a-select-option>
            <a-select-option :value="0">已停用</a-select-option>
          </a-select>

          <a-select
            v-model:value="query.published"
            placeholder="发布状态"
            allow-clear
            class="filter-select"
            style="width: 110px"
            @change="handleFilterChange"
          >
            <a-select-option :value="true">已发布</a-select-option>
            <a-select-option :value="false">未发布</a-select-option>
          </a-select>

          <a-button type="primary" :loading="loading" @click="handleSearch">
            <SearchOutlined />查询
          </a-button>
          <a-button @click="handleReset">
            <ReloadOutlined />重置
          </a-button>
        </div>

        <!-- 创建入口：受菜单写权限 canWrite 控制 -->
        <a-button v-if="canWrite" type="primary" @click="handleAdd">
          <PlusOutlined />新建 Agent
        </a-button>
      </header>

      <!-- Agent 数据表格：行高刚性锁定 34px -->
      <a-table
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="small"
        :scroll="{ x: 1280 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- 图标/头像 -->
          <template v-if="column.key === 'avatarPath'">
            <div class="table-avatar-cell">
              <img
                v-if="record.avatarPath"
                :src="record.avatarPath"
                alt="avatar"
                class="cell-avatar-img"
                @error="handleCellAvatarError"
              />
              <span v-else class="cell-avatar-fallback">
                <RobotOutlined />
              </span>
            </div>
          </template>

          <!-- Agent 名称（12px 方案C基准，常规字重） -->
          <template v-else-if="column.key === 'name'">
            <EllipsisText
              :text="record.name"
              max-width="160px"
              class="agent-name-cell"
            />
          </template>

          <!-- 所属组织 -->
          <template v-else-if="column.key === 'orgId'">
            <EllipsisText
              :text="orgNameMap[record.orgId] || record.orgId"
              max-width="140px"
              class="du-mono"
            />
          </template>

          <!-- 简介说明 -->
          <template v-else-if="column.key === 'description'">
            <EllipsisText
              :text="record.description || '—'"
              max-width="200px"
            />
          </template>

          <!-- 公开范围 -->
          <template v-else-if="column.key === 'isPublic'">
            <a-tag :color="record.isPublic ? 'blue' : 'default'" class="public-status-tag">
              {{ record.isPublic ? '租户公开' : '组织私有' }}
            </a-tag>
          </template>

          <!-- 启停状态：默认标准 22px a-switch，严禁加 small -->
          <template v-else-if="column.key === 'dataStatus'">
            <a-switch
              :checked="record.dataStatus === 1"
              :loading="statusChangingId === record.id"
              :disabled="!canWrite || !record.writable || statusChangingId === record.id"
              checked-children="启用"
              un-checked-children="停用"
              @change="(checked: boolean) => handleStatusChange(record, checked)"
            />
          </template>

          <!-- 发布状态 -->
          <template v-else-if="column.key === 'published'">
            <a-tag :color="record.published ? 'green' : 'orange'" class="publish-status-tag">
              {{ record.published ? '已发布' : '未发布' }}
            </a-tag>
          </template>

          <!-- 草稿配置变更状态 -->
          <template v-else-if="column.key === 'unpublishedChanges'">
            <a-tag
              v-if="record.published && record.unpublishedChanges"
              color="warning"
              class="changes-status-tag"
            >
              待发布变更
            </a-tag>
            <span v-else class="text-muted du-mono">—</span>
          </template>

          <!-- 更新时间 -->
          <template v-else-if="column.key === 'updateTime'">
            <span class="du-mono update-time-cell">{{ record.updateTime || '—' }}</span>
          </template>

          <!-- 操作列 -->
          <template v-else-if="column.key === 'actions'">
            <div class="row-actions">
              <!-- 查看基本详情：所有用户均可点击，只读用户不请求内部配置 -->
              <a-button type="link" size="small" @click="handleView(record)">
                <EyeOutlined />查看
              </a-button>

              <!-- 对话入口：正式在线对话 -->
              <a-button type="link" size="small" @click="handleChat(record)">
                <MessageOutlined />对话
              </a-button>

              <!-- 记录维护操作：要求菜单写权限且记录返回 writable === true -->
              <template v-if="canWrite && record.writable">
                <a-button type="link" size="small" @click="handleEdit(record)">
                  <EditOutlined />编辑
                </a-button>

                <a-popconfirm
                  title="确认立即发布此 Agent 的服务端草稿配置？"
                  ok-text="确认发布"
                  cancel-text="取消"
                  @confirm="handleFastPublish(record)"
                >
                  <a-button
                    type="link"
                    size="small"
                    :loading="publishingId === record.id"
                    :disabled="publishingId === record.id"
                  >
                    <CloudUploadOutlined />发布
                  </a-button>
                </a-popconfirm>

                <a-popconfirm
                  :title="`确定删除 Agent“${record.name}”？`"
                  ok-text="确定删除"
                  cancel-text="取消"
                  ok-type="danger"
                  @confirm="handleDelete(record)"
                >
                  <a-button
                    type="link"
                    size="small"
                    danger
                    :loading="deletingId === record.id"
                    :disabled="deletingId === record.id"
                  >
                    <DeleteOutlined />删除
                  </a-button>
                </a-popconfirm>
              </template>

              <!-- 只读账号或不可写记录兜底标签：杜绝操作列留白 -->
              <span v-else class="readonly-label">只读</span>
            </div>
          </template>
        </template>

        <template #emptyText>
          <a-empty description="暂无 Agent 数据" />
        </template>
      </a-table>
    </div>

    <!-- 创建 Agent 弹窗 -->
    <AgentCreateModal
      v-model:open="createModalOpen"
      @success="handleCreateSuccess"
    />

    <!-- 查看基本详情弹窗（只读） -->
    <AgentDetailModal
      v-model:open="detailModalOpen"
      :agent-id="currentSelectedId"
    />

    <!-- 编辑草稿与查看发布配置抽屉 -->
    <AgentEditDrawer
      v-model:open="editDrawerOpen"
      :agent-id="currentSelectedId"
      @success="handleDrawerSuccess"
    />

    <!-- 正式在线聊天抽屉 -->
    <AgentChatDrawer
      v-model:open="chatDrawerOpen"
      :agent="currentChatAgent"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { message, type TableColumnsType, type TablePaginationConfig } from 'ant-design-vue'
import {
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MessageOutlined,
  PlusOutlined,
  ReloadOutlined,
  RobotOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import { deleteAgent, getAgentPage, publishAgent, updateAgentStatus } from '@/apis/ai/agent'
import type { AgentMutationResult, AgentQuery, AgentSummary } from '@/apis/ai/agent/type'
import { getOrganizationLookup } from '@/apis/upms/organization'
import { menusStore } from '@/stores/modules/user'
import EllipsisText from '@/components/EllipsisText.vue'
import AgentCreateModal from './components/AgentCreateModal.vue'
import AgentDetailModal from './components/AgentDetailModal.vue'
import AgentEditDrawer from './components/AgentEditDrawer.vue'
import AgentChatDrawer from './components/AgentChatDrawer.vue'

const route = useRoute()

// 权限判定：统一通过 menusStore().canWritePath(route.path)
const canWrite = computed(() => menusStore().canWritePath(route.path))

// 表格列定义
const columns: TableColumnsType = [
  {
    title: '图标',
    dataIndex: 'avatarPath',
    key: 'avatarPath',
    width: 50,
    align: 'center',
  },
  {
    title: 'Agent 名称',
    dataIndex: 'name',
    key: 'name',
    width: 170,
  },
  {
    title: '所属组织',
    dataIndex: 'orgId',
    key: 'orgId',
    width: 150,
  },
  {
    title: '简介说明',
    dataIndex: 'description',
    key: 'description',
    width: 210,
  },
  {
    title: '公开范围',
    dataIndex: 'isPublic',
    key: 'isPublic',
    width: 100,
    align: 'center',
  },
  {
    title: '启停状态',
    dataIndex: 'dataStatus',
    key: 'dataStatus',
    width: 100,
    align: 'center',
  },
  {
    title: '发布状态',
    dataIndex: 'published',
    key: 'published',
    width: 100,
    align: 'center',
  },
  {
    title: '草稿变更',
    dataIndex: 'unpublishedChanges',
    key: 'unpublishedChanges',
    width: 110,
    align: 'center',
  },
  {
    title: '更新时间',
    dataIndex: 'updateTime',
    key: 'updateTime',
    width: 155,
  },
  {
    title: '操作',
    key: 'actions',
    width: 240,
    fixed: 'right',
    align: 'center',
  },
]

// 列表数据与分页状态
const records = ref<AgentSummary[]>([])
const loading = ref(false)
const total = ref(0)
const statusChangingId = ref<string | null>(null)
const publishingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)

// 组织名称映射缓存
const orgNameMap = reactive<Record<string, string>>({})

// 查询条件
const query = reactive<AgentQuery>({
  current: 1,
  size: 12,
  keyword: undefined,
  dataStatus: undefined,
  published: undefined,
})

// 分页组件参数
const pagination = computed<TablePaginationConfig>(() => ({
  current: query.current,
  pageSize: query.size,
  total: total.value,
  showSizeChanger: true,
  pageSizeOptions: ['12', '24', '48', '100'],
  showTotal: (totalCount) => `共 ${totalCount} 条`,
}))

// 弹窗与抽屉控制
const createModalOpen = ref(false)
const detailModalOpen = ref(false)
const editDrawerOpen = ref(false)
const chatDrawerOpen = ref(false)
const currentSelectedId = ref<string | null>(null)
const currentChatAgent = ref<AgentSummary | null>(null)

// 获取列表数据
const getList = async () => {
  loading.value = true
  try {
    const params: AgentQuery = {
      current: query.current,
      size: query.size,
      keyword: query.keyword?.trim() || undefined,
      dataStatus: query.dataStatus !== undefined ? query.dataStatus : undefined,
      published: query.published !== undefined ? query.published : undefined,
    }

    const res = await getAgentPage(params)
    const data = res.data
    records.value = data?.records || []
    total.value = data?.total || 0

    // 预解析组织名称
    const missingOrgIds = (records.value || [])
      .map((r) => r.orgId)
      .filter((id) => id && !orgNameMap[id])

    const uniqueOrgIds = Array.from(new Set(missingOrgIds))
    uniqueOrgIds.forEach((orgId) => {
      void getOrganizationLookup(orgId).then((resp) => {
        if (resp.data?.orgName) {
          orgNameMap[orgId] = resp.data.orgName
        }
      })
    })
  } catch {
    // 请求拦截器已弹出错误提示
  } finally {
    loading.value = false
  }
}

// 搜索与重置
const handleSearch = () => {
  query.current = 1
  void getList()
}

const handleFilterChange = () => {
  query.current = 1
  void getList()
}

const handleReset = () => {
  query.keyword = undefined
  query.dataStatus = undefined
  query.published = undefined
  query.current = 1
  void getList()
}

const handleTableChange = (pag: TablePaginationConfig) => {
  if (pag.current) query.current = pag.current
  if (pag.pageSize) query.size = pag.pageSize
  void getList()
}

// 头像加载错误回退
const handleCellAvatarError = (e: Event) => {
  const target = e.target as HTMLImageElement
  if (target) {
    target.style.display = 'none'
  }
}

// 打开新建
const handleAdd = () => {
  if (!canWrite.value) return
  createModalOpen.value = true
}

// 创建成功回调：刷新列表并询问是否立即配置
const handleCreateSuccess = (result: AgentMutationResult) => {
  void getList()
  currentSelectedId.value = result.id
  editDrawerOpen.value = true
}

// 查看基本详情
const handleView = (record: AgentSummary) => {
  currentSelectedId.value = record.id
  detailModalOpen.value = true
}

// 打开正式聊天抽屉
const handleChat = (record: AgentSummary) => {
  if (!record.published) {
    message.warning('该 Agent 尚未正式发布，请先发布或在编辑抽屉中进行草稿调试')
    return
  }
  if (record.dataStatus === 0) {
    message.warning('该 Agent 当前处于停用状态，请启用后再发起对话')
    return
  }
  currentChatAgent.value = record
  chatDrawerOpen.value = true
}

// 打开编辑抽屉
const handleEdit = (record: AgentSummary) => {
  if (!canWrite.value || !record.writable) return
  currentSelectedId.value = record.id
  editDrawerOpen.value = true
}

// 编辑保存或发布成功后的回调
const handleDrawerSuccess = () => {
  void getList()
}

// 快速发布
const handleFastPublish = async (record: AgentSummary) => {
  if (!canWrite.value || !record.writable) return
  publishingId.value = record.id
  try {
    const res = await publishAgent(record.id, { version: record.version })
    record.version = res.data.version
    message.success(`Agent“${record.name}”发布成功`)
    void getList()
  } catch {
    // 拦截器处理
  } finally {
    publishingId.value = null
  }
}

// 状态启停切换
const handleStatusChange = async (record: AgentSummary, targetChecked: boolean) => {
  if (!canWrite.value || !record.writable) return
  if (statusChangingId.value) return

  const targetStatus = targetChecked ? 1 : 0
  statusChangingId.value = record.id
  try {
    const res = await updateAgentStatus(record.id, {
      dataStatus: targetStatus,
      version: record.version,
    })
    record.dataStatus = targetStatus
    record.version = res.data.version
    message.success(`已${targetChecked ? '启用' : '停用'} Agent“${record.name}”`)
  } catch {
    // 失败不乐观假定成功，重新拉取行状态
    void getList()
  } finally {
    statusChangingId.value = null
  }
}

// 逻辑删除
const handleDelete = async (record: AgentSummary) => {
  if (!canWrite.value || !record.writable) return
  deletingId.value = record.id
  try {
    await deleteAgent(record.id, record.version)
    message.success(`Agent“${record.name}”已删除`)
    // 修正空页
    if (records.value.length === 1 && query.current > 1) {
      query.current -= 1
    }
    void getList()
  } catch {
    // 拦截器处理
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  void getList()
})
</script>

<style scoped>
.agent-page {
  width: 100%;
}

.table-panel {
  padding: 12px 16px 16px;
  background: var(--du-bg-container, #ffffff);
}

.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.table-avatar-cell {
  width: 22px;
  height: 22px;
  border-radius: var(--du-border-radius, 3px);
  border: 1px solid var(--du-border, #e8e8e8);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  vertical-align: middle;
  background: var(--du-bg-container, #fafafa);
}

.cell-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cell-avatar-fallback {
  font-size: 12px;
  color: var(--du-primary, #1677ff);
}

.agent-name-cell {
  font-size: var(--du-font-size-sm, 12px);
  font-weight: 400;
  color: var(--du-text, #262626);
}

.public-status-tag,
.publish-status-tag,
.changes-status-tag {
  font-size: var(--du-font-size-xs, 11px);
  line-height: 18px;
  padding: 0 6px;
  margin: 0;
}

.update-time-cell {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary, #595959);
}

.row-actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  flex-wrap: nowrap;
  gap: 2px;
}

.readonly-label {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted, #8c8c8c);
  line-height: 24px;
}

.text-muted {
  color: var(--du-text-muted, #8c8c8c);
}
</style>
