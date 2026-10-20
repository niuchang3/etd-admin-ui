<template>
  <a-modal :open="open" :title="moveOnly ? '移动资料' : '资料配置'" :width="680"
    :confirm-loading="confirmLoading" :ok-button-props="{ disabled: loading || !formData || !canWrite }"
    :mask-closable="false" :closable="!confirmLoading" :cancel-button-props="{ disabled: confirmLoading }"
    @ok="handleOk" @cancel="handleCancel">
    <a-spin :spinning="loading">
      <a-alert v-if="loadFailed" type="error" message="详情加载失败，请关闭后重新打开" show-icon />
      <a-form v-if="formData" ref="formRef" :model="formData" :rules="rules" :disabled="!canWrite || confirmLoading" layout="vertical">
        <a-alert v-if="moveOnly" type="info" message="移动仅改变分类目录，资料的数据归属部门保持不变。" show-icon />
        <a-form-item label="分类目录" name="folderId">
          <a-tree-select v-model:value="formData.folderId" :tree-data="folderTree" tree-default-expand-all
            :dropdown-style="{ maxHeight: '360px', overflow: 'auto' }" placeholder="请选择可写目录" />
        </a-form-item>
        <template v-if="!moveOnly">
          <a-form-item label="资料名称" name="documentName">
            <a-input v-model:value="formData.documentName" :maxlength="255" />
          </a-form-item>
          <a-form-item label="用途说明" name="description">
            <a-textarea v-model:value="formData.description" :maxlength="1000" :rows="2" show-count />
          </a-form-item>
          <a-form-item label="租户内公开检索" name="isPublic" extra="公开检索不授予资料维护权限">
            <a-switch v-model:checked="formData.isPublic" />
          </a-form-item>
          <a-row :gutter="16">
            <a-col :span="12"><a-form-item label="检索方式" name="retrievalMode">
              <a-select v-model:value="formData.retrievalMode" :options="getOptions(KNOWLEDGE_DICT_TYPE.RETRIEVAL_MODE)" />
            </a-form-item></a-col>
            <a-col v-if="needsVector" :span="12"><a-form-item label="向量连接器" name="embeddingModelConnectionId">
              <a-select v-model:value="formData.embeddingModelConnectionId" :options="modelOptions" allow-clear
                placeholder="请选择连接器" @change="handleModelChange" />
              <span v-if="missingModel" class="form-tip">原连接器已删除或停用，请重新选择。</span>
            </a-form-item></a-col>
            <a-col v-if="needsVector" :span="12"><a-form-item label="向量维度" name="embedding">
              <a-select v-model:value="formData.embedding" :options="embeddingOptions" allow-clear />
            </a-form-item></a-col>
            <a-col :span="12"><a-form-item label="分片 Token 上限" name="chunkMaxTokens">
              <a-input-number v-model:value="formData.chunkMaxTokens" :min="1" :max="8192" :precision="0" />
            </a-form-item></a-col>
            <a-col :span="12"><a-form-item label="重叠 Token 数" name="chunkOverlapTokens">
              <a-input-number v-model:value="formData.chunkOverlapTokens" :min="0" :max="formData.chunkMaxTokens - 1" :precision="0" />
            </a-form-item></a-col>
            <a-col v-for="field in topKFields" :key="field.key" :span="12">
              <a-form-item :label="field.label" :name="field.key">
                <a-input-number v-model:value="formData[field.key]" :min="1" :max="200" :precision="0" />
              </a-form-item>
            </a-col>
            <a-col :span="12"><a-form-item label="向量相似度阈值" name="similarityThreshold">
              <a-input-number v-model:value="formData.similarityThreshold" :min="0" :max="1" :step="0.01" />
            </a-form-item></a-col>
          </a-row>
          <a-alert type="info" message="修改分片规则、模型等处理配置后，需要重新解析并确认正文分片。" show-icon />
        </template>
      </a-form>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { message, type FormInstance } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import { menusStore } from '@/stores/modules/user'
import { getKnowledgeDocument, getKnowledgeModelOptions, updateKnowledgeDocument } from '@/apis/ai/document'
import type { KnowledgeDocumentFolder, KnowledgeDocumentRecord, KnowledgeDocumentSaveDTO, KnowledgeModelOption } from '@/apis/ai/document/type'
import { KNOWLEDGE_DICT_TYPE, KNOWLEDGE_RETRIEVAL_MODE } from '@/constant'
import { useSystemDict } from '@/composables/useSystemDict'
import { canUseFolder, getDocumentSaveDTO, getFolderTree, processingBusy } from '../helper'

