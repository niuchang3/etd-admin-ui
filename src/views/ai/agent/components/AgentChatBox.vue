<template>
  <div class="agent-chat-box" :class="{ 'compact-mode': compact }">
    <!-- 顶部状态栏：Agent 基础信息与会话操作 -->
    <header class="chat-header">
      <div class="agent-meta">
        <div class="agent-avatar-wrap">
          <img
            v-if="profile?.avatarPath"
            :src="profile.avatarPath"
            alt="avatar"
            class="agent-avatar"
            @error="handleAvatarError"
          />
          <RobotOutlined v-else class="avatar-fallback" />
        </div>
        <div class="agent-titles">
          <div class="name-line">
            <span class="agent-name">{{ profile?.name || '智能助手' }}</span>
            <a-tag v-if="conversationType === 'debug'" color="orange" class="mode-tag">
              草稿调试模式
            </a-tag>
            <a-tag v-else color="blue" class="mode-tag">
              正式对话
            </a-tag>
          </div>
          <div class="agent-desc du-ellipsis" :title="profile?.description">
            {{ profile?.description || '暂无详细描述' }}
          </div>
        </div>
      </div>

      <div class="header-actions">
        <!-- 历史会话抽屉触发器 -->
        <a-button size="small" class="session-btn" @click="sessionDrawerOpen = true">
          <HistoryOutlined />
          <span class="btn-text">历史会话 ({{ sessionList.length }})</span>
        </a-button>

        <a-button size="small" type="primary" :disabled="generating" @click="handleCreateSession">
          <PlusOutlined />
          <span class="btn-text">新建会话</span>
        </a-button>

        <a-button v-if="$attrs.onClose" type="text" size="small" class="close-btn" @click="$emit('close')">
          <CloseOutlined />
        </a-button>
      </div>
    </header>

    <!-- 核心消息区与滚动容器 -->
    <main ref="scrollContainerRef" class="chat-messages-container" @scroll="handleContainerScroll">
      <!-- 权限拦截：草稿调试要求维护权限 -->
      <div v-if="conversationType === 'debug' && !canWrite" class="permission-blocked">
        <LockOutlined class="blocked-icon" />
        <div class="blocked-title">无权访问草稿调试</div>
        <div class="blocked-desc">草稿调试需要具备该 Agent 的维护权限与写操作资格。</div>
      </div>

      <!-- 正常消息内容 -->
      <template v-else>
        <!-- 历史消息向前翻页指示器 -->
        <div v-if="hasMoreHistory" class="history-more-row">
          <a-button
            type="link"
            size="small"
            :loading="loadingMoreHistory"
            @click="handleLoadMoreMessages"
          >
            <UpOutlined /> 查看更早的历史消息
          </a-button>
        </div>

        <!-- 开场欢迎卡片：采用 ant-design-x-vue 的 Welcome 与 Prompts 组件 -->
        <div v-if="profile?.openingMessage || (profile?.suggestedQuestions && profile.suggestedQuestions.length)" class="welcome-section-wrap">
          <Welcome
            v-if="profile?.openingMessage"
            :title="profile.name || '智能助手'"
            :description="profile.openingMessage"
            variant="filled"
            class="custom-welcome-card"
          >
            <template #icon>
              <div class="welcome-avatar-icon">
                <img
                  v-if="profile.avatarPath"
                  :src="profile.avatarPath"
                  alt="avatar"
                  class="welcome-avatar-img"
                  @error="handleAvatarError"
                />
                <RobotOutlined v-else />
              </div>
            </template>
          </Welcome>

          <!-- 推荐引导问题：采用 ant-design-x-vue 的 Prompts 组件 -->
          <div v-if="suggestedPromptItems.length" class="prompts-container">
            <Prompts
              title="您可能想问："
              :items="suggestedPromptItems"
              class="custom-prompts-list"
              @item-click="handlePromptClick"
            />
          </div>
        </div>

        <!-- 消息气泡列表：采用 ant-design-x-vue 的 Bubble 组件 -->
        <div class="bubbles-wrapper">
          <Bubble
            v-for="msg in messages"
            :key="msg.id || msg.sequenceNo"
            :placement="msg.role === 'user' ? 'end' : 'start'"
            :variant="msg.role === 'user' ? 'filled' : 'outlined'"
            :loading="msg.role === 'assistant' && msg.messageStatus === 'generating' && !msg.content"
            class="custom-bubble-item"
            :class="{ 'user-bubble': msg.role === 'user', 'assistant-bubble': msg.role === 'assistant' }"
          >
            <!-- 头像插槽 -->
            <template #avatar>
              <div v-if="msg.role === 'user'" class="bubble-avatar-mark user-avatar">
                <UserOutlined />
              </div>
              <div v-else class="bubble-avatar-mark assistant-avatar">
                <img
                  v-if="profile?.avatarPath"
                  :src="profile.avatarPath"
                  alt="avatar"
                  class="avatar-img"
                  @error="handleAvatarError"
                />
                <RobotOutlined v-else />
              </div>
            </template>

            <!-- 头部插槽：角色名称与时间 -->
            <template #header>
              <div class="bubble-header-info">
                <span class="sender-name">{{ msg.role === 'user' ? '我' : (profile?.name || '助手') }}</span>
                <span v-if="msg.createTime" class="send-time du-mono">{{ formatTime(msg.createTime) }}</span>
              </div>
            </template>

            <!-- 消息正文与动态光标 -->
            <template #message>
              <div class="bubble-message-text">
                <span>{{ msg.content }}</span>
                <span v-if="msg.role === 'assistant' && msg.messageStatus === 'generating'" class="typing-cursor"></span>
              </div>

              <!-- 异常状态提示 -->
              <div v-if="msg.messageStatus === 'failed'" class="status-alert failed-alert">
                <ExclamationCircleOutlined />
                <span>{{ msg.errorMessage || '本次回答生成遇到异常中断' }}</span>
              </div>

              <!-- 用户停止提示 -->
              <div v-else-if="msg.messageStatus === 'interrupted'" class="status-alert interrupted-alert">
                <StopOutlined />
                <span>生成已由用户主动停止</span>
              </div>
            </template>

            <!-- 底部插槽：知识库引用与 Token 统计 -->
            <template #footer>
              <div class="bubble-footer-content">
                <!-- 知识库引用来源（citationEnabled !== false 且有引用时展示） -->
                <div
                  v-if="profile?.citationEnabled !== false && msg.citations && msg.citations.length"
                  class="citations-section"
                >
                  <div class="citations-header">
                    <BookOutlined class="citations-icon" />
                    <span class="citations-title">参考知识库引用来源 ({{ msg.citations.length }})：</span>
                  </div>
                  <div class="citations-grid">
                    <div
                      v-for="citation in msg.citations"
                      :key="citation.number || citation.chunkId"
                      class="citation-card"
                      @click="handleViewCitation(citation)"
                    >
                      <div class="citation-number">[{{ citation.number }}]</div>
                      <div class="citation-content">
                        <div class="citation-doc-name du-ellipsis" :title="citation.documentName">
                          {{ citation.documentName || '未命名知识文档' }}
                        </div>
                        <div class="citation-meta du-mono">
                          <span v-if="citation.source?.pageNumbers && citation.source.pageNumbers.length" class="meta-tag">
                            P.{{ citation.source.pageNumbers.join(', ') }}
                          </span>
                          <span v-if="citation.source?.headings && citation.source.headings.length" class="meta-heading du-ellipsis">
                            {{ citation.source.headings[0] }}
                          </span>
                        </div>
                      </div>
                      <div class="citation-link-icon" title="查看/下载文档原件">
                        <ExportOutlined />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Token 用量统计 -->
                <div
                  v-if="msg.role === 'assistant' && (msg.inputTokens || msg.outputTokens)"
                  class="message-metrics du-mono"
                >
                  <span v-if="msg.inputTokens">输入: {{ msg.inputTokens }} tokens</span>
                  <span v-if="msg.outputTokens">输出: {{ msg.outputTokens }} tokens</span>
                </div>
              </div>
            </template>
          </Bubble>
        </div>

        <!-- 初始加载状态 -->
        <div v-if="initialLoading" class="center-loading">
          <a-spin tip="正在加载会话与配置..." />
        </div>
      </template>

      <!-- 悬浮“回到底部”按钮 -->
      <transition name="fade">
        <button
          v-if="!isNearBottom && messages.length > 3"
          type="button"
          class="scroll-bottom-float-btn"
          @click="scrollToBottomSmooth"
        >
          <DownOutlined />
          <span>回到底部</span>
        </button>
      </transition>
    </main>

    <!-- 底部输入操作区：采用 ant-design-x-vue 的 Sender 组件 -->
    <footer class="chat-footer">
      <div class="sender-container">
        <Sender
          v-model:value="inputContent"
          :loading="generating"
          :disabled="initialLoading || (conversationType === 'debug' && !canWrite)"
          placeholder="输入您的问题，按 Enter 发送，Shift + Enter 换行..."
          class="custom-x-sender"
          @submit="handleSendMessage"
          @cancel="handleCancelGeneration"
        >
          <template #footer>
            <div class="sender-footer-info">
              <span class="char-count du-mono">{{ inputContent.length }} / 2000</span>
              <span v-if="generating" class="generating-tip">
                <LoadingOutlined spin /> {{ cancelling ? '正在停止生成...' : 'Agent 正在思考并输出回答...' }}
              </span>
            </div>
          </template>
        </Sender>
      </div>
    </footer>

    <!-- 历史会话抽屉：采用 ant-design-x-vue 的 Conversations 组件呈现 -->
    <a-drawer
      v-model:open="sessionDrawerOpen"
      title="历史会话"
      placement="left"
      :width="320"
      :get-container="false"
      :style="{ position: 'absolute' }"
      class="session-list-drawer"
    >
      <div class="session-drawer-content">
        <a-button
          type="dashed"
          block
          :disabled="generating"
          class="create-session-drawer-btn"
          @click="handleCreateSessionFromDrawer"
        >
          <PlusOutlined /> 新建会话
        </a-button>

        <div v-if="conversationItems.length" class="conversations-wrapper">
          <Conversations
            :items="conversationItems"
            :active-key="currentSession ? String(currentSession.id) : undefined"
            class="custom-x-conversations"
            @active-change="handleConversationChange"
          />

          <div v-if="hasMoreSessions" class="load-more-session-wrap">
            <a-button
              type="link"
              size="small"
              :loading="loadingMoreSessions"
              @click="handleLoadMoreSessions"
            >
              加载更多历史会话...
            </a-button>
          </div>
        </div>

        <div v-else class="session-empty">
          <a-empty description="暂无历史会话" />
        </div>
      </div>
    </a-drawer>

    <!-- 引用来源原件预览/下载弹窗 -->
    <a-modal
      v-model:open="citationModalOpen"
      :title="selectedCitation ? `[${selectedCitation.number}] ${selectedCitation.documentName}` : '引用来源详情'"
      :footer="null"
      :width="540"
      class="citation-detail-modal"
    >
      <div v-if="selectedCitation" class="citation-modal-body">
        <a-descriptions bordered size="small" :column="1">
          <a-descriptions-item label="引用编号">
            <span class="du-mono">[{{ selectedCitation.number }}]</span>
          </a-descriptions-item>
          <a-descriptions-item label="所属文档">
            <span>{{ selectedCitation.documentName }}</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="selectedCitation.source?.pageNumbers?.length" label="出现页码">
            <span class="du-mono">第 {{ selectedCitation.source.pageNumbers.join(', ') }} 页</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="selectedCitation.source?.headings?.length" label="层级章节">
            <div class="heading-path-list">
              <div v-for="(h, hIdx) in selectedCitation.source.headings" :key="hIdx" class="heading-line">
                {{ h }}
              </div>
            </div>
          </a-descriptions-item>
        </a-descriptions>

        <div class="citation-actions">
          <a-button
            type="primary"
            :loading="downloadingDoc"
            @click="handleOpenSourceDocument(selectedCitation.documentId)"
          >
            <ExportOutlined /> 打开并下载文档原件
          </a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, nextTick, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  BookOutlined,
  CloseOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  ExportOutlined,
  HistoryOutlined,
  LoadingOutlined,
  LockOutlined,
  MessageOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  RobotOutlined,
  StopOutlined,
  UpOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { Bubble, Conversations, Prompts, Sender, Welcome } from 'ant-design-x-vue'
