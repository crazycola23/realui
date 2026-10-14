/**
 * 滚动演示的编排数据：分段长度、镜头目标与镜头运动都在这里，组件只负责执行。
 * 分段边界与总长由 BEATS 推出；段内位置用「占本段的比例」表达，所以改 BEATS 时
 * 段内动作按比例缩放，不会越过段界。
 */

/** 每一段占用的滚动距离（px）：02 有三次镜头运动，04 为静止段。顺序与首页流程条一致。 */
export const BEATS: readonly number[] = [200, 300, 300, 150, 250];

export const PIN_DISTANCE: number = BEATS.reduce(
  (sum, length) => sum + length,
  0,
);

/** 每一段的起点（px）。 */
export const BEAT_STARTS: number[] = BEATS.map((_, index) =>
  BEATS.slice(0, index).reduce((sum, length) => sum + length, 0),
);

/**
 * 近景倍率。与 MicroWorkbenchTour.vue 的 FOCUS_SCALE 取同值（1.55，
 * 该处注释：抽屉里的字段读起来刚好）。两处共用同一套抽屉字段，倍率保持一致；
 * 它是复制而非共享——改任一处时请同步另一处。
 */
export const FOCUS_SCALE = 1.55;

/** 模板里 data-film-target 的全部取值；镜头脚本只能引用这里列出的名字。 */
export const FILM_TARGETS = [
  'question-list',
  'source-row',
  'drawer',
  'confirm',
  'status',
  'node-fact',
  'node-content',
  'node-article',
  'run-row',
] as const;

export type FilmTarget = (typeof FILM_TARGETS)[number];
export type CameraTarget = 'panorama' | FilmTarget;

export interface CameraMove {
  /** 所在段的序号（0 起）。 */
  beat: number;
  target: CameraTarget;
  /** 起点：占本段长度的比例。 */
  at: number;
  /** 时长：占本段长度的比例。 */
  span: number;
}

/** 镜头运动。同一段内按时间先后排列且互不重叠（有测试把关）。 */
export const CAMERA_MOVES: readonly CameraMove[] = [
  // 01 明确问题：推近到问题列表，停住。
  { beat: 0, target: 'question-list', at: 0.1, span: 0.35 },
  // 02 确认事实：资料来源 → 证据抽屉 → 「确认」。
  { beat: 1, target: 'source-row', at: 0.05, span: 0.13 },
  { beat: 1, target: 'drawer', at: 0.33, span: 0.1 },
  { beat: 1, target: 'confirm', at: 0.57, span: 0.13 },
  // 03 生产内容：沿「事实 → 内容要素 → 文章」平移。
  { beat: 2, target: 'node-fact', at: 0.07, span: 0.13 },
  { beat: 2, target: 'node-content', at: 0.27, span: 0.13 },
  { beat: 2, target: 'node-article', at: 0.47, span: 0.13 },
  // 04 管理发布：静止段，无镜头运动。
  // 05 巡检复盘：推向检测运行，再拉回全景。
  { beat: 4, target: 'run-row', at: 0.08, span: 0.16 },
  { beat: 4, target: 'panorama', at: 0.6, span: 0.32 },
];

/** 点击「确认」的按压（yoyo，实际占用 2 × span）与状态翻转。 */
export const CONFIRM_PRESS = {
  beat: 1,
  target: 'confirm' as FilmTarget,
  at: 0.72,
  span: 0.035,
};
export const STATUS_FLIP = {
  beat: 1,
  target: 'status' as FilmTarget,
  at: 0.74,
};

/** 取某一段的长度与起点；序号越界是编排数据写错了，直接报错，不用 0 糊弄过去。 */
function beatLength(beat: number): number {
  const length = BEATS[beat];
  if (length === undefined) throw new RangeError(`未知的演示分段：${beat}`);
  return length;
}

function beatStart(beat: number): number {
  const start = BEAT_STARTS[beat];
  if (start === undefined) throw new RangeError(`未知的演示分段：${beat}`);
  return start;
}

/** 比例 → 时间线位置（px）。 */
export function beatTime(beat: number, fraction: number): number {
  return beatStart(beat) + fraction * beatLength(beat);
}

/** 比例 → 时长（px）。 */
export function beatSpan(beat: number, fraction: number): number {
  return fraction * beatLength(beat);
}
