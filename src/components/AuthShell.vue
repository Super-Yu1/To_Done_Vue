<script setup lang="ts">
/**
 * 认证页外壳（登录 / 注册 / 找回密码共用）：品牌 + 主题切换 + 表单（8.7 覆盖全站含认证页）。
 * 两种版式：
 *   · 默认（找回密码）：56px 通栏顶栏 + 居中窄表单；
 *   · 提供 `aside` 插槽（注册 / 登录）：>900px 时左右分栏（>1240 是 **4:6**、901–1240 收到 **45:55**，
 *     让左栏示例标题不被省略号截断）、**两栏从屏幕最顶部一直铺到底部** ——
 *     顶栏不再占一条白带，而是**悬浮在分栏之上**（`position: absolute` + `pointer-events: none`，
 *     只有品牌链接与主题开关自己恢复可点）。品牌落在左栏灰底的最左上角、主题开关落在右侧白区的右上角，
 *     两者分别与下方内容的左 / 右边缘**绝对对齐**（用的是同一把尺子：左 460 / 右 496，见下方 `*-inner`）。
 * 分栏版式另有三处细节：右栏表单收进 496px 发丝描边卡片（略偏上居中）；左栏是 `AuthAside`
 * （浅底 + 点阵 + 可交互示例清单 + 彩蛋）；表单控件统一 40px 高、输入框填充式。
 * ≤900px 折成上下：顶栏回到普通的静态一条（品牌左、开关右），左栏内容整块上移。
 * 高度 ≤880px 另有一档「短屏」：两栏上下内边距与左栏行距各收一档，让 768–820 高度也不滚动。
 * `header-extra` 插槽：表单标题右侧的位置（两页都是「先逛逛演示」）。
 * `footer` 插槽：页面底部的细页脚。
 */
import { RouterLink } from 'vue-router'
import ThemeToggle from './ThemeToggle.vue'

defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="auth-shell">
    <!--
      分栏版式下这条顶栏是「悬浮」的：不占高度（所以左右色带能从最顶部开始），
      也不吃鼠标事件（`pointer-events` 只放给品牌与开关）。
    -->
    <header class="auth-shell__header" :class="{ 'auth-shell__header--split': !!$slots.aside }">
      <div class="auth-shell__header-cell auth-shell__header-cell--brand">
        <div class="auth-shell__header-inner">
          <RouterLink class="auth-shell__brand" to="/login">
            <img class="auth-shell__brand-logo" src="/logo.svg" alt="" width="22" height="22" />
            To_Done
          </RouterLink>
        </div>
      </div>
      <div class="auth-shell__header-cell auth-shell__header-cell--toggle">
        <div class="auth-shell__header-inner auth-shell__header-inner--end">
          <ThemeToggle />
        </div>
      </div>
    </header>

    <main class="auth-shell__main" :class="{ 'auth-shell__main--split': !!$slots.aside }">
      <div v-if="$slots.aside" class="auth-shell__aside">
        <div class="auth-shell__aside-inner">
          <slot name="aside" />
        </div>
      </div>

      <section class="auth-shell__panel">
        <div class="auth-shell__panel-inner" :class="{ 'auth-shell__card': !!$slots.aside }">
          <div class="auth-shell__heading">
            <h1 class="page-title">{{ title }}</h1>
            <slot name="header-extra" />
          </div>
          <p v-if="subtitle" class="auth-shell__subtitle">{{ subtitle }}</p>
          <div class="auth-shell__form">
            <slot />
          </div>
        </div>
      </section>
    </main>

    <footer v-if="$slots.footer" class="auth-shell__footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<style scoped>
.auth-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* 2026-10-26：底色交给 html 的弥散渐变，认证页与主站同一片光 */
  background-color: transparent;
}

/* ---------- 顶栏（默认版式：一条 56px 通栏） ---------- */

.auth-shell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: var(--content-width);
  height: 56px;
  margin: 0 auto;
  padding: 0 clamp(16px, 2.5vw, 40px);
}

.auth-shell__header-cell {
  display: flex;
  align-items: center;
  min-width: 0;
}

.auth-shell__header-inner {
  width: 100%;
}

.auth-shell__header-inner--end {
  display: flex;
  justify-content: flex-end;
}

