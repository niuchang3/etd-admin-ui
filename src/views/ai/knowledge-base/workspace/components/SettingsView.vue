<template>
  <div class="settings-view du-panel">
    <!-- 头部说明 -->
    <header class="settings-header">
      <div class="header-main">
        <div class="header-title-box">
          <SettingOutlined class="header-icon" />
          <span class="title-text">知识库配置</span>
        </div>
        <span class="header-sub">配置知识库检索模式、底座向量模型、召回候选深度及语义重排策略。</span>
      </div>

      <a-alert
        v-if="!canWrite || kb?.writable === false"
        type="info"
        message="您当前为只读权限，无法修改知识库设置。"
        show-icon
        class="readonly-alert"
      />
    </header>

    <!-- 设置表单区 -->
    <a-spin :spinning="loadingDetail || connectionsLoading">
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        :disabled="isFormDisabled"
        layout="vertical"
        class="settings-form"
      >
        <!-- 分区一：基本信息 -->
        <section class="form-section-card">
          <div class="section-card-header">
            <span class="section-card-title">基本信息</span>
            <span class="section-card-desc">维护知识库标识、所属组织及租户内访问权限</span>
          </div>

          <div class="section-card-body">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="知识库名称" name="name">
                  <a-input
                    v-model:value="formData.name"
                    placeholder="请输入知识库名称"
                    :maxlength="50"
                    show-count
                    allow-clear
                  />
                </a-form-item>
              </a-col>

              <a-col :span="12">
                <a-form-item label="所属组织/部门" extra="组织在创建时确定，创建后不可修改">
                  <a-input :value="orgDisplayName" disabled />
                </a-form-item>
              </a-col>
            </a-row>

            <a-form-item label="知识库简介" name="description">
              <a-textarea
                v-model:value="formData.description"
                placeholder="知识库描述、资料范围或用途"
                :maxlength="500"
                :rows="2"
                show-count
                allow-clear
              />
            </a-form-item>

            <!-- 对称状态卡片条 -->
            <a-row :gutter="16">
              <a-col :span="12">
                <div class="status-switch-card">
                  <div class="switch-card-text">
                    <span class="switch-card-title">租户内公开</span>
                    <span class="switch-card-desc">
                      {{ formData.isPublic ? '租户内成员均可访问检索；同时作为新文档默认权限' : '仅知识库有权成员可访问；作为新文档默认私有' }}
                    </span>
                  </div>
                  <a-switch
                    v-model:checked="formData.isPublic"
                    checked-children="公开"
                    un-checked-children="私有"
                  />
                </div>
              </a-col>

              <a-col :span="12">
                <div class="status-switch-card">
                  <div class="switch-card-text">
                    <span class="switch-card-title">知识库启用状态</span>
                    <span class="switch-card-desc">
                      {{ formData.dataStatus === COMMON_STATUS.ENABLED ? '服务正常启用，参与语义与文档召回' : '服务已停用，不参与任何搜索检索' }}
                    </span>
                  </div>
                  <a-switch
                    :checked="formData.dataStatus === COMMON_STATUS.ENABLED"
                    checked-children="启用"
                    un-checked-children="停用"
                    @change="(checked: boolean) => formData.dataStatus = checked ? COMMON_STATUS.ENABLED : COMMON_STATUS.DISABLED"
                  />
                </div>
              </a-col>
            </a-row>
          </div>
        </section>

        <!-- 分区二：检索模式与向量配置 -->
        <section class="form-section-card">
          <div class="section-card-header">
            <span class="section-card-title">检索模式与向量配置</span>
            <span class="section-card-desc">配置底座向量推理模型、相似度过滤及多路召回候选深度</span>
          </div>

          <div class="section-card-body">
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
                  :extra="!isVectorRequired ? '全文检索模式下无需配置向量模型' : undefined"
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
                  extra="从模型支持维度中选择对应维度"
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
                <a-form-item
                  label="相似度阈值 (0-1)"
                  name="similarityThreshold"
                  extra="留空表示不按相似度阈值过滤 (传 null)"
                >
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

            <!-- 召回深度 4 等分栏 -->
            <a-row :gutter="16">
              <a-col :span="6">
                <a-form-item label="全文召回候选数" name="keywordRecallSize" extra="倒排候选数 (1-100)">
                  <a-input-number
                    v-model:value="formData.keywordRecallSize"
                    :min="1"
                    :max="100"
                    style="width: 100%;"
                  />
                </a-form-item>
              </a-col>

              <a-col :span="6">
                <a-form-item
                  label="向量召回候选数"
                  name="vectorRecallSize"
                  :extra="isVectorRequired ? '向量候选数 (1-100)' : '纯全文下不生效'"
                >
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
                <a-form-item label="最终输出 Top K" name="topK" extra="初筛合并数 (1-100)">
                  <a-input-number
                    v-model:value="formData.topK"
                    :min="1"
                    :max="100"
                    style="width: 100%;"
                  />
                </a-form-item>
              </a-col>

              <a-col :span="6">
                <a-form-item label="上下文扩展窗口" name="contextWindowSize" extra="指针滑动扩展 (0-3)">
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
          </div>
        </section>

        <!-- 分区三：重排 (Rerank) 策略 -->
        <section class="form-section-card">
          <div class="rerank-setting-card">
            <div class="rerank-card-header">
              <div class="rerank-card-info">
                <div class="rerank-title-row">
                  <span class="rerank-card-title">语义重排策略 (Rerank)</span>
                  <a-tag color="blue" class="rerank-tag">提升精确度</a-tag>
                </div>
                <span class="rerank-card-desc">
                  基于 Cross-Encoder 模型对多路召回候选结果进行语义精排，大幅优化问答场景的检索命中率。
                </span>
              </div>
              <a-switch
                :checked="formData.rerankEnabled"
                checked-children="开启"
                un-checked-children="关闭"
                @change="handleRerankEnabledChange"
              />
            </div>

            <!-- 开启重排后展示对称双列参数配置 -->
            <div v-if="formData.rerankEnabled" class="rerank-card-body">
              <a-alert
                v-if="invalidRerankConnection"
                type="warning"
                :message="invalidRerankReason || '当前知识库已保存的重排连接已停用或失效，请重新选择可用连接'"
                show-icon
                class="rerank-card-alert"
              />

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
                      :loading="connectionsLoading"
                    >
                      <template #notFoundContent>
                        <div v-if="connectionsLoading" class="select-spin-box">
                          <a-spin size="small" />
                        </div>
                        <div v-else-if="isConnectionsForbidden" class="select-empty-text">
                          权限不足，无法访问重排序模型连接
                        </div>
                        <div v-else class="select-empty-text">
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
        </section>

        <!-- 底部保存条 -->
        <div class="form-actions-footer">
          <div class="footer-tip">修改配置保存后，将实时作用于后续知识库检索。</div>
          <a-button
            type="primary"
            :loading="submitLoading"
            :disabled="isFormDisabled"
            class="save-btn"
            @click="handleSubmit"
          >
            保存知识库设置
          </a-button>
        </div>
      </a-form>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { message, type FormInstance } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import {
  SettingOutlined,
} from '@ant-design/icons-vue'
import { menusStore } from '@/stores/modules/user'
import { useKnowledgeBaseStore } from '@/stores/modules/knowledgeBase'
import { updateKnowledgeBase } from '@/apis/ai/knowledge-base'
import type { KnowledgeBaseUpdateDTO } from '@/apis/ai/knowledge-base/type'
import { getOrganizationLookup } from '@/apis/upms/organization'
import { useModelConnections } from '../../composables/useModelConnections'
import { COMMON_STATUS } from '@/constant'

