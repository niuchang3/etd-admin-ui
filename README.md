# ETD Admin UI

这是一个使用 Vue 3、TypeScript、Vite、Pinia 和 Ant Design Vue 构建的后台管理项目。界面采用 Dense Utility（高信息密度、强功能导向）风格。

这份文档主要帮助刚接触前端的开发者理解：项目怎么启动、每个目录做什么、配置文件有什么作用，以及登录流程如何运行。

## 一、快速启动

首次拉取项目后，在项目根目录执行：

```bash
# 安装 package.json 中声明的依赖
npm install

# 启动本地开发服务器
npm run dev
```

默认开发地址由 `.env.development` 中的 `VITE_SERVER_PORT` 决定，目前为 `http://localhost:7000`。

常用命令：

```bash
# 启动开发环境，修改源码后页面会自动更新
npm run dev

# 先执行 TypeScript 类型检查，再生成生产文件到 dist 目录
npm run build

# 在本地预览 dist 中的生产构建结果
npm run preview
```

## 二、项目目录

```text
etd-admin-ui/
├── src/                       # 项目主要源代码
│   ├── apis/                  # 后端接口函数和接口数据类型
│   ├── assets/css/            # 全局样式、设计变量和样式重置
│   ├── components/            # 可复用组件，按 layout、ui、data、dashboard 分层
│   ├── config/                # 导航等全局界面配置
│   ├── constant/              # 跨模块使用的常量
│   ├── router/                # 页面路由和登录访问控制
│   ├── stores/                # Pinia 全局状态
│   ├── utils/                 # 请求、缓存等工具代码
│   ├── views/                 # 登录页、运营总览和各业务路由页面
│   ├── App.vue                # Vue 根组件和 Ant Design 全局主题
│   └── main.ts                # 应用启动入口
├── .env                       # 所有模式共享的环境变量
├── .env.development           # 本地开发环境变量
├── index.html                 # 浏览器加载的 HTML 入口
├── package.json               # npm 命令和项目依赖清单
├── tsconfig.json              # 浏览器端 TypeScript 配置
├── tsconfig.node.json         # Vite 配置文件的 TypeScript 配置
└── vite.config.ts             # Vite、路径别名和开发代理配置
```

## 三、Vue 文件的三个区域

项目中的 `.vue` 文件通常包含三个部分：

```vue
<template>
  <!-- 页面最终显示的 HTML 结构 -->
</template>

<script setup lang="ts">
// 页面数据、事件、接口调用和 TypeScript 类型
</script>

<style scoped>
/* 当前组件自己的样式；scoped 表示样式不会轻易影响其他组件 */
</style>
```

- `template` 决定“页面上有什么”。
- `script` 决定“数据从哪里来、点击以后做什么”。
- `style` 决定“页面长什么样”。

## 四、配置文件说明

### `package.json`

这是 npm 的项目清单。它是严格 JSON 格式，因此不能直接添加注释。

主要字段：

- `name`：项目名称。
- `private: true`：禁止误操作发布到 npm 公共仓库。
- `type: module`：项目配置文件使用 ES Module 的 `import/export` 语法。
- `scripts`：`npm run dev` 等命令的实际内容。
- `dependencies`：页面运行时需要的依赖。
- `devDependencies`：开发、类型检查和构建时需要的依赖。

主要运行依赖：

| 依赖 | 用途 |
|---|---|
| `vue` | 构建组件和响应式页面 |
| `vue-router` | 在登录页、运营总览和业务模块之间切换 |
| `pinia` | 保存用户、租户、菜单等全局状态 |
| `pinia-plugin-persistedstate` | 将部分 Pinia 状态保存到浏览器缓存 |
| `ant-design-vue` | 按钮、表单、表格、下拉菜单等 UI 组件 |
| `axios` | 向后端发送 HTTP 请求 |
| `qs` | 将查询参数转换为 URL 参数字符串 |
| `vue3-cookies` | 读取和写入 Token Cookie |
| `nprogress` | 页面加载进度条 |
| `lodash` | 常用数据处理工具函数 |

