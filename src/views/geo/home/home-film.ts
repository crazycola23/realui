/**
 * Home-only film score. Seconds are edit points, not network or business timers.
 *
 * 七幕的设计依据见 `docs/home-rework/design-handoff/motion-spec.json`
 * （设计方交付稿，2026-10-11 晚）+ `delivery-notes.md` 的结构说明。
 *
 * 叙事结构是刻意的两段：
 *   · 幕 01–05 = **效果**（答案里有你 → 提的是真事 → 自动成稿 → 发出去 → 如实度量）
 *   · 幕 06–07 = **凭什么**（信源地图 + 十万媒体；测看调闭环 + 真人在盯）
 *
 * 后半段不是"我们很合规"的自证，而是"我们知道别人不知道的事"的能力展示 ——
 * 判据见 `design-handoff/03-产品能力与差异化.md`：删掉之后产品会显得更普通，而不是更可疑。
 *
 * 播放由两种模式驱动（见 `DESIGN.md` §3.1）：
 *   · AUTO / LOOP —— 时间自己走（tl.play()）
 *   · MANUAL      —— 滚动位置映射到时间
 * 时间轴始终是唯一入口，`homeFilmState()` 只负责把「第几秒」翻译成「屏幕上该是什么状态」。
 */

export const HOME_FILM_DURATION = 48;

/** 幕的标识：它决定镜头讲哪一件事，不等于窗口里显示哪一页。 */
export type FilmChapterKey =
  | 'appear'
  | 'generate'
  | 'grounded'
  | 'loop'
  | 'measure'
  | 'ship'
  | 'sourcemap';

/** 窗口里能显示的工作台页面。七幕共用四页 —— 换页不是叙事单位，换镜头才是。 */
export type DemoPage = 'content' | 'facts' | 'media' | 'reports';

export const HOME_FILM_CHAPTERS = [
  {
    key: 'appear',
    page: 'facts',
    at: 0,
    number: '01',
    short: '提到你',
    title: 'AI 回答时，提到你',
    detail: '客户在 AI 里问行业问题，你的名字出现在答案里。',
  },
  {
    key: 'grounded',
    page: 'facts',
    at: 6.5,
    number: '02',
    short: '说真事',
    title: '提的，是你真做过的',
    detail: 'AI 说起你时，依据的是你确认过的事实，不是编的。',
  },
  {
    key: 'generate',
    page: 'content',
    at: 11,
    number: '03',
    short: '自动成稿',
    title: '文章自动写好，带出处',
    detail: '资料在库里，文章自动生成，每句话挂着它引的那条事实。',
  },
  {
    key: 'ship',
    page: 'content',
    at: 18,
    number: '04',
    short: '发出去',
    title: '发出去，AI 才看得到',
    detail: '内容发到你自己的账号上，AI 才可能在回答里引用到它。',
  },
  {
    key: 'measure',
    page: 'reports',
    at: 23,
    number: '05',
    short: '只报真数',
    title: '被提到多少，如实报',
    detail: '测到的给数字，没测到的不编 —— 报表里每个数都对得上。',
  },
  {
    key: 'sourcemap',
    page: 'reports',
    at: 29.5,
    number: '06',
    short: '信源规律',
    title: 'AI 怎么收录，逐家摸清',
    detail: '摸清 6 家主流 AI 的收录与更新规律，让引用可验证、有依据。',
  },
  {
    key: 'loop',
    page: 'reports',
    at: 34,
    number: '07',
    short: '测看调',
    title: '测得到，才调得准',
    detail: '测 → 看 → 调 的闭环，持续复盘；而且有人在盯，不是脚本。',
  },
] as const satisfies readonly {
  at: number;
  detail: string;
  key: FilmChapterKey;
  number: string;
  page: DemoPage;
  short: string;
  title: string;
}[];

export type FilmChapter = (typeof HOME_FILM_CHAPTERS)[number];

/** 第 03 幕逐句绑定的句子总数（引用标记按这个数依次出现）。 */
export const HOME_FILM_LINK_TOTAL = 3;

/** 每一句出处绑定的时刻。用逐点比较而不是除法取整 —— 后者会被浮点误差咬到。 */
const LINK_AT = [12.6, 14.2, 15.8] as const;

export interface FilmState {
  chapter: FilmChapter;
  page: DemoPage;
  /** 第 01 幕：候选已被人工确认（状态翻面）。 */
  admitted: boolean;
  /** 第 02 幕：不可对外的判定标签已出现。 */
  boundary: boolean;
  /** 第 03 幕：已绑定出处的句子数（0..HOME_FILM_LINK_TOTAL）。 */
  linkedCount: number;
  /** 第 04 幕：发布情况行已就位。 */
  publishReady: boolean;
  /** 第 05 幕：尚未测量的脚注已出现。 */
  unmeasuredNote: boolean;
}

export function homeFilmState(time: number): FilmState {
  const t = Math.max(0, Math.min(HOME_FILM_DURATION, time));
  const chapter = HOME_FILM_CHAPTERS.toReversed().find((item) => t >= item.at)!;
  return {
    chapter,
    page: chapter.page,
    // 01 确认：候选出现后有一次点击，状态翻面
    admitted: t >= 3.5,
    // 02 划边界：确认之后系统才判能不能对外说
    boundary: t >= 7,
    // 03 引用：逐句绑定出处
    linkedCount: LINK_AT.filter((at) => t >= at).length as number,
    // 04 发布：发布情况行就位
    publishReady: t >= 18.5,
    // 05 未测量：脚注在末段出现
    unmeasuredNote: t >= 26.5,
  };
}

export type FilmRect = { height: number; width: number; x: number; y: number; };
export type FilmFrame = { scale: number; x: number; y: number };

/** Fit the entire subject, including reading room, then clamp against the stage. */
export function homeFilmFrame(subject: FilmRect, viewport: { height: number; width: number; }, scene: { height: number; width: number; }, zoom = 1.6): FilmFrame {
  const fit = viewport.width / scene.width;
  const scale = Math.max(1, Math.min(zoom, viewport.width / ((subject.width + 96) * fit), viewport.height / ((subject.height + 80) * fit)));
  const k = fit * scale;
  const clamp = (value: number, span: number) => span >= 0 ? span / 2 : Math.max(span, Math.min(0, value));
  return {
    scale,
    x: clamp(viewport.width / 2 - (subject.x + subject.width / 2) * k, viewport.width - scene.width * k),
    y: clamp(viewport.height / 2 - (subject.y + subject.height / 2) * k, viewport.height - scene.height * k),
  };
}
