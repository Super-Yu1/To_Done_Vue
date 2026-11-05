# 更新日志（CHANGELOG）

## 一、文件规则

1. 修订记录**只保留最近 5 条**；写第 6 条时把最旧那条整条删除，不留归档区、不留「历史记录」小节。
2. 时间精确到分钟，格式 `YYYY-MM-DD HH:mm`（本地时间），**最新写在最上面**。
3. 一条记录 = 一次代码改动（同一轮需求里的多处改动合并成一条），格式固定为**标题 + 一段话**：这段话要写清「改了哪些文件、改了什么与为什么、怎么验证的」。
4. 每次改完代码**立即追加**，不攒批；文档、流程、约定的调整**不进修订记录**，直接改第二部分的项目约定。
5. 本文件是项目的**唯一**记录处：`.ai-memory/` 已废弃、不要再建，也别另开 daily / decisions 之类的新文件。引用约定时写**主题**（如「图形码」），不要写编号 —— 精简时会重排。

## 二、项目约定

1. **只做电脑 + 平板横屏**：最窄按 ≈900px，不做手机端；`≤900 / ≤760 / ≤640` 只是窄窗兜底，落在这一档「要滚一段」可以接受，不再优化。`@container` 的降级照旧（按容器宽度，与视口无关）；侧栏折叠的视口断点 1150，`useSidebarCollapse.ts` 与 CSS 两处**必须同时改**。
2. 中文沟通、个人独立项目：开工前把不明确处问清楚，倾向接受带理由的推荐选项。
3. `docs/系统设计说明书V8.11.md` 只是参考：与用户要求冲突时**以用户要求为准**，「文档与代码不一致」不是阻塞项。
4. 联调：后端在 **8081**，前端**必须用 5173**（后端 CORS 只认它，换 5174 会 403；curl 不带 Origin，看着像通的）。
5. **进站三态**：有效票 → 任务页；票过期 → 登录页（带 `redirect`）；没有票 → 演示模式。过期票**只判断、不删除**（`utils/token.ts` 是唯一依据）；`/admin/**` 是另一套守卫。
6. **演示模式**：免登录、不请求后端；写操作在内存里真实生效、刷新还原；**提示文案与登录后完全一致，不要再加「演示模式 / 仅内存」字样**。左下角与前台共用 `SideBottomBar` 和同一份折叠偏好。**没有个人中心**（左下角是「去登录」，不是用户菜单），`/demo/profile` 直接重定向到 `/login`。漫游与引导气泡各自**每个浏览器只出现一次**（写 localStorage），站内切页不再重复弹；「全部划掉」彩蛋按 `stats` 全量判定。
7. **液态玻璃**：页面没有纯白底。**铁律：文字对比度由文字色承担，不要靠压暗画布来救**（压暗后玻璃背后没有可折射的东西，整页变灰）。玻璃只认 `--glass-*` / `--seg-*` 令牌，组件里不写死白色；面板与卡片**同一档材质**，层级靠面积与厚度，不靠更白、不靠圆角；**卡片不要自己加 `blur`**（宽扁条会采到内层滚动容器裁切边外的空底，整卡变灰板）。圆角只有四级 —— 面 20 / 控件 12 / 小件 8 / 胶囊 999，不要再加新值。文字三级；浅色主题必须 `subpixel-antialiased`；输入框是凹井；按钮一律不投影（唯一例外是回到顶部）。
8. **颜色四支各管各的**：`--color-brand` 只做「面」（白底上的字用 `--color-brand-ink`，浅蓝块上的字用 `--color-brand-fg`）；`--color-accent` 管功能蓝（聚焦环 / 勾选框 / 进度深端），**深浅主题反向，别和 brand 合并**；主按钮单独 `--color-cta`（浅色浅蓝 + 深字，深色深蓝 + 白字，胶囊、无外投影）；完成态独立 `--color-check-*`，与环形进度 100% 共用同一支绿。
9. 侧栏导航、筛选页签、优先级胶囊、后台分段控件都是**独立滑块**（量位置 + `transform` 过渡）：选中项**只改文字色与字重，不要再画底色**。
10. 动作类提示一律 `AppTooltip`（不写原生 `title`），文字类信息不挂气泡。要改 popper 宽度 / 换行就加 `popper-class` 并写在**非 scoped** 样式里；收窄**只认 `.el-popper.is-dark`**（写成 `.el-popper.el-tooltip` 会把日期面板按成「看得见、点不动」）。
11. **认证页**：原生 `<form>` + `novalidate`，`@submit.prevent` 接住回车，主按钮不再挂 `@click`（否则一次点击发两遍），入口判 `loading` 防连点。三个页面共用 `AuthAside`，差别只有一句 `lead`。
12. **图形码不常驻**：只在发邮箱验证码 / 登录 / 后台登录时弹窗。登录页同一邮箱连错 2 次、第 3 次起才弹（本地计数在 `utils/loginAttempts`，30 分钟过期、成功清零；落后于后端时按 4008 补上）；注册成功与解禁后都要清本地计数。后台登录每次都要。锁定 **1009** 的文案由后端拼，前端**原样展示**、由登录页常驻一行，不走拦截器 toast。
13. **后台入口安全**：`/admin` 只是 SPA 路由，「藏路径」不是安全措施（bundle 公开），别为它拆包 / 混淆。前端只做两层：token 必须是「三段 JWT + 数值 exp 未过期」，`/admin*` 挂 `noindex` + `robots.txt` Disallow（只防收录）。真正的隔离在部署层（nginx 来源限制 / Basic Auth，模板见 `docs/前端修改说明.md`）。
14. **任务区**：一行一卡；**点任务行 = 直接进编辑弹窗**，没有只读详情，回收站行不可点。行内改动走 `todo.patchTask`（只替换本行，`refreshRecordedAt: false`、不带 `imageOrder`），批量动作 4 个并发。优先级只有低 / 中 / 高三档；逾期不整卡染色，只在左侧悬一枚红胶囊、时间前的时钟换成三角。勾选 / 取消勾选走 `leaveOnToggle` + 160ms 本地停留，离开动画交给列表的 leave transition（**不要在离开元素上用 CSS animation**，会破坏 FLIP）。**骨架屏只给首屏、且只给慢请求**：用 store 的 `hydrated`（成功取过一次即置真）而不是「列表为空」，再用 `useDelayedFlag` 等 200ms（`SLOW_LOADING_DELAY`）—— 否则空账号每次切页 / 切页签都会闪一帧。
15. **配图**：列表 / 弹窗 / 大图三处是同一个 `ImageSlideshow`，灯箱 `Teleport to="body"`；缩略图兼「看大图」与「拖动排序」，靠 4px 阈值区分，删除与开图都要 `click.stop`。只收 JPG/PNG/WebP（GIF 拒），单张 >10MB 直接拦，压缩阈值见 `utils/image.ts`。直链保持**预签名 30 分钟**（泄露面控制）：不做长期地址、不做后端转发、不做缩略图；前端只做同一页面生命周期内的 URL 复用，列表只下每任务首张。
16. **设置页**：一行一项，默认不出现常驻输入框，**只有右侧按钮可点**；用户名 / 手机号走行内编辑，邮箱 / 密码进弹窗。**不可点的行不铺悬停底色**（设置行、回收站行都是这个口径：反馈只给行内按钮，否则整行泛灰像被选中；批量模式的回收站行例外，那时整行可点）。**本地偏好（删除二次确认 / 侧栏折叠）按账号隔离**：键带 `:{userId}`（未登录走 `anon`），新账号没有记录即默认值（确认开、侧栏展开）；换账号由 `setPreferenceScope()` 重读，别再退回全局键。
17. **工具栏切模式不能改变高度**：两种模式的行叠在同一个 grid 格子里，只切 `opacity / transform / clip-path`，隐藏行挂 `inert`；**不要用 `position: absolute` 藏行**（position 不可过渡，会把滑动变成瞬移）。
18. **后台**：不露头 —— 界面不放任何入口、也不提「管理员」，靠直接访问 `/admin/login`。骨架与前台同源；表格不一行一卡、**不用 `fixed` 列**；EP 的表格底色变量必须写在 `.el-table` 自身（写父级无效），底部只留一条线（`.el-table::before`、`__inner-wrapper::before`、最后一行 `td` 的 `border-bottom` 三处都要关）；首屏给 `body-wrapper` 固定 `min-height`（别用 `el-table` 的 `min-height` prop），`v-loading` 只在真没数据时挂。**表格里的时间列一律两行**（上日期、下时刻），用 `components/admin/DateTimeCell.vue`，不要再在单元格里拼 `formatDateTime` 的单行串。**弹窗一律 `align-center`**；没有输入项的动作只走一次 `ElMessageBox` 确认。
19. **新手漫游**：入口由账号状态判定 —— 登录后「账号创建 < 7 天且一条任务都没有」才放，取不到 profile / 统计就一律不弹。**同一账号在本机只弹一次**（`useOnboarding` 的 `hasSeenOnboarding` / `markOnboardingSeen`，键里带 userId）：这层只管去重、不参与判定，**别拿它替代账号状态判定**（旧账号换台机器就会误弹）。演示模式同理：从站外进来且本浏览器没放过时放一次。文案与选择器集中在 `useOnboarding`，目标不存在就跳过；换步自己滚 + 派发 `resize`，收尾把列表滚回顶部；漫游开着时演示气泡让位。
20. **品牌资源**只有 `public/logo.svg` + `logo.png`（同源）；`favicon.ico` 已删除，不要再生成。
21. **人机验证是两段式，不要退回「一问一答」**（2026-11-05）：`GET /verify/challenge?scene=&account=` 取题 → `POST /verify/challenge/{id}/answer` 换票 → 把 `challengeTicket` 塞进业务请求。三条纪律：① **前端不预判要不要验证** —— 先直接发业务请求，收到 **4008** 才取题重发（本地计「连错几次」永远算不准，还多一次取题，旧的 `utils/loginAttempts` 因此下线）；② **4010（票过期 / 用过 / 场景不符）只能重新取题**，拿同一张票重试一定还是 4010；4009（答错）才是「原地再来一次」；4011（HTTP 429 风险过高）**一个验证码都别弹**，直接提示稍后；③ 滑块必须报 `trail`（≥8 点、相邻位移 ≤80px、总时长 300~8000ms，快速甩动要插值补点），点选按**图片原始尺寸**报坐标且顺序敏感 —— 这三条不过，答对了也会判 4009。题面与票都别缓存：120 秒、一次性。
22. **验证**：构建跑 `npm run build`（`vue-tsc` + `vite build`），项目没有 lint / test 脚本；真浏览器验证用系统 Edge + CDP 零依赖临时脚本，验完删脚本。

