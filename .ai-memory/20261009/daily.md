session-id: 20261009-2330

# 2026-10-09 工作记录

> 目录名是本次连续开发的起始日（2026-10-09），10-10、10-12 的追加也记在这里，`decisions.md` 同理——保持单一来源，不按天分叉。

## [2026-10-12] 动作: 内容区由固定 880px 改为随窗口自适应

**背景**：使用反馈「左右两侧留白太多」。量测确认 1920 屏上内容仅 880px，左右各空 520px（占屏宽 54%）。

**改动（D40）**
- `main.css`：`--content-width: 880px` → `clamp(880px, 94vw, 1920px)`；新增 `--reading-width: 560px`。
- `.page`：内边距 `40px 24px` → `40px clamp(16px, 2.5vw, 40px)`。
- `.section .el-form`：加 `max-width: var(--reading-width)`——区块占满宽，只有表单字段收住。
- 三处顶栏内层（Default / Demo / AuthShell）内边距同步改 `clamp()`，保证顶栏文字与内容左边缘对齐；AdminLayout 的 `.topbar` 与 `.admin-layout__main` 同步。

**量测（真实浏览器，逐档改视口）**

| 视口 | 内容宽 | 左右留白 | 内边距 | 横向溢出 |
|---|---|---|---|---|
| 2560 | 1920（触上限） | 320 / 320 | 40px | 无 |
| 1920 | 1805 | **58 / 58**（改前 520 / 520） | 40px | 无 |
| 1600 | 1504 | 48 / 48 | 40px | 无 |
| 1440 | 1354 | 43 / 43 | 36px | 无 |
| 1024 | 963 | 31 / 31 | 25.6px | 无 |
| 800 | 800（占满） | 0 / 0 | 20px | 无 |
| 460 | 460（占满） | 0 / 0 | 16px | 无 |

- 对齐：顶栏品牌与页面标题左边缘均为 98px（1920 视口）。
- 任务行：宽 1725px，列分布 26 / 1409 / 168 / 32——中间正文列吸收多余宽度，日期与操作区保持贴右。
- 个人中心：内容 1805px，区块 1725px，**表单 560px**（字段未被拉宽）。
- 后台用户表：宽 1640px、右留白 40px、9 列——表格吃满可用宽度。
- 登录页：表单卡 312px 居中（804/804），窄屏 1000 时仍 312px 居中；头部与内容区同宽。
- `npm run build` EXIT=0。

**顺带查清的一件事**：登录页控制台 2 条 error（CORS + ERR_FAILED）不是前端缺陷——8080 上的 Java 进程对所有路径返回 401 + `WWW-Authenticate: Basic`，`/api/verify/captcha` 被 302 到 `/login` 后跨源被拦。后端 Security 配好即消失。

## [03:00] 动作: 优先级收敛三档 + 演示模式读写全放开

**优先级（需求 1）**
- `types`：`TaskPriority` 去掉 `URGENT`；`constants` 选项/文案/色值映射同步收敛；`main.css` 删掉 `--color-priority-urgent`（浅深两处）。
- 演示数据 4 条「紧急」按分布重排：2 条→高（完成系统设计说明书终稿、排查登录偶发失败）、2 条→中；最终 低 5 / 中 11 / 高 8。

**演示模式放开写操作（需求 2）**
- `mock/demoState.ts`（新）：任务与回收站共用同一份模块级内存态，跨页面共享，刷新即重新克隆。用模块级 ref 而不是 Pinia：演示读写不该混进真实链路的 store。
- `useDemoTasks`：新增 `create` / `update` / `remove`；删除把任务移入演示回收站并**沿用同一个 id**（与真实链路软删除一致，恢复即原样回来）；`stats.trashCount` 改读内存态，删一条即 +1。
- `useDemoTrash`（新）：`restore` / `purge` / `clear`，语义与真实页一致（恢复不改 recordedAt，因此回到原位）。
- `DemoView`：新建 / 编辑 / 删除真的生效，删除复用真实页的确认文案（天数取 `trashRetentionDays`）；`DemoTrashView`：四操作真的生效，清空仍要求输入「清空」。
- 演示种子「今天」的时间由固定 09:00 改为「当前时刻之前一刻」——否则凌晨打开时新建的任务会掉到种子下面，看着像没生效。

