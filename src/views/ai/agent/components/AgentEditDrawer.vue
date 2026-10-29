<template>
  <a-drawer
    :open="open"
    :title="drawerTitle"
    :width="1000"
    :mask-closable="false"
    :destroy-on-close="true"
    class="agent-edit-drawer"
    @close="handleClose"
  >
    <template #extra>
      <div class="drawer-header-extra">
        <a-tag v-if="isDirty" color="warning" class="status-tag">有未保存修改</a-tag>
        <a-tag v-if="summary?.published" color="green" class="status-tag">已发布</a-tag>
        <a-tag v-else color="default" class="status-tag">未发布</a-tag>
        <span v-if="currentVersion" class="du-mono version-badge">v{{ currentVersion }}</span>

        <a-button
          :type="activeTabKey === 'debug' ? 'primary' : 'default'"
          class="debug-toggle-btn"
          @click="activeTabKey = activeTabKey === 'debug' ? 'draft' : 'debug'"
        >
          <BugOutlined />
          {{ activeTabKey === 'debug' ? '返回配置编辑' : '在线调试草稿' }}
        </a-button>

        <a-button
          type="default"
          :loading="saveLoading"
          :disabled="publishLoading"
          @click="handleSaveDraft"
        >
          保存草稿
        </a-button>

        <a-button
          type="primary"
          :loading="publishLoading"
          :disabled="saveLoading"
          @click="handlePublishConfirm"
        >
          立即发布
        </a-button>
      </div>
    </template>

    <a-spin :spinning="initialLoading">
      <div v-if="summary" class="drawer-body">
        <a-tabs v-model:activeKey="activeTabKey" class="config-tabs">
          <!-- Tab 1: 草稿配置编辑 -->
          <a-tab-pane key="draft" tab="草稿配置编辑">
            <a-form
              ref="formRef"
              :model="formState"
              layout="vertical"
              class="compact-form"
            >
              <!-- 分区 1：基本信息 -->
              <div class="section-card">
                <div class="section-header">
                  <span class="section-title">基本信息</span>
                  <span class="section-desc">修改基本信息将即时生效，无需发布</span>
                </div>

                <a-row :gutter="16">
                  <a-col :span="12">
                    <a-form-item label="所属组织/部门" extra="所属组织不可修改">
                      <a-input :value="orgName || formState.orgId" disabled class="du-mono" />
                    </a-form-item>
                  </a-col>

                  <a-col :span="12">
                    <a-form-item
                      label="Agent 名称"
                      name="name"
                      :rules="[{ required: true, message: '请输入 Agent 名称', trigger: 'blur' }, { max: 100, message: '名称最长 100 字符', trigger: 'blur' }]"
                    >
                      <a-input
                        v-model:value="formState.name"
                        placeholder="请输入 Agent 名称"
                        :maxlength="100"
                        show-count
                        allow-clear
                      />
                    </a-form-item>
                  </a-col>
                </a-row>

                <a-row :gutter="16">
                  <a-col :span="16">
                    <a-form-item label="头像地址 (URL)" extra="输入头像图片 URL 链接">
                      <div class="avatar-input-row">
                        <a-input
                          v-model:value="formState.avatarPath"
                          placeholder="https://..."
                          :maxlength="1000"
                          allow-clear
                        />
                        <div class="avatar-preview-box">
                          <img
                            v-if="formState.avatarPath"
                            :src="formState.avatarPath"
                            alt="avatar"
                            class="preview-img"
                            @error="handleImgError"
                          />
                          <RobotOutlined v-else class="fallback-icon" />
                        </div>
                      </div>
                    </a-form-item>
                  </a-col>

                  <a-col :span="8">
                    <a-form-item label="公开范围" extra="租户公开后其他成员可见">
                      <a-switch
                        v-model:checked="formState.isPublic"
                        checked-children="租户公开"
                        un-checked-children="组织私有"
                      />
                    </a-form-item>
                  </a-col>
                </a-row>

                <a-form-item label="简介描述">
                  <a-textarea
                    v-model:value="formState.description"
                    placeholder="请输入 Agent 职能定位、适用场景说明"
                    :maxlength="1000"
                    :rows="2"
                    show-count
                    allow-clear
                  />
                </a-form-item>
              </div>

              <!-- 分区 2：模型选择 -->
              <div class="section-card">
                <div class="section-header">
                  <span class="section-title">聊天模型连接</span>
                  <span class="section-desc">保存草稿可暂不选，发布时必须选择已启用的聊天模型</span>
                </div>

                <a-form-item
                  label="模型连接"
                  extra="仅展示当前可见且启用的聊天模型连接"
                >
                  <a-select
                    v-model:value="formState.draftConfig.modelConnectionId"
                    show-search
                    allow-clear
                    placeholder="输入关键词搜索或下拉选择模型连接"
                    :filter-option="false"
                    :loading="modelLoading"
                    :not-found-content="modelLoading ? undefined : '暂无匹配模型连接'"
                    @search="handleModelSearch"
                    @dropdown-visible-change="handleModelDropdownChange"
                  >
                    <a-select-option
                      v-for="opt in modelOptionList"
                      :key="opt.id"
                      :value="opt.id"
                    >
                      <div class="select-option-item">
                        <span class="opt-title">{{ opt.modelName }}</span>
                        <span class="opt-sub du-mono">{{ opt.providerCode }} ({{ opt.modelId }})</span>
                      </div>
                    </a-select-option>
                  </a-select>

                  <div v-if="selectedModelSummary" class="selected-hint">
                    当前选定模型：<span class="font-medium">{{ selectedModelSummary }}</span>
                  </div>
                </a-form-item>
              </div>

              <!-- 分区 3：系统提示词 -->
              <div class="section-card">
                <div class="section-header">
                  <span class="section-title">角色指令 / 系统提示词 (System Prompt)</span>
                  <span class="section-desc">设定 Agent 的核心人设、职责边界与回答风格（最长 32000 字，发布时必填）</span>
                </div>

                <a-form-item>
                  <a-textarea
                    v-model:value="formState.draftConfig.systemPrompt"
                    placeholder="例如：你是一个专业的技术知识助手，请结合用户提供的内容和绑定的知识库严谨作答..."
                    :rows="6"
                    :maxlength="32000"
                    show-count
                    allow-clear
                  />
                </a-form-item>
              </div>

              <!-- 分区 4：知识库绑定 -->
              <div class="section-card">
                <div class="section-header">
                  <span class="section-title">关联知识库</span>
                  <span class="section-desc">最多可关联 100 个知识库，检索策略将复用各知识库已有配置</span>
                </div>

                <a-form-item label="添加关联知识库">
                  <a-select
                    show-search
                    placeholder="输入知识库名称搜索并添加..."
                    :filter-option="false"
                    :loading="kbLoading"
                    :not-found-content="kbLoading ? undefined : '暂无匹配知识库'"
                    style="width: 100%"
                    @search="handleKbSearch"
                    @select="handleAddKb"
                  >
                    <a-select-option
                      v-for="kb in kbOptionList"
                      :key="kb.id"
                      :value="kb.id"
                      :disabled="isKbAlreadySelected(kb.id)"
                    >
                      <div class="select-option-item">
                        <span class="opt-title">{{ kb.name }}</span>
                        <span class="opt-sub">{{ kb.isPublic ? '租户公开' : '组织私有' }}</span>
                      </div>
                    </a-select-option>
                  </a-select>
                </a-form-item>

                <!-- 已选知识库 Tag 列表 -->
                <div class="selected-kb-container">
                  <div class="kb-header-line">
                    <span class="kb-count">已选 {{ selectedKbIds.length }} / 100 个知识库</span>
                    <a-button
                      v-if="selectedKbIds.length"
                      type="link"
                      size="small"
                      danger
                      @click="handleClearAllKbs"
                    >
                      清空全部
                    </a-button>
                  </div>

                  <div v-if="selectedKbIds.length" class="kb-tag-list">
                    <a-tag
                      v-for="kbId in selectedKbIds"
                      :key="kbId"
                      closable
                      class="kb-tag"
                      @close="handleRemoveKb(kbId)"
                    >
                      <BookOutlined class="kb-tag-icon" />
                      <span class="kb-tag-text">{{ getKbName(kbId) }}</span>
                    </a-tag>
                  </div>
                  <div v-else class="empty-hint-text">
                    尚未关联任何知识库（知识库为可选配置，不绑定知识库也可发布）
                  </div>
                </div>
              </div>

              <!-- 分区 5：对话体验配置 -->
              <div class="section-card">
                <div class="section-header">
                  <span class="section-title">对话体验配置</span>
                  <span class="section-desc">定制开场白、引导提问和引用来源显示</span>
                </div>

                <a-form-item label="开场白欢迎语 (Opening Message)">
                  <a-textarea
                    v-model:value="formState.draftConfig.openingMessage"
                    placeholder="你好！我是您的知识助手，有什么我可以帮助您的？"
                    :rows="2"
                    :maxlength="2000"
                    show-count
                    allow-clear
                  />
                </a-form-item>

                <a-form-item label="开场引导提问 (Suggested Questions)" extra="最多 10 条，每条最长 500 字符">
                  <div class="suggested-questions-wrap">
                    <div
                      v-for="(_, index) in suggestedQuestionsList"
                      :key="index"
                      class="question-input-row"
                    >
                      <a-input
                        v-model:value="suggestedQuestionsList[index]"
                        :placeholder="`引导问题 ${index + 1}`"
                        :maxlength="500"
                        allow-clear
                      />
                      <a-button
                        type="text"
                        size="small"
                        danger
                        @click="handleRemoveQuestion(index)"
                      >
                        <DeleteOutlined />
                      </a-button>
                    </div>

                    <a-button
                      v-if="suggestedQuestionsList.length < 10"
                      type="dashed"
                      size="small"
                      class="add-question-btn"
                      @click="handleAddQuestion"
                    >
                      <PlusOutlined /> 添加引导提问
                    </a-button>
                  </div>
                </a-form-item>

                <a-form-item label="展示回答知识库引用来源 (Citation)">
                  <a-switch
                    :checked="Boolean(formState.draftConfig.citationEnabled)"
                    checked-children="显示引用"
                    un-checked-children="隐藏引用"
                    @change="(checked: boolean) => (formState.draftConfig.citationEnabled = checked)"
                  />
                </a-form-item>
              </div>

              <!-- 分区 6：生成与模型参数 -->
              <div class="section-card">
                <div class="section-header">
                  <span class="section-title">生成与模型高级参数</span>
                  <span class="section-desc">未配置时将保留为空，不覆盖后端或模型底层默认值</span>
                </div>

                <a-row :gutter="16">
                  <a-col :span="12">
                    <a-form-item
                      label="温度 (Temperature)"
                      extra="有效值 0 ~ 2，数值越低回答越严谨确定，留空表示不限制"
                    >
                      <div class="slider-row">
                        <a-input-number
                          v-model:value="formState.draftConfig.modelOptions.temperature"
                          :min="0"
                          :max="2"
                          :step="0.1"
                          :precision="2"
                          placeholder="留空"
                          style="width: 100%"
                        />
                      </div>
                    </a-form-item>
                  </a-col>

                  <a-col :span="12">
                    <a-form-item
                      label="最大生成长度 (Max Tokens)"
                      extra="正整数，受具体模型上限约束，留空表示不设限制"
                    >
                      <a-input-number
                        v-model:value="formState.draftConfig.modelOptions.maxTokens"
                        :min="1"
                        :max="128000"
                        :precision="0"
                        placeholder="留空"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                </a-row>

                <a-row :gutter="16">
                  <a-col :span="12">
                    <a-form-item
                      label="携带历史消息轮数 (History Message Limit)"
                      extra="范围 0 ~ 100；0 表示不携带历史消息"
                    >
                      <a-input-number
                        v-model:value="formState.draftConfig.historyMessageLimit"
                        :min="0"
                        :max="100"
                        :precision="0"
                        placeholder="留空"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                </a-row>
              </div>

              <!-- 分区 7：草稿在线调试入口与状态快捷验证 -->
              <div class="section-card preview-section-card">
                <div class="section-header">
                  <span class="section-title">草稿在线调试 (Debug Mode)</span>
                  <a-tag color="orange">在线真实调试</a-tag>
                </div>
                <div class="preview-disclaimer">
                  在线调试使用已保存到服务端的草稿配置运行，实时测试当前系统提示词、模型连接与关联知识库的应答与引用效果。
                </div>

                <div class="debug-entry-card">
                  <div class="entry-meta">
                    <div class="entry-title">{{ formState.name || '未命名 Agent' }}</div>
                    <div class="entry-sub-line">
                      <span>生效模型：{{ selectedModelSummary || '尚未选择模型' }}</span>
                      <span class="sep">|</span>
                      <span>关联知识库：{{ selectedKbIds.length }} 个</span>
                      <span class="sep">|</span>
                      <span>开场白：{{ formState.draftConfig.openingMessage ? '已配置' : '默认' }}</span>
                    </div>
                  </div>

                  <a-button type="primary" class="go-debug-btn" @click="activeTabKey = 'debug'">
                    <PlayCircleOutlined /> 切换至在线调试对话
                  </a-button>
                </div>
              </div>
            </a-form>
          </a-tab-pane>

          <!-- Tab 2: 当前已发布配置（只读） -->
          <a-tab-pane key="published" tab="当前已发布配置">
            <div v-if="publishedConfig" class="published-container">
              <a-alert
                message="当前生效中的发布配置"
                :description="`发布时间: ${publishedTime || '—'}  |  发布人: ${publishedBy || '—'}`"
                type="info"
                show-icon
                class="publish-alert"
              />

              <div class="published-detail-card">
                <a-descriptions bordered size="small" :column="2">
                  <a-descriptions-item label="生效模型连接 ID" :span="2">
                    <span class="du-mono">{{ publishedConfig.modelConnectionId || '未配置' }}</span>
                  </a-descriptions-item>

                  <a-descriptions-item label="温度 (Temperature)">
                    <span class="du-mono">{{ publishedConfig.modelOptions?.temperature ?? '未设限制' }}</span>
                  </a-descriptions-item>

                  <a-descriptions-item label="最大 Token (Max Tokens)">
                    <span class="du-mono">{{ publishedConfig.modelOptions?.maxTokens ?? '未设限制' }}</span>
                  </a-descriptions-item>

                  <a-descriptions-item label="携带历史条数">
                    <span class="du-mono">{{ publishedConfig.historyMessageLimit ?? '未设限制' }}</span>
                  </a-descriptions-item>

                  <a-descriptions-item label="显示引用来源">
                    <span>{{ publishedConfig.citationEnabled ? '开启' : '关闭' }}</span>
                  </a-descriptions-item>

                  <a-descriptions-item label="关联知识库" :span="2">
                    <div v-if="publishedConfig.knowledgeBaseIds?.length" class="kb-tag-list">
                      <a-tag
                        v-for="kId in publishedConfig.knowledgeBaseIds"
                        :key="kId"
                        class="kb-tag"
                      >
                        <BookOutlined class="kb-tag-icon" />
                        <span class="kb-tag-text">{{ getKbName(kId) }}</span>
                      </a-tag>
                    </div>
                    <span v-else class="text-muted">未关联知识库</span>
                  </a-descriptions-item>

                  <a-descriptions-item label="开场白欢迎语" :span="2">
                    <div class="code-preview-block">
                      {{ publishedConfig.openingMessage || '未配置' }}
                    </div>
                  </a-descriptions-item>

                  <a-descriptions-item label="引导问题" :span="2">
                    <div v-if="publishedConfig.suggestedQuestions?.length" class="preview-questions">
                      <span
                        v-for="(q, idx) in publishedConfig.suggestedQuestions"
                        :key="idx"
                        class="preview-q-chip"
                      >
                        {{ q }}
                      </span>
                    </div>
                    <span v-else class="text-muted">未配置</span>
                  </a-descriptions-item>

                  <a-descriptions-item label="系统提示词 (System Prompt)" :span="2">
                    <div class="system-prompt-box">
                      {{ publishedConfig.systemPrompt || '未配置' }}
                    </div>
                  </a-descriptions-item>
                </a-descriptions>
              </div>
            </div>
            <a-empty
              v-else
              description="该 Agent 尚未发布过任何配置。编辑草稿并发布后，此处将展示正在生效的配置。"
              class="empty-published"
            />
          </a-tab-pane>

          <!-- Tab 3: 草稿在线调试 (Debug Mode) -->
          <a-tab-pane key="debug" tab="草稿在线调试">
            <div class="debug-pane-container">
              <a-alert
                v-if="isDirty"
                type="warning"
                show-icon
                class="debug-dirty-alert"
                message="当前有未保存的草稿修改"
                description="在线调试将使用已保存到服务端的草稿配置运行；若您刚才调整了系统提示词、模型或知识库，请先点击右上角“保存草稿”后再发起测试提问。"
              />
              <div class="debug-chat-box-wrap">
                <AgentChatBox
                  v-if="props.agentId"
                  :agent-id="String(props.agentId)"
                  conversation-type="debug"
                  :can-write="canWrite"
                />
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>
    </a-spin>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { message, Modal, type FormInstance } from 'ant-design-vue'
