# 更新日志（CHANGELOG）

> **① 维护规则（勿删）**
>
> 1. 正文**只保留最近 5 条**代码改动。要写第 6 条时，把最旧那条**整条删除**——不留归档区、不留「历史记录」小节。
> 2. 时间精确到分钟，格式 `YYYY-MM-DD HH:mm`（本地时间）；**最新写在最上面**。
> 3. 一条记录 = 一次代码改动，也可以是一个完整功能点（同一轮需求里改的多处合并成一条）。每条写清三件事：**改了哪些文件 / 改了什么与为什么 / 怎么验证的**。
> 4. 每次改完代码**立即追加**，不攒批。**文档、流程、约定的调整不进正文**，直接改下面这一区。
> 5. 本文件是项目的**唯一**记录处：`.ai-memory/` 已废弃、不要再建，也别另开 daily / decisions 之类的新文件。

> **② 项目约定与已知情况（跨会话记忆，动手前先读这一区）**
>
> - **协作**：中文沟通；个人独立项目。开工前把不明确处问清楚，倾向接受带理由的推荐选项。
> - **文档地位**：`docs/系统设计说明书V8.11.md` 只是参考。与用户要求冲突时**以用户要求为准**，不要把「文档与代码不一致」列为待确认项或阻塞项；实现领先于文档的部分记在下面的「文档待回写」。
> - **后端现状**：8080 上有 Spring Boot（JDK 27），但它对**所有**路径返回 `401 + WWW-Authenticate: Basic`（连 `/api/verify/captcha` 也不例外），**不是可联调状态**。进程活着 ≠ 接口能用；前端请求它会在控制台留下 CORS / ERR_FAILED 两条 error，属预期现象。真实页（任务 / 回收站 / 个人中心 / 后台）会被守卫弹回登录页——那是请求层对 401 清 token 跳登录的**正确行为**，不是前端缺陷。
> - **演示模式口径**：`/demo` 免登录、不请求后端，数据是内置示范数据。写操作（新建 / 编辑 / 删除 / 切换状态，回收站恢复 / 彻底删除 / 清空）都是**内存态真实生效**，删除会真的进演示回收站并沿用同一 id，刷新即还原；个人中心的资料 / 邮箱 / 密码仍只提示不保存。
> - **排版口径**：内容区随窗口自适应 `clamp(880px, 94vw, 1920px)`，左右内边距 `clamp(16px, 2.5vw, 40px)`；**任务优先级只有低 / 中 / 高三档**（无「紧急」）。
> - **设置类页面口径**（个人中心定下）：一行一项——左侧项名、中间**当前值**、右侧动作；表单一律进弹窗（420–460px 定宽），页面上不出现常驻输入框；分组用 `.settings-group`（一张卡 + 发丝线分行），行内动作用 `.row-action`。
> - **踩过的坑（动布局必读）**：使用者的浏览器是**占位型滚动条**，而测试机（macOS Chrome）是悬浮滚动条、**复现不出跳动**。已做两件事：① 根滚动条隐藏（`scrollbar-width: none` + `html::-webkit-scrollbar{width:0}`）+ `scrollbar-gutter: stable` 兜底；② 压掉 Element Plus 锁屏写的行内宽度 `[class*='-parent--hidden']{width:100%!important}`。改布局不要再引入依赖滚动条占位的差异；要验证可注入 `document.body.style.width='calc(100% - 15px)'` 等价模拟。
> - **行版式**：主页 `.task-row`（`TaskItem.vue`）与回收站 `.trash-row`（`TrashItem.vue`）**成对维护**——同 grid 前四列 `26px 1fr 168px`、内边距 16×20、20px 圆角、`--color-surface` 底 + 悬停提亮、标题 15px/500 + 单行描述 14px；回收站操作列 72px（两个图标按钮）、元信息首行是「剩余 N 天」胶囊。
> - **文档待回写**（实现已偏离，等一并更新说明书）：6.5 / 8.5 的两态与单列列表、优先级三档、8.7 的圆角·主题入口·内容宽自适应·滚动条隐藏·「弹窗锁屏不得改 body 宽度」、8.8 位置与主题、UC-05、数据库说明书与 `todone.sql` 注释。
> - **尚未接通**：配图上传链路（本地压缩、拖动排序、`imageOrder` 组装）与头像 1:1 裁剪目前只有占位说明，依赖后端文件接口才能验收。

---

## 2026-10-13 16:05 · 复验「取消后不残留旧文件」（通过）+ 更新后端问题清单