**验证（浏览器，端口 5174）**
- 优先级：列表 pill 取值只有 高/中/低；弹窗下拉 低/中/高；`URGENT` / `priority-urgent` 残留 0（「紧急」只剩 2 条改动注释）
- 删除：「将移入回收站，90 天内可恢复。」→ 总数 24→**23**、未完成 16→**15**、回收站 4→**5**，任务移出列表
- 站内导航到回收站：**5** 条、首条正是刚删的那条、剩余 **90** 天
- 恢复：5→**4** 条；回任务页该任务在列表里、统计复位 **24 / 4**
- 彻底删除：4→**3** 条；清空：空输入被拦（「请输入「清空」两个字」、条数不变）→ 输入后 3→**0** 条 + 空状态「回收站是空的」+ 清空按钮禁用
- 新建：总数→**25**、未完成→**17**，位置 **1**；编辑：首行标题变为修改后的值
- 整页刷新：回到 24 条 / 回收站 4、新建的消失（内存态还原符合预期）
- `npm run build` EXIT=0；控制台 0 error / 0 warning

**过程中的一次自纠**：第一轮用 `playwright-cli goto` 跨页验证，而 `goto` 是整页刷新、会清空内存态，于是误判「删除没进回收站」；改用站内导航（点顶栏链接）后闭环成立。跨页验证内存态必须走 SPA 导航。

## [02:35] 动作: 勾选完成改为「先划掉、再下移」两段动效

**产出**
- `utils/timing.ts`（新）：`readCssDurationMs`（时长从 CSS 变量读）/ `sleep` / `readStrikeMs`；`useTheme` 删掉本地重复的解析逻辑改用它。
- `assets/main.css`：新增 `--dur-strike: 300ms`（减少动效偏好下 0ms）。
- `components/TaskItem.vue`：标题横线由「瞬间出现」改为宽度过渡（`background-size` 0 → 100%），带动画但不动布局。
- `stores/todo.ts`：`changeStatus` 拆成两步——① 只替换这一行、**不重排**（顺序不变，划线才播得出来），请求同时发出并预先挂上失败处理；② `sleep(readStrikeMs())` 后再 `groupTasksByState` 落位；失败立即回滚划线并归位。
- `composables/useDemoTasks.ts`：可见列表由 `filtered` computed 改为 `ordered` ref + 显式 `rebuild()`（与 store 同构），`changeStatus` 同样延迟重排。

**为什么在数据层延迟而不是用 CSS 延迟位移**：若让数据立刻重排、仅用 `transition-delay` 拖住 FLIP，列表里其他行的让位动画会一起被拖住，删除/筛选这些场景也会跟着变慢；把「重排时点」交给 `changeStatus` 控制，影响面只限勾选完成这一条路径。

**验证（逐帧采样，坐标是真实 rect.top）**
- 勾选完成：56 帧。`t4 横线 0% / top 263` → `t149 横线 92.99% / **top 263**` → `t282 横线 99.96% / top 263` → **位置首次变化 332ms** → `t499 top 1599`（FLIP 下移中）→ 末帧 `1601 / 横线 100%`
- 取消完成：14 个中间态帧。`t193 横线 2.35% / top 1601` → **位置首次变化 327ms** → 末帧 `横线 0px / top 263`（回到原位）
- 减少动效偏好：`--dur-strike` 0ms、中间态帧 **0**、位置首次变化 **4ms**（瞬时，不做拖延）
- 回归（演示数据源已被重构）：初始 20 行 → 搜索「部署」2 行 → 清空 20 行 → 触底 24 行且已完成组起始 16 → 筛「已完成」8 行且全部为已完成
- `npm run build` EXIT=0；控制台 0 error / 0 warning

## [02:05] 动作: 统一全站圆角（含弹窗）

