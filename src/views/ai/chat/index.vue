<template>
  <!-- 独立全屏 AI 助手工作台：脱离 AdminLayout 容器，独占 100vw × 100vh 沉浸式视口 -->
  <a-watermark
    :content="watermarkContent"
    :font="{ fontSize: 13, color: 'rgba(0, 0, 0, 0.08)' }"
    :gap="[140, 140]"
    class="chat-workspace-app"
  >
    <div class="workspace-container">
      <!-- 1. 左侧沉浸式会话历史侧边栏 -->
      <aside class="workspace-sidebar" :class="{ 'is-collapsed': sidebarCollapsed }">
        <!-- 侧边栏头部：工作台 Logo 与品牌 -->
        <div class="sidebar-header">
          <div class="brand-info">
            <div class="brand-icon">
              <RobotOutlined />
            </div>
            <span class="brand-text">AI 助手工作台</span>
          </div>
          <button
            type="button"
            class="sidebar-toggle-btn"
            title="收起侧边栏"
            @click="sidebarCollapsed = true"
          >
            <MenuFoldOutlined />
          </button>
        </div>

        <!-- 主操作：新建会话按钮 -->
        <div class="new-chat-wrap">
          <a-button
            type="primary"
            block
            class="new-chat-btn"
            :disabled="generating || !currentAgentId"
            @click="handleCreateNewSession"
          >
            <PlusOutlined />
            <span>新建对话</span>
          </a-button>
        </div>

        <!-- 会话历史列表（带时间分组） -->
        <div class="session-scroll-area">
          <div v-if="loadingSessions" class="session-loading">
            <a-spin size="small" tip="加载会话中..." />
          </div>

          <div v-else-if="sessionList.length === 0" class="session-empty">
            <MessageOutlined class="empty-icon" />
            <span>暂无历史会话</span>
          </div>

          <div v-else class="session-groups">
            <div
              v-for="group in groupedSessions"
              :key="group.title"
              class="session-group-block"
            >
              <div class="group-title">{{ group.title }}</div>
              <div class="group-items">
                <div
                  v-for="sess in group.items"
                  :key="sess.id"
                  class="session-item-row"
                  :class="{ active: currentSession?.id === sess.id }"
                  @click="handleSelectSession(sess)"
                >
                  <MessageOutlined class="item-icon" />
                  
                  <!-- 正常展示态 / 行内编辑态 -->
                  <div v-if="editingSessionId === sess.id" class="session-inline-edit" @click.stop>
                    <a-input
                      ref="renameInputRef"
                      v-model:value="editingTitle"
                      size="small"
                      :maxlength="50"
                      class="edit-input"
                      @press-enter="handleSaveRename(sess)"
                      @blur="handleSaveRename(sess)"
                    />
                  </div>
                  <span v-else class="item-title du-ellipsis" :title="sess.title">
                    {{ sess.title || '未命名对话' }}
                  </span>

                  <!-- 悬浮操作图标 -->
                  <div class="item-actions" @click.stop>
                    <button
                      type="button"
                      class="action-icon-btn"
                      title="重命名"
                      @click="handleStartRename(sess)"
                    >
                      <EditOutlined />
                    </button>
                    <a-popconfirm
                      title="确定删除此对话吗？"
                      ok-text="删除"
                      cancel-text="取消"
                      ok-type="danger"
                      placement="right"
                      @confirm="handleDeleteSession(sess)"
                    >
                      <button type="button" class="action-icon-btn danger" title="删除">
                        <DeleteOutlined />
                      </button>
                    </a-popconfirm>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 侧边栏底部：当前用户与返回后台 -->
        <div class="sidebar-footer">
          <div class="user-chip" :title="userDisplayName">
            <span class="user-avatar-circle">
              <UserOutlined />
            </span>
            <div class="user-names du-ellipsis">
              <div class="user-main-name du-ellipsis">{{ userDisplayName }}</div>
              <div class="user-sub du-mono">{{ currentTenantName }}</div>
            </div>
          </div>

          <a-tooltip title="返回管理平台主页面" placement="top">
            <a-button
              type="text"
              size="small"
              class="back-admin-btn"
              @click="handleBackToAdmin"
            >
              <RollbackOutlined />
              <span>返回管理后台</span>
            </a-button>
          </a-tooltip>
        </div>
      </aside>

      <!-- 2. 右侧主对话视窗（全屏居中沉浸式） -->
      <main class="workspace-main">
        <!-- 顶栏工具条：Agent 切换器、状态与快捷操作 -->
        <header class="main-header">
          <div class="header-left">
            <!-- 侧栏展开按钮（当侧栏收起时展示） -->
            <button
              v-if="sidebarCollapsed"
              type="button"
              class="sidebar-expand-btn"
              title="展开侧边栏"
              @click="sidebarCollapsed = false"
            >
              <MenuUnfoldOutlined />
            </button>

            <!-- Agent 选择下拉框 -->
            <div class="agent-selector-wrap">
              <a-select
                v-model:value="currentAgentId"
                :loading="loadingAgents"
                class="agent-select"
                :dropdown-match-select-width="320"
                placeholder="请选择要对话的 Agent 助手"
                @change="handleAgentChange"
              >
                <a-select-option
                  v-for="agent in agentOptions"
                  :key="agent.id"
                  :value="agent.id"
                  :label="agent.name"
                >
                  <div class="agent-option-item">
                    <div class="opt-avatar">
                      <img
                        v-if="agent.avatarPath"
                        :src="agent.avatarPath"
                        alt="avatar"
                        class="opt-avatar-img"
                        @error="handleImgFallback"
                      />
                      <RobotOutlined v-else />
                    </div>
                    <div class="opt-info">
                      <div class="opt-name">{{ agent.name }}</div>
                      <div class="opt-desc du-ellipsis">{{ agent.description || '暂无描述' }}</div>
                    </div>
                  </div>
                </a-select-option>
              </a-select>
            </div>

            <!-- 当前选中 Agent 状态 Tag -->
            <div v-if="currentProfile" class="current-agent-badge">
              <span class="status-indicator"></span>
              <span class="agent-title-text">{{ currentProfile.name }}</span>
            </div>
          </div>

          <div class="header-right">
            <a-button
              v-if="messages.length > 0"
              size="small"
              class="header-tool-btn"
              :disabled="generating"
              @click="handleCreateNewSession"
            >
              <PlusOutlined /> 新开对话
            </a-button>

            <a-button
              type="dashed"
              size="small"
              class="header-back-link"
              @click="handleBackToAdmin"
            >
              <RollbackOutlined />
              <span>管理后台</span>
            </a-button>
          </div>
        </header>

        <!-- 核心对话消息视窗 -->
        <div
          ref="messagesContainerRef"
          class="messages-scroll-stage"
          @scroll="handleContainerScroll"
        >
          <!-- 初始加载中 -->
          <div v-if="initialLoading" class="stage-centered-loading">
            <a-spin size="large" tip="正在唤醒智能助手..." />
          </div>

          <!-- 模式一：当前对话为空时的全屏沉浸欢迎态（Welcome & Prompts） -->
          <div
            v-else-if="messages.length === 0"
            class="welcome-stage"
          >
            <div class="welcome-center-box">
              <div class="welcome-avatar-lg">
                <img
                  v-if="currentProfile?.avatarPath"
                  :src="currentProfile.avatarPath"
                  alt="avatar"
                  class="welcome-avatar-img"
                  @error="handleImgFallback"
                />
                <RobotOutlined v-else class="welcome-fallback-icon" />
              </div>

              <h2 class="welcome-title">
                {{ currentProfile?.name || '你好，今天有什么想聊的？' }}
              </h2>

              <p class="welcome-desc">
                {{ currentProfile?.description || currentProfile?.openingMessage || '我是您的 AI 智能业务助手，您可以向我提问业务知识、分析数据或生成方案。' }}
              </p>

              <!-- 推荐引导提问卡片矩阵 (Prompts) -->
              <div
                v-if="currentProfile?.suggestedQuestions && currentProfile.suggestedQuestions.length"
                class="suggested-prompts-grid"
              >
                <div
                  v-for="(question, qIdx) in currentProfile.suggestedQuestions"
                  :key="qIdx"
                  class="prompt-card"
                  @click="handleQuickSend(question)"
                >
                  <div class="prompt-card-icon">
                    <CompassOutlined />
                  </div>
                  <div class="prompt-card-text">
                    {{ question }}
                  </div>
                  <ArrowRightOutlined class="prompt-arrow-icon" />
                </div>
              </div>
            </div>
          </div>

          <!-- 模式二：消息滚动流（双侧质感气泡 + Markdown 解析） -->
          <div v-else class="message-stream-list">
            <!-- 翻页加载历史消息指示器 -->
            <div v-if="hasMoreHistory" class="history-load-more">
              <a-button
                type="link"
                size="small"
                :loading="loadingMoreHistory"
                @click="handleLoadMoreMessages"
              >
                <UpOutlined /> 查看更早的历史消息
              </a-button>
            </div>

            <!-- 每一轮消息项 -->
            <div
              v-for="msg in messages"
              :key="msg.id || msg.sequenceNo"
              class="message-turn-row"
              :class="{ 'user-turn': msg.role === 'user', 'assistant-turn': msg.role === 'assistant' }"
            >
              <!-- 角色头像 -->
              <div class="turn-avatar">
                <template v-if="msg.role === 'user'">
                  <div class="user-avatar-badge">
                    <UserOutlined />
                  </div>
                </template>
                <template v-else>
                  <img
                    v-if="currentProfile?.avatarPath"
                    :src="currentProfile.avatarPath"
                    alt="avatar"
                    class="assistant-avatar-img"
                    @error="handleImgFallback"
                  />
                  <div v-else class="assistant-avatar-badge">
                    <RobotOutlined />
                  </div>
                </template>
              </div>

              <!-- 消息主体卡片 -->
              <div class="turn-content-wrap">
                <!-- 头部名字与时间 -->
                <div class="turn-meta-line">
                  <span class="turn-author">
                    {{ msg.role === 'user' ? (userDisplayName || '我') : (currentProfile?.name || '智能助手') }}
                  </span>
                  <span v-if="msg.createTime" class="turn-time du-mono">
                    {{ formatTime(msg.createTime) }}
                  </span>
                </div>

                <!-- 消息气泡正文 -->
                <div
                  class="turn-bubble"
                  :class="{
                    'user-bubble-theme': msg.role === 'user',
                    'assistant-bubble-theme': msg.role === 'assistant'
                  }"
                >
                  <!-- 助手深度思考过程（DeepSeek-R1 / o1 风格折叠卡片） -->
                  <div
                    v-if="msg.role === 'assistant' && ((msg as any).reasoningContent || (msg.messageStatus === 'generating' && !msg.content))"
                    class="reasoning-card"
                  >
                    <div
                      class="reasoning-header"
                      @click="toggleReasoning(msg)"
                    >
                      <div class="reasoning-title-line">
                        <LoadingOutlined v-if="msg.messageStatus === 'generating' && !msg.content" class="reasoning-spin" />
                        <BulbOutlined v-else class="reasoning-icon" />
                        <span class="reasoning-label">
                          {{ msg.messageStatus === 'generating' && !msg.content ? '正在深入思考与检索相关知识...' : '思考过程' }}
                        </span>
                      </div>
                      <DownOutlined
                        v-if="(msg as any).reasoningContent"
                        class="reasoning-arrow"
                        :class="{ 'is-expanded': (msg as any)._reasoningExpanded !== false }"
                      />
                    </div>
                    <div
                      v-if="(msg as any).reasoningContent && (msg as any)._reasoningExpanded !== false"
                      class="reasoning-body"
                    >
                      <pre class="reasoning-text">{{ (msg as any).reasoningContent }}</pre>
                    </div>
                  </div>

                  <!-- 用户消息：文本直出 -->
                  <div v-if="msg.role === 'user'" class="user-text-content">
                    {{ msg.content }}
                  </div>

                  <!-- 助手消息：使用 MdPreview 渲染专业 Markdown（带代码高亮与复制） -->
                  <div v-else-if="msg.content" class="assistant-markdown-content">
                    <MdPreview
                      :model-value="msg.content"
                      :theme="previewTheme"
                      preview-theme="default"
                      class="chat-md-preview"
                    />
                    <!-- 生成中的动态呼吸光标 -->
                    <span
                      v-if="msg.messageStatus === 'generating'"
                      class="stream-cursor"
                    />
                  </div>

                  <!-- 错误中断告警 -->
                  <div v-if="msg.messageStatus === 'failed'" class="status-alert failed-alert">
                    <ExclamationCircleOutlined />
                    <span>{{ msg.errorMessage || '本次回答遇到异常中断' }}</span>
                  </div>
                  <div v-else-if="msg.messageStatus === 'interrupted'" class="status-alert interrupted-alert">
                    <StopOutlined />
                    <span>生成已由用户主动停止</span>
                  </div>
                </div>

                <!-- 知识库参考引用来源卡片（Citations） -->
                <div
                  v-if="currentProfile?.citationEnabled !== false && msg.citations && msg.citations.length"
                  class="citations-container"
                >
                  <div class="citations-header">
                    <BookOutlined class="cit-icon" />
                    <span>参考知识来源 ({{ msg.citations.length }})：</span>
                  </div>
                  <div class="citations-list">
                    <div
                      v-for="citation in msg.citations"
                      :key="citation.number || citation.chunkId"
                      class="citation-card"
                      @click="handleOpenCitation(citation)"
                    >
                      <span class="cit-tag">[{{ citation.number }}]</span>
                      <span class="cit-doc-name du-ellipsis" :title="citation.documentName">
                        {{ citation.documentName || '知识文档' }}
                      </span>
                      <span
                        v-if="citation.source?.headings && citation.source.headings.length"
                        class="cit-heading du-ellipsis"
                      >
                        · {{ citation.source.headings[0] }}
                      </span>
                      <ExportOutlined class="cit-link-icon" />
                    </div>
                  </div>
                </div>

                <!-- 消息操作微工具条 -->
                <div v-if="msg.role === 'assistant' && msg.content" class="turn-actions-bar">
                  <a-tooltip title="复制回答全文">
                    <button
                      type="button"
                      class="turn-action-btn"
                      @click="handleCopyMessage(msg.content)"
                    >
                      <CopyOutlined />
                      <span>复制</span>
                    </button>
                  </a-tooltip>

                  <a-tooltip title="以当前问题重新生成">
                    <button
                      type="button"
                      class="turn-action-btn"
                      :disabled="generating"
                      @click="handleRegenerate(msg)"
                    >
                      <ReloadOutlined />
                      <span>重新生成</span>
                    </button>
                  </a-tooltip>

                  <span
                    v-if="msg.inputTokens || msg.outputTokens"
                    class="token-metrics du-mono"
                  >
                    消耗: {{ (msg.inputTokens || 0) + (msg.outputTokens || 0) }} tokens
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 向上滚动时出现的“回到底部”悬浮按钮 -->
          <transition name="fade">
            <button
              v-if="!isNearBottom && messages.length > 3"
              type="button"
              class="scroll-down-float-btn"
              @click="scrollToBottomSmooth"
            >
              <DownOutlined />
              <span>回到底部</span>
            </button>
          </transition>
        </div>

        <!-- 3. 底部现代胶囊卡片式输入区 (GPT Sender) -->
        <footer class="workspace-footer">
          <div class="sender-capsule-card">
            <!-- 正在生成时的提示与一键停止栏 -->
            <div v-if="generating" class="generating-top-hint">
              <span class="hint-text">
                <LoadingOutlined spin />
                {{ cancelling ? '正在中止回答生成...' : '智能助手正在组织思考并持续输出中...' }}
              </span>
              <a-button
                size="small"
                danger
                :loading="cancelling"
                class="stop-generation-btn"
                @click="handleCancelGeneration"
              >
                <StopOutlined /> 停止生成
              </a-button>
            </div>

            <!-- 输入区域 -->
            <div class="sender-input-box">
              <a-textarea
                ref="senderInputRef"
                v-model:value="inputText"
                placeholder="问问任何问题，按 Enter 发送，Shift + Enter 换行..."
                :auto-size="{ minRows: 2, maxRows: 6 }"
                :maxlength="2000"
                :disabled="generating || initialLoading || !currentAgentId"
                class="sender-textarea"
                @keydown="handleKeydown"
              />

              <!-- 输入框底部控制条 -->
              <div class="sender-control-row">
                <span class="char-counter du-mono">
                  {{ inputText.length }} / 2000
                </span>

                <div class="sender-buttons">
                  <!-- 生成中：停止按钮 -->
                  <a-button
                    v-if="generating"
                    type="primary"
                    danger
                    shape="round"
                    :loading="cancelling"
                    class="action-send-btn"
                    @click="handleCancelGeneration"
                  >
                    <StopOutlined /> 停止
                  </a-button>

                  <!-- 待发送：发送按钮 -->
                  <a-button
                    v-else
                    type="primary"
                    shape="round"
                    class="action-send-btn"
                    :disabled="!inputText.trim() || initialLoading || !currentAgentId"
                    @click="handleSendMessage"
                  >
                    <SendOutlined /> 发送
                  </a-button>
                </div>
              </div>
            </div>
          </div>

          <div class="footer-disclaimer">
            内容均由大模型 AI 自动化生成，可能存在局限性，请核对重要商业及技术信息。
          </div>
        </footer>
      </main>
    </div>

    <!-- 知识库引用文档原件详情弹窗 -->
    <a-modal
      v-model:open="citationModalOpen"
      title="知识库引用来源详情"
      :footer="null"
      width="640px"
      class="citation-preview-modal"
    >
      <div v-if="selectedCitation" class="citation-modal-body">
        <a-descriptions bordered size="small" :column="1">
          <a-descriptions-item label="引用编号">
            <a-tag color="blue">[{{ selectedCitation.number }}]</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="文档名称">
            <strong>{{ selectedCitation.documentName }}</strong>
          </a-descriptions-item>
          <a-descriptions-item v-if="selectedCitation.source?.headings?.length" label="结构章节">
            {{ selectedCitation.source.headings.join(' > ') }}
          </a-descriptions-item>
          <a-descriptions-item v-if="selectedCitation.source?.pageNumbers?.length" label="原件页码">
            第 {{ selectedCitation.source.pageNumbers.join(', ') }} 页
          </a-descriptions-item>
          <a-descriptions-item label="分片 ID">
            <span class="du-mono">{{ selectedCitation.chunkId }}</span>
          </a-descriptions-item>
        </a-descriptions>

        <div class="citation-modal-footer">
          <a-button
            type="primary"
            :loading="downloadingDoc"
            @click="handleDownloadCitationFile"
          >
            <DownloadOutlined /> 下载文档原件
          </a-button>
          <a-button @click="citationModalOpen = false">关闭</a-button>
        </div>
      </div>
    </a-modal>
  </a-watermark>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  ArrowRightOutlined,
  BookOutlined,
  BulbOutlined,
  CompassOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  DownOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  ExportOutlined,
  LoadingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  PlusOutlined,
  ReloadOutlined,
  RobotOutlined,
  RollbackOutlined,
  SendOutlined,
  StopOutlined,
  UpOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import { getAgentPage } from '@/apis/ai/agent'
