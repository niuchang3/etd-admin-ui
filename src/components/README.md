# ETD Admin UI 前端基础底座与通用组件库指南

本目录及相关通用模块为项目公共基础设施。用于沉淀高频复用的逻辑、UI 展示组件与工具函数，避免在业务页面中反复手写冗余样板代码（Boilerplate）。

---

## 目录结构与职责分工

```text
src/
├── components/                  # 通用 UI 展示组件
│   ├── EllipsisText.vue         # 单行超长文本截断与 Tooltip 提示组件
│   ├── StatusTag.vue            # 统一状态标签组件（启用/停用、锁定/正常等）
│   └── README.md                # 本使用说明文档
├── composables/                 # 通用业务逻辑 Hook（纯状态与副作用，不侵入模板）
│   ├── useTablePagination.ts    # 标准 CRUD 表格分页、查询、重置与删除联动
│   ├── useTreeHelper.ts         # 树形数据构建、祖先收集、关键词过滤与勾选状态管理
│   └── usePasswordPolicy.ts     # 全局密码安全策略与动态强度正则校验
└── utils/                       # 纯函数工具类
    ├── format.ts                # 日期时间标准化格式化工具
    ├── confirm.ts               # 标准二次确认交互（Modal.confirm 简化封装）
    ├── Request.ts               # Axios 请求实例与拦截器
    └── SystemDict.ts            # 数据字典加载与翻译辅助
```

---

## 一、逻辑层 Hook（Composables）

### 1. `useTablePagination`（通用表格分页查询）

封装了标准分页表格的全部样板代码：数据加载状态、查询对象、分页联动、重置查询条件、以及删除最后一条记录时自动前翻一页。

#### 核心属性与方法

| 导出项 | 类型 | 说明 |
| :--- | :--- | :--- |
| `loading` | `Ref<boolean>` | 表格加载中状态 |
| `records` | `Ref<T[]>` | 当前页列表数据 |
| `total` | `Ref<number>` | 列表总条数 |
| `query` | `Q` | 响应式查询对象（包含 `current`、`size` 与自定义查询项） |
| `pagination` | `ComputedRef<TablePaginationConfig>` | 直接透传给 `<a-table :pagination="pagination" />` 的配置 |
| `loadData()` | `() => Promise<void>` | 执行异步拉取数据 |
| `handleSearch()` | `() => void` | 执行搜索（自动将 `query.current` 重置为 `1`） |
| `resetSearch(extra?)` | `(extra?: Partial<Q>) => void` | 重置所有筛选项并重置为第 1 页拉取 |
| `handleTableChange(p)` | `(page) => void` | 直接绑定给 `<a-table @change="handleTableChange" />` |
| `refreshAfterDelete(n?)` | `(count?: number) => Promise<void>` | 删除后自适应刷新（页码智能前翻） |

#### 使用示例

```vue
<template>
  <div class="page-toolbar">
    <a-input v-model:value="query.keyword" placeholder="搜索关键字" @press-enter="handleSearch" />
    <a-button type="primary" @click="handleSearch">查询</a-button>
    <a-button @click="resetSearch()">重置</a-button>
  </div>

  <a-table
    :columns="columns"
    :data-source="records"
    :loading="loading"
    :pagination="pagination"
    row-key="id"
    size="small"
    @change="handleTableChange"
  />
</template>

<script setup lang="ts">
import { useTablePagination } from '@/composables/useTablePagination'
import { getUserPage } from '@/apis/upms/user'
import type { UserRecord, UserQueryParams } from '@/apis/upms/user/type'

const {
  loading,
  records,
  query,
  pagination,
  handleSearch,
  resetSearch,
  handleTableChange,
  refreshAfterDelete,
} = useTablePagination<UserRecord, UserQueryParams>(
  getUserPage,
  { current: 1, size: 10, keyword: '' },
  { defaultSize: 10, immediate: true }
)

const handleDelete = async (record: UserRecord) => {
  await deleteUser(record.id)
  await refreshAfterDelete() // 智能退页刷新
}
</script>
```

---

### 2. `useTreeHelper`（树形数据辅助与状态管理）

提供树构建、关键词过滤、祖先节点展开，以及展开/折叠/全选/清空的状态管理。

#### 核心函数

1. **`buildTreeStructure(items, options)`**:
   将后端返回的扁平数组根据 `parentId` 递归转为树形结构，并按 `sort` 升序排布。
2. **`collectAncestorKeys(selectedIds, items)`**:
   递归收集已勾选节点的全部祖先 key，通常用于初始化抽屉或弹窗时，使选中的叶子节点的父层级自动展开。