**口径**：全站圆角收敛为四档，一处定义、角色明确，不再有零散数值。
`sm 6px` 紧凑件（复选框/标签/分页/骨架条/下拉项）· `md 12px` 控件（输入框/按钮/图标按钮/下拉框/提示条/小浮层）· `lg 20px` 容器（任务行/弹窗/确认框/表格/卡片）· `pill` 胶囊与圆形（优先级标签/勾选按钮/徽章/头像）。删掉已无引用的 `--radius-thumb`。

**产出**
- `assets/main.css`：重写圆角变量块并加角色注释；`:root` 只保留 EP 真正在 `:root` 声明的三个变量（base/small/round）；EP 在**组件元素自身**声明的圆角变量改为同选择器覆盖（`.el-dialog` / `.el-message-box` / `.el-card` / `.el-pagination` / `.el-tag` / `.el-popover` + `.el-popper`）；补 `.el-table`（EP 未暴露变量，默认方角）；把 `size="small"` 按钮由 `base − 1px` 的 11px 压平回 12px；下拉项与下拉菜单项由方角归到 sm；`prefers-reduced-motion` 下新增 `--dur-dialog: 0ms`。
- 组件层：6 处控件类元素由 sm 升到 md（主题按钮、验证码图按钮、行内图标按钮、前台账号按钮、后台侧栏项与账号按钮），演示徽章由 sm 改为 pill 与优先级标签同档。

**两个实码确认到的坑（凭记忆写必错）**
1. EP 把 `--el-dialog-border-radius`、`--el-messagebox-border-radius`、`--el-pagination-border-radius` 等声明在**组件元素自身**，元素上的直接声明会压过 `:root` 的继承值——我最初写在 `:root` 的那几条全是空转；实测 `.el-dialog` 仍是 12px，读运行时变量才定位到。
2. EP 对 `size="small"` 按钮算的是 `calc(base − 1px)`，落在阶梯之外（实测 11px）。

**验证（逐元素读计算值）**
- 容器档：任务行 20px、**弹窗 20px**、确认框 20px、管理页表格 20px
- 控件档：输入框 12px、下拉框 12px、按钮 12px（含原 11px 的 small）、弹窗内输入框与按钮 12px、提示条 12px、tooltip 12px、下拉面板 12px
- 紧凑档：复选框 6px、分页 6px、下拉项 6px
- 胶囊档：优先级标签 999px、勾选按钮 999px、演示徽章 999px
- 表格加 `overflow: hidden` 后**固定列未被破坏**：末列表头仍 `position: sticky`、`right: 0`、右边缘对齐 = true
- 杂项：`.el-table` 之外的圆角声明只剩 3 处 `50%`（圆形头像，本就不在阶梯上）；`npm run build` EXIT=0；控制台 0 error / 0 warning

**顺带修掉一个我自己引入的告警**：管理页控制台报 `ElOption` 收到 `undefined`（我把状态筛选的「全部」做成了 `value: undefined` 的选项）。改为 `clearable` + 占位文案「全部（正常 + 已冻结）」，与任务列表筛选控件一致；复验告警归零。

## [01:35] 动作: 任务行瘦身（标题 + 一行描述、去配图、整行点击即编辑）+ 弹窗开合动效

**产出**
- `components/TaskItem.vue`：只渲染标题 + 一行描述（`line-clamp: 1`），移除配图区与其计算属性；去掉铅笔编辑按钮；`<article>` 改为 `role="button" tabindex="0"`，整行点击 / Enter / Space 进入编辑，勾选与删除按钮 `@click.stop` 隔离；划选文字时（`window.getSelection()` 非空）不触发编辑，避免复制描述被抢。栅格改为 `26px 1fr 168px 32px`、`align-items: center`、内边距 16/20。
- `components/TaskList.vue`：骨架行列宽与真实行对齐（避免加载完跳变）。
- `assets/main.css`：新增 `--dur-dialog: 320ms`；覆盖 EP 的 `.dialog-fade-*` 时长与曲线，并重定义 `dialog-fade-in/out` 关键帧为「上浮 14px + scale .98→1」；`prefers-reduced-motion` 下 `--dur-dialog: 0ms`。