.auth-shell__brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
}

.auth-shell__brand-logo {
  display: block;
  width: 22px;
  height: 22px;
}

/* ---------- 主区 ---------- */

/* 默认（找回密码 / 后台登录）：单栏窄表单居中 */
.auth-shell__main {
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
  padding: 48px 24px 64px;
}

/*
 * 单栏版也收进一张玻璃卡（2026-10-26）：底色变成渐变之后，
 * 光秃秃的表单会漂在光斑上；卡片宽度吃掉原本的左右内边距，控件不被挤窄。
 */
.auth-shell__main:not(.auth-shell__main--split) {
  max-width: 408px;
  padding: 48px 0 64px;
}

.auth-shell__main:not(.auth-shell__main--split) .auth-shell__panel-inner {
  padding: 28px 28px 24px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background-color: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--shadow-card);
}

/* 注册 / 登录：左右 4:6，两栏铺满「屏幕顶部 → 页脚」的全部高度 */
.auth-shell__main--split {
  display: grid;
  grid-template-columns: 4fr 6fr;
  width: 100%;
  max-width: none;
  margin: 0;
  flex: 1 1 auto;
  padding: 0;
  /* 表单控件统一 40px 高：输入框、验证码按钮、下拉都跟着这个变量走 */
  --el-component-size: 40px;
}

/* 顶栏是悬浮的（不占高度），所以两栏各自用顶部内边距给它让出 84px */

/*
 * 左栏：浅底 + 点阵网格（都是既有令牌，不新增色值）。
 * 垂直方向把「内容包裹层」居中，且**下内边距大于上内边距** —— 重心略偏上，不平不沉。
 * 注意这里**不裁溢出**（`overflow: visible`）：内容比色带高时让它自然撑开、整页滚动；
 * 彩蛋粒子与光晕由它们各自的图层裁（见 AuthAside 的 `.confetti` / `.aside__glow`）。
 */
.auth-shell__main--split .auth-shell__aside {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px clamp(24px, 4vw, 56px) 84px;
  /* 左栏半透明：点阵网格下面透出页面光斑，与右栏的玻璃卡同处一层 */
  background-color: color-mix(in srgb, var(--color-surface) 42%, transparent);
  background-image: radial-gradient(var(--color-border) 1px, transparent 0);
  background-size: 22px 22px;
}

.auth-shell__aside-inner {
  width: 100%;
  max-width: 460px;
}

/* 右栏：表单略偏上居中（下内边距大于上），重心落在偏上一点的位置更顺眼 */
.auth-shell__main--split .auth-shell__panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 84px clamp(24px, 4vw, 56px) 96px;
}

.auth-shell__panel {
  min-width: 0;
}

.auth-shell__panel-inner {
  width: 100%;
  max-width: 440px;
}

/*
 * 表单卡片：右栏是纯白，单靠留白撑不住视觉重心 —— 用一张 1px 发丝描边的卡片把它收住，
 * 与左栏的任务卡、全站的卡片语言同源（不额外加阴影，白底上阴影几乎看不见，反而脏）。
 */
.auth-shell__card {
  max-width: 496px;
  padding: 28px 28px 24px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background-color: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--shadow-card);
}

.auth-shell__heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}

/*
 * 标题右侧的次要入口（注册页与登录页都是「先逛逛演示」）：
 * 插槽内容属于父组件作用域，得用 :slotted 才能在这里统一上样式 —— 两页共用一条规则。
 * 它比正文小一档但**加粗加深**（500 / 正文色），是这两页上唯一的次入口，得看得见；
 * 悬停加下划线给出链接的可点性（颜色已经是最深的，没法再加深）。
 */
.auth-shell__heading :slotted(a) {
  flex: none;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 3px;
  transition: text-decoration-color var(--dur-fast) var(--ease);
}

.auth-shell__heading :slotted(a:hover) {
  text-decoration-color: currentColor;
}

.auth-shell__subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: var(--color-text-2);
}

.auth-shell__form {
  margin-top: 24px;
}

/* ---------- 分栏版式的排版尺度 ---------- */

/* 页面尺度大了，14px 的正文在大留白里会显得小；只作用在分栏分支，窄表单不受影响 */
.auth-shell__main--split .page-title {
  font-size: 22px;
}