3. **`filterTreeNodes(tree, keyword)`**:
   树关键字模糊过滤，自动保留命中节点的祖先路径。
4. **`useTreeSelection()`**:
   树选择状态 Hook，统一维护勾选与展开状态：
   - `checkedKeys`: 当前勾选的 keys
   - `halfCheckedKeys`: 半选中父节点的 keys
   - `expandedKeys`: 展开的 keys
   - `onTreeCheck(keys, e)`: 绑定给 `<a-tree @check="onTreeCheck" />`
   - `expandAll(tree)` / `collapseAll()`: 全部展开 / 全部收起
   - `checkAll(tree)` / `clearChecked()`: 全选 / 清空
   - `getSelectedAndHalfKeys()`: 获取合并提交给后端的全部 ID

#### 使用示例

```vue
<template>
  <div class="tree-toolbar">
    <a-button size="small" @click="expandAll(menuTree)">全部展开</a-button>
    <a-button size="small" @click="collapseAll">全部收起</a-button>
    <a-button size="small" @click="checkAll(menuTree)">全选</a-button>
    <a-button size="small" @click="clearChecked">清空</a-button>
  </div>

  <a-tree
    v-model:expandedKeys="expandedKeys"
    :checked-keys="checkedKeys"
    :tree-data="menuTree"
    checkable
    @check="onTreeCheck"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  buildTreeStructure,
  collectAncestorKeys,
  useTreeSelection,
  type TreeNodeItem,
} from '@/composables/useTreeHelper'

const menuTree = ref<TreeNodeItem[]>([])
const {
  checkedKeys,
  expandedKeys,
  onTreeCheck,
  expandAll,
  collapseAll,
  checkAll,
  clearChecked,
  getSelectedAndHalfKeys,
} = useTreeSelection()

// 加载数据并回显
const loadMenuSettings = async (selectedIds: string[], rawMenus: any[]) => {
  menuTree.value = buildTreeStructure(rawMenus, { titleKey: 'menuName' })
  checkedKeys.value = [...selectedIds]
  // 自动展开已选节点的父层级
  expandedKeys.value = collectAncestorKeys(selectedIds, rawMenus)
}

// 提交全量勾选项（含半选父级）
const submit = async () => {
  const finalIds = getSelectedAndHalfKeys()
  await saveApi({ menuIds: finalIds })
}
</script>
```

---

### 3. `usePasswordPolicy`（全局密码安全策略）

自动接入 Pinia `useSystemConfigStore().security.password`，动态响应服务端配置的最小长度（`minLength`）和强度正则（`regexp`），消除表单校验不触发与规则脱节的问题。

#### 核心属性

| 导出项 | 类型 | 说明 |
| :--- | :--- | :--- |
| `passwordRules` | `ComputedRef<Rule[]>` | 直接绑定到 `<a-form-item :rules="passwordRules">` 的动态规则数组 |
| `passwordPlaceholder` | `ComputedRef<string>` | 包含最低位数的动态占位符（如“请输入密码（至少 8 位）”） |
| `minLength` | `ComputedRef<number>` | 当前策略要求的最低密码长度 |

#### 使用示例

```vue
<template>
  <a-form-item label="登录密码" name="password" :rules="passwordRules">
    <a-input-password
      v-model:value="form.password"
      :maxlength="72"
      :placeholder="passwordPlaceholder"
    />
  </a-form-item>
</template>

<script setup lang="ts">
import { usePasswordPolicy } from '@/composables/usePasswordPolicy'

const { passwordRules, passwordPlaceholder } = usePasswordPolicy({
  required: true,
  fieldLabel: '登录密码',
})
</script>
```

---

## 二、展示层组件（Components）

### 1. `<EllipsisText />`（单行超长文本截断与 Tooltip）

解决表格单元格中超长文字撑乱表格、省略样式繁琐的问题。当内容为“暂未分配”时，自动应用弱灰视觉样式，保持界面整洁。

#### Props

| 属性名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `text` | `string \| number \| null` | `''` | 要展示的文本内容 |
| `maxWidth` | `string \| number` | `'180px'` | 最大宽度限制（可传数字如 `200` 或 CSS 宽度字符串） |
| `tooltip` | `boolean` | `true` | 是否启用悬浮 Tooltip 完整展示 |
| `placeholder` | `string` | `'—'` | 内容为空时的替代占位文本 |
| `mutedKeyword` | `string` | `'暂未分配'` | 需要弱灰显示的特殊关键字 |

#### 使用示例