import {
  BookOutlined,
  BugOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  RobotOutlined,
} from '@ant-design/icons-vue'
import {
  getAgent,
  getAgentConfiguration,
  getKnowledgeBaseOptions,
  getModelOptions,
  publishAgent,
  updateAgent,
} from '@/apis/ai/agent'
import type {
  AgentConfiguration,
  AgentKnowledgeBaseOption,
  AgentModelOption,
  AgentSummary,
  AgentUpdateDTO,
} from '@/apis/ai/agent/type'
import { getOrganizationLookup } from '@/apis/upms/organization'
import { menusStore } from '@/stores/modules/user'
import AgentChatBox from './AgentChatBox.vue'

const props = defineProps<{
  open: boolean
  agentId: string | null
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path) && Boolean(summary.value?.writable))

const activeTabKey = ref<'draft' | 'published' | 'debug'>('draft')
const initialLoading = ref(false)
const saveLoading = ref(false)
const publishLoading = ref(false)

const formRef = ref<FormInstance>()
const summary = ref<AgentSummary | null>(null)
const orgName = ref<string>('')
const currentVersion = ref<string>('')

// 抽屉内部表单状态
const formState = reactive<{
  orgId: string
  name: string
  description: string
  avatarPath: string
  isPublic: boolean
  draftConfig: {
    modelConnectionId: string | null
    systemPrompt: string
    modelOptions: {
      temperature: number | null
      maxTokens: number | null
    }
    knowledgeBaseIds: string[]
    historyMessageLimit: number | null
    openingMessage: string
    suggestedQuestions: string[]
    citationEnabled: boolean
  }
}>({
  orgId: '',
  name: '',
  description: '',
  avatarPath: '',
  isPublic: false,
  draftConfig: {
    modelConnectionId: null,
    systemPrompt: '',
    modelOptions: {
      temperature: null,
      maxTokens: null,
    },
    knowledgeBaseIds: [],
    historyMessageLimit: null,
    openingMessage: '',
    suggestedQuestions: [],
    citationEnabled: true,
  },
})

