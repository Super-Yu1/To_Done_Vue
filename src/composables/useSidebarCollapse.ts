/**
 * 侧栏折叠（2026-10-26 定稿，2026-11-01 抽成 composable）。
 *
 * 两件事：**底部折叠按钮**切「收 / 放」（状态存本地，见 `usePreferences`），
 * 以及**窗口宽度跨过阈值时自动收 / 自动放**。
 *
 * 抽出来的原因：演示模式的左下角也要和前台一模一样（同一行：身份 / 主题 / 折叠），
 * 原来这套逻辑只写在 `DefaultLayout` 里，演示布局连折叠按钮都没有 —— 两处各抄一份迟早走岔。
 *
 * 关键取舍：只有「系统自动收起的」才在变宽时自动展开（`autoCollapsed`）——
 * 否则用户在宽屏手动折叠后，随便拖一下窗口就被强制展开。**手动点过按钮就清掉这个标记**。
 */
import { onMounted, onUnmounted, ref } from 'vue'
import { usePreferences } from './usePreferences'

/**
 * 自动折叠阈值 1150：展开的侧栏 272 + 内容区最小可用宽度 800 ≈ 1072，留一点余量。
 * 2026-10-26 从 1100 调到 1150 的原因：1100 附近列表宽约 716px，正好落进行布局的 720px 断点，
 * 于是「侧栏还没折叠、任务先变高」；1150 保证侧栏总是先收起来、列表始终 ≥ 720，
 * 变高的时机被推到约 910px（那时侧栏早就折叠好了），顺序因此变成「先折叠、后变高」。
 */
const NARROW_SIDEBAR_MAX = 1150

export function useSidebarCollapse() {
  const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed } = usePreferences()

  /** 本次是「系统自动收的」：只有它才允许在变宽时自动展开 */
  const autoCollapsed = ref(false)

  function syncSidebarForWidth() {
    const narrow = window.innerWidth < NARROW_SIDEBAR_MAX
    if (narrow && !sidebarCollapsed.value) {
      setSidebarCollapsed(true)
      autoCollapsed.value = true
    } else if (!narrow && autoCollapsed.value) {
      setSidebarCollapsed(false)
      autoCollapsed.value = false
    }
  }

  /** 用户主动点折叠按钮：他的选择优先，之后不再被窗口宽度左右 */
  function toggleSidebarByUser() {
    autoCollapsed.value = false
    toggleSidebar()
  }

  onMounted(() => {
    syncSidebarForWidth()
    window.addEventListener('resize', syncSidebarForWidth)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', syncSidebarForWidth)
  })

  return { sidebarCollapsed, toggleSidebar: toggleSidebarByUser }
}
