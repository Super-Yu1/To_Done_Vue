# _plan.md — To_Done 前端基础框架 + 演示模式（2026-10-09）

档位判定：**大项目档**（新增文件 ≥10、代码 ≥500 行 → 触发 C 池）。
依据：《系统设计说明书V8.11》第 8 章前端设计 + 第 6 章接口 + 附录 A/D/E。
用户已确认口径：全站骨架 + 演示模式完整 / Element Plus 全量引入 / 演示模式完全按 8.6。

## 一、输入 / 输出 / 约束

- 输入域：仅设计文档，后端未开工（无接口可调）。现有 `src/` 为 create-vue 默认脚手架（无 router/pinia/element-plus/axios）。
- 输出契约：可 `npm run dev` 起服、可 `npm run build` 通过的前端工程；`/demo` 为唯一可完整交互的页面；其余页面按文档摆好结构与文案、提交动作给出显式"后端未开工"反馈（不写死代码/幽灵代码）。
- 硬约束（来自文档，逐条可核）：
  - 目录结构 8.1；路由与两套守卫 8.2；store 划分 8.3；请求封装 8.4（双 token 按路径选）；瀑布流 8.5；演示模式 8.6；视觉规范 8.7（色值唯一来源 `src/assets/main.css`）；交互规范 8.8。
  - tsconfig 已启用 `noUncheckedIndexedAccess`，数组/对象下标访问须显式判空。
  - 统一响应 `{code,message,data,timestamp}`；业务失败 HTTP 200 + 业务码（附录 A）。

## 二、方案与取舍（≥2 候选 + 反选理由 + 撤销条件）

| # | 决策点 | 选中 | 反选候选及理由 | 撤销条件 |
|---|---|---|---|---|
| D1 | 依赖大版本 | **按文档**：vue-router@4.6.4 + pinia@2.3.1 + element-plus@2.14.7 + axios@1.20.0 | 上最新大版本（vue-router@5.4.0 / pinia@4.0.3）：跨大版本 API 未核实，且实现与文档不一致须回改文档（12 章流程） | 用户决定升级 → 先改文档再升 |
| D2 | 源码根 | `src/`（仓库根即前端工程） | 新建 `frontend/src/`：多一层无收益的嵌套 | 前后端同仓分目录时再迁 |
| D3 | 演示模式状态承载 | 独立 `composables/useDemoTasks.ts`（内存态） | 往 `stores/todo.ts` 塞 demo 分支：污染 8.3 定义的 store 表、写操作拦截逻辑混进真实链路 | demo 需要跨页共享时再提 store |
| D4 | 演示数据时间 | **相对今天**生成（`daysFromNow()`） | 写死绝对日期：随时间推移"逾期若干"会失效、全部变逾期 | 无（纯改进） |
| D5 | 演示模式「切换状态」 | 允许（仅内存，刷新还原） | 与新建/编辑/删除同拦：与 8.6「交互：可筛选、**可切换状态**、可翻页」冲突（8.6 的拦截括号只列了「新建/编辑/删除」） | 用户要求演示也禁止切状态 |
| D6 | 占位页提交动作 | 显式 `ElMessage.info('后端接口未开工，暂不可用')` + `// TODO` | 空函数 / 假装成功：违反「戒幽灵代码」与「戒假注释」 | 无 |
| D7 | 图片类组件 | 本轮**不做** `ImageUploader` / `ImagePreview`（含本地压缩 + 1:1 裁剪 + 拖动排序，属有实质逻辑组件，演示模式用不到） | 一并做：超出"骨架"范围，且无接口可验收 | 后端开工后补 |

## 三、规划门禁（PLAN-GATE）