// 初始快照（用于未保存改动判定）
const initialSnapshot = ref<string>('')

// 已发布配置信息（只读展示）
const publishedConfig = ref<AgentConfiguration | null>(null)
const publishedTime = ref<string | null>(null)
const publishedBy = ref<string | null>(null)

// 引导问题可变列表
const suggestedQuestionsList = ref<string[]>([])

// 知识库选择与已选 ID 列表
const selectedKbIds = computed({
  get: () => formState.draftConfig.knowledgeBaseIds || [],
  set: (val: string[]) => {
    formState.draftConfig.knowledgeBaseIds = val
  },
})

// 下拉项缓存与状态
const modelOptionList = ref<AgentModelOption[]>([])
const modelLoading = ref(false)
const knownModelsMap = ref<Map<string, AgentModelOption>>(new Map())

const kbOptionList = ref<AgentKnowledgeBaseOption[]>([])
const kbLoading = ref(false)
const knownKbsMap = ref<Map<string, AgentKnowledgeBaseOption>>(new Map())

const drawerTitle = computed(() => {
  return summary.value ? `编辑 Agent：${summary.value.name}` : '编辑 Agent'
})

// 判定本地是否有未保存修改
const isDirty = computed(() => {
  if (!initialSnapshot.value) return false
  const current = buildPayloadSnapshot()
  return current !== initialSnapshot.value
})

