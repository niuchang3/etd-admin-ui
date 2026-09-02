# ETD Admin UI 开发约定

本文件是本仓库的 AI 开发指令。先理解现有实现和用户本次目标，再行动；不要把通用最佳实践凌驾于已经确定的业务契约之上。

## 1. 项目定位

- 这是 Vue 3 + TypeScript + Vite + Pinia + Ant Design Vue 的后台管理前端。
- 界面语言为简体中文，视觉风格为 Dense Utility：高信息密度、紧凑、扁平、强功能导向。
- 主要业务位于 `src/views`，接口与 DTO 位于 `src/apis`，跨页面状态位于 `src/stores`，通用请求逻辑位于 `src/utils/Request.ts`。
- `README.md` 记录启动方式、目录职责和登录流程；涉及这些内容时先阅读对应章节。

## 2. 先判断用户要什么

- 用户要求解释、检查、评审或定位原因时，以只读调查和结论为主，不自动修改代码。
- 用户要求实现、修改或修复时，完成必要代码、相关类型和适度验证，不只给建议或代码片段。
- 需求不完整时，先检查相邻页面、现有 API 类型、路由和 Git 历史。只有缺失信息会实质改变业务结果时才询问用户。
- 不凭空发明后端接口、字段、枚举或权限语义。没有可靠契约时，明确指出假设或等待确认。
- 修改前执行 `git status --short`。用户已有改动必须保留，不回滚、不覆盖、不顺手格式化无关文件。

## 3. 实现路径

### 新增或修改管理页面

1. 先阅读同类页面，优先复用已经验证的查询、分页、表单、状态切换和反馈模式。
2. 优先检查并复用 `src/components` 下的已有公共组件（如 `EllipsisText`、`StatusTag`、`DictTag`、`DictSelect` 等）以及 `src/composables` 通用 Hook。没有可直接复用的已有组件时，优先使用 Ant Design Vue 原生标准组件；确认存在跨页面通用价值时才考虑新建公共组件。
3. 在 `src/apis/<domain>/<module>/type.ts` 定义响应对象、查询参数和保存 DTO，在同目录 `index.ts` 封装接口。
4. 页面放在 `src/views/<domain>/<module>/index.vue`。只有真正跨页面通用的展示与工具组件才提取到 `src/components`、`src/utils` 或 Store。
5. **模块私有子组件规范**：当单页面复杂度较高、包含多个独立弹窗/抽屉/复杂侧栏（单文件预估超过 500 行）时，允许且推荐在同级目录建立 `src/views/<domain>/<module>/components/` 存放**模块专属私有子组件**（如 `UserCreateModal.vue`、`UserRoleModal.vue`、`TenantMenuDrawer.vue` 等）：
   - 私有子组件必须严格归属本业务模块，禁止被其他跨业务模块 `import`；
   - 严禁将特定业务模块专属的弹窗或表单提升到全局 `src/components/`；
   - 保持标准的单向数据流（使用 `Props` 入参和 `Emit` 事件回调，如 `v-model:open` 和 `@success`），内部表单状态与校验规则就地闭包，主页面仅负责状态编排与数据刷新；
   - 简单页面（常规单一弹窗、体量适中）保持在 `index.vue` 内联维护，避免过度碎片化。
6. 页面通常由查询区、紧凑表格、分页、新增/编辑弹窗及必要的确认交互组成；应同时覆盖 loading、空数据、成功反馈和异常恢复。
7. 编辑前需要完整或最新数据时，重新请求详情，不默认相信列表行包含全部字段。
8. 保存、删除、启停成功后刷新受影响的数据；请求中的按钮或控件必须有独立 loading 状态，并在 `finally` 中复位。

### 函数、组件与变量命名规范（契合国内 B 端工程习惯）

- **杜绝外来翻译腔与随意发挥**：严禁把西方开源社区或函数式流行习惯（如 `retrieveRecords`、`fetchData`、`mutate`、`onDismiss`、`isDialogOpen`、`filterParams`、`*Sheet.vue`）带入项目。所有命名必须严格遵循国内成熟 B 端后台管理系统（Spring Boot + Vue 3 / Ant Design Vue）高度统一的工程直觉与思维模型。
- **就地取材（Context-First）**：新增任何代码前，必须先看同业务域或系统管理（如 `src/views/system/users`、`src/views/tenant`）中最接近的既有页面与组件，**函数动词、变量名、组件命名模式必须 100% 沿用既有代码模式**。
- **组件与文件命名规范（严格公式：`{实体}{动作/语义}{容器类型}.vue`）**：
  - 弹窗统一用 `*Modal.vue`（例如 `UserCreateModal.vue`、`TenantFormModal.vue`、`UserRoleModal.vue`；严禁使用 `*Dialog.vue`、`*Sheet.vue`、`*Window.vue`）。
  - 抽屉统一用 `*Drawer.vue`（例如 `TenantMenuDrawer.vue`、`UserDetailDrawer.vue`）。
  - 侧边栏统一用 `*Sidebar.vue`（例如 `UserOrgSidebar.vue`）。
  - 页面主入口统一用 `index.vue`。
  - 严禁生造抽象或模糊后缀（例如严禁使用 `*Editor.vue`（除非纯富文本编辑器）、`*Viewer.vue`、`*Wrapper.vue`、`*Box.vue`）。
