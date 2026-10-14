<script lang="ts" module>
/**
 * 剧本数据与站点函数（2026-10-10，任务 T3）。
 *
 * 放在 `<script module>` 而不是单独文件：本组件的写域只有
 * `AgentChatScene.vue` 与 `AgentChatScene.test.ts` 两个文件，
 * 数据与站点又必须能被测试独立地重新累加一遍来验证，所以同文件、可导出。
 *
 * 三条不变量（测试逐条钉住）：
 * 1. `beatStart(i) + span(i) === beatEnd(i)`，且 `beatEnd(i) === beatStart(i + 1)`；
 * 2. 每段 span 都等于 `TYPE_CONSTANT + TYPE_SPEED × 该段字数`，
 *    也就是时间轴上的宽度等于它真实需要的宽度，不会被整体拉长或压扁；
 * 3. 越界索引返回 `undefined`，不返回 0 —— 静默的 0 会让配置错误变成「从头再播」。
 *
 * 内容红线：无百分比、无倍数断言、无真实客户名；
 * 语境固定为脱敏示范（高新材料制造 / 环保资质认证）。
 */

/**
 * 用户在发出消息前的停顿（秒）。
 *
 * 用户段保留一点点停顿是刻意的：真人不会「啪」地把一句话贴上去，
 * 这一瞬就是按下回车前的那口气。
 */
export const TYPE_CONSTANT = 0.16;

/**
 * Agent 开始吐字前的「思考」时长（秒）。
 *
 * 这是本轮重做的核心。以前 agent 是「显形即吐字」，观众看到文字自己长出来，
 * 没有任何「它在处理」的过程 —— 这就是静态感的来源。现在每个 agent 回合都先过
 * 一段思考相位：气泡里是 shimmer 骨架 + 本轮工作标签，THINK_SPAN 秒后才被正文替换。
 *
 * 数值取自 Sierra 与 Intercom Fin 的对话演示节奏。低于 400ms 感觉不到，
 * 高于 900ms 会显得卡住，620ms 落在能感知又不拖沓的区间。
 */
export const THINK_SPAN = 0.62;

/** 逐字速度：22ms/字，落在规格要求的 18–24ms 区间内。 */
export const TYPE_SPEED = 0.022;

/**
 * Agent 一段说完后，留给观众读它的时间（秒）。
 *
 * 没有这一段的话，七轮会在七秒内滚完 —— 观众只看到一串气泡飞过去，
 * 一个字都读不到，观感反而比静态更差。加上之后全片约 11 秒，
 * 落在这类产品演示的舒适区（Sierra 的 hero 对话循环也在 10 秒量级）。
 */
export const READ_HOLD = 0.9;

/** 用户段说完后的停顿。比 Agent 段短 —— 用户消息通常一句话就完了。 */
export const TAIL_HOLD = 0.28;

/** 内容形态标签，取自平台 `GEO_ENUM_LABELS.ContentMode.media_feature`。 */
export const CONTENT_MODE_LABEL = '品牌专题稿';

export interface ChatToolCall {
  /** 左侧动作名。 */
  name: string;
  /** 中间的「已执行」状态位。 */
  state: string;
  /** 右侧结果标签。 */
  result: string;
}

export interface ChatLoading {
  /**
   * 思考相位的工作标签：这一轮 Agent 正在做什么。
   *
   * 它不是装饰性文案 —— 每个 agent 回合都必须写清楚，否则思考相位就只剩
   * 两根骨架条在闪，观众不知道它在忙什么。文案取自平台上真实存在的动作名。
   */
  label: string;
}

export type ChatBeat =
  | {
      kind: 'agent';
      loading?: ChatLoading;
      /** Agent 的汇报正文；也是它那一段的打字内容。 */
      text: string;
      tool?: ChatToolCall;
    }
  | {
      kind: 'user';
      /** 用户一句话；也是它那一段的打字内容。 */
      title: string;
    };

/**
 * 七段剧本，覆盖「上传资料 → 提取候选 → 批量确认 → 创建内容任务」的完整闭环。
 * 每一段都对应平台上一个真实存在的动作，不是装饰性对话。
 */
export const SCRIPT: readonly ChatBeat[] = [
  {
    kind: 'user',
    title: '把上个月的环保认证资料整理成可引用的事实',
  },
  {
    kind: 'agent',
    text: '收到，已解析这批资料，正在按事实类型归类。',
    loading: { label: '解析环保资质认证资料' },
  },
  {
    kind: 'agent',
    text: '提取出 12 条候选事实，其中 8 条证据完整，另有 4 条来源链接待验证。',
    loading: { label: '比对证据与来源链接' },
    tool: {
      name: '提取事实候选',
      state: '已执行',
      result: '候选 12 条 · 完整 8 条',
    },
  },
  {
    kind: 'user',
    title: '确认前 8 条，剩下标记为待核',
  },
  {
    kind: 'agent',
    text: '已批量确认 8 条，4 条转入待核队列，确认后的事实才允许被内容引用。',
    loading: { label: '批量确认并锁定事实库' },
    tool: { name: '批量确认', state: '已执行', result: '事实库已锁定 · 12 条' },
  },
  {
    kind: 'user',
    title: '据此生成 3 篇品牌专题稿',
  },
  {
    kind: 'agent',
    text: '已创建内容任务，生成范围锁定在环保资质认证与高新材料制造，不会引入未确认的说法。',
    loading: { label: `生成${CONTENT_MODE_LABEL}` },
    tool: {
      name: '创建内容任务',
      state: '已执行',
      result: `${CONTENT_MODE_LABEL} · 3 篇`,
    },
  },
];