const selectedModelSummary = computed(() => {
  const connId = formState.draftConfig.modelConnectionId
  if (!connId) return ''
  const opt = knownModelsMap.value.get(connId)
  if (opt) return `${opt.modelName} (${opt.providerCode})`
  return `ID: ${connId}（当前选项名称未获取）`
})

const buildPayloadSnapshot = () => {
  return JSON.stringify({
    name: formState.name,
    description: formState.description || null,
    avatarPath: formState.avatarPath || null,
    isPublic: formState.isPublic,
    draftConfig: {
      modelConnectionId: formState.draftConfig.modelConnectionId || null,
      systemPrompt: formState.draftConfig.systemPrompt || null,
      modelOptions: {
        temperature: formState.draftConfig.modelOptions.temperature ?? null,
        maxTokens: formState.draftConfig.modelOptions.maxTokens ?? null,
      },
      knowledgeBaseIds: formState.draftConfig.knowledgeBaseIds || [],
      historyMessageLimit: formState.draftConfig.historyMessageLimit ?? null,
      openingMessage: formState.draftConfig.openingMessage || null,
      suggestedQuestions: suggestedQuestionsList.value.filter((q) => q.trim().length > 0),
      citationEnabled: formState.draftConfig.citationEnabled,
    },
  })
}