### A 池（10/10）
- A1 需求→步骤映射：8.1→W1/W2/W4 目录；8.2→W2 路由守卫；8.3/8.4→W1 store+http；8.5/8.6→W3 演示模式；8.7→W1 主题；8.9→W4 后台组件。✔
- A2 每步出口校验：W1 出口=type-check 通过；W2 出口=各路由可达（浏览器）；W3 出口=演示交互全绿；W4 出口=后台页可渲染。✔
- A3 数据/外部依赖已标注：4 个 npm 包（版本见 D1）；后端 33 条接口仅落 `api/*.ts` 签名，不调用。✔
- A4 风险已识别（见"六、风险"）。✔
- A5 验证方式已定义（见"五、验证"）。✔
- A6 回滚：6 个被覆盖文件先 `cp → .ai-memory/20261009/backup/`；git 仓库为总回滚点（工作区未提交，`git checkout` 可复原）。✔
- A7 批量范围：新增 ≈40 文件 / 修改 6 文件，分 4 个 Wave。✔
- A8 安全触发面：本任务不涉 DB 写入、不涉生产配置、无凭证硬编码；token 存 localStorage 是文档既定设计（9 章），非本次引入；XSS 面 = 任务标题/描述渲染用 Vue 插值（非 `v-html`）。✔
- A9 人工干预文件：`index.html` / `main.ts` / `App.vue` / `main.css` / `package.json`（仅被 npm 改）/ `vite.config.ts`（不改）——已遍历，覆盖前备份。✔
- A10 中断点：W1 失败 → 删 node_modules 重装；W2/W3/W4 失败 → 从 backup/ 恢复该文件；整体放弃 → `git checkout . && git clean -fd src`（备份目录在 .ai-memory 内不受影响）。✔

### B 池
- B1 涉数据库：**N/A**（纯前端，不改 `todone.sql`）。
- B2 涉新依赖：**已过引前审查** —— 4 个包均为 Vue 官方生态/主流库；`npm view` 实查 peer 兼容（vue-router@4.6.4 要求 vue ^3.5.0、pinia@2.3.1 要求 ^3.5.11、element-plus@2.14.7 要求 ^3.3.7，项目 vue 3.5.42 ✔）；装后跑 `npm audit` 复核已知漏洞。
- B3 并发/幂等：**N/A**（无共享可变状态；演示数据为单浏览器内存态）。
- B4 性能敏感路径：首页 24 条 → 不做虚拟滚动（文档要求"滚动到底加载下一页"，阈值远低于 100 条）；瀑布流用 CSS `columns`，仅动 transform/opacity。
- B5 外部系统：无（后端未开工）。
- B6 涉测试：**选定=真人功能验证(L0)+type-check+build**；不引入 vitest（项目无测试基座，本次无可单测的业务算法，避免过度工程化）；已披露为未覆盖项。
- B7 批处理：**N/A**。
- B8 不可逆操作：删除 5 个脚手架默认组件 + `base.css` + `logo.svg` → 删前确认无业务引用（grep 调用点），git + backup 双回滚点。
- B9 多文件依赖影响面：现有 `src/` 仅 9 个 .vue，`App.vue` 引用 HelloWorld/TheWelcome → 一并替换；`grep -r "base.css|logo.svg"` 复核。
- B10 命令无硬编码路径：npm 脚本走 package.json；命令用绝对路径。
- B11 方案回读：本文件写后回读确认无乱码。✔

### C 池（规模触发）
- C1 每 5 文件落 CHECKPOINT（进度 + 证据）。✔
- C2 4 个 Wave 链式执行，Wave 边界落 `handoff.md`。✔

### 规划自审
1. 占位符扫描：本计划无 `待补充/...`；D7 的"不做"与 B6 的"不做"均为显式决策非占位符。✔
2. 签名一致性：`request<T>` / `upload<T>` / PageResult 字段（records/total/page/size/totalPages）等均照 6.2/8.4 原文；`trashRetentionDays`、`imageOrder`、"NEW" 占位符取 6.5 ⑪⑦ 原文。✔
3. 需求→步骤：每 Wave 均映射到文档章节（见 A1），无防御性多余步骤。✔
4. 引用点实码 trace：`package.json` 依赖现状（仅 vue 一个 runtime 依赖）、`main.ts` 内容、`App.vue` 内容、`tsconfig.app.json` 的 `noUncheckedIndexedAccess`、vite `@` alias 均已 read_file/grep 确认。✔