import type { Conversation } from 'ant-design-x-vue'
import {
  cancelChatRun,
  createChatSession,
  getChatMessageList,
  getAgentChatProfile,
  getChatRun,
  getChatRunByRequest,
  getChatSessionList,
  streamAgentChat,
} from '@/apis/ai/chat'
import { getKnowledgeDownloadUrl } from '@/apis/ai/document'
import type {
  AgentCitation,
  AgentChatProfileVO,
  AgentChatRunVO,
  AgentChatSessionVO,
  AgentChatMessageVO,
  ConversationType,
} from '@/apis/ai/chat/type'

interface Props {
  agentId: string
  conversationType?: ConversationType
  canWrite?: boolean
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  conversationType: 'chat',
  canWrite: true,
  compact: false,
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

// 状态管理
const profile = ref<AgentChatProfileVO | null>(null)
const initialLoading = ref(false)
const sessionDrawerOpen = ref(false)
const sessionList = ref<AgentChatSessionVO[]>([])
const currentSession = ref<AgentChatSessionVO | null>(null)
const hasMoreSessions = ref(false)
const loadingMoreSessions = ref(false)

// 消息列表与向前翻页
const messages = ref<AgentChatMessageVO[]>([])
const hasMoreHistory = ref(false)
const loadingMoreHistory = ref(false)

// 输入与流式生成控制
const inputContent = ref('')
const generating = ref(false)
const cancelling = ref(false)
const activeRunId = ref<string | null>(null)
const activeRequestId = ref<string | null>(null)
let activeAbortController: AbortController | null = null

// 打字机缓冲器（requestAnimationFrame 字符级逐字平滑打字）
let deltaQueue: string[] = []
let rafHandle: number | null = null
let currentStreamingMessage: AgentChatMessageVO | null = null
let isBoxStreamFinished = false
let boxStreamDoneData: { inputTokens?: number; outputTokens?: number } | null = null

// 滚动控制
const scrollContainerRef = ref<HTMLElement | null>(null)
const isNearBottom = ref(true)

// 引用详情弹窗
const citationModalOpen = ref(false)
const selectedCitation = ref<AgentCitation | null>(null)
const downloadingDoc = ref(false)

// 转换 suggestedQuestions 为 Prompts 组件所需的 items
const suggestedPromptItems = computed(() => {
  if (!profile.value?.suggestedQuestions) return []
  return profile.value.suggestedQuestions.map((q) => ({
    key: q,
    label: q,
    icon: h(QuestionCircleOutlined),
    disabled: generating.value,
  }))
})

// 转换 sessionList 为 ant-design-x-vue 的 Conversations 组件所需格式
const conversationItems = computed<Conversation[]>(() => {
  return sessionList.value.map((sess) => ({
    key: String(sess.id),
    label: sess.title || '未命名会话',
    timestamp: sess.lastMessageTime ? new Date(sess.lastMessageTime).getTime() : new Date(sess.createTime).getTime(),
    icon: h(MessageOutlined),
    disabled: generating.value,
  }))
})

// 格式化时间
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
const handleAvatarError = (e: Event) => {
  const target = e.target as HTMLImageElement
  if (target) target.style.display = 'none'
}

// 检查是否靠近底部
const handleContainerScroll = () => {
  if (!scrollContainerRef.value) return
  const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.value
  isNearBottom.value = scrollHeight - scrollTop - clientHeight < 60
}

// 滚动到底部
const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
  nextTick(() => {
    if (!scrollContainerRef.value) return
    scrollContainerRef.value.scrollTo({
      top: scrollContainerRef.value.scrollHeight,
      behavior,
    })
  })
}

