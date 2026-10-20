<template>
  <a-drawer :open="open" title="正文分片预览" :width="800" @close="handleClose">
    <a-spin :spinning="loading">
      <template v-if="detail">
        <a-descriptions bordered size="small" :column="2">
          <a-descriptions-item label="资料名称" :span="2">{{ detail.documentName }}</a-descriptions-item>
          <a-descriptions-item label="上传状态">{{ getLabel(KNOWLEDGE_DICT_TYPE.UPLOAD_STATUS, detail.uploadStatus) }}</a-descriptions-item>
          <a-descriptions-item label="处理状态">{{ getLabel(KNOWLEDGE_DICT_TYPE.PROCESSING_STATUS, detail.processingStatus) }}</a-descriptions-item>
          <a-descriptions-item label="检索方式">{{ getLabel(KNOWLEDGE_DICT_TYPE.RETRIEVAL_MODE, detail.retrievalMode) }}</a-descriptions-item>
          <a-descriptions-item label="处理轮次"><span class="du-mono">{{ detail.processingVersion }}</span></a-descriptions-item>
          <a-descriptions-item label="连接器 ID"><span class="du-mono">{{ detail.embeddingModelConnectionId || '—' }}</span></a-descriptions-item>
          <a-descriptions-item label="向量维度">{{ detail.embedding ?? '—' }}</a-descriptions-item>
          <a-descriptions-item label="分片 / 重叠 Token">{{ detail.chunkMaxTokens }} / {{ detail.chunkOverlapTokens }}</a-descriptions-item>
          <a-descriptions-item label="处理结束时间">{{ detail.processedTime || '—' }}</a-descriptions-item>
        </a-descriptions>
        <a-alert v-if="detail.uploadErrorMessage || detail.errorMessage" type="error" show-icon
          :message="detail.uploadErrorMessage || detail.errorMessage" description="连接器不可用时请重新配置，不会自动替换模型。" class="notice" />
        <a-alert v-if="notice" type="info" :message="notice" show-icon class="notice" />
        <div class="preview-toolbar">
          <template v-if="canWrite && !detail.builtIn">
            <a-popconfirm title="解析将生成新轮次分片，原有索引需要重新确认建立，是否继续？" @confirm="handleParse">
              <a-button type="primary" :loading="parseLoading" :disabled="!canParse || confirmLoading">解析正文</a-button>
            </a-popconfirm>
            <a-popconfirm title="确认当前轮次正文分片并建立索引？向量及混合模式将调用已配置的连接器。" @confirm="handleConfirm">
              <a-button type="primary" :loading="confirmLoading" :disabled="!canConfirm || parseLoading">确认处理</a-button>
            </a-popconfirm>
          </template>
          <span v-else class="readonly-label">{{ detail.builtIn ? '内置数据只读' : '只读' }}</span>
          <a-button :loading="loading" :disabled="parseLoading || confirmLoading" @click="getList">刷新状态</a-button>
          <span class="hint">仅预览正文，不提供编辑；只有处理状态就绪后才能检索。</span>
        </div>
        <a-spin :spinning="chunksLoading">
          <div v-for="chunk in tableData" :key="chunk.id" class="chunk-panel">
            <div class="chunk-title">分片 {{ chunk.chunkIndex + 1 }} · {{ chunk.tokenCount }} Token <span v-if="chunk.title">· {{ chunk.title }}</span></div>
            <pre>{{ chunk.content }}</pre>
          </div>
          <a-empty v-if="!tableData.length" description="当前轮次暂无正文分片，请先完成上传并解析" />
        </a-spin>
        <a-pagination v-model:current="query.current" v-model:page-size="query.size" :total="total"
          :page-size-options="['10', '20', '50']" show-size-changer :show-total="(count: number) => `共 ${count} 片`" @change="getPage" />
      </template>
      <a-empty v-else-if="!loading" description="详情加载失败，请关闭后重试" />
    </a-spin>
  </a-drawer>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { menusStore } from '@/stores/modules/user'
import { confirmKnowledgeDocument, getKnowledgeChunks, getKnowledgeDocument, parseKnowledgeDocument } from '@/apis/ai/document'
import type { KnowledgeChunk, KnowledgeDocumentDetail, KnowledgeDocumentRecord } from '@/apis/ai/document/type'
import { KNOWLEDGE_DICT_TYPE, KNOWLEDGE_PROCESSING_STATUS as PROCESSING, KNOWLEDGE_UPLOAD_STATUS as UPLOAD } from '@/constant'
import { useSystemDict } from '@/composables/useSystemDict'
import { processingBusy } from '../helper'