### 方案成形自检
- ① 五段齐全（本文件一~五节 + 六~八节）。✔
- ② 多路径取舍：D1~D7 共 7 处，均给候选 + 反选理由 + 撤销条件。✔
- ③ 边界与失败模式：演示数据为空（筛选无结果）→ 空状态引导；页码越界（删除末页最后一条）→ 回退页码；输入超长（标题/描述）→ 前端 `maxlength` + 后端兜底；接口不可达 → http.ts 统一网络提示。处置分档：前端输入非法=**拒绝**（表单校验拦截）；接口不可达=**放行 + 标记**（提示可见且不写入）。✔
- ④ 权衡结论：以"文档即 spec + 不引跨大版本 API"优先于"用最新版"，代价 = 依赖非最新（记录为局限）。
- ⑤ 产出与局限：见"七、未覆盖清单"。
- 三清单：二阶效应——改 `index.html` 防闪烁脚本会影响深色首屏（观察指标：刷新无白闪）；歧义清单——D5 已声明假定；未知清单——后端接口未实现（闭合方式：后端开工后按 Swagger 对齐 `api/*.ts`），影响面：`api/*.ts` 可能需微调参数名。

## 四、文件清单与 Wave

**被覆盖（先备份）**：`index.html`、`src/main.ts`、`src/App.vue`、`src/assets/main.css`、`package.json`。
**被删除**：`src/assets/base.css`、`src/assets/logo.svg`、`src/components/{HelloWorld,TheWelcome,WelcomeItem}.vue`、`src/components/icons/*.vue`（5 个）。

| Wave | 内容 | 出口校验 |
|---|---|---|
| W1 | 依赖安装；`assets/main.css`（8.7 语义变量+EP 映射）；`index.html`（防闪烁/lang/标题）；`App.vue`；`main.ts`；`types/index.ts`；`constants/index.ts`；`utils/date.ts`；`composables/useTheme.ts`；`api/http.ts` + 6 个 api 模块；`stores/{auth,todo,trash,admin}.ts` | `npm run type-check` 通过 |
| W2 | `router/index.ts`（8.2 全表 + 两套守卫 + 标题）；`layouts/{Default,Demo,Admin}Layout.vue`；`views/{Login,Register,ForgotPassword,TaskList,Trash,Profile,NotFound}View.vue`；`views/admin/{AdminLogin,AdminUsers,AdminAdmins}View.vue`；`components/{CaptchaField,EmailCodeField,ThemeToggle,EmptyState,StatBar,FilterBar}.vue` | 浏览器逐路由可达；守卫跳转正确 |
| W3 | `mock/demoTasks.ts`（24 条，覆盖三状态/四优先级/有图无图/逾期）；`composables/useDemoTasks.ts`；`components/{TaskItem,TaskWaterfall,TaskFormDialog}.vue`；`views/DemoView.vue`；`layouts/DemoLayout.vue` | /demo 全交互真人验证 |
| W4 | `components/admin/{AdminUserTable,AdminUserToolbar,UserEditDialog,ResetPasswordDialog,FreezeDialog,DeleteUserDialog,AdminTable,CreateAdminDialog}.vue` | 后台页可渲染 + 弹窗字段/文案符合 8.9 |
| W5 | type-check + build + dev + 浏览器真人验证 + 截图 | 证据入交付 |

## 五、验证（证据类型）
1. `npm run type-check` → 退出码 0。
2. `npm run build` → 退出码 0 + dist 体积。
3. `npm run dev` + 浏览器（playwright/curl）：`/demo` 渲染 24 条 → 筛选 → 切状态 → 翻页 → 写操作提示 → 主题三态 → 深色截图；控制台 0 error。
4. 路由表逐条可达（12 条 view）。

## 六、风险与缓解
- R1 npm 安装失败（网络）→ 最多重试 2 次，仍失败则输出 registry 状态并请你确认换镜像。
- R2 Element Plus 全量引入 + Vue 3.5.42 兼容 → build 兜底验证。
- R3 `noUncheckedIndexedAccess` 导致数组下标类型报错 → 写码时显式判空。
- R4 原型链污染/未知漏洞 → 装后 `npm audit`。
- R5 视觉规范走样（出现阴影/渐变/多余色）→ 交付前按 8.7「落地要求」逐条自审。

## 七、未覆盖 / 未验证清单（交付时同步披露）
- 后端 33 条接口全部不可调用：`api/*.ts` 为按文档落定的签名，未经真实联调。
- 不引入 vitest：无自动化测试，验证依赖 L0 真人驱动。
- `ImageUploader` / `ImagePreview` / 头像裁剪：本轮不做（D7）。
- 真实登录/注册/找回密码/任务/回收站/个人中心/后台的提交链路：仅骨架 + 显式提示。

## 八、不卡死计数
- 已确认失败：0 次（L0）。