.auth-shell__main--split .auth-shell__panel :deep(.el-form-item__label) {
  color: var(--color-text);
  font-size: 15px;
  font-weight: 500;
}

.auth-shell__main--split .auth-shell__panel :deep(.el-input__inner),
.auth-shell__main--split .auth-shell__panel :deep(.el-textarea__inner) {
  font-size: 15px;
}

/*
 * 填充式输入框：浅底、无描边；聚焦时转白底 + 一圈主色环。
 * 只改「非聚焦、非错误」态，Element Plus 自带的聚焦态与错误红环（`.is-error` 在 form-item 上）
 * 保持原样 —— 校验失败时的红框不能被我压掉。
 */
.auth-shell__main--split
  .auth-shell__panel
  :deep(.el-form-item:not(.is-error) .el-input__wrapper:not(.is-focus)) {
  background-color: var(--color-hover);
  box-shadow: none;
}

.auth-shell__main--split .auth-shell__panel :deep(.el-input__wrapper) {
  padding: 0 12px;
}

.auth-shell__main--split .auth-shell__panel :deep(.el-input__wrapper.is-focus) {
  background-color: var(--color-surface);
  box-shadow: 0 0 0 1px var(--color-text) inset;
}

/*
 * 校验失败时描边必须是红的 —— 包括「还聚焦着」的那一刻：
 * 上面那条聚焦规则比 Element Plus 自带的错误态更具体，不显式盖一下会把红环吃掉。
 */
.auth-shell__main--split .auth-shell__panel :deep(.el-form-item.is-error .el-input__wrapper),
.auth-shell__main--split
  .auth-shell__panel
  :deep(.el-form-item.is-error .el-input__wrapper.is-focus) {
  background-color: var(--color-surface);
  box-shadow: 0 0 0 1px var(--color-danger) inset;
}

/* 验证码的输入框与「获取验证码」按钮等高（同一条高度变量） */
.auth-shell__main--split .auth-shell__panel {
  --auth-control-h: 40px;
}

.auth-shell__main--split .auth-shell__panel :deep(.el-input__wrapper) {
  min-height: var(--auth-control-h);
}

.auth-shell__main--split .auth-shell__panel :deep(.email-code-field__button) {
  height: var(--auth-control-h);
}

/* ---------- 分栏版式的顶栏（悬浮） ---------- */

/*
 * 不占高度、不吃事件：左右两条色带因此能从屏幕最顶部开始，
 * 品牌与开关分别浮在各自那一栏的角上。
 */
.auth-shell__header--split {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 3;
  display: grid;
  grid-template-columns: 4fr 6fr;
  height: 76px;
  max-width: none;
  margin: 0;
  padding: 0;
  pointer-events: none;
}

.auth-shell__header--split .auth-shell__header-cell {
  height: 100%;
  justify-content: center;
  padding: 0 clamp(24px, 4vw, 56px);
}

/*
 * 分栏版式下顶栏里**不出现品牌** —— 品牌（logo + 名字 + 副标语）已经挪进左栏内容那一整块，
 * 跟着内容一起垂直居中（2026-10-16 改版）；这里只留右上角的主题开关。
 * 用 `visibility: hidden` 而不是 `display: none`：后者会让这一格从栅格里消失，
 * 开关会被顶到第一列（4fr）去 —— 那里是左栏的位置，开关就跑到灰底上头了。
 */
.auth-shell__header--split .auth-shell__header-cell--brand {
  visibility: hidden;
}

.auth-shell__header--split .auth-shell__header-cell--toggle {
  grid-column: 2;
}

/* 尺子与左栏内容一致（460）：品牌左边缘 = 主张与卡片的左边缘 */
.auth-shell__header--split .auth-shell__header-cell--brand .auth-shell__header-inner {
  max-width: 460px;
}

/* 尺子与右栏卡片一致（496）：开关右边缘 = 卡片的右边缘 */
.auth-shell__header--split .auth-shell__header-cell--toggle .auth-shell__header-inner {
  max-width: 496px;
}

/* 只在品牌与开关自己身上恢复点击，其余区域继续穿透到底下的色带 */
.auth-shell__header--split .auth-shell__brand,
.auth-shell__header--split :deep(.theme-toggle) {
  pointer-events: auto;
}

