<template>
  <a-modal :open="open" title="资料上传 / 断点续传" :width="620" :footer="null" :mask-closable="false"
    :closable="!busy && !cancelLoading" @cancel="handleClose">
    <a-spin :spinning="loading">
      <a-alert type="info" message="上传完成后还需配置、解析并确认分片，才能用于检索。文件筛选不表示解析器支持该格式。" show-icon />
      <a-form layout="vertical" class="upload-form">
        <a-form-item label="分类目录"><a-input :value="folder?.folderName || detail?.folderId" disabled /></a-form-item>
        <a-form-item label="资料归属部门 ID" extra="新上传默认使用目录所属部门；续传保留原资料归属部门。">
          <a-select v-if="!detail" v-model:value="orgId" :options="orgOptions" />
          <a-input v-else :value="detail.orgId" disabled class="du-mono" />
        </a-form-item>
        <a-form-item label="本地文件">
          <input ref="fileInput" type="file" :accept="accept" :disabled="busy || loading || !canWrite || terminal" @change="handleFileChange" />
          <div v-if="policy" class="hint">文件上限 {{ formatFileSize(policy.maxFileBytes) }} · 策略分片 {{ formatFileSize(policy.partSizeBytes) }} · 会话 {{ policy.sessionSeconds }} 秒 · 地址 {{ policy.urlSeconds }} 秒</div>
        </a-form-item>
      </a-form>
      <div v-if="detail" class="upload-info">
        <div>资料 ID：<span class="du-mono">{{ detail.id }}</span></div>
        <div>上传状态：{{ getLabel(KNOWLEDGE_DICT_TYPE.UPLOAD_STATUS, detail.uploadStatus) }}</div>
        <div>会话截止：<span class="du-mono">{{ detail.uploadExpiresAt || '—' }}</span></div>
        <div>已确认 {{ detail.uploadParts?.length || 0 }} / {{ detail.partCount }} 片</div>
      </div>
      <div v-if="hashing">计算文件 SHA-256：{{ hashProgress }}%</div>
      <a-progress v-if="detail" :percent="uploadProgress" />
      <a-alert v-if="notice" :message="notice" type="warning" show-icon class="notice" />
      <div class="modal-actions">
        <a-button v-if="canWrite && !terminal" type="primary" :loading="busy" :disabled="!file || loading || !policy || !orgId || busy || cancelLoading" @click="handleSubmit">
          {{ detail ? '继续 / 重试失败分片' : '开始上传' }}
        </a-button>
        <a-button v-if="canWrite && busy && !merging" @click="handlePause">暂停</a-button>
        <a-popconfirm v-if="canWrite && detail && !terminal" title="取消后该上传会话无法续传，确定取消？" @confirm="handleCancel">
          <a-button danger :disabled="busy || cancelLoading" :loading="cancelLoading">取消会话</a-button>
        </a-popconfirm>
        <a-button :disabled="busy || cancelLoading" @click="handleRefresh">刷新进度</a-button>
        <a-button :disabled="busy || cancelLoading" @click="handleClose">关闭</a-button>
      </div>
    </a-spin>
  </a-modal>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { menusStore } from '@/stores/modules/user'
import { getSystemConfigValues } from '@/apis/upms/config'
import { cancelKnowledgeUpload, completeKnowledgeUpload, createKnowledgeUpload, getKnowledgeDocument, getKnowledgeUploadPolicy, resumeKnowledgeUpload } from '@/apis/ai/document'
import type { KnowledgeDocumentDetail, KnowledgeDocumentFolder, KnowledgeDocumentRecord, KnowledgeUploadPolicy } from '@/apis/ai/document/type'
import { KNOWLEDGE_DICT_TYPE, KNOWLEDGE_UPLOAD_CONFIG_KEY, KNOWLEDGE_UPLOAD_STATUS as UPLOAD } from '@/constant'
import { useSystemDict } from '@/composables/useSystemDict'
import { formatFileSize } from '@/utils/format'
import { calculateFileHash, uploadMissingParts } from '../upload/transfer'
import { canResumeUpload, canUseFolder } from '../helper'

