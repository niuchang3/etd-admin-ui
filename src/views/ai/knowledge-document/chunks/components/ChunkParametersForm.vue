<template>
  <div class="chunk-parameters-form">
    <a-form layout="vertical" class="param-form">
      <a-collapse v-model:activeKey="activeCollapseKeys" :bordered="false" class="param-collapse">
        <!-- 基础参数面板（默认展开） -->
        <a-collapse-panel key="basic" header="基础参数（版面语义与切片参数）" class="collapse-section">
          <div class="form-grid">
            <!-- 起止页码：仅 PDF 和图片显示 -->
            <template v-if="isPdfOrImage">
              <a-form-item label="起始页码 (从1开始)">
                <a-input-number
                  v-model:value="modelValue.firstPage"
                  :min="1"
                  :precision="0"
                  placeholder="全部页 (留空)"
                  :disabled="disabled"
                  style="width: 100%"
                />
              </a-form-item>
              <a-form-item label="结束页码 (包含结束页)">
                <a-input-number
                  v-model:value="modelValue.lastPage"
                  :min="modelValue.firstPage || 1"
                  :precision="0"
                  placeholder="全部页 (留空)"
                  :disabled="disabled"
                  style="width: 100%"
                />
              </a-form-item>
            </template>

            <!-- 单片 Token 上限 -->
            <a-form-item label="单片 Token 上限" required>
              <a-input-number
                v-model:value="modelValue.maxTokens"
                :min="32"
                :max="8192"
                :precision="0"
                placeholder="推荐 600"
                :disabled="disabled"
                style="width: 100%"
              />
              <div class="field-hint">
                推荐设定为 500 ~ 800 Tokens（默认 600），既保证语义独立闭环，又避免生成过长分片。
              </div>
            </a-form-item>

            <!-- 自动合并同级小块 -->
            <a-form-item label="自动合并同级小块" class="switch-item">
              <div class="switch-row">
                <a-switch
                  v-model:checked="modelValue.mergePeers"
                  checked-children="开启"
                  un-checked-children="关闭"
                  :disabled="disabled"
                />
                <span class="switch-desc">将相近的段落或列表项合并为同一分片</span>
              </div>
            </a-form-item>

            <!-- OCR 启用开关：仅 PDF 和图片显示 -->
            <a-form-item v-if="isPdfOrImage" label="启用 OCR 光学字符识别" class="switch-item">
              <div class="switch-row">
                <a-switch
                  v-model:checked="modelValue.ocr"
                  checked-children="开启"
                  un-checked-children="关闭"
                  :disabled="disabled"
                  @change="handleOcrChange"
                />
                <span class="switch-desc">识别扫描件、影印页面及图片内的文字</span>
              </div>
            </a-form-item>

            <!-- 表格结构与 Markdown 表格 -->
            <a-form-item label="识别表格结构" class="switch-item">
              <div class="switch-row">
                <a-switch
                  v-model:checked="modelValue.tableStructure"
                  checked-children="开启"
                  un-checked-children="关闭"
                  :disabled="disabled"
                />
                <span class="switch-desc">提取表格行列网格与单元格对齐信息</span>
              </div>
            </a-form-item>

            <a-form-item label="分片表格转 Markdown" class="switch-item">
              <div class="switch-row">
                <a-switch
                  v-model:checked="modelValue.useMarkdownTables"
                  checked-children="开启"
                  un-checked-children="关闭"
                  :disabled="disabled"
                />
                <span class="switch-desc">将识别到的表格排版为 Markdown 语法</span>
              </div>
            </a-form-item>
          </div>
        </a-collapse-panel>

        <!-- 普通参数面板（默认折叠） -->
        <a-collapse-panel key="normal" header="普通参数（OCR与格式流水线）" class="collapse-section">
          <div class="form-grid">
            <!-- OCR 扩展项：仅 PDF/图片且 OCR 开启时显示 -->
            <template v-if="isPdfOrImage && modelValue.ocr">
              <a-form-item label="OCR 引擎预设">
                <a-input
                  v-model:value="modelValue.ocrPreset"
                  placeholder="留空使用系统默认 OCR 预设"
                  allow-clear
                  :disabled="disabled"
                />
              </a-form-item>

              <a-form-item label="OCR 语言识别列表">
                <a-select
                  v-model:value="modelValue.ocrLanguages"
                  mode="tags"
                  placeholder="输入语言代码回车，例如 chi_sim, eng"
                  :disabled="disabled"
                  allow-clear
                />
              </a-form-item>

              <a-form-item label="强制 OCR" class="switch-item">
                <div class="switch-row">
                  <a-switch
                    v-model:checked="modelValue.forceOcr"
                    checked-children="开启"
                    un-checked-children="关闭"
                    :disabled="disabled"
                  />
                  <span class="switch-desc">忽略现有文字图层，强制对所有页面重新识别</span>
                </div>
              </a-form-item>
            </template>

            <!-- PDF 流水线专属：表格精度与标题层级推断 -->
            <template v-if="isPdfOrImage">
              <a-form-item label="表格解析模式">
                <a-select
                  v-model:value="modelValue.tableMode"
                  :disabled="disabled"
                  :options="[
                    { label: '快速模式 (fast)', value: 'fast' },
                    { label: '高精模式 (accurate)', value: 'accurate' },
                  ]"
                />
              </a-form-item>

              <a-form-item label="PDF 标题层级推断" class="switch-item">
                <div class="switch-row">
                  <a-switch
                    v-model:checked="modelValue.doPdfHeadingHierarchy"
                    checked-children="开启"
                    un-checked-children="关闭"
                    :disabled="disabled"
                  />
                  <span class="switch-desc">根据字体、字号与编号规则自动推导标题层级</span>
                </div>
              </a-form-item>
            </template>

            <!-- 输出 Markdown 图片引用 -->
            <a-form-item label="输出 Markdown 图片引用" class="switch-item">
              <div class="switch-row">
                <a-switch
                  v-model:checked="modelValue.useMarkdownImages"
                  checked-children="开启"
                  un-checked-children="关闭"
                  :disabled="disabled"
                />
                <span class="switch-desc">在分片正文中保留插图 Markdown 占位</span>
              </div>
            </a-form-item>

            <!-- 图片占位文本 -->
            <a-form-item label="图片占位文本 (允许显式留空)">
              <a-input
                v-model:value="modelValue.imagePlaceholder"
                placeholder="例如 <!-- image -->"
                allow-clear
                :disabled="disabled"
              />
            </a-form-item>
          </div>
        </a-collapse-panel>

        <!-- 高级参数面板（默认折叠） -->
        <a-collapse-panel key="advanced" header="高级参数（分词器、超时与精细流水线）" class="collapse-section">
          <div class="form-grid">
            <!-- 单任务解析超时（秒） -->
            <a-form-item label="单任务处理超时时间 (秒)" required>
              <a-input-number
                v-model:value="modelValue.documentTimeoutSeconds"
                :min="10"
                :max="3600"
                :precision="0"
                :disabled="disabled"
                style="width: 100%"
              />
              <div class="field-hint">接口标准转换格式例如 PT90S，超时时间过短可能导致复杂大文件生成失败。</div>
            </a-form-item>

            <!-- 分词器 -->
            <a-form-item label="统计分词器 (Tokenizer)">
              <a-input
                v-model:value="modelValue.tokenizer"
                placeholder="留空使用系统默认分词器"
                allow-clear
                :disabled="disabled"
              />
            </a-form-item>

            <!-- PDF 文本与单元格匹配：仅 PDF/图片 -->
            <a-form-item v-if="isPdfOrImage" label="文本与表格单元格精准匹配" class="switch-item">
              <div class="switch-row">
                <a-switch
                  v-model:checked="modelValue.tableCellMatching"
                  checked-children="开启"
                  un-checked-children="关闭"
                  :disabled="disabled"
                />
                <span class="switch-desc">优化跨行合并单元格的文字归属判定</span>
              </div>
            </a-form-item>

            <!-- 图片分类：仅 PDF/图片，不默认开启 -->
            <a-form-item v-if="isPdfOrImage" label="图片分类推断" class="switch-item">
              <div class="switch-row">
                <a-switch
                  v-model:checked="modelValue.doPictureClassification"
                  checked-children="开启"
                  un-checked-children="关闭"
                  :disabled="disabled"
                />
                <span class="switch-desc">对文档内部插图进行图表、照片等分类标记</span>
              </div>
            </a-form-item>

            <!-- 原文结果包含图片与全页图片 -->
            <a-form-item label="保留原文插图数据" class="switch-item">
              <div class="switch-row">
                <a-switch
                  v-model:checked="modelValue.includeImages"
                  checked-children="开启"
                  un-checked-children="关闭"
                  :disabled="disabled"
                />
                <span class="switch-desc">在解析产物中包含裁剪提取的图片素材</span>
              </div>
            </a-form-item>

            <a-form-item label="保留整页渲染图" class="switch-item">
              <div class="switch-row">
                <a-switch
                  v-model:checked="modelValue.includePageImages"
                  checked-children="开启"
                  un-checked-children="关闭"
                  :disabled="disabled"
                />
                <span class="switch-desc">在解析产物中包含全页光栅化预览图片</span>
              </div>
            </a-form-item>

            <!-- 图片导出模式与缩放倍数 -->
            <a-form-item label="图片导出模式">
              <a-select
                v-model:value="modelValue.imageExportMode"
                :disabled="disabled"
                :options="[
                  { label: '占位符 (placeholder)', value: 'placeholder' },
                  { label: '内嵌数据 (embedded)', value: 'embedded' },
                  { label: '外部引用 (referenced)', value: 'referenced' },
                ]"
              />
            </a-form-item>

            <a-form-item label="图片缩放倍数">
              <a-input-number
                v-model:value="modelValue.imagesScale"
                :min="0.1"
                :max="10"
                :step="0.5"
                :precision="1"
                :disabled="disabled"
                style="width: 100%"
              />
            </a-form-item>

            <!-- Markdown 分页标记 -->
            <a-form-item label="Markdown 分页标记">
              <a-input
                v-model:value="modelValue.mdPageBreakPlaceholder"
                placeholder="例如 <!-- pagebreak --> 或留空"
                allow-clear
                :disabled="disabled"
              />
            </a-form-item>

            <!-- 紧凑表格与解析错误时中止 -->
            <a-form-item label="紧凑 Markdown 表格" class="switch-item">
              <div class="switch-row">
                <a-switch
                  v-model:checked="modelValue.mdCompactTables"
                  checked-children="开启"
                  un-checked-children="关闭"
                  :disabled="disabled"
                />
                <span class="switch-desc">紧凑排版 Markdown 表格空白字符</span>
              </div>
            </a-form-item>

            <a-form-item label="文档解析错误时中止" class="switch-item">
              <div class="switch-row">
                <a-switch
                  v-model:checked="modelValue.abortOnError"
                  checked-children="开启"
                  un-checked-children="关闭"
                  :disabled="disabled"
                />
                <span class="switch-desc">遇到页面解码损坏或解析异常时立即终止生成</span>
              </div>
            </a-form-item>
          </div>

          <!-- PDF 标题层级推断细项：仅在启用 doPdfHeadingHierarchy 时显示 -->
          <div v-if="isPdfOrImage && modelValue.doPdfHeadingHierarchy" class="hierarchy-sub-section">
            <div class="sub-section-title">PDF 标题层级推断细项参数</div>
            <div class="form-grid">
              <a-form-item label="利用书签 (use_bookmarks)" class="switch-item">
                <div class="switch-row">
                  <a-switch
                    v-model:checked="headingOptions.use_bookmarks"
                    checked-children="开启"
                    un-checked-children="关闭"
                    :disabled="disabled"
                  />
                </div>
              </a-form-item>

              <a-form-item label="利用段落编号 (use_numbering)" class="switch-item">
                <div class="switch-row">
                  <a-switch
                    v-model:checked="headingOptions.use_numbering"
                    checked-children="开启"
                    un-checked-children="关闭"
                    :disabled="disabled"
                  />
                </div>
              </a-form-item>

              <a-form-item label="利用排版样式 (use_style)" class="switch-item">
                <div class="switch-row">
                  <a-switch
                    v-model:checked="headingOptions.use_style"
                    checked-children="开启"
                    un-checked-children="关闭"
                    :disabled="disabled"
                  />
                </div>
              </a-form-item>

              <a-form-item label="利用字体外观 (use_font_style)" class="switch-item">
                <div class="switch-row">
                  <a-switch
                    v-model:checked="headingOptions.use_font_style"
                    checked-children="开启"
                    un-checked-children="关闭"
                    :disabled="disabled"
                  />
                </div>
              </a-form-item>

              <a-form-item label="字号容差 (style_size_tolerance)">
                <a-input-number
                  v-model:value="headingOptions.style_size_tolerance"
                  :min="0"
                  :max="1"
                  :step="0.05"
                  :precision="2"
                  placeholder="0 ~ 1"
                  :disabled="disabled"
                  style="width: 100%"
                />
              </a-form-item>

              <a-form-item label="最大层级深度 (max_level)">
                <a-input-number
                  v-model:value="headingOptions.max_level"
                  :min="1"
                  :max="100"
                  :precision="0"
                  placeholder="1 ~ 100"
                  :disabled="disabled"
                  style="width: 100%"
                />
              </a-form-item>

              <a-form-item label="书签匹配阈值 (bookmark_match_threshold)">
                <a-input-number
                  v-model:value="headingOptions.bookmark_match_threshold"
                  :min="0"
                  :max="1"
                  :step="0.05"
                  :precision="2"
                  placeholder="0 ~ 1"
                  :disabled="disabled"
                  style="width: 100%"
                />
              </a-form-item>
            </div>
          </div>
        </a-collapse-panel>
      </a-collapse>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ChunkFormState } from '../helper'
