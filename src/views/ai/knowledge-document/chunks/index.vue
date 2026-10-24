<template>
  <div class="chunk-management-page">
    <!-- 顶部全局头部导航条 -->
    <header class="page-top-header du-panel">
      <div class="header-left">
        <a-button type="link" size="small" class="back-btn" @click="handleBack">
          <ArrowLeftOutlined /> 返回列表
        </a-button>
        <a-divider type="vertical" />
        <FileTypeIcon :file-type="documentState?.fileType" class="doc-icon" />
        <span class="document-name" :title="documentState?.documentName">
          {{ documentState?.documentName || '文档分片管理' }}
        </span>
        <DictTag
          v-if="documentState?.chunkStatus"
          :type-code="KNOWLEDGE_DICT_TYPE.CHUNK_STATUS"
          :value="documentState.chunkStatus"
          class="status-tag"
        />
        <a-tag
          v-if="documentState?.isPublic !== undefined"
          :color="documentState.isPublic ? 'blue' : 'default'"
          class="public-tag"
        >
          {{ documentState.isPublic ? '共享' : '私有' }}
        </a-tag>
        <span v-if="!canMaintain" class="readonly-badge">
          只读
        </span>
        <span v-if="documentState?.chunkCount !== undefined" class="header-count-text">
          共 {{ documentState.chunkCount }} 个分片
          <span v-if="documentState.tokenCountTokenizer" class="tokenizer-label du-mono">
            ({{ documentState.tokenCountTokenizer }})
          </span>
        </span>
      </div>

      <div class="header-right">
        <!-- 生成中全局提示 -->
        <div v-if="isGenerating" class="generating-indicator">
          <LoadingOutlined spin />
          <span>正在生成分片中，每 3 秒同步状态...</span>
        </div>

        <template v-if="!isInitialUnprocessed">
          <a-button
            :disabled="isGenerating"
            @click="paramDrawerOpen = true"
          >
            <SettingOutlined /> 调整参数
          </a-button>

          <a-popconfirm
            title="重新生成将覆盖现有分片及所有修改（生成失败将保留原有分片）。确定要重新生成吗？"
            ok-text="确定重新生成"
            cancel-text="取消"
            :disabled="!canMaintain || isGenerating"
            @confirm="handleTriggerRegenerate"
          >
            <a-button
              :disabled="!canMaintain || isGenerating"
              :loading="isGenerating"
            >
              <RedoOutlined /> 重新生成
            </a-button>
          </a-popconfirm>

          <a-button
            type="primary"
            :disabled="!hasUnsavedChanges || !canMaintain || isGenerating"
            :loading="saveLoading"
            @click="handleSave"
          >
            <SaveOutlined /> 保存修改
            <span v-if="hasUnsavedChanges">({{ modifiedCount }})</span>
          </a-button>

          <a-popconfirm
            title="确认分片结果？人工确认后分片将标记为已确认（如后续再次修改将自动回到待确认）。"
            ok-text="确认分片"
            cancel-text="取消"
            :disabled="!canMaintain || isGenerating || !hasChunks"
            @confirm="handleConfirm"
          >
            <a-button
              type="primary"
              ghost
              :disabled="!canMaintain || isGenerating || !hasChunks"
              :loading="confirmLoading"
            >
              <CheckOutlined /> 确认分片
            </a-button>
          </a-popconfirm>
        </template>
      </div>
    </header>

    <!-- 顶部告警提示：失败或异常反馈 -->
    <a-alert
      v-if="documentState?.chunkStatus === 'failed' && documentState?.chunkErrorMessage"
      :message="`分片生成失败：${documentState.chunkErrorMessage}。${documentState.chunkCount > 0 ? '已保留最近一次成功生成的分片数据，仍可继续查看与修改。' : ''}`"
      type="warning"
      show-icon
      banner
      class="state-alert"
    />

    <!-- 模式一：首次未生成视图 -->
    <main v-if="isInitialUnprocessed" class="initial-config-view du-panel">
      <div class="config-container">
        <div class="config-header">
          <h2 class="config-title">生成文档分片</h2>
          <p class="config-subtitle">
            文档“{{ documentState?.documentName }}”尚未生成分片。请确认分片参数后开始首次生成。
          </p>
        </div>

        <a-alert
          v-if="!canMaintain"
          type="info"
          message="当前账号或资料仅具备共享读取权限，无法调整参数或开始生成分片。"
          show-icon
          style="margin-bottom: 16px;"
        />

        <div class="config-form-wrap">
          <ChunkParametersForm
            :model-value="chunkForm"
            :file-type="documentState?.fileType"
            :disabled="!canMaintain || isGenerating"
          />
        </div>

        <div class="config-footer">
          <a-button
            type="primary"
            size="large"
            :loading="isGenerating"
            :disabled="!canMaintain"
            class="start-generate-btn"
            @click="handleStartGenerate"
          >
            <PlayCircleOutlined /> 开始生成分片
          </a-button>
        </div>
      </div>
    </main>

    <!-- 模式二：已有分片工作台视图 -->
    <main v-else class="workbench-view">
      <!-- 分片被全部删除后的空状态 -->
      <div v-if="!hasChunks" class="empty-workbench-container du-panel">
        <a-empty description="当前文档分片已全部删除">
          <template #extra>
            <div class="empty-workbench-actions">
              <a-popconfirm
                title="重新生成将覆盖现有分片配置并按原文重新切分（之前删除的内容可能再次出现）。确定重新生成吗？"
                ok-text="确定重新生成"
                cancel-text="取消"
                :disabled="!canMaintain || isGenerating"
                @confirm="handleTriggerRegenerate"
              >
                <a-button
                  type="primary"
                  :disabled="!canMaintain || isGenerating"
                  :loading="isGenerating"
                >
                  <RedoOutlined /> 重新生成分片
                </a-button>
              </a-popconfirm>
              <p class="empty-regenerate-tip">
                提示：重新生成会按原文重新切分，之前删除的内容可能再次出现。
              </p>
            </div>
          </template>
        </a-empty>
      </div>

      <template v-else>
        <!-- 左侧：分页分片列表与多选相邻合并 -->
        <ChunkListSidebar
          :chunks="chunkList"
          :all-ordered-ids="allPageChunkIds"
          :active-chunk-id="activeChunkId"
          :selected-chunk-ids="selectedChunkIds"
          :dirty-chunk-ids="dirtyChunkIdSet"
          :modified-content-map="modifiedContentMap"
          :loading="listLoading"
          :merge-loading="mergeLoading"
          :can-write="canMaintain"
          :current="queryParams.current"
          :size="queryParams.size"
          :total="listTotal"
          @update:active-chunk-id="activeChunkId = $event"
          @update:selected-chunk-ids="selectedChunkIds = $event"
          @page-change="handlePageChange"
          @merge="handleMerge"
        />

        <!-- 右侧：当前分片正文编辑器与来源元信息 -->
        <ChunkEditor
          :chunk="activeChunk"
          :display-index="activeDisplayIndex"
          :modified-content="activeModifiedContent"
          :can-write="canMaintain"
          :disabled="isGenerating"
          :delete-loading="deleteLoading"
          @update:modified-content="handleActiveContentChange"
          @revert="handleRevertActiveChunk"
          @delete="handleDeleteChunk"
          @split="handleOpenSplitModal"
        />
      </template>
    </main>

    <!-- 调整参数侧边抽屉 -->
    <ChunkParametersDrawer
      v-model:open="paramDrawerOpen"
      :form="chunkForm"
      :file-type="documentState?.fileType"
      :loading="isGenerating"
      :can-write="canMaintain"
      @regenerate="handleDrawerRegenerate"
    />

    <!-- 在光标处拆分分片弹窗 -->
    <ChunkSplitModal
      v-model:open="splitModalOpen"
      :chunk="splitTargetChunk"
      :initial-first-content="splitFirstContent"
      :initial-second-content="splitSecondContent"
      :loading="splitLoading"
      @confirm="handleConfirmSplit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  ArrowLeftOutlined,
  CheckOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
  RedoOutlined,
  SaveOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'