const props = defineProps<{ open: boolean; folder: KnowledgeDocumentFolder | null; folders: KnowledgeDocumentFolder[]; record: KnowledgeDocumentRecord | null }>()
const emit = defineEmits<{ (e: 'update:open', value: boolean): void; (e: 'success'): void }>()
const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path))
const { getLabel } = useSystemDict([KNOWLEDGE_DICT_TYPE.UPLOAD_STATUS])
const detail = ref<KnowledgeDocumentDetail | null>(null)
const policy = ref<KnowledgeUploadPolicy | null>(null)
const accept = ref('')
const orgId = ref('')
const orgOptions = computed(() => Array.from(new Set(props.folders.filter(canUseFolder).map((folder) => folder.orgId))).map((id) => ({ label: id, value: id })))
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()
const loading = ref(false)
const busy = ref(false)
const cancelLoading = ref(false)
const hashing = ref(false)
const merging = ref(false)
const hashProgress = ref(0)
const notice = ref('')
const terminal = computed(() => detail.value?.uploadStatus === UPLOAD.COMPLETED || detail.value?.uploadStatus === UPLOAD.CANCELLED)
const uploadProgress = computed(() => {
  if (!detail.value) return 0
  const bytes = (detail.value.uploadParts || []).reduce((sum, part) => sum + Number(part.size), 0)
  return Math.min(100, Math.round(bytes / Number(detail.value.fileSize) * 100))
})
let controller: AbortController | null = null
let requestToken = 0
// 初始化响应丢失时没有可靠 ID，禁止直接再次创建，要求用户从列表恢复。
let initializationUncertain = false
watch(() => props.open, async (open) => {
  const token = ++requestToken
  if (!open) return
  detail.value = null; file.value = null; policy.value = null
  notice.value = ''; accept.value = ''; initializationUncertain = false
  orgId.value = props.folder?.orgId || ''
  if (fileInput.value) fileInput.value.value = ''
  loading.value = true
  try {
    const results = await Promise.allSettled([
      getKnowledgeUploadPolicy(), getSystemConfigValues([KNOWLEDGE_UPLOAD_CONFIG_KEY]),
      props.record ? getKnowledgeDocument(props.record.id) : Promise.resolve(null),
    ])
    if (token !== requestToken) return
    const [policyResult, configResult, detailResult] = results
    if (policyResult.status === 'fulfilled') {
      const data = policyResult.value.data
      if (Number.isSafeInteger(Number(data.maxFileBytes)) && Number(data.maxFileBytes) > 0 && Number.isSafeInteger(Number(data.partSizeBytes)) && Number(data.partSizeBytes) > 0) {
        policy.value = data
      } else notice.value = '上传策略无效，请联系管理员或重新打开弹窗。'
    }
    if (detailResult.status === 'fulfilled' && detailResult.value) {
      detail.value = detailResult.value.data
      orgId.value = detail.value.orgId
      notice.value = '请重新选择原始文件，校验摘要后仅补传未确认分片。'
    } else if (detailResult.status === 'rejected') {
      initializationUncertain = true
      notice.value = '资料详情加载失败，请关闭后重试。'
    }
    if (configResult.status === 'fulfilled') {
      try {
        const config: unknown = JSON.parse(configResult.value.data[KNOWLEDGE_UPLOAD_CONFIG_KEY] || '')
        if (!config || typeof config !== 'object' || !('allowedExtensions' in config) || !Array.isArray(config.allowedExtensions) || !config.allowedExtensions.every((extension: unknown) => typeof extension === 'string' && extension.startsWith('.') && !extension.includes(','))) throw new Error()
        accept.value = config.allowedExtensions.join(',')
      } catch { notice.value = '文件筛选系统参数缺失或格式错误；当前可选择所有文件，服务端仍负责校验。' }
    }
  } finally { if (token === requestToken) loading.value = false }
})
const handleFileChange = (event: Event) => {
  file.value = (event.target as HTMLInputElement).files?.[0] || null
}
const handleRefresh = async () => {
  if (!detail.value || busy.value) return
  loading.value = true
  try { detail.value = (await getKnowledgeDocument(detail.value.id)).data }
  catch { /* 请求层提示错误。 */ }
  finally { loading.value = false }
}
const handleSubmit = async () => {
  if (!canWrite.value) return
  if (!file.value || !policy.value || busy.value || terminal.value || initializationUncertain || !orgId.value) return
  if (detail.value?.builtIn) return
  if (!detail.value && !canUseFolder(props.folder || undefined)) return
  if (detail.value && !canResumeUpload(detail.value)) { notice.value = '当前会话不可续传，请刷新进度确认状态。'; return }
  const localFile = file.value
  if (localFile.size <= 0 || localFile.size > Number(policy.value.maxFileBytes)) { notice.value = '文件为空或超过服务端上传大小上限。'; return }
  if (localFile.name.length > 255) { notice.value = '文件名不能超过255字。'; return }
  if (detail.value && localFile.size !== Number(detail.value.fileSize)) { notice.value = '所选文件大小与原始文件不一致。'; return }
  busy.value = true; hashing.value = true; hashProgress.value = 0; notice.value = ''
  controller = new AbortController()
  const signal = controller.signal
  try {
    const digest = await calculateFileHash(localFile, signal, (progress) => { hashProgress.value = progress })
    hashing.value = false
    if (signal.aborted || !canWrite.value) return
    if (detail.value) {
      detail.value = (await resumeKnowledgeUpload(detail.value.id, digest)).data
    } else {
      try {
        detail.value = (await createKnowledgeUpload({
          folderId: props.folder!.id, orgId: orgId.value, originalFilename: localFile.name,
          contentType: localFile.type || 'application/octet-stream', fileSize: localFile.size, fileSha256: digest,
        })).data
        emit('success')
      } catch (error) {
        initializationUncertain = true
        notice.value = '初始化未取得资料 ID，请关闭并刷新列表检查是否已创建，再从该资料续传，避免重复初始化。'
        throw error
      }
    }
    const current = detail.value
    if (signal.aborted || !canWrite.value) return
    if (current.uploadStatus === UPLOAD.COMPLETED) { message.success('文件已上传完成'); emit('success'); return }
    if (!canResumeUpload(current)) { notice.value = '当前会话不可续传，请刷新状态。'; return }
    if (!Number.isSafeInteger(Number(current.partSizeBytes)) || Number(current.partSizeBytes) <= 0 || !Number.isInteger(current.partCount) || current.partCount < 1 || Math.ceil(localFile.size / Number(current.partSizeBytes)) !== current.partCount) throw new Error('服务端分片策略异常，请刷新详情')
    await uploadMissingParts(localFile, current, signal, () => canWrite.value, (parts) => {
      if (detail.value) detail.value.uploadParts = parts
    })
    if (signal.aborted || !canWrite.value) return
    merging.value = true
    // 一次合并失败后只查询详情，不盲目重复调用或重新初始化。
    detail.value = (await completeKnowledgeUpload(current.id)).data
    message.success('资料上传完成，请配置并解析正文分片')
    emit('success')
  } catch (error) {
    if (signal.aborted) notice.value = '已暂停本地传输，已确认分片保留，可继续上传。'
    else if (!notice.value) notice.value = error instanceof Error ? error.message : '上传未完成，请检查详情后继续。'
    if (detail.value) {
      try {
        detail.value = (await getKnowledgeDocument(detail.value.id)).data
        if (detail.value.uploadStatus === UPLOAD.COMPLETED) notice.value = '服务端已完成上传，请关闭后配置并解析。'
        else if (merging.value) notice.value = `合并结果已查询，请按当前上传状态处理：${getLabel(KNOWLEDGE_DICT_TYPE.UPLOAD_STATUS, detail.value.uploadStatus)}`
      } catch { notice.value += ' 详情暂时无法确认，请先刷新进度，不要重复初始化。' }
      emit('success')
    }
  } finally { busy.value = false; hashing.value = false; merging.value = false; controller = null }
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
    message.success('上传会话已取消'); emit('success')
  } catch { /* 请求层提示错误。 */ }
  finally { cancelLoading.value = false }
}
const handleClose = () => { if (!busy.value && !cancelLoading.value) emit('update:open', false) }
watch(canWrite, (value) => { if (!value && !merging.value) controller?.abort() })
onBeforeUnmount(() => controller?.abort())
</script>
<style scoped>
.upload-form { margin-top: var(--du-space-3); }
.hint, .upload-info { color: var(--du-text-secondary); font-size: var(--du-font-size-xs); overflow-wrap: anywhere; }
.upload-info { display: grid; gap: var(--du-space-2); }
.notice { margin-top: var(--du-space-2); }
.modal-actions { display: flex; flex-wrap: wrap; gap: var(--du-space-2); margin-top: var(--du-space-4); }
</style>