## 三、修订记录

### 2026-11-05 23:40 · 弹窗自身也不再投落影

用户反馈：登录页弹「人机验证」时，验证码弹窗周围又出现阴影。

**排查**：23:10 那条把**页面卡片**的阴影令牌全收了，但弹窗自己用的是 `--shadow-dialog`（`0 12px 40px rgba(0,0,0,.08)`）—— 浅色页上几乎看不见，遮罩把整页压暗后就在弹窗四周显成一圈灰晕，验证码这种小弹窗最明显。CDP 实测该状态下全页只剩这一处外阴影（其余都是输入框的 inset）。

**改法**（`main.css`）：在弹层锁滚动的那组 body 类下，把 `.el-dialog` / `.el-message-box` 的 `box-shadow` 置 `none`。遮罩 + 1px 描边已经足够分层；下拉 / 气泡仍走 `--el-box-shadow`，不受影响。

验证：`npm run build` EXIT=0；Edge 无头 + CDP（`/login`，mock 登录回 4008 + 图形码题面）—— 弹窗 `box-shadow` 从 `rgba(0,0,0,.08) 0px 12px 40px` 变成 `none`，全页扫描只剩输入框的 inset 阴影；截图确认弹窗边缘干净、与遮罩的分层仍然清楚。

### 2026-11-05 23:52 · 4008 不再弹「请先完成人机验证后重试」，弹窗文案只写「验证」

