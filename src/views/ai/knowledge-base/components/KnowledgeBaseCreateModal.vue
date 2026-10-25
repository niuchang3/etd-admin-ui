<template>
  <a-modal
    :open="open"
    title="新建知识库"
    :width="640"
    :confirm-loading="submitLoading"
    :mask-closable="false"
    :destroy-on-close="true"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      layout="vertical"
      class="compact-form"
    >
      <a-row :gutter="16">
        <a-col :span="14">
          <a-form-item label="知识库名称" name="name">
            <a-input
              v-model:value="formData.name"
              placeholder="请输入知识库名称，例如：技术研发文档库"
              :maxlength="50"
              show-count
              allow-clear
            />
          </a-form-item>
        </a-col>
        <a-col :span="10">
          <a-form-item label="所属组织/部门" name="orgId" extra="创建后不可修改">
            <a-tree-select
              v-model:value="formData.orgId"
              :tree-data="orgTreeData"
              placeholder="请选择所属组织"
              allow-clear
              tree-default-expand-all
              :field-names="{ label: 'orgName', value: 'id', children: 'children' }"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="知识库简介" name="description">
        <a-textarea
          v-model:value="formData.description"
          placeholder="请输入知识库描述、资料范围或用途（可选）"
          :maxlength="500"
          :rows="2"
          show-count
          allow-clear
        />
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="租户内公开" name="isPublic" extra="租户内公开，同时作为新文档公开默认值">
            <a-switch
              v-model:checked="formData.isPublic"
              checked-children="公开"
              un-checked-children="私有"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="知识库启用状态" name="dataStatus">
            <a-switch
              :checked="formData.dataStatus === COMMON_STATUS.ENABLED"
              checked-children="启用"
              un-checked-children="停用"
              @change="(checked: boolean) => formData.dataStatus = checked ? COMMON_STATUS.ENABLED : COMMON_STATUS.DISABLED"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-divider style="margin: 12px 0;" orientation="left">检索模式与向量配置</a-divider>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="检索模式" name="retrievalMode">
            <a-select v-model:value="formData.retrievalMode" placeholder="请选择检索模式">
              <a-select-option value="keyword">全文检索 (keyword)</a-select-option>
              <a-select-option value="vector">向量检索 (vector)</a-select-option>
              <a-select-option value="hybrid">混合检索 (hybrid)</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item
            label="向量模型连接"
            name="embeddingConnectionId"
            :rules="isVectorRequired ? [{ required: true, message: '当前检索模式必须配置向量模型连接' }] : []"
            :extra="!isVectorRequired ? '全文检索模式下无需向量模型' : undefined"
          >
            <a-select
              v-model:value="formData.embeddingConnectionId"
              :disabled="!isVectorRequired"
              placeholder="请选择向量模型连接器"
              allow-clear
              @change="handleEmbeddingChange"
            >
              <a-select-option
                v-for="item in embeddingConnectionOptions"
                :key="item.id"
                :value="item.id"
              >
                {{ item.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16" v-if="isVectorRequired">
        <a-col :span="12">
          <a-form-item
            label="向量维度"
            name="dimensions"
            :rules="isVectorRequired ? [{ required: true, message: '请选择向量维度' }] : []"
            extra="支持维度与 768/1024/1536 的交集"
          >
            <a-select
              v-model:value="formData.dimensions"
              placeholder="请选择向量维度"
            >
              <a-select-option
                v-for="dim in availableDimensions"
                :key="dim"
                :value="dim"
              >
                {{ dim }} 维
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="相似度阈值 (0-1)" name="similarityThreshold" extra="可留空，留空表示不设相似度阈值">
            <a-input-number
              v-model:value="formData.similarityThreshold"
              :min="0"
              :max="1"
              :step="0.01"
              :precision="2"
              placeholder="留空为 null"
              style="width: 100%;"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="6">
          <a-form-item label="全文召回候选数" name="keywordRecallSize">
            <a-input-number
              v-model:value="formData.keywordRecallSize"
              :min="1"
              :max="100"
              style="width: 100%;"
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="向量召回候选数" name="vectorRecallSize">
            <a-input-number
              v-model:value="formData.vectorRecallSize"
              :min="1"
              :max="100"
              :disabled="!isVectorRequired"
              style="width: 100%;"
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="最终输出 Top K" name="topK">
            <a-input-number
              v-model:value="formData.topK"
              :min="1"
              :max="100"
              style="width: 100%;"
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="上下文扩展窗口" name="contextWindowSize" extra="0~3，0关闭">
            <a-input-number
              v-model:value="formData.contextWindowSize"
              :min="0"
              :max="3"
              placeholder="默认 0"
              style="width: 100%;"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <div class="rerank-setting-card">
        <div class="rerank-card-header">
          <div class="rerank-card-info">
            <div class="rerank-title-row">
              <span class="rerank-card-title">语义重排策略 (Rerank)</span>
              <a-tag color="blue" class="rerank-tag">提升精确度</a-tag>
            </div>
            <span class="rerank-card-desc">
              基于 Cross-Encoder 模型对召回候选深度重排序，大幅提升复杂问答的语义相关度。
            </span>
          </div>
          <a-switch
            :checked="formData.rerankEnabled"
            checked-children="开启"
            un-checked-children="关闭"
            @change="handleRerankEnabledChange"
          />
        </div>

        <div v-if="formData.rerankEnabled" class="rerank-card-body">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item
                label="重排模型连接"
                name="rerankConnectionId"
                :rules="[{ required: true, message: '开启重排后必须选择重排模型连接' }]"
                extra="选择用于重排打分的模型连接器"
              >
                <a-select
                  v-model:value="formData.rerankConnectionId"
                  placeholder="请选择重排模型连接器"
                  allow-clear
                >
                  <template #notFoundContent>
                    <div class="select-empty-text">
                      暂无可用重排模型连接，请先在模型广场配置并启用连接
                    </div>
                  </template>
                  <a-select-option
                    v-for="item in rerankConnectionOptions"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ item.label }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>

            <a-col :span="12">
              <a-form-item
                label="重排阈值 (Score Threshold)"
                name="rerankThreshold"
                extra="可选数值，留空表示不设阈值过滤 (传 null)"
              >
                <a-input-number
                  v-model:value="formData.rerankThreshold"
                  :step="0.01"
                  placeholder="留空为 null"
                  style="width: 100%;"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </div>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message, type FormInstance } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import { createKnowledgeBase } from '@/apis/ai/knowledge-base'