import type { AgentSummary } from '@/apis/ai/agent/type'
import {
  cancelChatRun,
  createChatSession,
  getAgentChatProfile,
  getChatMessageList,
  getChatSessionList,
  streamAgentChat,
} from '@/apis/ai/chat'
import type {
  AgentCitation,
  AgentChatMessageVO,
  AgentChatProfileVO,
  AgentChatSessionVO,
} from '@/apis/ai/chat/type'
import { getKnowledgeDownloadUrl } from '@/apis/ai/document'
import { tenantsStore, userStore } from '@/stores/modules/user'

const router = useRouter()
const userState = userStore()
const tenantState = tenantsStore()

// 1. 响应式布局状态
const sidebarCollapsed = ref(false)
const previewTheme = ref<'light' | 'dark'>('light')

// 水印与用户信息
const userDisplayName = computed(() => {
  return userState.userInfo.nickName || userState.userInfo.userName || '当前用户'
})
const currentTenantName = computed(() => {
  return tenantState.userTenant.currentTenant?.tenantName || '默认租户'
})
const watermarkContent = computed<string[]>(() => {
  return ['AI Workspace', userDisplayName.value]
})

// 2. Agent 列表与当前 Agent
const loadingAgents = ref(false)
const agentOptions = ref<AgentSummary[]>([])
const currentAgentId = ref<string>('')
const currentProfile = ref<AgentChatProfileVO | null>(null)
const initialLoading = ref(false)