const props = defineProps<{ open: boolean; record: KnowledgeDocumentRecord | null; folders: KnowledgeDocumentFolder[]; moveOnly: boolean }>()
const emit = defineEmits<{ (e: 'update:open', value: boolean): void; (e: 'success'): void }>()
const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path))
const { getOptions } = useSystemDict([KNOWLEDGE_DICT_TYPE.RETRIEVAL_MODE])
const formRef = ref<FormInstance>()
const formData = ref<KnowledgeDocumentSaveDTO | null>(null)
const loading = ref(false)
const loadFailed = ref(false)
const confirmLoading = ref(false)
const models = ref<KnowledgeModelOption[]>([])
const folderTree = computed(() => getFolderTree(props.folders, true))
const needsVector = computed(() => formData.value?.retrievalMode !== KNOWLEDGE_RETRIEVAL_MODE.KEYWORD)
const selectedModel = computed(() => models.value.find((model) => model.id === formData.value?.embeddingModelConnectionId))
const missingModel = computed(() => formData.value?.embeddingModelConnectionId && !selectedModel.value)
const modelOptions = computed(() => models.value.map((model) => ({ value: model.id, label: `${model.modelName}（${model.id}）` })))
const embeddingOptions = computed(() => (selectedModel.value?.embedding || []).map((value) => ({ label: String(value), value })))
const topKFields = [
  { key: 'keywordTopK', label: '全文候选数' }, { key: 'vectorTopK', label: '向量候选数' },
  { key: 'retrievalTopK', label: '检索返回数' },
] as const
const integerRule = (min: number, max: number): Rule => ({ type: 'integer', required: true, min, max, message: `请输入 ${min} 至 ${max} 的整数` })
const rules: Record<string, Rule[]> = {
  folderId: [{ required: true, validator: async () => {
    if (!canUseFolder(props.folders.find((folder) => folder.id === formData.value?.folderId))) throw new Error('请选择可写的有效目录')
  } }],
  documentName: [{ required: true, whitespace: true, max: 255, message: '请输入资料名称（最多255字）' }],
  description: [{ max: 1000, message: '用途说明不能超过1000字' }],
  retrievalMode: [{ required: true, message: '请选择检索方式' }],
  embeddingModelConnectionId: [{ validator: async () => {
    if (needsVector.value && !selectedModel.value) throw new Error('请选择有效的向量连接器')
  } }],
  embedding: [{ validator: async () => {
    if (needsVector.value && !selectedModel.value?.embedding.includes(formData.value?.embedding ?? -1)) throw new Error('请选择连接器支持的维度')
  } }],
  chunkMaxTokens: [integerRule(1, 8192)],
  chunkOverlapTokens: [{ validator: async () => {
    const data = formData.value
    if (!data || !Number.isInteger(data.chunkOverlapTokens) || data.chunkOverlapTokens < 0 || data.chunkOverlapTokens >= data.chunkMaxTokens) throw new Error('重叠数须为非负整数且小于分片上限')
  } }],
  keywordTopK: [integerRule(1, 200)], vectorTopK: [integerRule(1, 200)],
  retrievalTopK: [integerRule(1, 200), { validator: async () => {
    const data = formData.value
    if (!data) return
    const candidates = data.retrievalMode === KNOWLEDGE_RETRIEVAL_MODE.KEYWORD ? data.keywordTopK
      : data.retrievalMode === KNOWLEDGE_RETRIEVAL_MODE.VECTOR ? data.vectorTopK : data.keywordTopK + data.vectorTopK
    if (data.retrievalTopK > candidates) throw new Error('检索返回数不能超过当前检索方式的候选数量')
  } }],
  similarityThreshold: [{ type: 'number', min: 0, max: 1, message: '请输入0至1的阈值或留空' }],
}
const handleModelChange = () => {
  if (!canWrite.value) return
  if (formData.value) formData.value.embedding = null
}
let requestToken = 0
watch(() => props.open, async (open) => {
  const token = ++requestToken
  formData.value = null
  if (!open || !props.record) return
  loading.value = true
  loadFailed.value = false
  try {
    const [detail, options] = await Promise.all([getKnowledgeDocument(props.record.id), props.moveOnly ? Promise.resolve(null) : getKnowledgeModelOptions()])
    if (token !== requestToken) return
    if (detail.data.builtIn || processingBusy(detail.data)) { message.warning('资料当前不可修改，请刷新后重试'); emit('update:open', false); return }
    formData.value = getDocumentSaveDTO(detail.data)
    models.value = options?.data || []
  } catch { if (token === requestToken) loadFailed.value = true }
  finally { if (token === requestToken) loading.value = false }
})
const handleOk = async () => {
  if (!canWrite.value) return
  if (!formData.value || !props.record || confirmLoading.value || loading.value || props.record.builtIn) return
  try { await formRef.value?.validate() } catch { return }
  confirmLoading.value = true
  try {
    const data = { ...formData.value }
    if (!props.moveOnly) {
      data.documentName = data.documentName.trim()
      data.description = data.description?.trim() || null
    }
    // 移动时不改动其他配置；配置表单切到全文模式后清空向量配置。
    if (!props.moveOnly && data.retrievalMode === KNOWLEDGE_RETRIEVAL_MODE.KEYWORD) {
      data.embeddingModelConnectionId = null; data.embedding = null
    }
    await updateKnowledgeDocument(props.record.id, data)
    message.success(props.moveOnly ? '资料已移动' : '资料配置已保存')
    emit('update:open', false); emit('success')
  } catch { /* 保留用户输入，由请求层提示后端错误。 */ }
  finally { confirmLoading.value = false }
}
const handleCancel = () => { if (!confirmLoading.value) emit('update:open', false) }
</script>
<style scoped>
.ant-input-number { width: 100%; }
.form-tip { font-size: var(--du-font-size-xs); color: var(--du-text-muted); }
</style>
