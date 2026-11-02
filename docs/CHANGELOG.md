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
6. **演示模式**：免登录、不请求后端；写操作在内存里真实生效、刷新还原；资料 / 邮箱 / 密码只提示不保存。左下角与前台共用 `SideBottomBar` 和同一份折叠偏好。演示的引导气泡只在**从站外进来**时出现一次；「全部划掉」彩蛋按 `stats` 全量判定。
7. **液态玻璃**：页面没有纯白底。**铁律：文字对比度由文字色承担，不要靠压暗画布来救**（压暗后玻璃背后没有可折射的东西，整页变灰）。玻璃只认 `--glass-*` / `--seg-*` 令牌，组件里不写死白色；面板与卡片**同一档材质**，层级靠面积与厚度，不靠更白、不靠圆角；**卡片不要自己加 `blur`**（宽扁条会采到内层滚动容器裁切边外的空底，整卡变灰板）。圆角只有四级 —— 面 20 / 控件 12 / 小件 8 / 胶囊 999，不要再加新值。文字三级；浅色主题必须 `subpixel-antialiased`；输入框是凹井；按钮一律不投影（唯一例外是回到顶部）。
8. **颜色四支各管各的**：`--color-brand` 只做「面」（白底上的字用 `--color-brand-ink`，浅蓝块上的字用 `--color-brand-fg`）；`--color-accent` 管功能蓝（聚焦环 / 勾选框 / 进度深端），**深浅主题反向，别和 brand 合并**；主按钮单独 `--color-cta`（浅色浅蓝 + 深字，深色深蓝 + 白字，胶囊、无外投影）；完成态独立 `--color-check-*`，与环形进度 100% 共用同一支绿。
9. 侧栏导航、筛选页签、优先级胶囊、后台分段控件都是**独立滑块**（量位置 + `transform` 过渡）：选中项**只改文字色与字重，不要再画底色**。
10. 动作类提示一律 `AppTooltip`（不写原生 `title`），文字类信息不挂气泡。要改 popper 宽度 / 换行就加 `popper-class` 并写在**非 scoped** 样式里；收窄**只认 `.el-popper.is-dark`**（写成 `.el-popper.el-tooltip` 会把日期面板按成「看得见、点不动」）。
11. **认证页**：原生 `<form>` + `novalidate`，`@submit.prevent` 接住回车，主按钮不再挂 `@click`（否则一次点击发两遍），入口判 `loading` 防连点。三个页面共用 `AuthAside`，差别只有一句 `lead`。
12. **图形码不常驻**：只在发邮箱验证码 / 登录 / 后台登录时弹窗。登录页同一邮箱连错 2 次、第 3 次起才弹（本地计数在 `utils/loginAttempts`，30 分钟过期、成功清零；落后于后端时按 4008 补上）；注册成功与解禁后都要清本地计数。后台登录每次都要。锁定 **1009** 的文案由后端拼，前端**原样展示**、由登录页常驻一行，不走拦截器 toast。
13. **后台入口安全**：`/admin` 只是 SPA 路由，「藏路径」不是安全措施（bundle 公开），别为它拆包 / 混淆。前端只做两层：token 必须是「三段 JWT + 数值 exp 未过期」，`/admin*` 挂 `noindex` + `robots.txt` Disallow（只防收录）。真正的隔离在部署层（nginx 来源限制 / Basic Auth，模板见 `docs/前端修改说明.md`）。
14. **任务区**：一行一卡；**点任务行 = 直接进编辑弹窗**，没有只读详情，回收站行不可点。行内改动走 `todo.patchTask`（只替换本行，`refreshRecordedAt: false`、不带 `imageOrder`），批量动作 4 个并发。优先级只有低 / 中 / 高三档；逾期不整卡染色，只在左侧悬一枚红胶囊、时间前的时钟换成三角。勾选 / 取消勾选走 `leaveOnToggle` + 160ms 本地停留，离开动画交给列表的 leave transition（**不要在离开元素上用 CSS animation**，会破坏 FLIP）。
15. **配图**：列表 / 弹窗 / 大图三处是同一个 `ImageSlideshow`，灯箱 `Teleport to="body"`；缩略图兼「看大图」与「拖动排序」，靠 4px 阈值区分，删除与开图都要 `click.stop`。只收 JPG/PNG/WebP（GIF 拒），单张 >10MB 直接拦，压缩阈值见 `utils/image.ts`。直链保持**预签名 30 分钟**（泄露面控制）：不做长期地址、不做后端转发、不做缩略图；前端只做同一页面生命周期内的 URL 复用，列表只下每任务首张。
16. **设置页**：一行一项，默认不出现常驻输入框，**只有右侧按钮可点**；用户名 / 手机号走行内编辑，邮箱 / 密码进弹窗。
17. **工具栏切模式不能改变高度**：两种模式的行叠在同一个 grid 格子里，只切 `opacity / transform / clip-path`，隐藏行挂 `inert`；**不要用 `position: absolute` 藏行**（position 不可过渡，会把滑动变成瞬移）。
18. **后台**：不露头 —— 界面不放任何入口、也不提「管理员」，靠直接访问 `/admin/login`。骨架与前台同源；表格不一行一卡、**不用 `fixed` 列**；EP 的表格底色变量必须写在 `.el-table` 自身（写父级无效），底部只留一条线（`.el-table::before`、`__inner-wrapper::before`、最后一行 `td` 的 `border-bottom` 三处都要关）；首屏给 `body-wrapper` 固定 `min-height`（别用 `el-table` 的 `min-height` prop），`v-loading` 只在真没数据时挂。**弹窗一律 `align-center`**；没有输入项的动作只走一次 `ElMessageBox` 确认。
19. **新手漫游**：入口由账号状态判定 —— 演示只从站外进来时放；登录后「账号创建 < 7 天且一条任务都没有」才放，**不记「看过了」**（localStorage 按设备记，旧账号换机必误弹）；取不到 profile / 统计就一律不弹。文案与选择器集中在 `useOnboarding`，目标不存在就跳过；换步自己滚 + 派发 `resize`，收尾把列表滚回顶部；漫游开着时演示气泡让位。
20. **品牌资源**只有 `public/logo.svg` + `logo.png`（同源）；`favicon.ico` 已删除，不要再生成。
21. **验证**：构建跑 `npm run build`（`vue-tsc` + `vite build`），项目没有 lint / test 脚本；真浏览器验证用系统 Edge + CDP 零依赖临时脚本，验完删脚本。