import { menusStore } from '@/stores/modules/user'
import {
  confirmChunks,
  deleteChunk,
  generateChunks,
  getChunkPage,
  getChunkState,
  mergeChunks,
  splitChunk,
  updateChunks,
} from '@/apis/ai/document'
import type {
  KnowledgeChunkItem,
  KnowledgeChunkSaveItem,
  KnowledgeChunkState,
} from '@/apis/ai/document/type'
import { KNOWLEDGE_DICT_TYPE } from '@/constant'
import DictTag from '@/components/DictTag.vue'
import FileTypeIcon from '../components/FileTypeIcon.vue'
import ChunkParametersForm from './components/ChunkParametersForm.vue'
import ChunkParametersDrawer from './components/ChunkParametersDrawer.vue'
import ChunkListSidebar from './components/ChunkListSidebar.vue'
import ChunkEditor from './components/ChunkEditor.vue'
import ChunkSplitModal from './components/ChunkSplitModal.vue'
import type { ChunkFormState } from './helper'
import {
  buildChunkParameters,
  initializeChunkForm,
  validateChunkParameters,
} from './helper'

const route = useRoute()
const router = useRouter()
const documentId = String(route.params.id || '')

// 页面操作权限继承父级知识库资料菜单
const canWrite = computed(() => menusStore().canWritePath('/ai/knowledge-documents'))