- **函数与事件命名规范（标准动作动词）**：
  - 分页与数据查询：统一使用 `getList()`、`getPage()` 或复用 Hook 的 `loadData`（接口函数命名如 `getUserPage`、`getTenantList`；严禁使用 `retrieveData`、`fetchData`、`query`、`mutate`）。
  - 搜索与重置事件：统一使用 `handleSearch()`、`handleReset()`（或 `resetSearch`）。
  - 弹窗打开方法：统一使用 `handleAdd()`、`handleEdit(record)`、`handleView(record)`（或语义明确的 `openCreate`、`openEdit`）。
  - 弹窗确认与关闭：提交确认统一用 `handleOk()` 或 `handleSubmit()`；取消关闭统一用 `handleCancel()` 或 `handleClose()`（严禁使用 `onDismiss`、`onConfirm`、`toggleOpen`）。
  - 表格操作与状态流转：单项删除统一用 `handleDelete(id)`，批量删除用 `handleBatchDelete()`，状态启停用 `handleStatusChange(record)` 或 `handleToggleStatus(record)`，导出/导入用 `handleExport()` / `handleImport()`。
- **响应式变量与状态命名规范**：
  - 表格数据集合：优先复用 Hook 的 `records`，或命名为 `tableData` / `dataList`（严禁使用 `entities`、`items`、`recordsList`）。
  - 分页总数：统一命名为 `total`。
  - 查询参数：统一命名为 `query` 或 `queryParams` / `searchForm`（严禁使用 `filterParams`、`queryFilter`）。
  - 表单数据：弹窗内部统一命名为 `formData` 或 `formState`，表单实例引用统一命名为 `formRef`。
  - 弹窗显隐与编辑态：显隐使用 `open`（配合 Antd v-model:open）或 `visible`，编辑态标记使用 `isEdit`（严禁使用 `isDialogOpen`、`sheetVisible`）。
  - 表格勾选行集合：统一命名为 `selectedRowKeys`。
  - 加载态：通用列表使用 `loading`，保存提交使用 `submitLoading` 或 `confirmLoading`，行级别操作使用 `{action}LoadingId`（如 `deletingId`、`statusChangingId`；严禁使用 `isSubmitting`、`isFetching`、`inProgress`）。
- **业务领域词汇缩写规范（严格对齐 Java/Spring 后端及国内习惯）**：
  - 部门/组织机构：`dept` 或 `org`（`organization`）（严禁使用 `group`、`team`、`division`）。
  - 租户：`tenant`（严禁使用 `workspace`、`org` 当租户）。
  - 字典/字典项：`dict`、`dictType`、`dictData` / `dictItem`（严禁使用 `lookup`、`enumeration`、`codebook`）。
  - 角色/岗位：`role`、`post`。
  - 启停状态：`status` 或 `enabled`（严禁使用 `isActive`、`isArchived`）。
  - 安全锁定：`locked`。
  - 系统内置/保留：`builtIn`（严禁使用 `immutable`、`systemProtected`）。

### 接口调用

- 所有业务请求经 `src/utils/Request.ts` 发出，不在页面新建 Axios 实例，不重复实现 Token、租户头、刷新令牌和通用错误提示。
- 后端统一返回 `ResultModel<T>`；请求工具返回该响应包裹，业务数据位于 `response.data`。分页数据为 `PageResult<T>`。
- 后端 Long ID 在前端始终使用 `string` 或公共 `Id` 类型。禁止转成 `number`，避免精度丢失。
- 查询参数使用 `current`、`size`；执行新搜索或重置筛选时将 `current` 设为 `1`。
- 新增/编辑发送明确的保存 DTO。状态由独立 PATCH 接口维护时，不把状态混入保存 DTO。
- 字符串路径参数按需要使用 `encodeURIComponent`。不要手工拼接查询字符串。
- 通用失败消息已由请求拦截器处理。页面只补充拦截器无法表达的业务结果，避免同一错误重复提示。

### 字典翻译与业务值判断