## 三、修订记录

### 2026-11-03 00:29 · 弹窗打开时收掉玻璃面板的外阴影

用户指出：打开「新密码」弹窗后，表格面板正下方多出一条深色横条。

**原因**：它不是新元素，是面板自己的落影 `--shadow-panel`（`0 12px 30px -16px rgba(24, 36, 74, .18)`）。浅色页面上这圈阴影只有几个色阶；弹窗遮罩把整页压暗后，阴影同步变深，就在面板与弹窗之间显形成一条横带。实测把 `.admin-panel` 的 `box-shadow` 临时设成 `none`，横条消失；行高与表格高度都没变（不是布局问题）。

**改法**（`main.css`）：`body.el-popup-parent--hidden .admin-panel, body.el-popup-parent--hidden .sidebar { box-shadow: none }`。`el-popup-parent--hidden` 是 Element Plus 在弹窗 / 确认框锁滚动时挂到 body 上的类，所以只在遮罩在场时生效，关掉弹窗立刻恢复浮起感。

验证：`npm run build` EXIT=0；Edge 无头 + CDP（mock 两行数据）—— 弹窗打开时 `.admin-panel` 与 `.sidebar` 的 `box-shadow` 计算值都是 `none`，面板下方区域截图不再有暗带；点「我已复制，关闭」后 body 上的类移除、面板阴影恢复原值。

### 2026-11-03 00:22 · 重置密码改为服务端生成口令 + 一次性回显

用户要求：重置用户密码不要手动输入，点一下生成随机串，弹一个可复制的窗口，用户登录后自行修改。口径定为**口令由后端生成**（与「创建用户」完全对称，密码策略只留一处）。

**后端**（`docs/后端修改说明.md` 第 1 条，已实现）：`POST /api/admin/users/{id}/password/reset`，无请求体，`data.newPassword` 只回一次（12 位、字母 + 数字，与建号同一个生成器），带 `Cache-Control: no-store`，不写日志、不存明文；副作用与旧 PUT 一致（换密码 + 刷 `password_updated_at` 踢下线 + 顺带解禁）。

**前端**：`types/index.ts` 新增 `AdminUserResetPasswordResult`；`api/admin.ts` 用 `resetUserPasswordToGenerated(id)`（POST）替换原来的「指定口令」封装；`stores/admin.ts` 的 `resetPassword(id)` 改成「调接口 + 返回服务端口令」、不缓存；`ResetPasswordDialog.vue` 去掉两个密码输入框与校验，只留说明 + 「生成并重置」；`AdminUsersView` 直接拿返回值开回显弹窗（`pendingReveal`，等重置弹窗动画结束再开，两层遮罩不叠）；原 `InitialPasswordDialog.vue` 泛化为 `PasswordRevealDialog.vue`（`mode: 'create' | 'reset'`），建号与重置共用同一套「只显示一次 + 复制」。

验证：`npm run build` EXIT=0；Edge 无头 + CDP（mock 接口）—— 重置弹窗 0 个输入框，点「生成并重置」只发一次 `POST /admin/users/u1/password/reset`（无请求体），弹窗显示的口令与响应里的 `SrvGen2pwdX9` 完全一致（证明没有本地生成）、只有 1 个可见弹窗，复制拿到同一串；建号回归仍是「初始密码（只显示这一次）」+ 响应里的 `initialPassword`。真实后端未登录验证（缺管理员口令），接口路径与字段按 `AdminUserController#resetPasswordToGenerated` 对齐。