const props = defineProps<{
  knowledgeBaseId: string
}>()

const formRef = ref<FormInstance>()
const currentMenus = menusStore()
const kbStore = useKnowledgeBaseStore()

const canWrite = computed(() => currentMenus.canWritePath('/ai/knowledge-bases'))
const kb = computed(() => kbStore.currentKb)
const loadingDetail = computed(() => kbStore.loadingKb)

const {
  loading: connectionsLoading,
  isForbidden: isConnectionsForbidden,
  loadConnectionsAndModels,
  embeddingConnectionOptions,
  rerankConnectionOptions,
  invalidRerankConnection,
  invalidRerankReason,
  echoRerankConnection,
  getDimensionsForConnection,
} = useModelConnections()

const submitLoading = ref(false)
const orgDisplayName = ref('')

const formData = reactive<KnowledgeBaseUpdateDTO>({
  version: '',
  orgId: '',
  name: '',
  description: '',
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

const isFormDisabled = computed(() => {
  return (
    !canWrite.value ||
    kb.value?.writable === false ||
    submitLoading.value
  )
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

// 填充知识库已有详情数据并回显
const syncFormData = async () => {
  if (!kb.value) return
  formData.version = kb.value.version
  formData.orgId = String(kb.value.orgId || '')
  formData.name = kb.value.name
  formData.description = kb.value.description || ''
  formData.dataStatus = kb.value.dataStatus ?? COMMON_STATUS.ENABLED
  formData.isPublic = kb.value.isPublic ?? false
  formData.retrievalMode = kb.value.retrievalMode || 'hybrid'
  formData.embeddingConnectionId = kb.value.embeddingConnectionId || null
  formData.dimensions = kb.value.dimensions || null
  formData.keywordRecallSize = kb.value.keywordRecallSize ?? 10
  formData.vectorRecallSize = kb.value.vectorRecallSize ?? 10
  formData.topK = kb.value.topK ?? 5
  formData.contextWindowSize = kb.value.contextWindowSize ?? 0
  formData.similarityThreshold = kb.value.similarityThreshold ?? null
  formData.rerankEnabled = kb.value.rerankEnabled ?? false
  formData.rerankConnectionId = kb.value.rerankConnectionId || null
  formData.rerankThreshold = kb.value.rerankThreshold ?? null

  if (kb.value.orgId) {
    void loadOrgName(kb.value.orgId)
  }

  // 重排模型连接回显验证
  if (formData.rerankEnabled && formData.rerankConnectionId) {
    await echoRerankConnection(formData.rerankConnectionId)
  }
}

const loadOrgName = async (orgId: string) => {
  try {
    const res = await getOrganizationLookup(orgId)
    orgDisplayName.value = res.data?.orgName || `组织 ID: ${orgId}`
  } catch {
    orgDisplayName.value = `组织 ID: ${orgId}`
  }
}

watch(
  () => kb.value,
  () => {
    void syncFormData()
  },
  { immediate: true }
)

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  if (isFormDisabled.value) return

  // 必须携带原有的 orgId，保持字符串处理
  const effectiveOrgId = String(formData.orgId || kb.value?.orgId || '')
  if (!effectiveOrgId) {
    message.error('未检测到知识库所属组织信息，无法保存')
    return
  }

  // 开启重排时的业务边界校验
  if (formData.rerankEnabled) {
    if (invalidRerankConnection.value) {
      message.error(invalidRerankReason.value || '当前知识库已保存的重排连接已停用或失效，请重新选择可用连接')
      return
    }
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
    const payload: KnowledgeBaseUpdateDTO = {
      version: formData.version,
      orgId: effectiveOrgId,
      name: formData.name.trim(),
      description: formData.description?.trim() || null,
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

    await updateKnowledgeBase(props.knowledgeBaseId, payload)
    message.success('知识库设置保存成功')
    // 刷新详情
    await kbStore.loadKbDetail(props.knowledgeBaseId, true)
  } catch (err: any) {
    message.error(err?.message || '设置保存失败')
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => {
  void loadConnectionsAndModels()
  if (!kb.value || String(kb.value.id) !== String(props.knowledgeBaseId)) {
    void kbStore.loadKbDetail(props.knowledgeBaseId)
  }
})
</script>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 20px;
  overflow-y: auto;
  background: var(--du-bg-surface, #ffffff);
}

.settings-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--du-border, #d9dee8);
}

.header-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-title-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  color: var(--du-accent, #2563eb);
  font-size: 15px;
}

.title-text {
  font-size: var(--du-font-size-md, 13px);
  font-weight: var(--du-font-weight-semibold, 600);
  color: var(--du-text, #172033);
}

.header-sub {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted, #8992a3);
  line-height: 1.4;
}

.readonly-alert {
  font-size: var(--du-font-size-xs, 11px);
}

/* 表单结构 */
.settings-form {
  max-width: 860px;
}

.settings-form :deep(.ant-form-item) {
  margin-bottom: 12px;
}

.settings-form :deep(.ant-form-item-label > label) {
  font-size: var(--du-font-size-sm, 11.5px);
  color: var(--du-text, #172033);
  font-weight: var(--du-font-weight-medium, 500);
}

.settings-form :deep(.ant-form-item-extra) {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted, #8992a3);
  margin-top: 2px;
  line-height: 1.4;
}

/* 分区卡片 */
.form-section-card {
  border: 1px solid var(--du-border, #d9dee8);
  border-radius: var(--du-radius-md, 4px);
  background: var(--du-bg-surface, #ffffff);
  margin-bottom: 16px;
  overflow: hidden;
}

.section-card-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 14px;
  background: var(--du-bg-subtle, #f7f8fa);
  border-bottom: 1px solid var(--du-border, #d9dee8);
}

.section-card-title {
  font-size: var(--du-font-size-sm, 12px);
  font-weight: var(--du-font-weight-semibold, 600);
  color: var(--du-text, #172033);
}

.section-card-desc {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted, #8992a3);
}

.section-card-body {
  padding: 14px 14px 4px 14px;
}

/* 二元状态卡片条（对称 12+12） */
.status-switch-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 60px;
  padding: 10px 14px;
  margin-bottom: 12px;
  border: 1px solid var(--du-border, #d9dee8);
  border-radius: var(--du-radius-sm, 3px);
  background: var(--du-bg-subtle, #f7f8fa);
}

.switch-card-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.switch-card-title {
  font-size: var(--du-font-size-sm, 12px);
  font-weight: var(--du-font-weight-medium, 500);
  color: var(--du-text, #172033);
}

.switch-card-desc {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary, #5c667a);
  line-height: 1.35;
}

/* 语义重排策略卡片 */
.rerank-setting-card {
  border-radius: var(--du-radius-md, 4px);
  background: var(--du-bg-surface, #ffffff);
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
  gap: 4px;
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
  padding: 14px 14px 4px 14px;
  border-top: 1px solid var(--du-border, #d9dee8);
}

.rerank-card-alert {
  margin-bottom: 12px;
  font-size: var(--du-font-size-xs, 11px);
}

/* 下拉与加载提示 */
.select-spin-box {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
}

.select-empty-text {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary, #5c667a);
  padding: 8px 12px;
  text-align: center;
}

/* 底部操作条 */
.form-actions-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid var(--du-border, #d9dee8);
}

.footer-tip {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted, #8992a3);
}

.save-btn {
  height: 32px;
  min-width: 140px;
  font-size: var(--du-font-size-sm, 12px);
}
</style>