// 加载模型下拉项
const loadModelOptions = async (keyword = '') => {
  modelLoading.value = true
  try {
    const res = await getModelOptions({ current: 1, size: 50, keyword: keyword.trim() || undefined })
    const records = res.data?.records || []
    modelOptionList.value = records
    records.forEach((m) => {
      knownModelsMap.value.set(m.id, m)
    })
  } catch {
    // 拦截器处理
  } finally {
    modelLoading.value = false
  }
}

const handleModelSearch = (val: string) => {
  void loadModelOptions(val)
}

const handleModelDropdownChange = (isOpen: boolean) => {
  if (isOpen && !modelOptionList.value.length) {
    void loadModelOptions()
  }
}

// 加载知识库下拉项
const loadKbOptions = async (keyword = '') => {
  kbLoading.value = true
  try {
    const res = await getKnowledgeBaseOptions({ current: 1, size: 50, keyword: keyword.trim() || undefined })
    const records = res.data?.records || []
    kbOptionList.value = records
    records.forEach((k) => {
      knownKbsMap.value.set(k.id, k)
    })
  } catch {
    // 拦截器处理
  } finally {
    kbLoading.value = false
  }
}

const handleKbSearch = (val: string) => {
  void loadKbOptions(val)
}

const isKbAlreadySelected = (kbId: string) => {
  return selectedKbIds.value.includes(kbId)
}