主要开发依赖：

| 依赖 | 用途 |
|---|---|
| `vite` | 开发服务器和生产构建工具 |
| `typescript` | JavaScript 的静态类型系统 |
| `vue-tsc` | 对 `.vue` 文件执行 TypeScript 类型检查 |
| `@vitejs/plugin-vue` | 让 Vite 能够编译 Vue 文件 |
| `sass` | 编译 SCSS 样式 |
| `@types/*` | 为部分 JavaScript 包补充 TypeScript 类型 |

`package-lock.json` 是 npm 自动生成的精确依赖版本锁定文件，也不能写注释。通常不要手工编辑它，执行 `npm install` 时 npm 会自动维护。

### `vite.config.ts`

Vite 负责两件主要工作：开发时启动本地服务器和热更新；发布前把 Vue、TypeScript 和 CSS 打包成浏览器可运行的静态文件。

当前配置还定义了：

- `@` 指向 `src`，所以 `@/components` 等价于从 `src/components` 导入。
- 开发服务器端口来自环境变量。
- `/upms/api` 请求在开发环境中会被代理到本地后端。
- `base: './'` 让构建后的资源使用相对路径。

### `tsconfig.json`

这是 TypeScript 的浏览器端配置。项目启用了严格类型检查，包括：

- 不允许未使用的变量和参数。
- 检查可能遗漏的 `switch` 分支处理。
- 只做类型检查，实际 JavaScript 由 Vite 生成。
- 让 TypeScript 同样认识 `@` 路径别名。

### `tsconfig.node.json`

这个文件只负责检查 `vite.config.ts`。Vite 配置运行在 Node.js 中，而 Vue 页面运行在浏览器中，两边能使用的 API 和类型不同。

### `.env` 与 `.env.development`

环境变量用于将“容易变化的地址和端口”移出业务代码：

```dotenv
# Vite 本地服务器端口
VITE_SERVER_PORT=7000

# 前端请求代理前缀
VITE_SERVER_BASE_API="/upms/api"

# 本地后端服务地址
VITE_SERVER_PROXY_TARGET="http://127.0.0.1:8100/"
```

注意事项：

- 前端可读取的变量必须以 `VITE_` 开头。
- 修改环境变量后需要重启 `npm run dev`。
- 密码、私钥等秘密不能放进会打包到浏览器的环境变量。
- `.env.development` 只在开发模式使用。

### `.gitignore`

告诉 Git 哪些文件不需要提交。`node_modules` 可以通过 `npm install` 恢复，`dist` 可以通过 `npm run build` 恢复，所以两者都被忽略。

### `.prettierrc.js`

Prettier 的格式化规则。它只负责缩进、引号、换行和分号等排版，不负责判断业务逻辑是否正确。

### `index.html`

浏览器最先加载的文件。`<div id="app">` 是 Vue 的挂载点，`src/main.ts` 会创建 Vue 应用并将整个页面渲染到这里。

## 五、应用启动过程

```text
index.html
  → src/main.ts
  → 注册 Pinia、Ant Design Vue、Router
  → src/App.vue
  → 根据当前 URL 渲染登录页或管理平台页面
```

`src/main.ts` 引入全局 CSS 的顺序：

1. `reset.css` 清除浏览器默认样式差异。
2. `tokens.css` 定义统一间距、颜色、字体等设计变量。
3. `global.css` 设置项目全局样式和 Ant Design 覆盖规则。
4. Ant Design Vue 自己的基础重置样式。

## 六、登录和租户初始化流程

当前后端要求用户信息请求携带租户 ID，因此登录顺序不能随意调整：

```text
提交账号密码
  → 获取 Access Token 和 Refresh Token
  → 获取当前用户可访问的租户列表
  → 默认选择第一个有效租户
  → Axios 请求头加入 TENANT-CODE: 当前租户 ID
  → 获取当前用户资料
  → 进入运营总览（/dashboard）
```

