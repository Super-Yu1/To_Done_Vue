/**
 * 演示模式的示范数据（8.6）：约 24 条，覆盖两种状态（未完成 / 已完成，含已逾期若干）、
 * 四档优先级、有/无截止时间、有/无配图。**不落库**：库里没有任何演示账号，本文件就是全部数据来源。
 *
 * 时间一律用「相对今天」生成（见 utils/date 的 isoDaysFromNow），
 * 否则写死绝对日期后，「逾期若干」会随时间推移而失效。
 *
 * 2026-11-05 换主题：配图全用 `public/demo/` 的风景照，任务也改成同一个人（摄影爱好者 / 旅行）
 * 的真实待办 —— 打包原片、冲印、壁纸、相册归档这些，图文才对得上。
 */
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from '@/constants'
import { isoDaysFromNow } from '@/utils/date'
import type { Task, TaskImage, TaskPriority, TaskStatus } from '@/types'

interface DemoSeed {
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  /** 截止时间：相对今天的天数；null 表示不设截止时间 */
  dueInDays?: number | null
  dueHour?: number
  /** 记录时间：几天前（越小越新） */
  recordedDaysAgo: number
  /** 已完成的任务：几天前完成的 */
  completedDaysAgo?: number
  /** 配图数量（0 表示无配图） */
  images?: number
}