const handleAddKb = (kbId: string) => {
  if (!selectedKbIds.value.includes(kbId)) {
    if (selectedKbIds.value.length >= 100) {
      message.warning('最多只能关联 100 个知识库')
      return
    }
    selectedKbIds.value = [...selectedKbIds.value, kbId]
  }
}

const handleRemoveKb = (kbId: string) => {
  selectedKbIds.value = selectedKbIds.value.filter((id) => id !== kbId)
}

const handleClearAllKbs = () => {
  selectedKbIds.value = []
}

const getKbName = (kbId: string) => {
  const kb = knownKbsMap.value.get(kbId)
  if (kb?.name) return kb.name
  return `ID: ${kbId}（名称未获取）`
}

// 引导问题操作
const handleAddQuestion = () => {
  if (suggestedQuestionsList.value.length >= 10) {
    message.warning('引导问题最多配置 10 条')
    return
  }
  suggestedQuestionsList.value.push('')
}

const handleRemoveQuestion = (idx: number) => {
  suggestedQuestionsList.value.splice(idx, 1)
}

// 初始化加载：两份响应核对版本
const initData = async (id: string): Promise<void> => {
  initialLoading.value = true
  try {
    const [summaryRes, configRes] = await Promise.all([
      getAgent(id),
      getAgentConfiguration(id),
    ])

    const sumData = summaryRes.data
    const confData = configRes.data

    if (!sumData || !confData) {
      message.error('获取 Agent 详情失败')
      return
    }

    // 版本一致性核对
    if (sumData.version !== confData.version) {
      message.warning('检测到数据版本差异，正在重新同步...')
      return await initData(id)
    }

    summary.value = sumData
    currentVersion.value = sumData.version

    // 加载组织显示名
    if (sumData.orgId) {
      void getOrganizationLookup(sumData.orgId).then((res) => {
        if (res.data?.orgName) orgName.value = res.data.orgName
      })
    }

    // 填充表单
    formState.orgId = sumData.orgId
    formState.name = sumData.name
    formState.description = sumData.description || ''
    formState.avatarPath = sumData.avatarPath || ''
    formState.isPublic = Boolean(sumData.isPublic)

    const draft = confData.draftConfig || {}
    formState.draftConfig.modelConnectionId = draft.modelConnectionId || null
    formState.draftConfig.systemPrompt = draft.systemPrompt || ''
    formState.draftConfig.modelOptions.temperature =
      typeof draft.modelOptions?.temperature === 'number' ? draft.modelOptions.temperature : null
    formState.draftConfig.modelOptions.maxTokens =
      typeof draft.modelOptions?.maxTokens === 'number' ? draft.modelOptions.maxTokens : null
    formState.draftConfig.knowledgeBaseIds = Array.isArray(draft.knowledgeBaseIds)
      ? [...draft.knowledgeBaseIds]
      : []
    formState.draftConfig.historyMessageLimit =
      typeof draft.historyMessageLimit === 'number' ? draft.historyMessageLimit : null
    formState.draftConfig.openingMessage = draft.openingMessage || ''
    formState.draftConfig.citationEnabled = draft.citationEnabled !== false

    suggestedQuestionsList.value = Array.isArray(draft.suggestedQuestions)
      ? [...draft.suggestedQuestions]
      : []

    // 填充已发布配置（独立深拷贝，严禁共享可变对象）
    if (confData.publishedConfig) {
      publishedConfig.value = JSON.parse(JSON.stringify(confData.publishedConfig))
      publishedTime.value = confData.publishedTime
      publishedBy.value = confData.publishedBy
    } else {
      publishedConfig.value = null
      publishedTime.value = null
      publishedBy.value = null
    }

    // 记录初始快照
    initialSnapshot.value = buildPayloadSnapshot()

    // 预加载模型与知识库首屏下拉数据
    void loadModelOptions()
    void loadKbOptions()
  } catch {
    // 拦截器处理
  } finally {
    initialLoading.value = false
  }
}