/** 某一段的打字内容（用户段是 title，Agent 段是 text）。 */
export function beatText(beat: ChatBeat): string {
  return beat.kind === 'agent' ? beat.text : beat.title;
}

/**
 * 某一段的静止时长：Agent 段是思考相位，用户段是发出前的停顿。
 *
 * 只由消息类型决定，不给单段开特例 —— 否则时间轴会退化成一堆手写数字，
 * 改一处忘一处。
 */
export function beatHold(beat: ChatBeat): number {
  return beat.kind === 'agent' ? THINK_SPAN : TYPE_CONSTANT;
}

/** 某一段吐字结束后到下一段开始之间的静止时长。 */
export function beatTail(beat: ChatBeat): number {
  return beat.kind === 'agent' ? READ_HOLD : TAIL_HOLD;
}

/**
 * 某一段在时间轴上占的宽度 = 吐字前静止 + 打字 + 吐字后静止。
 *
 * 三段都是同一个来源，改速度或改停顿，整条时间轴跟着变，没有第二处要同步。
 */
export function beatSpan(beat: ChatBeat): number {
  return beatHold(beat) + TYPE_SPEED * beatText(beat).length + beatTail(beat);
}

/** 第 index 段的起点（秒）。越界返回 undefined。 */
export function beatStart(index: number): number | undefined {
  if (!Number.isInteger(index) || index < 0 || index >= SCRIPT.length) {
    return undefined;
  }
  let at = 0;
  for (let i = 0; i < index; i++) {
    at += beatSpan(SCRIPT[i] as ChatBeat);
  }
  return at;
}

/** 第 index 段的终点（秒）。越界返回 undefined。 */
export function beatEnd(index: number): number | undefined {
  const start = beatStart(index);
  if (start === undefined) return undefined;
  return start + beatSpan(SCRIPT[index] as ChatBeat);
}

/** 剧本总长（秒），由各段独立累加得出。 */
export const TOTAL_SPAN = SCRIPT.reduce(
  (sum, beat) => sum + beatSpan(beat),
  0,
);

/** 剧本节拍数。 */
export const BEAT_COUNT = SCRIPT.length;
</script>

<script lang="ts" setup>
/**
 * 「用户通过 AI 对话直接操控 GEO 平台」的场景组件（2026-10-10，任务 T3）。
 *
 * 定位：首页支撑区块的独立演示件，**不依赖 index.vue 的任何变量**。
 * 对外接口只有两个：
 *   <AgentChatScene :active="boolean" @complete="..." />
 *   - active=true  → 从初始静态态开始播剧本；
 *   - active=false → 立刻回到初始静态态（只留用户第一句，没有任何运行痕迹）；
 *   - 剧本播完 → emit 一次 complete。
 *
 * 排版尺度取自 `docs/design/attio-design-baseline-2026-10-10.md`：
 * 字重只用 500/600、圆角只用 8/12/16/999、阴影多层叠加（不用单层 `0 4px 12px`）、
 * 大区块留白按 152/112 的量级给。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { gsap } from 'gsap';

const props = defineProps<{ active: boolean }>();
const emit = defineEmits<{ complete: [] }>();

/** 已进入可见范围的节拍数。1 = 只留用户第一句（初始静态态）。 */
const revealed = ref(1);
/** 正在逐字吐出的节拍下标；-1 表示没有。 */
const typing = ref(-1);
/**
 * 正在思考（已显形、还没开始吐字）的节拍下标；-1 表示没有。
 *
 * 与 `typing` 互斥：思考相位的结束就是吐字相位的开始。这是本组件里
 * 唯一一处「AI 正在处理」的可视信号，气泡的骨架屏就挂在它上面。
 */
const thinking = ref(-1);
/**
 * 各节拍工具卡的执行阶段。
 *
 * 三态而不是「有 / 没有」：观众需要看到动作从下达到完成的过程，
 * 一次性出现的勾号只是一张截图。
 */
const toolPhase = ref<Record<number, 'done' | 'running'>>({});
/** 每个节拍已吐出的字数。 */
const typed = ref<Record<number, number>>({});
/**
 * 用户手动展开的折叠步骤下标。
 *
 * 中间步骤被新步骤顶下去后收成一行摘要（Devin 手法），观众想回看就点开；
 * 点开只增不减 —— 一个自动播放的演示件不需要可逆的手风琴。
 */