// 维护权限同时要求菜单写权限且当前角色数据范围允许维护（documentState.writable !== false）
// 严禁根据 isPublic 推断维护权限
const canMaintain = computed(() => {
  if (!canWrite.value) return false
  if (documentState.value && documentState.value.writable === false) return false
  return true
})

// 状态对象与表单配置
const documentState = ref<KnowledgeChunkState | null>(null)
const chunkForm = ref<ChunkFormState>(initializeChunkForm())

// 加载态控制
const pageLoading = ref(false)
const listLoading = ref(false)
const isGenerating = ref(false)
const saveLoading = ref(false)
const mergeLoading = ref(false)
const confirmLoading = ref(false)
const deleteLoading = ref(false)
const splitLoading = ref(false)
const paramDrawerOpen = ref(false)
const splitModalOpen = ref(false)

// 拆分状态与缓存
const splitTargetChunk = ref<KnowledgeChunkItem | null>(null)
const splitFirstContent = ref('')
const splitSecondContent = ref('')

// 分页与列表数据
const queryParams = reactive({
  current: 1,
  size: 20,
})
const chunkList = ref<KnowledgeChunkItem[]>([])
const listTotal = ref(0)
const activeChunkId = ref<string | null>(null)
const selectedChunkIds = ref<string[]>([])

// 未保存修改追踪字典：key 为 chunkId，value 为用户编辑后的文本
const modifiedContentMap = ref<Map<string, string>>(new Map())

// 轮询定时器引用
let pollTimer: ReturnType<typeof setInterval> | null = null

/**
 * 判断是否为首次未生成状态（仅从未生成时显示首次配置界面）
 */
const isInitialUnprocessed = computed(() => {
  if (!documentState.value) return true
  return documentState.value.chunkStatus === 'unprocessed'
})

const hasChunks = computed(() => (documentState.value?.chunkCount ?? 0) > 0)

const hasUnsavedChanges = computed(() => modifiedContentMap.value.size > 0)
const modifiedCount = computed(() => modifiedContentMap.value.size)
const dirtyChunkIdSet = computed(() => new Set(modifiedContentMap.value.keys()))

const allPageChunkIds = computed(() => chunkList.value.map((c) => c.id))

const activeChunk = computed(() => {
  if (!activeChunkId.value) return chunkList.value[0] || null
  return chunkList.value.find((c) => c.id === activeChunkId.value) || chunkList.value[0] || null
})

const activeDisplayIndex = computed(() => {
  if (!activeChunk.value) return 1
  const idx = chunkList.value.findIndex((c) => c.id === activeChunk.value?.id)
  if (idx === -1) return 1
  return (queryParams.current - 1) * queryParams.size + idx + 1
})