- **文件**：`docs/后端修改说明.md`（按当前实测重写）；代码无改动
- **复验（真实账号，5173）**：新建弹窗选入 600×300 PNG → 槽位 **1**、缩略图 600×300 → **取消** → 可见弹窗 **0** → 点开一条**无配图**任务的编辑 → **配图槽位 0**、空提示正常 ⇒ 上一轮「弹窗重开后旧文件残留」的修复**确认有效**（修复前此处为 1）。全程只取消未落库，账号无污染。
- **问题清单现状**：仍未修的 3 条 —— `/api/admin/**` 未提供；`POST /api/tasks` 的 Swagger 只声明 `application/json`（实测是 multipart `data` + `images`，2 张图落库成功）；`TaskCreateRequest` 缺 `imageOrder`。

## 2026-10-13 15:52 · 任务配图链路接通（本地压缩 / 预览 / 拖动排序 / imageOrder / 上传进度）

- **文件**：新增 `src/utils/image.ts`、`src/components/TaskImageField.vue`；改 `src/components/TaskFormDialog.vue`、`src/stores/todo.ts`、`src/views/TaskListView.vue`（api 层与 `TaskPayload.imageOrder` 早有约定，未改）
- **内容**：选图 → 本地压缩（>1920px 或 >1MB 才重绘、质量 0.85、**GIF 跳过**、本来就小的图不二次有损压缩、透明区先铺白底）→ 缩略图预览（新图带「新」角标）→ HTML5 拖动排序 → 删图。保存时才随任务一起 multipart 上传；`imageOrder` 用「已有图 id / 新图占位 `'NEW'`」表达顺序，**编辑时即使清空也传空数组**（省略会被当成「不动配图」）。上传进度经 store 透传到弹窗显示进度条并禁用提交；单张 >10MB 在选择时即拦。
- **验证**：真实账号（5173，后端 CORS 白名单内）——列表 6 条正常；选入 8.6MB / 2400×1200 的 PNG + 42B GIF → 预览 **1920×960**（已压）与 **1×1**（GIF 未压）；保存时抓到的请求：`POST /api/tasks`，parts = `data`(application/json) + `images=big-2400.jpg`（**1107KB**，image/jpeg）+ `images=anim.gif`（image/gif）；服务端落库 **2 张图**并返回预签名直链。测试任务已彻底删除，stats 回到 **6 / 0**（未污染账号）。
- **验证中抓出并修掉的 bug**：弹窗关闭后仍留在 DOM 里，配图字段的内部状态会活到下一次打开——编辑时把上一次选的旧文件又传了一遍（同一任务服务端图数 2 → **3**）。修法：字段只在 props 变化时按 props 重建，并给组件加 `:key="task?.id + visible"` 保证每次打开都是新实例。
- **未完成（如实记录）**：修复后的回归复验**没做成**——那次演示页测试本身有缺陷（文件选择器没真正挂上文件、且点开的那条演示任务本来就有 2 张配图），结论无效，需补测：新建 → 选图 → 取消 → 再编辑一条无配图的任务，确认配图区为空。

## 2026-10-13 23:20 · 修「进系统就报请求参数不合法」，并核对任务/回收站契约

- **文件**：`src/types/index.ts`（`TaskQuery` 去掉 `sortBy`/`sortDirection`，删除已无人使用的 `TaskSortField`）、`src/stores/todo.ts`、`src/composables/useDemoTasks.ts`
- **内容**：后端 `PageQuery.sortDirection` 带 `@Pattern(regexp = "asc|desc")`，前端却写死大写 `DESC` → 任务列表请求被判 **400「请求参数不合法」**（一进任务页必现）。代码注释本来就写着「界面不再发送 sortBy / sortDirection，顺序由后端固定规则处理」，故按原意把这两个字段从查询里彻底去掉，不改成小写继续传。同时核对了新 Swagger（21 条接口）：任务与回收站相关字段与我方类型**逐项一致**（`TaskVO`/`TrashTaskVO`/`StatsVO`/`PageResult`/`TaskQuery`/`TaskStatusRequest`/`ClearTrashResponse`/`ImageVO`），multipart 的 `data` 段构造（JSON Blob）也正确，这部分无需改码。
- **验证**：`npm run build` EXIT=0；后端源码确认 `@CurrentUserId` 由 SecurityContext 注入（前端不传 `userId` 是对的，Swagger 属误暴露）。**未做真实链路验证**：手头没有可用账号，任务与回收站的成功路径、以及新建任务是否还有独立问题，待拿到测试账号后补测。

## 2026-10-13 03:05 · 接入后端 P0–P3 接口（账号 / 验证码 / 头像）