const SEEDS: DemoSeed[] = [
  {
    title: '挑出这组秋色的九宫格',
    description: '从上次出门拍的片子里挑九张，按明暗和色调排个顺序，凑齐再发。',
    status: 'TODO',
    priority: 'HIGH',
    dueInDays: 0,
    dueHour: 20,
    // 记录时间放昨天：否则深夜打开时「当前小时 - 1」会晚于今天 20:00 的截止时间
    recordedDaysAgo: 1,
    images: 4,
  },
  {
    title: '备份今年拍的原片',
    description: '手机和相机各拷一份到移动硬盘，再留一份云端，别只信单点。',
    status: 'TODO',
    priority: 'HIGH',
    dueInDays: 1,
    recordedDaysAgo: 0,
  },
  {
    title: '对比三家冲印店的报价',
    description: '六寸和八寸各问一次，含运费；顺便看能不能当天取。',
    status: 'TODO',
    priority: 'MEDIUM',
    dueInDays: 3,
    recordedDaysAgo: 1,
  },
  {
    title: '清理相机存储卡',
    description: '上个月的原片导完再格式化，卡里别留半截素材。',
    status: 'DONE',
    priority: 'MEDIUM',
    dueInDays: -2,
    recordedDaysAgo: 6,
    completedDaysAgo: 2,
  },
  {
    title: '给照片按地名建好文件夹',
    description: '按「年份 / 地点」分两级，重复导入的那批顺手删掉。',
    status: 'DONE',
    priority: 'HIGH',
    dueInDays: -4,
    recordedDaysAgo: 9,
    completedDaysAgo: 4,
  },
  {
    title: '把桌面壁纸换成这三张',
    description: '一张放书房、一张放工位，剩下那张留给手机锁屏。',
    status: 'TODO',
    priority: 'HIGH',
    dueInDays: -1,
    recordedDaysAgo: 2,
    images: 3,
  },
  {
    title: '给旧相册做一次扫描',
    description: '家里那几本胶卷相册，扫成 600dpi 的 TIFF 再统一编号。',
    status: 'TODO',
    priority: 'LOW',
    recordedDaysAgo: 3,
  },
  {
    title: '预约周末的日出机位',
    description: '查好日出时间和潮位，提前半小时到，脚架和快门线都带上。',
    status: 'TODO',
    priority: 'HIGH',
    dueInDays: 5,
    recordedDaysAgo: 3,
  },
  {
    title: '修一组夜景的噪点',
    description: '暗部提亮后噪点明显，用堆栈降噪试一版，别把细节磨平。',
    status: 'DONE',
    priority: 'MEDIUM',
    dueInDays: -6,
    recordedDaysAgo: 12,
    completedDaysAgo: 6,
  },
  {
    title: '整理今年拍到的海和鸟',
    description: '海边的、湿地的分两批，挑十张做成一个横版合集。',
    status: 'TODO',
    priority: 'MEDIUM',
    dueInDays: 8,
    recordedDaysAgo: 4,
    images: 4,
  },
  {
    title: '学一下包围曝光',
    description: '光比大的场景拍三张不同快门，回来合成，别只靠拉阴影。',
    status: 'TODO',
    priority: 'LOW',
    dueInDays: 6,
    recordedDaysAgo: 4,
  },
  {
    title: '选一只出远门用的相机包',
    description: '能塞下一机两镜加脚架绑带，登机尺寸别超标。',
    status: 'TODO',
    priority: 'MEDIUM',
    dueInDays: 2,
    recordedDaysAgo: 5,
  },
  {
    title: '把旅行花销记成一张表',
    description: '交通、住宿、门票分三列，月底看哪块超了。',
    status: 'DONE',
    priority: 'MEDIUM',
    dueInDays: -8,
    recordedDaysAgo: 14,
    completedDaysAgo: 8,
  },
  {
    title: '给相册补上地名和时间',
    description: '每张照片补一句「在哪、什么时候」，几年后还认得出。',
    status: 'DONE',
    priority: 'HIGH',
    dueInDays: -3,
    recordedDaysAgo: 11,
    completedDaysAgo: 3,
  },
  {
    title: '打印六张照片寄给爸妈',
    description: '挑风景的、不挑人像；六寸光面带白边，背面写两句。',
    status: 'TODO',
    priority: 'MEDIUM',
    dueInDays: 0,
    dueHour: 23,
    recordedDaysAgo: 1,
    images: 3,
  },
  {
    title: '导出 RAW 到 NAS 归档',
    description: '按拍摄月份建目录，导完校验一遍大小，再清相机卡。',
    status: 'TODO',
    priority: 'HIGH',
    dueInDays: 12,
    recordedDaysAgo: 6,
  },
  {
    title: '挑一张做年度照片日历',
    description: '十二个月各一张，先排季节再调色，别全是大太阳。',
    status: 'TODO',
    priority: 'MEDIUM',
    dueInDays: 9,
    recordedDaysAgo: 7,
    images: 3,
  },
  {
    title: '对比两个修图软件的降噪',
    description: '同一张夜景各处理一遍，放大到 100% 比细节。',
    status: 'DONE',
    priority: 'HIGH',
    dueInDays: -10,
    recordedDaysAgo: 16,
    completedDaysAgo: 10,
  },
  {
    title: '订下个月的民宿',
    description: '带厨房、能停车，离拍摄点二十分钟车程以内。',
    status: 'TODO',
    priority: 'MEDIUM',
    dueInDays: 4,
    recordedDaysAgo: 8,
  },
  {
    title: '把重复导入的照片删掉',
    description: '同一个文件夹导了两次，按文件名和拍摄时间比对。',
    status: 'DONE',
    priority: 'LOW',
    dueInDays: -12,
    recordedDaysAgo: 18,
    completedDaysAgo: 12,
  },
  {
    title: '给旅行相册补上地名',
    description: '按行程顺序排，边角拍糊的单独放附录。',
    status: 'TODO',
    priority: 'MEDIUM',
    dueInDays: 15,
    recordedDaysAgo: 10,
  },
  {
    title: '洗一张 30×40 挂客厅',
    description: '选横向的、留白多的，装裱别太厚。',
    status: 'DONE',
    priority: 'LOW',
    dueInDays: -5,
    recordedDaysAgo: 13,
    completedDaysAgo: 5,
  },
  {
    title: '读一本构图的入门书',
    description: '先看三分法和引导线两章，周末出去实拍一次。',
    status: 'TODO',
    priority: 'LOW',
    dueInDays: 7,
    recordedDaysAgo: 11,
  },
  {
    title: '检查移动硬盘剩余空间',
    description: '低于 500G 就该清一次，顺便把坏道检测跑起来。',
    status: 'TODO',
    priority: 'MEDIUM',
    dueInDays: -1,
    recordedDaysAgo: 12,
  },
]