### 2026-11-02 23:41 · 分页去掉白底，融进玻璃面板

用户要求：后台表格右下角的翻页按钮不要白底。

**来源**：EP 给翻页按钮和页码铺的是 `--el-pagination-bg-color`（默认白），32px 的方块并排就是一条白条，压在玻璃上很突兀；「共 N 条」本身是透明的。

**改法**（`main.css`，只对 `.admin-panel__foot .el-pagination`）：把 `--el-pagination-bg-color` 与 `--el-pagination-button-disabled-bg-color` 都改成 `transparent`，白底连同禁用态的实心底一起消失；翻页按钮与页码在悬停时补一层 `--control-hover`（与站内图标按钮同一层反馈），当前页仍是深色加粗数字，靠字重和颜色分辨。

验证：`npm run build` EXIT=0；Edge 无头 + CDP（1440，mock 单页数据）—— `--el-pagination-bg-color: transparent`，上一页 / 下一页 / 页码的背景都是 `rgba(0, 0, 0, 0)`；当前页是 `rgb(31, 36, 48)` + 字重 700；鼠标移到页码上背景变 `rgba(255, 255, 255, 0.44)`（`--control-hover`）。单页时「下一页」是禁用态，按设计不给悬停反馈。

### 2026-11-02 23:38 · 后台表格不再被横向滚动条压住最后一行

用户选了方案 A：把后台表格的横向滚动条藏掉，滚动能力保留。

**根因**：9 列宽度合计 1154，而 1440 / 1366 下表格容器只有 1028 / 954 —— 后台表在常规笔记本上必然横滚。系统设成「总是显示滚动条」时它在底部占掉一截，最后一行看着突然变高；EP 自绘的悬浮条（6px、`bottom: 2px`）则直接压在最后一行底部。行本身高度没变（实测两行 67 / 66）。

**改法**（`main.css`，只对 `.admin-panel` 生效）：`.el-scrollbar__wrap` 加 `scrollbar-width: none` 与 `::-webkit-scrollbar { width/height: 0 }`，再把 EP 的 `.el-scrollbar__bar.is-horizontal` 关掉；纵向那条留着（表格目前不纵滚）。横向滚动本身不动 —— 触控板横滑、Shift+滚轮照旧，与站内其它滚动区域「滚动条一律隐藏」同一口径。

验证：`npm run build` EXIT=0；Edge 无头 + CDP（1440 视口，mock 两行）—— `scrollbarWidth: none`、横向条 `display: none`、`scrollWidth 1154 > clientWidth 1028`；把 `scrollLeft` 设 200 后实际停在 126（最大值），说明还能滚；body-wrapper 高 133、两行 67 / 66、最后一行底边与表格底边同为 389，不再多出一截。

### 2026-11-02 23:04 · 审计去掉「登录方」列、用户表邮箱加可复制的气泡

用户两条：① 登录审计里的「登录方」列去掉；② 用户管理的邮箱，指针放上去要浮窗，浮窗里带快捷复制。

**审计列**（`LoginAuditTable.vue`）：删掉「登录方」列（90px），表头只剩 时间 / 账号 / 结果 / IP / User-Agent。上方的分段已经按登录方筛选，列里永远只有同一个值，留着只是重复；配套的 `LOGIN_AUDIT_ACTOR_LABEL` 引用与 `.actor--admin` 样式一并清掉（常量本身仍给分段控件用，没删）。

**邮箱气泡**（`AdminUserTable.vue`）：邮箱列从 `show-overflow-tooltip` 换成 `el-popover`（`trigger="hover"`、宽 300、`show-after` 200）—— 单元格单行省略，气泡里给完整地址 + 一个**纯图标**的复制按钮（24×24，文案只留在 `aria-label`，不放「复制」字样）。复制走 `utils/clipboard`，成功后图标由 copy 换成 check 并转绿 1.6 秒（不弹 toast 打断视线），失败才弹一次错误。**这里不能用 `AppTooltip`**：它 `pointer-events: none`，按钮点不到；排版写在非 scoped 的 `.email-popover` 里（气泡 teleport 到 body）。

验证：`npm run build` EXIT=0；Edge 无头 + CDP（mock 用户 / 审计两个接口）—— 审计表头 `["时间","账号","结果","IP","User-Agent"]`、首行内容正常；邮箱单元格 `text-overflow: ellipsis` + `nowrap`，悬停 700ms 后 `.email-popover` 可见、宽 300、内容为完整邮箱 + 24×24 的空文本图标按钮（`aria-label="复制邮箱"`）；点图标后 clipboard 收到的正是该邮箱，按钮换 check 图标、`aria-label` 变「已复制」、颜色转绿。