const activeModifiedContent = computed(() => {
  if (!activeChunk.value) return undefined
  if (modifiedContentMap.value.has(activeChunk.value.id)) {
    return modifiedContentMap.value.get(activeChunk.value.id)
  }
  return undefined
})

/**
 * 加载当前文档分片最新全局状态
 */
const loadState = async (silence = false) => {
  if (!documentId) return
  if (!silence) pageLoading.value = true
  try {
    const res = await getChunkState(documentId)
    const state = res.data
    // 轮询 state 不能悄悄更新正在编辑内容对应的版本基线
    if (!hasUnsavedChanges.value || !documentState.value) {
      documentState.value = state
    } else {
      // 保留正在编辑的基线 version，仅更新状态与数量
      documentState.value = {
        ...state,
        version: documentState.value.version,
      }
    }

    // 初始化表单配置
    if (state.chunkParameters) {
      chunkForm.value = initializeChunkForm(state.chunkParameters, state.fileType)
    } else if (state.fileType) {
      chunkForm.value = initializeChunkForm(null, state.fileType)
    }

    // 检查是否在生成中，如果是则触发轮询
    if (state.chunkStatus === 'generating') {
      startPolling()
    } else {
      stopPolling()
    }

    return state
  } catch (err) {
    if (!silence) {
      message.error('获取文档分片状态失败')
    }
    throw err
  } finally {
    if (!silence) pageLoading.value = false
  }
}

/**
 * 加载分片分页列表
 */
const loadChunkPage = async () => {
  if (!documentId) return
  listLoading.value = true
  try {
    const res = await getChunkPage(documentId, {
      current: queryParams.current,
      size: queryParams.size,
    })
    const pageData = res.data
    chunkList.value = pageData.records || []
    listTotal.value = pageData.total || 0

    // 如果当前选中的分片不在列表中，定位为第一个
    if (
      chunkList.value.length > 0 &&
      (!activeChunkId.value || !chunkList.value.some((c) => c.id === activeChunkId.value))
    ) {
      activeChunkId.value = chunkList.value[0].id
    }
  } catch {
    /* 请求拦截层已提示 */
  } finally {
    listLoading.value = false
  }
}

/**
 * 轮询处理
 */
const startPolling = () => {
  if (pollTimer) return
  isGenerating.value = true
  pollTimer = setInterval(async () => {
    try {
      const res = await getChunkState(documentId)
      const state = res.data
      if (state.chunkStatus !== 'generating') {
        stopPolling()
        documentState.value = state
        if (state.chunkStatus === 'draft' || state.chunkStatus === 'confirmed') {
          message.success('分片生成完成')
          queryParams.current = 1
          await loadChunkPage()
        } else if (state.chunkStatus === 'failed') {
          message.error(state.chunkErrorMessage || '分片生成失败')
          if (state.chunkCount > 0) {
            await loadChunkPage()
          }
        }
      }
    } catch {
      // 轮询异常静默重试
    }
  }, 3000)
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  isGenerating.value = false
}

/**
 * 执行生成分片接口调用
 */
const executeGenerate = async (form: ChunkFormState) => {
  if (!documentState.value) return
  if (!canMaintain.value) return
  if (isGenerating.value) {
    message.warning('当前正在生成中，请勿重复发起')
    return
  }

  // 参数规则校验
  const validationError = validateChunkParameters(form)
  if (validationError) {
    message.error(validationError)
    return
  }

  const parameters = buildChunkParameters(form, documentState.value.fileType)
  const timeoutMs = (form.documentTimeoutSeconds + 150) * 1000

  isGenerating.value = true
  startPolling()

  try {
    const res = await generateChunks(
      documentId,
      {
        version: documentState.value.version,
        parameters,
      },
      timeoutMs
    )
    const latestState = res.data
    documentState.value = latestState
    // 检查 chunkStatus
    if (latestState.chunkStatus === 'draft' || latestState.chunkStatus === 'confirmed') {
      stopPolling()
      message.success('分片生成成功')
      queryParams.current = 1
      modifiedContentMap.value.clear()
      await loadChunkPage()
    } else if (latestState.chunkStatus === 'failed') {
      stopPolling()
      message.error(latestState.chunkErrorMessage || '分片生成失败')
      if (latestState.chunkCount > 0) {
        await loadChunkPage()
      }
    }
  } catch {
    // HTTP 超时或网络异常：先查询 state，不要自动重发生成请求
    try {
      const stateRes = await getChunkState(documentId)
      const st = stateRes.data
      documentState.value = st
      if (st.chunkStatus === 'draft' || st.chunkStatus === 'confirmed') {
        stopPolling()
        message.success('分片生成完成')
        await loadChunkPage()
      } else if (st.chunkStatus === 'failed') {
        stopPolling()
        message.error(st.chunkErrorMessage || '分片生成失败')
      } else if (st.chunkStatus === 'generating') {
        message.info('分片生成任务已在后台执行，正在等待完成...')
        startPolling()
      }
    } catch {
      stopPolling()
    }
  }
}