- 严禁在代码中使用中文文本或中文名称判断业务状态、类型、角色、权限等字段值（例如禁止使用 `role.roleName === '管理员'` 或 `status === '启用'` 进行逻辑分支判断）。所有业务逻辑判断必须严格基于后端的标准编码、枚举值或字典值。
- 若遇到缺少标准编码、仅有中文显示名或判断依据不明确的情况，严禁自行根据中文做分支判断或私自猜测，必须主动向用户确认：该字段的标准值/后端编码是什么？是否为系统字典项？待用户明确判断并提供标准值或确定新增字典后，再继续编写后续逻辑。
- 后端返回的编码、枚举、类型或状态等字段，只要页面需要将其翻译成人类可读文本，就必须从系统字典获取，不在页面、组件或工具函数中硬编码中文映射。
- 接入前先检查现有字典。存在相同语义的字典时必须优先复用，不因字段名不同重复创建近义字典。
- 页面查询启用字典项时复用 `src/apis/upms/dict` 中的 `getEnabledDictData(typeCode)`；通用字典加载或缓存能力存在时优先复用，不在多个页面重复实现。
- 字典值是后端原始编码，字典标签用于界面展示；提交表单和发送查询条件时仍传原始编码，不传翻译后的标签。
- 现有字典无法表达该业务语义时，可以先按约定的字典类型编码完成前端接入，但不得用临时硬编码映射兜底。
- 新字典缺失时，完成代码后必须在最终交付中明确提醒服务端补充初始化语句，并列出字典类型编码、类型名称以及每个字典项的编码、标签、值和排序，确保服务端能够直接据此初始化。
- 无法确认应复用哪个现有字典或无法确定新字典的编码和值时，不自行猜测，向用户或服务端确认。

### 菜单、路由与权限

- 侧边栏和页面路由来自当前用户菜单，不新增静态业务菜单。
- `menuPath` 是浏览器访问路径；`menuRouter` 是 Vue 组件地址，例如 `@/views/system/roles/index.vue`。新增页面时保证文件路径与后端菜单配置一致。
- 动态路由、租户切换和菜单树逻辑集中在 `src/router/index.ts` 与 `src/stores/modules/user.ts`；修改前必须理解登录和租户初始化顺序。
- 页面读写权限统一使用 `menusStore().canWritePath(route.path)` 等现有权限工具，不自行解释 `accessLevel`。
- 所有写入口都要受权限控制：模板隐藏或禁用按钮，事件处理函数也再次拦截。只隐藏按钮不算完整权限处理。
- `builtIn` 数据视为系统维护的只读数据。编辑、删除、启停、授权等写入口同时在 UI 层和事件层禁止，除非后端契约明确允许某项操作。
- 删除、清空、覆盖授权等不可逆操作必须使用明确的二次确认，并说明可能影响。

### 系统常量与枚举规范

- 严禁在页面、组件、Store 或请求工具中直接散落硬编码 Magic String / Magic Number（例如数据权限类型 `'5'`、HTTP 请求头 `'TENANT-CODE'`、Cookie 键名 `'accessToken'`、状态数值 `1`/`0`、内置管理员角色编码 `'platformadmin'`、菜单类型 `'MENU'` 等）。
- 所有跨模块通用常量、HTTP 头名称、缓存键名、受保护编码及业务状态必须统一在 `src/constant/` 中维护和导出（例如 `HTTP_HEADER`、`AUTH_TOKEN_KEY`、`ROLE_PERMISSION_TYPE`、`SYSTEM_ROLE_CODE`、`COMMON_STATUS`、`MENU_TYPE` 等）。
- 涉及相关业务判断与接口传参时，必须优先导入并引用 `src/constant/` 下的常量或 `src/apis` 的官方枚举，禁止直接手写字符串字面量。
- 新增涉及跨模块的常量时，统一在 `src/constant/` 补充并附带清晰的注释与类型导出，不私自造轮子或零散硬编码。

## 4. UI 与交互

- 优先检查并复用 `src/components` 中的已有展示组件（如 `EllipsisText`、`StatusTag`、`DictTag`、`DictSelect` 等）与 Ant Design Vue 现有原生组件及 `@ant-design/icons-vue`，不引入另一套组件库；在确认已有组件无法满足时再考虑新增。
- 使用 `src/assets/css/tokens.css` 中的 `--du-*` 变量；不要在业务页面重新发明主色、状态色、圆角和间距体系。
- 保持 32px 控件、小表格、弱阴影、小圆角和高密度布局。新增页面应先对照 `src/views/system` 下最接近的页面。
- **表格行高与排版等高规范（Dense Utility 基准）**：
  - **标准行高统一为 40px**：全站所有业务表格必须使用 `size="small"`，表头行（`thead > tr > th`）与数据行（`tbody > tr > td`）高度统一锁定为 `--du-table-row-height: 40px`。
  - **全表行高绝对齐平**：同一表格内的所有数据行必须保持严格一致的高度，严禁因某一行数据内容较多而忽高忽低。
  - **杜绝行高被撑开的三大纪律**：
    1. **长文本必须单行截断**：文本类列过长时必须统一使用 `EllipsisText` 组件或 CSS 单行省略，严禁文字折行撑高单元格；
    2. **操作按钮统一尺寸**：操作列一律使用 `<a-button type="link" size="small">`，容器使用 `display: flex; align-items: center; justify-content: flex-end;` 垂直居中，禁止混入默认 32px 尺寸按钮撑破行高；
    3. **行内控件高度受控**：单元格内的 `StatusTag`、`DictTag`、`a-tag`、`a-avatar`（如 24px）或 `a-switch`（建议 `size="small"`）必须垂直居中且清除多余上下 margin，控件外轮廓总高度不得超过 24px。