/* ---------- 页脚 ---------- */

.auth-shell__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px clamp(16px, 2.5vw, 40px);
  border-top: 1px solid var(--color-border);
  font-size: 12px;
  color: var(--color-text-3);
}

/* ---------- 平板档位：窄端比例与短屏内边距 ---------- */

/*
 * 901–1240px（横屏平板 + 窄窗口）：4:6 时左栏只剩 40%，示例标题会被省略号截断
 * （实测 1080：左栏内宽 346、标题只剩 197px，`把季度目标拆成这周能做的三件事` 被切成 197 就没了）。
 * 这一档把比例收到 **45:55**，标题回到 230px 上下。**顶栏那一格必须跟着改同一个比例** ——
 * 开关与卡片都是「在自己那一格里居中」，比例不一致两者就会错开。
 * 代价：1024 时右栏变窄，卡片跟着收到 ~471（表单 415）—— 平板本来就窄，这比截断标题划算。
 */
@media (max-width: 1240px) {
  .auth-shell__main--split,
  .auth-shell__header--split {
    grid-template-columns: 45fr 55fr;
  }
}

/*
 * 短屏 + 分栏：横屏平板的高度就是 768–834，左栏内容（673–718）+ 上下内边距（48/84）会把页脚
 * 顶出首屏（实测 1180×820 整页 898、超出 78px）。这一档把两栏内边距各收一档：
 * 左栏 48/84 → 32/48、右栏 84/96 → 72/80（右栏不收的话，768 高度下会换成它当瓶颈：
 * 卡片 545 + 180 = 725 > 720）。内容侧（行内边距、列表间距）在 `AuthAside` 里同步收，
 * 两处的断点必须是同一个 `min-width: 901px`。折行档（≤900）本来就是紧凑的 32/24/40，不受影响。
 */
@media (min-width: 901px) and (max-height: 880px) {
  .auth-shell__main--split .auth-shell__aside {
    padding: 32px clamp(24px, 4vw, 56px) 48px;
  }

  .auth-shell__main--split .auth-shell__panel {
    padding: 72px clamp(24px, 4vw, 56px) 80px;
  }
}

/* ---------- 折行 ---------- */

/*
 * 折行点取 900px：1024 起（横屏平板的常见宽度 1024 / 1080 / 1180 / 1194 / 1366）都保持左右分栏 ——
 * 折成上下时左栏整块顶在前面，1024×768 下表单要滚 550px 才露出来（实测卡片 top=669，首屏只剩标题）；
 * 保持分栏后表单立刻落在首屏（1030×768 实测卡片 146–692），左栏窄一点用 45:55 兜住（见上一块）。
 * 再往下（≤900）才是真正的窄窗口：折成上下，左栏成一条通栏色带、表单在下面。
 * 顶栏也跟着「落地」：不再悬浮，回到普通的品牌左 / 开关右一条。
 */
@media (max-width: 900px) {
  .auth-shell__main--split {
    grid-template-columns: minmax(0, 1fr);
  }

  .auth-shell__header--split {
    position: static;
    display: flex;
    height: 52px;
    padding: 0 clamp(16px, 2.5vw, 40px);
    pointer-events: auto;
  }

  .auth-shell__header--split .auth-shell__header-cell {
    padding: 0;
  }

  .auth-shell__header--split .auth-shell__header-cell--brand {
    justify-content: flex-start;
  }

  .auth-shell__header--split .auth-shell__header-cell--toggle {
    justify-content: flex-end;
  }

  .auth-shell__header--split .auth-shell__header-cell--brand .auth-shell__header-inner,
  .auth-shell__header--split .auth-shell__header-cell--toggle .auth-shell__header-inner {
    max-width: none;
  }

  /* 折行后取消垂直居中：内容自上而下自然排布，只留合理内边距（放不下就整页滚动，不裁） */
  .auth-shell__main--split .auth-shell__aside {
    align-items: flex-start;
    padding: 32px 24px 40px;
  }

  .auth-shell__main--split .auth-shell__panel {
    align-items: flex-start;
    padding: 28px 24px 56px;
  }

  .auth-shell__card {
    margin: 0 auto;
  }
}
</style>