/**
 * 首次未生成页面的生成按钮
 */
const handleStartGenerate = () => {
  void executeGenerate(chunkForm.value)
}

/**
 * 调整参数抽屉中的重新生成
 */
const handleDrawerRegenerate = (form: ChunkFormState) => {
  paramDrawerOpen.value = false
  chunkForm.value = form
  void executeGenerate(form)
}

/**
 * 顶部导航中的重新生成
 */
const handleTriggerRegenerate = () => {
  void executeGenerate(chunkForm.value)
}

/**
 * 编辑器正文变动
 */
const handleActiveContentChange = (content: string) => {
  if (!activeChunk.value) return
  const original = activeChunk.value.content
  if (content === original) {
    modifiedContentMap.value.delete(activeChunk.value.id)
  } else {
    modifiedContentMap.value.set(activeChunk.value.id, content)
  }
}

/**
 * 还原当前编辑分片为原始内容
 */
const handleRevertActiveChunk = () => {
  if (!activeChunk.value) return
  modifiedContentMap.value.delete(activeChunk.value.id)
}

/**
 * 保存修改接口
 */
const saveModifiedChunks = async (): Promise<KnowledgeChunkState | null> => {
  if (!documentState.value || !hasUnsavedChanges.value) return documentState.value
  if (!canMaintain.value) return null

  const items: KnowledgeChunkSaveItem[] = []
  for (const [id, content] of modifiedContentMap.value.entries()) {
    if (!content || !content.trim()) {
      message.error('分片正文不能为空白')
      return null
    }
    if (content.length > 200000) {
      message.error('单片正文上限为 200,000 字符')
      return null
    }
    items.push({ id, content })
  }

  if (items.length > 200) {
    message.error('单次最多提交 200 个分片修改')
    return null
  }

  saveLoading.value = true
  try {
    const res = await updateChunks(documentId, {
      version: documentState.value.version,
      chunks: items,
    })
    const latestState = res.data
    documentState.value = latestState

    // 内存就地同步修改内容
    items.forEach((saved) => {
      const match = chunkList.value.find((c) => c.id === saved.id)
      if (match) {
        match.content = saved.content
      }
    })
    modifiedContentMap.value.clear()
    message.success('分片修改已保存')
    return latestState
  } catch (err: any) {
    // 遇到版本冲突时提示用户刷新，不自动重试
    if (err?.response?.status === 409 || err?.data?.code === 4009) {
      message.error('检测到数据版本冲突，请刷新页面重新获取最新分片')
    }
    throw err
  } finally {
    saveLoading.value = false
  }
}

const handleSave = () => {
  void saveModifiedChunks()
}

/**
 * 合并连续相邻分片
 */