用户指出：登录提交后先弹「请先完成人机验证后重试」，像是没验证就知道密码错了；弹窗里「完成下面这一步以证明你是真人」这些字眼也不该出现。

**排查**：后端 `UserService.login()` 里 `challengeService.require(...)` 在查用户 / 验密码**之前**执行（UserService.java:190 vs 200），所以 4008 并不泄露密码对错 —— 问题是前端把它当普通失败弹了红 toast，弹窗打开的同时还挂着一条像「失败」的提示。

**改法**：① `api/http.ts` 把 4008 加入静默名单（与 1009 同款处理；`isChallengeRequiredError` 一并改用常量）—— 三处入口（用户登录 / 后台登录 / 发信）收到 4008 都会自己开验证弹窗，提示交给流程本身；② `ChallengeDialog.vue` 标题从「人机验证」改为「验证」，删掉副题「完成下面这一步以证明你是真人」。验证后密码错时后端 1003 返回「邮箱或密码错误」，要改成「密码错误」涉及后端与防枚举取舍，已记入 `docs/后端修改说明.md` 待产品确认。

验证：`npm run build` EXIT=0；Edge 无头 + CDP（mock：登录① 4008 → 图形码题面 → 答题换票 → 登录② 1003）—— 4008 时**没有任何 toast**，弹窗标题「验证」、无副题；答题换票后弹窗关闭（overlay `display: none`）、重试的 toast 是「邮箱或密码错误」。