```vue
<template>
  <!-- 在表格 bodyCell 中使用 -->
  <EllipsisText
    v-if="column.key === 'organizationNames'"
    :text="record.organizationNames"
    max-width="160px"
  />
</template>

<script setup lang="ts">
import EllipsisText from '@/components/EllipsisText.vue'
</script>
```

---

### 2. `<StatusTag />`（统一状态标签）

统一处理启用/停用、锁定/正常等高频状态标签的样式、图标与文案。

#### Props

| 属性名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `value` | `boolean \| number \| string` | `undefined` | 状态值（`true/false` 或 `1/0`） |
| `type` | `'enabled' \| 'locked' \| 'custom'` | `'enabled'` | 状态语义类型 |
| `activeText` | `string` | `''` | 启用/激活状态下的自定义文案 |
| `inactiveText` | `string` | `''` | 停用/非激活状态下的自定义文案 |

#### 使用示例

```vue
<template>
  <!-- 启用状态：true/1 显示绿标“启用”，false/0 显示红标“停用” -->
  <StatusTag :value="record.enabled" type="enabled" />

  <!-- 安全锁定：true 显示黄标带锁“已锁定”，false 显示普通灰色“正常” -->
  <StatusTag :value="record.locked" type="locked" />
</template>

<script setup lang="ts">
import StatusTag from '@/components/StatusTag.vue'
</script>
```

---

## 三、通用工具类（Utils）

### 1. `src/utils/format.ts`

- **`formatDateTime(val)`**: 标准化时间格式化，输出 `YYYY-MM-DD HH:mm:ss`，自动处理 ISO 8601 中的 `T`、毫秒与时区偏移，空值安全回退 `—`。
- **`formatDate(val)`**: 输出 `YYYY-MM-DD`。

### 2. `src/utils/confirm.ts`

- **`confirmAction(options)`**: 统一标准的 `Modal.confirm` 弹窗。
  - `options`: `{ title, content, okText?, okType?: 'primary' | 'danger', onOk }`
  - 避免每次在组件内手动拼装冗余配置。

```typescript
import { confirmAction } from '@/utils/confirm'

confirmAction({
  title: '确认删除用户',
  content: `确定要删除用户【${record.userName}】吗？此操作不可逆。`,
  okType: 'danger',
  onOk: async () => {
    await deleteUser(record.id)
    message.success('删除成功')
    await refreshAfterDelete()
  },
})
```

---

## 四、新管理页面标准极简模板（Boilerplate）

基于上述基础设施，开发一个典型的 Dense Utility 管理页面只需要约 **80~120 行代码**：

```vue
<template>
  <section class="my-page">
    <div class="du-panel">
      <!-- 搜索栏 -->
      <header class="page-toolbar">
        <div class="filters">
          <a-input v-model:value="query.keyword" placeholder="搜索关键字" allow-clear @press-enter="handleSearch" />
          <a-button type="primary" @click="handleSearch"><SearchOutlined />查询</a-button>
          <a-button @click="resetSearch"><ReloadOutlined />重置</a-button>
        </div>
        <div class="toolbar-actions">
          <a-button v-if="canWrite" type="primary" @click="openCreate"><PlusOutlined />新增</a-button>
        </div>
      </header>

      <!-- 表格 -->
      <a-table
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="small"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <EllipsisText v-if="column.key === 'description'" :text="record.description" />
          <StatusTag v-else-if="column.key === 'enabled'" :value="record.enabled" />
          <span v-else-if="column.key === 'createTime'" class="du-mono">{{ formatDateTime(record.createTime) }}</span>
          <div v-else-if="column.key === 'actions'" class="row-actions">
            <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
            <a-button type="link" size="small" danger @click="handleDelete(record)">删除</a-button>
          </div>
        </template>
      </a-table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { useTablePagination } from '@/composables/useTablePagination'
import { formatDateTime } from '@/utils/format'
import { confirmAction } from '@/utils/confirm'
import EllipsisText from '@/components/EllipsisText.vue'
import StatusTag from '@/components/StatusTag.vue'
import { menusStore } from '@/stores/modules/user'

const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path))

// 1. 一行接入分页查询
const {
  loading,
  records,
  query,
  pagination,
  handleSearch,
  resetSearch,
  handleTableChange,
  refreshAfterDelete,
} = useTablePagination(fetchListApi, { current: 1, size: 10, keyword: '' }, { immediate: true })

// 2. 删除操作
const handleDelete = (record: any) => {
  confirmAction({
    title: '确认删除',
    content: `确定要删除【${record.name}】吗？`,
    okType: 'danger',
    onOk: async () => {
      await deleteApi(record.id)
      message.success('删除成功')
      await refreshAfterDelete()
    },
  })
}
</script>
```