// 3. 会话列表与当前会话
const loadingSessions = ref(false)
const sessionList = ref<AgentChatSessionVO[]>([])
const currentSession = ref<AgentChatSessionVO | null>(null)
const editingSessionId = ref<string | null>(null)
const editingTitle = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)

// 4. 消息流转
const messages = ref<AgentChatMessageVO[]>([])
const hasMoreHistory = ref(false)
const loadingMoreHistory = ref(false)

// 5. 输入框与流式生成状态
const inputText = ref('')
const generating = ref(false)
const cancelling = ref(false)
const activeRunId = ref<string | null>(null)
let activeAbortController: AbortController | null = null
const senderInputRef = ref<any>(null)

// 打字机字符级缓冲器（平滑打字机）
let charQueue: string[] = []
let rafHandle: number | null = null
let currentStreamingMessage: AgentChatMessageVO | null = null
let isStreamFinished = false
let streamDoneData: { inputTokens?: number; outputTokens?: number } | null = null

// 滚动控制
const messagesContainerRef = ref<HTMLElement | null>(null)
const isNearBottom = ref(true)

// 引用来源弹窗
const citationModalOpen = ref(false)
const selectedCitation = ref<AgentCitation | null>(null)
const downloadingDoc = ref(false)

// 时间分组计算属性（今天、前 7 天、更早）
interface SessionGroup {
  title: string
  items: AgentChatSessionVO[]
}
const groupedSessions = computed<SessionGroup[]>(() => {
  const today: AgentChatSessionVO[] = []
  const last7Days: AgentChatSessionVO[] = []
  const earlier: AgentChatSessionVO[] = []

  const now = new Date()
  const oneDayMs = 24 * 60 * 60 * 1000

  sessionList.value.forEach((sess) => {
    const timeStr = sess.lastMessageTime || sess.createTime
    const time = timeStr ? new Date(timeStr).getTime() : 0
    const diffDays = (now.getTime() - time) / oneDayMs

    if (diffDays <= 1) {
      today.push(sess)
    } else if (diffDays <= 7) {
      last7Days.push(sess)
    } else {
      earlier.push(sess)
    }
  })

  const groups: SessionGroup[] = []
  if (today.length) groups.push({ title: '今天', items: today })
  if (last7Days.length) groups.push({ title: '过去 7 天', items: last7Days })
  if (earlier.length) groups.push({ title: '更早的会话', items: earlier })

  return groups
})