const scrollToBottomSmooth = () => scrollToBottom('smooth')

/**
 * 启动打字机动画帧调度器
 */
const startTypewriterLoop = () => {
  if (rafHandle !== null) return

  const pump = () => {
    if (!currentStreamingMessage) {
      rafHandle = null
      return
    }

    if (deltaQueue.length > 0) {
      // 动态步长调节：积压较少时 1~2 字/帧，积压中等时 3~5 字/帧，积压过多时平滑加速
      const qLen = deltaQueue.length
      const step = qLen > 120 ? 8 : qLen > 50 ? 5 : qLen > 20 ? 3 : qLen > 5 ? 2 : 1
      const count = Math.min(deltaQueue.length, step)
      const chunk = deltaQueue.splice(0, count).join('')
      currentStreamingMessage.content = (currentStreamingMessage.content || '') + chunk

      if (isNearBottom.value) {
        scrollToBottom('auto')
      }
    }

    // 若仍在传输中或队列中仍有字符，继续下一帧逐字吐出
    if (deltaQueue.length > 0 || !isBoxStreamFinished) {
      rafHandle = requestAnimationFrame(pump)
    } else {
      rafHandle = null
      if (currentStreamingMessage && currentStreamingMessage.messageStatus === 'generating') {
        currentStreamingMessage.messageStatus = 'completed'
        if (boxStreamDoneData?.inputTokens) currentStreamingMessage.inputTokens = boxStreamDoneData.inputTokens
        if (boxStreamDoneData?.outputTokens) currentStreamingMessage.outputTokens = boxStreamDoneData.outputTokens
      }
      generating.value = false
      activeRunId.value = null
      if (isNearBottom.value) {
        scrollToBottom('smooth')
      }
    }
  }

  rafHandle = requestAnimationFrame(pump)
}