### 2026-11-05 23:31 · 接入两段式人机验证（取题 → 答题 → 换票）

后端把「一问一答的图形码」换成了按风险分层的挑战（`NONE / SLIDER_PUZZLE / POINT_SELECT / IMAGE_CODE`），旧接口 `GET /verify/captcha` 与请求体里的 `captchaId / captchaCode` 已删除。字段以 `http://localhost:8081/v3/api-docs` 为准。

**新增**
- `composables/useChallenge.ts`：把「取题 → 弹窗 → 答题 → 换票」收成 Promise —— `request()` 返回 `'none'`（不用验证）/ `string`（票）/ `null`（取消或失败）。三处入口都只写一句 `await requestChallenge()`。
- `components/challenge/`：`ChallengeDialog`（按 `type` 分发）+ `SliderPuzzle` / `PointSelect` / `ImageCode`。
- 滑块**必须报轨迹**：`pointermove` 每次采一点，两位移之间按 40px 插值补齐（服务端硬阈值是「相邻不跳 >80px、≥8 点、300~8000ms」）；点数不足时在松手前补够 8 个。
- 点选按**图片原始尺寸**提交坐标（显示尺寸被容器缩过），顺序敏感、点满才提交。

**改造**
- `LoginView`：**不再预判**要不要验证 —— 先直接提交，收到 **4008** 才取题换票、把同一个请求重发一次（最多两次）。本地「连错 2 次才弹码」的计数与 `utils/loginAttempts.ts` 一并删除：风险规则在服务端，本地算不准还多一次取题。
- `AdminLoginView`：票必填，提交前先取题（题面固定图形码）；4010 时自动换一张再试一次。
- `EmailCodeField`：发信必带票（`scene=EMAIL_CODE`，`account` 传收件邮箱）；4008 / 4010 重取一次再试。`direct` 模式（`POST /users/me/email-code`）仍然免票。
- `api/http.ts`：4001 退役，换成 `isChallengeWrongError(4009)` / `isChallengeExpiredError(4010)` / `isChallengeBlockedError(4011)` / `messageOf()`；4008 改名 `isChallengeRequiredError`。**4010 不能原地重试**（同一张票重发一定还是 4010），4009 才是「原地再来一次」。