import { isPdfOrImageDocument } from '../helper'

const props = defineProps<{
  modelValue: ChunkFormState
  fileType?: string | null
  disabled?: boolean
}>()

const activeCollapseKeys = ref<string[]>(['basic'])

const isPdfOrImage = computed(() => isPdfOrImageDocument(props.fileType))

const headingOptions = computed(() => {
  if (!props.modelValue.pdfHeadingHierarchyOptions) {
    props.modelValue.pdfHeadingHierarchyOptions = {
      use_bookmarks: true,
      use_numbering: true,
      use_style: true,
      use_font_style: true,
      style_size_tolerance: 0.1,
      max_level: 6,
      bookmark_match_threshold: 0.8,
    }
  }
  return props.modelValue.pdfHeadingHierarchyOptions
})

/**
 * OCR 变更清理
 */
const handleOcrChange = (checked: boolean | string | number) => {
  if (!checked) {
    props.modelValue.ocrPreset = ''
    props.modelValue.ocrLanguages = []
    props.modelValue.forceOcr = false
  }
}
</script>

<style scoped>
.chunk-parameters-form {
  width: 100%;
}

.param-collapse {
  background: transparent;
}

.param-collapse :deep(.ant-collapse-item) {
  margin-bottom: var(--du-space-3, 12px);
  border: 1px solid var(--du-border-subtle, #e2e8f0);
  border-radius: var(--du-radius-sm, 4px);
  background: var(--du-bg-surface, #ffffff);
  overflow: hidden;
}

.param-collapse :deep(.ant-collapse-header) {
  padding: 8px 12px !important;
  font-size: var(--du-font-size-base, 12px) !important;
  font-weight: 600;
  color: var(--du-text-primary, #1e293b);
  background: var(--du-bg-panel, #f8fafc);
  border-bottom: 1px solid transparent;
}

.param-collapse :deep(.ant-collapse-item-active > .ant-collapse-header) {
  border-bottom-color: var(--du-border-subtle, #e2e8f0);
}

.param-collapse :deep(.ant-collapse-content) {
  background: var(--du-bg-surface, #ffffff);
}

.param-collapse :deep(.ant-collapse-content-box) {
  padding: 12px !important;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 16px;
}

.grid-col-full {
  grid-column: 1 / -1;
}

.field-hint {
  margin-top: 4px;
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted, #64748b);
  line-height: 1.4;
}

.switch-item {
  margin-bottom: 0;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
}

.switch-desc {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary, #475569);
  line-height: 1.3;
}

.hierarchy-sub-section {
  margin-top: 16px;
  padding: 12px;
  background: var(--du-bg-panel, #f8fafc);
  border: 1px dashed var(--du-border-subtle, #cbd5e1);
  border-radius: var(--du-radius-sm, 4px);
}

.sub-section-title {
  font-size: var(--du-font-size-xs, 11px);
  font-weight: 600;
  color: var(--du-text-primary, #334155);
  margin-bottom: 10px;
}

/* 紧凑表单项 */
.param-form :deep(.ant-form-item) {
  margin-bottom: 0;
}

.param-form :deep(.ant-form-item-label > label) {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary, #475569);
  height: 24px;
}
</style>
