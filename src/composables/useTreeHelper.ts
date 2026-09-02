import { ref } from 'vue'

export interface TreeNodeItem {
  key: string
  title: string
  parentId?: string | null
  children?: TreeNodeItem[]
  [key: string]: unknown
}

/** 比较两个 ID（兼容雪花 ID 长度与字典序） */
export const compareNodeId = (left: string, right: string) => {
  if (left.length !== right.length) return left.length - right.length
  return left.localeCompare(right)
}

/**
 * 将扁平的节点数组递归构建为树形结构，并按 sort 升序、id 升序排列
 */
export function buildTreeStructure<T extends Record<string, any>>(
  items: T[],
  options: {
    idKey?: string
    parentKey?: string
    titleKey?: string
    sortKey?: string
    transform?: (item: T) => TreeNodeItem
  } = {}
): TreeNodeItem[] {
  const {
    idKey = 'id',
    parentKey = 'parentId',
    titleKey = 'name',
    sortKey = 'sort',
    transform,
  } = options

  const nodeMap = new Map<string, TreeNodeItem>()

  items.forEach((item) => {
    const id = String(item[idKey])
    const parentId = item[parentKey] ? String(item[parentKey]) : null
    const node: TreeNodeItem = transform
      ? transform(item)
      : {
          key: id,
          title: String(item[titleKey] ?? '未命名'),
          parentId,
          sort: Number(item[sortKey] ?? 0),
          children: [],
          raw: item,
        }
    node.children = []
    nodeMap.set(id, node)
  })

  const roots: TreeNodeItem[] = []
  nodeMap.forEach((node) => {
    const parent = node.parentId ? nodeMap.get(node.parentId) : undefined
    if (parent) {
      if (!parent.children) parent.children = []
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  })

  const sortNodes = (nodes: TreeNodeItem[]): TreeNodeItem[] => {
    return nodes
      .sort((a, b) => {
        const sortDiff = Number(a.sort ?? 0) - Number(b.sort ?? 0)
        return sortDiff || compareNodeId(a.key, b.key)
      })
      .map((node) => ({
        ...node,
        children: node.children?.length ? sortNodes(node.children) : undefined,
      }))
  }

  return sortNodes(roots)
}

/**
 * 递归收集所有选中节点的父级链条 key，用于初始化时默认展开父级节点
 */
export function collectAncestorKeys<T extends Record<string, any>>(
  selectedIds: string[],
  items: T[],
  idKey = 'id',
  parentKey = 'parentId'
): string[] {
  const parentMap = new Map<string, string>()
  items.forEach((item) => {
    if (item[parentKey]) {
      parentMap.set(String(item[idKey]), String(item[parentKey]))
    }
  })

  const expanded = new Set<string>()
  selectedIds.forEach((id) => {
    let cur = parentMap.get(id)
    while (cur) {
      expanded.add(cur)
      cur = parentMap.get(cur)
    }
  })
  return Array.from(expanded)
}

/**
 * 扁平提取树中全部节点的 key
 */
export function flattenTreeKeys(nodes: TreeNodeItem[]): string[] {
  return nodes.flatMap((n) => [n.key, ...(n.children ? flattenTreeKeys(n.children) : [])])
}

/**
 * 关键词过滤树（保留命中节点及其父级链路）
 */
export function filterTreeNodes<T extends { key: string; title: string; children?: T[] }>(
  nodes: T[],
  keyword: string
): T[] {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return nodes
  const result: T[] = []
  for (const node of nodes) {
    const matchSelf = node.title.toLowerCase().includes(kw)
    const filteredChildren = node.children ? filterTreeNodes(node.children, kw) : []
    if (matchSelf || filteredChildren.length > 0) {
      result.push({
        ...node,
        children: filteredChildren.length ? (filteredChildren as T['children']) : undefined,
      })
    }
  }
  return result
}

/**
 * 树的展开、勾选、全选与清空状态 Hook
 */
export function useTreeSelection() {
  const checkedKeys = ref<string[]>([])
  const halfCheckedKeys = ref<string[]>([])
  const expandedKeys = ref<string[]>([])

  const onTreeCheck = (
    keys: unknown,
    e: { halfCheckedKeys?: unknown[] }
  ) => {
    const rawKeys = Array.isArray(keys)
      ? keys
      : typeof keys === 'object' && keys && 'checked' in keys && Array.isArray((keys as { checked: unknown[] }).checked)
        ? (keys as { checked: unknown[] }).checked
        : []
    checkedKeys.value = Array.from(new Set(rawKeys.map(String)))
    if (e && e.halfCheckedKeys && Array.isArray(e.halfCheckedKeys)) {
      halfCheckedKeys.value = Array.from(new Set(e.halfCheckedKeys.map(String)))
    } else {
      halfCheckedKeys.value = []
    }
  }

  const expandAll = (tree: TreeNodeItem[]) => {
    expandedKeys.value = flattenTreeKeys(tree)
  }

  const collapseAll = () => {
    expandedKeys.value = []
  }

  const checkAll = (tree: TreeNodeItem[]) => {
    checkedKeys.value = flattenTreeKeys(tree)
    halfCheckedKeys.value = []
  }

  const clearChecked = () => {
    checkedKeys.value = []
    halfCheckedKeys.value = []
  }

  /** 获取最终合并提交的 ID 列表（包含完全勾选项与半勾选父级） */
  const getSelectedAndHalfKeys = (): string[] => {
    return Array.from(new Set([...checkedKeys.value, ...halfCheckedKeys.value]))
  }

  return {
    checkedKeys,
    halfCheckedKeys,
    expandedKeys,
    onTreeCheck,
    expandAll,
    collapseAll,
    checkAll,
    clearChecked,
    getSelectedAndHalfKeys,
  }
}

/**
 * 递归排除当前节点及其全部子孙节点，构造适用于 Parent 选择的安全树结构（防止自环与循环嵌套）
 */
export function getValidParentTree<T extends { key?: string; value?: string; id?: string | number; children?: T[] }>(
  nodes: T[],
  currentId?: string | number | null,
  keyField: 'key' | 'value' | 'id' = 'value'
): T[] {
  if (!currentId) return nodes
  const targetIdStr = String(currentId)

  const walk = (items: T[]): T[] => {
    const result: T[] = []
    for (const item of items) {
      const itemKey = String(item[keyField] ?? item.key ?? item.value ?? item.id ?? '')
      // 命中自身，则自身及整棵子树均被过滤抛弃
      if (itemKey === targetIdStr) {
        continue
      }
      const newItem = { ...item }
      if (newItem.children && newItem.children.length > 0) {
        newItem.children = walk(newItem.children)
      }
      result.push(newItem)
    }
    return result
  }

  return walk(nodes)
}

/**
 * 递归收集树中全部节点的 Key 列表
 */
export function collectTreeKeys<T extends { key?: string; value?: string; id?: string | number; children?: T[] }>(
  nodes: T[],
  keyField: 'key' | 'value' | 'id' = 'key'
): string[] {
  const keys: string[] = []
  const walk = (items: T[]) => {
    for (const item of items) {
      const keyVal = String(item[keyField] ?? item.key ?? item.value ?? item.id ?? '')
      if (keyVal) keys.push(keyVal)
      if (item.children?.length) walk(item.children)
    }
  }
  walk(nodes)
  return keys
}