const props = defineProps<{ open: boolean; record: KnowledgeDocumentRecord | null }>()
const emit = defineEmits<{ (e: 'update:open', value: boolean): void; (e: 'success'): void }>()
const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path))
const { getLabel } = useSystemDict(Object.values(KNOWLEDGE_DICT_TYPE))
const detail = ref<KnowledgeDocumentDetail | null>(null)
const tableData = ref<KnowledgeChunk[]>([])
const total = ref(0)
const query = reactive({ current: 1, size: 10 })
const loading = ref(false)
const chunksLoading = ref(false)
const parseLoading = ref(false)
const confirmLoading = ref(false)
const notice = ref('')
const refreshRequired = ref(false)
const canParse = computed(() => !refreshRequired.value && detail.value && detail.value.uploadStatus === UPLOAD.COMPLETED && !processingBusy(detail.value))
const canConfirm = computed(() => !refreshRequired.value && detail.value?.uploadStatus === UPLOAD.COMPLETED && (
  detail.value.processingStatus === PROCESSING.PREVIEW || (detail.value.processingStatus === PROCESSING.FAILED && total.value > 0)
))
let requestToken = 0
let pageToken = 0
let timer: ReturnType<typeof setTimeout> | undefined
const clearTimer = () => { clearTimeout(timer); timer = undefined }
const getPage = async () => {
  const current = detail.value
  if (!current || !props.open) return
  const token = ++pageToken
  chunksLoading.value = true
  try {
    const response = await getKnowledgeChunks(current.id, { ...query })
    if (token !== pageToken || !props.open || detail.value?.processingVersion !== current.processingVersion) return
    tableData.value = response.data.records || []; total.value = response.data.total
  } catch { /* 请求层提示错误。 */ }
  finally { if (token === pageToken) chunksLoading.value = false }
}
const getList = async () => {
  if (!props.open || !props.record) return
  clearTimer()
  const token = ++requestToken
  loading.value = true
  try {
    const response = await getKnowledgeDocument(props.record.id)
    if (token !== requestToken || !props.open) return
    if (detail.value?.processingVersion !== response.data.processingVersion) { query.current = 1; tableData.value = []; total.value = 0 }
    detail.value = response.data
    refreshRequired.value = false
    await getPage()
    if (processingBusy(response.data)) timer = setTimeout(() => { void getList() }, 5000)
  } catch { refreshRequired.value = true; notice.value = '详情状态暂时无法确认，请刷新状态后再处理。' }
  finally { if (token === requestToken) loading.value = false }
}
watch(() => props.open, (open) => {
  clearTimer(); requestToken++; pageToken++
  if (!open) return
  detail.value = null; tableData.value = []; total.value = 0; query.current = 1; notice.value = ''
  void getList()
})
const handleParse = async () => {
  if (!canWrite.value) return
  if (!detail.value || detail.value.builtIn || !canParse.value || parseLoading.value || confirmLoading.value) return
  clearTimer(); parseLoading.value = true; notice.value = ''
  try {
    await parseKnowledgeDocument(detail.value.id)
    message.success('正文解析完成，请预览并确认分片')
  } catch { refreshRequired.value = true; notice.value = '解析请求未正常返回，将查询详情确认状态。请核对后再操作；连接器不可用请重新配置。' }
  finally { parseLoading.value = false; await getList(); emit('success') }
}
const handleConfirm = async () => {
  if (!canWrite.value) return
  if (!detail.value || detail.value.builtIn || !canConfirm.value || confirmLoading.value || parseLoading.value) return
  clearTimer(); confirmLoading.value = true; notice.value = ''
  try {
    await confirmKnowledgeDocument(detail.value.id)
    message.success('正文分片已确认，索引处理完成')
  } catch { refreshRequired.value = true; notice.value = '确认请求未正常返回，将查询详情确认索引状态。请核对后再操作；连接器不可用请重新配置。' }
  finally { confirmLoading.value = false; await getList(); emit('success') }
}
const handleClose = () => { emit('update:open', false) }
onBeforeUnmount(clearTimer)
</script>
<style scoped>
.preview-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: var(--du-space-2); margin: var(--du-space-3) 0; }
.notice { margin-top: var(--du-space-3); }
.hint, .readonly-label { color: var(--du-text-muted); font-size: var(--du-font-size-xs); line-height: 24px; }
.chunk-panel { border: 1px solid var(--du-border); border-radius: var(--du-radius-sm); margin-bottom: var(--du-space-3); }
.chunk-title { background: var(--du-bg-subtle); padding: var(--du-space-2); font-size: var(--du-font-size-sm); overflow-wrap: anywhere; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 320px; overflow: auto; margin: 0; padding: var(--du-space-3); font-family: var(--du-font-mono); font-size: var(--du-font-size-sm); }
</style>