const manualOpen = ref<Record<number, boolean>>({});
/** 完成回调只发一次。 */
const completed = ref(false);
/**
 * 静态终态开关：reduced-motion，或剧本已播完的收尾。
 * 它与 `revealed` 共用同一份渲染口径，所以「终态」只有一处定义。
 */
const isStaticTerminal = ref(false);
/** 组件是否已挂载：挂载前不建时间轴，也不重复处理 active。 */
const mounted = ref(false);
/**
 * reduced-motion 首读。GSAP 的 matchMedia 在挂载时才登记；
 * 属性 watch 与挂载回调都需要这个值来判断走「完整终态」还是「播放」，
 * 所以在这里先同步读一次。
 */
const reducePreferred = ref(false);
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  reducePreferred.value = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
}

const visibleCount = computed(() =>
  isStaticTerminal.value ? BEAT_COUNT : revealed.value,
);

/**
 * 工具卡的显示阶段。
 *
 * 终态一律是「已完成」—— 收尾时观众看到的必须是三张已打勾的回执，
 * 不能停在执行中的虚线上。渲染口径只在这一处定义，模板不再自己判断。
 */
const toolStages = computed<Record<number, 'done' | 'running' | undefined>>(() => {
  if (!isStaticTerminal.value) {
    return toolPhase.value;
  }
  const settled: Record<number, 'done'> = {};
  for (const [index, beat] of SCRIPT.entries()) {
    if (beat.kind === 'agent' && beat.tool) {
      settled[index] = 'done';
    }
  }
  return settled;
});

/** 正在逐字吐出的那一段。 */
function isTyping(index: number): boolean {
  return !isStaticTerminal.value && typing.value === index;
}

/** 打字光标：只在正在吐字时出现。 */
function showCaret(index: number): boolean {
  return isTyping(index);
}

/**
 * 该段是否处于思考相位。
 *
 * 终态下恒为 false —— 收尾时观众看到的必须是完整正文，不能停在骨架屏上。
 */
function isThinking(index: number): boolean {
  return !isStaticTerminal.value && thinking.value === index;
}

/**
 * 静止态的渲染口径：**不播放时**，已经露面的段落一律显示完整文字。
 *
 * 否则初始态会是一个空气泡（revealed=1 但没人给它补字数），
 * 观众第一眼看到「用户发了一条空白消息」。播放中才走 `typed` 的逐字切片。
 */
function isAtRest(): boolean {
  return isStaticTerminal.value || typing.value < 0;
}

function spokenText(index: number): string {
  const beat = SCRIPT[index] as ChatBeat | undefined;
  if (!beat) return '';
  const full = beatText(beat);
  if (isAtRest() || index < revealed.value - 1) return full;
  const n = Math.max(0, Math.min(typed.value[index] ?? 0, full.length));
  return full.slice(0, n);
}

/**
 * Agent 步骤是否展开。折叠时只占一行摘要，面板不再被每条中间消息轮番撑高。
 *
 * - 播放中：只有最新一条展开（正在说话的那条），之前的 agent 步骤收起；
 * - 用户点开过的：保持展开；
 * - 减动效终态：全部展开 —— 没有播放过程，必须一次给全信息；
 * - 播完的静止终态：只留最后一条（成品）展开，之前的收起成摘要，和播放中同一副面孔。
 *
 * 用户段不走这里：它本来就一行，不折叠。
 */
function isAgentExpanded(index: number): boolean {
  if (isStaticTerminal.value) {
    if (reducePreferred.value) return true;
    return index === BEAT_COUNT - 1 || Boolean(manualOpen.value[index]);
  }
  if (manualOpen.value[index]) return true;
  return index === revealed.value - 1;
}

/** 展开一条折叠的中间步骤（只增不减）。 */
function openStep(index: number) {
  manualOpen.value = { ...manualOpen.value, [index]: true };
}

/**
 * 工具卡执行相位的确定性进度（0–1）。
 *
 * 直接复用该段已吐字的比例 —— 工具卡与吐字并行，吐到哪儿就执行到哪儿。
 * 用确定性进度替掉原来的转圈图标：转圈只说明「在转」，进度说明「还剩多少」。
 */
function toolProgress(index: number): number {
  const beat = SCRIPT[index] as ChatBeat | undefined;
  if (!beat) return 0;
  const chars = beatText(beat).length;
  if (chars <= 0) return 1;
  return Math.max(0, Math.min(1, (typed.value[index] ?? 0) / chars));
}

const rootRef = ref<HTMLElement | null>(null);
const viewportRef = ref<HTMLElement | null>(null);

/**
 * 把最新一条带回视野。
 *
 * 这是上一版最伤的一处：面板固定 480px 高，而七段消息总高约 640px，
 * 播到第五段之后新消息就落在可视区外，观众看到的是一段再也不动的旧对话 ——
 * 「看着像静态」的观感有一半来自这里，而不是动效本身不够。
 */