**验证（浏览器，端口 5174）**
- 结构：行内 `img` 数 = 0、编辑按钮 0、删除按钮每行 1、`line-clamp: 1`、栅格 `26px 516px 168px 32px`、行高 81px、`tabindex=0`
- 交互：**真实点击卡片** → 「编辑任务」弹窗打开且标题预填「完成系统设计说明书终稿」；点勾选 → 遮罩 `none`（不弹窗）+ 该行移到已完成组首位（未完成 15 / 已完成 9）；点删除 → 遮罩 `none` + 提示「演示模式不保存」+ 行数不变；聚焦行 + Enter → 弹窗打开并预填对应标题
- 进场动效（38 帧采样）：`t6 scale .980 / dy -14px / 透明度 0` → `t113 scale .997 / dy -2.1 / 0.849` → `t247 scale 1 / dy -0.1 / 0.991` → `t347` 动画摘除，遮罩与面板同步淡入，约 320ms
- 离场动效（20 帧采样）：`t2` 满态 → `t151 scale .991 / dy -9.2 / 0.084` → `t318` 归零，之后遮罩 `display:none`（DOM 清理正常）
- `npm run build` EXIT=0；控制台 0 error；截图 `task-rows-title-only.png`

**过程中的一次自纠**：中途用 `document.querySelector('.el-dialog__title')` 判断弹窗是否打开，但 EP 关闭后仍保留该节点，导致一次误判（以为勾选按钮会连带打开弹窗）；改用遮罩的 `display` 判定后重测，结论是行为正确。

## [01:10] 动作: 主题切换加 0.8 秒缓慢过渡（无闪动）

**口径变更（用户明确）**：`docs/` 下的设计文档只是参考，**一切以用户要求为准**——不再把「与文档冲突」列为待确认或待办。

**产出**
- `assets/main.css`：新增 `--dur-theme: 800ms`（时长唯一来源）；删掉原来挂在 `html` 上的 200ms 过渡；新增 `html.theme-transition *` 规则，在切换窗口内用 `!important` 临时接管全站颜色过渡（只过渡 background-color / color / border-color / outline-color / fill / stroke，不动 transform 与 box-shadow）；`prefers-reduced-motion` 下把 `--dur-theme` 置 0（该规则权重高于 `*` 兜底，必须显式归零）。
- `composables/useTheme.ts`：`setMode` 仅在明暗真的变化时给 `<html>` 挂 `.theme-transition`，约 800ms + 50ms 后摘掉；时长通过 `getComputedStyle` 读 `--dur-theme`，JS 侧不写死数字；跟随系统的 `matchMedia` change 也走同一套过渡，避免系统切换时硬切。

**为什么用「临时类」而不是常驻过渡**：各组件自己的过渡只有 150/200ms（悬停、边框），主题色跟着它们走会很硬；而常驻全站 800ms 过渡会把悬停手感拖垮。只在切换窗口内接管，两个目标同时满足。

**验证（浏览器逐帧采样）**
- 深→浅：66 帧、**29 个不同颜色值**，body 与 `.task-row` 同步渐变：`t0 rgb(18,18,18)` → `t200 rgb(171,171,171)` → `t400 rgb(234,234,234)` → `t600 rgb(251,251,251)` → `t850 rgb(255,255,255)`，曲线呈缓出
- 浅→深：26 个不同颜色值，`t0 白` → `t300 rgb(93,93,93)` → `t850 rgb(18,18,18)`，方向对称
- 无闪动：首帧即起始色、颜色单调过渡无回跳；切换结束后 `.theme-transition` 已摘除，行组件恢复自身 `border-color, background-color` 0.15s 过渡
- 深色首屏：底色 `rgb(18,18,18)`、`dark` 类已打、**加载时无过渡类**（因此首屏不会出现从白渐变的淡入）
- 减少动效偏好：`--dur-theme` 读为 `0ms`，点击后立即到达目标色
- `npm run build` EXIT=0；控制台 0 error