import type { KnowledgeBaseCreateDTO } from '@/apis/ai/knowledge-base/type'
import { getOrganizationTree } from '@/apis/upms/organization'
import { useModelConnections } from '../composables/useModelConnections'
import { COMMON_STATUS } from '@/constant'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const orgTreeData = ref<any[]>([])

const {
  loadConnectionsAndModels,
  embeddingConnectionOptions,
  rerankConnectionOptions,
  getDimensionsForConnection,
} = useModelConnections()

const formData = reactive<KnowledgeBaseCreateDTO>({
  name: '',
  description: '',
  orgId: '',
  dataStatus: COMMON_STATUS.ENABLED,
  isPublic: false,
  retrievalMode: 'hybrid',
  embeddingConnectionId: null,
  dimensions: null,
  keywordRecallSize: 10,
  vectorRecallSize: 10,
  topK: 5,
  contextWindowSize: 0,
  similarityThreshold: null,
  rerankEnabled: false,
  rerankConnectionId: null,
  rerankThreshold: null,
})

const isVectorRequired = computed(() => {
  return formData.retrievalMode === 'vector' || formData.retrievalMode === 'hybrid'
})

const availableDimensions = computed(() => {
  return getDimensionsForConnection(formData.embeddingConnectionId)
})

const handleEmbeddingChange = (connId: any) => {
  const allowed = getDimensionsForConnection(connId)
  if (!formData.dimensions || !allowed.includes(formData.dimensions)) {
    formData.dimensions = allowed[0] || null
  }
}

watch(
  () => formData.retrievalMode,
  (mode) => {
    if (mode === 'keyword') {
      formData.embeddingConnectionId = null
      formData.dimensions = null
    } else if (!formData.embeddingConnectionId && embeddingConnectionOptions.value.length) {
      formData.embeddingConnectionId = embeddingConnectionOptions.value[0].id
      handleEmbeddingChange(formData.embeddingConnectionId)
    }
  }
)

const formRules: Record<string, Rule[]> = {
  name: [
    { required: true, message: '请输入知识库名称', trigger: 'blur' },
    { max: 50, message: '名称最多 50 个字符', trigger: 'blur' },
  ],
  orgId: [
    { required: true, message: '请选择所属组织/部门', trigger: 'change' },
  ],
  retrievalMode: [
    { required: true, message: '请选择检索模式', trigger: 'change' },
  ],
  topK: [
    { required: true, message: '请输入最终输出 Top K', trigger: 'blur' },
  ],
}

const handleRerankEnabledChange = (checked: boolean) => {
  formData.rerankEnabled = checked
  if (!checked) {
    formData.rerankConnectionId = null
    formData.rerankThreshold = null
  }
}

