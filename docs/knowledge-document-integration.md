# 知识库资料管理接入信息

保留现有“知识库分类”页面。新页面通过现有动态菜单注册机制加载，不添加静态业务路由，不提供菜单初始化 SQL，不指定数据库 ID。

## 菜单信息

| 字段 | 值 |
| --- | --- |
| 菜单名称 | 知识库 |
| 父级菜单名称 / 路径 | AI管理 / `/ai`（与现有知识库分类同级） |
| menu_path | `/ai/knowledge-documents` |
| menu_router | `@/views/ai/knowledge-document/index.vue` |
| menu_icon | `FileTextOutlined`（现有图标注册表支持） |
| menu_type | `MENU` |
| sort | `40` |
| permission_code | `ai:knowledge-document` |

配置、移动、上传、正文预览均使用模块私有弹窗或抽屉，无详情页等隐藏路由；继承当前知识库菜单权限。

- `ai:knowledge-document:read`：目录导航、名称搜索、上传/处理状态筛选、资料分页、详情及上传进度、模型选项、上传策略、正文分片分页预览、临时地址下载（POST 也属于 read）。
- `ai:knowledge-document:write`：初始化上传、分片地址申请/上传/回执确认、暂停本地传输、摘要核验续传、失败分片重试、合并、取消会话、保存配置、移动、删除、解析、确认正文并建立索引。写入口同时检查当前菜单 canWrite；内置资料禁止写操作。上传/移入目标要求非 navigationOnly、writable 且未停用。

页面仅使用 `/ai/api/v1/knowledge-documents/folders` 和 `/ai/api/v1/knowledge-documents/model-options`，不依赖分类维护或模型广场菜单。

## 服务端字典初始化

以下三个类型编码已经用户确认。请服务端补充初始化语句并启用这些字典及字典项。前端通过现有系统字典 Hook 加载，没有中文硬编码映射；字典未初始化时显示原始编码，筛选和检索方式选项需字典就绪后可用。

| 字典类型编码 | 类型名称 | 字典项编码 dictCode | 标签 dictLabel | 值 dictValue | 排序 sort |
| --- | --- | --- | --- | --- | --- |
| ai_knowledge_upload_status | 知识资料上传状态 | INITIALIZING | 初始化中 | initializing | 10 |
| ai_knowledge_upload_status | 知识资料上传状态 | UPLOADING | 上传中 | uploading | 20 |
| ai_knowledge_upload_status | 知识资料上传状态 | COMPLETING | 合并校验中 | completing | 30 |
| ai_knowledge_upload_status | 知识资料上传状态 | COMPLETED | 上传完成 | completed | 40 |
| ai_knowledge_upload_status | 知识资料上传状态 | FAILED | 上传失败 | failed | 50 |
| ai_knowledge_upload_status | 知识资料上传状态 | CANCELLED | 已取消 | cancelled | 60 |
| ai_knowledge_processing_status | 知识资料处理状态 | UPLOADED | 未处理 | uploaded | 10 |
| ai_knowledge_processing_status | 知识资料处理状态 | PENDING | 待处理 | pending | 20 |
| ai_knowledge_processing_status | 知识资料处理状态 | PARSING | 解析中 | parsing | 30 |
| ai_knowledge_processing_status | 知识资料处理状态 | PREVIEW | 待确认分片 | preview | 40 |
| ai_knowledge_processing_status | 知识资料处理状态 | EMBEDDING | 索引处理中 | embedding | 50 |
| ai_knowledge_processing_status | 知识资料处理状态 | READY | 可检索 | ready | 60 |
| ai_knowledge_processing_status | 知识资料处理状态 | FAILED | 处理失败 | failed | 70 |
| ai_knowledge_retrieval_mode | 知识资料检索方式 | KEYWORD | 全文检索 | keyword | 10 |
| ai_knowledge_retrieval_mode | 知识资料检索方式 | VECTOR | 向量检索 | vector | 20 |
| ai_knowledge_retrieval_mode | 知识资料检索方式 | HYBRID | 混合检索 | hybrid | 30 |

## 上传与处理行为

- 文件选择器 accept 仅来自 UPMS `GET /upms/api/v1/config/values?parameterKeys=ai.knowledge.upload` 返回 JSON 的 allowedExtensions；参数异常时提示并取消选择器筛选，不内置文件格式列表，不在浏览器按扩展名阻止上传。
- 上传前读取服务端策略；归属部门默认选中目录所属部门，可从有维护权限的目录部门 ID 中选择。续传保留资料原归属部门；移动只改 folderId，保留详情中的其他配置。
- SHA-256 在 Worker 内按 4 MiB 读取窗口增量计算；读取窗口与上传分片大小无关。上传切片始终按资料详情 partSizeBytes / partCount，分片编号从 1 开始，最多两片并发，每片最多尝试三次，每次重试重新申请地址。
- MinIO PUT 使用原生 fetch、credentials=omit，不使用业务响应解包、不注入 JWT。PUT 响应 ETag 原样传给回执确认接口。暂停终止 Worker 和本地 PUT，保留服务端已确认分片；取消会话需二次确认。刷新页面后从资料续传入口重新选择文件并核对摘要。
- 初始化响应丢失且没有取得资料 ID 时，不允许在当前弹窗直接重复创建，提示先刷新列表检查是否已经初始化。
- 合并、解析、确认使用独立 300 秒超时，显式长超时不被全局默认策略覆盖。失败或超时后先查询详情，不自动重新解析、重新确认或重新初始化；处理中的资料定时刷新状态。状态无法确认时阻止继续处理，允许手动刷新。
- 正文仅通过 Vue 文本插值展示，无 v-html。全文模式确认由后端建立全文索引，不选择或调用向量连接器；其他模式校验连接器和该连接器返回的维度，不自动替换失效模型。
- 所有业务 ID 保留字符串。时间直接展示后端字符串，不做时区或小时偏移。

## 验证与部署联调

本地可运行：

```sh
npm run build
node --test tests/knowledge-document.test.mjs
```

自动化测试覆盖增量摘要、Worker 有界读取、目录异常父链及 Long ID、移动 DTO、已确认分片跳过、并发限制、过期地址重试、精确切片、ETag/CORS 缺失、暂停、权限撤销及显式长超时优先级。测试使用本地请求替身，不代表真实服务联调。

部署前完成菜单、系统参数和字典初始化，并确认 MinIO CORS 允许页面来源 PUT、暴露 ETag；AI 代理和网关应允许长请求。需要使用真实租户验证：只读用户下载/预览、跨部门权限、navigationOnly 目录、断网/刷新后续传、会话取消/过期、超时后详情恢复、keyword/vector/hybrid 处理、连接器删除，以及实际文件解析兼容性。