## [00:45] 动作: 演示模式补齐前台全功能（回收站 + 个人中心）

**产出**
- 演示数据：`mock/placeholder.ts`（共用内联 SVG 占位图：配图 / 头像）、`mock/demoCaptcha.ts`（本地生成图形验证码）、`mock/demoProfile.ts`（演示账号）、`mock/demoTrash.ts`（4 条回收站数据，含一条剩余 4 天用于演示临近到期）。
- 复用组件：`components/profile/{AvatarSection,BasicInfoForm,ChangeEmailForm,ChangePasswordForm,AppearanceSettings}.vue`、`components/TrashList.vue`。
- 演示页：`views/DemoProfileView.vue`、`views/DemoTrashView.vue`；`DemoLayout` 顶栏加前台三入口（任务 / 回收站 / 个人中心，用 exact-active 避免前缀误高亮）；路由加 `/demo/trash`、`/demo/profile`。
- 组件改造：`CaptchaField` / `EmailCodeField` 增加 `demo` 分支——本地生成验证码、跳过发信直接倒计时，演示模式因此零后端请求。
- 一致性重构：真实 `ProfileView` / `TrashView` 改为复用同一套分区与列表组件（8.6 要求演示与本尊同一套组件）；`.section*` 与 `.btn-text` 提为全局原语（后者原先在 6 个文件里重复定义）。
- 清掉一处假数据：`DEMO_TRASH_COUNT = 3`（写死的假数字）→ 由演示回收站数据实际长度派生。

**验证（浏览器，端口 5174）**
- **接口调用 = 0**：三个演示页用 URL pathname 精确断言，`/api/*` 命中 0（`/src/api/*.ts` 是 Vite 加载的模块文件，不是接口调用）
- 回收站：4 条、剩余 88 / 81 / 64 / 4 天、临近到期走危险色；点恢复 / 彻底删除 / 清空 → 只弹「演示模式不保存」、条数不变、无二次确认弹窗（与任务页口径一致）
- 个人中心：6 个分区（头像 / 基本资料 / 更换邮箱 / 修改密码 / 外观 / 下一步）；演示头像与验证码都是内联 SVG；资料预填「林知远 / 13912345678」
- 邮箱验证码：未填邮箱先提示「请先填写邮箱」；填好后点击 → 按钮变「59 秒后重发」+「演示模式不会真的发邮件…」
- 表单校验真实生效：纯数字密码被拦（「至少 8 位，且同时包含字母与数字」）且**不**弹不保存提示，说明是「先校验后提交」
- 外观在演示页真实生效：切「深色」→ `app-theme=dark`、`html.dark=true`、body `#121212`
- 回归：真实 `/profile` 六分区完整（末段为「会话」）、`/trash` 空状态正常
- `npm run build` EXIT=0；控制台 0 error；截图 `demo-profile.png` / `demo-trash.png`

**未验证（缺口类型：环境不可达）**
- 真实页的表单提交链路（资料 / 换邮箱 / 改密）仍需后端；本次只验证了渲染与校验。

## [00:20] 动作: 主题入口分工调整（顶栏两态 / 设置三态 / 初进跟随系统）

**产出**
- `composables/useTheme.ts`：`cycleMode`（三态循环）改为 `toggleTheme`（浅 ⇄ 深两态互切）；`setMode` 保留给设置页。处于「跟随系统」时点击按眼前实际显示的反面切，结果固化为浅或深。
- `components/ThemeToggle.vue`：图标与提示只反映浅/深（深色显示 moon、浅色显示 sun）；处于跟随时提示写成「深色（跟随系统）」，用户才知道它为什么随系统变。
- `views/ProfileView.vue`：新增「外观」分区，`el-radio-group` 三档：跟随系统 / 浅色 / 深色。
- `index.html` 的防闪烁脚本不用改：无记录时本就按 `auto` + `matchMedia` 决定首屏。

