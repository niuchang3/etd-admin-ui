<template>
  <a-select
    :value="value"
    :options="options"
    :loading="loading"
    :disabled="disabled"
    :allow-clear="allowClear"
    :placeholder="placeholder"
    :size="size"
    :mode="mode"
    v-bind="$attrs"
    @update:value="onValueChange"
    @change="onChange"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { getEnabledDictData } from '@/apis/upms/dict'
import type { SystemDictData } from '@/apis/upms/dict/type'
import { toSystemDictOptions, type SystemDictOption } from '@/utils/SystemDict'

interface Props {
  /** 字典类型编码 */
  typeCode: string
  /** 绑定值 */
  value?: any
  /** 选项值转换函数，例如 (val: string) => Number(val) */
  convert?: (val: string) => unknown
  /** 禁用状态 */
  disabled?: boolean
  /** 允许清空 */
  allowClear?: boolean
  /** 占位文案 */
  placeholder?: string
  /** 尺寸 */
  size?: 'small' | 'middle' | 'large'
  /** 模式 */
  mode?: 'multiple' | 'tags' | 'combobox'
}

const props = withDefaults(defineProps<Props>(), {
  value: undefined,
  convert: undefined,
  disabled: false,
  allowClear: true,
  placeholder: '请选择',
  size: undefined,
  mode: undefined,
})

const emit = defineEmits<{
  (e: 'update:value', val: unknown): void
  (e: 'change', val: unknown, option: unknown): void
}>()

const loading = ref(false)
const dictItems = ref<SystemDictData[]>([])

const loadDict = async () => {
  if (!props.typeCode) return
  loading.value = true
  try {
    const res = await getEnabledDictData(props.typeCode)
    dictItems.value = res.data || []
  } catch (err) {
    console.warn(`[DictSelect] 加载字典【${props.typeCode}】失败:`, err)
  } finally {
    loading.value = false
  }
}

watch(() => props.typeCode, () => {
  void loadDict()
})

onMounted(() => {
  void loadDict()
})

const options = computed<SystemDictOption<unknown>[]>(() => {
  if (props.convert) {
    return toSystemDictOptions(dictItems.value, props.convert)
  }
  return toSystemDictOptions(dictItems.value, (val) => val)
})

const onValueChange = (val: unknown) => {
  emit('update:value', val)
}

const onChange = (val: unknown, option: unknown) => {
  emit('change', val, option)
}
</script>