/**
 * 强制中断打字机（仅在主动取消或网络异常中断时调用）
 */
const flushTypewriterQueue = () => {
  if (rafHandle !== null) {
    cancelAnimationFrame(rafHandle)
    rafHandle = null
  }
  deltaQueue = []
  isBoxStreamFinished = true
  boxStreamDoneData = null
}

/**
 * 1. 初始化加载 Agent 配置与默认会话
 */
const initialize = async () => {
  initialLoading.value = true
  try {
    // 获取 Agent 聊天配置
    const profileRes = await getAgentChatProfile(props.agentId, props.conversationType)
    profile.value = profileRes.data

    // 加载会话列表
    await loadSessions()

    // 默认选中第一个会话，若无则自动新建一个
    if (sessionList.value.length > 0) {
      await selectSession(sessionList.value[0])
    } else {
      await handleCreateSession()
    }
  } catch (error: any) {
    message.error(error?.message || '初始化聊天配置失败')
  } finally {
    initialLoading.value = false
  }
}

/**
 * 加载个人会话列表
 */
const loadSessions = async (beforeId?: string) => {
  try {
    const res = await getChatSessionList({
      agentId: props.agentId,
      beforeId,
      size: 20,
    })
    const list = res.data || []
    if (beforeId) {
      sessionList.value = [...sessionList.value, ...list]
    } else {
      sessionList.value = list
    }
    hasMoreSessions.value = list.length === 20
  } catch (err: any) {
    console.error('加载会话列表失败:', err)
  }
}