function scrollToLatest() {
  const el = viewportRef.value;
  if (!el) return;
  const top = el.scrollHeight - el.clientHeight;
  if (top <= 1) return;
  el.scrollTo({ top, behavior: reducePreferred.value ? 'auto' : 'smooth' });
}

/** 回到顶部。重置与终态都要用，否则下一轮会从半截开始播。 */
function resetScroll() {
  viewportRef.value?.scrollTo({ top: 0, behavior: 'auto' });
}

let motion: ReturnType<typeof gsap.matchMedia> | undefined;
let timeline: ReturnType<typeof gsap.timeline> | undefined;
let enterTween: gsap.core.Tween | undefined;
let enterTimer: ReturnType<typeof setTimeout> | undefined;

/** 新消息入场：下方 8px 淡入，260ms，power2.out。 */
const ENTER_SHIFT = 8;
const ENTER_DURATION = 0.26;

function killEnter() {
  if (enterTimer !== undefined) {
    clearTimeout(enterTimer);
    enterTimer = undefined;
  }
  enterTween?.kill();
  enterTween = undefined;
}

function resetToInitial() {
  killEnter();
  timeline?.kill();
  timeline = undefined;
  typing.value = -1;
  thinking.value = -1;
  typed.value = {};
  toolPhase.value = {};
  manualOpen.value = {};
  revealed.value = 1;
  isStaticTerminal.value = false;
  resetScroll();
}

function showTerminal() {
  killEnter();
  timeline?.kill();
  timeline = undefined;
  typing.value = -1;
  thinking.value = -1;
  typed.value = {};
  toolPhase.value = {};
  manualOpen.value = {};
  revealed.value = BEAT_COUNT;
  isStaticTerminal.value = true;
  resetScroll();
  if (!completed.value) {
    completed.value = true;
    emit('complete');
  }
}

/** 工具卡完成位的提前量（秒）：段末前多久翻成已完成。 */
const TOOL_SETTLE = 0.14;
/** 工具卡最短执行时长（秒）：语速快的段也不能让过程一闪而过。 */
const TOOL_MIN_RUN = 0.34;

/**
 * 剧本时间轴。
 *
 * 每段固定占 `[beatStart(i), beatEnd(i))`，段内再分相位：
 *
 *   起点 ── 显形 + 入场（Agent 段同时进入思考相位）
 *    ├─ hold   Agent 段：气泡挂骨架屏与工作标签；用户段：发出前的停顿
 *    ├─ 吐字   时长恒等于 `字数 × 速度`
 *    └─ 工具卡 与吐字并行：吐字开始时进场，段末翻成已完成
 *
 * 工具卡刻意与吐字并行 —— 真实产品里 Agent 是一边说一边调的，
 * 等它说完再开始执行反而假。
 */
function buildTimeline() {
  if (!rootRef.value) return undefined;

  const tl = gsap.timeline({
    paused: true,
    onComplete: () => {
      completed.value = true;
      typing.value = -1;
      thinking.value = -1;
      isStaticTerminal.value = true;
      emit('complete');
    },
  });

  // 起点占位，保证空剧本也有确定的时长。
  tl.set({}, {}, 0);

  for (let index = 0; index < BEAT_COUNT; index++) {
    const beat = SCRIPT[index] as ChatBeat | undefined;
    if (!beat) continue;
    const start = beatStart(index) ?? 0;
    const hold = beatHold(beat);
    const end = beatEnd(index) ?? start;
    const chars = beatText(beat).length;
    // 打字时长直接等于「字数 × 速度」，不从段宽倒推 —— 段宽本身就是用同一个
    // 式子加出来的，两边互为定义，任何一边改了另一边的断言会立刻红。
    const typeDuration = TYPE_SPEED * chars;
    const typeAt = start + hold;

    tl.fromTo(
      typed.value,
      { [index]: 0 },
      {
        [index]: chars,
        duration: typeDuration,
        ease: 'none',
        immediateRender: false,
        snap: { [index]: 1 },
        onStart: () => {
          // 思考相位在这里把接力棒交给吐字相位。
          thinking.value = -1;
          typing.value = index;
        },
      },
      typeAt,
    );

    // 段末补齐：打字补间的取整残差在这里被抹平，整段文字一定吐完。
    tl.set(typed.value, { [index]: chars }, typeAt + typeDuration);

    // 工具卡：吐字开始时下达，段末前翻成已完成。
    if (beat.kind === 'agent' && beat.tool) {
      tl.call(
        () => {
          toolPhase.value = { ...toolPhase.value, [index]: 'running' };
        },
        undefined,
        typeAt,
      );
      tl.call(
        () => {
          toolPhase.value = { ...toolPhase.value, [index]: 'done' };
        },
        undefined,
        Math.max(end - TOOL_SETTLE, typeAt + TOOL_MIN_RUN),
      );
    }

    // 起点显形 + 入场。用 call 而不是 set：revealed 是渲染口径的唯一入口。
    tl.call(
      () => {
        revealed.value = Math.max(revealed.value, index + 1);
        if (beat.kind === 'agent') {
          thinking.value = index;
        }
        // v-show 让七段始终留在 DOM 里，所以这里能同步拿到元素；
        // 入场补间因此不必等下一帧。
        const el = rootRef.value?.querySelector<HTMLElement>(
          `[data-chat-beat="${index}"]`,
        );
        if (!el) return;
        enterTween?.kill();
        // 两种消息的入场刻意不同：用户消息像刚被按下的回车（缩放 + 侧移 + 轻微过冲），
        // Agent 消息像处理完浮上来的结果（纯上移）。方向感让「谁在说话」一眼看得出。
        enterTween =
          beat.kind === 'user'
            ? gsap.fromTo(
                el,
                { opacity: 0, scale: 0.96, x: 12 },
                {
                  opacity: 1,
                  scale: 1,
                  x: 0,
                  duration: ENTER_DURATION,
                  ease: 'back.out(1.6)',
                  overwrite: true,
                },
              )
            : gsap.fromTo(
                el,
                { opacity: 0, y: ENTER_SHIFT },
                {
                  opacity: 1,
                  y: 0,
                  duration: ENTER_DURATION,
                  // expo.out 是非对称缓动：起手快、收尾长，比对称的 power2 更有生气。
                  ease: 'expo.out',
                  overwrite: true,
                },
              );
      },
      undefined,
      start,
    );
  }

  // 收尾：光标熄掉，可见范围锁定在全部节拍。
  tl.call(
    () => {
      typing.value = -1;
      thinking.value = -1;
    },
    undefined,
    TOTAL_SPAN,
  );
  tl.to({}, { duration: 0.02 }, TOTAL_SPAN);

  return tl;
}

