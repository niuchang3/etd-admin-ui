<template>
  <a-modal
    :open="open"
    title="资料上传 / 断点续传"
    :width="640"
    :mask-closable="false"
    :closable="!busy && !cancelLoading"
    class="knowledge-upload-modal"
    @cancel="handleClose"
  >
    <a-spin :spinning="loading">
      <a-alert
        type="info"
        message="上传完成后还需配置、解析并确认分片，才能用于检索。文件筛选不表示解析器支持该格式。"
        show-icon
        class="modal-top-alert"
      />

      <a-form layout="vertical" class="upload-form">
        <a-form-item label="分类目录">
          <a-input :value="folder?.folderName || detail?.folderId" disabled />
        </a-form-item>

        <a-form-item label="资料归属部门" extra="新上传默认使用目录所属部门；续传保留原资料归属部门。">
          <a-select
            v-if="!folder && !detail"
            v-model:value="orgId"
            :options="orgOptions"
            placeholder="请选择部门"
            @change="(val: any) => loadOrgName(String(val))"
          />
          <a-input
            v-else
            :value="orgDisplayName"
            :title="orgId ? `部门 ID: ${orgId}` : undefined"
            disabled
          >
            <template #prefix>
              <ApartmentOutlined style="color: var(--du-primary-color, #2563eb); margin-right: 4px;" />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item label="本地文件">
          <!-- Ant Design Vue 规范拖拽上传区域 -->
          <a-upload-dragger
            :before-upload="handleBeforeUpload"
            :show-upload-list="false"
            :accept="accept"
            :disabled="busy || loading || !canWrite || terminal"
            class="standard-file-dragger"
          >
            <div v-if="!file" class="dragger-placeholder">
              <p class="dragger-icon">
                <InboxOutlined />
              </p>
              <p class="dragger-title">点击或将本地文件拖拽到此区域上传</p>
              <p class="dragger-tip">
                支持单个文件上传，系统将根据服务端策略切片并自动校验 SHA-256
              </p>
            </div>
            <div v-else class="file-selected-box">
              <FileTextOutlined class="file-icon" />
              <div class="file-meta">
                <div class="file-name" :title="file.name">{{ file.name }}</div>
                <div class="file-size du-mono">{{ formatFileSize(file.size) }}</div>
              </div>
              <a-button
                type="link"
                size="small"
                :disabled="busy"
                @click.stop="handleRemoveFile"
              >
                重新选择
              </a-button>
            </div>
          </a-upload-dragger>

          <div v-if="policy" class="policy-tip du-mono">
            单文件上限 {{ formatFileSize(policy.maxFileBytes) }} · 策略分片 {{ formatFileSize(policy.partSizeBytes) }} · 会话 {{ policy.sessionSeconds }}s · 凭证 {{ policy.urlSeconds }}s
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
          <span class="info-label">分片进度：</span>
          <span class="info-value du-mono">已确认 {{ detail.uploadParts?.length || 0 }} / {{ detail.partCount }} 片</span>
        </div>
      </div>

      <!-- 校验与上传进度条 -->
      <div v-if="hashing" class="progress-section">
        <div class="progress-label">
          <span>正在计算文件 SHA-256 校验和...</span>
          <span class="du-mono">{{ hashProgress }}%</span>
        </div>
        <a-progress :percent="hashProgress" status="active" size="small" :show-info="false" />
      </div>

      <div v-if="detail && !hashing" class="progress-section">
        <div class="progress-label">
          <span>{{ merging ? '分片传输完成，服务端合并中...' : '分片传输进度' }}</span>
          <span class="du-mono">{{ uploadProgress }}%</span>
        </div>
        <a-progress :percent="uploadProgress" :status="merging ? 'active' : undefined" size="small" :show-info="false" />
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
          <a-button :disabled="busy || cancelLoading" @click="handleRefresh">
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
            :disabled="!file || loading || !policy || !orgId || busy || cancelLoading"
            @click="handleSubmit"
          >
            <UploadOutlined />{{ detail ? '继续 / 重试失败分片' : '开始上传' }}
          </a-button>
        </div>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  ApartmentOutlined,
  FileTextOutlined,
  InboxOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import { menusStore } from '@/stores/modules/user'
import { getSystemConfigValues } from '@/apis/upms/config'
import { getOrganizationLookup } from '@/apis/upms/organization'
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
import { canResumeUpload, canUseFolder } from '../helper'