watch(
  () => [props.open, props.agentId] as const,
  ([isOpen, id]) => {
    if (isOpen && id) {
      activeTabKey.value = 'draft'
      initialSnapshot.value = ''
      void initData(id)
    } else if (!isOpen) {
      summary.value = null
      orgName.value = ''
      currentVersion.value = ''
      initialSnapshot.value = ''
      publishedConfig.value = null
    }
  }
)

const handleImgError = (e: Event) => {
  const target = e.target as HTMLImageElement
  if (target) {
    target.style.display = 'none'
  }
}

// 组装最终提交的保存 Payload
const prepareSavePayload = (): AgentUpdateDTO => {
  const questions = suggestedQuestionsList.value
    .map((q) => q.trim())
    .filter((q) => q.length > 0)

  return {
    orgId: formState.orgId,
    name: formState.name.trim(),
    description: formState.description.trim() || null,
    avatarPath: formState.avatarPath.trim() || null,
    isPublic: formState.isPublic,
    version: currentVersion.value,
    draftConfig: {
      modelConnectionId: formState.draftConfig.modelConnectionId || null,
      systemPrompt: formState.draftConfig.systemPrompt.trim() || null,
      modelOptions: {
        temperature: formState.draftConfig.modelOptions.temperature ?? null,
        maxTokens: formState.draftConfig.modelOptions.maxTokens ?? null,
      },
      knowledgeBaseIds: formState.draftConfig.knowledgeBaseIds || [],
      historyMessageLimit: formState.draftConfig.historyMessageLimit ?? null,
      openingMessage: formState.draftConfig.openingMessage.trim() || null,
      suggestedQuestions: questions.length ? questions : null,
      citationEnabled: formState.draftConfig.citationEnabled,
    },
  }
}

// 保存草稿
const handleSaveDraft = async (): Promise<boolean> => {
  try {
    await formRef.value?.validate()
  } catch {
    activeTabKey.value = 'draft'
    message.error('请检查基本信息填写')
    return false
  }

  saveLoading.value = true
  try {
    const payload = prepareSavePayload()
    const res = await updateAgent(summary.value!.id, payload)
    // 更新本地版本
    currentVersion.value = res.data.version
    initialSnapshot.value = buildPayloadSnapshot()
    message.success('草稿保存成功')
    emit('success')
    return true
  } catch {
    return false
  } finally {
    saveLoading.value = false
  }
}

// 发布逻辑：检查必填、本地未保存提示与发布调用
const handlePublishConfirm = () => {
  // 检查发布必填约束：模型连接和系统提示词非空
  const connId = formState.draftConfig.modelConnectionId
  const prompt = formState.draftConfig.systemPrompt.trim()

  if (!connId) {
    activeTabKey.value = 'draft'
    message.error('发布失败：请先选择已启用的聊天模型连接')
    return
  }
  if (!prompt) {
    activeTabKey.value = 'draft'
    message.error('发布失败：系统提示词 (System Prompt) 不能为空')
    return
  }

  // 检查是否有本地未保存修改
  if (isDirty.value) {
    Modal.confirm({
      title: '检测到未保存的草稿修改',
      content: '发布操作将基于服务端已保存的草稿进行。是否先自动保存当前修改并立即发布？',
      okText: '保存并发布',
      cancelText: '取消',
      onOk: async () => {
        const saved = await handleSaveDraft()
        if (saved) {
          await executePublish()
        }
      },
    })
  } else {
    Modal.confirm({
      title: '确认发布当前草稿配置？',
      content: '发布后，当前草稿将成为生效的 Agent 配置供外部调用。',
      okText: '确认发布',
      cancelText: '取消',
      onOk: async () => {
        await executePublish()
      },
    })
  }
}

const executePublish = async () => {
  if (!summary.value) return
  publishLoading.value = true
  try {
    const res = await publishAgent(summary.value.id, { version: currentVersion.value })
    currentVersion.value = res.data.version
    message.success('Agent 配置发布成功')
    emit('success')
    // 重新拉取以刷新已发布配置面板和状态
    await initData(summary.value.id)
  } catch {
    // 拦截器处理
  } finally {
    publishLoading.value = false
  }
}

// 关闭抽屉（带未保存退出拦截）
const handleClose = () => {
  if (isDirty.value) {
    Modal.confirm({
      title: '未保存的草稿修改',
      content: '您当前有尚未保存的修改，关闭抽屉后未保存的内容将丢失。确定退出吗？',
      okText: '确定退出',
      okType: 'danger',
      cancelText: '继续编辑',
      onOk: () => {
        emit('update:open', false)
      },
    })
  } else {
    emit('update:open', false)
  }
}
</script>