function start() {
  resetToInitial();
  timeline = buildTimeline();
  timeline?.play();
}

onMounted(() => {
  mounted.value = true;
  motion = gsap.matchMedia();
  // 两条条件都要登记：只登记 no-preference 的话，减动效用户根本不进回调，
  // 终态就会停在「只显示第一句」的半截样子。
  motion.add(
    {
      animate: '(prefers-reduced-motion: no-preference)',
      reduce: '(prefers-reduced-motion: reduce)',
    },
    ({ conditions }) => {
      if (conditions?.reduce) {
        reducePreferred.value = true;
        showTerminal();
        return;
      }
      if (props.active) start();
      else resetToInitial();
    },
  );
});

/**
 * 新消息出现后把它带回视野。
 *
 * 走 watch 而不是在时间轴的 call 里直接调：call 触发时 Vue 还没把新消息渲染出来，
 * 那时读到的是旧的 scrollHeight，滚过去会永远差一条。
 */
watch(visibleCount, () => {
  void nextTick(() => scrollToLatest());
});

watch(
  () => props.active,
  (active) => {
    // 挂载时的首次取值由 matchMedia 分支处理，这里只接挂载之后的翻身。
    if (!mounted.value) return;
    if (reducePreferred.value) {
      showTerminal();
      return;
    }
    if (active) start();
    else resetToInitial();
  },
);

onBeforeUnmount(() => {
  motion?.revert();
  killEnter();
  timeline?.kill();
  timeline = undefined;
});
</script>