const handleLoadMoreSessions = async () => {
  if (loadingMoreSessions.value || !sessionList.value.length) return
  loadingMoreSessions.value = true
  try {
    const lastId = sessionList.value[sessionList.value.length - 1].id
    await loadSessions(String(lastId))
  } finally {
    loadingMoreSessions.value = false
  }
}

/**
 * 选中并切换会话
 */
const selectSession = async (session: AgentChatSessionVO) => {
  if (generating.value) {
    message.warning('当前会话正在生成回答，请稍后再切换')
    return
  }
  currentSession.value = session
  sessionDrawerOpen.value = false
  messages.value = []
  hasMoreHistory.value = false

  try {
    const res = await getChatMessageList(String(session.id), { size: 50 })
    messages.value = res.data || []
    hasMoreHistory.value = (res.data || []).length === 50
    scrollToBottom('auto')
  } catch (error: any) {
    message.error(error?.message || '加载消息历史失败')
  }
}

/**
 * ant-design-x-vue 的 Conversations 激活切换事件
 */
const handleConversationChange = async (key: string) => {
  const target = sessionList.value.find((s) => String(s.id) === key)
  if (target) {
    await selectSession(target)
  }
}

/**
 * 向前加载更多历史消息
 */
const handleLoadMoreMessages = async () => {
  if (loadingMoreHistory.value || !currentSession.value || !messages.value.length) return
  loadingMoreHistory.value = true

  const firstMsg = messages.value[0]
  const container = scrollContainerRef.value
  const previousScrollHeight = container?.scrollHeight || 0

  try {
    const res = await getChatMessageList(String(currentSession.value.id), {
      beforeSequence: firstMsg.sequenceNo,
      size: 50,
    })
    const earlierList = res.data || []
    if (earlierList.length) {
      messages.value = [...earlierList, ...messages.value]
      hasMoreHistory.value = earlierList.length === 50

      // 保持之前的滚动位置，避免跳跃
      nextTick(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - previousScrollHeight
        }
      })
    } else {
      hasMoreHistory.value = false
    }
  } catch (error: any) {
    message.error(error?.message || '加载更多历史失败')
  } finally {
    loadingMoreHistory.value = false
  }
}

/**
 * 创建新会话
 */
const handleCreateSession = async () => {
  if (generating.value) {
    message.warning('正在生成中，请稍后新建会话')
    return
  }
  try {
    const defaultTitle = `${profile.value?.name || 'Agent'} 咨询会话`
    const res = await createChatSession({
      agentId: props.agentId,
      conversationType: props.conversationType,
      title: defaultTitle,
    })
    const newSession = res.data
    sessionList.value.unshift(newSession)
    await selectSession(newSession)
  } catch (error: any) {
    message.error(error?.message || '创建会话失败')
  }
}

const handleCreateSessionFromDrawer = async () => {
  await handleCreateSession()
  sessionDrawerOpen.value = false
}

/**
 * 点击 Prompts 引导项直接填入并提交
 */
const handlePromptClick = (info: { data: { key: string; label?: any } }) => {
  if (generating.value) return
  const question = typeof info.data.label === 'string' ? info.data.label : info.data.key
  inputContent.value = question
  handleSendMessage(question)
}

/**
 * 发送消息并流式处理响应（支持 Sender 组件的 @submit 传参或直接触发）
 */