// 时间格式化
const formatTime = (isoString?: string) => {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  } catch {
    return isoString
  }
}

// 图片降级
const handleImgFallback = (e: Event) => {
  const target = e.target as HTMLImageElement
  if (target) target.style.display = 'none'
}

// 容器滚动监听
const handleContainerScroll = () => {
  if (!messagesContainerRef.value) return
  const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.value
  isNearBottom.value = scrollHeight - scrollTop - clientHeight < 80
}

// 自动滚动触底
const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
  nextTick(() => {
    if (!messagesContainerRef.value) return
    messagesContainerRef.value.scrollTo({
      top: messagesContainerRef.value.scrollHeight,
      behavior,
    })
  })
}

const scrollToBottomSmooth = () => scrollToBottom('smooth')

// 折叠展开推理过程
const toggleReasoning = (msg: any) => {
  msg._reasoningExpanded = msg._reasoningExpanded === false
}

// 启动字符级平滑打字机
const startRafDrain = () => {
  if (rafHandle !== null) return

  const drain = () => {
    if (!currentStreamingMessage) {
      rafHandle = null
      return
    }

    if (charQueue.length > 0) {
      const qLen = charQueue.length
      // 动态步长：积压较少时 1~2 个字/帧，积压中等时 3~5 个字/帧，积压严重时平滑追赶
      const step = qLen > 120 ? 8 : qLen > 50 ? 5 : qLen > 20 ? 3 : qLen > 5 ? 2 : 1
      const count = Math.min(charQueue.length, step)
      const chunk = charQueue.splice(0, count).join('')
      currentStreamingMessage.content = (currentStreamingMessage.content || '') + chunk

      if (isNearBottom.value) {
        scrollToBottom('auto')
      }
    }

    // 检查是否继续下一帧
    if (charQueue.length > 0 || !isStreamFinished) {
      rafHandle = requestAnimationFrame(drain)
    } else {
      // 队列全部消费完毕，且后端流已经发送了 done 事件 -> 真正完成！
      rafHandle = null
      if (currentStreamingMessage && currentStreamingMessage.messageStatus === 'generating') {
        currentStreamingMessage.messageStatus = 'completed'
        if (streamDoneData?.inputTokens) currentStreamingMessage.inputTokens = streamDoneData.inputTokens
        if (streamDoneData?.outputTokens) currentStreamingMessage.outputTokens = streamDoneData.outputTokens
      }
      generating.value = false
      activeRunId.value = null
      if (isNearBottom.value) {
        scrollToBottom('smooth')
      }
    }
  }

  rafHandle = requestAnimationFrame(drain)
}