const handleMerge = async (orderedSelectedIds: string[]) => {
  if (!documentState.value) return
  if (!canMaintain.value) return

  Modal.confirm({
    title: '确认合并分片',
    content: `确定将选中的 ${orderedSelectedIds.length} 个连续相邻分片合并为一个分片吗？`,
    okText: '确认合并',
    cancelText: '取消',
    onOk: async () => {
      mergeLoading.value = true
      try {
        // 先保存未提交的修改，再用保存接口返回的新 version 发起合并
        let currentVersion = documentState.value?.version
        if (hasUnsavedChanges.value) {
          const savedState = await saveModifiedChunks()
          if (!savedState) return
          currentVersion = savedState.version
        }

        const res = await mergeChunks(documentId, {
          version: currentVersion!,
          chunkIds: orderedSelectedIds,
        })
        const latestState = res.data
        documentState.value = latestState

        message.success('分片合并成功')
        selectedChunkIds.value = []

        // 合并后刷新列表，定位保留下来的第一个分片
        await loadChunkPage()
        activeChunkId.value = orderedSelectedIds[0]
      } catch (err: any) {
        if (err?.response?.status === 409 || err?.data?.code === 4009) {
          message.error('检测到数据版本冲突，请刷新页面后重试')
        }
      } finally {
        mergeLoading.value = false
      }
    },
  })
}

/**
 * 删除当前选中的分片
 */
const handleDeleteChunk = () => {
  if (!activeChunk.value || !documentState.value) return
  if (!canMaintain.value) return
  if (isGenerating.value) {
    message.warning('当前正在生成分片中，无法删除分片')
    return
  }

  // 1. 存在未保存修改时，提示用户先保存或放弃
  if (hasUnsavedChanges.value) {
    Modal.warning({
      title: '无法删除分片',
      content: '当前存在未保存的分片修改，请先点击右上角“保存修改”或还原修改内容后再删除分片。',
      okText: '知道了',
    })
    return
  }

  const deletingChunk = activeChunk.value
  const deletingChunkId = deletingChunk.id
  const displayIdx = activeDisplayIndex.value
  const currentVersion = documentState.value.version

  // 2. 删除前确认
  Modal.confirm({
    title: '确认删除分片',
    content: `确定删除分片 #${displayIdx} 吗？删除后该分片将被移除（后续若重新生成，将按原文重新切分，已删除内容可能再次出现）。`,
    okText: '确认删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      // 3. 计算下一片或上一片的 ID（优先选中下一片，没有下一片则选中上一片）
      const currentIndex = chunkList.value.findIndex((c) => c.id === deletingChunkId)
      let nextCandidateId: string | null = null
      if (currentIndex > -1) {
        if (currentIndex + 1 < chunkList.value.length) {
          nextCandidateId = chunkList.value[currentIndex + 1].id
        } else if (currentIndex - 1 >= 0) {
          nextCandidateId = chunkList.value[currentIndex - 1].id
        }
      }

      deleteLoading.value = true
      try {
        const res = await deleteChunk(documentId, deletingChunkId, currentVersion)
        const latestState = res.data
        // 成功后更新 version、数量和状态
        documentState.value = latestState

        // 清理选中状态
        selectedChunkIds.value = selectedChunkIds.value.filter((id) => id !== deletingChunkId)

        message.success('分片已删除')

        // 删除全部分片后展示空状态
        if ((latestState.chunkCount ?? 0) === 0) {
          chunkList.value = []
          listTotal.value = 0
          activeChunkId.value = null
          return
        }

        // 当前分页为空时退回上一页
        if (chunkList.value.length <= 1 && queryParams.current > 1) {
          queryParams.current -= 1
          await loadChunkPage()
          if (chunkList.value.length > 0) {
            activeChunkId.value = chunkList.value[chunkList.value.length - 1].id
          }
        } else {
          await loadChunkPage()
          if (nextCandidateId && chunkList.value.some((c) => c.id === nextCandidateId)) {
            activeChunkId.value = nextCandidateId
          } else if (chunkList.value.length > 0) {
            const safeIdx = Math.min(currentIndex, chunkList.value.length - 1)
            activeChunkId.value = chunkList.value[Math.max(0, safeIdx)].id
          } else {
            activeChunkId.value = null
          }
        }
      } catch (err: any) {
        if (err?.response?.status === 409 || err?.data?.code === 4009) {
          message.error('检测到数据版本冲突，请刷新页面重新获取最新分片')
        }
      } finally {
        deleteLoading.value = false
      }
    },
  })
}

/**
 * 打开在光标处拆分预览弹窗
 */