<template>
  <section
    ref="rootRef"
    class="agent-chat"
    :class="{ 'is-terminal': isStaticTerminal }"
    aria-label="通过对话驱动 GEO 平台运营的演示"
  >
    <!-- 卡片里不再自带标题：外面那句「说一句话，活就派下去了。」已经把这件事说完了，
         再加一行"直接用对话驱动平台"是同屏两个标题讲同一件事。
         卡片从对话流直接开始，视线落在第一句上。 -->
    <div ref="viewportRef" class="agent-chat__viewport">
      <ol class="agent-chat__flow">
        <li
          v-for="(beat, index) in SCRIPT"
          v-show="index < visibleCount"
          :key="index"
          class="agent-chat__beat"
          :class="`agent-chat__beat--${beat.kind}`"
          :data-chat-beat="index"
        >
          <span
            v-if="beat.kind === 'agent'"
            class="agent-chat__avatar agent-chat__avatar--agent"
            aria-hidden="true"
          >
            <svg viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1.6 14.2 5v6L8 14.4 1.8 11V5L8 1.6Z"
                stroke="currentColor"
                stroke-width="1.3"
                stroke-linejoin="round"
              />
              <circle cx="8" cy="8" r="2.1" fill="currentColor" />
            </svg>
          </span>
          <span v-else class="agent-chat__avatar agent-chat__avatar--user" aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5.6" r="2.6" fill="currentColor" />
              <path
                d="M2.6 14c0-2.7 2.4-4.6 5.4-4.6s5.4 1.9 5.4 4.6"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </span>

          <div class="agent-chat__body">
            <template v-if="beat.kind === 'user'">
              <div class="agent-chat__bubble agent-chat__bubble--user">
                <span class="agent-chat__text">{{ spokenText(index) }}</span>
                <span v-if="showCaret(index)" class="agent-chat__caret" aria-hidden="true"></span>
              </div>
            </template>

            <template v-else>
              <!-- 展开态：思考 / 吐字气泡 + 工具卡。折叠态：被新步骤顶下去的中间步骤
                   收成一行摘要（Devin 手法），点开才铺开 —— 面板不再被每条中间消息轮番撑高。 -->
              <template v-if="isAgentExpanded(index)">
                <!-- 思考相位与吐字相位共用同一个气泡：骨架屏被正文原位替换，布局不跳。 -->
                <div class="agent-chat__bubble agent-chat__bubble--agent">
                  <span v-if="isThinking(index)" class="agent-chat__thinking">
                    <span v-if="beat.loading" class="agent-chat__thinking-label">
                      <span class="agent-chat__thinking-pulse" aria-hidden="true"></span>
                      {{ beat.loading.label }}
                    </span>
                    <span class="agent-chat__skeleton" aria-hidden="true">
                      <i></i><i></i>
                    </span>
                  </span>

                  <template v-else>
                    <span class="agent-chat__text">{{ spokenText(index) }}</span>
                    <span v-if="showCaret(index)" class="agent-chat__caret" aria-hidden="true"></span>
                  </template>
                </div>

                <!-- 工具卡三态：执行中确定性进度环 + 扫光，完成后打勾并展开结果。 -->
                <div
                  v-if="beat.tool && toolStages[index]"
                  class="agent-chat__tool"
                  :class="`agent-chat__tool--${toolStages[index]}`"
                  :data-tool-phase="toolStages[index]"
                >
                  <span class="agent-chat__tool-icon" aria-hidden="true">
                    <svg v-if="toolStages[index] === 'done'" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M3.4 8.3 6.5 11.4l6-6.4"
                        stroke="currentColor"
                        stroke-width="1.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    <span
                      v-else
                      class="agent-chat__tool-ring"
                      :style="{ '--p': toolProgress(index) }"
                    ></span>
                  </span>
                  <span class="agent-chat__tool-name">{{ beat.tool.name }}</span>
                  <span class="agent-chat__tool-state">
                    {{ toolStages[index] === 'done' ? beat.tool.state : '执行中' }}
                  </span>
                  <span class="agent-chat__tool-result">{{ beat.tool.result }}</span>
                  <span
                    v-if="toolStages[index] === 'running'"
                    class="agent-chat__tool-scan"
                    aria-hidden="true"
                  ></span>
                </div>
              </template>
              <button
                v-else
                type="button"
                class="agent-chat__fold"
                aria-expanded="false"
                @click="openStep(index)"
              >
                <span class="agent-chat__fold-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3.4 8.3 6.5 11.4l6-6.4"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
                <span class="agent-chat__fold-label">{{ beat.loading?.label }}</span>
                <span class="agent-chat__fold-chevron" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none">
                    <path
                      d="M6 4l4 4-4 4"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
              </button>
            </template>
          </div>
        </li>
      </ol>
    </div>

    <footer class="agent-chat__foot">
      <span class="agent-chat__foot-item">对话驱动 · 全流程演示</span>
      <span class="agent-chat__foot-sep" aria-hidden="true"></span>
      <span class="agent-chat__foot-item">{{ BEAT_COUNT }} 轮对话</span>
      <span class="agent-chat__foot-sep" aria-hidden="true"></span>
      <span class="agent-chat__foot-item">脱敏示范 · 高新材料制造 · 环保资质认证</span>
    </footer>
  </section>
</template>

<style scoped>
/*
 * 局部尺度令牌。整块组件自包含：不引用 index.vue 的任何东西，
 * 只用这里自己定义的属性，换宿主页面也不会串色。
 */
.agent-chat {
  --chat-ink: #0b0d18;
  --chat-ink-2: #475569;
  --chat-ink-3: #94a3b8;
  --chat-line: #e2e8f0;
  --chat-line-strong: #cbd5e1;
  --chat-surface: #fff;
  --chat-soft: #f8fafc;
  --chat-tool: #f1f5f9;
  --chat-brand: #1d4ed8;
  --chat-brand-soft: #eff6ff;
  --chat-brand-border: #bfdbfe;
  --chat-ok: #059669;
  --chat-ok-soft: #ecfdf5;
  --chat-ok-line: #a7f3d0;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 40px;
  color: var(--chat-ink);
  background: var(--chat-surface);
  border: 1px solid var(--chat-line);
  border-radius: 16px;
  box-shadow:
    rgba(11, 13, 24, 0.06) 0 0 0 1px,
    rgba(11, 13, 24, 0.024) 0 1px 2px 0,
    rgba(11, 13, 24, 0.03) 0 3px 6px 0,
    rgba(11, 13, 24, 0.035) 0 8px 14px 0,
    rgba(11, 13, 24, 0.04) 0 16px 28px 0;
}