相关文件：

- `src/views/login/index.vue`：控制完整登录顺序。
- `src/stores/modules/oauth.ts`：保存和刷新 Token。
- `src/stores/modules/user.ts`：保存用户、租户和菜单状态。
- `src/utils/Request.ts`：向所有请求添加 Token 和租户请求头。
- `src/router/index.ts`：阻止未登录用户进入管理平台。

退出系统时会清除 Token、用户、租户、菜单和当前导航状态，然后返回登录页。

## 七、组件分层规则

为了避免完整页面越来越大，当前组件按职责分为四层：

| 目录 | 负责内容 | 示例 |
|---|---|---|
| `src/components/layout` | 整个管理平台共用的布局 | 顶栏、侧栏、页面外壳 |
| `src/components/ui` | 不包含业务含义的基础展示 | 页面标题、面板标题、状态标签、指标卡片 |
| `src/components/data` | 多个业务模块可共用的数据展示 | 筛选栏、数据表格、进度、用户单元格、行操作 |
| `src/components/dashboard` | 运营总览专用但可独立维护的区块 | 指标区、服务健康度、动态列表、配额面板 |

页面目录遵循以下规则：

- `src/views/dashboard/index.vue` 只组合组件，不直接塞入表格列和大量业务细节。
- `src/views/dashboard/components/TaskTable.vue` 保存任务模块自己的筛选、列配置和交互。
- `dashboard.types.ts` 保存业务数据类型，`dashboard.mock.ts` 暂时保存模拟数据。
- 后续接入真实接口时，用接口数据替换 `dashboard.mock.ts`，不需要重写通用组件。
- 如果一个区块会被多个业务页面使用，应移动到 `src/components/data` 或 `src/components/ui`；只在单个页面使用的业务组件留在该页面自己的 `components` 目录。

## 八、样式系统

所有全局设计变量都在 `src/assets/css/tokens.css` 中：

- `--du-space-*`：统一间距，基于 4px 网格。
- `--du-radius-*`：统一圆角。
- `--du-bg-*`：背景颜色。
- `--du-text-*`：文字层级颜色。
- `--du-accent`：主色。
- `--du-positive`、`--du-warning`、`--du-negative`：状态颜色。

新增页面时应优先使用这些变量，不要在每个页面随意创建新的间距和颜色。

## 九、初学者常见问题

### 为什么修改代码后不需要手动刷新？

`npm run dev` 启动的 Vite 支持热模块更新。保存文件后，Vite 会将改动发送给浏览器。

### 为什么接口地址不是完整的后端 URL？

开发环境通过 Vite 代理转发请求。浏览器请求 `/upms/api/...`，Vite 再将请求转给 `.env.development` 中配置的后端地址。

### 为什么刷新页面后用户信息还存在？

Pinia 持久化插件会把指定状态保存到 `localStorage` 或 `sessionStorage`。退出系统时会调用各个 Store 的 `$reset()` 清除这些状态。

### 为什么很多变量后面有 `.value`？

Vue 的 `ref()` 返回响应式对象，在 TypeScript 代码中通过 `.value` 读取或修改；在 Vue 模板中会自动解包，通常不需要写 `.value`。

### `computed()` 是什么？

它表示“根据其他响应式数据自动计算出的值”。依赖变化时结果会自动更新，例如顶部显示名称会根据昵称和账号自动计算。

### `async` 和 `await` 是什么？

接口请求需要等待后端返回。`async` 表示函数包含异步操作，`await` 表示等待这一步完成后再执行下一步。登录流程必须连续使用 `await`，才能确保租户准备完成后再获取用户信息。

## 十、提交代码前检查

建议在提交代码前执行：

```bash
npm run build
```

这个命令会同时检查 Vue/TypeScript 类型并进行生产构建。只有命令成功结束，才说明代码至少通过了当前项目的编译检查。
