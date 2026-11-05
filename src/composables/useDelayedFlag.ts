/**
 * 「慢加载」标记（2026-11-05）：条件连续为真超过 `delay` 毫秒才置真。
 *
 * 给骨架屏用：空列表往往 20–60ms 就回来了，直接按 loading 渲染骨架会闪一帧，
 * 看着像页面在抖。等 200ms 再出骨架，快请求就完全没有占位；真的慢（弱网）才给。
 *
 * 用法：
 *   const showSkeleton = useDelayedFlag(
 *     () => todo.loading && !todo.hydrated && visibleTasks.value.length === 0,
 *   )
 * 条件转假（或组件卸载）时定时器会被清掉，不会留下迟到的 true。
 */
import { onUnmounted, ref, watch } from 'vue'
import type { Ref } from 'vue'

/** 默认 200ms：比一次本地空列表往返（~60ms）长得多，又不会让弱网等太久 */
export const SLOW_LOADING_DELAY = 200

export function useDelayedFlag(source: () => boolean, delay = SLOW_LOADING_DELAY): Ref<boolean> {
  const active = ref(false)
  let timer: number | undefined

  const stop = watch(
    source,
    (pending) => {
      window.clearTimeout(timer)
      if (!pending) {
        active.value = false
        return
      }
      timer = window.setTimeout(() => {
        active.value = true
      }, delay)
    },
    { immediate: true },
  )

  onUnmounted(() => {
    window.clearTimeout(timer)
    stop()
  })

  return active
}