const props = defineProps<{
  open: boolean
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
const orgId = ref('')

// 部门信息回显缓存与状态（使用跨菜单 GET /v1/organization/lookup/{id}）
const orgLookupCache = reactive(new Map<string, string>())
const orgName = ref('')
const orgLoading = ref(false)

const loadOrgName = async (id: string) => {
  if (!id) {
    orgName.value = ''
    return
  }
  if (orgLookupCache.has(id)) {
    orgName.value = orgLookupCache.get(id)!
    return
  }
  orgLoading.value = true
  try {
    const res = await getOrganizationLookup(id)
    if (res.data) {
      const name = res.data.orgName || id
      orgName.value = name
      orgLookupCache.set(id, name)
    } else {
      // 接口说明：data 为 null 时按部门不存在处理，避免页面报错
      orgName.value = '部门不存在'
      orgLookupCache.set(id, '部门不存在')
    }
  } catch {
    orgName.value = `部门 (${id})`
  } finally {
    orgLoading.value = false
  }
}

const orgDisplayName = computed(() => {
  if (orgLoading.value) return '正在加载部门信息...'
  if (orgName.value) return orgName.value
  if (!orgId.value) return '未分配部门'
  return `部门 (${orgId.value})`
})

const orgOptions = computed(() =>
  Array.from(new Set(props.folders.filter(canUseFolder).map((folder) => folder.orgId))).map((id) => ({
    label: orgLookupCache.get(id) || id,
    value: id,
  }))
)

const file = ref<File | null>(null)
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

const uploadProgress = computed(() => {
  if (!detail.value) return 0
  const bytes = (detail.value.uploadParts || []).reduce((sum, part) => sum + Number(part.size), 0)
  return Math.min(100, Math.round((bytes / Number(detail.value.fileSize)) * 100))
})

let controller: AbortController | null = null
let requestToken = 0
let initializationUncertain = false

watch(
  () => props.open,
  async (open) => {
    const token = ++requestToken
    if (!open) return
    detail.value = null
    file.value = null
    policy.value = null
    notice.value = ''
    accept.value = ''
    initializationUncertain = false
    orgId.value = props.folder?.orgId || ''
    if (orgId.value) {
      loadOrgName(orgId.value)
    }
    // 异步预热备选部门回显名称
    props.folders.filter(canUseFolder).forEach((f) => {
      if (f.orgId && !orgLookupCache.has(f.orgId)) {
        getOrganizationLookup(f.orgId)
          .then((res) => {
            if (res.data) {
              orgLookupCache.set(f.orgId, res.data.orgName || f.orgId)
            } else {
              orgLookupCache.set(f.orgId, '部门不存在')
            }
          })
          .catch(() => {})
      }
    })
    loading.value = true

    try {
      const results = await Promise.allSettled([
        getKnowledgeUploadPolicy(),
        getSystemConfigValues([KNOWLEDGE_UPLOAD_CONFIG_KEY]),
        props.record ? getKnowledgeDocument(props.record.id) : Promise.resolve(null),
      ])
      if (token !== requestToken) return

      const [policyResult, configResult, detailResult] = results
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
          notice.value = '上传策略无效，请联系管理员或重新打开弹窗。'
        }
      }

      if (detailResult.status === 'fulfilled' && detailResult.value) {
        detail.value = detailResult.value.data
        orgId.value = detail.value.orgId
        if (orgId.value) {
          loadOrgName(orgId.value)
        }
        notice.value = '请重新选择原始文件，校验摘要后仅补传未确认分片。'
      } else if (detailResult.status === 'rejected') {
        initializationUncertain = true
        notice.value = '资料详情加载失败，请关闭后重试。'
      }

      if (configResult.status === 'fulfilled') {
        try {
          const config: unknown = JSON.parse(configResult.value.data[KNOWLEDGE_UPLOAD_CONFIG_KEY] || '')
          if (
            !config ||
            typeof config !== 'object' ||
            !('allowedExtensions' in config) ||
            !Array.isArray(config.allowedExtensions) ||
            !config.allowedExtensions.every(
              (extension: unknown) =>
                typeof extension === 'string' && extension.startsWith('.') && !extension.includes(',')
            )
          ) {
            throw new Error()
          }
          accept.value = config.allowedExtensions.join(',')
        } catch {
          notice.value = '文件筛选系统参数缺失或格式错误；当前可选择所有文件，服务端仍负责校验。'
        }
      }
    } finally {
      if (token === requestToken) loading.value = false
    }
  }
)

/** 拦截 Ant Design 原生上传，接收原始文件对象由自主逻辑进行分片上传 */
const handleBeforeUpload = (rawFile: File) => {
  file.value = rawFile
  return false
}

const handleRemoveFile = () => {
  if (busy.value) return
  file.value = null
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

const handleSubmit = async () => {
  if (!canWrite.value) return
  if (!file.value || !policy.value || busy.value || terminal.value || initializationUncertain || !orgId.value)
    return
  if (detail.value?.builtIn) return
  if (!detail.value && !canUseFolder(props.folder || undefined)) return
  if (detail.value && !canResumeUpload(detail.value)) {
    notice.value = '当前会话不可续传，请刷新进度确认状态。'
    return
  }

  const localFile = file.value
  if (localFile.size <= 0 || localFile.size > Number(policy.value.maxFileBytes)) {
    notice.value = '文件为空或超过服务端上传大小上限。'
    return
  }
  if (localFile.name.length > 255) {
    notice.value = '文件名不能超过255字。'
    return
  }
  if (detail.value && localFile.size !== Number(detail.value.fileSize)) {
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

    if (detail.value) {
      detail.value = (await resumeKnowledgeUpload(detail.value.id, digest)).data
    } else {
      try {
        detail.value = (
          await createKnowledgeUpload({
            folderId: props.folder!.id,
            orgId: orgId.value,
            originalFilename: localFile.name,
            contentType: localFile.type || 'application/octet-stream',
            fileSize: localFile.size,
            fileSha256: digest,
          })
        ).data
        emit('success')
      } catch (error) {
        initializationUncertain = true
        notice.value = '初始化未取得资料 ID，请关闭并刷新列表检查是否已创建，再从该资料续传，避免重复初始化。'
        throw error
      }
    }

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
    message.success('资料上传完成，请配置并解析正文分片')
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
          notice.value = '服务端已完成上传，请关闭后配置并解析。'
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