- **文件**：`vite.config.ts`（删掉已作废的 `/media` 代理，`/api` 指向 8081）；`src/api/auth.ts`（`uploadAvatar` 改为返回 `AvatarVO`）；`src/types/index.ts`（新增 `AvatarVO`）；`src/stores/auth.ts`（头像增删直接用响应结果更新直链，不再回读资料）；`src/api/http.ts`（401 不弹 toast，改为地址栏带 `expired=1` 后整页跳转）；`src/views/LoginView.vue` 与 `src/views/admin/AdminLoginView.vue`（读标记显示常驻失效提示）。
- **内容**：按 `docs/前端修改说明.md` + 8081 的 Swagger 对齐契约。逐条核对**已一致、无需改动**的有：信封 `{code,message,data,timestamp}`、业务失败走 HTTP 200 + `code`、验证码 Base64 无 `data:` 前缀、`resendAfterSeconds`/`expiresInSeconds` 取自响应不写死、失败必换图形码、改密与换邮箱后强制重登、`UpdateProfileRequest` 的「不传=不改、空串=解绑」。后端当前只到 **P3**：任务 / 回收站 / 后台接口尚未提供（P4 待做），对应页面会收到 404。
- **验证**：在 5173（后端 CORS 白名单内）实测——图形码真渲染（120×40）；错图形码提交 → 后端 `4001`「图形验证码错误或已失效」且图形码自动换新；正确图形码 + 不存在账号 → 「邮箱或密码错误」（说明请求体与验证码都被后端接受）；伪造 token 访问 `/profile` → HTTP 401 → 本地 token 被清 + 跳 `/login?redirect=/profile`；`Origin:5173` → 200、`Origin:5174` → 403 实测证实白名单（浏览器 POST 带 Origin、curl 不带，这就是两者结果不同的原因）；`npm run build` EXIT=0。
- **待确认**：401 跳转后的失效提示，直接访问 `?expired=1` 能正常显示，但在强制 401 链路里没出现（跳转与地址栏清理本身都正常）——留待真实过期场景复核。

## 2026-10-13 01:20 · 个人中心重做：行式设置页 + 头像 1:1 裁剪

- **文件**：重写 `src/views/ProfileView.vue`、`src/views/DemoProfileView.vue`；新增 `src/components/profile/` 下的 `SettingRow`、`IdentityRow`、`AvatarCropDialog`、`BasicInfoDialog`、`EmailChangeDialog`、`PasswordChangeDialog`，`AppearanceSettings.vue` 改为行式；删除 `AvatarSection`、`BasicInfoForm`、`ChangeEmailForm`、`ChangePasswordForm`；`src/assets/main.css`（加 `.settings-group` / `.row-action`，删随改版失效的 `.section*` 与 `--reading-width`）；`src/components/icons.ts` 加 camera；`src/stores/auth.ts` 的 `changeEmail` 不再回读资料。
- **内容**：页面从「6 段常驻表单」改为「一行一项」——身份卡（头像 + 名字 + 注册于）、账号组（名字 / 手机号 / 登录邮箱 / 登录密码）、偏好组（外观）、会话组（退出）；表单全部进弹窗，页面上不再有常驻输入框。**逻辑修复**：① 换邮箱成功后清 token 跳登录（原行为与页面文案自相矛盾）；② 资料只提交改动字段、无改动时保存禁用；③ 落地 8.8 要求的头像 1:1 取景框（拖动 / 滚轮 / 滑块 / 方向键，确认后前端裁 512×512 JPEG 上传，含类型与 10MB 拦截）；④ 加载中给骨架、失败给「重新加载」。
- **验证**：页面高 **1883 → 1100**（一屏内）、常驻输入框 **10 → 0**；资料弹窗无改动时保存禁用、非法手机号提交被拦（错误「手机号只能是数字」、弹窗不关）；改密两次不一致被拦；头像走真实文件选择器上传测试图，出图探针读回 **512×512 / image/jpeg(0.92)**，中心像素 `0,170,80`（测试图正中绿块）、左 `220,60,60`（红）、右与上 `60,90,220`（蓝）→ 源区域映射正确；缩放以取景框中心为锚（按 `+` 后 `translate(-180px,-15px) scale(0.825)`，与手算一致）、方向键每次 4px；11MB 文件被拦（「图片超过 10MB，请换一张」、不弹裁剪）；移除头像有二次确认；480 视口下项名移到值上方、动作靠右、无横向溢出；深色下分组底 `rgb(26,26,26)`、描边与分隔线 `rgb(42,42,42)`；`npm run build` EXIT=0；控制台 0 error。
- **说明**：真实 `/profile` 因后端 401 仍会被守卫弹回登录页，其渲染经演示页（同一套组件、同一套传参）验证。
