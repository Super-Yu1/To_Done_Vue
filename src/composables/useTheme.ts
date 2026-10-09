/**
 * 主题三态：跟随系统（默认）/ 浅色 / 深色（见 8.7 深色模式）。
 * 状态定义在模块作用域，全站共享同一份；首次渲染前 index.html 已打好 dark 类，这里只做同步。
 *
 * 入口分工（2026-10-10 需求变更）：
 * - 顶栏按钮只切浅色 / 深色两态（toggleTheme）；
 * - 「跟随系统」只出现在个人中心的外观设置里，由 setMode 直接指定。
 */
import { readonly, ref } from 'vue'
import { THEME_KEY } from '@/constants'
import { readCssDurationMs } from '@/utils/timing'

export type ThemeMode = 'auto' | 'light' | 'dark'

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

/** 没有任何记录时一律「跟随系统」，这是用户初次进入系统的表现 */
function readStoredMode(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'auto' ? stored : 'auto'
}

const mode = ref<ThemeMode>(readStoredMode())
const isDark = ref(false)

function resolveDark(current: ThemeMode): boolean {
  return current === 'dark' || (current === 'auto' && mediaQuery.matches)
}

function apply() {
  const dark = resolveDark(mode.value)
  isDark.value = dark
  document.documentElement.classList.toggle('dark', dark)
}

const TRANSITION_CLASS = 'theme-transition'
/** --dur-theme 读不到时的兜底，与 main.css 的 800ms 对齐 */
const TRANSITION_FALLBACK_MS = 800
let transitionTimer: number | undefined

/** 切换窗口内给 <html> 挂过渡类；连续点击时重新计时，不会被上一次的清理提前摘掉 */
function playTransition() {
  const root = document.documentElement
  root.classList.add(TRANSITION_CLASS)
  window.clearTimeout(transitionTimer)
  // 多留 50ms，等过渡播完再摘，避免最后一帧被截断
  transitionTimer = window.setTimeout(() => {
    root.classList.remove(TRANSITION_CLASS)
  }, readCssDurationMs('--dur-theme', TRANSITION_FALLBACK_MS) + 50)
}

function setMode(next: ThemeMode) {
  mode.value = next
  localStorage.setItem(THEME_KEY, next)
  // 只在明暗真的发生变化时才播过渡：从「跟随系统」切到与当前相同的明暗不该有任何动画
  if (resolveDark(next) !== isDark.value) playTransition()
  apply()
}

/** 跟随系统时，系统切换主题页面实时跟随；既然是明暗变化，同样走缓慢过渡而不是硬切 */
mediaQuery.addEventListener('change', () => {
  if (mode.value !== 'auto') return
  playTransition()
  apply()
})

apply()

export function useTheme() {
  /**
   * 顶栏按钮的语义：眼前是深色就切浅色、是浅色就切深色。
   * 当前若处于「跟随系统」，按眼前实际显示的反面切一次，结果会固定成浅色或深色。
   */
  function toggleTheme() {
    setMode(isDark.value ? 'light' : 'dark')
  }

  return {
    mode: readonly(mode),
    isDark: readonly(isDark),
    setMode,
    toggleTheme,
  }
}
