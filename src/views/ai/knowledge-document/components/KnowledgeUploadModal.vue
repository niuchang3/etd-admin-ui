<template>
  <a-modal
    :open="open"
    :title="detail ? '资料断点续传' : '资料上传'"
    :width="680"
    :mask-closable="false"
    :closable="!busy && !cancelLoading"
    class="knowledge-upload-modal"
    @cancel="handleClose"
  >
    <a-spin :spinning="loading">
      <!-- 异常或重试提示 -->
      <a-alert
        v-if="!loading && (!configValid || !policy)"
        type="error"
        show-icon
        class="modal-top-alert"
      >
        <template #message>
          <div class="config-error-message">
            <span>{{ !configValid ? `上传配置异常（${configError || '参数未生效'}），已暂停文件上传。` : '上传策略加载失败，已暂停文件上传。' }}</span>
            <a-button type="link" size="small" class="retry-action-btn" @click="loadModalData">重试加载</a-button>
          </div>
        </template>
      </a-alert>

      <a-alert
        v-else
        type="info"
        :message="detail ? '当前处于断点续传模式，请选择与原资料一致的本地文件以继续未完成分片传输。' : '支持单个或批量文件选择与拖拽上传，系统将根据服务端策略切片并自动校验 SHA-256。'"
        show-icon
        class="modal-top-alert"
      />

      <a-form layout="vertical" class="upload-form">
        <a-form-item label="分类目录">
          <a-input :value="folder?.folderName || detail?.folderId" disabled />
        </a-form-item>

        <a-form-item v-if="!detail" label="租户内共享" extra="开启后租户内其他部门成员可跨部门读取、预览与下载该资料（默认关闭）。">
          <div class="switch-row">
            <a-switch
              v-model:checked="isPublic"
              checked-children="共享"
              un-checked-children="私有"
              :disabled="busy || loading || !canWrite || terminal"
            />
            <span class="switch-desc">
              {{ isPublic ? '已开启跨部门共享，租户内其他成员可查看与下载' : '仅资料所属部门及有权限人员可见' }}
            </span>
          </div>
        </a-form-item>

        <a-form-item label="本地文件">
          <!-- Ant Design Vue 规范拖拽上传区域：支持单选、多选与拖拽 -->
          <a-upload-dragger
            :before-upload="handleBeforeUpload"
            :show-upload-list="false"
            :accept="accept"
            :multiple="!detail"
            :disabled="busy || loading || !canWrite || terminal || !configValid || !policy"
            class="standard-file-dragger"
          >
            <!-- 断点续传已选文件展示 -->
            <div v-if="detail && file" class="file-selected-box">
              <FileTextOutlined class="file-icon" />
              <div class="file-meta">
                <div class="file-name" :title="file.name">{{ file.name }}</div>
                <div class="file-size du-mono">{{ formatFileSize(file.size) }}</div>
              </div>
              <a-button
                type="link"
                size="small"
                :disabled="busy"
                @click.stop="handleRemoveResumeFile"
              >
                重新选择
              </a-button>
            </div>

            <!-- 常规拖拽上传占位区 -->
            <div v-else class="dragger-placeholder">
              <p class="dragger-icon">
                <InboxOutlined />
              </p>
              <p class="dragger-title">点击或将本地文件拖拽到此区域上传</p>
              <p class="dragger-tip">
                {{ detail ? '请选择与原资料一致的文件以补传分片' : '支持逐文件或批量添加，计算哈希前将严格校验格式与大小' }}
              </p>
              <!-- 核心动态文案：单个文件不超过 {maxSizeMb} MiB -->
              <p v-if="configValid && maxSizeMb" class="dragger-limit">
                单个文件不超过 {{ maxSizeMb }} MiB
              </p>
              <p v-if="configValid && supportedFormatsText" class="dragger-formats">
                支持格式：{{ supportedFormatsText }}
              </p>
              <p v-else-if="!loading && !configValid" class="dragger-formats-error">
                上传配置未就绪，已暂停文件上传
              </p>
            </div>
          </a-upload-dragger>

          <!-- 批量待上传文件队列 -->
          <div v-if="!detail && uploadQueue.length > 0" class="upload-queue-container">
            <div class="queue-header">
              <span class="queue-title">
                待上传文件列表（{{ uploadQueue.length }}）
                <span v-if="completedQueueCount > 0" class="queue-completed-badge">
                  已完成 {{ completedQueueCount }}
                </span>
              </span>
              <a-button
                v-if="!busy"
                type="link"
                size="small"
                class="queue-clear-btn"
                @click="handleClearQueue"
              >
                清空列表
              </a-button>
            </div>

            <div class="queue-list">
              <div
                v-for="item in uploadQueue"
                :key="item.uid"
                class="queue-item"
                :class="`status-${item.status}`"
              >
                <div class="item-main">
                  <FileTextOutlined class="item-icon" />
                  <div class="item-info">
                    <div class="item-name" :title="item.file.name">{{ item.file.name }}</div>
                    <div class="item-meta du-mono">
                      <span>{{ formatFileSize(item.file.size) }}</span>
                      <span v-if="item.status === 'hashing'" class="item-state-text hashing">
                        计算摘要 {{ item.hashProgress }}%
                      </span>
                      <span v-else-if="item.status === 'uploading'" class="item-state-text uploading">
                        分片上传 {{ item.uploadProgress }}%
                      </span>
                      <span v-else-if="item.status === 'merging'" class="item-state-text merging">
                        服务端合并中...
                      </span>
                      <span v-else-if="item.status === 'completed'" class="item-state-text completed">
                        已完成
                      </span>
                      <span v-else-if="item.status === 'failed'" class="item-state-text failed">
                        失败：{{ item.error || '上传中断' }}
                      </span>
                      <span v-else class="item-state-text pending">待上传</span>
                    </div>
                  </div>
                </div>

                <div class="item-actions">
                  <span v-if="item.status === 'completed'" class="status-icon completed">
                    <CheckCircleOutlined />
                  </span>
                  <span v-else-if="item.status === 'failed'" class="status-icon failed" :title="item.error">
                    <CloseCircleOutlined />
                  </span>
                  <span v-else-if="item.status === 'hashing' || item.status === 'uploading' || item.status === 'merging'" class="status-icon busy">
                    <LoadingOutlined />
                  </span>
                  <a-button
                    v-if="!busy && item.status !== 'completed'"
                    type="link"
                    size="small"
                    danger
                    class="item-delete-btn"
                    @click="handleRemoveQueueItem(item.uid)"
                  >
                    <DeleteOutlined />
                  </a-button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="policy" class="policy-tip du-mono">
            单文件生效上限 {{ formatEffectiveLimit }} · 策略分片 {{ formatFileSize(policy.partSizeBytes) }} · 会话 {{ policy.sessionSeconds }}s · 凭证 {{ policy.urlSeconds }}s
          </div>
        </a-form-item>
      </a-form>

      <!-- 续传会话状态卡片 -->
      <div v-if="detail" class="session-info-card">
        <div class="info-item">
          <span class="info-label">资料 ID：</span>
          <span class="info-value du-mono">{{ detail.id }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">上传状态：</span>
          <span class="info-value">{{ getLabel(KNOWLEDGE_DICT_TYPE.UPLOAD_STATUS, detail.uploadStatus) }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">会话截止：</span>
          <span class="info-value du-mono">{{ detail.uploadExpiresAt || '—' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">共享状态：</span>
          <span class="info-value">{{ detail.isPublic ? '租户内共享' : '私有' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">分片进度：</span>
          <span class="info-value du-mono">已确认 {{ detail.uploadParts?.length || 0 }} / {{ detail.partCount }} 片</span>
        </div>
      </div>

      <!-- 续传模式计算摘要与上传进度条 -->
      <div v-if="detail && hashing" class="progress-section">
        <div class="progress-label">
          <span>正在计算文件 SHA-256 校验和...</span>
          <span class="du-mono">{{ hashProgress }}%</span>
        </div>
        <a-progress :percent="hashProgress" status="active" size="small" :show-info="false" />
      </div>

      <div v-if="detail && !hashing" class="progress-section">
        <div class="progress-label">
          <span>{{ merging ? '分片传输完成，服务端合并中...' : '分片传输进度' }}</span>
          <span class="du-mono">{{ resumeUploadProgress }}%</span>
        </div>
        <a-progress :percent="resumeUploadProgress" :status="merging ? 'active' : undefined" size="small" :show-info="false" />
      </div>

      <a-alert v-if="notice" :message="notice" type="warning" show-icon class="status-notice" />
    </a-spin>

    <template #footer>
      <div class="modal-footer-bar">
        <div class="footer-left">
          <a-popconfirm
            v-if="canWrite && detail && !terminal"
            title="取消后该上传会话无法续传，确定取消？"
            ok-text="确认取消"
            cancel-text="暂不取消"
            @confirm="handleCancel"
          >
            <a-button danger :disabled="busy || cancelLoading" :loading="cancelLoading">
              取消会话
            </a-button>
          </a-popconfirm>
          <a-button v-if="canWrite && busy && !merging" @click="handlePause">
            暂停
          </a-button>
          <a-button v-if="detail" :disabled="busy || cancelLoading" @click="handleRefresh">
            <ReloadOutlined />刷新进度
          </a-button>
        </div>

        <div class="footer-right">
          <a-button :disabled="busy || cancelLoading" @click="handleClose">
            关闭
          </a-button>
          <a-button
            v-if="canWrite && !terminal"
            type="primary"
            :loading="busy"
            :disabled="submitDisabled"
            @click="handleSubmit"
          >
            <UploadOutlined />{{ submitButtonText }}
          </a-button>
        </div>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  FileTextOutlined,
  InboxOutlined,
  LoadingOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import { menusStore } from '@/stores/modules/user'
import { getSystemConfigValues } from '@/apis/upms/config'
import {
  cancelKnowledgeUpload,
  completeKnowledgeUpload,
  createKnowledgeUpload,
  getKnowledgeDocument,
  getKnowledgeUploadPolicy,
  resumeKnowledgeUpload,
} from '@/apis/ai/document'
import type {
  KnowledgeDocumentDetail,
  KnowledgeDocumentFolder,
  KnowledgeDocumentRecord,
  KnowledgeUploadPolicy,
} from '@/apis/ai/document/type'
import {
  KNOWLEDGE_DICT_TYPE,
  KNOWLEDGE_UPLOAD_CONFIG_KEY,
  KNOWLEDGE_UPLOAD_STATUS as UPLOAD,
} from '@/constant'
import { useSystemDict } from '@/composables/useSystemDict'
import { formatFileSize } from '@/utils/format'
import { calculateFileHash, uploadMissingParts } from '../upload/transfer'
import {
  canResumeUpload,
  canUseFolder,
  parseKnowledgeUploadConfig,
  validateKnowledgeUploadFile,
} from '../helper'

export interface UploadQueueItem {
  uid: string
  file: File
  status: 'pending' | 'hashing' | 'uploading' | 'merging' | 'completed' | 'failed'
  hashProgress: number
  uploadProgress: number
  documentDetail?: KnowledgeDocumentDetail | null
  error?: string
}

const props = defineProps<{
  open: boolean
  knowledgeBaseId?: string
  defaultIsPublic?: boolean
  folder: KnowledgeDocumentFolder | null
  folders: KnowledgeDocumentFolder[]
  record: KnowledgeDocumentRecord | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path))
const { getLabel } = useSystemDict([KNOWLEDGE_DICT_TYPE.UPLOAD_STATUS])

const detail = ref<KnowledgeDocumentDetail | null>(null)
const policy = ref<KnowledgeUploadPolicy | null>(null)
const accept = ref('')
const allowedExtensions = ref<string[]>([])
const maxSizeMb = ref<number | undefined>(undefined)
const configValid = ref(false)
const configError = ref('')
const supportedFormatsText = computed(() => allowedExtensions.value.join('、'))

// 单文件续传模式绑定的文件
const file = ref<File | null>(null)
// 新建上传模式下的待上传队列
const uploadQueue = ref<UploadQueueItem[]>([])

const isPublic = ref(false)
const loading = ref(false)
const busy = ref(false)
const cancelLoading = ref(false)
const hashing = ref(false)
const merging = ref(false)
const hashProgress = ref(0)
const notice = ref('')

const terminal = computed(
  () =>
    detail.value?.uploadStatus === UPLOAD.COMPLETED ||
    detail.value?.uploadStatus === UPLOAD.CANCELLED
)

/** 续传模式下的上传进度 */
const resumeUploadProgress = computed(() => {
  if (!detail.value) return 0
  const bytes = (detail.value.uploadParts || []).reduce((sum, part) => sum + Number(part.size), 0)
  return Math.min(100, Math.round((bytes / Number(detail.value.fileSize)) * 100))
})

/** 计算实际生效的单文件大小上限字节数（取配置与策略较小值） */
const effectiveMaxFileBytes = computed(() => {
  let bytes: number | undefined
  if (typeof maxSizeMb.value === 'number' && maxSizeMb.value > 0) {
    bytes = maxSizeMb.value * 1024 * 1024
  }
  if (policy.value && Number(policy.value.maxFileBytes) > 0) {
    const policyBytes = Number(policy.value.maxFileBytes)
    if (bytes === undefined || policyBytes < bytes) {
      bytes = policyBytes
    }
  }
  return bytes
})

const formatEffectiveLimit = computed(() => {
  if (effectiveMaxFileBytes.value === undefined) return '未设置'
  return formatFileSize(effectiveMaxFileBytes.value)
})

const pendingQueueCount = computed(
  () => uploadQueue.value.filter((item) => item.status === 'pending' || item.status === 'failed').length
)
const completedQueueCount = computed(
  () => uploadQueue.value.filter((item) => item.status === 'completed').length
)

const submitDisabled = computed(() => {
  if (loading.value || busy.value || cancelLoading.value || !configValid.value || !policy.value) {
    return true
  }
  if (detail.value) {
    return !file.value || terminal.value || initializationUncertain
  }
  return pendingQueueCount.value === 0 || initializationUncertain
})

const submitButtonText = computed(() => {
  if (detail.value) {
    return '继续 / 重试失败分片'
  }
  if (pendingQueueCount.value > 0) {
    return `开始上传 (${pendingQueueCount.value})`
  }
  return '开始上传'
})

let controller: AbortController | null = null
let requestToken = 0
let initializationUncertain = false

/** 加载配置、策略与文档详情 */
const loadModalData = async () => {
  const token = ++requestToken
  detail.value = null
  file.value = null
  uploadQueue.value = []
  isPublic.value = props.record?.isPublic ?? props.defaultIsPublic ?? false
  policy.value = null
  notice.value = ''
  accept.value = ''
  allowedExtensions.value = []
  maxSizeMb.value = undefined
  configValid.value = false
  configError.value = ''
  initializationUncertain = false
  loading.value = true

  try {
    const results = await Promise.allSettled([
      getKnowledgeUploadPolicy(),
      getSystemConfigValues([KNOWLEDGE_UPLOAD_CONFIG_KEY]),
      props.record ? getKnowledgeDocument(props.record.id) : Promise.resolve(null),
    ])
    if (token !== requestToken) return

    const [policyResult, configResult, detailResult] = results

    // 1. 处理系统配置 ai.knowledge.upload
    if (configResult.status === 'fulfilled') {
      const rawConfig = configResult.value.data?.[KNOWLEDGE_UPLOAD_CONFIG_KEY]
      const parseRes = parseKnowledgeUploadConfig(rawConfig)
      if (parseRes.valid) {
        configValid.value = true
        allowedExtensions.value = parseRes.allowedExtensions
        accept.value = parseRes.accept
        maxSizeMb.value = parseRes.maxSizeMb
      } else {
        configValid.value = false
        allowedExtensions.value = []
        accept.value = ''
        maxSizeMb.value = undefined
        configError.value = parseRes.error || '上传格式系统参数异常'
      }
    } else {
      configValid.value = false
      allowedExtensions.value = []
      accept.value = ''
      maxSizeMb.value = undefined
      configError.value = '上传系统参数加载失败'
    }

    // 2. 处理服务端上传策略
    if (policyResult.status === 'fulfilled') {
      const data = policyResult.value.data
      if (
        Number.isSafeInteger(Number(data.maxFileBytes)) &&
        Number(data.maxFileBytes) > 0 &&
        Number.isSafeInteger(Number(data.partSizeBytes)) &&
        Number(data.partSizeBytes) > 0
      ) {
        policy.value = data
      } else {
        notice.value = '上传策略无效，请联系管理员或重新加载。'
      }
    } else {
      notice.value = '上传策略加载失败，请重试。'
    }

    // 3. 处理资料详情（断点续传）
    if (!configValid.value) {
      notice.value = `上传配置异常（${configError.value}），已暂停文件上传。`
    } else if (detailResult.status === 'fulfilled' && detailResult.value) {
      detail.value = detailResult.value.data
      notice.value = '请重新选择原始文件，校验摘要后仅补传未确认分片。'
    } else if (detailResult.status === 'rejected') {
      initializationUncertain = true
      notice.value = '资料详情加载失败，请重试。'
    }
  } finally {
    if (token === requestToken) loading.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      loadModalData()
    }
  }
)

/**
 * 拦截 Ant Design 原生上传：
 * 文件选择、拖拽和批量上传均需在此处逐文件前置校验。
 * 超限文件不进入上传队列，其他合规文件继续加入队列处理。
 */
const handleBeforeUpload = (rawFile: File) => {
  if (!configValid.value) {
    message.error(configError.value ? `上传配置异常（${configError.value}），已暂停文件上传` : '上传配置尚未就绪，已暂停文件上传')
    return false
  }

  // 逐文件执行扩展名与大小校验（取 maxSizeMb 与 maxFileBytes 两者较小值，等于上限允许）
  const validation = validateKnowledgeUploadFile(rawFile, {
    allowedExtensions: allowedExtensions.value,
    maxSizeMb: maxSizeMb.value,
    maxFileBytes: policy.value ? Number(policy.value.maxFileBytes) : undefined,
  })

  // 超限或格式不符合：立即提示，不进入上传队列
  if (!validation.valid) {
    message.error(validation.error || '文件不符合要求，已拒绝上传')
    return false
  }

  // 断点续传模式：绑定单个文件
  if (detail.value) {
    if (detail.value.fileSize && rawFile.size !== Number(detail.value.fileSize)) {
      message.error(`所选文件大小与续传记录原始大小不一致（期望 ${formatFileSize(Number(detail.value.fileSize))}）`)
      return false
    }
    file.value = rawFile
    return false
  }

  // 新建上传模式：加入待上传队列（防重复添加）
  const exists = uploadQueue.value.some(
    (item) => item.file.name === rawFile.name && item.file.size === rawFile.size && item.status !== 'completed'
  )
  if (exists) {
    message.warning(`文件“${rawFile.name}”已在待上传列表中`)
    return false
  }

  uploadQueue.value.push({
    uid: `${rawFile.name}_${rawFile.size}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    file: rawFile,
    status: 'pending',
    hashProgress: 0,
    uploadProgress: 0,
  })

  return false
}

const handleRemoveResumeFile = () => {
  if (busy.value) return
  file.value = null
}

const handleRemoveQueueItem = (uid: string) => {
  if (busy.value) return
  uploadQueue.value = uploadQueue.value.filter((item) => item.uid !== uid)
}

const handleClearQueue = () => {
  if (busy.value) return
  uploadQueue.value = uploadQueue.value.filter(
    (item) => item.status === 'hashing' || item.status === 'uploading' || item.status === 'merging'
  )
}

const handleRefresh = async () => {
  if (!detail.value || busy.value) return
  loading.value = true
  try {
    detail.value = (await getKnowledgeDocument(detail.value.id)).data
  } catch {
    /* 请求层提示错误。 */
  } finally {
    loading.value = false
  }
}

/** 提交单文件续传 */
const submitResumeUpload = async (localFile: File) => {
  if (!detail.value || !policy.value) return
  if (!canResumeUpload(detail.value)) {
    notice.value = '当前会话不可续传，请刷新进度确认状态。'
    return
  }

  const validation = validateKnowledgeUploadFile(localFile, {
    allowedExtensions: allowedExtensions.value,
    maxSizeMb: maxSizeMb.value,
    maxFileBytes: Number(policy.value.maxFileBytes),
  })
  if (!validation.valid) {
    notice.value = validation.error || '文件校验失败'
    return
  }
  if (localFile.size !== Number(detail.value.fileSize)) {
    notice.value = '所选文件大小与原始文件不一致。'
    return
  }

  busy.value = true
  hashing.value = true
  hashProgress.value = 0
  notice.value = ''
  controller = new AbortController()
  const signal = controller.signal

  try {
    const digest = await calculateFileHash(localFile, signal, (progress) => {
      hashProgress.value = progress
    })
    hashing.value = false
    if (signal.aborted || !canWrite.value) return

    detail.value = (await resumeKnowledgeUpload(detail.value.id, digest)).data
    const current = detail.value
    if (signal.aborted || !canWrite.value) return
    if (current.uploadStatus === UPLOAD.COMPLETED) {
      message.success('文件已上传完成')
      emit('success')
      return
    }
    if (!canResumeUpload(current)) {
      notice.value = '当前会话不可续传，请刷新状态。'
      return
    }
    if (
      !Number.isSafeInteger(Number(current.partSizeBytes)) ||
      Number(current.partSizeBytes) <= 0 ||
      !Number.isInteger(current.partCount) ||
      current.partCount < 1 ||
      Math.ceil(localFile.size / Number(current.partSizeBytes)) !== current.partCount
    ) {
      throw new Error('服务端分片策略异常，请刷新详情')
    }

    await uploadMissingParts(localFile, current, signal, () => canWrite.value, (parts) => {
      if (detail.value) detail.value.uploadParts = parts
    })
    if (signal.aborted || !canWrite.value) return

    merging.value = true
    detail.value = (await completeKnowledgeUpload(current.id)).data
    message.success('资料上传完成')
    emit('success')
  } catch (error) {
    if (signal.aborted) {
      notice.value = '已暂停本地传输，已确认分片保留，可继续上传。'
    } else if (!notice.value) {
      notice.value = error instanceof Error ? error.message : '上传未完成，请检查详情后继续。'
    }

    if (detail.value) {
      try {
        detail.value = (await getKnowledgeDocument(detail.value.id)).data
        if (detail.value.uploadStatus === UPLOAD.COMPLETED) {
          notice.value = '服务端已完成上传。'
        } else if (merging.value) {
          notice.value = `合并结果已查询，请按当前上传状态处理：${getLabel(KNOWLEDGE_DICT_TYPE.UPLOAD_STATUS, detail.value.uploadStatus)}`
        }
      } catch {
        notice.value += ' 详情暂时无法确认，请先刷新进度，不要重复初始化。'
      }
      emit('success')
    }
  } finally {
    busy.value = false
    hashing.value = false
    merging.value = false
    controller = null
  }
}

/** 提交批量队列上传 */
const submitBatchQueueUpload = async () => {
  if (!policy.value) return
  if (!canUseFolder(props.folder || undefined)) {
    message.warning('请选择有效的可写入分类目录')
    return
  }

  const pendingItems = uploadQueue.value.filter(
    (item) => item.status === 'pending' || item.status === 'failed'
  )
  if (pendingItems.length === 0) {
    message.info('当前没有待上传的文件')
    return
  }

  busy.value = true
  notice.value = ''
  controller = new AbortController()
  const signal = controller.signal

  let successCount = 0
  let failCount = 0

  for (const item of pendingItems) {
    if (signal.aborted || !canWrite.value) break

    // 防御性二次前置校验
    const validation = validateKnowledgeUploadFile(item.file, {
      allowedExtensions: allowedExtensions.value,
      maxSizeMb: maxSizeMb.value,
      maxFileBytes: Number(policy.value.maxFileBytes),
    })
    if (!validation.valid) {
      item.status = 'failed'
      item.error = validation.error
      failCount++
      continue
    }

    try {
      // 1. 计算文件哈希
      item.status = 'hashing'
      item.hashProgress = 0
      const digest = await calculateFileHash(item.file, signal, (progress) => {
        item.hashProgress = progress
      })
      if (signal.aborted || !canWrite.value) break

      // 2. 初始化上传会话
      item.status = 'uploading'
      item.uploadProgress = 0
      const initRes = await createKnowledgeUpload({
        knowledgeBaseId: props.knowledgeBaseId || '',
        folderId: props.folder!.id,
        originalFilename: item.file.name,
        contentType: item.file.type || 'application/octet-stream',
        fileSize: item.file.size,
        fileSha256: digest,
        isPublic: isPublic.value,
      })
      item.documentDetail = initRes.data
      const currentDetail = item.documentDetail

      if (signal.aborted || !canWrite.value) break
      if (currentDetail.uploadStatus === UPLOAD.COMPLETED) {
        item.status = 'completed'
        item.uploadProgress = 100
        successCount++
        emit('success')
        continue
      }

      // 3. 上传分片
      await uploadMissingParts(item.file, currentDetail, signal, () => canWrite.value, (parts) => {
        currentDetail.uploadParts = parts
        const uploadedBytes = parts.reduce((sum, p) => sum + Number(p.size), 0)
        item.uploadProgress = Math.min(100, Math.round((uploadedBytes / Number(currentDetail.fileSize)) * 100))
      })
      if (signal.aborted || !canWrite.value) break

      // 4. 服务端合并
      item.status = 'merging'
      const completeRes = await completeKnowledgeUpload(currentDetail.id)
      item.documentDetail = completeRes.data
      item.status = 'completed'
      item.uploadProgress = 100
      successCount++
      emit('success')
    } catch (err) {
      if (signal.aborted) {
        notice.value = '上传已暂停，已确认分片保留，可继续上传。'
        break
      } else {
        item.status = 'failed'
        item.error = err instanceof Error ? err.message : '上传失败'
        failCount++
      }
    }
  }

  busy.value = false
  controller = null

  if (successCount > 0 && failCount === 0) {
    message.success(`成功上传 ${successCount} 个资料文件`)
  } else if (successCount > 0 && failCount > 0) {
    message.warning(`上传处理完毕：成功 ${successCount} 个，失败 ${failCount} 个`)
  } else if (failCount > 0) {
    message.error(`${failCount} 个文件上传未完成，请查看列表提示并重试`)
  }
}

const handleSubmit = async () => {
  if (!canWrite.value) return
  if (!configValid.value) {
    message.error('上传配置异常，已暂停文件上传')
    return
  }
  if (!policy.value || busy.value || terminal.value || initializationUncertain) return
  if (detail.value?.builtIn) return

  if (detail.value) {
    if (file.value) {
      await submitResumeUpload(file.value)
    }
  } else {
    await submitBatchQueueUpload()
  }
}

const handlePause = () => {
  if (!canWrite.value) return
  if (!merging.value) controller?.abort()
}

const handleCancel = async () => {
  if (!canWrite.value) return
  if (!detail.value || detail.value.builtIn || busy.value || terminal.value || cancelLoading.value) return
  cancelLoading.value = true
  try {
    await cancelKnowledgeUpload(detail.value.id)
    detail.value = (await getKnowledgeDocument(detail.value.id)).data
    message.success('上传会话已取消')
    emit('success')
  } catch {
    /* 请求层提示错误。 */
  } finally {
    cancelLoading.value = false
  }
}

const handleClose = () => {
  if (!busy.value && !cancelLoading.value) emit('update:open', false)
}

watch(canWrite, (value) => {
  if (!value && !merging.value) controller?.abort()
})

onBeforeUnmount(() => controller?.abort())
</script>

<style scoped>
.modal-top-alert {
  margin-bottom: var(--du-space-3);
}

.config-error-message {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--du-space-2);
}

.retry-action-btn {
  padding: 0 4px !important;
  font-size: var(--du-font-size-xs, 11px) !important;
  height: auto !important;
  line-height: 1 !important;
}

.upload-form {
  margin-top: var(--du-space-2);
}

/* Ant Design Vue 规范拖拽上传区域样式 */
.standard-file-dragger {
  display: block;
}

.standard-file-dragger :deep(.ant-upload) {
  padding: 16px !important;
  background: var(--du-bg-subtle) !important;
  border: 1px dashed var(--du-border-strong) !important;
  border-radius: var(--du-radius-md) !important;
  transition: all 0.2s ease;
}

.standard-file-dragger :deep(.ant-upload:hover) {
  border-color: var(--du-accent) !important;
  background: #f8faff !important;
}

.dragger-placeholder {
  padding: 8px 0;
}

.dragger-icon {
  font-size: 28px;
  color: var(--du-accent);
  margin-bottom: 6px;
  line-height: 1;
}

.dragger-title {
  font-size: var(--du-font-size-sm, 12px);
  color: var(--du-text);
  margin-bottom: 4px;
}

.dragger-tip {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted);
  margin: 0;
}

.dragger-limit {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-accent, #2563eb);
  font-weight: 500;
  margin: 6px 0 0;
  line-height: 1.5;
}

.dragger-formats {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary);
  margin: 4px 0 0;
  word-break: break-all;
  line-height: 1.5;
}

.dragger-formats-error {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-danger, #ef4444);
  margin: 6px 0 0;
  line-height: 1.5;
}

.file-selected-box {
  display: flex;
  align-items: center;
  gap: var(--du-space-3);
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid var(--du-border);
  border-radius: var(--du-radius-sm);
  text-align: left;
}

.file-icon {
  font-size: 22px;
  color: var(--du-accent);
  flex-shrink: 0;
}

.file-meta {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: var(--du-font-size-sm, 12px);
  color: var(--du-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary);
  margin-top: 2px;
}

/* 待上传队列列表样式 */
.upload-queue-container {
  margin-top: var(--du-space-3);
  border: 1px solid var(--du-border);
  border-radius: var(--du-radius-sm);
  background: #ffffff;
  overflow: hidden;
}

.queue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--du-bg-subtle);
  border-bottom: 1px solid var(--du-border);
  font-size: var(--du-font-size-xs, 11px);
}

.queue-title {
  color: var(--du-text);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.queue-completed-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  background: #dcfce7;
  color: #15803d;
  font-weight: 500;
}

.queue-clear-btn {
  padding: 0 !important;
  font-size: var(--du-font-size-xs, 11px) !important;
  height: auto !important;
}

.queue-list {
  max-height: 200px;
  overflow-y: auto;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.queue-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--du-bg-subtle);
  border: 1px solid var(--du-border);
  border-radius: var(--du-radius-sm);
  transition: all 0.2s ease;
}

.queue-item:hover {
  background: #f8faff;
  border-color: var(--du-border-strong);
}

.queue-item.status-completed {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.queue-item.status-failed {
  background: #fef2f2;
  border-color: #fecaca;
}

.item-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.item-icon {
  font-size: 16px;
  color: var(--du-accent);
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: var(--du-font-size-sm, 12px);
  color: var(--du-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.item-meta {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.item-state-text.hashing {
  color: var(--du-accent);
}

.item-state-text.uploading {
  color: #0284c7;
}

.item-state-text.merging {
  color: #7c3aed;
}

.item-state-text.completed {
  color: #16a34a;
}

.item-state-text.failed {
  color: #dc2626;
}

.item-state-text.pending {
  color: var(--du-text-muted);
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  flex-shrink: 0;
}

.status-icon.completed {
  color: #16a34a;
  font-size: 14px;
}

.status-icon.failed {
  color: #dc2626;
  font-size: 14px;
}

.status-icon.busy {
  color: var(--du-accent);
  font-size: 14px;
}

.item-delete-btn {
  padding: 0 4px !important;
  font-size: 12px !important;
  height: 22px !important;
  line-height: 22px !important;
}

.policy-tip {
  color: var(--du-text-muted);
  font-size: var(--du-font-size-xs, 11px);
  margin-top: 6px;
}

.session-info-card {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px 12px;
  padding: 8px 12px;
  background: var(--du-bg-subtle);
  border: 1px solid var(--du-border);
  border-radius: var(--du-radius-sm);
  margin-bottom: var(--du-space-3);
  font-size: var(--du-font-size-xs, 11px);
}

.info-item {
  display: flex;
  align-items: center;
}

.info-label {
  color: var(--du-text-secondary);
}

.info-value {
  color: var(--du-text);
}

.progress-section {
  margin-bottom: var(--du-space-3);
}

.progress-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary);
  margin-bottom: 4px;
}

.status-notice {
  margin-top: var(--du-space-2);
}

.modal-footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: var(--du-space-2);
}

.footer-right {
  display: flex;
  align-items: center;
  gap: var(--du-space-2);
}
</style>