**验证（浏览器，端口 5174，系统配色用 emulateMedia 切换）**
- 初进无记录：`app-theme=null`、系统深色 → `html.dark=true`、body `#121212`、按钮提示「深色（跟随系统）」
- 跟随时效：系统转浅色 → 自动 `html.dark=false`（未刷新页面），`app-theme` 仍为 null
- 顶栏按钮两态：点 1 次 → `dark`；点 2 次 → `light`；**不会再回到 auto**
- 个人中心三态：显示「跟随系统/浅色/深色」且选中项反映真实状态；选「跟随系统」→ `app-theme=auto`，随后系统转深色页面实时变深；选「深色」→ 系统转浅色时仍保持深色（不再跟随）
- `npm run build` EXIT=0；截图 `.ai-memory/20261009/screenshots/theme-settings-dark.png`

**环境观察（重要）**
- 8080 端口出现一个 Spring Boot 进程（JDK 27，`-Dspring.*`），但这与「后端未开工」的旧前提不同：它对 `/api/verify/captcha`、`/api/users/me` 返回 **HTTP 401 + `WWW-Authenticate: Basic`**，并把浏览器请求重定向到 `http://localhost:8080/login`，因此前端看到的是 CORS/ERR_FAILED，提示为「网络连接失败，请检查网络」。
- 文档契约是 Bearer JWT + JSON 统一响应，且 `/api/verify/**` 属免登录接口——后端 Security 配置尚未与之对齐。前端未做任何迁就（后端接口就绪即恢复）。

**待确认（文档冲突）**
- 8.7 深色模式表「三态 + 顶栏一个按钮循环切换」与 8.8 主题切换行需改为「顶栏两态 + 设置里三态」。

## [00:05] 动作: 状态收敛两态 + 列表固定分组排序

**产出**
- `src/utils/task.ts`（新）：`groupTasksByState()` —— 未完成在前（按 recordedAt 倒序）、已完成在后（按 completedAt 倒序），真实页与演示页共用这一处规则。
- 两态改造：`types/TaskStatus` 收敛为 `'TODO' | 'DONE'`；`constants` 状态字典改两档；`mock/demoTasks.ts` 5 条「进行中」并入未完成；`TaskItem` 去掉状态标签（已由勾选与删除线表达）。
- 排序与筛选联动：`FilterBar` 移除排序下拉、方向按钮与「只看未完成」开关（前者与固定规则冲突、后者与状态筛选重复）；`TaskQuery.onlyUnfinished` 删除；`TASK_PRIORITY_WEIGHT / TASK_SORT_OPTIONS / TASK_STATUS_COLOR` 与 `--color-status-todo / --color-status-doing` 作为死代码一并清除。
- 立即下移：`stores/todo.ts` 的 `changeStatus` 与 `useDemoTasks.changeStatus` 写入本地 `completedAt` 后立刻重排，失败回滚；`TaskItem` 表单去掉状态字段（新建固定未完成、编辑保持原状态）。
- `StatBar` 的「未完成」改为 `total - done`，不依赖后端 todo / inProgress 计数字段。

**验证（浏览器，端口 5174）**
- 分组：已完成索引连续落在 16~19（首屏）与 15~23（加载完），未完成全在其前
- 组内顺序抽样：首行「完成系统设计说明书终稿」(recordedAt 最新)、未完成末行「回顾本周的决策记录」(最旧)、已完成首行「整理图片压缩方案」(completedAt 最新)、末行「确认单用户图片总量上限」(最旧) —— 与规则一致
- 点击完成后：该任务索引 0 → **15**（挪到已完成组首位），勾选填充 #4C9A6A；统计 未完成 16→15、已完成 8→9、完成率 33%→38%
- 筛选：未完成 → 15 行且无已完成行；已完成 → 8 行且全为已完成；控件只剩 1 个下拉 + 搜索 + 刷新
- 表单字段：标题/描述/优先级/截止时间/配图（无状态）
- `npm run build` EXIT=0；控制台前端 JS 异常 0（4 条 error 全为后端未起的 502 与关服后的 HMR 断连）
- 截图：`.ai-memory/20261009/screenshots/two-state-{light,dark}.png`