.agent-chat__head {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 520px;
}

.agent-chat__title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  line-height: 0.95;
  letter-spacing: -0.02em;
}

.agent-chat__lede {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--chat-ink-2);
}

.agent-chat__viewport {
  display: flex;
  flex-direction: column;
  /* 固定高度 + 内部滚动：对话区高度不随消息增减而变（Devin 手法）。
     之前用 max-height 跟着内容长，每出一条新消息外框就撑高一次 —— 那正是「一顿一顿」的来源。
     开场一条消息时下方留白是刻意取舍：外面的世界不动，比高度乱跳好。 */
  height: 480px;
  /* overflow-y: scroll（常驻滚动条）而不是 auto：auto 下滚动条从无到有，消息宽度会横跳一下。 */
  overflow-y: scroll;
  /* 新消息进来时不让浏览器自动顶一下滚动位，滚动完全交给 scrollToLatest。 */
  overflow-anchor: none;
  scrollbar-width: thin;
  scrollbar-color: var(--chat-line-strong) transparent;
}

.agent-chat__viewport::-webkit-scrollbar {
  width: 10px;
}

.agent-chat__viewport::-webkit-scrollbar-track {
  background: transparent;
}

.agent-chat__viewport::-webkit-scrollbar-thumb {
  background: var(--chat-line-strong);
  background-clip: padding-box;
  border: 3px solid transparent;
  border-radius: 999px;
}

.agent-chat__flow {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.agent-chat__beat {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.agent-chat__beat--user {
  flex-direction: row-reverse;
}

.agent-chat__avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-top: 2px;
}

.agent-chat__avatar--agent {
  color: var(--chat-brand);
  background: var(--chat-brand-soft);
  border: 1px solid var(--chat-brand-border);
  border-radius: 8px;
}

.agent-chat__avatar--user {
  color: #fff;
  background: var(--chat-ink);
  border-radius: 999px;
}

.agent-chat__avatar svg {
  display: block;
  width: 16px;
  height: 16px;
}

.agent-chat__avatar--user svg {
  width: 14px;
  height: 14px;
}

.agent-chat__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  max-width: min(80%, 460px);
}

.agent-chat__beat--user .agent-chat__body {
  align-items: flex-end;
}

.agent-chat__bubble {
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.6;
}

.agent-chat__bubble--agent {
  color: var(--chat-ink);
  background: var(--chat-soft);
  border: 1px solid var(--chat-line);
  border-radius: 12px;
  border-top-left-radius: 8px;
}

.agent-chat__bubble--user {
  color: #fff;
  background: var(--chat-ink);
  border-radius: 12px;
  border-top-right-radius: 8px;
}

/*
 * 思考相位。骨架条与工作标签同处一个气泡，THINK_SPAN 后被正文原位替换。
 *
 * 用扫光（shimmer）而不是三点跳动：三点读作「等待」，扫光读作「正在产出」。
 * 用户要的「等待 AI 回复的效果」指的正是前者之后的那段过程。
 */
.agent-chat__thinking {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 216px;
}

.agent-chat__thinking-label {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--chat-ink-2);
}

.agent-chat__thinking-pulse {
  width: 6px;
  height: 6px;
  background: var(--chat-brand);
  border-radius: 999px;
  animation: agent-chat-breathe 1.1s ease-in-out infinite;
}

.agent-chat__skeleton {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.agent-chat__skeleton i {
  display: block;
  height: 8px;
  overflow: hidden;
  background: #e9edf3;
  border-radius: 999px;
}

/* 两根骨架条宽度不同，否则看起来像一条表格线而不是一段话。 */
.agent-chat__skeleton i:first-child {
  width: 84%;
}

.agent-chat__skeleton i:last-child {
  width: 56%;
}

.agent-chat__skeleton i::after {
  display: block;
  width: 100%;
  height: 100%;
  content: '';
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgb(255 255 255 / 0.9) 50%,
    transparent 100%
  );
  transform: translateX(-100%);
  animation: agent-chat-shimmer 1.35s ease-in-out infinite;
}

.agent-chat__text {
  word-break: break-word;
}

.agent-chat__caret {
  display: inline-block;
  width: 1px;
  height: 14px;
  margin-left: 2px;
  vertical-align: -2px;
  background: var(--chat-brand);
  animation: agent-chat-caret 1s steps(1, end) infinite;
}

/*
 * 工具卡。三态而不是「有 / 没有」：执行中虚线下达 + 扫光横穿，
 * 完成后打勾、状态位翻成已执行、底色转成成功色。
 * 观众要看到动作从下达到完成的过程，一次性出现的勾号只是一张截图。
 */