// 强制截断打字机（仅在主动停止或出错时调用）
const stopTypewriterImmediately = () => {
  if (rafHandle !== null) {
    cancelAnimationFrame(rafHandle)
    rafHandle = null
  }
  charQueue = []
  isStreamFinished = true
  streamDoneData = null
}

// =================== 业务加载与会话联动 ===================

/** 1. 加载所有已发布已启用的 Agent 列表 */
const loadAgents = async () => {
  loadingAgents.value = true
  try {
    const res = await getAgentPage({
      dataStatus: 1,
      published: true,
      current: 1,
      size: 100,
    })
    const list = res.data?.records || []
    agentOptions.value = list
    if (list.length > 0 && !currentAgentId.value) {
      currentAgentId.value = String(list[0].id)
      await handleAgentChange(currentAgentId.value)
    }
  } catch (err: any) {
    message.error(err?.message || '加载 Agent 列表失败')
  } finally {
    loadingAgents.value = false
  }
}

/** 2. 切换当前 Agent */
const handleAgentChange = async (agentId: string) => {
  if (!agentId) return
  initialLoading.value = true
  try {
    // 获取 Agent 的聊天配置（头像、开场白、引导词、知识库引用配置）
    const profileRes = await getAgentChatProfile(agentId, 'chat')
    currentProfile.value = profileRes.data || null

    // 重新拉取该 Agent 的会话列表
    await loadSessionsForAgent(agentId)
  } catch (err: any) {
    message.error(err?.message || '获取助手配置失败')
  } finally {
    initialLoading.value = false
  }
}

/** 3. 拉取当前 Agent 的会话列表 */
const loadSessionsForAgent = async (agentId: string) => {
  loadingSessions.value = true
  try {
    const res = await getChatSessionList({
      agentId,
      size: 50,
    })
    const list = res.data || []
    sessionList.value = list

    if (list.length > 0) {
      // 默认选中第一个活跃会话
      await handleSelectSession(list[0])
    } else {
      // 无会话时自动新建会话或置空
      currentSession.value = null
      messages.value = []
    }
  } catch (err: any) {
    message.error(err?.message || '获取会话历史失败')
  } finally {
    loadingSessions.value = false
  }
}

/** 4. 选中某个会话并加载其消息 */
const handleSelectSession = async (sess: AgentChatSessionVO) => {
  if (generating.value) {
    message.warning('正在生成回答中，请等待完成或点击停止后再切换会话')
    return
  }
  currentSession.value = sess
  messages.value = []
  hasMoreHistory.value = false

  try {
    const res = await getChatMessageList(String(sess.id), { size: 50 })
    const list = res.data || []
    messages.value = list
    hasMoreHistory.value = list.length >= 50
    scrollToBottom('auto')
  } catch (err: any) {
    message.error(err?.message || '加载会话消息失败')
  }
}

/** 5. 新建会话 */
const handleCreateNewSession = async () => {
  if (!currentAgentId.value) {
    message.warning('请先选择一个 Agent 助手')
    return
  }
  if (generating.value) {
    message.warning('当前回答生成中，请先停止生成')
    return
  }

  try {
    const defaultTitle = `${currentProfile.value?.name || '智能助手'} 对话 ${new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}`
    const res = await createChatSession({
      agentId: currentAgentId.value,
      conversationType: 'chat',
      title: defaultTitle,
    })
    if (res.data) {
      sessionList.value.unshift(res.data)
      currentSession.value = res.data
      messages.value = []
      hasMoreHistory.value = false
      nextTick(() => {
        senderInputRef.value?.focus()
      })
    }
  } catch (err: any) {
    message.error(err?.message || '创建会话失败')
  }
}

/** 6. 重命名会话 */
const handleStartRename = (sess: AgentChatSessionVO) => {
  editingSessionId.value = String(sess.id)
  editingTitle.value = sess.title || ''
  nextTick(() => {
    renameInputRef.value?.focus()
  })
}

const handleSaveRename = (sess: AgentChatSessionVO) => {
  if (!editingSessionId.value) return
  const newTitle = editingTitle.value.trim()
  if (newTitle && newTitle !== sess.title) {
    sess.title = newTitle
    // 若后端有独立的 PATCH session 接口可在此同步
    message.success('已更新会话标题')
  }
  editingSessionId.value = null
}

/** 7. 删除会话 */
const handleDeleteSession = (sess: AgentChatSessionVO) => {
  sessionList.value = sessionList.value.filter((item) => item.id !== sess.id)
  if (currentSession.value?.id === sess.id) {
    if (sessionList.value.length > 0) {
      handleSelectSession(sessionList.value[0])
    } else {
      currentSession.value = null
      messages.value = []
    }
  }
  message.success('已删除对话')
}

/** 8. 加载更早的历史消息 */
const handleLoadMoreMessages = async () => {
  if (!currentSession.value || loadingMoreHistory.value) return
  const firstMsg = messages.value[0]
  if (!firstMsg) return

  loadingMoreHistory.value = true
  const oldScrollHeight = messagesContainerRef.value?.scrollHeight || 0

  try {
    const res = await getChatMessageList(String(currentSession.value.id), {
      beforeSequence: firstMsg.sequenceNo,
      size: 50,
    })
    const list = res.data || []
    if (list.length > 0) {
      messages.value = [...list, ...messages.value]
      hasMoreHistory.value = list.length >= 50
      nextTick(() => {
        if (!messagesContainerRef.value) return
        const newScrollHeight = messagesContainerRef.value.scrollHeight
        messagesContainerRef.value.scrollTop = newScrollHeight - oldScrollHeight
      })
    } else {
      hasMoreHistory.value = false
    }
  } catch (err: any) {
    message.error(err?.message || '加载更早消息失败')
  } finally {
    loadingMoreHistory.value = false
  }
}