**未验证（缺口类型：环境不可达）**
- `stores/todo.ts` 的 `fetchPage` / `changeStatus` 是同一条链路，但只能在后端起来后才能实测；其共用的 `groupTasksByState` 已由演示页实测。
- **分页约束**：后端按 recordedAt DESC 分页，前端本地分组会在跨页时错位，需后端实现「状态分组 + 组内分别排序」（现有 `idx_task_user_deleted_recorded` 支撑不了表达式排序，建议后端加表达式索引或改成两段 UNION ALL）。

**待确认（文档冲突，未擅自改文档）**
- 6.5 ⑥/⑧/⑪（三态与排序参数）、8.8「勾选完成后卡片位置不动」、V8.11 修订记录第 ② 条、数据库说明书与 `todone.sql` 的 status 注释（TODO / IN_PROGRESS / DONE）、UC-05「新建默认待办」——均需按第 12 章进位。

## [23:56] 动作: 任务列表页改版——一行一任务 + 大圆角

**产出**
- 重写 `src/components/TaskItem.vue`：横向四段 grid（勾选 26px / 主体 flex / 元信息 168px 右对齐 / 操作 96px），大圆角 `--radius-lg: 20px`，缩略图 12px，标签与勾选按钮全圆。
- 新增 `src/components/TaskList.vue`、删除 `src/components/TaskWaterfall.vue`（多列瀑布流 → 单列，名字与行为保持一致；`waterfall` 残留 grep = 0）。
- `src/views/{DemoView,TaskListView}.vue` 换用 `TaskList`。
- `src/assets/main.css` 新增形状变量 `--radius-lg / --radius-thumb / --radius-pill`。

**设计要点**
- 单列相对瀑布流的收益是横向对齐：状态、优先级、截止时间形成可竖扫的一条线（右列 168px 右对齐 + `tabular-nums`）。
- 去掉 `优先级 · 状态 · 时间` 的中点拼接串（AI 生成页面的典型痕迹），改由结构承载。
- 只在一处用大圆角（行容器）；不加阴影、不加渐变、不用色块，守住 8.7 的极简基调。

**验证（证据，浏览器 playwright，实际端口 5174）**
- 行数 20、圆角 20px、grid `26px 452px 168px 96px`、行距 8px、全部行矩形去重 = 1（严格单列）
- hover：背景 #FAFAFA + 描边 #DCDCDC；完成态：`task-row--done` + 勾选填充 #4C9A6A + 标题转 #8C8C8C 且有删除线
- 深色：行 #1A1A1A / 描边 #2A2A2A / 圆角 20px / 阴影 none
- 窄屏 600px：grid 变 `26px 472px`、元信息落到第 2 列并左对齐、无横向溢出
- 空状态：0 行 + 「没有匹配的任务」+「清空筛选」；`/tasks` 同样渲染单列行（两页共用组件）
- `npm run build` EXIT=0；控制台 error 0
- 截图：`.ai-memory/20261009/screenshots/row-list-{light,dark}.png`

**待确认（文档冲突，未擅自改文档）**
- 与 8.5「多列错落（CSS columns 或 JS 均分）」、8.7「卡片圆角 10px / 列表区域靠 1px 分隔线划分」冲突，需按第 12 章流程进位文档版本。

## [23:50] 动作: 搭建 To_Done 前端基础框架 + 演示模式（依据《系统设计说明书V8.11》第 8 章）

