import { computed, onMounted, reactive, ref, type ComputedRef } from 'vue'
import type { PageRequest, PageResult, ResultModel } from '@/apis/types'
import type { TablePaginationConfig } from 'ant-design-vue'
import { useSystemConfigStore } from '@/stores/modules/config'

export interface UseTablePaginationOptions<T> {
  defaultSize?: number
  immediate?: boolean
  onLoaded?: (data: PageResult<T>) => void
}

export interface UseTablePaginationReturn<T, Q extends PageRequest> {
  loading: Ref<boolean>
  records: Ref<T[]>
  total: Ref<number>
  query: Q
  pagination: ComputedRef<TablePaginationConfig>
  loadData: () => Promise<void>
  handleSearch: () => void
  resetSearch: (extraReset?: Partial<Q>) => void
  handleTableChange: (page: { current?: number; pageSize?: number }) => void
  refreshAfterDelete: (deletedCount?: number) => Promise<void>
}

import type { Ref } from 'vue'

/**
 * 统一标准 CRUD 分页表格的逻辑 Hook
 * 封装数据加载状态、分页联动、重置查询与删除智能回退
 */
export function useTablePagination<T, Q extends PageRequest>(
  fetchApi: (params: Q) => Promise<ResultModel<PageResult<T>>>,
  initialQuery: Q,
  options: UseTablePaginationOptions<T> = {}
): UseTablePaginationReturn<T, Q> {
  const configStore = useSystemConfigStore()
  const fallbackDefaultSize = configStore.resource?.pagination?.defaultSize || 10
  const maxPageSize = configStore.resource?.pagination?.maxSize || 200

  const { defaultSize = fallbackDefaultSize, immediate = false, onLoaded } = options

  const loading = ref(false)
  const records = ref<T[]>([]) as Ref<T[]>
  const total = ref(0)

  // 深度克隆初始查询条件，以便重置时完全还原
  const defaultQueryParams = JSON.parse(JSON.stringify(initialQuery))
  const query = reactive<Q>({
    ...defaultQueryParams,
    current: defaultQueryParams.current || 1,
    size: defaultQueryParams.size || defaultSize,
  })

  // 适配 Ant Design Vue Table 的 pagination 配置，动态适配全局 resourceLimit.pagination
  const pagination = computed<TablePaginationConfig>(() => {
    const candidateSizes = [10, 20, 50, 100, 200]
    const validSizes = candidateSizes.filter((s) => s <= maxPageSize)
    if (!validSizes.includes(maxPageSize) && maxPageSize > 0) {
      validSizes.push(maxPageSize)
      validSizes.sort((a, b) => a - b)
    }
    const pageSizeOptions = (validSizes.length ? validSizes : [10]).map(String)

    return {
      current: query.current,
      pageSize: query.size,
      total: total.value,
      showSizeChanger: true,
      pageSizeOptions,
      showTotal: (count: number) => `共 ${count} 条`,
    }
  })

  /** 加载列表数据 */
  const loadData = async () => {
    loading.value = true
    try {
      const response = await fetchApi(query as Q)
      const data = response.data
      if (data) {
        records.value = data.records || []
        total.value = data.total || 0
        if (onLoaded) {
          onLoaded(data)
        }
      }
    } finally {
      loading.value = false
    }
  }

  /** 执行搜索（重置当前页为 1） */
  const handleSearch = () => {
    query.current = 1
    void loadData()
  }

  /** 重置搜索条件并重新加载 */
  const resetSearch = (extraReset?: Partial<Q>) => {
    Object.assign(query, JSON.parse(JSON.stringify(defaultQueryParams)), extraReset || {})
    query.current = 1
    query.size = query.size || defaultSize
    void loadData()
  }

  /** 分页或每页条数变化回调 */
  const handleTableChange = (page: { current?: number; pageSize?: number }) => {
    query.current = page.current || 1
    const targetSize = page.pageSize || defaultSize
    query.size = Math.min(targetSize, maxPageSize)
    void loadData()
  }

  /** 删除后自适应刷新：如果当前页记录全部删除且页码大于 1，则自动向前翻一页 */
  const refreshAfterDelete = async (deletedCount = 1) => {
    if (records.value.length <= deletedCount && query.current > 1) {
      query.current -= 1
    }
    await loadData()
  }

  if (immediate) {
    onMounted(() => {
      void loadData()
    })
  }

  return {
    loading,
    records,
    total,
    query: query as unknown as Q,
    pagination,
    loadData,
    handleSearch,
    resetSearch,
    handleTableChange,
    refreshAfterDelete,
  }
}