// =================== 发送与 SSE 核心通信 ===================

/** 发送按键拦截（Enter 发送，Shift+Enter 换行） */
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (!generating.value && inputText.value.trim() && !initialLoading.value && currentAgentId.value) {
      handleSendMessage()
    }
  }
}

/** 快捷点击 Prompts 发送 */
const handleQuickSend = (question: string) => {
  inputText.value = question
  handleSendMessage()
}

/** 主发送逻辑 */
const handleSendMessage = async () => {
  const content = inputText.value.trim()
  if (!content || generating.value || !currentAgentId.value) return

  // 若当前无会话，先自动创建会话
  if (!currentSession.value) {
    try {
      const defaultTitle = content.slice(0, 16) || '新对话'
      const sessRes = await createChatSession({
        agentId: currentAgentId.value,
        conversationType: 'chat',
        title: defaultTitle,
      })
      if (sessRes.data) {
        sessionList.value.unshift(sessRes.data)
        currentSession.value = sessRes.data
      }
    } catch (err: any) {
      message.error(err?.message || '自动初始化会话失败')
      return
    }
  }

  const sessionId = String(currentSession.value!.id)
  inputText.value = ''

  // 1. 本地立即追加 User 气泡
  const userMsg: AgentChatMessageVO = {
    id: `local-user-${Date.now()}`,
    sequenceNo: (messages.value[messages.value.length - 1]?.sequenceNo || 0) + 1,
    role: 'user',
    content,
    messageStatus: 'completed',
    createTime: new Date().toISOString(),
  }
  messages.value.push(userMsg)

  // 2. 本地预埋 Assistant 气泡（等待 SSE 填充）
  const assistantMsg: AgentChatMessageVO = {
    id: `local-assistant-${Date.now()}`,
    sequenceNo: userMsg.sequenceNo + 1,
    role: 'assistant',
    content: '',
    messageStatus: 'generating',
    createTime: new Date().toISOString(),
  }
  messages.value.push(assistantMsg)

  currentStreamingMessage = assistantMsg
  charQueue = []
  isStreamFinished = false
  streamDoneData = null
  generating.value = true
  cancelling.value = false
  activeRunId.value = null
  activeAbortController = new AbortController()

  scrollToBottom('smooth')
  startRafDrain()

  const requestId = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  try {
    await streamAgentChat(
      sessionId,
      {
        content,
        requestId,
      },
      {
        onStart: (evt) => {
          if (evt.runId) activeRunId.value = String(evt.runId)
          if (evt.messageId) assistantMsg.id = evt.messageId
        },
        onReferences: (evt) => {
          if (evt.references && evt.references.length) {
            assistantMsg.citations = evt.references
          }
        },
        onDelta: (evt) => {
          if (evt.text) {
            // 将接收到的文本逐字解构，推入字符级平滑队列
            const chars = Array.from(evt.text)
            charQueue.push(...chars)
          }
          if ((evt as any).reasoningDelta) {
            const currentReasoning = (assistantMsg as any).reasoningContent || ''
            ;(assistantMsg as any).reasoningContent = currentReasoning + (evt as any).reasoningDelta
          }
        },
        onDone: (evt) => {
          // 标记后端传输已结束，不强制清空队列，交由打字机平滑敲完所有剩余字符！
          isStreamFinished = true
          streamDoneData = {
            inputTokens: evt.inputTokens,
            outputTokens: evt.outputTokens,
          }
        },
        onError: (evt) => {
          stopTypewriterImmediately()
          assistantMsg.messageStatus = 'failed'
          assistantMsg.errorMessage = evt.errorMessage || '模型回答遇到异常中断'
          generating.value = false
          activeRunId.value = null
        },
        onHttpError: (_code, errorMsg) => {
          stopTypewriterImmediately()
          assistantMsg.messageStatus = 'failed'
          assistantMsg.errorMessage = errorMsg
          generating.value = false
          activeRunId.value = null
          message.error(errorMsg)
        },
      },
      activeAbortController.signal,
    )
    isStreamFinished = true
  } catch (error: any) {
    stopTypewriterImmediately()
    generating.value = false
    activeRunId.value = null
  }
}

/** 停止回答生成 */
const handleCancelGeneration = async () => {
  cancelling.value = true
  try {
    if (activeAbortController) {
      activeAbortController.abort()
      activeAbortController = null
    }
    if (activeRunId.value) {
      await cancelChatRun(activeRunId.value)
    }
    stopTypewriterImmediately()
    if (currentStreamingMessage) {
      currentStreamingMessage.messageStatus = 'interrupted'
    }
    message.info('已停止生成')
  } catch (err: any) {
    message.warn('已在本地断开连接')
  } finally {
    generating.value = false
    cancelling.value = false
    activeRunId.value = null
  }
}

/** 重新生成回答 */
const handleRegenerate = (msg: AgentChatMessageVO) => {
  const msgIdx = messages.value.findIndex((m) => m.id === msg.id)
  if (msgIdx <= 0) return
  const prevUserMsg = messages.value[msgIdx - 1]
  if (prevUserMsg && prevUserMsg.role === 'user') {
    inputText.value = prevUserMsg.content
    handleSendMessage()
  }
}

/** 复制消息内容 */
const handleCopyMessage = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  } catch {
    message.warning('无法访问剪贴板，请手动复制')
  }
}

/** 查看与下载引用来源文档 */
const handleOpenCitation = (cit: AgentCitation) => {
  selectedCitation.value = cit
  citationModalOpen.value = true
}

const handleDownloadCitationFile = async () => {
  if (!selectedCitation.value) return
  downloadingDoc.value = true
  try {
    const res = await getKnowledgeDownloadUrl(
      String(selectedCitation.value.documentId),
    )
    if (res.data) {
      window.open(res.data, '_blank')
    }
  } catch (err: any) {
    message.error(err?.message || '获取原件下载地址失败')
  } finally {
    downloadingDoc.value = false
  }
}