/**
 * 演示配图（2026-11-05）：`public/demo/` 里的真实照片（用户提供的 4K 壁纸，按日期重命名成 demo-01…17）。
 * **17 张全部用上**：按任务顺序排成 4 / 3 / 4 / 3 / 3 五组，下标由前面各条 `images` 累加（见 `PHOTO_START`）。
 * 列表缩略图裁成方形、灯箱按 16:9 显示；封面尽量用体积小的几张，首屏只有四张。
 */
const DEMO_PHOTOS = [
  // 挑出这组秋色的九宫格（4 张）：西湖、秋景、池杉林、丹霞
  'demo-01.jpg',
  'demo-13.jpg',
  'demo-15.jpg',
  'demo-09.jpg',
  // 把桌面壁纸换成这三张（3 张）：威尼斯、阅览室、市集广场
  'demo-12.jpg',
  'demo-14.jpg',
  'demo-11.jpg',
  // 整理今年拍到的海和鸟（4 张）：鸬鹚、企鹅、沙丘鹤、划船
  'demo-10.jpg',
  'demo-06.jpg',
  'demo-16.jpg',
  'demo-17.jpg',
  // 打印六张照片寄给爸妈（3 张）：马丘比丘、冰川河、葡萄园
  'demo-05.jpg',
  'demo-08.jpg',
  'demo-07.jpg',
  // 挑一张做年度照片日历（3 张）：斋浦尔、风筝节、空间站看地球
  'demo-03.jpg',
  'demo-04.jpg',
  'demo-02.jpg',
]

/** 每条任务的第一张图在 `DEMO_PHOTOS` 里的下标：由前面各条的配图数累加，不手写偏移 */
const PHOTO_START = SEEDS.reduce<number[]>((starts, _seed, index) => {
  const previousStart = starts[index - 1] ?? 0
  const previousCount = SEEDS[index - 1]?.images ?? 0
  starts.push(index === 0 ? 0 : previousStart + previousCount)
  return starts
}, [])

function buildImages(taskIndex: number, count: number): TaskImage[] {
  const start = PHOTO_START[taskIndex] ?? 0
  return Array.from({ length: count }, (_, index) => {
    const file = DEMO_PHOTOS[start + index] ?? DEMO_PHOTOS[0]
    return {
      id: `demo-image-${taskIndex + 1}-${index + 1}`,
      sortOrder: index + 1,
      objectKey: `task/demo/202610/${file}`,
      url: `/demo/${file}`,
    }
  })
}

export const DEMO_TASKS: Task[] = SEEDS.map((seed, index) => ({
  id: `demo-${String(index + 1).padStart(2, '0')}`,
  title: seed.title,
  description: seed.description ?? null,
  status: seed.status,
  statusLabel: TASK_STATUS_LABEL[seed.status],
  priority: seed.priority,
  priorityLabel: TASK_PRIORITY_LABEL[seed.priority],
  dueDate: seed.dueInDays === null || seed.dueInDays === undefined ? null : isoDaysFromNow(seed.dueInDays, seed.dueHour ?? 18),
  completedAt:
    seed.status === 'DONE' ? isoDaysFromNow(-(seed.completedDaysAgo ?? 1), 15) : null,
  /*
   * 「今天记录」的取当前时刻之前一刻：演示模式里新建的任务用的是真实当前时间，
   * 若种子固定写 09:00，在凌晨打开时新建的任务反而会掉到它们下面，看着像没生效。
   */
  recordedAt:
    seed.recordedDaysAgo === 0
      ? isoDaysFromNow(0, Math.max(0, new Date().getHours() - 1))
      : isoDaysFromNow(-seed.recordedDaysAgo, 9),
  images: buildImages(index, seed.images ?? 0),
}))
// 不在这里排序：展示顺序由 utils/task 的 groupTasksByState 统一决定，避免两处排序规则打架