const handleOpenSplitModal = (payload: {
  chunk: KnowledgeChunkItem
  firstContent: string
  secondContent: string
}) => {
  if (!canMaintain.value) return
  if (isGenerating.value) {
    message.warning('当前正在生成分片中，无法拆分分片')
    return
  }

  splitTargetChunk.value = payload.chunk
  splitFirstContent.value = payload.firstContent
  splitSecondContent.value = payload.secondContent
  splitModalOpen.value = true
}

/**
 * 确认执行拆分接口
 */
const handleConfirmSplit = async (payload: { firstContent: string; secondContent: string }) => {
  if (!documentState.value || !splitTargetChunk.value) return
  if (!canMaintain.value) return
  if (isGenerating.value) {
    message.warning('当前正在生成分片中，无法拆分分片')
    return
  }

  const targetChunkId = splitTargetChunk.value.id
  splitLoading.value = true

  try {
    // 检查其他分片是否存在未保存修改
    // “其他分片存在未保存修改时，先处理这些修改，再使用最新版本拆分。无需先保存当前分片。”
    const otherDirtyItems: KnowledgeChunkSaveItem[] = []
    for (const [id, content] of modifiedContentMap.value.entries()) {
      if (id !== targetChunkId) {
        if (!content || !content.trim()) {
          message.error('其他未保存分片正文不能为空白，请先检查或保存修改')
          splitLoading.value = false
          return
        }
        if (content.length > 200000) {
          message.error('其他未保存分片正文上限为 200,000 字符')
          splitLoading.value = false
          return
        }
        otherDirtyItems.push({ id, content })
      }
    }

    let currentVersion = documentState.value.version

    if (otherDirtyItems.length > 0) {
      if (otherDirtyItems.length > 200) {
        message.error('其他未保存分片数量超出单次保存上限 (200)')
        splitLoading.value = false
        return
      }
      const saveRes = await updateChunks(documentId, {
        version: currentVersion,
        chunks: otherDirtyItems,
      })
      const savedState = saveRes.data
      documentState.value = savedState
      currentVersion = savedState.version

      // 内存同步其他分片已保存的内容
      otherDirtyItems.forEach((saved) => {
        const match = chunkList.value.find((c) => c.id === saved.id)
        if (match) {
          match.content = saved.content
        }
        modifiedContentMap.value.delete(saved.id)
      })
    }

    // 调用拆分接口
    const splitRes = await splitChunk(documentId, targetChunkId, {
      version: currentVersion,
      firstContent: payload.firstContent,
      secondContent: payload.secondContent,
    })

    const latestState = splitRes.data
    // 成功后更新 version、chunkCount、chunkStatus 等状态
    documentState.value = latestState

    // 清理当前分片的本地修改缓存
    modifiedContentMap.value.delete(targetChunkId)

    message.success('分片拆分成功')
    splitModalOpen.value = false

    // 刷新分片列表，保持选中原分片 ID（它现在是第一片）
    await loadChunkPage()
    activeChunkId.value = targetChunkId
  } catch (err: any) {
    if (err?.response?.status === 409 || err?.data?.code === 4009) {
      message.error('检测到数据版本冲突，请刷新页面重新获取最新分片')
    }
    // 请求失败或版本冲突时保留预览内容，不关闭弹窗，不自动重试覆盖
  } finally {
    splitLoading.value = false
  }
}

/**
 * 确认分片
 */
const handleConfirm = async () => {
  if (!documentState.value) return
  if (!canMaintain.value || !hasChunks.value) return

  confirmLoading.value = true
  try {
    // 存在未保存修改时先保存，再使用最新 version 确认
    let currentVersion = documentState.value.version
    if (hasUnsavedChanges.value) {
      const savedState = await saveModifiedChunks()
      if (!savedState) return
      currentVersion = savedState.version
    }

    const res = await confirmChunks(documentId, {
      version: currentVersion,
    })
    documentState.value = res.data
    message.success('分片结果已确认')
  } catch (err: any) {
    if (err?.response?.status === 409 || err?.data?.code === 4009) {
      message.error('检测到数据版本冲突，请刷新页面后重试')
    }
  } finally {
    confirmLoading.value = false
  }
}

/**
 * 分页切换
 */