const handleSendMessage = async (customMessage?: string) => {
  const content = (typeof customMessage === 'string' ? customMessage : inputContent.value).trim()
  if (!content) return

  if (generating.value) {
    message.warning('当前有正在生成的回答，请等待完成或点击停止')
    return
  }

  if (props.conversationType === 'debug' && !props.canWrite) {
    message.error('无权调试该 Agent 草稿')
    return
  }

  if (!currentSession.value) {
    await handleCreateSession()
    if (!currentSession.value) return
  }

  // 1. 本地立即追加一条用户消息
  const userSequence = (messages.value[messages.value.length - 1]?.sequenceNo || 0) + 1
  const userMsg: AgentChatMessageVO = {
    id: `local_user_${Date.now()}`,
    sequenceNo: userSequence,
    role: 'user',
    content,
    messageStatus: 'completed',
    createTime: new Date().toISOString(),
  }
  messages.value.push(userMsg)

  // 2. 准备助手回复占位消息
  const assistantSequence = userSequence + 1
  const assistantMsg: AgentChatMessageVO = {
    id: `local_asst_${Date.now()}`,
    sequenceNo: assistantSequence,
    role: 'assistant',
    content: '',
    messageStatus: 'generating',
    citations: [],
    createTime: new Date().toISOString(),
  }
  messages.value.push(assistantMsg)
  currentStreamingMessage = assistantMsg

  // 3. 清空输入框并设置生成状态
  inputContent.value = ''
  generating.value = true
  cancelling.value = false
  deltaQueue = []
  isBoxStreamFinished = false
  boxStreamDoneData = null
  activeRunId.value = null

  // 客户端生成唯一 requestId（最多 64 字符）
  const requestId = crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}_${Math.random().toString(36).slice(2)}`
  activeRequestId.value = requestId
  activeAbortController = new AbortController()

  scrollToBottom('smooth')
  startTypewriterLoop()

  const sessionIdStr = String(currentSession.value.id)

  try {
    await streamAgentChat(
      sessionIdStr,
      { requestId, content },
      {
        onStart: (evt) => {
          activeRunId.value = String(evt.runId)
          assistantMsg.runId = evt.runId
          assistantMsg.id = String(evt.messageId)
        },
        onReferences: (evt) => {
          if (evt.references && evt.references.length) {
            assistantMsg.citations = evt.references
          }
        },
        onDelta: (evt) => {
          if (evt.text) {
            // 解构字符逐字入队，确保打字机视觉丝滑
            const chars = Array.from(evt.text)
            deltaQueue.push(...chars)
          }
        },
        onDone: (evt) => {
          // 标记后端传输完成，交由 pump 循环逐字敲完剩余字符
          isBoxStreamFinished = true
          boxStreamDoneData = {
            inputTokens: evt.inputTokens,
            outputTokens: evt.outputTokens,
          }
        },
        onError: (evt) => {
          flushTypewriterQueue()
          assistantMsg.messageStatus = 'failed'
          assistantMsg.errorCode = evt.errorCode
          assistantMsg.errorMessage = evt.errorMessage || '模型生成失败'
        },
        onHttpError: (_status, errMsg) => {
          flushTypewriterQueue()
          assistantMsg.messageStatus = 'failed'
          assistantMsg.errorMessage = errMsg
          message.error(errMsg)
        },
      },
      activeAbortController.signal,
    )
    isBoxStreamFinished = true
  } catch (error: any) {
    flushTypewriterQueue()
    // 若已被取消或终态处理，则不重复覆盖状态
    if (assistantMsg.messageStatus === 'generating') {
      assistantMsg.messageStatus = 'failed'
      assistantMsg.errorMessage = error?.message || '网络连接异常断开'
    }

    // 断线异常校准：若存在 activeRunId 或 requestId，向后端查询持久化结果
    void calibrateRunAfterDisconnect(sessionIdStr, activeRunId.value, activeRequestId.value, assistantMsg)
    generating.value = false
    cancelling.value = false
    activeAbortController = null
    currentStreamingMessage = null
  } finally {
    cancelling.value = false
    activeAbortController = null
  }
}

/**
 * 发生断线后向服务端校准状态与消息持久化结果
 */
const calibrateRunAfterDisconnect = async (
  sessionId: string,
  runId: string | null,
  requestId: string | null,
  targetMsg: AgentChatMessageVO,
) => {
  try {
    let runInfo: AgentChatRunVO | null = null
    if (runId) {
      const res = await getChatRun(runId)
      runInfo = res.data
    } else if (requestId) {
      const res = await getChatRunByRequest(sessionId, requestId)
      runInfo = res.data
    }

    if (runInfo) {
      const finishedRun = runInfo
      if (finishedRun.runStatus === 'succeeded') {
        targetMsg.messageStatus = 'completed'
      } else if (finishedRun.runStatus === 'cancelled') {
        targetMsg.messageStatus = 'interrupted'
      } else if (finishedRun.runStatus === 'failed') {
        targetMsg.messageStatus = 'failed'
        targetMsg.errorMessage = finishedRun.errorMessage || targetMsg.errorMessage
      }
      if (finishedRun.inputTokens) targetMsg.inputTokens = finishedRun.inputTokens
      if (finishedRun.outputTokens) targetMsg.outputTokens = finishedRun.outputTokens

      // 重新拉取一次最近的消息历史，校准已落库的正文和引用
      const msgRes = await getChatMessageList(sessionId, { size: 10 })
      const latestSaved = msgRes.data?.find((m) => String(m.runId) === String(finishedRun.id))
      if (latestSaved && latestSaved.content) {
        targetMsg.content = latestSaved.content
        if (latestSaved.citations) {
          targetMsg.citations = latestSaved.citations
        }
      }
    }
  } catch (err) {
    console.warn('[Chat] 断线后校准状态失败:', err)
  }
}

/**
 * 取消当前运行（支持 Sender 组件的 @cancel 事件触发）
 */
const handleCancelGeneration = async () => {
  if (!generating.value || cancelling.value) return

  cancelling.value = true
  if (currentStreamingMessage) {
    currentStreamingMessage.messageStatus = 'interrupted'
  }

  // 1. 如果已有 runId，立即调用 cancel 端点
  if (activeRunId.value) {
    try {
      await cancelChatRun(activeRunId.value)
    } catch (e: any) {
      console.warn('请求取消失败:', e)
    }
  }

  // 2. 中止前端 fetch 连接
  if (activeAbortController) {
    activeAbortController.abort()
  }

  flushTypewriterQueue()
  generating.value = false
  cancelling.value = false
}

/**
 * 点击引用卡片弹出详情
 */
const handleViewCitation = (citation: AgentCitation) => {
  selectedCitation.value = citation
  citationModalOpen.value = true
}

/**
 * 打开并下载引用原文档
 */
const handleOpenSourceDocument = async (docId: string | number) => {
  if (!docId) return
  downloadingDoc.value = true
  try {
    const res = await getKnowledgeDownloadUrl(String(docId))
    const url = res.data
    if (url) {
      window.open(url, '_blank')
    } else {
      message.warning('未获取到有效文档下载地址')
    }
  } catch (err: any) {
    message.error(err?.message || '获取文档授权失败')
  } finally {
    downloadingDoc.value = false
  }
}

// 监听 agentId 改变重新初始化
watch(
  () => props.agentId,
  (newId) => {
    if (newId) {
      handleCancelGeneration()
      initialize()
    }
  },
)

onMounted(() => {
  initialize()
})

// 组件销毁与路由切换时安全释放所有异步任务
const cleanup = () => {
  if (activeAbortController) {
    activeAbortController.abort()
    activeAbortController = null
  }
  if (rafHandle !== null) {
    cancelAnimationFrame(rafHandle)
    rafHandle = null
  }
}

onUnmounted(cleanup)
onDeactivated(cleanup)
</script>

<style scoped>
.agent-chat-box {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: var(--du-color-bg-container, #ffffff);
  border-radius: var(--du-border-radius, 4px);
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

/* 顶部状态栏 */
.chat-header {
  height: 52px;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--du-color-border-secondary, #f0f0f0);
  background-color: var(--du-color-bg-elevated, #fafafa);
  z-index: 2;
}

.agent-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.agent-avatar-wrap {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #e6f4ff;
  color: #1677ff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.agent-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  font-size: 18px;
}

.agent-titles {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.name-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.agent-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--du-color-text, #1f1f1f);
  white-space: nowrap;
}

.mode-tag {
  font-size: 10.5px;
  line-height: 18px;
  padding: 0 6px;
  margin: 0;
}

.agent-desc {
  font-size: 11px;
  color: var(--du-color-text-secondary, #8c8c8c);
  max-width: 380px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 消息流与滚动容器 */
.chat-messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background-color: var(--du-color-bg-layout, #f5f5f5);
  position: relative;
}

.history-more-row {
  text-align: center;
  margin-bottom: 4px;
}

/* Welcome 与 Prompts 样式 */
.welcome-section-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 8px;
}

.custom-welcome-card {
  background: var(--du-color-bg-container, #ffffff);
  border: 1px solid var(--du-color-border-secondary, #e8e8e8);
  border-radius: 8px;
  padding: 14px 18px;
}

.welcome-avatar-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e6f4ff;
  color: #1677ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  overflow: hidden;
}

.welcome-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.prompts-container {
  padding: 0 4px;
}

.custom-prompts-list :deep(.ant-prompts-title) {
  font-size: 12px;
  color: var(--du-color-text-secondary, #8c8c8c);
  margin-bottom: 8px;
}

/* 气泡流样式包装 */
.bubbles-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.custom-bubble-item {
  width: 100%;
}

.bubble-avatar-mark {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 15px;
}

.bubble-avatar-mark.assistant-avatar {
  background-color: #e6f4ff;
  color: #1677ff;
}

.bubble-avatar-mark.user-avatar {
  background-color: #f0f0f0;
  color: #595959;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bubble-header-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.sender-name {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--du-color-text-secondary, #8c8c8c);
}

.send-time {
  font-size: 10.5px;
  color: #bfbfbf;
}

.bubble-message-text {
  font-size: 12.5px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 用户气泡个性化 */
.user-bubble :deep(.ant-bubble-content) {
  background-color: #1677ff !important;
  color: #ffffff !important;
  border: none !important;
}

/* 助手气泡个性化 */
.assistant-bubble :deep(.ant-bubble-content) {
  background-color: var(--du-color-bg-container, #ffffff) !important;
  border: 1px solid var(--du-color-border-secondary, #e8e8e8) !important;
  color: var(--du-color-text, #262626) !important;
}

/* 打字机光标 */
.typing-cursor {
  display: inline-block;
  width: 6px;
  height: 14px;
  background-color: #1677ff;
  margin-left: 2px;
  vertical-align: middle;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* 异常与中断提示 */
.status-alert {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11.5px;
}

.failed-alert {
  background-color: #fff2f0;
  color: #cf1322;
  border: 1px solid #ffccc7;
}

.interrupted-alert {
  background-color: #fffbe6;
  color: #d46b08;
  border: 1px solid #ffe58f;
}

/* 知识库引用卡片 */
.citations-section {
  margin-top: 8px;
  padding: 8px 10px;
  background-color: #fafafa;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
}

.citations-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--du-color-text-secondary, #595959);
  font-weight: 500;
  margin-bottom: 6px;
}

.citations-icon {
  color: #1677ff;
}

.citations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 6px;
}

.citation-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background-color: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 3px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.citation-card:hover {
  border-color: #1677ff;
  background-color: #f0f7ff;
}

.citation-number {
  font-size: 11px;
  font-weight: 600;
  color: #1677ff;
}

.citation-content {
  flex: 1;
  min-width: 0;
}

.citation-doc-name {
  font-size: 11px;
  color: #262626;
}

.citation-meta {
  font-size: 10px;
  color: #8c8c8c;
  display: flex;
  gap: 6px;
}

.meta-tag {
  color: #1677ff;
}

.citation-link-icon {
  font-size: 11px;
  color: #8c8c8c;
}

.message-metrics {
  font-size: 10px;
  color: #bfbfbf;
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

/* 底部 Sender 区域 */
.chat-footer {
  padding: 12px 16px;
  background-color: var(--du-color-bg-container, #ffffff);
  border-top: 1px solid var(--du-color-border-secondary, #f0f0f0);
  z-index: 2;
}

.custom-x-sender :deep(.ant-sender-input) {
  font-size: 12.5px;
}

.sender-footer-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  font-size: 11px;
  color: #bfbfbf;
  margin-top: 4px;
}

.generating-tip {
  color: #1677ff;
  display: flex;
  align-items: center;
  gap: 6px;
}

.scroll-bottom-float-btn {
  position: absolute;
  right: 24px;
  bottom: 16px;
  padding: 6px 12px;
  border-radius: 16px;
  border: 1px solid #d9d9d9;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: #595959;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;
}

.scroll-bottom-float-btn:hover {
  color: #1677ff;
  border-color: #1677ff;
}

/* 历史会话抽屉与 Conversations */
.session-drawer-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.conversations-wrapper {
  flex: 1;
  overflow-y: auto;
}

.custom-x-conversations {
  width: 100%;
}

.load-more-session-wrap {
  text-align: center;
  margin-top: 8px;
}

.permission-blocked {
  margin: 60px auto;
  text-align: center;
  color: #8c8c8c;
}

.blocked-icon {
  font-size: 36px;
  color: #faad14;
  margin-bottom: 12px;
}

.blocked-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 6px;
}

.blocked-desc {
  font-size: 12px;
}

/* 引用弹窗 */
.citation-modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.heading-path-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.heading-line {
  font-size: 11.5px;
  color: #595959;
}

.citation-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