- 表格使用稳定的字符串 `row-key="id"`，操作列保持紧凑；代码、键名、路由和 ID 等数据型文本使用等宽字体。
- **全局排版与字号阶梯规范（严禁各自为战与手写非标字号）**：
  - **字体族统一**：正文统一使用 `var(--du-font-sans)`，编码、路由、哈希及数据字段统一使用 `var(--du-font-mono)` 或 `.du-mono` 类名，严禁生造外来字体族。
  - **五级标准字号 Token（严禁低于 11px）**：
    1. `--du-font-size-xs: 11px`：辅助微小字。用于等宽代码字段（`code-value`）、创建时间、只读标记（`readonly-label`）、次要标签。**全站绝对禁止使用低于 11px 的不可读微型字（如 9px、10px）**；
    2. `--du-font-size-sm: 12px`：紧凑辅助字。用于表格操作列按钮文本、分区小标题、侧边栏子菜单、表单提示文本；
    3. `--du-font-size-base: 13px`：系统正文基准。全站主要数据文本、输入框内容、标准表格数据主字段；
    4. `--du-font-size-md: 14px`：卡片与弹窗标题。用于 Modal 标题、Panel 面板头部；
    5. `--du-font-size-lg: 16px`：主页面大标题。
  - **标准字重阶梯**：统一使用 400（常规）、500（中等）、600（半粗）、700（粗体），严禁使用如 `650` 等非标字重。
- 表单必须有与后端约束一致的必填、长度、范围和条件校验。提交前 trim 文本，并将可选空字符串按接口契约转换为 `null` 或省略。
- 只读权限下仍应允许查看、查询和分页，但不能出现可触发写请求的交互。
- 成功提示使用中文并说明具体动作；危险操作用 `a-popconfirm` 或明确的确认弹窗。
- 样式默认放在组件的 `<style scoped>` 中；只有跨页面通用规则才进入全局 CSS。

## 5. TypeScript 与代码组织

- 使用 `<script setup lang="ts">`、Composition API 和 `@/` 别名。
- 遵守严格类型检查，不用 `any` 逃避可建模的业务类型，不用 `@ts-ignore` 掩盖问题。
- 接口类型使用 `import type`。后端字段名、枚举值和空值语义保持原样，不在 UI 层偷偷改契约。
- 优先使用小而明确的函数和计算属性；不要为了单页逻辑创建无必要的抽象、Store 或通用组件。
- 注释说明业务原因、接口限制或不直观的防御逻辑，不复述代码表面行为。
- 遵循 `.prettierrc.js` 和当前文件风格。不要对未涉及的旧文件做全量格式化。
- 除非任务确有需要且用户同意，不新增依赖，不手改 `package-lock.json`。

## 6. 核心链路不可随意改变

- 登录顺序为：获取 Token → 获取租户列表 → 选择有效租户 → 获取用户信息、角色和菜单 → 注册动态路由。
- 请求头中的 `Authorization` 与 `TENANT-CODE` 由请求层统一注入。
- 切换租户时必须清理旧菜单和用户状态，再加载新租户数据；不得保留旧租户动态路由或权限。
- 401 刷新令牌必须防止并发重复刷新；登录接口的 401 不触发刷新。
- 菜单树需容忍重复 ID、缺失父级和循环关系，不得因异常数据让整个应用崩溃。

## 7. 完成标准

- 检查变更范围，确认没有混入用户已有改动或无关重构。
- 至少运行 `npm run build`；它同时执行 Vue/TypeScript 类型检查和生产构建。
- 本项目当前没有 lint 和自动测试脚本，不要声称运行过不存在的检查。高风险纯逻辑改动应补充可执行测试基础后再加测试，或明确说明手工验证项。
- 若构建失败，区分本次引入的问题和原有问题；修复本次问题，不擅自扩大范围处理无关缺陷。
- 最终说明做了什么、验证结果和仍需用户或后端确认的事项，保持简洁。