const handlePageChange = (page: number, pageSize: number) => {
  queryParams.current = page
  queryParams.size = pageSize
  void loadChunkPage()
}

/**
 * 返回列表与离开页面拦截
 */
const handleBack = () => {
  if (hasUnsavedChanges.value) {
    Modal.confirm({
      title: '离开页面确认',
      content: '当前存在未保存的分片修改，离开后修改内容将丢失。确定要离开吗？',
      okText: '确定离开',
      cancelText: '留下保存',
      onOk: () => {
        router.push('/ai/knowledge-documents')
      },
    })
  } else {
    router.push('/ai/knowledge-documents')
  }
}

// Vue Router 路由守卫拦截
onBeforeRouteLeave((_to, _from, next) => {
  if (hasUnsavedChanges.value) {
    Modal.confirm({
      title: '离开页面确认',
      content: '当前存在未保存的分片修改，离开后修改内容将丢失。确定要离开吗？',
      okText: '确定离开',
      cancelText: '取消',
      onOk: () => {
        next()
      },
      onCancel: () => {
        next(false)
      },
    })
  } else {
    next()
  }
})

// 浏览器窗口关闭 / 刷新拦截
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (hasUnsavedChanges.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  try {
    const state = await loadState()
    if (state && state.chunkCount > 0) {
      await loadChunkPage()
    }
  } catch {
    /* 获取状态失败 */
  }
})

onBeforeUnmount(() => {
  stopPolling()
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style scoped>
.chunk-management-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 72px);
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  background: var(--du-bg-app, #f1f5f9);
}

.page-top-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 44px;
  min-height: 44px;
  border-bottom: 1px solid var(--du-border-subtle, #e2e8f0);
  background: var(--du-bg-surface, #ffffff);
  border-radius: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.back-btn {
  padding: 0;
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary, #475569);
}

.doc-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.document-name {
  font-size: var(--du-font-size-base, 12px);
  font-weight: 600;
  color: var(--du-text-primary, #0f172a);
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-tag {
  margin: 0;
}

.public-tag {
  margin: 0;
  font-size: var(--du-font-size-xs, 11px);
  line-height: 18px;
  padding: 0 6px;
  border-radius: var(--du-radius-sm, 3px);
}

.readonly-badge {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted, #64748b);
  background: var(--du-bg-subtle, #f1f5f9);
  border: 1px solid var(--du-border-subtle, #cbd5e1);
  padding: 1px 6px;
  border-radius: var(--du-radius-sm, 3px);
  line-height: 18px;
}

.header-count-text {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted, #64748b);
  margin-left: 6px;
}

.tokenizer-label {
  font-size: 10px;
  color: #0284c7;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.generating-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--du-font-size-xs, 11px);
  color: #0284c7;
  padding: 2px 8px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 4px;
}

.state-alert {
  font-size: 12px;
  padding: 6px 16px;
}

/* 首次未生成视图 */
.initial-config-view {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  justify-content: center;
  background: var(--du-bg-surface, #ffffff);
  border-radius: 0;
  border-top: none;
}

.config-container {
  width: 100%;
  max-width: 840px;
  display: flex;
  flex-direction: column;
}

.config-header {
  margin-bottom: 20px;
}

.config-title {
  font-size: var(--du-font-size-lg, 14px);
  font-weight: 600;
  color: var(--du-text-primary, #0f172a);
  margin: 0 0 6px 0;
}

.config-subtitle {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted, #64748b);
  margin: 0;
}

.config-form-wrap {
  margin-bottom: 24px;
}

.config-footer {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.start-generate-btn {
  min-width: 200px;
  height: 38px;
  font-size: 13px;
  border-radius: var(--du-radius-sm, 4px);
}

/* 已有分片工作台视图 */
.workbench-view {
  display: flex;
  flex: 1;
  overflow: hidden;
  height: calc(100% - 44px);
}

.empty-workbench-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--du-bg-surface, #ffffff);
  border-radius: 0;
  border-top: none;
  height: 100%;
}

.empty-workbench-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.empty-regenerate-tip {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted, #64748b);
  margin: 0;
}
</style>