const loadOrgTree = async () => {
  try {
    const res = await getOrganizationTree({ enabled: true })
    const raw = res.data as any
    const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.records) ? raw.records : [])
    orgTreeData.value = list
  } catch (err) {
    console.error('加载组织树失败', err)
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      void loadOrgTree()
      void loadConnectionsAndModels()
      // 重置表单
      formData.name = ''
      formData.description = ''
      formData.orgId = ''
      formData.dataStatus = COMMON_STATUS.ENABLED
      formData.isPublic = false
      formData.retrievalMode = 'hybrid'
      formData.embeddingConnectionId = null
      formData.dimensions = null
      formData.keywordRecallSize = 10
      formData.vectorRecallSize = 10
      formData.topK = 5
      formData.contextWindowSize = 0
      formData.similarityThreshold = null
      formData.rerankEnabled = false
      formData.rerankConnectionId = null
      formData.rerankThreshold = null
    }
  }
)

const handleCancel = () => {
  emit('update:open', false)
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  // 开启重排时的业务边界校验
  if (formData.rerankEnabled) {
    if (!formData.rerankConnectionId) {
      message.error('开启重排时必须选择重排模型连接')
      return
    }
    if (
      formData.rerankThreshold !== null &&
      formData.rerankThreshold !== undefined &&
      !Number.isFinite(formData.rerankThreshold)
    ) {
      message.error('重排阈值必须是有限数值')
      return
    }
  }

  submitLoading.value = true
  try {
    const payload: KnowledgeBaseCreateDTO = {
      name: formData.name.trim(),
      description: formData.description?.trim() || null,
      orgId: formData.orgId,
      dataStatus: formData.dataStatus,
      isPublic: formData.isPublic,
      retrievalMode: formData.retrievalMode,
      keywordRecallSize: formData.keywordRecallSize ?? 10,
      vectorRecallSize: isVectorRequired.value ? (formData.vectorRecallSize ?? 10) : null,
      topK: formData.topK ?? 5,
      similarityThreshold: formData.similarityThreshold ?? null,
      contextWindowSize: formData.contextWindowSize ?? 0,
      embeddingConnectionId: isVectorRequired.value ? formData.embeddingConnectionId : null,
      dimensions: isVectorRequired.value ? formData.dimensions : null,
      rerankEnabled: formData.rerankEnabled,
      rerankConnectionId: formData.rerankEnabled ? String(formData.rerankConnectionId) : null,
      rerankThreshold:
        formData.rerankEnabled &&
        formData.rerankThreshold !== null &&
        formData.rerankThreshold !== undefined &&
        Number.isFinite(formData.rerankThreshold)
          ? Number(formData.rerankThreshold)
          : null,
    }

    await createKnowledgeBase(payload)
    message.success('知识库创建成功')
    emit('update:open', false)
    emit('success')
  } finally {
    submitLoading.value = false
  }
}
</script>

<style scoped>
.compact-form :deep(.ant-form-item) {
  margin-bottom: 12px;
}

.compact-form :deep(.ant-form-item-label > label) {
  font-size: var(--du-font-size-sm, 11.5px);
  color: var(--du-text, #172033);
  font-weight: var(--du-font-weight-medium, 500);
}

.compact-form :deep(.ant-form-item-extra) {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted, #8992a3);
  margin-top: 2px;
}

.compact-form :deep(.ant-divider-horizontal.ant-divider-with-text) {
  font-size: 12px;
  font-weight: var(--du-font-weight-semibold, 600);
  color: var(--du-text, #172033);
  border-top-color: var(--du-border, #d9dee8);
  margin: 14px 0 12px 0;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch-label {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary, #5c667a);
}

/* 语义重排策略卡片 */
.rerank-setting-card {
  border: 1px solid var(--du-border, #d9dee8);
  border-radius: var(--du-radius-md, 4px);
  background: var(--du-bg-surface, #ffffff);
  margin-top: 6px;
  overflow: hidden;
}

.rerank-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 14px;
  background: var(--du-bg-subtle, #f7f8fa);
}

.rerank-card-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.rerank-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rerank-card-title {
  font-size: var(--du-font-size-sm, 12px);
  font-weight: var(--du-font-weight-semibold, 600);
  color: var(--du-text, #172033);
}

.rerank-tag {
  line-height: 18px !important;
  font-size: 10.5px !important;
  padding: 0 6px !important;
  margin: 0 !important;
}

.rerank-card-desc {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary, #5c667a);
  line-height: 1.4;
}

.rerank-card-body {
  padding: 14px 14px 2px 14px;
  border-top: 1px solid var(--du-border, #d9dee8);
}

.select-empty-text {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary, #5c667a);
  padding: 8px 12px;
  text-align: center;
}
</style>