.agent-chat__tool {
  position: relative;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.5;
  background: var(--chat-tool);
  border: 1px solid var(--chat-line);
  border-radius: 8px;
  animation: agent-chat-tool-in 0.46s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.agent-chat__tool--running {
  border-style: dashed;
  border-color: var(--chat-line-strong);
}

.agent-chat__tool--done {
  background: var(--chat-ok-soft);
  border-color: var(--chat-ok-line);
}

/* 执行中的扫光：一条窄亮带反复横穿卡片，暗示机器正在读这块。 */
.agent-chat__tool-scan {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 34%;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgb(255 255 255 / 0.92) 50%,
    transparent 100%
  );
  transform: translateX(-120%);
  animation: agent-chat-tool-scan 1.05s ease-in-out infinite;
}

.agent-chat__tool-ring {
  display: block;
  width: 13px;
  height: 13px;
  background: conic-gradient(
    var(--chat-brand) calc(var(--p, 0) * 360deg),
    var(--chat-line-strong) 0
  );
  border-radius: 999px;
}

.agent-chat__tool-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--chat-ok);
}

.agent-chat__tool-icon svg {
  display: block;
  width: 14px;
  height: 14px;
}

.agent-chat__tool-name {
  font-weight: 500;
  color: var(--chat-ink);
}

.agent-chat__tool-state {
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 500;
  color: var(--chat-ink-2);
  background: var(--chat-surface);
  border: 1px solid var(--chat-line);
  border-radius: 999px;
  transition:
    color 0.28s ease,
    border-color 0.28s ease;
}

.agent-chat__tool--done .agent-chat__tool-state {
  color: var(--chat-ok);
  border-color: var(--chat-ok-line);
}

.agent-chat__tool-result {
  margin-left: auto;
  color: var(--chat-ink-2);
  white-space: nowrap;
}

/*
 * 折叠摘要行：被顶下去的中间步骤收成一行，一行高、可点开。
 * Devin 手法 —— 中间过程默认收起，面板高度不再被每条消息轮番撑高。
 */
.agent-chat__fold {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 7px 10px;
  font: inherit;
  font-size: 13px;
  line-height: 1.4;
  color: var(--chat-ink-2);
  text-align: left;
  cursor: pointer;
  background: var(--chat-soft);
  border: 1px solid var(--chat-line);
  border-radius: 8px;
  transition:
    color 0.2s ease,
    background 0.2s ease;
  animation: agent-chat-fold-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.agent-chat__fold-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  color: var(--chat-ok);
}

.agent-chat__fold-icon svg {
  display: block;
  width: 13px;
  height: 13px;
}

.agent-chat__fold-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-chat__fold-chevron {
  display: inline-flex;
  flex: none;
  margin-left: auto;
  color: var(--chat-ink-3);
}

.agent-chat__fold-chevron svg {
  display: block;
  width: 13px;
  height: 13px;
}

.agent-chat__foot {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding-top: 20px;
  font-size: 12px;
  color: var(--chat-ink-3);
  border-top: 1px solid var(--chat-line);
}

.agent-chat__foot-sep {
  width: 1px;
  height: 10px;
  background: var(--chat-line);
}

@media (hover: hover) {
  .agent-chat__beat:hover .agent-chat__bubble--agent {
    border-color: var(--chat-line-strong);
  }

  .agent-chat__fold:hover {
    color: var(--chat-ink);
    background: var(--chat-tool);
  }
}

@media (max-width: 640px) {
  .agent-chat {
    padding: 24px;
  }

  .agent-chat__title {
    font-size: 20px;
  }

  .agent-chat__body {
    max-width: 100%;
  }

  .agent-chat__tool {
    flex-wrap: wrap;
  }

  .agent-chat__tool-result {
    margin-left: 0;
  }
}

@keyframes agent-chat-caret {
  0%,
  49% {
    opacity: 1;
  }

  50%,
  100% {
    opacity: 0;
  }
}

/* 思考相位的呼吸点：缩放进出的幅度大于纯透明度，更像「活着」。 */
@keyframes agent-chat-breathe {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(0.86);
  }

  50% {
    opacity: 1;
    transform: scale(1.14);
  }
}

/* 骨架扫光：一条亮带从左到右穿过占位条。 */
@keyframes agent-chat-shimmer {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(100%);
  }
}

/* 工具卡入场：轻微过冲的 pop in，比纯淡入更有实感。 */
@keyframes agent-chat-tool-in {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.985);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 折叠行入场：从上方轻轻落下，比直接出现更顺。 */
@keyframes agent-chat-fold-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes agent-chat-tool-scan {
  0% {
    transform: translateX(-120%);
  }

  100% {
    transform: translateX(360%);
  }
}

@media (prefers-reduced-motion: reduce) {
  /* 光标直接不显示；骨架与工具卡保留形状，只是不再动。 */
  .agent-chat__caret {
    display: none;
  }

  .agent-chat__caret,
  .agent-chat__skeleton i::after,
  .agent-chat__thinking-pulse,
  .agent-chat__tool-scan {
    animation: none;
  }

  .agent-chat__skeleton i::after {
    opacity: 0;
  }

  .agent-chat__tool {
    animation: none;
  }

  .agent-chat__viewport {
    transition: none;
  }
}
</style>