<style scoped>
.drawer-header-extra {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-badge {
  background: var(--du-bg-container, #f0f0f0);
  padding: 2px 8px;
  border-radius: var(--du-border-radius, 4px);
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary, #595959);
}

.drawer-body {
  padding-bottom: 24px;
}

.config-tabs {
  margin-top: -12px;
}

.section-card {
  background: var(--du-bg-container, #ffffff);
  border: 1px solid var(--du-border, #f0f0f0);
  border-radius: var(--du-border-radius, 6px);
  padding: 16px;
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--du-border, #f0f0f0);
  padding-bottom: 8px;
}

.section-title {
  font-size: var(--du-font-size-md, 13px);
  font-weight: 600;
  color: var(--du-text, #262626);
}

.section-desc {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted, #8c8c8c);
}

.avatar-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-preview-box {
  width: 32px;
  height: 32px;
  border-radius: var(--du-border-radius, 4px);
  border: 1px solid var(--du-border, #d9d9d9);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--du-bg-container, #fafafa);
  flex-shrink: 0;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fallback-icon {
  font-size: 18px;
  color: var(--du-primary, #1677ff);
}

.select-option-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.opt-title {
  font-size: var(--du-font-size-sm, 12px);
  color: var(--du-text, #262626);
}

.opt-sub {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary, #8c8c8c);
}

.selected-hint {
  margin-top: 6px;
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-primary, #1677ff);
}

.selected-kb-container {
  background: var(--du-bg-layout, #fafafa);
  border: 1px dashed var(--du-border, #d9d9d9);
  border-radius: var(--du-border-radius, 4px);
  padding: 10px 12px;
}

.kb-header-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.kb-count {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary, #595959);
}

.kb-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.kb-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--du-font-size-xs, 11px);
  padding: 2px 8px;
  line-height: 20px;
}

.kb-tag-icon {
  color: var(--du-primary, #1677ff);
}

.empty-hint-text {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted, #8c8c8c);
  text-align: center;
  padding: 8px 0;
}

.suggested-questions-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.question-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-question-btn {
  width: fit-content;
  margin-top: 4px;
}

.preview-section-card {
  border: 1px dashed var(--du-primary, #1677ff);
  background: #fbfdff;
}

.preview-disclaimer {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted, #8c8c8c);
  margin-bottom: 12px;
}

.local-preview-box {
  background: #ffffff;
  border: 1px solid var(--du-border, #e8e8e8);
  border-radius: 8px;
  padding: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.preview-chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.preview-avatar {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: #e6f4ff;
  color: #1677ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  overflow: hidden;
}

.preview-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-info {
  display: flex;
  flex-direction: column;
}

.preview-name {
  font-size: var(--du-font-size-sm, 12px);
  font-weight: 600;
  color: var(--du-text, #262626);
}

.preview-desc {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted, #8c8c8c);
}

.preview-bubble {
  margin-top: 14px;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: var(--du-font-size-sm, 12px);
  color: var(--du-text, #262626);
  line-height: 1.6;
  white-space: pre-wrap;
  width: fit-content;
  max-width: 85%;
}

.preview-questions {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preview-q-chip {
  background: #f0f5ff;
  color: #1d39c4;
  border: 1px solid #adc6ff;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: var(--du-font-size-xs, 11px);
  cursor: default;
}

.publish-alert {
  margin-bottom: 16px;
}

.published-detail-card {
  background: var(--du-bg-container, #ffffff);
}

.system-prompt-box {
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
  font-family: var(--du-font-mono, monospace);
  font-size: var(--du-font-size-xs, 11px);
  line-height: 1.5;
  background: #fafafa;
  padding: 8px 10px;
  border-radius: 4px;
  border: 1px solid #f0f0f0;
}

.code-preview-block {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: var(--du-font-size-sm, 12px);
}

.empty-published {
  padding: 40px 0;
}

/* 草稿调试面板 */
.debug-pane-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 170px);
}

.debug-dirty-alert {
  flex-shrink: 0;
}

.debug-chat-box-wrap {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--du-color-border-secondary, #e8e8e8);
  border-radius: var(--du-border-radius, 4px);
  overflow: hidden;
}

.debug-entry-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 4px;
}

.entry-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.entry-title {
  font-size: 13px;
  font-weight: 600;
  color: #262626;
}

.entry-sub-line {
  font-size: 11.5px;
  color: #8c8c8c;
  display: flex;
  align-items: center;
  gap: 8px;
}

.entry-sub-line .sep {
  color: #d9d9d9;
}
</style>