**删除**：`CaptchaDialog.vue`、`CaptchaField.vue`、`mock/demoCaptcha.ts`、`utils/loginAttempts.ts`，以及注册请求里的 `captchaId / captchaCode`。

验证：`npm run build` EXIT=0；playwright-cli 用 mock 跑通两条链路 ——
· 用户登录：mock 登录回 4008 → 弹窗出现滑块 → 拖 12 步（590ms）→ 答题请求体 `{"x":168,"trail":[…14 点…],"durationMs":590}`（点数/步长/时长都过阈值）→ 重试登录体 `{"email","password","challengeTicket":"tk_abc123"}`；
· 后台登录：题面 `IMAGE_CODE` → 输入后登录体 `{"name":"root","password":"…","challengeTicket":"tk_admin"}`。

### 2026-11-05 23:10 · 弹窗打开时全站卡片阴影一起收掉

用户反馈：任务页开着「新建任务」弹窗时，卡片周围又出现深色带。

**排查**：先前的抑制只框了 `.admin-panel` / `.sidebar` 两个选择器 —— 任务页的 `.summary`、`.filter-bar`、`.task-list__empty`、`.task-row` 等卡片不在名单里，遮罩压暗后它们的落影照样显形。所以这次不再逐个补选择器。

**改法**（`main.css`）：改成**令牌级** —— 弹层在场时把 body 上的 `--shadow-card` / `--shadow-card-hover` / `--shadow-panel` / `--glass-panel-shadow` 全部替换成 `var(--glass-edge)`（只留 1px 描边）。凡是吃这几个令牌的组件（侧栏、汇总、筛选栏、空状态、任务卡、回收站卡、回到顶部等）一起变平；弹窗自己走 `--shadow-dialog`，阴影保留。弹层类名仍是四类 `*-parent--hidden`（Dialog / MessageBox / 图片查看器 / 漫游），遮罩关掉自动还原。

验证：`npm run build` EXIT=0；Edge 无头 + CDP（mock 空账号 `/tasks`，1080×592，先关掉首屏漫游）—— 空闲时 `.summary` / `.filter-bar` / `.task-list__empty` / `.sidebar` 都是完整阴影（`0 0 0 1px` + `0 12~10px 30~26px`）；打开「新建任务」后四者只剩 `0 0 0 1px` 描边，`.el-dialog` 仍是 `0 24px 64px -16px, 0 6px 20px -6px`；点 × 关闭后四个卡片的阴影恢复。

### 2026-11-05 22:55 · 用户管理默认「正常」，状态不再有「全部」

用户两条：① 默认不要展示「正常 + 已冻结」，只看正常；② **不要这个组合态**。

`stores/admin.ts` 的 `query.status` 从 `undefined` 改成 `'NORMAL'`；`AdminUserToolbar.vue` 把状态下拉收成**必选四项**（正常 / 已冻结 / 已锁定 / 已注销）—— 去掉 `clearable`、占位符从「全部（正常 + 已冻结）」改成「状态」，`handleStatusChange` 只接具体值，`clearFilters` 把状态复位到「正常」。于是「不传 status = 正常 + 已冻结」这条后端默认口径前端用不到了，**不需要改后端**（status 恒传）。

验证：`npm run build` EXIT=0；Edge 无头 + CDP（mock 用户）—— 首个请求 `/admin/users?page=1&size=20&status=NORMAL`、下拉显示「正常」；悬停时没有清除图标；展开只有 `["正常","已冻结","已锁定","已注销"]`；选「已冻结」后请求变 `status=FROZEN`、显示同步。