**产出文件（新增 41 / 覆盖 5 / 删除 10）**
- 基座：`src/assets/main.css`（8.7 语义变量 + EP 映射 + 减少动效）、`index.html`（防闪烁 + zh-CN + 标题）、`src/main.ts`、`src/App.vue`
- 契约层：`src/types/index.ts`（DTO 与 6.2/6.5/8.9 一一对应）、`src/constants/index.ts`、`src/utils/date.ts`
- 请求层：`src/api/http.ts`（双 token 按路径选 + 401 分流 + 413/3002 + 5xx）+ `verify/auth/task/trash/admin`
- 状态层：`src/stores/{auth,todo,trash,admin}.ts`
- 路由与布局：`src/router/index.ts`（8.2 全表 + 两套守卫 + 标题）、`src/layouts/{Default,Demo,Admin}Layout.vue`
- 组件：`AppIcon/icons.ts`（内联 SVG，不引第 5 个依赖）、`ThemeToggle`、`AuthShell`、`CaptchaField`、`EmailCodeField`、`EmptyState`、`StatBar`、`FilterBar`、`TaskItem`、`TaskWaterfall`、`TaskFormDialog` + `components/admin/*`（8 个）
- 演示模式：`src/mock/demoTasks.ts`（24 条，时间相对今天生成）、`src/composables/useDemoTasks.ts`、`src/views/DemoView.vue`
- 页面：`views/{Login,Register,ForgotPassword,TaskList,Trash,Profile,NotFound}View.vue` + `views/admin/{AdminLogin,AdminUsers,AdminAdmins}View.vue`
- 构建配置：`vite.config.ts` 增 `/api`、`/media` 开发代理 → `http://localhost:8080`

**决策**
- D1 依赖按文档锁大版本：vue-router@4.6.4 / pinia@2.3.1 / element-plus@2.14.7 / axios@1.20.0（npm 当前最新为 vue-router 5.4.0、pinia 4.0.3，未跟）
- D3 演示模式用独立 composable，不往 todo store 塞 mock 分支
- D8 补齐 EP 派生档变量（light-3 / dark-2 等），否则默认蓝色会漏到 hover
- D9 `upload<T>(url, form: FormData)` 而非文档写的 `(url, file)`：6.5 ⑦ 的 multipart 是 JSON data 段 + 0~9 个 images 段
- D10 新增 `todone_admin_info` 持久化键：后端无「当前管理员」接口，刷新后 8.9 顶栏无处取值
- D11 演示模式新建/编辑仍打开弹窗，保存时才提示「演示模式不保存」
- 记录：8.5 的 880px 三列断点与 8.7 的 880px 内容区冲突 → 改为 760/520

**验证（证据）**
- `vue-tsc --build --force` → EXIT=0；`npm run build` → EXIT=0（dist 1.6M，路由已按需切分）
- 浏览器（playwright-cli，实际端口 5174）：/demo 首屏 20 卡 → 触底 24 卡；统计 24/11/5/8/逾期4/今日2/33%/回收站3；搜索「部署」→ 2 条；勾选完成 → 卡片 `task-item--done` + 统计联动（进行中 5→4、已完成 8→9、完成率 33%→38%）
- 演示写操作：新建提交与删除均弹「演示模式不保存，登录后即可真正使用」，卡片数不变、无二次确认弹窗
- 主题：localStorage `app-theme` auto→light→dark 三态 + `html.dark` + color-scheme 同步；深色 body #121212 / 卡片 #1A1A1A / 卡片阴影 none
- 守卫：`/tasks`→`/login?redirect=/tasks`；`/trash`→`/login?redirect=/trash`；`/admin/users`→`/admin/login?redirect=/admin/users`；陌生路径→404 页
- 响应式：容器 832px→3 列、752px→2 列、460px→1 列且无横向溢出
- 控制台：error 仅 1 条，为后端未启动导致 `/api/verify/captcha` 502 的资源级报错（非 JS 异常）
- 截图：`.ai-memory/20261009/screenshots/demo-{light,dark}.png`

**验证中发现并修复的缺陷**
1. `http.ts` 未映射 502/504 → 后端不可达时落兜底文案；补 5xx 分支（实测 502 文案已变为「服务器暂时不可用，请稍后重试」）
2. 瀑布流三列断点 880px 在 880px 内容区内不可达（最宽 832px）→ 改 760/520

**待办（下一轮）**
- 配图上传链路：本地压缩（长边 1920 / 质量 0.85，GIF 不压）+ 1:1 头像裁剪 + 拖动排序 + `imageOrder` 组装
- 后端接口就绪后联调：`api/*.ts` 参数名与返回体（尤其 `PUT /users/me` 与 `completionRate` 量纲）需回源 Swagger 核对
- `ImageUploader` / `ImagePreview` 两个组件本轮未建