/** 返回后台管理系统 */
const handleBackToAdmin = () => {
  router.push('/dashboard')
}

onMounted(() => {
  loadAgents()
})

onUnmounted(() => {
  if (rafHandle !== null) {
    cancelAnimationFrame(rafHandle)
  }
  if (activeAbortController) {
    activeAbortController.abort()
  }
})
</script>

<style scoped>
/* 全屏工作台外壳：彻底独占视口 */
.chat-workspace-app {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: var(--du-color-bg-page, #f8f9fa);
  color: var(--du-color-text, #1f2328);
  font-family: var(--du-font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif);
}

.workspace-container {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* ================= 1. 左侧沉浸式会话历史侧栏 ================= */
.workspace-sidebar {
  width: 260px;
  min-width: 260px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-right: 1px solid var(--du-color-border, #e5e7eb);
  transition: width 0.24s cubic-bezier(0.4, 0, 0.2, 1), transform 0.24s ease;
  z-index: 20;
}

.workspace-sidebar.is-collapsed {
  width: 0;
  min-width: 0;
  overflow: hidden;
  border-right: none;
  visibility: hidden;
}

.sidebar-header {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--du-color-border, #f0f0f0);
}

.brand-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--du-color-primary, #1677ff);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.brand-text {
  font-weight: 600;
  font-size: 14px;
  letter-spacing: -0.2px;
}

.sidebar-toggle-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--du-color-text-secondary, #6b7280);
  font-size: 15px;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
}

.sidebar-toggle-btn:hover {
  background: #f3f4f6;
  color: var(--du-color-text, #111827);
}

.new-chat-wrap {
  padding: 12px 14px 6px;
}

.new-chat-btn {
  height: 36px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 2px 6px rgba(22, 119, 255, 0.16);
}

/* 侧栏会话滚动区 */
.session-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 10px 10px;
}

.session-loading,
.session-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 0;
  color: var(--du-color-text-tertiary, #9ca3af);
  font-size: 12px;
}

.empty-icon {
  font-size: 24px;
}

.session-group-block {
  margin-bottom: 16px;
}

.group-title {
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--du-color-text-tertiary, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.group-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.session-item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s;
  color: var(--du-color-text, #374151);
  position: relative;
}

.session-item-row:hover {
  background-color: #f3f4f6;
}

.session-item-row.active {
  background-color: #e6f4ff;
  color: var(--du-color-primary, #1677ff);
  font-weight: 500;
}

.item-icon {
  font-size: 14px;
  opacity: 0.7;
}

.item-title {
  flex: 1;
  font-size: 12.5px;
  user-select: none;
}

.session-inline-edit {
  flex: 1;
}

.edit-input {
  font-size: 12px;
}

.item-actions {
  display: none;
  align-items: center;
  gap: 4px;
}

.session-item-row:hover .item-actions {
  display: flex;
}

.action-icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 12px;
  color: #6b7280;
  transition: all 0.15s;
}

.action-icon-btn:hover {
  background: #e5e7eb;
  color: #111827;
}

.action-icon-btn.danger:hover {
  background: #fee2e2;
  color: #ef4444;
}

/* 侧栏底部个人信息 */
.sidebar-footer {
  padding: 10px 12px;
  border-top: 1px solid var(--du-color-border, #f0f0f0);
  background-color: #fafafa;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 130px;
}

.user-avatar-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #4b5563;
}

.user-names {
  line-height: 1.25;
}

.user-main-name {
  font-size: 12px;
  font-weight: 500;
}

.user-sub {
  font-size: 10px;
  color: #9ca3af;
}

.back-admin-btn {
  font-size: 11.5px;
  color: var(--du-color-text-secondary, #6b7280);
}

.back-admin-btn:hover {
  color: var(--du-color-primary, #1677ff);
}

/* ================= 2. 右侧主工作舞台 ================= */
.workspace-main {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  position: relative;
  overflow: hidden;
}

/* 顶栏工具条 */
.main-header {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--du-color-border, #f0f0f0);
  background: #ffffff;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar-expand-btn {
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 14px;
  color: #4b5563;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.sidebar-expand-btn:hover {
  background: #f9fafb;
  color: var(--du-color-primary, #1677ff);
}

.agent-selector-wrap {
  min-width: 200px;
}

.agent-select {
  width: 220px;
}

.agent-option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
}

.opt-avatar {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  overflow: hidden;
}

.opt-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.opt-info {
  line-height: 1.25;
  overflow: hidden;
}

.opt-name {
  font-size: 12px;
  font-weight: 500;
}

.opt-desc {
  font-size: 10px;
  color: #9ca3af;
  max-width: 220px;
}

.current-agent-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 12px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  font-size: 11px;
}

.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
}

.agent-title-text {
  font-weight: 500;
  color: #166534;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-tool-btn {
  font-size: 12px;
}

.header-back-link {
  font-size: 12px;
}

/* 核心消息流滚动舞台 */
.messages-scroll-stage {
  flex: 1;
  overflow-y: auto;
  position: relative;
  padding: 24px 20px 40px;
}

.stage-centered-loading {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 初始沉浸欢迎态（Welcome & Prompts） */
.welcome-stage {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
}

.welcome-center-box {
  max-width: 680px;
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.welcome-avatar-lg {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, #1677ff 0%, #36cfc9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 32px;
  box-shadow: 0 8px 24px rgba(22, 119, 255, 0.2);
  margin-bottom: 20px;
  overflow: hidden;
}

.welcome-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.welcome-title {
  font-size: 22px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 10px;
  letter-spacing: -0.3px;
}

.welcome-desc {
  font-size: 13.5px;
  color: #6b7280;
  line-height: 1.6;
  max-width: 520px;
  margin-bottom: 32px;
}

.suggested-prompts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  width: 100%;
}

.prompt-card {
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.prompt-card:hover {
  border-color: var(--du-color-primary, #1677ff);
  background: #fafafa;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
}

.prompt-card-icon {
  font-size: 16px;
  color: var(--du-color-primary, #1677ff);
}

.prompt-card-text {
  flex: 1;
  font-size: 12.5px;
  line-height: 1.4;
  color: #374151;
  font-weight: 500;
}

.prompt-arrow-icon {
  font-size: 12px;
  color: #9ca3af;
  opacity: 0;
  transition: opacity 0.15s, transform 0.15s;
}

.prompt-card:hover .prompt-arrow-icon {
  opacity: 1;
  transform: translateX(2px);
}

/* 消息列表流 */
.message-stream-list {
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.history-load-more {
  text-align: center;
  margin-bottom: 10px;
}

.message-turn-row {
  display: flex;
  gap: 14px;
}

.message-turn-row.user-turn {
  flex-direction: row-reverse;
}

.turn-avatar {
  flex-shrink: 0;
}

.user-avatar-badge,
.assistant-avatar-badge {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}

.user-avatar-badge {
  background: #111827;
  color: #ffffff;
}

.assistant-avatar-badge {
  background: var(--du-color-primary, #1677ff);
  color: #ffffff;
}

.assistant-avatar-img {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  object-fit: cover;
}

.turn-content-wrap {
  max-width: 82%;
  display: flex;
  flex-direction: column;
}

.user-turn .turn-content-wrap {
  align-items: flex-end;
}

.turn-meta-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 11px;
  color: #9ca3af;
}

.turn-author {
  font-weight: 500;
  color: #4b5563;
}

/* 气泡样式 */
.turn-bubble {
  border-radius: 12px;
  padding: 12px 16px;
  line-height: 1.6;
  position: relative;
  word-break: break-word;
}

.user-bubble-theme {
  background: #1677ff;
  color: #ffffff;
  border-bottom-right-radius: 3px;
  box-shadow: 0 2px 6px rgba(22, 119, 255, 0.2);
}

.user-text-content {
  font-size: 13px;
  white-space: pre-wrap;
}

.assistant-bubble-theme {
  background: #ffffff;
  color: #1f2328;
  border: 1px solid #e5e7eb;
  border-bottom-left-radius: 3px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

/* 深度思考过程（DeepSeek-R1 / o1 折叠卡片） */
.reasoning-card {
  margin-bottom: 12px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 8px;
  overflow: hidden;
}

.reasoning-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 12px;
  cursor: pointer;
  background: #f1f5f9;
  user-select: none;
}

.reasoning-title-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: #475569;
  font-weight: 500;
}

.reasoning-spin {
  color: var(--du-color-primary, #1677ff);
}

.reasoning-icon {
  color: #f59e0b;
}

.reasoning-arrow {
  font-size: 10px;
  color: #94a3b8;
  transition: transform 0.2s;
}

.reasoning-arrow.is-expanded {
  transform: rotate(180deg);
}

.reasoning-body {
  padding: 8px 12px;
  border-top: 1px solid #e2e8f0;
  max-height: 260px;
  overflow-y: auto;
}

.reasoning-text {
  font-size: 11.5px;
  color: #64748b;
  margin: 0;
  white-space: pre-wrap;
  font-family: var(--du-font-mono, monospace);
  line-height: 1.5;
}

/* MdPreview 覆盖适配 */
.chat-md-preview {
  background: transparent !important;
  font-size: 13px;
}

:deep(.default-theme) {
  padding: 0 !important;
}

/* 呼吸灯光标 */
.stream-cursor {
  display: inline-block;
  width: 7px;
  height: 15px;
  vertical-align: -2px;
  background: var(--du-color-primary, #1677ff);
  margin-left: 3px;
  animation: cursorBlink 0.9s infinite;
}

@keyframes cursorBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* 异常提示 */
.status-alert {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
}

.failed-alert {
  background: #fef2f2;
  color: #ef4444;
  border: 1px solid #fecaca;
}

.interrupted-alert {
  background: #fefce8;
  color: #ca8a04;
  border: 1px solid #fef08a;
}

/* 知识库引用卡片排布 */
.citations-container {
  margin-top: 10px;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #e5e7eb;
}

.citations-header {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.citations-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.citation-card {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 4px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  font-size: 11px;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.citation-card:hover {
  border-color: #1677ff;
  color: #1677ff;
  background: #f0f7ff;
}

.cit-tag {
  color: #1677ff;
  font-weight: 600;
}

.cit-doc-name {
  max-width: 150px;
}

.cit-heading {
  color: #9ca3af;
  max-width: 120px;
}

.cit-link-icon {
  font-size: 10px;
  opacity: 0.6;
}

/* 消息操作微工具条 */
.turn-actions-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
  padding-left: 4px;
}

.turn-action-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #9ca3af;
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.15s;
}

.turn-action-btn:hover {
  color: #374151;
  background: #f3f4f6;
}

.token-metrics {
  font-size: 10px;
  color: #9ca3af;
  margin-left: auto;
}

/* 悬浮回到底部按钮 */
.scroll-down-float-btn {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 11.5px;
  color: #374151;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
  z-index: 10;
}

.scroll-down-float-btn:hover {
  background: #f9fafb;
  border-color: #1677ff;
  color: #1677ff;
}

/* ================= 3. 底部现代胶囊输入器 (Sender) ================= */
.workspace-footer {
  padding: 12px 20px 18px;
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sender-capsule-card {
  max-width: 860px;
  width: 100%;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.sender-capsule-card:focus-within {
  border-color: var(--du-color-primary, #1677ff);
  box-shadow: 0 6px 20px rgba(22, 119, 255, 0.12);
}

.generating-top-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  background: #f0f7ff;
  border-bottom: 1px solid #bae0ff;
  font-size: 11.5px;
  color: #0958d9;
}

.stop-generation-btn {
  height: 24px;
  font-size: 11.5px;
}

.sender-input-box {
  padding: 10px 14px 8px;
}

.sender-textarea {
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  font-size: 13.5px;
  line-height: 1.5;
  resize: none;
}

.sender-textarea:focus {
  border: none !important;
  box-shadow: none !important;
}

.sender-control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  padding-top: 4px;
}

.char-counter {
  font-size: 11px;
  color: #9ca3af;
}

.action-send-btn {
  height: 32px;
  padding: 0 16px;
  font-size: 12.5px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.footer-disclaimer {
  margin-top: 8px;
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
}

/* 引用弹窗 */
.citation-modal-body {
  padding-top: 8px;
}

.citation-modal-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
