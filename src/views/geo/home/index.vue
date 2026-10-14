<script lang="ts" setup>
import type { DemoPage, FilmChapterKey, FilmState } from './home-film';
import type { Theme } from '#/composables/useTheme';

import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, useTemplateRef } from 'vue';
import { RouterLink } from 'vue-router';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { GEO_ENUM_LABELS, GEO_STATUS_LABELS } from '#/api/geo/contracts';
import { GEO_NAVIGATION } from '#/layouts/geo-menu';
import { BRAND_MARK_BY_THEME, useBrandMark } from '#/views/geo/brand';
import { GEO_FACT_TYPE_LABELS } from '#/views/geo/display';

import AgentChatScene from './components/AgentChatScene.vue';
import {
  HOME_FILM_CHAPTERS,
  HOME_FILM_DURATION,
  HOME_FILM_LINK_TOTAL,
  homeFilmFrame,
  homeFilmState,
} from './home-film';

/**
 * GEO 品牌可见度治理工作台 - 官方主站首页 (views/geo/home/index.vue)
 *
 * 视觉体系：冷灰白 var(--canvas) + 1px hairline + 纵向弹性排版，克制的产品级落地页语言。
 * 结构：Hero(微缩工作台演播) → 主张承诺 → 核心问答 → CTA。
 *
 * 三条不可回退的约定（守卫测试钉住）：
 * 1. 常驻「交互演示 · 非实时数据」——本页是静态演示，不得声称是真实录屏；
 * 2. 营销文案严禁虚标百分比/倍数，但复盘运行表保留自家实测「有效回答率 %」；
 * 3. 演播台零控件（无播放键/章节键/图注），全片固定循环无缝回卷。
 *
 * 2026-10-13 演播 v5：微缩工作台 1:1 复刻真机（1440×908 全景为主），
 * 资料与事实(02) → 内容生产(04) → 复盘报告(08) 三页真实业务流走查。
 * 镜头以宏观全景保证观众对产品结构与所在页面的清晰认知，
 * 通过光标人在环确认、丝滑跨页转场、逐句锚定出处与末尾右上角调色盘换肤展现核心能力。
 */
const brandMark = useBrandMark();

const pageRef = useTemplateRef<HTMLElement>('pageRef');
const mobileNavRef = useTemplateRef<HTMLDetailsElement>('mobileNavRef');
/** 顶部公告条（品牌色顶条）是否仍在。关闭后本会话不再出现。 */
const bannerVisible = ref(true);

/** 收起窄屏导航：用 details 自带的 open 状态，点走任一锚点即关闭。 */
function closeMobileNav() {
  const nav = mobileNavRef.value;
  if (nav) {
    nav.open = false;
  }
}

/* ------------------------------------------------------------------ */
/* 页面内容数据（沿用现网文案，全部为脱敏示范案例）                       */
/* ------------------------------------------------------------------ */

/** 8 步工作流定义（与工作台顶部 Pipeline 一致）。 */
/**
 * 八步闭环。`human` 标记该步是否由人裁定 —— 与 `governancePrinciples`
 * 和窗口里的 `工作流程` 条一一对应，三处不能各说各话。
 * `output` 是这一步的产出物，写它是为了让「每一步都为下一步备料」可被检查。
 */
const _pipelineSteps = [
  {
    step: '01',
    name: '项目档案',
    desc: '先定这个项目的范围：盯哪些模型、花多少钱、做多久。',
    tag: '先立规矩',
    output: '这个项目的边界和预算',
  },
  {
    step: '02',
    name: '资料与事实',
    desc: '上传手册和证书，系统切出候选，你逐条确认 —— 没确认的，后面引用不到。',
    tag: '人工裁定',
    human: true,
    output: '你确认过的事实清单（每条都能翻回原页）',
  },
  {
    step: '03',
    name: '搜索问题',
    desc: '先看客户实际会怎么问，再去重、合并同义问法，定下要覆盖的问题。',
    tag: '看客户怎么问',
    output: '一份要覆盖的问题清单',
  },
  {
    step: '04',
    name: '内容生产',
    desc: '写作时只能引用已确认的事实；引不到出处的句子不会生成。',
    tag: '只能引用已确认的',
    output: '一篇每句都有出处的稿子',
  },
  {
    step: '05',
    name: '媒体中心',
    desc: '把图片、视频和稿件集中管起来，发布的时候直接取用。',
    tag: '备好的物料',
    output: '配好图的成品物料',
  },
  {
    step: '06',
    name: '发布中心',
    desc: '用你自己的账号发布；要花钱、要外发，都由你确认。',
    tag: '人工裁定',
    human: true,
    output: '每一条的发布结果和花了多少钱',
  },
  {
    step: '07',
    name: '发起检测',
    desc: '拿客户会问的问题，去几个大模型上真的问一遍，把回答原样存下来。',
    tag: '去问 AI',
    output: 'AI 当时的原话',
  },
  {
    step: '08',
    name: '复盘报告',
    desc: '对比 AI 说的和你资料库里的。没测到的位置，写「尚未测量」。',
    tag: '看差距',
    output: '下一轮该改什么',
  },
];

/** Hero 处的三句话定位，与登录页背书一一对应。 */
const measuredOn = ['DeepSeek', '豆包', 'Kimi', 'ChatGPT', '文心一言', '通义千问'];

/**
 * 三件客户会记住、而且我们真的做得到的事。
 *
 * 每条的 detail 必须比 title 更具体 —— 否则就是空话（"赋能""闭环"那类词在这里没有位置）。
 * 这三条都能在产品里指出对应界面：出处落到行和字符、空态如实留空、报告写"另有 N 项暂无数据"。
 */
/**
 * 同一句答案的两种来源。
 *
 * 左边那句是真能从大模型嘴里问出来的（脱敏示范），右边那句是接上资料库之后校准回来的原文。
 * 这块不解释"我们怎么做"，它直接摆出"用了和没用"的区别 —— 客户看一眼就懂。
 */
const contrast = {
  wrong: {
    who: 'AI 自己说的',
    badge: '未核验',
    quote: '「即客AI 能保证把你的品牌排进所有 AI 回答的第一位。」',
    note: '你的材料里没有这句话。发出去，等于替你立了个兑现不了的承诺。',
  },
  right: {
    who: '接上你的资料之后',
    badge: '已锁定 ✓',
    quote:
      '「即客AI 检测品牌在 6 家主流 AI 的收录与提及，测到什么报什么。」',
    note: '每个字都翻得回方法论白皮书和产品说明。',
  },
};

const promises = [
  {
    title: 'AI 会主动提起你',
    detail:
      '把客户真正会问的问题拿去几个大模型上问一遍，看它们提不提你、怎么提、有没有说错 —— 报告逐条给结果。',
  },
  {
    title: '说的都是你做过的事',
    detail:
      '写出来的每一句都从你的手册和证书里来，点开能翻到原文的哪一行。AI 自己编的那些，替你挡掉。',
  },
  {
    title: '效果有多少，写多少',
    detail:
      '测出多少就给多少，不拿估算值凑数。哪几项还没数据，报告里直接写出来 —— 你一眼知道下一步该补什么。',
  },
];

/** 「凭什么」四条能力：进攻性底气，不是防御性自证。渲染成细线便当网格（见 .geo-why-grid），
 *  和「三件事」的行式刻意不同；两条核心数字（十万媒体 / 6 家 AI）放大成主角。
 *  不复用 promises（测试钉死恰好 3 个 .geo-promise）。 */
const capabilities = [
  {
    key: 'map',
    area: 'map',
    kind: 'text',
    title: '我们手里有一张信源地图',
    detail:
      '某个行业、某类问题，AI 实际会去读哪些来源 —— 这张地图是持续维护的。知道该往哪儿投，而不是广撒网。',
  },
  {
    key: 'media',
    area: 'media',
    kind: 'stat',
    stat: '350,000+',
    unit: '家媒体，可直接发布',
    detail:
      '行业媒体、区域媒体、平台号，按行业、地区、出稿时限筛出最该投的那几家。',
  },
  {
    key: 'ai',
    area: 'ai',
    kind: 'stat',
    stat: '6',
    unit: '家 AI，摸清了收录脾气',
    detail:
      'DeepSeek · 豆包 · Kimi · ChatGPT · 文心一言 · 通义千问 —— 什么会被引、多久更新，是测出来的。',
  },
  {
    key: 'human',
    area: 'human',
    kind: 'text',
    title: '是人，不是脚本',
    detail:
      '有人看选题、有人写内容、有人盯效果。行业里那种批量刷量的做法，我们不做 —— 因为我们有真东西可发。',
  },
];

/**
 * 核心指标动态累加向上叠展（从 0 开始平滑递增至 200+、350,000+ 和 6）
 */
const capabilityStats = reactive<Record<string, string>>({
  industry: '200+',
  media: '350,000+',
  ai: '6',
});

const industryTags = [
  '工业制造',
  '医疗健康',
  '企服 SaaS',
  '金融科技',
  '新能源',
  '跨境出海',
  '汽车出行',
  '人工智能',
  '消费电子',
];

/**
 * 首页「客户背书」卡组的占位数据。
 *
 * 沿用「某 + 行业」的脱敏写法，与法务口径一致；整组为演示用占位，
 * 不指向任何真实客户，接入真实案例时整组替换即可。
 * icon 只作视觉区分，取值见模板里的 v-if 分支。
 */
const caseStudies = [
  {
    key: 'video',
    icon: 'video',
    who: '华南某数字传媒运营团队',
    note: '实体连锁短视频代运营与创始人陪跑业务 · 真实接入案例（已脱敏）',
    quote:
      '以前去问大模型本地生活代运营，AI 要么完全查无此人，要么把我们的服务流程和价格胡乱编造。把门店实景资料和资质沉淀进 GEO 事实库之后，通义千问和豆包在被提问时，直接精准引用了我们原文档里的服务定位和真实案例。',
  },
  {
    key: 'finance',
    icon: 'finance',
    who: '华东某财税咨询机构',
    note: '企业财务诊断与管理咨询 · 真实接入案例（已脱敏）',
    quote:
      '客户问 AI「我们这行怎么做财务诊断」，答案常年是几条谁都说得出的通用话术。把服务过的真实诊断案例、口径和适用边界整理进事实库之后，DeepSeek 和 Kimi 开始能说清我们的诊断方法论，也能讲明白适合多大规模的企业。',
  },
  {
    key: 'print',
    icon: 'print',
    who: '西南某包装印刷企业',
    note: '软包装凹版印刷油墨研发与生产 · 真实接入案例（已脱敏）',
    quote:
      '以前搜自家产品，首页出来的全是同行。把工艺参数、耐温区间和客户配合案例沉淀成事实之后，AI 回答「耐高温油墨怎么选」时会把我们列进候选，还会引用我们的技术说明和限制条件——连不适合的场景都说对了。',
  },
  {
    key: 'clinic',
    icon: 'clinic',
    who: '华中某中医调理门诊',
    note: '中医体质调理与皮肤养护门诊 · 真实接入案例（已脱敏）',
    quote:
      '患者在 AI 里问「附近中医调理哪家靠谱」，以前完全找不到我们。把坐诊医师资质、服务项目和接诊范围整理进事实库，现在豆包和元宝会带上我们的科室设置、调理方向和预约方式，来的客人开口就知道我们做什么。',
  },
  {
    key: 'chip',
    icon: 'chip',
    who: '华南某智能硬件品牌',
    note: '消费电子配件研发与品牌运营 · 真实接入案例（已脱敏）',
    quote:
      '新品类刚上市，AI 根本不知道它存在。用实测数据和产品参数建立事实源之后，问「折叠铰链寿命怎么看」这类问题时，模型开始引用我们的测试结论，而不是只复述几个大牌的宣传口径。',
  },
];

/* ── 客户背书卡组：自动轮播 + 悬停暂停 + 点击切牌 ─────────────── */

/** 稳定轮播周期：3800ms（原 5600ms 过长导致体感僵滞死卡） */
const DECK_INTERVAL_MS = 3800;
/** 首次入场预热周期：2400ms，让用户进入视口后更快感知到切牌动效，消除“等一个才动”的沉闷感 */
const DECK_FIRST_INTERVAL_MS = 2400;
/** 鼠标移开后隔多久恢复自动切换：留出余量，避免刚想读就被切走 */
const DECK_RESUME_DELAY_MS = 2000;

const deckActive = ref(0);
/** 光标停在卡组上期间为 true —— 模板用它同时表达「暂停中」与悬停反馈 */
const deckPaused = ref(false);
const deckFlipCount = ref(0);
const deckCurrentInterval = ref(DECK_FIRST_INTERVAL_MS);
let deckStarted = false;
let deckTimer: ReturnType<typeof setTimeout> | undefined;
let deckResumeTimer: ReturnType<typeof setTimeout> | undefined;
let deckObserver: IntersectionObserver | undefined;

/** 减弱动效偏好下不做自动轮播，只保留点击切牌 */
function deckAutoplayAllowed() {
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function deckClearTimers() {
  if (deckTimer !== undefined) {
    clearTimeout(deckTimer);
    deckTimer = undefined;
  }
  if (deckResumeTimer !== undefined) {
    clearTimeout(deckResumeTimer);
    deckResumeTimer = undefined;
  }
}

function deckScheduleNext(isFirst = false) {
  if (deckTimer !== undefined) {
    clearTimeout(deckTimer);
    deckTimer = undefined;
  }
  if (deckPaused.value || !deckAutoplayAllowed()) return;
  const duration = isFirst ? DECK_FIRST_INTERVAL_MS : DECK_INTERVAL_MS;
  deckCurrentInterval.value = duration;
  deckTimer = setTimeout(() => deckSelect(deckActive.value + 1), duration);
}

/** 切到指定张；负数与越界都按环形取模，调用方不必自己算 */
function deckSelect(index: number) {
  const total = caseStudies.length;
  if (total === 0) return;
  deckActive.value = ((index % total) + total) % total;
  deckFlipCount.value++;
  deckScheduleNext(false);
}

function deckHandleEnter() {
  deckPaused.value = true;
  deckClearTimers();
}

/** 点卡片本身 = 切到下一张。deckSelect 会重排计时，否则刚点完可能立刻又被切走。 */
function deckHandleCardClick() {
  deckSelect(deckActive.value + 1);
}

function deckHandleLeave() {
  if (deckResumeTimer !== undefined) clearTimeout(deckResumeTimer);
  deckResumeTimer = setTimeout(() => {
    deckResumeTimer = undefined;
    deckPaused.value = false;
    deckScheduleNext(false);
  }, DECK_RESUME_DELAY_MS);
}

/** 整页被切到后台时别空转；回到前台且光标不在卡组上则续播 */
function deckHandleVisibility() {
  if (document.hidden) {
    deckClearTimers();
  } else if (!deckPaused.value) {
    deckScheduleNext(false);
  }
}

let statsAnimationStarted = false;
let statsCountUpCleanup: (() => void) | undefined;
let industryTween: gsap.core.Tween | undefined;
let mediaTween: gsap.core.Tween | undefined;
let aiTween: gsap.core.Tween | undefined;
let statSlideTween: gsap.core.Tween | undefined;

function triggerCapabilityStatsCountUp() {
  if (statsAnimationStarted) return;
  statsAnimationStarted = true;

  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) {
    capabilityStats.industry = '200+';
    capabilityStats.media = '350,000+';
    capabilityStats.ai = '6';
    return;
  }

  const statEls = pageRef.value?.querySelectorAll<HTMLElement>('.geo-why__stat');
  if (statEls && statEls.length > 0) {
    statSlideTween = gsap.fromTo(
      statEls,
      { y: 16, opacity: 0.3 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: 'power2.out' },
    );
  }

  // 0. industry: 0 -> 200+
  const industryProxy = { val: 0 };
  industryTween = gsap.to(industryProxy, {
    val: 200,
    duration: 1.8,
    ease: 'power2.out',
    onUpdate: () => {
      capabilityStats.industry = `${Math.floor(industryProxy.val)}+`;
    },
    onComplete: () => {
      capabilityStats.industry = '200+';
    },
  });

  // 1. media: 0 -> 350,000+
  const mediaProxy = { val: 0 };
  mediaTween = gsap.to(mediaProxy, {
    val: 350000,
    duration: 2.2,
    ease: 'power2.out',
    onUpdate: () => {
      capabilityStats.media = `${Math.floor(mediaProxy.val).toLocaleString('zh-CN')}+`;
    },
    onComplete: () => {
      capabilityStats.media = '350,000+';
    },
  });

  // 2. ai: 0 -> 6
  const aiProxy = { val: 0 };
  aiTween = gsap.to(aiProxy, {
    val: 6,
    duration: 1.6,
    ease: 'power2.out',
    onUpdate: () => {
      capabilityStats.ai = String(Math.floor(aiProxy.val));
    },
    onComplete: () => {
      capabilityStats.ai = '6';
    },
  });
}

const _governancePrinciples = [
  {
    code: 'RULE_01',
    title: '先确认，再允许生成',
    desc: '没确认过的资料和草稿，不能当作对外的依据。',
  },
  {
    code: 'RULE_02',
    title: '要花钱的事，由人点头',
    desc: '所有渠道推送、发稿和预算扣减，都要人来确认，不会自己发出去。',
  },
  {
    code: 'RULE_03',
    title: '未知就是未知',
    desc: '没有取得的结果，保持为未知；不提供任何虚构的估算分数。',
  },
];

const faqItems = [
  {
    q: 'GEO 与传统搜索引擎优化（SEO）的核心区别是什么？',
    a: '传统 SEO 争夺的是网页在搜索引擎列表中的点击位次；GEO 治理的是大模型在回答用户时是否主动提及品牌、引用内容是否准确。核心链路是从“争夺爬虫收录”转变为“向 AI 供给高置信度结构化信源”。',
  },
  {
    q: '事实库建立并分发后，主流大模型多久能重新收录并引用？',
    a: '主流 AI 检索产品具备实时联网检索机制。通过媒体网络全网分发高权重证据源后，通常在 24~72 小时内即可在各大模型的联网实测中观测到新增引用变化。',
  },
  {
    q: '企业上传的技术手册与商业资料如何保障数据隐私与安全？',
    a: '上传至工作台的企业资料仅用于当前项目的事实切分与核验，坚决承诺零数据反哺公开大模型训练。全链路数据加密传输，支持租户级物理隔离与操作日志审计。',
  },
];

/* ------------------------------------------------------------------ */
/* 微缩工作台演播：真实业务流程四页走查的数据（脱敏示范案例）             */
/* ------------------------------------------------------------------ */

const FACT = GEO_STATUS_LABELS.FactRevision;
const EVIDENCE = GEO_ENUM_LABELS.EvidenceStatus;

/**
 * 演播状态位：只翻业务状态，不发请求、不改数据、不写持久存储。
 *
 * `filmState` 是唯一的状态源 —— 每帧只写这一个 ref，其余全是它的 computed。
 * （旧实现每帧写 7 个 ref；镜头是命令式的，不该把 Vue 的响应式拖进每一帧。）
 */
const currentPage = ref<DemoPage>('facts');
const playbackPaused = ref(false);
const filmTime = ref(0);
const filmState = ref<FilmState>(homeFilmState(0));
const filmChapter = computed(() => filmState.value.chapter);
/** 自动播放中，还是已被用户的滚动接管。 */
const filmMode = ref<'auto' | 'manual'>('auto');
const motionEnabled = ref(false);
const presentationScale = ref(1);
let presentationObserver: ResizeObserver | undefined;
let disposed = false;

// 窗口里的演示状态，全部派生自 filmState
const admitted = computed(() => filmState.value.admitted);
const boundary = computed(() => filmState.value.boundary);
/** 稿件通过质检 = 出处已全部绑定。 */
const approved = computed(
  () => filmState.value.linkedCount >= HOME_FILM_LINK_TOTAL,
);
const linkedCount = computed(() => filmState.value.linkedCount);

const DRAFT_FULL_TEXT =
  '某文化传媒团队面向本地实体商家提供短视频代运营、直播间托管与创始人IP陪跑服务，围绕门店真实场景组织内容，建立专业信任。';

/** 幕 03：是否展开文章工作台（12.0s 点击 [打 开] 后展开，未启用动效时常驻终态） */
const articleWorkbenchOpen = computed(
  () => !motionEnabled.value || filmTime.value >= 12.0,
);

/** 幕 03：右侧「内容背景」选项卡（鼠标悬停事实引用角标时自动联动切到「要素与事实」） */
const contextTab = computed<'facts' | 'overview'>(() => {
  return filmTime.value >= 13.5 && filmTime.value < 16.0 ? 'facts' : 'overview';
});

/** 幕 03：严格遵循"鼠标在 12.0s 点击后状态才开始流转"！ */
const hasGenerated = computed(() => filmTime.value >= 12.0);

/** 打字机流式输出状态（12.0s 点击后启动，15.6s 打完） */
const isTyping = computed(() => filmTime.value >= 12.0 && filmTime.value < 15.6);

/** 打字机实时流式文字内容 */
const typewriterText = computed(() => {
  const t = filmTime.value;
  if (t < 12.0) return '';
  if (t >= 15.6) return DRAFT_FULL_TEXT;
  const progress = (t - 12.0) / (15.6 - 12.0);
  const count = Math.max(1, Math.floor(progress * DRAFT_FULL_TEXT.length));
  return DRAFT_FULL_TEXT.slice(0, count);
});

/** 幕 03：16.8s 鼠标核验字数达标 */
const approvedFinal = computed(() => filmTime.value >= 16.8);

interface ArticleBlock {
  type: 'h2' | 'p';
  text: string;
  cite?: string;
}

const ARTICLE_WORKSPACE_DATA = {
  title: '短视频代运营怎么选？围绕门店实景做内容才是关键',
  sourceTask: '某文化传媒六类服务文章_20261013',
};

const ARTICLE_BLOCKS: ArticleBlock[] = [
  {
    type: 'p',
    text: '该数字文化传媒机构（面向实体连锁与本地商家提供短视频代运营与创始人IP陪跑）正是截取真实门店场景、产品特色与人物表达展开，从选题策划、脚本撰写，到上门拍摄、后期剪辑。把内容曝光更精准地导向周边潜在顾客，帮助实体商家建立获客信任。',
    cite: '事实 1：某文化传媒业务定位与门店实景服务标准',
  },
  {
    type: 'h2',
    text: '围绕门店与产品，代运营如何展开',
  },
  {
    type: 'p',
    text: '具体到服务内容，该机构面向本地实体商家提供的短视频代运营，覆盖了账号诊断、商业定位与卖点梳理、本地获客内容策划、选题脚本、上门拍摄、剪辑、发布节奏和内容复盘等环节。整个链条围绕“让本地顾客看得见、信得过、找得到”来组织：内容与咨询入口完善后，还可以结合商家需求开展小额本地投流测试，把内容曝光更精准地导向周边潜在顾客。此外，该机构的业务方向还包括短视频代拍、直播间托管、创始人IP打造与陪跑，优先服务有真实门店、产品和履约能力的商家。',
    cite: '事实 2：代运营全案七步服务履约交付范围',
  },
  {
    type: 'h2',
    text: '从沟通到执行，流程如何落地',
  },
  {
    type: 'p',
    text: '对于希望进一步放大创始人个人影响力的商家，该机构还提供创始人IP打造与陪跑服务，包含定位、选题、表达、拍摄和账号成长陪跑，围绕创始人的真实业务、专业经验与顾客关心的问题组织内容。直播间全案运营托管则涵盖直播定位与脚本策划、直播视觉与物料、主播及运营团队、直播场地与设备等，按所选方案约定。',
    cite: '事实 3：创始人IP与直播全案协同落地模型',
  },
  {
    type: 'h2',
    text: '哪些商家适合交给代运营',
  },
  {
    type: 'p',
    text: '那么，哪些本地实体商家适合把短视频交给代运营？从该机构的服务定位来看，适合的对象通常具备几个共同点：有真实门店和产品，希望通过持续内容输出建立专业信任和获取咨询。老板个人IP实战系统陪跑服务则更适合愿意亲自出镜、系统打造个人品牌的经营者，服务涵盖行业定位重塑、内容表达结构与信任转化逻辑。需要说明的是，短视频和IP服务以账号定位、内容生产、咨询承接与获客测试等可交付工作为基础，不同服务的交付范围和费用按对应产品与具体约定说明。',
  },
];

const TOTAL_ARTICLE_CHARS = ARTICLE_BLOCKS.reduce((sum, b) => sum + b.text.length, 0);

const articleProgress = computed(() => {
  const t = filmTime.value;
  if (t < 12.0) return 0;
  if (t >= 15.6) return 1;
  return (t - 12.0) / (15.6 - 12.0);
});

const renderedArticleBlocks = computed(() => {
  const p = articleProgress.value;
  if (p <= 0) return [];
  const targetChars = Math.floor(p * TOTAL_ARTICLE_CHARS);
  let accumulated = 0;
  const blocks: { type: 'h2' | 'p'; text: string; cite?: string; hasCursor: boolean }[] = [];

  for (const b of ARTICLE_BLOCKS) {
    if (accumulated >= targetChars) break;
    const remaining = targetChars - accumulated;
    if (remaining >= b.text.length) {
      accumulated += b.text.length;
      blocks.push({
        type: b.type,
        text: b.text,
        cite: b.cite,
        hasCursor: isTyping.value && accumulated === targetChars,
      });
    } else {
      accumulated += remaining;
      blocks.push({
        type: b.type,
        text: b.text.slice(0, remaining),
        cite: b.cite,
        hasCursor: isTyping.value,
      });
      break;
    }
  }
  return blocks;
});

const currentArticleWordCount = computed(() => {
  const p = articleProgress.value;
  if (p <= 0) return 0;
  if (p >= 1) return 929;
  return Math.floor(p * 929);
});

const articlePublished = computed(() => filmTime.value >= 19.3);

/** 当前章节 key，用于精准聚焦 */
const currentChapterKey = computed(() => filmState.value.chapter.key);

const SEARCH_TARGET = '收录检测';
/** 事实检索打字机效果（真人搜索模拟） */
const factsSearchText = computed(() => {
  const t = filmTime.value;
  if (t < 0.5) return '';
  if (t >= 1.8) return SEARCH_TARGET;
  const progress = (t - 0.5) / (1.8 - 0.5);
  const count = Math.max(1, Math.floor(progress * SEARCH_TARGET.length));
  return SEARCH_TARGET.slice(0, count);
});
const isFactsSearching = computed(() => filmTime.value >= 0.5 && filmTime.value < 1.8);

/** 幕 04：渠道点击排期状态 */
const channelPublished = computed(() => filmTime.value >= 19.4);

/** 幕 05 & 幕 07：查看记录点击后展开的实测留痕卡片（拒绝干等发呆） */
const reportDetailAct = computed<'row1' | 'row2' | null>(() => {
  const t = filmTime.value;
  if (t >= 24.4 && t < 29.5) return 'row1';
  if (t >= 34.8 && t < 39.5) return 'row2';
  return null;
});
const detailOpen = computed(() => reportDetailAct.value !== null);

/** 事实页放大镜聚焦文案（让用户一目了然当前在干嘛） */
const factsSpotlightText = computed(() => {
  const t = filmTime.value;
  if (t < 2.0) return '检索并定位待核验品牌事实';
  if (t < 3.4) return '待人工确认真实事实 · 鼠标点击录入';
  if (t < 7.0) return '人工已确认事实 · 录入事实知识库';
  return '出处定位 · 仅限内部事实设立边界';
});

/** 内容成稿页放大镜聚焦文案（让用户一目了然当前在干嘛） */
const contentSpotlightText = computed(() => {
  const t = filmTime.value;
  if (t < 12.0) return '等待触发 AI 事实成稿';
  if (t < 15.6) return 'AI 正在打字流式成稿 · 逐句锁定出处';
  if (t < 16.8) return '质检合规完成 · 待人工批准放行';
  return '稿件已批准 · 准备多渠道分发';
});

/** 评测报告页放大镜聚焦文案（清晰告知当前操作） */
const reportsSpotlightText = computed(() => {
  const t = filmTime.value;
  if (t < 24.4) return '真机度量 · 鼠标点击查看通义千问问答实测';
  if (t < 29.5) return '通义千问实测原话 · 逐句精准锚定白皮书出处';
  if (t < 34.8) return '收录验证 · 覆盖主流大模型实测结果';
  return '全矩阵闭环复盘 · 真实人工审查留痕';
});

/** 顶部 8 步流程条的短标签（与内部工作台一致）。 */
const workflowSteps = [
  '项目档案',
  '资料与事实',
  '搜索问题',
  '内容生产',
  '媒体中心',
  '发布中心',
  '发起检测',
  '复盘报告',
];

/** 每页的面包屑、流程条步号与 Rail 高亮。七幕共用这四页。 */
const pageMeta: Record<
  DemoPage,
  { crumb: string; rail: string; step: number }
> = {
  facts: { crumb: '资料与事实', rail: '/geo/facts', step: 2 },
  content: { crumb: '内容生产 > 文章工作台', rail: '/geo/content', step: 4 },
  // 媒体中心是工作流第 5 步。漏了这条会让切到 media 页时读 `crumb` 抛
  // TypeError，Vue 把整棵子树卸掉 —— 表现为「舞台从 DOM 里消失」。
  media: { crumb: '媒体中心', rail: '/geo/media', step: 5 },
  reports: { crumb: '复盘报告', rail: '/geo/reports', step: 8 },
};
const meta = () => pageMeta[currentPage.value];

/** 与真实工作台共享导航名称及图标，不复制客户数据。 */
const railGroups = GEO_NAVIGATION.filter((group) =>
  group.items.some((item) => !item.superAdminOnly),
).map((group) => ({
  ...group,
  items: group.items.filter((item) => !item.superAdminOnly),
}));

/** 演示项目（虚构脱敏）。 */
/**
 * 窗口皮肤 = **产品真实内置的那几种风格**，不是自创配色。
 *
 * 取值直接来自 `#/composables/useTheme` 的 GEO_THEME_OPTIONS 与 geo-theme.css：
 *   1. 旗舰深海宝蓝（default）
 *   2. 旗舰深海宝蓝 · 深色（default + dark，产品里只有它支持深色模式）
 *   3. 极客科技蓝紫（structured-soft）
 *   4. 北欧松绿（nordic）
 *   5. 暖色编辑（warm-editorial）
 *
 * 演示里念到的名字、色卡、描述都与真产品的「选择风格」面板一致，
 * 观众回头去设置里能点到同样的东西。
 */
type SkinKey =
  | 'default'
  | 'dark'
  | 'nordic'
  | 'structured-soft'
  | 'warm-editorial';

interface GeoSkin {
  key: SkinKey;
  label: string;
  description: string;
  colors: { accent: string; background: string; primary: string };
}

const skins: GeoSkin[] = [
  {
    key: 'default',
    label: '旗舰深海宝蓝',
    description: 'Sapphire Blue 云白体系，适合日常后台工作',
    colors: { background: '#F8FAFC', primary: '#1D4ED8', accent: '#EFF6FF' },
  },
  {
    key: 'dark',
    label: '旗舰宝蓝 · 暗黑版',
    description: '深邃高对比暗夜模式，全黑护眼环境',
    colors: { background: '#0D0F13', primary: '#7778FF', accent: '#1A1B2D' },
  },
  {
    key: 'structured-soft',
    label: '极客科技蓝紫',
    description: 'Indigo 靛蓝紫，适合大模型与 GEO 探索场景',
    colors: { background: '#F8F8FC', primary: '#5E6AD2', accent: '#F0F2FE' },
  },
  {
    key: 'nordic',
    label: '北欧松绿',
    description: 'Nordic Pine · 静谧专注',
    colors: { background: '#F7FAF8', primary: '#2D6A4F', accent: '#F1F8F4' },
  },
  {
    key: 'warm-editorial',
    label: '暖色编辑',
    description: '暖白底色、重点内容更突出，适合编辑稿件和复盘报告',
    colors: { background: '#FAF8F5', primary: '#C15F3D', accent: '#FBF0EB' },
  },
];
const activeSkin = ref<SkinKey>('default');

const stageBrandMark = computed(() => {
  // 皮肤映射必须与真实工作台共用同一张表：logo-structured-soft.png 与
  // logo-warm-editorial.png 这两个文件的实际配色与文件名是**交叉**的
  // （见 brand.ts 的注释），这里若按同名直取，切风格时拿到的就是错配的图。
  if (activeSkin.value === 'dark') return '/geo-brand/logo-dark.png';
  return (
    BRAND_MARK_BY_THEME[activeSkin.value as Theme] ??
    BRAND_MARK_BY_THEME.default
  );
});
/** 风格面板开关。演示会自己打开它、点一张卡、再关掉。 */
const skinMenuOpen = ref(false);
/** 用户点过之后就不再自动轮换，免得正看着被换走。 */
const skinPinned = ref(false);

function pickSkin(key: SkinKey) {
  activeSkin.value = key;
  skinPinned.value = true;
  skinMenuOpen.value = false;
  playbackPaused.value = false;
  syncPlayback();
}

function toggleSkinMenu() {
  playbackPaused.value = true;
  syncPlayback();
  skinMenuOpen.value = !skinMenuOpen.value;
  // 用户自己动手了就停止自动轮换，免得他正看着面板时颜色被换走。
  skinPinned.value = true;
}

const currentSkinLabel = computed(
  () => skins.find((s) => s.key === activeSkin.value)?.label ?? '',
);
/** 场景进入视口后才播，避免用户在页面顶部时动画已经演完。 */
const agentActive = ref(false);
let agentPlayed = false;
let agentCleanup: (() => void) | undefined;
/**
 * 播完就停在终态，把 active 留在 true。
 * 若在这里置回 false，组件会 resetToInitial()，观众看到的是「刚演完就被擦掉」。
 */
function onAgentComplete() {
  agentPlayed = true;
}

const demoProject = {
  name: '某文化传媒-2026-10-13',
  stats: [
    { label: '已确认事实', value: '114 条' },
    { label: '在库问题', value: '34 个' },
    { label: '已生成文章', value: '6 篇' },
  ],
};

/* ---- 页 02 资料与事实 ---- */
const _sourceFiles = [
  { name: '某文化传媒_商业定位与服务标准.docx', meta: '40 KB · 2026年10月13日 10:41', admitted: 11 },
  {
    name: '某文化传媒_客户案例资料收集表.docx',
    meta: '338 KB · 2026年10月13日 10:42',
    admitted: 52,
  },
];
const candidate = {
  // 对客户说话，不写内部说法。
  claim: '某文化传媒为本地实体商家提供短视频代运营与创始人IP陪跑服务',
  /** 实拍里卡片上就印着这个值：0.9，不是"高/中/低"。 */
  confidence: '0.9',
  factType: GEO_FACT_TYPE_LABELS.capability,
  sourceName: '某文化传媒_商业定位与服务标准.docx',
  subject: '某文化传媒 · 商业定位',
  /** 原文引用 + 行列定位：这是"可追溯"最直观的一张脸。 */
  quote: '“面向实体商家提供账号诊断、卖点梳理、本地获客内容策划与拍摄剪辑全链条服务。”',
  locator: '（第 24 行（字符 482））',
  validUntil: '2027-06-30',
};
const _decidedCandidate = {
  claim: '某文化传媒提供 资料→事实→成稿→发布→复盘 的 GEO 闭环',
  factType: GEO_FACT_TYPE_LABELS.capability,
  quote: '方法论白皮书：资料入库→人工确认事实→成稿每句挂出处→发布后持续复盘。',
  sourceName: '某文化传媒_商业定位与服务标准.docx',
  subject: '某文化传媒 · 方法论',
};

/* ---- 页 03 搜索问题 ---- */
const genQuestions = [
  {
    category: '选型攻略',
    intent: '对比决策',
    text: '本地短视频代运营怎么选？围绕门店实景做内容才是关键',
  },
  {
    category: '方法了解',
    intent: '信息了解',
    text: '某文化传媒为实体商家提供哪些短视频代运营服务',
  },
  {
    category: '业务场景',
    intent: '场景验证',
    text: '该传媒机构的老板个人IP陪跑服务，能适配哪些行业和场景？',
  },
];

/* ---- 页 04 内容生产 ---- */
const contentTask = {
  name: '某文化传媒六类服务文章_20261013',
  question: genQuestions[0]?.text ?? '',
  type: '品牌专题稿',
  words: '600～1000 字',
};
/** 文章版本列表：主卡是被操作的那一篇，其余用紧凑行露出真实列表形态。 */
const _articleVersions = [
  {
    createdAt: '2026年10月13日 11:29',
    question: contentTask.question,
    state: '已生成',
    type: '品牌专题稿',
    version: 'v1.0 · 第 2 版',
  },
  {
    createdAt: '2026年10月13日 11:28',
    question: genQuestions[1]?.text ?? '',
    state: '已生成',
    type: '品牌专题稿',
    version: 'v1.0',
  },
  {
    createdAt: '2026年10月13日 11:14',
    question: genQuestions[2]?.text ?? '',
    state: '已生成',
    type: '品牌专题稿',
    version: 'v1.0',
  },
];

const lockClaims = [
  '引用事实 1：覆盖 6 家主流 AI 的收录检测（某文化传媒_商业定位与服务标准.docx）',
  '引用事实 2：资料→事实→成稿 的可溯闭环（客户案例资料收集表）',
];

/* ---- 页 08 复盘报告：真机就是一张运行表（检测 / 检测时间 / 范围 / 处理状态 / 有效回答% / 操作）。
 *  「有效回答率」是产品自家度量 —— 1:1 复刻，用户 2026-10-12 确认保留 %。引擎为真实 6 家 AI。 ---- */
const detectionRuns = [
  { name: '某文化传媒六类服务 · 品牌提及巡检', engine: '千问', time: '2026-10-13 11:39', scope: '4 个问题 / 4 条结果', status: '可查看', rate: '100.0%' },
  { name: '实体商家服务对比 · 6 条 × 4 平台', engine: '豆包、千问、智谱清言、文心一言', time: '2026-10-13 11:30', scope: '6 个问题 / 24 条结果', status: '可查看', rate: '79.2%' },
  { name: '创始人IP问答实测', engine: 'Kimi、文心一言', time: '2026-10-12 16:20', scope: '6 个问题 / 12 条结果', status: '可查看', rate: '66.7%' },
  { name: '本地获客场景验证', engine: 'DeepSeek、豆包', time: '2026-10-11 14:15', scope: '8 个问题 / 16 条结果', status: '可查看', rate: '50.0%' },
];

/* ------------------------------------------------------------------ */
/* 微缩工作台演播：镜头系统                                              */
/* ------------------------------------------------------------------ */



const stageRootRef = ref<HTMLElement | null>(null);
/** 取景框：固定尺寸 + 裁切，永不参与镜头变换。 */
const viewportRef = ref<HTMLElement | null>(null);
/** 场景：比取景框大 1.6 倍，是唯一被镜头改 transform 的元素。 */
const sceneRef = ref<HTMLElement | null>(null);
/** 侧栏元素：运镜放大时按它的宽度算护栏，别把这条「我在哪一页」的线索推出画面。 */
const sidebarRef = ref<HTMLElement | null>(null);
const cursorRef = ref<HTMLElement | null>(null);
/** 回卷时闪过的那层薄幕：在它最厚的一帧把时间轴推回开头。 */
const rewindVeilRef = ref<HTMLElement | null>(null);
/** 一轮结束的收尾层：明确告诉观众"演示完毕"，再开始下一轮。 */
const outroRef = ref<HTMLElement | null>(null);

// 五幕各自的取景目标：每一幕都推近到「动作正在发生的地方」。
const candidateRef = ref<HTMLElement | null>(null);
const candidateActionRef = ref<HTMLElement | null>(null);
const confirmBarRef = ref<HTMLElement | null>(null);
const boundaryRef = ref<HTMLElement | null>(null);
const articleRowRef = ref<HTMLElement | null>(null);
const generateBtnRef = ref<HTMLElement | null>(null);
const openArticleBtnRef = ref<HTMLElement | null>(null);
const citationRef = ref<HTMLElement | null>(null);
const publishRef = ref<HTMLElement | null>(null);
const metricsRef = ref<HTMLElement | null>(null);
const drawerRef = ref<HTMLElement | null>(null);

let motion: ReturnType<typeof gsap.matchMedia> | undefined;
let timeline: ReturnType<typeof gsap.timeline> | undefined;
let resizeTimer: number | undefined;

type Frame = { scale: number; x: number; y: number };
type Point = { x: number; y: number };

/**
 * 镜头补间代理对象而不是直接补间元素：每帧 onUpdate 把代理值写到舞台 transform 上，
 * 取景坐标一律在舞台本地坐标系量取，再反解成镜头位移。
 */
const cam: Frame = { scale: 1, x: 0, y: 0 };

/** 真机骨架的设计宽度。__scene 的 CSS 尺寸就是它，缩放全在 transform 上。 */
const SCENE_W = 1440;

/** 场景此刻写入屏幕的缩放倍率（适配 × 取景）。取景数学与 transform 共用它。 */
function sceneScale(frame: Frame): number {
  return (presentationScale.value || 1) * frame.scale;
}

function applyCamera() {
  const scene = sceneRef.value;
  if (!scene) return;
  gsap.set(scene, {
    scale: sceneScale(cam),
    x: cam.x,
    y: cam.y,
    transformOrigin: '0 0',
  });
}

/**
 * 量一个元素在「真机坐标系」里的盒子。
 *
 * __scene 的 CSS 尺寸就是真机尺寸（1440 × 908），适配与取景缩放全在它的
 * transform 上，所以 getBoundingClientRect 的值除以当前倍率、再减去场景原点，
 * 得到的正是真机坐标 —— 取景数学整个建立在这套坐标上，直观且不会二义。
 */
function measureInScene(el: HTMLElement, sceneBox: DOMRect): DOMRect {
  const box = el.getBoundingClientRect();
  const k = sceneScale(cam) || 1;
  return new DOMRect(
    (box.left - sceneBox.left) / k,
    (box.top - sceneBox.top) / k,
    box.width / k,
    box.height / k,
  );
}

/**
 * 取景解算：把真机坐标点 (px, py) 推到取景框中心，并钳进「画面始终被内容盖满」的区间。
 *
 * zoom 是相对「适配后」的再放大倍率（1 = 刚好看全）。
 * 屏幕倍率 k = fit * zoom，真机点映射到取景框就是 px * k。
 * 位移上界恒为 0；下界 = frameW - sceneW * k。
 * k >= 1 时下界 ≤ 0，区间有效（内容比取景框大，可平移）；
 * k < 1 说明内容装得下，此时居中，不做位移夹取。
 */
function frameTo(
  px: number,
  py: number,
  zoom: number,
  viewBox: DOMRect,
  scene: DOMRect,
): Frame {
  const k = (presentationScale.value || 1) * zoom;
  const spanX = viewBox.width - scene.width * k;
  const spanY = viewBox.height - scene.height * k;
  const tx = viewBox.width / 2 - px * k;
  const ty = viewBox.height / 2 - py * k;
  return {
    scale: zoom,
    x: spanX < 0 ? gsap.utils.clamp(spanX, 0, tx) : spanX / 2,
    y: spanY < 0 ? gsap.utils.clamp(spanY, 0, ty) : spanY / 2,
  };
}

/**
 * 取景框内的一个元素，此刻在屏幕上落在哪 —— 直接量 DOM，不用取景数学反推。
 *
 * 这里刻意**不再提供**「由 frame 反推落点」的那套算法（旧版 projectPoint）。
 * 它要求「当前 cam 恰好等于目标 frame」，只在建轴那一刻成立；镜头一飞，
 * 两者就分岔，落点整片偏移 —— 实测旧版一个循环里有三次光标跑到取景框外。
 *
 * 改成量真实位置后，不管镜头飞到哪、缩放多少，量到的就是屏幕上该在的点。
 * 代价是必须在镜头停稳之后调用（见 cursorFlyTo）。
 */
function livePointInFrame(el: HTMLElement, frameEl: HTMLElement): Point {
  const b = el.getBoundingClientRect();
  const f = frameEl.getBoundingClientRect();
  if (b.width === 0 && b.height === 0) {
    const parent = el.parentElement;
    if (parent && parent !== el) {
      const pb = parent.getBoundingClientRect();
      if (pb.width > 0 && pb.height > 0) {
        return {
          x: pb.left - f.left + pb.width / 2,
          y: pb.top - f.top + pb.height / 2,
        };
      }
    }
    return { x: f.width / 2, y: f.height / 2 };
  }
  return {
    x: b.left - f.left + b.width / 2,
    y: b.top - f.top + b.height / 2,
  };
}

/** Derive state from the playhead: replay and seeks cannot retain future state. */
function renderFilmState(time: number) {
  const t = Math.max(0, Math.min(HOME_FILM_DURATION, time));
  filmTime.value = t;
  const state = homeFilmState(t);
  filmState.value = state;
  // 页面只在真正换页时才写 —— 每帧都写会让滑动容器的 class 反复变化。
  if (currentPage.value !== state.page) currentPage.value = state.page;

  // 风格走马灯与收尾折叠状态（未手动锁定时由时间轴联动驱动）
  if (t < 39.2) {
    if (skinMenuOpen.value) skinMenuOpen.value = false;
    if (activeSkin.value !== 'default' && !skinPinned.value) {
      activeSkin.value = 'default';
    }
  } else if (!skinPinned.value) {
    if (t >= 39.8 && t < 44.2) {
      skinMenuOpen.value = true;
      if (t >= 43.7) activeSkin.value = 'warm-editorial';
      else if (t >= 42.9) activeSkin.value = 'nordic';
      else if (t >= 42.1) activeSkin.value = 'structured-soft';
      else if (t >= 41.3) activeSkin.value = 'dark';
      else if (t >= 40.5) activeSkin.value = 'default';
    } else if (t >= 44.2) {
      skinMenuOpen.value = false;
      // 45.0s 起平滑恢复默认风格，配合 420ms CSS 过渡实现纯净首尾衔接
      if (t >= 45.0) activeSkin.value = 'default';
    }
  }
}

function buildTimeline(): ReturnType<typeof gsap.timeline> | undefined {
  const scene = sceneRef.value;
  const viewport = viewportRef.value;
  const cursor = cursorRef.value;
  const drawer = drawerRef.value;
  if (!scene || !viewport || !cursor || !drawer) return;

  // Apply fit before measuring; dividing an unscaled box by fit breaks framing.
  cam.scale = 1;
  cam.x = 0;
  cam.y = 0;
  applyCamera();
  gsap.set(drawer, { x: 0, xPercent: 0 });
  const view = { width: viewport.getBoundingClientRect().width, height: viewport.clientHeight };
  const sceneBox = scene.getBoundingClientRect();
  const dimensions = { width: SCENE_W, height: scene.offsetHeight };
  const panorama: Frame = { scale: 1, x: 0, y: 0 };
  const focus = (el: HTMLElement | null, zoom = 1.6): Frame => {
    if (!el) return panorama;
    const box = measureInScene(el, sceneBox);
    return homeFilmFrame({ x: box.x, y: box.y, width: box.width, height: box.height }, view, dimensions, zoom);
  };
  /**
   * 特写取景：推到目标本身，允许它两侧的东西被裁掉。
   *
   * `focus()` 走的是 `homeFilmFrame` —— 那条路的约束是"必须装下整个目标"，
   * 所以拿"整行标题"当目标时只会一路拉远，想推到其中一个标签根本推不动。
   * 而"看这一个东西"本来就不需要看全四周，所以这里直接按 zoom 定倍率，
   * 只保留一条底线：不露出场景外的空白。
   */
  /**
   * 特写取景：推到目标本身，允许它两侧的东西被裁掉。
   *
   * targetScrollTop: 目标在所在页面自滚到此位置时的修正值。
   */
  const focusAt = (el: HTMLElement | null, zoom = 2, targetScrollTop = 0): Frame => {
    if (!el) return panorama;
    const box = measureInScene(el, sceneBox);
    const fit = view.width / dimensions.width;
    const k = fit * Math.max(1, zoom);
    const railW = sidebarRef.value?.offsetWidth ?? 232;
    // 宽目标（整行/整卡/整表，如 > 500px）贴齐主工作区左侧，避免把左侧内容推飞；
    // 小目标（如确认按钮 54px，判定标签 128px，行号 80px）居中显示
    const tx = box.width > 500
      ? -railW * k - 8
      : view.width / 2 - (box.x + box.width / 2) * k;
    const yAdjusted = box.y - targetScrollTop;
    const y = view.height / 2 - (yAdjusted + box.height / 2) * k;
    return {
      scale: Math.max(1, zoom),
      x: Math.max(view.width - dimensions.width * k, Math.min(0, tx)),
      y: Math.max(view.height - dimensions.height * k, Math.min(0, y)),
    };
  };

  /**
   * 方案 A 侧栏护栏（要么完整可见、要么完全移出，绝不切半截字）：
   * - 全景时（frame.scale <= 1.05）：x = 0, y = 0，侧栏 100% 完整可见可读；
   * - 推近时（frame.scale > 1.05）：侧栏必须 100% 完整移出视口左侧（x <= -railW * k），
   *   视口内 0% 侧栏，左边缘直接对齐主工作区，顶栏常驻面包屑承担方位感知；
   *   同时受限于 rightFloor（view.width - dimensions.width * k），保证右侧不露底白。
   */
  const guardRail = (frame: Frame): Frame => {
    if (frame.scale <= 1.05) {
      return { ...frame, scale: 1, x: 0, y: 0 };
    }
    const railW = sidebarRef.value?.offsetWidth ?? 232;
    const k = sceneScale(frame);
    // 侧栏在屏幕上宽 railW * k；右边缘在 0 或更左，位移必须 <= -railW * k
    const railCeil = -railW * k;
    const rightFloor = view.width - dimensions.width * k;
    // 保证 x 在 [rightFloor, railCeil] 内
    const minX = Math.min(rightFloor, railCeil);
    const maxX = Math.max(rightFloor, railCeil);
    const clampedX = Math.min(maxX, Math.max(minX, frame.x));
    const clampedY = Math.min(0, Math.max(view.height - dimensions.height * k, frame.y));
    return { ...frame, x: clampedX, y: clampedY };
  };
  // 判定标签要等第 02 幕才出现（v-show），建轴时先把它临时显示出来，
  // 否则量到的是 0×0，镜头会算出一个没有意义的取景。
  const boundaryEl = boundaryRef.value;
  const boundaryHidden = Boolean(
    boundaryEl && getComputedStyle(boundaryEl).display === 'none',
  );
  if (boundaryEl && boundaryHidden) boundaryEl.style.display = 'inline-flex';

  const MAX_CAMERA_ZOOM = 2.8;
  const frameOf = (
    el: HTMLElement | null,
    framing: string,
    zoom: number,
    targetScrollTop = 0,
  ): Frame => {
    if (!el || framing === 'panorama') return panorama;
    const safeZoom = Math.min(MAX_CAMERA_ZOOM, zoom);
    const framed =
      framing === 'wide' || framing === 'medium'
        ? focus(el, safeZoom)
        : focusAt(el, safeZoom, targetScrollTop);
    return guardRail(framed);
  };

  /** 自定义选择器：找不到元素就回退全景（不报错，也不会静默拍到别处）。 */
  const bySelector = (selector: string) =>
    scene.querySelector<HTMLElement>(selector);

  if (boundaryEl && boundaryHidden) boundaryEl.style.removeProperty('display');
  const drawerWidth = drawer.offsetWidth;
  // 抽屉的"待命位"必须真的在取景框外。位移量作用在**场景坐标系**（1440 宽），
  // 屏幕上还要再乘一次适配缩放（1440 视口下约 0.93），只推自身宽度会差出
  // (1 − 0.93) × 宽度 ≈ 31px —— 框右缘就永远露着一条抽屉边
  // （2026-10-12 实测：drawer 宽 483，框内可见 31px）。多推 48 吃掉缩放差与描边。
  gsap.set(drawer, { x: drawerWidth + 48, xPercent: 0 });
  gsap.set(cursor, { opacity: 0, x: view.width * 0.78, y: view.height * 0.7, scale: 1, xPercent: 0, yPercent: 0 });

  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: 'power3.inOut', immediateRender: false },
    onUpdate: () => renderFilmState(tl.time()),
    // 播完不是"死掉"：交给回卷逻辑接下一轮（任务书 §4.1 问的"怎么循环"）。
    onComplete: () => onFilmComplete(),
  });
  for (const chapter of HOME_FILM_CHAPTERS) tl.addLabel(chapter.key, chapter.at);
  /** 一次相机补间 */
  const shot = (frame: Frame, at: number, duration: number, ease = 'power3.inOut') => {
    tl.to(cam, { ...frame, duration, ease, onUpdate: applyCamera }, at);
  };
  const _shotTo = (
    el: HTMLElement | null,
    framing: 'close' | 'extreme' | 'medium' | 'panorama' | 'wide',
    zoom: number,
    at: number,
    duration: number,
    ease = 'power3.inOut',
    targetScrollTop = 0,
  ) => {
    if (!el || framing === 'panorama') {
      shot(panorama, at, duration, ease);
      return;
    }
    const targetFrame = frameOf(el, framing, zoom, targetScrollTop);
    shot(targetFrame, at, duration, ease);
  };

  /** 光标目标：元素 / 选择器 / 惰性求值函数。 */
  type CursorTarget =
    | HTMLElement
    | string
    | (() => HTMLElement | null | undefined)
    | null
    | undefined;

  const resolveTarget = (target: CursorTarget): HTMLElement | null => {
    if (!target) return null;
    if (typeof target === 'string') {
      return scene.querySelector<HTMLElement>(target);
    }
    if (typeof target === 'function') {
      return target() ?? null;
    }
    return target;
  };

  /**
   * 光标平滑滑向目标元素，保持真实视觉动线连贯性。
   */
  const glideCursor = (
    target: CursorTarget,
    at: number,
    duration = 0.6,
    ease = 'power2.inOut',
  ) => {
    if (!target || !viewport) return;
    tl.to(
      cursor,
      {
        x: () => {
          const el = resolveTarget(target);
          return el && viewport
            ? livePointInFrame(el, viewport).x - 3
            : Number(gsap.getProperty(cursor, 'x')) || 0;
        },
        y: () => {
          const el = resolveTarget(target);
          return el && viewport
            ? livePointInFrame(el, viewport).y - 2
            : Number(gsap.getProperty(cursor, 'y')) || 0;
        },
        duration,
        ease,
        lazy: false,
      },
      at,
    );
  };

  /**
   * 动作点击：光标滑到目标元素 -> 真实下压按键 -> 释放并即刻触发业务状态翻转。
   * 彻底杜绝任何卡片跳跃、缩放抖动或脱节感。
   */
  const actionClick = (
    target: CursorTarget,
    moveStartAt: number,
    clickAt: number,
  ) => {
    if (!target || !viewport) return;
    tl.to(cursor, { opacity: 1, duration: 0.18 }, moveStartAt)
      .to(
        cursor,
        {
          x: () => {
            const el = resolveTarget(target);
            return el && viewport
              ? livePointInFrame(el, viewport).x - 3
              : Number(gsap.getProperty(cursor, 'x')) || 0;
          },
          y: () => {
            const el = resolveTarget(target);
            return el && viewport
              ? livePointInFrame(el, viewport).y - 2
              : Number(gsap.getProperty(cursor, 'y')) || 0;
          },
          duration: clickAt - moveStartAt,
          ease: 'power2.inOut',
          lazy: false,
        },
        moveStartAt,
      )
      .to(cursor, { scale: 0.88, duration: 0.08, ease: 'power1.in' }, clickAt)
      .to(cursor, { scale: 1, duration: 0.1, ease: 'power1.out' }, clickAt + 0.08);
  };

  /**
   * 内容区滚动：真机上这四页都是**内容区自己滚**（页面壳体不动）。
   */
  const scrollSlide = (page: DemoPage, to: number, at: number, duration = 0.7) => {
    const el = scene.querySelector<HTMLElement>(`[data-page="${page}"]`);
    if (!el) return;
    const proxy = { y: el.scrollTop };
    tl.to(
      proxy,
      {
        y: to,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => { el.scrollTop = proxy.y; },
      },
      at,
    );
  };

  // ── 幕 01 · AI 回答时，提到你（0 → 6.5s）· facts ──────────────
  // 全景宏观视角建立认知：整台真机工作台完整呈现，侧栏、顶栏、面包屑实色清晰可见，零卡片弹跳，零闪烁
  shot(panorama, 0, 0.4, 'power2.out');
  scrollSlide('facts', 0, 0, 0.1);

  // 0.2s -> 0.5s：光标淡入滑向搜索框并点击，触发搜索筛选打字机效果
  actionClick('.geo-facts-search', 0.2, 0.5);

  // 1.8s -> 3.4s：光标从搜索框从容滑向「确认入库」操作并在 3.4s 真实下压点击
  actionClick(candidateActionRef.value || '.geo-cand-side .geo-btn', 1.8, 3.4);

  // ── 幕 02 · 提的，是你真做过的（6.5 → 11s）· facts ──────────
  // 6.8s -> 7.8s：光标平滑滑向系统划定的「仅限内部，禁止公开」事实边界标签
  glideCursor(boundaryRef.value || '[data-boundary]', 6.8, 0.8);

  // 8.6s -> 10.4s：光标滑向顶栏工作流向导「4 内容生产」并真实点击切入内容模块
  actionClick(
    '.geo-home-stage__step[data-step="4"]',
    8.6,
    10.4,
  );

  // ── 幕 03 · 文章自动写好，带出处（11 → 18s）· content ────────
  // 11s 整：页面切入内容生产列表，展现真实内容任务与已生成文章记录
  scrollSlide('content', 0, 11, 0.4);
  // 11.2s -> 12.0s：光标从容滑向目标文章行操作列中的 [打 开] 按钮，并在 12.0s 真实下压点击！
  actionClick(
    openArticleBtnRef.value || '.geo-ws-open-btn',
    11.2,
    12.0,
  );
  // 12.0s 点击后：无缝展开切入真实文章工作台画布，大模型流式打字机逐句推流成稿！
  // 12.6s -> 13.3s：光标滑向正文引导视线
  glideCursor('.ws-editor-surface', 12.6, 0.7);
  // 13.5s -> 14.5s：光标悬停事实引用角标，右侧「内容背景 - 要素与事实」联动高亮锁定出处
  glideCursor('.geo-cite-badge', 13.5, 0.8);
  // 16.0s -> 16.8s：稿件打字完成，光标移向底部字数栏核验篇幅（929字，600~1000字达标）
  glideCursor('.ws-wordcount', 16.0, 0.7);

  // ── 幕 04 · 发出去，AI 才看得到（18 → 23s）· content ──────────
  // 18.2s -> 19.2s：光标平滑滑向右上角操作条「发 布」按钮，并在 19.2s 真实点击发布！
  actionClick(
    publishRef.value || '.geo-ws-publish-btn',
    18.2,
    19.2,
  );
  // 20.8s -> 22.4s：光标滑向顶栏工作流向导「8 复盘报告」并真实点击进入复盘矩阵
  actionClick(
    '.geo-home-stage__step[data-step="8"]',
    20.8,
    22.4,
  );

  // ── 幕 05 · 被提到多少，如实报（23 → 29.5s）· reports ─────────
  // 23s 整：侧栏点击生效，页面平滑切入复盘报告
  scrollSlide('reports', 0, 23, 0.4);
  // 23.4s -> 24.4s：光标划过第 1 行 100.0% 度量，直奔右侧「查看记录」并在 24.4s 真实点击展开！
  actionClick(
    '.geo-report-table tbody tr:first-child .geo-link',
    23.4,
    24.4,
  );
  // 24.8s -> 25.8s：光标平滑滑入展开的实测问答原话与出处卡片
  glideCursor('.geo-report-detail-card', 24.8, 0.8);

  // ── 幕 06 · AI 怎么收录，逐家摸清（29.5 → 34s）· reports ───────
  // 29.8s -> 31.0s：光标自然移向第 2 行主流模型验证结果（豆包、千问、智谱清言、文心一言）
  glideCursor('.geo-report-table tbody tr:nth-child(2) .geo-table-secondary', 29.8, 0.8);

  // ── 幕 07 · 测得到，才调得准（34 → 39.5s）· reports ───────────
  // 33.6s -> 34.8s：光标平滑滑向第 2 行「查看记录」并在 34.8s 真实点击展开全矩阵复盘留痕！
  actionClick('.geo-report-table tbody tr:nth-child(2) .geo-link', 33.6, 34.8);
  glideCursor('.geo-report-detail-card', 35.2, 0.8);

  // ── 幕 08 · 收尾：切换风格走马灯与电影级平滑换幕循环（38.8 → 48s）───────
  // 1. 镜头平滑退回全景
  shot(panorama, 38.8, 0.8, 'power2.inOut');

  // 2. 39.0s -> 39.8s：光标移向右上角风格切换按钮并在 39.8s 真实点击展开面板
  actionClick('.geo-home-stage__appearance-trigger', 39.0, 39.8);
  tl.call(() => {
    skinMenuOpen.value = true;
  }, [], 39.8);

  // 3. 40.0s -> 44.2s：走马灯式光标依次滑向并点击所有 5 套风格卡片
  // 风格 1：旗舰深海宝蓝 (default)
  actionClick('.geo-home-stage__theme-card[data-theme-key="default"]', 40.0, 40.5);
  tl.call(() => {
    activeSkin.value = 'default';
  }, [], 40.5);

  // 风格 2：旗舰宝蓝 · 暗黑版 (dark)
  actionClick('.geo-home-stage__theme-card[data-theme-key="dark"]', 40.8, 41.3);
  tl.call(() => {
    activeSkin.value = 'dark';
  }, [], 41.3);

  // 风格 3：极客科技蓝紫 (structured-soft)
  actionClick('.geo-home-stage__theme-card[data-theme-key="structured-soft"]', 41.6, 42.1);
  tl.call(() => {
    activeSkin.value = 'structured-soft';
  }, [], 42.1);

  // 风格 4：北欧松绿 (nordic)
  actionClick('.geo-home-stage__theme-card[data-theme-key="nordic"]', 42.4, 42.9);
  tl.call(() => {
    activeSkin.value = 'nordic';
  }, [], 42.9);

  // 风格 5：暖色编辑 (warm-editorial)
  actionClick('.geo-home-stage__theme-card[data-theme-key="warm-editorial"]', 43.2, 43.7);
  tl.call(() => {
    activeSkin.value = 'warm-editorial';
  }, [], 43.7);

  // 44.2s：关闭风格面板，光标淡出
  tl.call(() => {
    skinMenuOpen.value = false;
  }, [], 44.2);
  tl.to(cursor, { opacity: 0, duration: 0.3 }, 44.2);

  // 4. 45.0s：自然平滑切回默认旗舰风格，100% 全景满幅贴边无漏边、无白光闪烁
  tl.call(() => {
    activeSkin.value = 'default';
    skinMenuOpen.value = false;
  }, [], 45.0);

  // ── 收尾折叠（45.2 → 48.0s）────────────────────────────────────────
  // 45~48s 原本是 3 秒空白，观众看到的只是"画面突然跳回开头"。这里补上收尾：
  // 画面向内折叠收干净 → 纯色静置片刻 → 收尾层淡出，顺势自动开始下一轮。
  // 不放文案也不放进度条：折叠动作已经把"这一轮结束"说完了。
  const outro = outroRef.value;
  if (outro) {
    tl.to(
      scene,
      { scaleY: 0.92, opacity: 0, duration: 0.7, ease: 'power2.inOut' },
      45.2,
    );
    tl.fromTo(
      outro,
      { opacity: 0 },
      { opacity: 1, duration: 0.45, ease: 'none' },
      45.5,
    );
    tl.to(outro, { opacity: 0, duration: 0.25, ease: 'none' }, 47.75);
  }

  // 确保场景全程保持 100% 贴边全景，杜绝任何缩小产生边缘缝隙与漏光
  gsap.set(scene, {
    clearProps: 'filter,opacity',
  });
  if (rewindVeilRef.value) {
    gsap.set(rewindVeilRef.value, { opacity: 0 });
  }

  renderFilmState(0);
  return tl;
}

/** Local presentation controls: never call product APIs. */
async function playChapter(key: FilmChapterKey) {
  const chapter = HOME_FILM_CHAPTERS.find((item) => item.key === key);
  if (!chapter) return;
  if (!motionEnabled.value) {
    showSceneAt(chapter.key);
    return;
  }
  timeline?.kill();
  clearStageEffects();
  filmMode.value = 'auto';
  playbackPaused.value = false;
  skinMenuOpen.value = false;
  renderFilmState(chapter.at);
  await nextTick();
  if (disposed) return;
  startLoop();
  timeline?.seek(chapter.at, true);
  applyCamera();
  renderFilmState(chapter.at);
  const root = pageRef.value;
  const section = root?.querySelector<HTMLElement>('#product-film');
  if (root && section) {
    root.scrollTo({ top: section.offsetTop - 64, behavior: 'smooth' });
  }
  playbackPaused.value = false;
  timeline?.play();
  // 平滑滚动过程中及就位后各兜一次起播（滚动与播放已解耦，这里只是幂等重试）
  setTimeout(wakeStage, 150);
  setTimeout(wakeStage, 400);
  setTimeout(wakeStage, 800);
}

/**
 * 算「真机 1440px 骨架缩进取景框」的适配倍率。
 *
 * 只算倍率，不写任何内联尺寸 —— 适配与取景共用 __scene 上的那一次 transform，
 * 写死尺寸会让两层缩放重新打架（旧版就是这么坏的）。
 */
function fitPresentation() {
  const frame = viewportRef.value;
  if (!frame) return;
  if (window.innerWidth < 900) {
    presentationScale.value = 1;
    return;
  }
  presentationScale.value = frame.getBoundingClientRect().width / SCENE_W;
}

function clearStageEffects() {
  // 收尾层要一并复位：跳章时若留着它，画面会被遮罩盖住。
  const outro = outroRef.value;
  if (outro) {
    gsap.set(outro, { opacity: 0 });
  }
  const scene = sceneRef.value;
  if (!scene) return;
  gsap.set(
    [
      scene,
      ...scene.querySelectorAll(
        '[data-page], [data-block], [data-boundary], [data-publish], [data-field], [data-claim], [data-sig], [data-hallu], [data-locked], [data-strike], [data-check], [data-qa]',
      ),
    ],
    { clearProps: 'opacity,transform,visibility' },
  );
  const flow = scene.querySelector('[data-flow]');
  if (flow) gsap.set(flow, { clearProps: 'strokeDasharray,strokeDashoffset' });
  // 抽屉要显式推回右侧外面。只 clearProps 会退回 CSS 的 translateX(100%)，
  // 但 GSAP 写过内联 transform 之后这个退回并不可靠（实测会停在画面里，
  // 于是静态态看到一块抽屉盖住内容）。
  if (drawerRef.value) {
    const w = drawerRef.value.offsetWidth || 0;
    gsap.set(drawerRef.value, { x: w, xPercent: 0 });
  }
  if (cursorRef.value) gsap.set(cursorRef.value, { opacity: 0 });
}

/**
 * 把镜头归位到全景：整台工作台刚好铺满取景框，左右不裁、
 * 顶部对齐到工作台顶端。静态终态与「重新播放」都从这儿起步。
 */
function resetCameraToPanorama() {
  const frame = viewportRef.value;
  const scene = sceneRef.value;
  if (!frame || !scene) return;
  const viewBox = new DOMRect(0, 0, frame.clientWidth, frame.clientHeight);
  cam.scale = 1;
  cam.x = 0;
  cam.y = 0;
  gsap.set(scene, { clearProps: 'transform' });
  const sceneBox = scene.getBoundingClientRect();
  const sceneW = sceneBox.width || SCENE_W;
  const sceneH = sceneBox.height || 908;
  const next = frameTo(sceneW / 2, 0, 1, viewBox, {
    width: sceneW,
    height: sceneH,
  } as DOMRect);
  cam.scale = next.scale;
  cam.x = next.x;
  cam.y = next.y;
  applyCamera();
}

/**
 * 校验用把手：把切页与切肤能力挂到 window。
 *
 * 只服务于 `verify/*.mjs` 的截图脚本 —— 演播是时间轴驱动的，没有入口就
 * 没法把某页定帧后与真机截图逐项比对，只能靠肉眼看动画猜。
 * 生产环境同样存在，但**只暴露两个纯展示动作**，不读数据、不发请求、
 * 不写业务状态；页面卸载时由 matchMedia 的清理函数删除。
 */
function exposeVerifyApi() {
  (window as unknown as { __geoHome?: unknown }).__geoHome = {
    showScene: showSceneAt,
    /**
     * 跳到某一幕重新播。
     *
     * 逐幕检查构图要用它 —— 否则 `verify/motion-film.mjs` 只能靠运气抓动画中的帧，
     * 采样开始时第 01 幕往往已经播掉一半。
     */
    playChapter: (key: FilmChapterKey) => void playChapter(key),
    /**
     * 跳到任意时刻并停在那一帧。
     *
     * 它不只在开发时有用 —— 生产构建同样需要：`playChapter` 会先平滑滚动到演播台，
     * 而滚动过程中 `stageInView` 会短暂为 false，`syncPlayback()` 随即把时间轴暂停，
     * 于是"跳到第 N 幕再等几秒截图"这条路径在生产上根本不走。
     * 逐幕取帧改用 seek：定位 + 暂停，不受视口判断干扰。
     */
    seek: (time: number) => {
      timeline?.pause().seek(time, true);
      applyCamera();
      renderFilmState(time);
      playbackPaused.value = true;
    },
    chapters: () =>
      HOME_FILM_CHAPTERS.map((c, i, arr) => ({
        key: c.key,
        at: c.at,
        page: c.page,
        dur: (arr[i + 1]?.at ?? HOME_FILM_DURATION) - c.at,
      })),
    pages: () => Object.keys(pageMeta),
    setSkin: (key: SkinKey) => pickSkin(key),
    skins: () => skins.map((s) => s.key),
    current: () => currentPage.value,
    /** 时间轴总时长与当前进度：镜头节奏的客观读数，供 verify/*.mjs 断言。 */
    shape: () => ({
      duration: timeline ? Number(timeline.duration().toFixed(2)) : 0,
      progress: timeline ? Number(timeline.progress().toFixed(3)) : 0,
      tweenCount: timeline ? timeline.getChildren(true, true, false).length : 0,
      cam: { scale: Number(cam.scale.toFixed(3)), x: Math.round(cam.x), y: Math.round(cam.y) },
      /** 当前由谁驱动（auto = 时间自走 / manual = 滚动接管），以及在第几幕。 */
      mode: filmMode.value,
      chapter: filmChapter.value.key,
    }),
  };
}

/**
 * 静态终态：`prefers-reduced-motion` 与窄屏走这一条路。
 *
 * 这是**第一公民**，不是"动画被打断后的残骸"—— 内容必须以终态完整可见
 * （任务书 §7.6）。所以这里把所有演示状态直接设成末帧；
 * 但**停在被点的那一幕**：否则用户在减弱动效下点「01 确认事实」，
 * 画面却告诉他「05 没测到」，那是错的。
 */
function showSceneAt(chapterKey: FilmChapterKey) {
  const chapter = HOME_FILM_CHAPTERS.find((item) => item.key === chapterKey);
  if (!chapter) return;
  filmMode.value = 'manual';
  playbackPaused.value = true;
  timeline?.kill();
  timeline = undefined;
  clearStageEffects();
  // 关键：镜头要一并归位。只清元素的 opacity/transform 而不动 cam，
  // 静态态会停在动画最后一帧的推近位置，于是左右两侧被裁掉一块，
  // 看着像「窗口里塞了个缩略图」。
  resetCameraToPanorama();
  currentPage.value = chapter.page;
  filmTime.value = chapter.at;
  filmState.value = {
    ...homeFilmState(HOME_FILM_DURATION),
    chapter,
    page: chapter.page,
  };
}

/** 舞台唤醒兜底守卫。
 *  早先这里要判断演播台是否在视口内（配合 sticky + 嵌套滚动容器的几何校正），
 *  滚动耦合拆掉后它退化成一次纯粹的播放调度 —— 直接转发给 syncPlayback()，
 *  保留函数名只是为了不动那十几处调用点。 */
function wakeStage() {
  syncPlayback();
}

/**
 * 播放调度。
 *
 * 演播台**不再看有没有滚进视口**：进了页面就该在播，从头到尾一直循环。
 * 早先按 attio 的做法把它绑在滚动位置上（"滚到才播"），实际有两个坑：
 *   1. 演播台在页面最底部，滚动容器嵌套 + sticky 几何变化，观察器容易漏判，
 *      用户滚到跟前了画面仍然是死的；
 *   2. 一旦被暂停在时间轴末尾，`onComplete` 不再触发，回卷逻辑也不执行，
 *      于是永久卡在最后一帧 —— 表现就是"定在那儿不动"。
 * 现在只有两种情况会停：整页切到后台，或用户手动暂停。
 */
function syncPlayback() {
  if (!timeline || disposed) return;
  const canAutoPlay = !document.hidden && !playbackPaused.value && filmMode.value === 'auto';
  if (canAutoPlay) {
    if (timeline.paused()) {
      timeline.play();
    }
  } else if (document.hidden) {
    timeline.pause();
  }
}

/* onContainerScroll 已删除：演播台与滚动彻底解耦。
   它原先负责"滚进视口就起播"，但那套判断在嵌套滚动容器 + sticky 下会漏报，
   而且一旦把时间轴暂停在末尾，onComplete 不再触发、回卷也不执行。
   现在播放只由 syncPlayback() 依据「页面是否可见 / 是否手动暂停」决定。 */

/**
 * 一轮播完：**无缝回卷**，继续下一轮（用户 2026-10-12 要求固定循环播放）。
 *
 * 薄幕此刻已经升到全白（时间轴末尾 46.0s 起用 fromTo 升到 1），于是就在它
 * 最厚的这一帧把时间轴推回开头，再把薄幕淡出 —— 首尾是同一段运动，观众看不到
 * "回到原点"的跳变。（这里原来是"播一次就停 + 结束层「再看一遍」"，
 * 结束层与 replayFilm 已按用户要求删掉。）
 */
function onFilmComplete() {
  if (disposed || filmMode.value !== 'auto') return;
  // 复位收尾时被改动的状态：皮肤回到默认、调色盘菜单收起
  skinMenuOpen.value = false;
  skinPinned.value = false;
  activeSkin.value = 'default';
  // 收尾层与折叠态复位：新一轮必须从「展开 + 无遮罩」开始，
  // 否则残留的 scaleY 会让整轮演播台一直是压扁的。
  const outro = outroRef.value;
  if (outro) {
    gsap.set(outro, { opacity: 0 });
  }
  const stageScene = sceneRef.value;
  if (stageScene) {
    gsap.set(stageScene, { clearProps: 'transform,opacity' });
  }
  const veil = rewindVeilRef.value;
  if (veil) {
    gsap.set(veil, { opacity: 0 });
  }
  // 第二个参数必须是 true（suppressEvents）：从末尾往回 seek 到 0 避免倒着触发切皮肤回调
  timeline?.seek(0, true);
  renderFilmState(0);
  applyCamera();
  timeline?.play();
}

function startLoop() {
  if (!motionEnabled.value || filmMode.value === 'manual' || disposed) return;
  timeline?.kill();
  clearStageEffects();
  timeline = buildTimeline();
  // 不再用 IntersectionObserver 做"进视口才播"的门控（见 syncPlayback 注释）。
  syncPlayback();
}

/**
 * 演播窗口与滚动已解耦。
 *
 * 原实现（attio 的等价做法）把窗口做成 `position: sticky`，再把整窗的 translateY
 * 绑在 `#product-film` 跑道的滚动进度上，让粘住期间"每滚 1px 画面都在走"。
 * 这套联动已按要求移除：演播台现在就是文档流里一个普通区块，位置固定、
 * 不随滚动移动、不随滚动高度变化，内容按自己的时钟循环播放。
 */

function onResize() {
  fitPresentation();
  if (!motionEnabled.value) resetCameraToPanorama();
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    if (motionEnabled.value) {
      const time = filmTime.value;
      startLoop();
      timeline?.seek(time, true);
      applyCamera();
      renderFilmState(time);
      syncPlayback();
    }
  }, 250);
}

function teardownStage() {
  window.clearTimeout(resizeTimer);
  timeline?.kill();
  timeline = undefined;
  clearStageEffects();
}

onMounted(async () => {
  await nextTick();
  const root = pageRef.value;
  if (!root) return;

  for (const button of root.querySelectorAll<HTMLButtonElement>('.geo-home-stage__scene button')) {
    button.tabIndex = -1;
  }
  fitPresentation();
  await nextTick();
  if (disposed) return;
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', syncPlayback);
  // 客户背书卡组：进入页面即开始自动轮播（减弱动效时不启动，见 deckAutoplayAllowed）
  document.addEventListener('visibilitychange', deckHandleVisibility);
  if (typeof ResizeObserver !== 'undefined' && viewportRef.value) {
    presentationObserver = new ResizeObserver(onResize);
    presentationObserver.observe(viewportRef.value);
  }
  // 滚动相关的播放监听已全部移除：演播台不再由滚动唤醒。
  // 只保留 hash 变化时的一次调度 —— 那是 URL 跳转，与滚动位置无关。
  window.addEventListener('hashchange', wakeStage);

  // 客户背书卡组视口感知：滚到卡组才开始倒计时，首张 2400ms 快速反馈，彻底告别“等一个才动”
  const deckEl = root.querySelector<HTMLElement>('.geo-deck');
  if (deckEl && typeof IntersectionObserver !== 'undefined') {
    deckObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          if (!deckStarted) {
            deckStarted = true;
            deckScheduleNext(true);
          } else if (!deckPaused.value && !deckTimer) {
            deckScheduleNext(false);
          }
        } else {
          deckClearTimers();
        }
      },
      { threshold: 0.15 },
    );
    deckObserver.observe(deckEl);
  } else {
    deckStarted = true;
    deckScheduleNext(true);
  }

  // 首屏挂载后多轮唤醒检测（兼顾浏览器历史滚动恢复与自动锚点就位）
  requestAnimationFrame(() => {
    wakeStage();
    setTimeout(wakeStage, 100);
    setTimeout(wakeStage, 300);
    setTimeout(wakeStage, 600);
  });
  motion = gsap.matchMedia();

  // 页面级 reveal：内容块进视口后**播一次**入场，不绑滚动进度。
  // 2026-10-14 修正：原先用 fromTo + scrub（起始态 autoAlpha:0 常驻、入场完全跟滚动位置走），
  // 后果是同一屏里「这块清楚、那块还是半透明」—— 滚动没走到位就永久停在中间态。
  // 现改为：未进视口的元素才预设透明，进视口淡入一次；已在视口内的保持可见，不闪。
  // 演示区（#product-film 演播台、#agent 对话演示）整体排除：它们有自己的时钟，
  // 要像循环动画一样自己跑完，不受滚动/操作影响。
  // 不用 pin（被否过）；页面照常滚。
  // data-reveal="group" 的容器展开成可见直接子元素，让列表/卡片逐个入场。
  motion.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.registerPlugin(ScrollTrigger);
    const revealEls = [...root.querySelectorAll<HTMLElement>('[data-reveal]')];
    const targets = revealEls
      .filter((el) => !el.closest('#product-film, #agent'))
      .flatMap((el) =>
        el.dataset.reveal === 'group'
          ? [...el.children].filter(
              (k): k is HTMLElement =>
                k instanceof HTMLElement && !k.hasAttribute('aria-hidden'),
            )
          : [el],
      );
    if (targets.length === 0) return;

    const triggers: ScrollTrigger[] = [];
    for (const el of targets) {
      // 只对「还没进视口」的内容设起始态；已经能看到的不设，避免"先可见→再闪一下"
      const alreadyVisible = el.getBoundingClientRect().top < window.innerHeight * 0.95;
      if (!alreadyVisible) {
        gsap.set(el, { autoAlpha: 0, y: 26 });
      }
      const st = ScrollTrigger.create({
        scroller: root,
        trigger: el,
        start: 'top 95%',
        once: true,
        onEnter: () => {
          gsap.to(el, {
            autoAlpha: 1,
            y: 0,
            duration: 0.55,
            ease: 'power2.out',
            overwrite: true,
          });
        },
      });
      triggers.push(st);
    }
    ScrollTrigger.refresh();

    return () => {
      for (const st of triggers) st.kill();
      gsap.set(targets, { clearProps: 'opacity,visibility,transform' });
    };
  });

  // 演播窗口的滚动联动已移除（原来这里是 sticky + translateY 的 scrub 块）。
  // 现要求：演播台位置固定、不随滚动移动，内容按自己的时钟循环播放。

  // DSH 对话场景：滚到才播。播完停在终态，不循环 —— 反复重播会让人分心。
  // 阈值用 0.12 而不是 0.35：这个区块比视口还高，比例阈值永远达不到，
  // 用一个小比例 + rootMargin 保证「刚露头就开始演」。
  if (typeof IntersectionObserver !== 'undefined') {
    const agentSection = root.querySelector('#agent');
    if (agentSection) {
      const agentObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && !agentPlayed) {
              agentPlayed = true;
              agentActive.value = true;
              agentObserver.disconnect();
            }
          }
        },
        { root, threshold: 0.12, rootMargin: '0px 0px -10% 0px' },
      );
      agentObserver.observe(agentSection);
      agentCleanup = () => agentObserver.disconnect();
    }

    const whyGrid = root.querySelector('.geo-why-grid');
    if (whyGrid) {
      if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: no-preference)').matches) {
        capabilityStats.industry = '0+';
        capabilityStats.media = '0+';
        capabilityStats.ai = '0';
      }
      const whyObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              triggerCapabilityStatsCountUp();
              whyObserver.disconnect();
            }
          }
        },
        { root, threshold: 0.15 },
      );
      whyObserver.observe(whyGrid);
      statsCountUpCleanup = () => {
        whyObserver.disconnect();
        industryTween?.kill();
        mediaTween?.kill();
        aiTween?.kill();
        statSlideTween?.kill();
      };
    }
  }

  // 演播镜头系统：双分支都登记——减动效与窄屏用户直接拿到信息完整的静态终态。
  motion.add(
    {
      live: '(prefers-reduced-motion: no-preference) and (min-width: 900px)',
      still: '(prefers-reduced-motion: reduce), (max-width: 899px)',
    },
    ({ conditions }) => {
      motionEnabled.value = Boolean(conditions?.live && !conditions?.still);
      if (!motionEnabled.value) {
        showSceneAt('reports');
        // 静态态也不摊开风格面板：真产品里它是按需打开的浮层，
        // 默认展开会盖住内容区，反而看不清界面本身。
        skinMenuOpen.value = false;
        exposeVerifyApi();
        return () => {
          teardownStage();
          delete (window as { __geoHome?: unknown }).__geoHome;
        };
      }
      stageRootRef.value?.classList.add('is-live');
      filmMode.value = 'auto';
      playbackPaused.value = false;
      currentPage.value = 'facts';
      skinMenuOpen.value = false;
      exposeVerifyApi();
      startLoop();
      return () => {
        stageRootRef.value?.classList.remove('is-live');
        teardownStage();
        delete (window as { __geoHome?: unknown }).__geoHome;
      };
    },
  );
});

onBeforeUnmount(() => {
  disposed = true;
  window.removeEventListener('resize', onResize);
  document.removeEventListener('visibilitychange', syncPlayback);
  document.removeEventListener('visibilitychange', deckHandleVisibility);
  deckClearTimers();
  deckObserver?.disconnect();
  presentationObserver?.disconnect();
  window.removeEventListener('hashchange', wakeStage);
  agentCleanup?.();
  statsCountUpCleanup?.();
  motion?.revert();
  teardownStage();
  delete (window as { __geoHome?: unknown }).__geoHome;
});
</script>

<template>
  <div
    ref="pageRef"
    class="geo-home-page relative h-screen overflow-y-auto overflow-x-hidden antialiased"
  >
<!-- ================================================================ -->
    <!-- 导航栏                                                            -->
    <!-- ================================================================ -->
    <!-- 导航栏不透明：它下面会滚过深色区块，
         半透明会让黑色透上来显脏（headless 下 backdrop-blur 还不一定渲染）。 -->
    <!-- 顶部公告条：一条细线 + 居中一行小字，没有底色。
         原先是一根满宽的蓝条 —— 那个形状本身就在喊"促销"，是廉价感最直接的来源之一。
         Vercel 的做法是纯文字居中（"Ship 26 is coming to SF · Get your ticket ›"），
         同样的信息，观感差了整整一档。 -->
    <div
      v-if="bannerVisible"
      class="relative flex h-10 items-center justify-center border-b border-zinc-200/80 bg-zinc-50/90 px-12"
    >
      <span class="flex items-center gap-1.5 text-[12.5px] text-zinc-800">
        <span class="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white">实测闭环</span>
        从上传资料到 AI 实测，八步走完
        <span class="text-zinc-400">·</span>
        <a
          class="font-medium text-zinc-900 underline decoration-zinc-400 underline-offset-[3px] transition-colors hover:decoration-zinc-900"
          href="#product-film"
        >
          看看怎么走
        </a>
      </span>
      <button
        class="absolute top-1/2 right-3 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-200/60 hover:text-zinc-800"
        type="button"
        aria-label="关闭公告"
        @click="bannerVisible = false"
      >
        <svg
          class="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6 6l12 12M18 6L6 18"
          />
        </svg>
      </button>
    </div>

    <header
      class="sticky top-0 z-50 px-4 pt-3 sm:px-6 sm:pt-4"
    >
      <div
        class="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-4 rounded-full border border-zinc-200/90 bg-white/95 pl-5 pr-2.5 shadow-[0_4px_20px_-6px_rgba(0,0,0,0.06)] backdrop-blur-xl"
      >
        <div class="flex items-center gap-3">
          <RouterLink
            class="flex items-center gap-2.5 transition-opacity hover:opacity-90"
            to="/geo/home"
            aria-label="GEO 首页"
          >
            <img
              :src="brandMark"
              alt=""
              class="h-7 w-7 rounded-[7px] border border-zinc-200 bg-white object-contain"
            />
            <span
              class="whitespace-nowrap text-[15px] font-semibold tracking-[-0.02em] text-zinc-900"
              >GEO
              <span class="font-normal text-zinc-500">可见度工作台</span></span>
          </RouterLink>
        </div>

        <nav
          class="hidden items-center gap-6 text-[13.5px] font-medium text-zinc-600 md:flex"
          aria-label="主导航"
        >
          <a class="text-zinc-600 transition-colors hover:text-zinc-900" href="#product-film">产品演示</a>
          <a class="text-zinc-600 transition-colors hover:text-zinc-900" href="#questions">常见问题</a>
        </nav>

        <div class="flex items-center gap-2">
          <RouterLink
            class="hidden rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-50 sm:block"
            to="/geo/login"
          >
            登录
          </RouterLink>
          <RouterLink
            class="geo-home-cta group hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-zinc-900 px-4 py-1.5 text-[13px] font-medium text-white shadow-2xs transition-all hover:bg-zinc-800 active:bg-zinc-950 sm:flex"
            to="/geo/login"
          >
            <span>进入工作台</span>
            <svg
              class="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </RouterLink>
          <details ref="mobileNavRef" class="geo-home-mobile-nav md:hidden">
            <summary
              class="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-800"
              aria-label="打开导航菜单"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 7h16M4 12h16M4 17h16"
                />
              </svg>
            </summary>
            <div
              class="absolute inset-x-0 top-16 flex flex-col gap-1 border-b border-zinc-200 bg-white/95 px-4 py-3 text-[14px] text-zinc-800 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)] backdrop-blur-md"
            >
              <a class="py-1.5" href="#product-film" @click="closeMobileNav">产品演示</a>
              <a class="py-1.5" href="#questions" @click="closeMobileNav">常见问题</a>
              <RouterLink
                class="geo-home-cta mt-2 flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-zinc-900 px-4 py-2 text-[13.5px] font-medium text-white"
                to="/geo/login"
                @click="closeMobileNav"
              >
                <span>进入工作台</span>
              </RouterLink>
            </div>
          </details>
        </div>
      </div>
    </header>

    <main class="relative z-10">
      <!-- ================================================================ -->
      <!-- 1. Hero 主张                                                       -->
      <!-- ================================================================ -->
      <section
        class="geo-home-hero relative overflow-hidden px-6 pb-12 pt-16 sm:pb-16 sm:pt-24"
      >
        <!-- 首屏环境微光与点阵背景 -->
        <div class="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[960px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-zinc-200/40 via-slate-100/30 to-transparent blur-3xl" aria-hidden="true"></div>
        <div class="geo-home-hero__grid" aria-hidden="true"></div>
        <div class="relative z-10 mx-auto max-w-[880px] text-center">
          <div
            class="mb-8 inline-flex items-center rounded-full border border-zinc-200/90 bg-white/95 px-3.5 py-1.5 text-[12px] font-medium text-zinc-700 shadow-2xs backdrop-blur-xs"
            data-reveal
          >
            企业级 AI 检索可见度治理
          </div>
          <h1
            class="mb-7 text-[40px] font-medium leading-[1.18] tracking-tight text-zinc-900 sm:text-[54px] md:text-[68px]"
            data-reveal
          >
            让 AI 开口就提到你。<br class="hidden sm:block" />
            说你真正做过的事。
          </h1>
          <p
            class="mx-auto max-w-[560px] text-[16px] leading-[1.65] text-zinc-600 sm:text-[18px]"
            data-reveal
          >
            客户问 AI 的时候，答案里有你的名字。连接企业事实知识库，让每一次提及都有据可查。
          </p>
          <div
            class="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            data-reveal="group"
          >
            <RouterLink
              class="geo-home-cta flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-5 py-2.5 text-[14px] font-medium text-white shadow-sm transition-all hover:bg-zinc-800 active:bg-zinc-950 sm:w-auto"
              to="/geo/login"
            >
              <span>进入工作台</span>
              <svg
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </RouterLink>
            <a
              class="flex w-full items-center justify-center rounded-lg border border-zinc-200 bg-white px-5 py-2.5 text-[14px] font-medium text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-50 shadow-2xs sm:w-auto"
              href="#product-film"
              >看它怎么跑</a>
          </div>

          <!-- GitHub Sponsors 风格三列高可信公信力指标条 (Impact Metrics Strip) -->
          <div
            class="geo-home-stat-strip mx-auto mt-12 grid max-w-[760px] grid-cols-1 divide-y divide-zinc-200/80 rounded-2xl border border-zinc-200/80 bg-white/75 p-2 shadow-2xs backdrop-blur-md sm:grid-cols-3 sm:divide-x sm:divide-y-0"
            data-reveal
          >
            <div class="flex flex-col items-center justify-center p-4 text-center">
              <div class="text-[26px] font-semibold tracking-tight text-zinc-900 sm:text-[30px]">6 大</div>
              <div class="mt-0.5 text-[12.5px] text-zinc-500">主流 AI 矩阵全覆盖真机实测</div>
            </div>
            <div class="flex flex-col items-center justify-center p-4 text-center">
              <div class="text-[26px] font-semibold tracking-tight text-zinc-900 sm:text-[30px]">35,000+</div>
              <div class="mt-0.5 text-[12.5px] text-zinc-500">垂直行业真实用户决策意图</div>
            </div>
            <div class="flex flex-col items-center justify-center p-4 text-center">
              <div class="text-[26px] font-semibold tracking-tight text-zinc-900 sm:text-[30px]">逐句留痕</div>
              <div class="mt-0.5 text-[12.5px] text-zinc-500">生成引用精准锁定原文行号</div>
            </div>
          </div>

          <!--
            信任状：不讲功能，讲事实 —— "我们真的在问这些模型"。
            Vercel / Linear 在 hero 下方放客户 logo 排，讲的是"谁在用"；
            我们还没有客户 logo，但有一件同样硬的事可以摆出来：覆盖了哪些模型。
            所以这个位置放模型名，不放自夸的勾选项。
          -->
          <div
            class="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
            data-reveal="group"
          >
            <!-- 窄屏让这句独占一行：否则它和模型名混排在同一组 flex-wrap 里，
                 换行点随宽度变化，两行都断在半个词组上（2026-10-12 实测 390×844）。 -->
            <span
              class="w-full text-center text-[12px] font-medium tracking-[0.04em] text-zinc-400 sm:w-auto"
            >
              已在下列主流 AI 矩阵实测
            </span>
            <span
              v-for="model in measuredOn"
              :key="model"
              class="rounded-full border border-zinc-200/90 bg-white px-3.5 py-1 text-[13px] font-medium text-zinc-600 shadow-2xs backdrop-blur-xs transition-colors hover:border-zinc-400 hover:text-zinc-900"
            >
              {{ model }}
            </span>
          </div>
        </div>
      </section>

      <!-- ================================================================ -->
      <!-- 2. 微缩工作台演播（真机 1:1 复刻）                                 -->
      <!-- ================================================================ -->
      <section
        id="product-film"
        class="geo-home-film-section px-6 pb-16 sm:pb-20"
        aria-label="微缩工作台演播"
      >
        <div class="mx-auto max-w-[1200px]">
          <section
            ref="stageRootRef"
            class="geo-home-stage"
            :data-skin="activeSkin"
            aria-label="真实业务流程的微缩工作台演播"
          >
            <div class="geo-film-chrome" aria-hidden="true">
              <span class="geo-film-chrome__dots"><i></i><i></i><i></i></span>
              <span>GEO / {{ pageMeta[currentPage].crumb }}</span>
            </div>
            <!-- 摄像机取景框：固定尺寸 + 裁切，本身不参与镜头变换。
                 里面装的是**整台真机工作台**（侧栏 + 顶栏 + 内容区），
                 所以推近时是整个产品一起放大 —— 侧栏和顶栏也是产品的一部分，
                 不能留在框外当「壳」。 -->
            <div ref="viewportRef" class="geo-home-stage__frame">
              <div ref="sceneRef" class="geo-home-stage__scene">
                <div class="geo-home-stage__workbench">
                  <!-- 侧栏：真机 232px，白底，右边框 1px，文字菜单 -->
                  <nav ref="sidebarRef" class="geo-home-stage__sidebar" aria-hidden="true">
                    <div class="geo-home-stage__sb-brand">
                      <div
                        class="geo-home-stage__sb-logo-wrap"
                        :data-skin="activeSkin"
                      >
                        <img
                          :src="stageBrandMark"
                          alt=""
                          class="geo-home-stage__sb-logo h-6 w-6 rounded object-contain transition-all duration-300"
                        />
                      </div>
                      <span>GEO 工作台</span>
                    </div>
                    <div class="geo-home-stage__sb-scroll">
                    <template v-for="group in railGroups" :key="group.group">
<span class="geo-home-stage__sb-group">{{
                        group.group
                      }}</span><span
                        v-for="item in group.items"
                        :key="item.path"
                        class="geo-home-stage__sb-item"
                        :class="{ 'is-active': item.path === meta().rail }"
                        :data-rail="item.path"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          aria-hidden="true"
                        >
                          <path :d="item.icon" />
                        </svg>
                        {{ item.label }}
                      </span>
</template>
                  </div>
                </nav>

                <!-- 右侧主体 -->
                <div class="geo-home-stage__body">
                  <!-- 顶栏：真机 60px，面包屑 + 当前项目选择器 -->
                  <div class="geo-home-stage__topbar">
                    <nav class="geo-home-stage__breadcrumb" aria-label="面包屑">
                      <strong>{{ meta().crumb }}</strong>
                    </nav>
                    <div class="geo-home-stage__topbar-right">
                      <span class="geo-home-stage__topbar-label">当前项目</span>
                      <span class="geo-home-stage__project-select">
                        <svg
                          class="h-3.5 w-3.5 flex-none text-slate-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                        </svg>
                        {{ demoProject.name }}
                        <svg
                          class="h-3 w-3 flex-none text-slate-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          aria-hidden="true"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </span>

                      <!-- 风格切换：真产品顶栏那颗调色盘按钮，点开是同一套色卡。
                          放在窗口内，因为它是产品界面的一部分，不是外面挂的控件。
                          自动演示**不会**去点它 —— 收尾只换皮肤，不弹这块浮层
                          （用户 2026-10-12：浮层自己弹出来像页面出错）。 -->
                      <div class="geo-home-stage__appearance">
                        <button
                          type="button"
                          class="geo-home-stage__appearance-trigger"
                          :aria-expanded="skinMenuOpen"
                          aria-controls="geo-home-appearance"
                          :aria-label="`选择风格，当前 ${currentSkinLabel}`"
                          @click="toggleSkinMenu"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            aria-hidden="true"
                          >
                            <path
                              d="M12 3a9 9 0 100 18h1.2a1.8 1.8 0 001.3-3.1l-.7-.7a1.8 1.8 0 011.3-3.1H18a3 3 0 003-3A8.9 8.9 0 0012 3z"
                            />
                            <path
                              d="M7.5 10.5h.01M9.5 7h.01M14 7h.01M17 10h.01"
                            />
                          </svg>
                          <span class="geo-home-stage__appearance-name">{{
                            currentSkinLabel
                          }}</span>
                        </button>

                        <button
                          v-show="skinMenuOpen"
                          type="button"
                          class="geo-home-stage__appearance-backdrop"
                          tabindex="-1"
                          aria-label="关闭风格切换"
                          @click="skinMenuOpen = false"
                        ></button>
                        <div
                          id="geo-home-appearance"
                          class="geo-home-stage__appearance-popover"
                          :class="{ 'is-open': skinMenuOpen }"
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby="geo-home-appearance-title"
                        >
                          <div class="geo-home-stage__appearance-head">
                            <strong id="geo-home-appearance-title">选择风格</strong>
                            <small>{{ currentSkinLabel }}</small>
                          </div>
                          <div class="geo-home-stage__appearance-grid">
                            <button
                              v-for="skin in skins"
                              :key="skin.key"
                              type="button"
                              class="geo-home-stage__theme-card"
                              :class="{
                                'is-selected': activeSkin === skin.key,
                              }"
                              :data-theme-key="skin.key"
                              :aria-pressed="activeSkin === skin.key"
                              :aria-label="`${skin.label}：${skin.description}`"
                              @click="pickSkin(skin.key)"
                            >
                              <span
                                class="geo-home-stage__theme-swatches"
                                aria-hidden="true"
                              >
                                <span
                                  v-for="(color, name) in skin.colors"
                                  :key="name"
                                  class="geo-home-stage__theme-swatch"
                                  :style="{ backgroundColor: color }"
                                ></span>
                              </span>
                              <span class="geo-home-stage__theme-copy">
                                <strong>{{ skin.label }}</strong>
                                <small>{{ skin.description }}</small>
                              </span>
                              <span
                                v-if="activeSkin === skin.key"
                                class="geo-home-stage__theme-check"
                                aria-hidden="true"
                                >✓</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <!-- 脱敏声明：作为产品内的状态说明留在顶栏，不往框外挂文字 -->
                      <span class="geo-home-stage__disclaimer">
                        演示数据
                      </span>
                    </div>
                  </div>

                  <!-- 内容区。真实产品的顺序是：流程条 → 白卡 workspace（内含
                       工具行与分区），不是「tab 在最上面」。 -->
                  <div class="geo-home-stage__content">
                    <!-- 8步流程条（geo-workflow-panel）：白卡，8px圆角，padding 8px 12px -->
                    <nav class="geo-home-stage__pipeline" aria-hidden="true">
                      <span class="geo-home-stage__pipeline-label">工作流程</span>
                      <div class="geo-home-stage__pipeline-steps">
                        <template
                          v-for="(name, i) in workflowSteps"
                          :key="name"
                        >
                          <span
                            class="geo-home-stage__step"
                            :data-step="i + 1"
                            :class="{
                              'is-active': i + 1 === meta().step,
                              'is-done': i + 1 < meta().step,
                            }"
                          >
                            <i>{{ i + 1 }}</i>{{ name }}
                          </span>
                          <span
                            v-if="i < workflowSteps.length - 1"
                            class="geo-home-stage__step-arrow"
                            aria-hidden="true"
                            >→</span>
                        </template>
                      </div>
                      <span
                        v-if="meta().step < workflowSteps.length"
                        class="geo-home-stage__pipeline-next"
                      >
                        下一步：{{ workflowSteps[meta().step] }}
                      </span>
                    </nav>

                    <!-- 白卡工作区：真实产品把工具行与内容都收在这张卡里 -->
                    <div class="geo-home-stage__workspace">
                      <!-- 四页内容直接挂在工作区；镜头缩放的是整个工作台（见外层 __scene）。 -->
                      <div class="geo-home-stage__slides">
                      <!-- 四页内容叠放：同一时刻只有一页 is-current -->
                      <div class="geo-home-stage__slides-inner">
                          <!-- ========== 页 02 资料与事实（照搬 /geo/facts） ========== -->
                          <section
                            class="geo-home-stage__slide"
                            :class="{ 'is-current': currentPage === 'facts' }"
                            :aria-hidden="currentPage !== 'facts'"
                            :inert="currentPage !== 'facts'"
                            data-page="facts"
                          >
                            <!-- 页面操作行：右上角两个按钮。真实页面就是这样，
                                 不在标题旁边。 -->
                            <div class="geo-page-actions" data-block>
                              <span class="geo-btn geo-btn--ghost">
                                <svg class="h-3.5 w-3.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                                刷新
                              </span>
                              <button class="geo-btn geo-btn--primary-sm">
                                <svg class="h-3.5 w-3.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                                上传资料
                              </button>
                            </div>

                            <!-- 极简事实检索与状态栏（支持打字机检索模拟） -->
                            <div class="geo-facts-toolbar" data-block>
                              <div class="geo-facts-search">
                                <svg class="h-3.5 w-3.5 text-slate-400 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                  <circle cx="11" cy="11" r="8"/>
                                  <path d="m21 21-4.3-4.3"/>
                                </svg>
                                <span v-if="factsSearchText" class="geo-facts-search__text">
                                  {{ factsSearchText }}<span v-if="isFactsSearching" class="geo-typing-cursor" aria-hidden="true">▌</span>
                                </span>
                                <span v-else class="geo-facts-search__placeholder">输入关键词筛选事实...</span>
                              </div>
                              <div class="geo-facts-meta ml-auto">
                                <span class="geo-sec-count">资料库 14 份</span>
                                <span class="geo-divider">·</span>
                                <span class="geo-sec-count">待核验 21 条</span>
                              </div>
                            </div>

                            <!-- 放大镜聚焦指示条（置于卡片上方，不再挤压卡片内部排版） -->
                            <div class="geo-spotlight-pill mb-2.5" data-block>
                              <span class="geo-spotlight-pill__badge">
                                <svg class="h-3 w-3 flex-none text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                  <circle cx="11" cy="11" r="8"/>
                                  <path d="m21 21-4.3-4.3"/>
                                </svg>
                                聚焦
                              </span>
                              <span class="geo-spotlight-pill__text">{{ factsSpotlightText }}</span>
                            </div>

                            <!-- 待确认候选（被操作的主体，极简放大镜聚焦卡） -->
                            <div
                              ref="candidateRef"
                              class="geo-cand geo-spotlight-card"
                              :class="{ 'is-admitted': admitted }"
                              data-block
                            >
                              <div class="geo-cand-main">
                                <div class="geo-cand-title">
                                  <span class="geo-cand-subject">{{ candidate.subject }} ·
                                    {{ candidate.factType }}</span>
                                  <span
                                    class="geo-tag"
                                    :class="
                                      admitted
                                        ? 'geo-tag--success'
                                        : 'geo-tag--processing'
                                    "
                                  >
                                    <svg v-if="admitted" class="h-3 w-3 mr-1 text-emerald-600 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                                    <svg v-else class="h-3 w-3 mr-1 text-blue-600 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                    {{
                                      admitted
                                        ? FACT.confirmed
                                        : FACT.pending_confirm
                                    }}
                                  </span>
                                  <!-- 幕 02：系统自身划定的事实边界标签 -->
                                  <span
                                    v-show="boundary"
                                    ref="boundaryRef"
                                    class="geo-tag geo-tag--warning"
                                    data-boundary
                                  >
                                    <svg class="h-3 w-3 mr-1 text-amber-600 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
                                      <line x1="12" x2="12" y1="8" y2="12"/>
                                      <line x1="12" x2="12.01" y1="16" y2="16"/>
                                    </svg>
                                    仅限内部，禁止公开
                                  </span>
                                </div>
                                <p class="geo-cand-claim">
                                  {{ candidate.claim }}
                                </p>
                                <div class="geo-cand-meta">
                                  <span class="inline-flex items-center gap-1">
                                    <svg class="h-3 w-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                                      <polyline points="14 2 14 8 20 8"/>
                                    </svg>
                                    来源 {{ candidate.sourceName }}
                                  </span>
                                  <span class="geo-divider">·</span>
                                  <span>置信度 {{ candidate.confidence }}</span>
                                </div>
                                <!-- 可追溯最直接的画面：这句话来自原文件的第几行第几个字符 -->
                                <p class="geo-cand-quote">
                                  {{ candidate.quote }}
                                  <span class="geo-cand-locator">
                                    <svg class="h-2.5 w-2.5 inline mr-0.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                                    {{ candidate.locator }}
                                  </span>
                                </p>
                              </div>
                              <div class="geo-cand-side">
                                <span
                                  ref="candidateActionRef"
                                  class="geo-btn"
                                  :class="admitted ? 'geo-btn--default cursor-default' : 'geo-btn--primary-sm'"
                                >
                                  <svg v-if="!admitted" class="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                                  <svg v-else class="h-3 w-3 mr-1 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                                  {{ admitted ? '已确认入库' : '确认入库' }}
                                </span>
                              </div>
                            </div>

                            <!-- 幕 01 收尾：确认完成后出现的清晰进度条 -->
                            <div
                              v-show="admitted"
                              ref="confirmBarRef"
                              class="geo-confirm-bar"
                              data-block
                            >
                              <span class="geo-confirm-bar__text">
                                <svg class="h-3.5 w-3.5 mr-1 text-emerald-600 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                                本资料 28 条事实已确认 · 权威出处均已锁定
                              </span>
                              <span class="geo-tag geo-tag--success ml-auto">准入就绪</span>
                            </div>

                            <!-- 证据抽屉：默认藏在右侧，随镜头推进滑入 -->
                            <aside ref="drawerRef" class="geo-drawer">
                              <div class="geo-drawer-head">
                                <span>证据与详情</span>
                                <span
                                  class="text-[11px] text-slate-400 cursor-default"
                                  aria-hidden="true"
                                  >✕</span>
                              </div>
                              <div class="geo-drawer-body">
                                <p class="geo-drawer-claim" data-field>
                                  {{ candidate.claim }}
                                </p>
                                <dl class="geo-drawer-fields">
                                  <div class="geo-drawer-field" data-field>
                                    <dt>来源</dt>
                                    <dd>{{ candidate.sourceName }} · 已解析</dd>
                                  </div>
                                  <div class="geo-drawer-field" data-field>
                                    <dt>类型</dt>
                                    <dd>{{ candidate.factType }}</dd>
                                  </div>
                                  <div class="geo-drawer-field" data-field>
                                    <dt>有效期</dt>
                                    <dd>至 {{ candidate.validUntil }}</dd>
                                  </div>
                                  <div class="geo-drawer-field" data-field>
                                    <dt>证据</dt>
                                    <dd>
                                      {{ EVIDENCE.complete }} · 链接待核验
                                    </dd>
                                  </div>
                                </dl>
                              </div>
                              <div class="geo-drawer-foot">
                                <span
                                  class="geo-btn geo-btn--primary"
                                  :class="{ 'is-confirmed': admitted }"
                                >
                                  {{ admitted ? '已确认' : '确认' }}
                                </span>
                                <span class="geo-btn geo-btn--danger">驳回</span>
                              </div>
                            </aside>
                          </section>

                          <!-- ========== 页 04 内容生产（照搬 /geo/content） ========== -->
                          <!-- ========== 页 04 内容生产（1:1 还原真实文章工作台 /geo/content/workspace） ========== -->
                          <section
                            class="geo-home-stage__slide"
                            :class="{ 'is-current': currentPage === 'content' }"
                            :aria-hidden="currentPage !== 'content'"
                            :inert="currentPage !== 'content'"
                            data-page="content"
                          >
                            <!-- 视图 1：真实内容任务与文章列表视图（12.0s 鼠标点击 [打 开] 前呈现） -->
                            <div v-show="!articleWorkbenchOpen" class="geo-content-list-view">
                              <!-- 顶部操作条（对齐真实 /geo/content） -->
                              <div class="geo-page-actions" data-block>
                                <span class="geo-btn geo-btn--ghost">
                                  <svg class="h-3.5 w-3.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                                  刷新
                                </span>
                                <button class="geo-btn geo-btn--primary-sm">
                                  <svg class="h-3.5 w-3.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                  新建写稿任务
                                </button>
                              </div>

                              <!-- 内容任务 Tab 栏 -->
                              <div class="geo-tab-bar" data-block>
                                <span class="geo-tab is-active">写稿计划</span>
                                <span class="geo-tab">文章记录</span>
                              </div>

                              <!-- 文章列表数据表（真实表格排版） -->
                              <div class="geo-table-wrap" data-block>
                                <table class="geo-table geo-content-table">
                                  <thead>
                                    <tr>
                                      <th>文章标题</th>
                                      <th>所属任务</th>
                                      <th>类型</th>
                                      <th>更新时间</th>
                                      <th>状态</th>
                                      <th>操作</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <!-- 目标操作行：11.2s -> 12.0s 鼠标滑向并点击 [打 开] -->
                                    <tr class="is-highlight">
                                      <td>
                                        <div class="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
                                          <svg class="h-3.5 w-3.5 text-blue-600 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                          <span>{{ ARTICLE_WORKSPACE_DATA.title }}</span>
                                        </div>
                                      </td>
                                      <td class="text-slate-500">{{ contentTask.name }}</td>
                                      <td class="text-slate-500">品牌专题稿</td>
                                      <td class="text-slate-400">2026-10-13 11:29</td>
                                      <td>
                                        <span class="geo-tag geo-tag--processing">草稿待审</span>
                                      </td>
                                      <td>
                                        <button
                                          ref="openArticleBtnRef"
                                          type="button"
                                          class="geo-btn geo-btn--primary-sm geo-ws-open-btn"
                                        >
                                          <svg class="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                          打 开
                                        </button>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <div class="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                                          <svg class="h-3.5 w-3.5 text-slate-400 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                          <span>某文化传媒为实体商家提供哪些短视频代运营服务</span>
                                        </div>
                                      </td>
                                      <td class="text-slate-500">{{ contentTask.name }}</td>
                                      <td class="text-slate-500">品牌专题稿</td>
                                      <td class="text-slate-400">2026-10-13 11:28</td>
                                      <td>
                                        <span class="geo-tag geo-tag--success">已发布</span>
                                      </td>
                                      <td>
                                        <span class="geo-btn geo-btn--ghost-sm">打 开</span>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <div class="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                                          <svg class="h-3.5 w-3.5 text-slate-400 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                          <span>该传媒机构的老板个人IP陪跑服务，能适配哪些行业和场景？</span>
                                        </div>
                                      </td>
                                      <td class="text-slate-500">{{ contentTask.name }}</td>
                                      <td class="text-slate-500">品牌专题稿</td>
                                      <td class="text-slate-400">2026-10-13 11:14</td>
                                      <td>
                                        <span class="geo-tag geo-tag--success">已发布</span>
                                      </td>
                                      <td>
                                        <span class="geo-btn geo-btn--ghost-sm">打 开</span>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <!-- 视图 2：真实文章工作台画布（12.0s 点击打开后无缝切入） -->
                            <div v-show="articleWorkbenchOpen" class="geo-article-workspace">
                              <!-- 顶部操作条（还原真实工作台） -->
                              <div class="geo-ws-bar" data-block>
                                <div class="geo-ws-bar__left">
                                  <button type="button" class="geo-ws-back" aria-label="返回内容生产">
                                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                                    <span>返回内容生产</span>
                                  </button>
                                </div>
                                <div class="geo-ws-bar__right">
                                  <span class="geo-ws-pill">未命名</span>
                                  <span class="geo-ws-link-btn">预览发布效果</span>
                                  <span class="geo-ws-link-btn">风险拦截</span>
                                  <span class="geo-ws-link-btn">导出</span>
                                  <button type="button" class="geo-btn geo-btn--default-sm">编辑</button>
                                  <button
                                    ref="publishRef"
                                    type="button"
                                    class="geo-btn geo-ws-publish-btn"
                                    :class="articlePublished ? 'geo-btn--success cursor-default' : 'geo-btn--primary-sm'"
                                  >
                                    <svg v-if="articlePublished" class="h-3.5 w-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span>{{ articlePublished ? '已发布' : '发 布' }}</span>
                                  </button>
                                </div>
                              </div>

                              <!-- 浮动系统通知（Act 04 点击发布时平滑弹出） -->
                              <transition name="geo-fade">
                                <div v-if="articlePublished" class="geo-ws-toast" role="status">
                                  <svg class="h-4 w-4 text-emerald-500 inline mr-1.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                  <span>文章已提交发布，结果会在发布中心更新。</span>
                                </div>
                              </transition>

                              <!-- 工作台双栏主体 -->
                              <div class="geo-ws-body">
                                <!-- 左侧 68% 主编辑画布 -->
                                <section class="ws-editor-pane" ref="articleRowRef">
                                  <div class="ws-editor-pane__scroll">
                                    <div class="ws-doc">
                                      <header class="ws-doc__head">
                                        <h1 class="ws-doc__title" ref="generateBtnRef">{{ ARTICLE_WORKSPACE_DATA.title }}</h1>
                                        <div class="ws-doc__meta">
                                          <span
                                            class="geo-tag"
                                            :class="isTyping ? 'geo-tag--processing' : 'geo-tag--success'"
                                          >
                                            <svg v-if="isTyping" class="h-3 w-3 mr-1 inline animate-spin text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                                            <svg v-else class="h-3 w-3 mr-1 inline text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                            {{ isTyping ? '生成中...' : '已生成' }}
                                          </span>
                                          <span>品牌专题稿</span>
                                          <span>版本 v1.0</span>
                                        </div>
                                      </header>

                                      <div class="ws-editor-surface">
                                        <!-- 等待状态（12.0s 前）：干净就绪，绝不提前夺走目光 -->
                                        <div v-if="!hasGenerated" class="geo-ws-wait-prompt">
                                          <div class="flex items-center gap-2 text-slate-500 text-xs mb-2">
                                            <svg class="h-4 w-4 text-blue-600 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                            <strong>大模型流式成稿 · 基于事实知识库撰写</strong>
                                          </div>
                                          <p class="text-xs text-slate-400 m-0">大模型将在真实编辑器画布中逐句流式成稿并绑定权威出处。</p>
                                        </div>

                                        <!-- 打字机流式正文（12.0s 点击后真人打字流式输出） -->
                                        <div v-else class="geo-ws-prose">
                                          <template v-for="(block, idx) in renderedArticleBlocks" :key="idx">
                                            <h2 v-if="block.type === 'h2'" class="geo-ws-h2">
                                              {{ block.text }}
                                              <span v-if="block.hasCursor" class="geo-typing-cursor" aria-hidden="true">▌</span>
                                            </h2>
                                            <p v-else class="geo-ws-p">
                                              {{ block.text }}
                                              <span
                                                v-if="block.cite"
                                                class="geo-cite-badge"
                                                :class="{ 'is-active': linkedCount > idx / 2 }"
                                              >
                                                <svg class="h-3 w-3 mr-1 inline text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                                {{ block.cite }}
                                              </span>
                                              <span v-if="block.hasCursor" class="geo-typing-cursor" aria-hidden="true">▌</span>
                                            </p>
                                          </template>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <!-- 底部字数栏 -->
                                  <footer class="ws-wordcount">
                                    <span class="ws-wordcount__label">字数</span>
                                    <strong class="ws-wordcount__value">{{ currentArticleWordCount.toLocaleString('zh-CN') }}</strong>
                                    <span class="ws-wordcount__target">/ (600~1000) 字</span>
                                    <span v-if="currentArticleWordCount >= 900" class="ws-wordcount__badge is-met">字数达标 (929 字)</span>
                                    <span v-else-if="currentArticleWordCount > 0" class="ws-wordcount__badge is-met">正在成稿</span>
                                  </footer>
                                </section>

                                <!-- 右侧 32% 内容背景面板（只读参考，支持概览与要素与事实切换） -->
                                <aside class="ws-context" ref="citationRef">
                                  <div class="ws-context__head">
                                    <strong>内容背景</strong>
                                    <span class="ws-context__head-side">
                                      <span class="ws-context__hint">只读参考</span>
                                      <button type="button" class="ws-context__collapse" aria-label="收起内容背景">
                                        <span aria-hidden="true">›</span>
                                      </button>
                                    </span>
                                  </div>

                                  <div class="geo-ws-tabs">
                                    <span class="geo-ws-tab" :class="{ 'is-active': contextTab === 'overview' }">概览</span>
                                    <span class="geo-ws-tab" :class="{ 'is-active': contextTab === 'facts' }">要素与事实</span>
                                    <span class="geo-ws-tab">大纲</span>
                                    <span class="geo-ws-tab">质检</span>
                                    <span class="geo-ws-tab">发布</span>
                                    <span class="geo-ws-tab">草稿</span>
                                  </div>

                                  <div class="ws-context__scroll">
                                    <!-- 事实关联列表（悬停角标时高亮联动） -->
                                    <div v-if="contextTab === 'facts'" class="ws-facts-list">
                                      <div class="ws-facts-item is-linked">
                                        <div class="ws-facts-item__head">
                                          <span class="ws-facts-item__num">事实 01</span>
                                          <span class="geo-tag geo-tag--success">已锁定出处</span>
                                        </div>
                                        <p class="ws-facts-item__claim">某文化传媒为本地实体商家提供短视频代运营与创始人IP陪跑服务</p>
                                        <div class="ws-facts-item__src">来源：某文化传媒_商业定位与服务标准.docx（第 24 行）</div>
                                      </div>
                                      <div class="ws-facts-item is-linked">
                                        <div class="ws-facts-item__head">
                                          <span class="ws-facts-item__num">事实 02</span>
                                          <span class="geo-tag geo-tag--success">已锁定出处</span>
                                        </div>
                                        <p class="ws-facts-item__claim">面向实体商家提供账号诊断、卖点梳理、本地获客内容策划与拍摄剪辑全链条服务</p>
                                        <div class="ws-facts-item__src">来源：某文化传媒_商业定位与服务标准.docx（第 31 行）</div>
                                      </div>
                                      <div class="ws-facts-item is-linked">
                                        <div class="ws-facts-item__head">
                                          <span class="ws-facts-item__num">事实 03</span>
                                          <span class="geo-tag geo-tag--success">已锁定出处</span>
                                        </div>
                                        <p class="ws-facts-item__claim">创始人IP打造与陪跑服务，围绕真实业务与顾客关心的问题组织内容</p>
                                        <div class="ws-facts-item__src">来源：客户案例资料收集表.docx（第 12 行）</div>
                                      </div>
                                    </div>

                                    <!-- 默认概览元数据 -->
                                    <dl v-else class="ws-meta">
                                      <div class="ws-meta__row">
                                        <dt>使用任务</dt>
                                        <dd>{{ contentTask.name }}</dd>
                                      </div>
                                      <div class="ws-meta__row">
                                        <dt>任务类型</dt>
                                        <dd>品牌专题稿</dd>
                                      </div>
                                      <div class="ws-meta__row">
                                        <dt>文章状态</dt>
                                        <dd>
                                          <span class="geo-tag" :class="isTyping ? 'geo-tag--processing' : 'geo-tag--success'">
                                            {{ isTyping ? '生成中' : '已生成' }}
                                          </span>
                                        </dd>
                                      </div>
                                      <div class="ws-meta__row">
                                        <dt>发布关系</dt>
                                        <dd>已关联</dd>
                                      </div>
                                      <div class="ws-meta__row">
                                        <dt>版本</dt>
                                        <dd>v1.0 · 第 1 版</dd>
                                      </div>
                                      <div class="ws-meta__row">
                                        <dt>来源任务</dt>
                                        <dd>{{ contentTask.name }}</dd>
                                      </div>
                                      <div class="ws-meta__row">
                                        <dt>生成时间</dt>
                                        <dd>2026-10-13 11:29</dd>
                                      </div>
                                      <div class="ws-meta__row">
                                        <dt>生成次数</dt>
                                        <dd>1</dd>
                                      </div>
                                      <div class="ws-meta__row">
                                        <dt>目标篇幅</dt>
                                        <dd>600~1000 字</dd>
                                      </div>
                                    </dl>
                                  </div>
                                </aside>
                              </div>
                            </div>
                          </section>

                          <!-- ========== 页 08 复盘报告（照搬 /geo/reports） ========== -->
                          <section
                            class="geo-home-stage__slide"
                            :class="{ 'is-current': currentPage === 'reports' }"
                            :aria-hidden="currentPage !== 'reports'"
                            :inert="currentPage !== 'reports'"
                            data-page="reports"
                          >
                            <!-- Tab 栏：真机 report-page__workspace 内直接是 antd Tabs，
                                 ActionBar 为空（页面无 #actions），所以这里不放操作行。 -->
                            <div class="geo-tab-bar" data-block>
                              <span class="geo-tab is-active">检测记录</span>
                              <span class="geo-tab">客户报告</span>
                              <span class="geo-tab">效果统计</span>
                            </div>

                            <!-- 工具行：左侧「当前项目 N 次运行」范围说明，
                                 右侧刷新 + 按检测类型筛选。真机就在 tab 内容顶部。 -->
                            <div class="geo-workspace-toolbar" data-block>
                              <div class="geo-scope">
                                <svg class="h-4 w-4 text-slate-400 mr-1 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                                <span>当前项目</span>
                                <strong>18</strong>
                                <span>次运行</span>
                              </div>
                              <div class="geo-workspace-toolbar__actions">
                                <button class="geo-btn cursor-default">
                                  <svg class="h-3.5 w-3.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                                  刷新
                                </button>
                                <span class="geo-select geo-select--wide">
                                  <svg class="h-3.5 w-3.5 mr-1 text-slate-400 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                                  按检测类型筛选
                                </span>
                              </div>
                            </div>

                            <!-- 放大镜聚焦指示徽标 -->
                            <div class="geo-spotlight-pill mb-2.5" data-block>
                              <span class="geo-spotlight-pill__badge">
                                <svg class="h-3 w-3 flex-none text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                  <circle cx="11" cy="11" r="8"/>
                                  <path d="m21 21-4.3-4.3"/>
                                </svg>
                                聚焦
                              </span>
                              <span class="geo-spotlight-pill__text">{{ reportsSpotlightText }}</span>
                            </div>

                            <!-- 检测记录表格：真机 6 列 antd 表格 -->
                            <table
                              ref="metricsRef"
                              class="geo-demo-table geo-report-table"
                              aria-label="检测记录"
                              data-block
                            >
                              <thead>
                                <tr>
                                  <th
                                    v-for="heading in [
                                      '检测',
                                      '检测时间',
                                      '范围',
                                      '处理状态',
                                      '有效回答',
                                      '操作',
                                    ]"
                                    :key="heading"
                                  >
                                    {{ heading }}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr
                                  v-for="(run, idx) in detectionRuns"
                                  :key="run.time"
                                  :class="{
                                      'geo-row--spotlight':
                                        (idx === 0 && reportDetailAct === 'row1') ||
                                        (idx === 1 && reportDetailAct === 'row2')
                                    }"
                                >
                                  <td>
                                    <div class="geo-table-primary">{{ run.name }}</div>
                                    <div class="geo-table-secondary">{{ run.engine }}</div>
                                  </td>
                                  <td class="geo-table-secondary">{{ run.time }}</td>
                                  <td class="geo-table-secondary">{{ run.scope }}</td>
                                  <td>
                                    <span class="geo-tag geo-tag--success">{{ run.status }}</span>
                                  </td>
                                  <td>
                                    <div class="geo-run-quality"><strong>{{ run.rate }}</strong></div>
                                    <div class="geo-run-quality__track" aria-hidden="true">
                                      <span :style="{ width: run.rate }"></span>
                                    </div>
                                  </td>
                                  <td>
                                    <span
                                      class="geo-link inline-flex items-center gap-0.5"
                                      :class="{ 'font-semibold text-blue-600': (idx === 0 && reportDetailAct === 'row1') || (idx === 1 && reportDetailAct === 'row2') }"
                                    >
                                      查看记录
                                      <svg class="h-3 w-3 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                                    </span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>

                            <!-- 幕 05 & 07 点击「查看记录」触发的展开实测留痕卡片 -->
                            <div
                              v-show="detailOpen"
                              class="geo-report-detail-card mt-2.5"
                              data-block
                            >
                              <!-- 行 1 千问真机问答实测卡 (幕 05 鼠标点击展开) -->
                              <template v-if="reportDetailAct === 'row1'">
                                <div class="flex items-center justify-between mb-1.5">
                                  <div class="flex items-center gap-1.5">
                                    <svg class="h-3.5 w-3.5 text-blue-600 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                      <circle cx="12" cy="12" r="10"/>
                                      <path d="m9 12 2 2 4-4"/>
                                    </svg>
                                    <span class="text-[12px] font-medium text-slate-800">通义千问真机巡检 · 问答原话与出处留痕</span>
                                  </div>
                                  <span class="geo-tag geo-tag--success">
                                    <svg class="h-3 w-3 mr-1 text-emerald-600 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                                    实测全部命中
                                  </span>
                                </div>
                                <div class="space-y-1 text-[11.5px] text-slate-600 leading-relaxed">
                                  <p class="m-0"><strong class="text-slate-800">客户提问：</strong>“短视频代运营怎么选？围绕门店实景做内容才是关键”</p>
                                  <p class="m-0"><strong class="text-slate-800">千问回答：</strong>“该文化传媒机构面向本地实体商家提供短视频代运营与创始人IP陪跑，围绕门店真实场景组织内容，并覆盖账号诊断、卖点梳理到拍摄剪辑全链条……” <span class="text-blue-600 font-medium">（精准引用《某文化传媒_商业定位与服务标准.docx》第 24 行）</span></p>
                                </div>
                              </template>

                              <!-- 行 2 全矩阵多平台复盘留痕卡 (幕 07 鼠标点击展开) -->
                              <template v-else-if="reportDetailAct === 'row2'">
                                <div class="flex items-center justify-between mb-1.5">
                                  <div class="flex items-center gap-1.5">
                                    <svg class="h-3.5 w-3.5 text-emerald-600 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                      <circle cx="12" cy="12" r="10"/>
                                      <path d="m9 12 2 2 4-4"/>
                                    </svg>
                                    <span class="text-[12px] font-medium text-slate-800">全流程巡检复盘 · 审计留痕</span>
                                  </div>
                                  <span class="geo-tag geo-tag--success">
                                    <svg class="h-3 w-3 mr-1 text-emerald-600 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                                    人工复核通过
                                  </span>
                                </div>
                                <p class="text-[11.5px] text-slate-600 m-0 leading-relaxed">
                                  实测豆包、千问、智谱清言、文心一言主流大模型：针对本地短视频与门店代运营意图，品牌提及与服务范围全部如实命中，精准引用《某文化传媒_商业定位与服务标准.docx》第 24 行，出处链条完整可查。
                                </p>
                              </template>
                            </div>

                            <div class="geo-page-foot">
                              <span class="geo-sec-count ml-auto">1 / 3 页</span>
                            </div>
                          </section>

                          <!-- ========== 页 05 媒体中心（真机为空态，本片不设独立幕） ========== -->
                          <section
                            class="geo-home-stage__slide"
                            :class="{ 'is-current': currentPage === 'media' }"
                            :aria-hidden="currentPage !== 'media'"
                            :inert="currentPage !== 'media'"
                            data-page="media"
                          >
                            <div class="geo-page-actions" data-block>
                              <span class="geo-btn geo-btn--primary-sm">立即同步</span>
                              <span class="geo-btn geo-btn--ghost">刷新</span>
                            </div>

                            <div class="geo-tab-bar" data-block>
                              <span class="geo-tab is-active">媒体资源</span>
                              <span class="geo-tab">只看收藏</span>
                            </div>

                            <div class="py-20 text-center text-slate-400" data-block>
                              <p class="text-[12.5px]">共 0 个媒体 · 正在加载媒体目录…</p>
                            </div>
                          </section>
                        </div>
                        <!-- /slides-inner -->
                      </div>
                      <!-- /slides -->
                    </div>
                    <!-- /workspace -->
                  </div>
                  <!-- /content -->
                </div>
                <!-- /body -->
              </div>
              <!-- /workbench -->
</div>
            <!-- /scene: camera transform ends here -->
              <!-- 虚拟光标：住在取景框层（__scene 之外），不随镜头缩放，
                   所以它的投影坐标就等于视觉落点。 -->
              <div
                ref="cursorRef"
                class="geo-home-stage__cursor"
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5.5 3.2v17.6c0 .45.54.67.85.35l4.6-4.6a.5.5 0 0 1 .36-.15h6.5c.45 0 .67-.54.35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z"
                    fill="currentColor"
                    stroke="currentColor"
                    stroke-linejoin="round"
                    stroke-width="1"
                  />
                </svg>
              </div>
          </div>
          <!-- /frame -->
          <!--
            演播台刻意不提供任何控件：没有播放/暂停键、没有章节跳转、没有图注。
            实测 attio 的产品窗口就是这样 —— 它 hero 区只有两个「Send me a demo」，
            窗口里是纯画面；推进完全交给滚动和自动循环。
            这里照做：看得见的东西只有画面本身。
          -->
          <!-- 回卷时闪过的那层薄幕：在它最厚的一帧把时间轴推回开头 -->
          <div ref="rewindVeilRef" class="geo-film-veil" aria-hidden="true"></div>
          <!-- 收尾折叠：一轮走完后画面向内收干净，再自动重播下一轮。
               不放文案也不放进度条 —— 折叠动作本身已经说完了一切，
               加任何元素都是在解释一件已经说清楚的事。 -->
          <div ref="outroRef" class="geo-film-outro" aria-hidden="true"></div>
          <p class="geo-film-disclaimer">交互演示 · 非实时数据 · 脱敏示范案例</p>
        </section>
      </div>
    </section>

      <!-- ================================================================ -->
      <!-- 3. 主张：一段大字占满一屏                                          -->
      <!-- ================================================================ -->
      <!-- 高级官网在这里不会放卡片墙，而是让一句话独占一屏。
           留白本身就是内容 —— 这是 Linear / Stripe 那类站点最容易被忽略、
           也最难抄的一层。 -->
      <section class="px-6 pt-40 pb-24 sm:pt-52 sm:pb-32">
        <div class="mx-auto max-w-[980px]">
          <p
            class="text-[28px] leading-[1.4] font-medium tracking-[-0.02em] text-[var(--ink)] sm:text-[38px] sm:leading-[1.35]"
            data-reveal
          >
            同一个问题，你自己去问 AI，和客户问 AI，<br class="hidden sm:block" />
            答案里<span class="font-medium text-[var(--ink)]">有没有你</span>，差得很远。
          </p>
        </div>
      </section>

      <!-- ================================================================ -->
      <!-- 4. 三件事：左边承诺，右边它实际做到哪一步                            -->
      <!-- ================================================================ -->
      <!-- 不讲流程、不讲模块。只讲三件客户会记住、而且真的做得到的事 ——
           每一行都落在**结果**上（AI 提不提你、说没说错、效果有多少）。
           手段不是不能讲，而是只讲别人没有的那部分（信源地图、十万媒体）——
           那是进攻性底气，放在下面「凭什么」一节；这里先把结果说清楚。 -->
      <section class="px-6 pb-32 sm:pb-40">
        <div class="mx-auto max-w-[980px] divide-y divide-[#eceef2]" data-reveal="group">
          <div
            v-for="item in promises"
            :key="item.title"
            class="geo-promise grid grid-cols-1 gap-3 py-9 sm:grid-cols-[260px_minmax(0,1fr)] sm:gap-10"
          >
            <p class="text-[17px] font-medium tracking-[-0.01em] text-[var(--ink)]">
              {{ item.title }}
            </p>
            <p class="text-[15px] leading-[1.75] text-[var(--muted)]">
              {{ item.detail }}
            </p>
          </div>
        </div>
      </section>

      <!-- ================================================================ -->
      <!-- 5. 对照：同一句话，两种来源                                        -->
      <!-- ================================================================ -->
      <!-- 整页最有冲击力的一块。不解释方法，直接摆结果：
           "AI 自己编的"对着"接上你资料之后的"。左边那句是真能从模型嘴里问出来的。 -->
      <section class="px-6 pb-32 sm:pb-40">
        <div class="mx-auto max-w-[980px]">
          <h2
            class="text-[24px] leading-[1.25] font-medium tracking-[-0.015em] text-[var(--ink)] sm:text-[30px]"
            data-reveal
          >
            同一个问题，两种答案
          </h2>
          <p class="mt-3 mb-12 text-[15px] text-[var(--muted)]" data-reveal>
            左边是 AI 自己想的，右边是接上你资料之后它该说的话。
          </p>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2" data-reveal="group">
            <div
              v-for="side in [contrast.wrong, contrast.right]"
              :key="side.who"
              class="geo-contrast rounded-[14px] border p-6 sm:p-7"
              :class="
                side.badge === '未核验'
                  ? 'geo-contrast--wrong'
                  : 'geo-contrast--right'
              "
            >
              <div class="flex items-center justify-between gap-3">
                <span class="text-[14px] font-medium text-[var(--ink)]">{{
                  side.who
                }}</span>
                <span class="geo-contrast__badge">{{ side.badge }}</span>
              </div>
              <p
                class="mt-5 text-[16px] leading-[1.7] tracking-[-0.01em] text-[var(--ink)] sm:text-[17px]"
              >
                {{ side.quote }}
              </p>
              <p class="mt-5 text-[13.5px] leading-[1.7] text-[var(--muted)]">
                {{ side.note }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ================================================================ -->
      <!-- 5.1 客户背书：牌堆式案例卡组                                          -->
      <!-- 一次只呈现一张，不做横向错位——错位会把邻卡的正文露进可视区，           -->
      <!-- 五段文字挤在一起读不成句（实测过）。                                   -->
      <!-- 默认自动轮播；光标进入即暂停并抬起卡片，移开 2.6s 后续播；             -->
      <!-- 也可点下方指示器直接切。                                             -->
      <!-- ================================================================ -->
      <section class="px-6 pb-24 sm:pb-32">
        <div class="mx-auto max-w-[980px]" data-reveal>
          <div
            class="geo-deck"
            :class="{ 'is-paused': deckPaused }"
            :style="{ '--deck-duration': `${deckCurrentInterval}ms` }"
            @mouseenter="deckHandleEnter"
            @mouseleave="deckHandleLeave"
          >
            <!-- 牌堆厚度：两层略窄的纸边从卡片下方露出，暗示后面还有几张 -->
            <div class="geo-deck__pile" aria-hidden="true"></div>

            <article
              v-for="(item, i) in caseStudies"
              :key="item.key"
              class="geo-deck__card"
              :class="{ 'is-active': i === deckActive }"
              :aria-hidden="i !== deckActive"
              @click="deckHandleCardClick"
            >
              <span class="geo-deck__mark" aria-hidden="true">“</span>
              <div class="relative z-10">
                <blockquote class="geo-deck__quote">{{ item.quote }}</blockquote>
                <div class="geo-deck__foot">
                  <span class="geo-deck__avatar" aria-hidden="true">
                    <svg v-if="item.icon === 'video'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>
                    <svg v-else-if="item.icon === 'finance'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="m7 14 3.5-3.5 3 3L19 8" /></svg>
                    <svg v-else-if="item.icon === 'print'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3" /><rect width="16" height="10" x="4" y="7" rx="2" /><path d="M8 17h8v4H8z" /></svg>
                    <svg v-else-if="item.icon === 'clinic'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /><circle cx="12" cy="12" r="9" /></svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="5" y="5" rx="2" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></svg>
                  </span>
                  <div class="min-w-0">
                    <div class="geo-deck__name">
                      <span>{{ item.who }}</span>
                      <span class="geo-deck__badge">
                        <svg class="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        已实测验证
                      </span>
                    </div>
                    <div class="geo-deck__note">{{ item.note }}</div>
                  </div>
                </div>
              </div>
            </article>

            <!-- 指示器：当前那条用进度填充表达「还有多久切」，
                 光标进入卡组时填充停住——暂停这件事因此看得见，而不只是"不动了"。 -->
            <div class="geo-deck__dots" role="tablist" aria-label="客户案例">
              <button
                v-for="(item, i) in caseStudies"
                :key="item.key"
                type="button"
                role="tab"
                class="geo-deck__dot"
                :class="{ 'is-active': i === deckActive }"
                :aria-selected="i === deckActive"
                :aria-label="`第 ${i + 1} 个案例：${item.who}`"
                @click="deckSelect(i)"
              >
                <span
                  v-if="i === deckActive"
                  :key="`fill-${deckActive}-${deckFlipCount}`"
                  class="geo-deck__dot-fill"
                ></span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- ================================================================ -->
      <!-- 5b. 凭什么：四个能力（信源地图 / 十万媒体 / 6 家 AI 收录 / 是人不是脚本） -->
      <!-- ================================================================ -->
      <!-- 效果讲完，紧接着回答客户心里那句"凭什么你能做到，别人不能"。
           刻意不照搬「三件事」的行式：这里用细线便当网格（attio 手法），
           两条核心数字（十万媒体 128,460 / 6 家 AI）放大成主角，网格线即分隔、不堆卡片。
           讲的是进攻性底气（信源地图 / 十万媒体），不是防御性自证（合规 / 留痕）。
           硬约束：不复用 .geo-promise（测试钉死恰好 3 个），这里用 .geo-why。 -->
      <section class="px-6 pb-32 sm:pb-40">
        <div class="mx-auto max-w-[980px]" data-reveal>
          <div class="geo-why-grid">
            <div
              v-for="item in capabilities"
              :key="item.key"
              class="geo-why"
              :class="`geo-why--${item.area}`"
            >
              <span class="geo-why__icon" aria-hidden="true">
                <svg v-if="item.key === 'map'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></svg>
                <svg v-else-if="item.key === 'media'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.6 12a7.4 7.4 0 0 1 14.8 0" /><path d="M7.8 12a4.2 4.2 0 0 1 8.4 0" /><circle cx="12" cy="12" r="1.4" /><path d="M12 13.4V21" /></svg>
                <svg v-else-if="item.key === 'ai'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="7.5" y="7.5" width="9" height="9" rx="1.5" /><path d="M10 7.5V4.5M14 7.5V4.5M10 19.5v-3M14 19.5v-3M7.5 10h-3M7.5 14h-3M19.5 10h-3M19.5 14h-3" /></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>
              </span>
              <template v-if="item.kind === 'stat'">
                <div class="geo-why__stat">{{ capabilityStats[item.key] ?? item.stat }}</div>
                <div class="geo-why__unit">{{ item.unit }}</div>
              </template>
              <p v-else class="geo-why__title">{{ item.title }}</p>
              <p class="geo-why__desc">{{ item.detail }}</p>

              <!-- 信源地图专属行业覆盖区块（填补大留白，展现 200+ 大类行业网络与实时拓扑插画） -->
              <div v-if="item.key === 'map'" class="geo-why__map-extra mt-auto pt-6 border-t border-zinc-100">
                <div class="flex items-baseline gap-2.5">
                  <div class="geo-why__stat text-[38px] leading-none font-medium text-[var(--ink)] tabular-nums sm:text-[44px]">
                    {{ capabilityStats.industry }}
                  </div>
                  <div class="geo-why__unit">大类行业，信源网络持续渗透</div>
                </div>
                <p class="geo-why__desc mt-2">
                  覆盖各行业垂直媒体、学术研报与知识库，知道各类问题在各行各业 AI 真正采信哪些出处。
                </p>
                <!-- 行业信源脉络微型网络状态栏（高情绪与信任价值） -->
                <div class="geo-why__industry-radar my-3.5 flex items-center justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-3.5 py-2.5">
                  <span class="text-[12px] font-medium text-zinc-700">信源网络实时拓扑路由</span>
                  <span class="text-[11px] font-mono text-zinc-400">200+ CATEGORIES</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <span v-for="tag in industryTags" :key="tag" class="geo-industry-pill">
                    {{ tag }}
                  </span>
                  <span class="geo-industry-pill geo-industry-pill--more">
                    + 190+ 垂直赛道
                  </span>
                </div>
              </div>

              <!-- 是人不是脚本专属情感背书（人在环验证徽章） -->
              <div v-else-if="item.key === 'human'" class="geo-why__human-extra mt-3 flex flex-wrap items-center gap-3 pt-3 border-t border-zinc-100">
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11.5px] font-medium text-zinc-700">
                    <svg class="h-3 w-3 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    人工全流程复核
                  </span>
                  <span class="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11.5px] font-medium text-zinc-700">
                    <svg class="h-3 w-3 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    出稿底单逐条留存
                  </span>
                </div>
                <span class="text-[12px] text-zinc-400">不做机器批量灌水 · 每一字有迹可循</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ================================================================ -->
      <!-- 6. 说一句话，活就派下去了（DSH 插件）                               -->
      <!-- ================================================================ -->
      <!-- 落在整页的高潮位（对照之后、FAQ 之前）—— 这是产品真正的亮点：
           不用点菜单，直接跟 AI 说一句，资料整理、事实确认、内容生成都在同一段对话里完成。
           参考 v0.dev：AI 产品的 hero 本身就是一个输入框，对话就是界面。 -->
      <section
        id="agent"
        class="border-t border-[var(--line)] px-6 py-32 sm:py-40"
      >
        <!-- 对话演示区不做滚动入场：演示要像循环动画一样自己跑，不受滚动/操作影响。
             （2026-10-14：原先这里是 data-reveal="group"，滚不到就整块停在透明态。） -->
        <div class="mx-auto max-w-[980px]">
          <h2
            class="text-[30px] leading-[1.2] font-medium tracking-[-0.015em] text-[var(--ink)] sm:text-[42px]"
          >
            说一句话，活就派下去了。
          </h2>
          <p class="mt-4 max-w-[640px] text-[15px] leading-[1.7] text-[var(--muted)]">
            不用点菜单、不用填表。资料整理、事实确认、内容生成，都在同一段对话里完成
            —— 它调用的就是你平时点的那些动作。
          </p>

          <div class="mt-14">
            <AgentChatScene :active="agentActive" @complete="onAgentComplete" />
          </div>
        </div>
      </section>

      <!-- ================================================================ -->
      <!-- 7. 常见问题（极简克制，去除大卡片与喧杂标签）                         -->
      <!-- ================================================================ -->
      <section
        id="questions"
        class="geo-home-faq border-t border-[var(--line)] px-6 pt-16 pb-16 sm:pt-20 sm:pb-20"
      >
        <div class="mx-auto max-w-[760px]" data-reveal>
          <div class="text-center">
            <div class="inline-flex items-center rounded-full border border-zinc-200/80 bg-zinc-50 px-3 py-1 text-[11px] font-medium text-zinc-600">
              常见问题 · FAQ
            </div>
            <h2 class="mt-3.5 text-[26px] font-semibold tracking-[-0.02em] text-[var(--ink)] sm:text-[32px]">
              答疑与说明
            </h2>
            <p class="mt-2 text-[13.5px] leading-relaxed text-[var(--muted)]">
              关于大模型可见度治理的核心逻辑与数据安全
            </p>
          </div>

          <!-- 极简发丝分割折叠行 (Linear Minimal Hairline Style) -->
          <div class="mt-10 divide-y divide-zinc-200/80 border-y border-zinc-200/80">
            <details
              v-for="(faq, idx) in faqItems"
              :key="idx"
              :open="idx === 0"
              class="group py-5 transition-colors"
            >
              <summary
                class="flex cursor-pointer list-none items-center justify-between gap-4 text-left select-none text-[14.5px] font-medium text-[var(--ink)] transition-colors hover:text-black"
              >
                <span>{{ faq.q }}</span>
                <span class="flex h-5 w-5 shrink-0 items-center justify-center text-zinc-400 transition-transform duration-200 group-open:rotate-45">
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </span>
              </summary>
              <div class="pt-3 pr-6 sm:pr-10">
                <p class="text-[13.5px] leading-relaxed text-[var(--muted)]">
                  {{ faq.a }}
                </p>
              </div>
            </details>
          </div>
        </div>
      </section>

      <!-- ================================================================ -->
      <!-- 8. 底部行动转化（殿堂级深空静谧收尾，去除假输入框与冗杂方块）        -->
      <!-- ================================================================ -->
      <section
        class="geo-home-finale dark relative overflow-hidden border-t border-zinc-200/90 bg-[#08090d] text-white"
      >
        <!-- 激光发丝微标尺纹理层 (Laser-Ruled Hairline Matrix) -->
        <div class="geo-home-finale__glow" aria-hidden="true"></div>
        <div class="geo-home-finale__grid" aria-hidden="true"></div>

        <!-- 纵向贯通发丝引导框架 -->
        <div class="mx-auto max-w-[1200px] border-x border-white/[0.07] px-6 py-20 sm:py-24">
          <div class="relative z-10 mx-auto max-w-[680px] text-center" data-reveal="group">
            <div class="inline-flex items-center gap-2 text-[11.5px] font-medium tracking-wider text-zinc-400 uppercase">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-zinc-400"></span>
              <span>GEO VISIBILITY WORKBENCH</span>
            </div>

            <h2
              class="mt-4 text-balance font-medium leading-[1.12] tracking-[-0.03em] text-white text-[32px] sm:text-[44px] lg:text-[48px]"
            >
              让每一次 AI 回答，都有据可依。
            </h2>
            <p
              class="mx-auto mt-4 max-w-[520px] text-[14.5px] leading-relaxed text-zinc-400 sm:text-[15px]"
            >
              建立受大模型信赖的企业事实基座，开启跨主流 AI 检索的实时可见度治理。进入工作台，即刻掌握主流模型正在传递的真实答案与引用出处。
            </p>

            <!-- 纯粹克制的高级行动组合 (Singular High-Contrast Action) -->
            <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <RouterLink
                to="/geo/login"
                class="geo-home-cta inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-[14px] font-semibold text-zinc-950 shadow-sm transition-all hover:bg-zinc-100 hover:shadow-md active:scale-[0.98]"
              >
                <span>进入企业工作台</span>
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </RouterLink>
              <a
                href="#product-film"
                class="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-[13.5px] font-medium text-zinc-300 transition-colors hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
              >
                <span>查看演播走查</span>
                <span aria-hidden="true">↑</span>
              </a>
            </div>

            <!-- 极简信誉背书一行流 (Quiet Restrained Trust Row)
                 原先每条前缀一个小圆点，三点就是三个圆点，视觉噪音大过信息量；
                 改成细竖线分隔，收敛成"一条被分成三段的话"。 -->
            <div class="mt-11 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-zinc-500">
              <span>企业物理隔离 · 零数据反哺</span>
              <span class="hidden h-3 w-px bg-white/12 sm:block" aria-hidden="true"></span>
              <span>事实核验三原则 · 结果可溯</span>
              <span class="hidden h-3 w-px bg-white/12 sm:block" aria-hidden="true"></span>
              <span>实时双盲实测 · 主流模型覆盖</span>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- ================================================================ -->
    <!-- 9. 页脚（殿堂级建筑发丝导轨）                                     -->
    <!-- ================================================================ -->
    <footer class="border-t border-white/[0.08] bg-[#08090d] text-white">
      <div class="mx-auto max-w-[1200px] border-x border-white/[0.07] px-6 py-9 sm:py-10">
        <div class="grid grid-cols-1 gap-8 sm:grid-cols-3 lg:gap-14">
          <!-- 第 1 列：产品能力 -->
          <div>
            <h4 class="text-[12px] font-semibold tracking-wider text-zinc-300 uppercase">产品能力</h4>
            <ul class="mt-3 space-y-1.5 text-[12.5px] text-zinc-400">
              <li><a href="#product-film" class="transition-colors hover:text-white">微缩演播走查</a></li>
              <li><RouterLink to="/geo/login" class="transition-colors hover:text-white">事实与知识底座</RouterLink></li>
              <li><RouterLink to="/geo/login" class="transition-colors hover:text-white">大模型搜索巡检</RouterLink></li>
              <li><RouterLink to="/geo/login" class="transition-colors hover:text-white">受限内容合规生产</RouterLink></li>
            </ul>
          </div>

          <!-- 第 2 列：治理标准 -->
          <div>
            <h4 class="text-[12px] font-semibold tracking-wider text-zinc-300 uppercase">治理规范</h4>
            <ul class="mt-3 space-y-1.5 text-[12.5px] text-zinc-400">
              <li><a href="#product-film" class="transition-colors hover:text-white">事实核验三原则</a></li>
              <li><a href="#agent" class="transition-colors hover:text-white">智能体调度协同</a></li>
              <li><a href="#questions" class="transition-colors hover:text-white">常见疑问与解答</a></li>
            </ul>
          </div>

          <!-- 第 3 列：安全与接入 -->
          <div>
            <h4 class="text-[12px] font-semibold tracking-wider text-zinc-300 uppercase">安全与接入</h4>
            <ul class="mt-3 space-y-1.5 text-[12.5px] text-zinc-400">
              <li><span class="text-zinc-500">企业数据零反哺协议</span></li>
              <li><span class="text-zinc-500">双盲实机巡检架构</span></li>
              <li>
                <RouterLink
                  to="/geo/login"
                  class="inline-flex items-center gap-1 font-medium text-white hover:text-zinc-300 transition-colors"
                >
                  <span>进入工作台</span>
                  <span aria-hidden="true">→</span>
                </RouterLink>
              </li>
            </ul>
          </div>
        </div>

        <!-- 版权栏：整条只留版权一行，去掉右侧的加密标识与二次登录入口 -->
        <div class="mt-8 border-t border-white/[0.08] pt-5 text-[12px] text-zinc-500">
          © 2026 GEO 可见度工作台. 保留所有权利.
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.geo-home-page {
  /*
    L1 官网设计 token。与演示窗口里的 L3（--skin-*，冻结）同向但不同值：
    中性色走一条自调的冷灰（hue≈220），比 slate 略蓝、明度相容——
    并排不割裂，但每个值都不是 Tailwind 默认色阶，是一套能互相解释的系统。
    品牌蓝沿用产品自身的身份色（与 L3 一致，零割裂）。
    深色承载面统一为「品牌深蓝」而非随机黑，让暗区归属品牌。
  */
  /* 中性冷灰 ramp (Linear / Vercel / Resend 标准) */
  --ink: #09090b;        /* 标题 / 正文最强 */
  --ink-soft: #27272a;   /* 次强，小标题 */
  --muted: #52525b;      /* 次要文字，≥4.5:1 */
  --faint: #71717a;      /* 三级文字 / 非关键 */
  --line: #e4e4e7;       /* 1px 发丝线 */
  --line-soft: #f4f4f5;  /* 更淡的分隔 */
  --subtle: #fafafa;     /* 填充 / hover 底 */
  --canvas: #ffffff;     /* 页面底 */
  --card: #ffffff;
  /* 品牌深黑碳系，彻底告别突兀电光蓝 */
  --brand: #18181b;
  --brand-hover: #27272a;
  --brand-soft: #f4f4f5;
  --brand-ink: #ffffff;
  /* 主按钮：权威炭黑行动色 */
  --btn: #18181b;
  --btn-hover: #27272a;
  --btn-ink: #ffffff;
  --ink-block: #18181b; /* 底部与深色区统一为极简纯黑碳系 */
  /* 深色承载面（品牌深蓝，统一 CTA / 页脚） */
  --deep: #121722;
  --deep-ink: #f2f6fd;
  --deep-muted: #8f959e;
  /* 排版 */
  --font-sans: "Inter", "SF Pro Text", -apple-system, BlinkMacSystemFont,
    "Segoe UI", "PingFang SC", "Microsoft YaHei", "Source Han Sans SC",
    "Hiragino Sans GB", sans-serif;
  --font-mono: "JetBrains Mono", "Cascadia Code", "Fira Code", ui-monospace,
    "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  --geo-saas-mono-font-family: var(--font-mono);
  --fw-regular: 400;
  --fw-medium: 500;
  --fw-strong: 550;
  /* 形式语言 */
  --r-sm: 6px;
  --r-md: 8px;
  --r-lg: 12px;
  --r-pill: 999px;
  --ring-card: 0 0 0 1px var(--line); /* 发丝线代替模糊投影 */

  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  color-scheme: light;
  scroll-behavior: smooth;
  scroll-padding-top: 80px;
  /*
    滚动发生在这个容器自己身上（外层 shell 把文档流锁住了），所以滚动条必须在这里受控。

    不控会怎样：实测 1024 宽时演播台右边缘离窗口只剩 34px，一根系统滚动条
    正好压上去；更难看的是内容高度一变（演播台展开/收回），滚动条进出各占一次宽度，
    居中的演播台就跟着左右推一下 —— 表现就是"滑动条影响到产品展示框"。
    stable 让这条槽位始终占着、宽度定死在 10px，进出都不再改变布局。
  */
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb, rgb(15 23 42 / 22%)) transparent;
  background: var(--canvas);
  color: var(--ink);
}
/* WebKit 系走这套：细一点、圆头、往内缩 3px，别贴着内容 */
.geo-home-page::-webkit-scrollbar {
  width: 10px;
}
.geo-home-page::-webkit-scrollbar-track {
  background: transparent;
}
.geo-home-page::-webkit-scrollbar-thumb {
  border: 3px solid transparent;
  border-radius: 999px;
  background: rgb(15 23 42 / 22%);
  background-clip: content-box;
}
.geo-home-page::-webkit-scrollbar-thumb:hover {
  background: rgb(15 23 42 / 34%);
  background-clip: content-box;
}
.geo-home-page :is(a, button, summary):focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 4px;
}
.geo-home-page :is(button, a, summary) {
  -webkit-tap-highlight-color: transparent;
}
.geo-home-page > main,
.geo-home-page > footer {
  position: relative;
}
/* 入场元素常驻 transform 层：被滚动唤醒的内容块（gsap.set 写入 y 位移，
   停住时也保留 translate 矩阵）。只给真正会动的元素加 will-change —— gsap-performance 的要求。 */
[data-reveal] {
  will-change: transform;
}
/* 首屏底纹：Semi 风格微点阵，优雅中性 */
.geo-home-hero__grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(#dee0e3 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: radial-gradient(ellipse at 50% 20%, #000 30%, transparent 80%);
  pointer-events: none;
  opacity: 0.6;
}
.geo-home-mobile-nav {
  position: relative;
}
.geo-home-mobile-nav summary {
  list-style: none;
  cursor: pointer;
}
.geo-home-mobile-nav summary::-webkit-details-marker {
  display: none;
}
/* 窗口外框 + 皮肤变量的兜底。
 *
 * 皮肤变量的真正定义在各 `[data-skin='…']` 块里（取值 = 产品真实主题在运行时的
 * 实际渲染色：在真机上逐个切换 data-geo-theme / data-geo-color-mode，读
 * documentElement 的 computed style，不是抄源码常量）。
 *
 * 这里**不再重复声明那一整套 token** —— 早期版本在本块和 `[data-skin='default']`
 * 里各写了一份完全相同的 27 个变量，两处一旦改漏一处就会出现「静态态与演播态
 * 配色不一致」。默认皮肤那份由下面的 `[data-skin='default']` 独占。
 */
.geo-home-stage {
  /* 回卷薄幕要相对演播台定位，而不是相对整页 —— 否则白闪会连导航一起盖住 */
  position: relative;
  border: 1px solid var(--skin-line);
  border-radius: 12px;
  background: var(--skin-canvas);
  box-shadow:
    0 1px 2px rgb(0 0 0 / 4%),
    0 12px 32px -18px rgb(0 0 0 / 12%);
  transition:
    background-color 420ms ease,
    border-color 420ms ease;
}
/*
 * 演播台与滚动解耦（按要求移除 sticky + 视差）。
 *
 * 原实现是 attio 那套：桌面端把演播台 position: sticky 吸顶，粘住期间再叠一层
 * 随滚动进度走的 translateY，父列留 110vh 给一段"短行程"。
 * 现在整个区块回归文档流中的普通元素：位置固定、不吸顶、不随滚动移动，
 * 页面滚到哪儿它就待在哪儿，内容按自己的时钟循环播放。
 */
/* 结尾深色区块：1:1 借鉴 Attio 的激光发丝标尺微矩阵与中性微光 */
.geo-home-finale__glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse 70% 50% at 50% 35%,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(120, 119, 198, 0.04) 40%,
    transparent 70%
  );
}
.geo-home-finale__grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: repeating-linear-gradient(to right, rgba(255, 255, 255, 0.035) 0 1px, transparent 1px 8px);
  mask-image: radial-gradient(ellipse 70% 50% at 50% 50%, transparent 30%, #000 75%);
  -webkit-mask-image: radial-gradient(ellipse 70% 50% at 50% 50%, transparent 30%, #000 75%);
}
/* 风格 1 · 旗舰深海宝蓝（default · light） */
.geo-home-stage[data-skin='default'] {
  --skin-canvas: #f8fafc;
  --skin-card: #ffffff;
  --skin-subtle: #f1f5f9;
  --skin-hover: #f8fafc;
  --skin-line: #e2e8f0;
  --skin-line-soft: #f1f5f9;
  --skin-ink: #0f172a;
  --skin-muted: #475569;
  --skin-faint: #94a3b8;
  --skin-brand: #1d4ed8;
  --skin-brand-hover: #1e40af;
  --skin-brand-soft: #eff6ff;
  --skin-brand-line: var(--border-focus);
  --skin-sidebar: #ffffff;
  --skin-tag-bg: #eef2f6;
  --skin-tag-text: #486581;
  --skin-success: #059669;
  --skin-success-bg: #ecfdf5;
  --skin-success-line: var(--status-success-border);
  --skin-warning: #9a6700;
  --skin-warning-bg: #fffaf0;
  --skin-warning-line: #ead9b4;
  --skin-danger: #e11d48;
  --skin-danger-bg: #fff1f2;
  --skin-danger-line: #fecdd3;
  --skin-info: #0284c7;
  --skin-info-bg: #f0f9ff;
  --skin-btn-bg: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
  --skin-shadow-card: 0 1px 3px 0 rgb(15 23 42 / 3%), 0 1px 2px -1px rgb(15 23 42 / 3%);
  --skin-focus-ring: rgb(29 78 216 / 24%);
}
/* 风格 2 · 旗舰深海宝蓝 · 深色（default + dark） */
.geo-home-stage[data-skin='dark'] {
  --skin-canvas: #0d0f13;
  --skin-card: #13161b;
  --skin-subtle: #171a20;
  --skin-hover: #1b1f26;
  --skin-line: #252a32;
  --skin-line-soft: #1e232b;
  --skin-ink: #f5f7fa;
  --skin-muted: #a9b0bb;
  --skin-faint: #858d99;
  --skin-brand: #7778ff;
  --skin-brand-hover: #8687ff;
  --skin-brand-soft: #1a1b2d;
  --skin-brand-line: #30325d;
  --skin-sidebar: #111419;
  --skin-tag-bg: #171a20;
  --skin-tag-text: #a9b0bb;
  --skin-success: #78c69a;
  --skin-success-bg: #16241d;
  --skin-success-line: #2c473a;
  --skin-warning: #d7b369;
  --skin-warning-bg: #3a301d;
  --skin-warning-line: #72511e;
  --skin-danger: #de8998;
  --skin-danger-bg: #2a1a1e;
  --skin-danger-line: #4d3037;
  --skin-info: #7cb8e8;
  --skin-info-bg: #14212c;
  --skin-btn-bg: #7778ff;
  --skin-shadow-card: 0 12px 30px rgb(0 0 0 / 20%);
  --skin-focus-ring: rgb(119 120 255 / 32%);
}
/* 风格 3 · 极客科技蓝紫（structured-soft） */
.geo-home-stage[data-skin='structured-soft'] {
  --skin-canvas: #f8f8fc;
  --skin-card: #ffffff;
  --skin-subtle: #f0f0f8;
  --skin-hover: #f4f4fc;
  --skin-line: #e4e4f0;
  --skin-line-soft: #f0f0f7;
  --skin-ink: #18182e;
  --skin-muted: #585876;
  --skin-faint: #9b9bb8;
  --skin-brand: #5e6ad2;
  --skin-brand-hover: #4b55bd;
  --skin-brand-soft: #f0f2fe;
  --skin-brand-line: #c8ccf5;
  --skin-sidebar: #ffffff;
  --skin-tag-bg: #f0f4ff;
  --skin-tag-text: #5e6ad2;
  --skin-success: #059669;
  --skin-success-bg: #ecfdf5;
  --skin-success-line: var(--status-success-border);
  --skin-danger: #e11d48;
  --skin-danger-bg: #fff1f2;
  --skin-danger-line: #fecdd3;
  --skin-info: #5e6ad2;
  --skin-info-bg: #f0f4ff;
  --skin-btn-bg: #5e6ad2;
  --skin-shadow-card: 0 1px 3px rgb(24 24 46 / 4%), 0 1px 2px rgb(24 24 46 / 2%);
  --skin-focus-ring: rgb(94 106 210 / 24%);
}
/* 风格 4 · 北欧松绿（nordic） */
.geo-home-stage[data-skin='nordic'] {
  --skin-canvas: #f7faf8;
  --skin-card: #ffffff;
  --skin-subtle: #eff5f2;
  --skin-hover: #f2f7f4;
  --skin-line: #e0ebe4;
  --skin-line-soft: #edf3f0;
  --skin-ink: #192e24;
  --skin-muted: #4a6357;
  --skin-faint: #89a396;
  --skin-brand: #2d6a4f;
  --skin-brand-hover: #21513c;
  --skin-brand-soft: #f1f8f4;
  --skin-brand-line: #d8eedf;
  --skin-sidebar: #ffffff;
  --skin-tag-bg: #eff5f2;
  --skin-tag-text: #4a6357;
  --skin-success: #059669;
  --skin-success-bg: #ecfdf5;
  --skin-success-line: var(--status-success-border);
  --skin-danger: #e11d48;
  --skin-danger-bg: #fff1f2;
  --skin-danger-line: #fecdd3;
  --skin-info: #2d6a4f;
  --skin-info-bg: #f1f8f4;
  --skin-btn-bg: linear-gradient(180deg, #387a5b 0%, #2d6a4f 100%);
  --skin-shadow-card: 0 1px 3px rgb(25 46 36 / 4%), 0 1px 2px rgb(25 46 36 / 2%);
  --skin-focus-ring: rgb(45 106 79 / 24%);
}
/* 风格 5 · 暖色编辑（warm-editorial） */
.geo-home-stage[data-skin='warm-editorial'] {
  --skin-canvas: #faf8f5;
  --skin-card: #ffffff;
  --skin-subtle: #f5f1eb;
  --skin-hover: #fffaf7;
  --skin-line: #e2dbd2;
  --skin-line-soft: #ece6de;
  --skin-ink: #2b2825;
  --skin-muted: #706b65;
  --skin-faint: #a0988f;
  --skin-brand: #c15f3d;
  --skin-brand-hover: #ae5131;
  --skin-brand-soft: #fbf0eb;
  --skin-brand-line: #c15f3d;
  --skin-sidebar: #f4efeb;
  --skin-tag-bg: #f5f1eb;
  --skin-tag-text: #706b65;
  --skin-success: #059669;
  --skin-success-bg: #ecfdf5;
  --skin-success-line: var(--status-success-border);
  --skin-danger: #e11d48;
  --skin-danger-bg: #fff1f2;
  --skin-danger-line: #fecdd3;
  --skin-info: #c15f3d;
  --skin-info-bg: #fbf0eb;
  --skin-btn-bg: #c15f3d;
  --skin-shadow-card: 0 1px 2px rgb(43 40 37 / 4%);
  --skin-focus-ring: rgb(193 95 61 / 24%);
}
.geo-home-stage__live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--skin-success);
}
/* 风格切换：真产品顶栏那颗调色盘按钮的同一套外观。
   面板本身是窗内浮层，所以 z-index 要高过内容区。 */
.geo-home-stage__appearance {
  position: relative;
  flex: none;
}
.geo-home-stage__appearance-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  border: 1px solid var(--skin-line);
  border-radius: 8px;
  color: var(--skin-muted);
  /* 跟着皮肤走：它在窗口顶栏里，是界面的一部分，
     固定白底会在深色皮肤下变成一块突兀的白斑。 */
  background: var(--skin-card);
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    color 160ms ease;
}
.geo-home-stage__appearance-trigger svg {
  width: 13px;
  height: 13px;
  flex: none;
}
.geo-home-stage__appearance-name {
  max-width: 96px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.geo-home-stage__appearance-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: transparent;
  border: none;
  cursor: default;
}
.geo-home-stage__appearance-popover {
  position: absolute;
  z-index: 41;
  top: calc(100% + 8px);
  right: 0;
  /* 宽度收在窗口内容区之内：面板本身也受镜头缩放，
     320px 在缩放后会顶出右边界，看着像溢出。 */
  width: 268px;
  padding: 12px;
  border: 1px solid var(--skin-line);
  border-radius: 12px;
  background: var(--skin-card);
  box-shadow:
    rgba(11, 13, 24, 0.06) 0 0 0 1px,
    rgba(11, 13, 24, 0.04) 0 4px 10px 0,
    rgba(11, 13, 24, 0.05) 0 16px 32px 0;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(-4px) scale(0.98);
  transition:
    opacity 160ms ease,
    transform 160ms ease,
    visibility 160ms;
}
.geo-home-stage__appearance-popover.is-open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0) scale(1);
}
.geo-home-stage__appearance-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.geo-home-stage__appearance-head strong {
  font-size: 13px;
  font-weight: 500;
  color: var(--skin-ink);
}
.geo-home-stage__appearance-head small {
  font-size: 11px;
  color: var(--skin-muted);
}
.geo-home-stage__appearance-grid {
  display: grid;
  gap: 7px;
}
/* 色卡：与产品设置面板的 ThemePreview 同构（色点 + 名称 + 描述 + 选中勾）。 */
.geo-home-stage__theme-card {
  position: relative;
  display: grid;
  gap: 7px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--skin-line);
  border-radius: 8px;
  text-align: left;
  background: var(--skin-card);
  cursor: pointer;
  transition:
    border-color 150ms ease,
    background-color 150ms ease;
}
.geo-home-stage__theme-swatches {
  display: flex;
  align-items: center;
  gap: 4px;
}
.geo-home-stage__theme-swatch {
  width: 13px;
  height: 13px;
  border: 1px solid rgb(15 23 42 / 10%);
  border-radius: 50%;
}
.geo-home-stage__theme-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding-right: 16px;
}
.geo-home-stage__theme-copy strong {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
  color: var(--skin-ink);
}
.geo-home-stage__theme-copy small {
  overflow: hidden;
  font-size: 11px;
  line-height: 1.4;
  color: var(--skin-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.geo-home-stage__theme-card.is-selected {
  border-color: var(--skin-brand);
  background: var(--skin-brand-soft);
}
.geo-home-stage__theme-check {
  position: absolute;
  top: 10px;
  right: 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--skin-brand);
}
/* 承载真机骨架的普通容器。适配缩放已经移交给 __scene 的镜头变换，
   这里保持无缩放、无裁切，避免出现第二层缩放。 */
.geo-home-stage__workbench {
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  width: 100%;
  height: 100%;
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  /* 真机正文基准 14px（清爽利落，不粗不坠）。 */
  font-size: 14px;
  line-height: 1.5;
  color: var(--skin-ink);
  background: var(--skin-canvas);
  /* 换肤时颜色平滑过渡。放在容器上而不是每个子元素上：
     子元素多数继承或走变量，容器一层过渡就够，也省掉满屏 transition。 */
  transition:
    background-color 420ms ease,
    color 420ms ease;
}
.geo-home-stage__workbench strong,
.geo-home-stage__workbench b {
  font-weight: 500;
}
.geo-home-stage__sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border-right: 1px solid var(--skin-line);
  background: var(--skin-sidebar);
  transition:
    background-color 420ms ease,
    border-color 420ms ease;
}
.geo-home-stage__sb-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 52px;
  padding: 0 16px;
  border-bottom: 1px solid var(--skin-line);
  color: var(--skin-ink);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.01em;
  flex-shrink: 0;
}
.geo-home-stage__sb-logo-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.3s ease;
}
.geo-home-stage__sb-logo-wrap[data-skin='dark'] {
  background: #1a1b2d;
  box-shadow: 0 0 10px rgba(119, 120, 255, 0.45);
}
.geo-home-stage__sb-logo-wrap[data-skin='nordic'] {
  box-shadow: 0 0 8px rgba(45, 106, 79, 0.25);
}
.geo-home-stage__sb-logo-wrap[data-skin='warm-editorial'] {
  box-shadow: 0 0 8px rgba(193, 95, 61, 0.25);
}
.geo-home-stage__sb-logo-wrap[data-skin='structured-soft'] {
  box-shadow: 0 0 8px rgba(94, 106, 210, 0.25);
}
.geo-home-stage__sb-scroll {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 1px;
  padding: 6px 10px;
  overflow-y: hidden;
}
.geo-home-stage__sb-group {
  padding: 8px 10px 3px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--skin-faint);
  text-transform: uppercase;
}
.geo-home-stage__sb-item {
  display: flex;
  align-items: center;
  position: relative;
  gap: 8px;
  min-height: 29px;
  padding: 4px 10px;
  border-radius: 6px;
  color: var(--skin-muted);
  font-size: 12.5px;
  font-weight: 400;
  transition: background-color 0.24s ease, color 0.24s ease;
}
.geo-home-stage__sb-item svg {
  width: 15px;
  height: 15px;
  flex: none;
}
.geo-home-stage__sb-item.is-active {
  background: var(--skin-brand-soft);
  color: var(--skin-brand);
  font-weight: 500;
}
.geo-home-stage__sb-item.is-active::before {
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 3px;
  background: var(--skin-brand);
  content: '';
}
.geo-home-stage__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.geo-home-stage__topbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  height: 60px;
  padding: 0 28px;
  border-bottom: 1px solid var(--skin-line);
  background: var(--skin-card);
  transition:
    background-color 420ms ease,
    border-color 420ms ease;
}
.geo-home-stage__breadcrumb {
  font-size: 13.5px;
}
.geo-home-stage__breadcrumb strong {
  font-weight: 500;
}
.geo-home-stage__topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.geo-home-stage__topbar-label {
  color: var(--skin-muted);
  font-size: 12px;
}
/* 演示数据标记：真产品这里是「实时」，我们换成如实说明，位置不变。 */
.geo-home-stage__disclaimer {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--skin-line);
  border-radius: 999px;
  color: var(--skin-muted);
  background: var(--skin-subtle);
  font-size: 11px;
  white-space: nowrap;
}
.geo-home-stage__project-select {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 10px;
  border: 1px solid var(--skin-line);
  border-radius: 8px;
  background: var(--skin-subtle);
  font-size: 12px;
  color: var(--skin-muted);
  font-weight: 400;
}
.geo-home-stage__content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  /* 真实工作台内容区 padding 20px（实测 .content-library-page__workspace） */
  padding: 20px;
}
/* 白卡工作区：真实产品把工具行与内容都收在这张卡里，
   所以页面背景是 #f8fafc、卡片是白的，层次靠这两层拉出来。 */
.geo-home-stage__workspace {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: var(--geo-space-3);
  border: 1px solid var(--skin-line);
  border-radius: 8px;
  background: var(--skin-card);
}
.geo-home-stage__pipeline {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  margin-bottom: var(--geo-space-4);
  padding: 8px 12px;
  border: 1px solid var(--skin-line);
  border-radius: 8px;
  background: var(--skin-card);
  font-size: 11px;
}
.geo-home-stage__pipeline-label {
  font-weight: 500;
  white-space: nowrap;
}
.geo-home-stage__pipeline-steps {
  display: flex;
  align-items: center;
  gap: 7px;
}
.geo-home-stage__step {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--skin-muted);
  white-space: nowrap;
  font-weight: 500;
}
.geo-home-stage__step i {
  display: grid;
  place-items: center;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  background: var(--skin-subtle);
  color: var(--skin-muted);
  font-size: 11px;
  font-weight: 500;
  font-style: normal;
  font-variant-numeric: tabular-nums;
}
.geo-home-stage__step.is-active {
  color: var(--skin-brand);
}
.geo-home-stage__step.is-active i {
  background: var(--skin-brand);
  color: white;
}
.geo-home-stage__step.is-done i {
  background: var(--skin-brand-soft);
  color: var(--skin-brand);
}
.geo-home-stage__step-arrow {
  color: var(--skin-faint);
}
.geo-home-stage__pipeline-next {
  margin-left: auto;
  color: var(--skin-faint);
  white-space: nowrap;
  font-size: 11px;
}
/* 取景框：比例固定，本身不参与镜头变换。推近时框纹丝不动，动的是框里的整台工作台。 */
.geo-home-stage__frame {
  position: relative;
  /* 取景框比例必须与场景一致（场景 = 真机设计尺寸 1440 × 908，见下面 __scene）。
   *
   * 曾经写成 `1440 / 760`（学 attio 的"更宽、不更高"），代价是底部多裁一截。
   * 但 attio 窗口里放的是装饰性画面，我们窗口里是**1:1 复刻的真机工作台**，
   * 底部那截恰好是侧栏的「团队与权限 / 预算与费用 / 操作记录 / 图库管理 /
   * AI 调用监控 / 模型状态测试 / 设置」—— 裁一截不是纵深，是把界面拦腰切断。
   *
   * 2026-10-12 实测（线上 192.168.2.110:88）：
   *   1366 视口 → 框 1296×684 vs 内容 1296×817 → 裁 134px
   *   1440 视口 → 框 1338×706 vs 内容 1338×844 → 裁 139px
   *   且裁切量随镜头 y 位移在 0~52px 之间跳，同一台工作台的出框元素数从 73 跳到 15。
   * 比例对齐后内容完整落进框里，裁切量恒为 0（见 verify/clip-audit.mjs）。
   * 用 aspect-ratio 而不是写死像素，换视口才不会再次错位。 */
  aspect-ratio: 1440 / 908;
  overflow: hidden;
  border-top: 1px solid var(--skin-line);
  background: var(--skin-card);
  transition:
    background-color 420ms ease,
    border-color 420ms ease;
}
/* 场景 = 镜头层。CSS 尺寸就是真机设计尺寸（1440 × 908），
   适配缩放与取景位移合成它身上的**唯一一次** transform。
   它包住整台工作台，所以侧栏、顶栏、内容区一起缩放。 */
.geo-home-stage__scene {
  position: absolute;
  top: 0;
  left: 0;
  width: 1440px;
  height: 908px;
  background: var(--skin-card);
  transform-origin: 0 0;
  will-change: transform;
  transition: background-color 420ms ease;
}
/* 内容区里的四页叠放：每页绝对定位，同一时刻只有一张 is-current。 */
.geo-home-stage__slides {
  position: relative;
  flex: 1;
  min-height: 0;
}
.geo-home-stage__slides-inner {
  position: absolute;
  inset: 0;
}
.geo-home-stage__slide {
  position: absolute;
  inset: 0;
  padding: 0 24px 20px;
  opacity: 0;
  visibility: hidden;
  /* 内容区自己滚 —— 真机就是这样（页面壳体不动，内容滚）。
   * 四页内容量差得很远：facts 964px / content 692 / reports 497 / media 455，
   * 而内容视口只有 660px。不给滚的话，多出来的被裁掉（facts 页的「事实候选卡」
   * 整块落在视口外，观众看不到它被确认），少的那两页又留一大片白。
   * 演示里不显示滚动条（下面的 ::-webkit-scrollbar 收起），像真机全屏时的样子。 */
  overflow-y: auto;
  scrollbar-width: none;
  pointer-events: none;
  transition: opacity 0.35s ease;
  transform: none;
}
.geo-home-stage__slide::-webkit-scrollbar {
  width: 0;
  height: 0;
}
.geo-home-stage__slide.is-current {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: none;
}
.geo-home-stage__cursor {
  position: absolute;
  z-index: 8;
  top: 0;
  left: 0;
  width: 26px;
  height: 26px;
  pointer-events: none;
  opacity: 0;
  color: #0f172a;
  filter: drop-shadow(0 1px 1px #fff) drop-shadow(0 2px 4px #0004);
}
.geo-home-stage__cursor svg {
  width: 100%;
  height: 100%;
}
.geo-tab-bar {
  display: flex;
  align-items: center;
  gap: 28px;
  min-height: 44px;
  margin-bottom: var(--geo-space-3);
  border-bottom: 1px solid var(--skin-line);
}
.geo-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  font-size: 13.5px;
  color: var(--skin-muted);
}
.geo-tab em {
  font-style: normal;
}
.geo-tab.is-active {
  color: var(--skin-brand);
  font-weight: 500;
}
.geo-tab.is-active::after {
  position: absolute;
  content: '';
  height: 2px;
  bottom: -1px;
  left: 0;
  right: 0;
  background: var(--skin-brand);
}
/* 双行页签：真机 content 页每个 antd Tab 是「主标题 + 副标题」上下两行。 */
.geo-tab-bar--stacked .geo-tab,
.geo-tab:has(.geo-tab__title) {
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding-top: 6px;
  padding-bottom: 6px;
}
.geo-tab__title {
  font-size: 13.5px;
  line-height: 1.4;
}
.geo-tab__hint {
  font-size: 11px;
  font-weight: 400;
  line-height: 1.3;
  color: var(--skin-faint);
}
.geo-tab.is-active .geo-tab__hint {
  color: var(--skin-muted);
}
/* 工作区工具行：真机是「左标题+计数 / 右筛选器组」，flex 两端对齐。
   分布在 questions 与 reports 两页，所以做成公用类。 */
.geo-workspace-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  min-height: 46px;
  margin-bottom: 14px;
}
.geo-workspace-toolbar__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}
.geo-workspace-toolbar__head h2 {
  font-size: 14.5px;
  font-weight: 500;
  color: var(--skin-ink);
}
.geo-workspace-toolbar__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
/* 范围说明（reports 页的「当前项目 N 次运行」）：数值用大号 tabular 数字。 */
.geo-scope {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--skin-muted);
}
.geo-scope strong {
  margin: 0 1px;
  font-size: 18px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--skin-ink);
}
/* ---- antd 表格的单元格语义色 ----
   真机表格左下两行：主行 500 字重深色，副行 12px 灰色。 */
.geo-table-primary {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  color: var(--skin-ink);
}
.geo-table-secondary {
  display: block;
  font-size: 11.5px;
  line-height: 1.45;
  font-variant-numeric: tabular-nums;
  color: var(--skin-muted);
}
/* 开关：真机「任务开关」列是 <a-switch size="small">，28×16 圆角胶囊。
   滑块保持白色 —— antd 深色主题下 Switch 的滑块本来就是白的，
   它不是漏白，是控件本体的一部分。 */
.geo-switch {
  display: inline-flex;
  align-items: center;
  width: 28px;
  height: 16px;
  padding: 2px;
  border-radius: 999px;
  background: var(--skin-brand);
}
.geo-switch i {
  width: 12px;
  height: 12px;
  margin-left: auto;
  border-radius: 50%;
  background: #fff;
}
/* 复盘报告「有效回答」列的 4px 进度条：真机在数值下面给一条细轨。 */
.geo-run-quality strong {
  font-size: 14px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--skin-ink);
}
.geo-run-quality__track {
  width: min(100%, 96px);
  height: 4px;
  margin-top: 6px;
  overflow: hidden;
  background: var(--skin-line-soft);
  border-radius: 999px;
}
.geo-run-quality__track span {
  display: block;
  height: 100%;
  background: var(--skin-brand);
  border-radius: inherit;
}
/* 生成结果列表 / 搜索问题表格共用的一行。 */
.geo-qlist > .geo-demo-table {
  margin-bottom: 4px;
}
.geo-sec-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin: 12px 0 16px;
}
.geo-sec-head strong {
  font-weight: 500;
  font-size: 13.5px;
}
.geo-sec-head > .ml-auto {
  flex-basis: 100%;
  margin-left: 0;
  font-size: 12px;
}
.geo-sec-count {
  white-space: nowrap;
  font-size: 12px;
  color: var(--skin-muted);
}
/* 页面操作行：真实产品里是右对齐的一排按钮（GeoPageActionBar，48px 基线）。 */
.geo-page-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-height: 34px;
  margin-bottom: 4px;
}
/* 区块头副文案：真产品把说明放在标题下方一行，小字灰色。 */
.geo-sec-desc {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--skin-muted);
}
.geo-sec-head__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
/* 筛选行：搜索框 + 状态筛选 + 匹配数 */
.geo-filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  margin-bottom: var(--geo-space-2);
}
.geo-row-bar,
.geo-cand-head,
.geo-file-row,
.geo-filter-bar,
.geo-task-row,
.geo-run-row,
.geo-slim-row,
.geo-rec-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.geo-row-bar {
  min-height: 36px;
  padding: var(--geo-space-1) var(--geo-space-3);
  border: 1px solid var(--skin-line);
  border-radius: 8px;
  margin-bottom: var(--geo-space-2);
}
.geo-cand-head {
  min-height: 32px;
  margin: var(--geo-space-2) 0;
  flex-wrap: wrap;
}
.geo-cand-head strong {
  font-size: 13px;
  font-weight: 500;
}
.geo-search,
.geo-select {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 4px 10px;
  border: 1px solid var(--skin-line);
  border-radius: 6px;
  font-size: 12px;
  background: var(--skin-card);
  color: var(--skin-muted);
}
.geo-search {
  color: var(--skin-faint);
  min-width: 224px;
}
.geo-search--wide {
  min-width: 280px;
}
.geo-select {
  white-space: nowrap;
}
/* reports 页「按检测类型筛选」：真机 180px 宽的下拉。 */
.geo-select--wide {
  min-width: 180px;
}
.geo-select::after {
  content: '⌄';
  padding-left: 16px;
  color: var(--skin-faint);
}
.geo-checkbox {
  position: relative;
  width: 15px;
  height: 15px;
  flex: none;
  border: 1px solid var(--skin-line);
  border-radius: 4px;
  background: var(--skin-card);
  transition: all 0.2s ease;
}
.geo-checkbox.is-checked {
  background: var(--skin-brand);
  border-color: var(--skin-brand);
}
.geo-checkbox.is-checked::after {
  position: absolute;
  top: 45%;
  left: 22%;
  width: 4px;
  height: 7px;
  border: 1.5px solid #ffffff;
  border-top: 0;
  border-left: 0;
  transform: rotate(45deg) translate(-50%, -50%);
  content: '';
}
.geo-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 30px;
  padding: 4px 12px;
  border: 1px solid var(--skin-line);
  border-radius: 6px;
  color: var(--skin-muted);
  background: var(--skin-card);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
  transition: all 0.15s ease;
}
.geo-btn--primary,
.geo-btn--sm,
.geo-btn--primary-sm {
  border-color: var(--skin-brand);
  /* 真实产品的 default / nordic 主按钮是纵向渐变，其余纯色。
     用 --skin-btn-bg 而不是 --skin-brand，才能吃到那个渐变。 */
  background: var(--skin-btn-bg);
  color: #fff;
}
.geo-btn--sm {
  min-height: 28px;
  font-size: 11px;
}
/* 页面操作行里的小号主按钮（真实产品 30px，radius 6）。 */
.geo-btn--primary-sm {
  min-height: 30px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
}
/* 次要按钮：白底描边，用于「刷新」这类低优先动作。 */
.geo-btn--ghost {
  border-color: var(--skin-line);
  background: var(--skin-card);
  color: var(--skin-muted);
}
.geo-btn--danger {
  color: var(--skin-danger);
  border-color: var(--geo-saas-danger-border);
}
.geo-btn.is-confirmed {
  color: var(--skin-success);
  background: var(--skin-success-bg);
  border-color: var(--geo-saas-success-border);
  box-shadow: none;
}
.geo-file-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 10px 14px;
  border: 1px solid var(--skin-line);
  border-radius: 8px;
  margin-bottom: 10px;
  background: var(--skin-card);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}
.geo-file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--skin-subtle);
  color: var(--skin-brand);
  flex: none;
}
.geo-file-icon svg {
  width: 14px;
  height: 14px;
}
.geo-file-main,
.geo-run-main,
.geo-task-name {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.geo-file-name {
  color: var(--skin-ink);
  font-size: 12.5px;
  font-weight: 500;
}
.geo-file-meta {
  font-size: 11px;
  color: var(--skin-muted);
}
.geo-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 22px;
  padding: 1px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: var(--skin-tag-bg);
  font-size: 11px;
  font-weight: 500;
  color: var(--skin-tag-text);
  white-space: nowrap;
}
/* 「已解析 / 已批准 N 条 / 执行成功 / 可查看 / 已启用 / 已发布」这类**中性完成态**
 * 一律走灰阶：它们只说明"这一步做完了"，不是观众要看的东西。原来一屏里挤着十几个
 * 绿标签，配上蓝按钮和橙标签，整台工作台花得像告警面板
 * （用户 2026-10-12：「我不喜欢多余的颜色，看起来太花了，不够干净」）。
 * 颜色只留给三件事 ——
 *   · 「待确认 / 已确认」蓝（第 01 幕的状态翻面）
 *   · 「仅限内部，禁止公开」橙（第 02 幕的判定）
 *   · 「只能引用已确认的事实」绿（第 03 幕的锁，见下行 --locked） */
.geo-tag--success {
  border-color: transparent;
  background: var(--skin-tag-bg);
  color: var(--skin-tag-text);
}
.geo-tag--locked {
  display: inline-flex;
  align-items: center;
  border-color: var(--skin-success-line);
  background: var(--skin-success-bg);
  color: var(--skin-success);
  font-weight: 500;
  font-size: 11.5px;
}
.geo-tag--processing {
  background: var(--skin-brand-soft);
  color: var(--skin-brand);
}
.geo-tag--danger {
  border-color: var(--skin-danger-line);
  background: var(--skin-danger-bg);
  color: var(--skin-danger);
}
/* 页面内的提示条。真实产品用红色表示驳回、蓝色表示可继续、绿色表示完成。 */
.geo-alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid var(--skin-line);
  border-radius: 8px;
  background: var(--skin-subtle);
  font-size: 12px;
  line-height: 1.6;
  color: var(--skin-muted);
}
.geo-alert strong {
  display: block;
  margin-bottom: 2px;
  font-weight: 500;
  color: var(--skin-ink);
}
.geo-alert--danger {
  border-color: var(--skin-danger-line);
  background: var(--skin-danger-bg);
}
.geo-alert--danger strong {
  color: var(--skin-danger);
}
.geo-alert--success {
  border-color: var(--skin-success-line);
  background: var(--skin-success-bg);
}
.geo-alert--success strong {
  color: var(--skin-success);
}
.geo-alert__icon {
  flex: none;
  margin-top: 2px;
}
.geo-link {
  color: var(--skin-brand);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
.geo-cand {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 10px;
  border: 1px solid var(--skin-line);
  border-radius: 8px;
  background: var(--skin-card);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}
.geo-cand.is-opened {
  border-color: var(--skin-brand-line);
}
.geo-cand.is-admitted {
  border-color: var(--geo-saas-success-border);
}
.geo-cand-main,
.geo-article-main {
  flex: 1;
  min-width: 0;
}
.geo-cand-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.geo-cand-subject {
  font-weight: 500;
  font-size: 13px;
  color: var(--skin-ink);
}
.geo-cand-claim {
  margin: 8px 0;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.6;
}
.geo-cand-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  color: var(--skin-muted);
  font-size: 11px;
}
.geo-cand-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex: none;
}
.geo-page-foot {
  display: flex;
  justify-content: space-between;
  margin-top: var(--geo-space-2);
  padding: var(--geo-space-2) 0;
  border-top: 1px solid var(--skin-line-soft);
}
.geo-drawer {
  position: absolute;
  z-index: 5;
  top: 0;
  right: 0;
  width: 520px;
  height: 100%;
  background: var(--skin-card);
  border-left: 1px solid var(--skin-line);
  box-shadow: -16px 0 40px #182b4f17;
  transform: translateX(100%);
}
.geo-drawer-head {
  display: flex;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--skin-line);
  font-size: 15px;
  font-weight: 500;
}
.geo-drawer-body {
  padding: 24px;
}
.geo-drawer-claim {
  line-height: 1.7;
  margin-bottom: 18px;
  font-weight: 400;
  font-size: 13.5px;
}
.geo-drawer-fields {
  display: grid;
  gap: 18px;
}
.geo-drawer-field {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--skin-line-soft);
  font-size: 13px;
}
.geo-drawer-field dt {
  color: var(--skin-muted);
}
.geo-drawer-foot {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--skin-line);
}
.geo-wizard {
  border: 1px solid var(--skin-line);
  border-radius: 8px;
  padding: 24px;
}
.geo-wizard-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}
.geo-wizard-step {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--skin-muted);
  font-size: 14px;
}
.geo-wizard-step i {
  display: grid;
  place-items: center;
  height: 28px;
  width: 28px;
  border-radius: 50%;
  background: var(--skin-subtle);
  font-style: normal;
}
.geo-wizard-step.is-active {
  color: var(--skin-brand);
  font-weight: 500;
}
.geo-wizard-step.is-active i {
  color: var(--text-inverse);
  background: var(--skin-brand);
}
.geo-wizard-step.is-done i {
  background: var(--skin-brand-soft);
  color: var(--skin-brand);
}
.geo-wizard-panels {
  position: relative;
  min-height: 142px;
}
.geo-wizard-panel {
  position: absolute;
  inset: 0;
  opacity: 0;
  visibility: hidden;
}
.geo-wizard-panel.is-on {
  opacity: 1;
  visibility: visible;
}
.geo-field-label {
  display: block;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 500;
}
.geo-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--skin-line);
  border-radius: 6px;
}
.geo-input-icon {
  width: 16px;
  height: 16px;
  color: var(--skin-faint);
}
.geo-input-text {
  display: inline-flex;
  min-width: 6em;
  align-items: center;
  height: 24px;
  font-size: 14px;
}
.geo-caret {
  display: inline-block;
  width: 1px;
  height: 16px;
  margin-left: 2px;
  background: var(--skin-brand);
}
.geo-hint {
  display: block;
  margin-top: 9px;
  font-size: 12px;
  line-height: 1.65;
  color: var(--skin-muted);
}
.geo-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 0;
}
.geo-chip {
  border: 1px solid var(--skin-brand-line);
  color: var(--skin-brand);
  border-radius: 6px;
  padding: 7px 14px;
  font-size: 13px;
  background: var(--skin-brand-soft);
}
.geo-seg-ctrl {
  display: flex;
  gap: 12px;
}
.geo-seg-ctrl span {
  padding: 10px 22px;
  border: 1px solid var(--skin-line);
  border-radius: 6px;
  font-size: 14px;
}
.geo-seg-ctrl .is-active {
  border-color: var(--skin-brand);
  color: var(--skin-brand);
  background: var(--skin-brand-soft);
}
/* 向导步骤 2 的「标题 + 添加关键句」一行：标题在左，链接推到右端。 */
.geo-wizard-panel__head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.geo-wizard-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  border-top: 1px solid var(--skin-line-soft);
  padding-top: 18px;
}
.geo-genlist {
  margin-top: 18px;
  opacity: 0;
  visibility: hidden;
}
.geo-genlist.is-on {
  opacity: 1;
  visibility: visible;
}
.geo-genrow {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 10px 12px;
  border-top: 1px solid var(--skin-line-soft);
}
.geo-genrow.is-pick {
  background: var(--skin-brand-soft);
}
.geo-kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  list-style: none;
  padding: 16px 0 12px;
  margin: 0;
  border-bottom: 1px solid var(--skin-line);
}
/* 4 格（content 页）。 */
.geo-kpis--flat {
  grid-template-columns: repeat(4, 1fr);
  padding: 4px 0 12px;
}
.geo-kpi-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0 16px;
  border-right: 1px solid var(--skin-line);
}
.geo-kpi-item:first-child {
  padding-left: 4px;
}
.geo-kpi-item:last-child {
  border-right: 0;
}
.geo-kpi-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--skin-muted);
}
.geo-kpi-label svg {
  width: 13px;
  height: 13px;
  color: var(--skin-faint);
  flex: none;
}
.geo-kpis strong {
  font-size: 20px;
  font-weight: 500;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  color: var(--skin-ink);
}
.geo-filter-bar {
  flex-wrap: wrap;
  margin: var(--geo-space-2) 0;
}
.geo-task-row {
  padding: var(--geo-space-2) var(--geo-space-3);
  border-top: 1px solid var(--skin-line);
  border-bottom: 1px solid var(--skin-line);
}
.geo-demo-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 12px;
  margin: 14px 0;
}
.geo-demo-table th {
  text-align: left;
  background: var(--skin-canvas);
  color: var(--skin-muted);
  font-weight: 500;
  padding: 10px 8px;
  border-bottom: 1px solid var(--skin-line);
}
.geo-demo-table td.geo-table-primary,
.geo-demo-table td.geo-table-secondary {
  display: table-cell;
}
.geo-demo-table td {
  padding: 12px 8px;
  line-height: 1.6;
  border-bottom: 1px solid var(--skin-line);
  overflow-wrap: anywhere;
}
.geo-demo-table .geo-tag {
  font-size: 11px;
  min-height: 20px;
  padding: 0 5px;
}
/* 各表列宽按真机 antd 的列定义配比，不平均分。 */
.geo-task-table {
  font-size: 11px;
}
.geo-task-table th,
.geo-task-table td {
  padding: 10px 6px;
}
.geo-task-table th:nth-child(1) {
  width: 18%;
}
.geo-task-table th:nth-child(2) {
  width: 19%;
}
.geo-task-table th:nth-child(3) {
  width: 8%;
}
.geo-task-table th:nth-child(4) {
  width: 8%;
}
.geo-task-table th:nth-child(5) {
  width: 9%;
}
.geo-task-table th:nth-child(6) {
  width: 7%;
}
.geo-task-table th:nth-child(7) {
  width: 8%;
}
.geo-task-table th:nth-child(8),
.geo-task-table th:nth-child(9) {
  width: 8%;
}
.geo-task-table th:nth-child(10) {
  width: 7%;
}
.geo-question-table th:nth-child(1) {
  width: 54%;
}
.geo-question-table th:nth-child(2) {
  width: 16%;
}
.geo-question-table th:nth-child(3) {
  width: 18%;
}
.geo-question-table th:nth-child(4) {
  width: 12%;
}
.geo-question-table td {
  vertical-align: middle;
}
.geo-question-table .geo-table-primary {
  font-weight: 400;
}
.geo-question-table tr[data-pick='on'],
.geo-question-table td[data-pick='on'] {
  background: var(--skin-brand-soft);
}
.geo-report-table th:nth-child(1) {
  width: 24%;
}
.geo-report-table th:nth-child(2) {
  width: 15%;
}
.geo-report-table th:nth-child(3) {
  width: 20%;
}
.geo-report-table th:nth-child(4) {
  width: 13%;
}
.geo-report-table th:nth-child(5) {
  width: 18%;
}
.geo-report-table th:nth-child(6) {
  width: 10%;
}
/* 真机的「检测」单元格是主行 + 副行；「范围」是一行文字。
   这张表 td 里的 .geo-table-secondary 会换行，所以要 middle 对齐。 */
.geo-report-table td {
  vertical-align: middle;
}
/* ── 放大镜聚焦与高光指示（极致简约，一目了然） ─────────────────── */
.geo-spotlight-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 3px 12px 3px 5px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--skin-brand);
  background: var(--skin-brand-soft);
  border: 1px solid var(--skin-brand-line);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  letter-spacing: -0.01em;
}

.geo-spotlight-pill__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1.5px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 500;
  color: var(--skin-brand);
  background: var(--skin-card);
  border: 1px solid var(--skin-brand-line);
}

.geo-spotlight-pill__text {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--skin-ink);
  letter-spacing: -0.01em;
}

.geo-spotlight-card {
  position: relative;
  border: 1px solid var(--skin-brand) !important;
  box-shadow:
    0 0 0 2px rgba(26, 86, 219, 0.12),
    0 12px 28px -4px rgba(15, 23, 42, 0.08);
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}

.geo-block--dimmed {
  opacity: 0.38;
  transition: opacity 0.4s ease;
}

.geo-row--spotlight {
  background: var(--skin-brand-soft) !important;
  box-shadow: inset 3px 0 0 var(--skin-brand);
}

/* ── 极简 AI 事实成稿工坊（替代原先堆砌的10列表格与重复版本行） ───── */
.geo-generator-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
  margin: 12px 0;
  background: #fff;
  border-radius: 10px;
  border: 1px solid var(--skin-line);
}

.geo-generator-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.geo-generator-header {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.geo-generator-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.geo-generator-task-name {
  font-size: 14.5px;
  font-weight: 500;
  color: var(--skin-ink);
}

.geo-generator-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: var(--skin-muted);
}

.geo-generator-meta .geo-divider {
  color: var(--skin-line);
}

/* ── 打字机流式文稿区 ─────────────────────────────────────────── */
.geo-generator-body {
  min-height: 60px;
  padding: 12px 14px;
  border-radius: 7px;
  background: var(--skin-canvas);
  border: 1px solid var(--skin-line-soft);
}

.geo-generator-prompt-wait {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.geo-generator-prompt-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--skin-ink);
}

.geo-generator-prompt-call {
  margin: 0;
  font-size: 11.5px;
  color: var(--skin-muted);
}

.geo-generator-article-stream {
  font-size: 13px;
  line-height: 1.65;
  color: var(--skin-ink);
}

.geo-stream-text {
  letter-spacing: -0.01em;
}

.geo-typing-cursor {
  display: inline-block;
  margin-left: 2px;
  color: var(--skin-brand);
  font-weight: 600;
  animation: geoCursorBlink 0.8s infinite;
}

@keyframes geoCursorBlink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.geo-generator-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 2px;
  padding-top: 10px;
  border-top: 1px solid var(--skin-line-soft);
}

.geo-article {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: var(--geo-space-3) var(--geo-space-4);
  border: 1px solid var(--skin-line);
  border-radius: 8px;
  margin: var(--geo-space-3) 0;
}
.geo-article.is-approved {
  border-color: var(--geo-saas-success-border);
}
.geo-enabled-dot {
  width: 7px;
  height: 7px;
  margin-top: 6px;
  flex: none;
  border-radius: 50%;
  background: var(--skin-success);
}
.geo-qa {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.geo-qa-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 400;
  color: var(--skin-muted);
  opacity: 0.55;
  transition: opacity 0.3s ease, color 0.3s ease;
}
.geo-qa-item.is-passed {
  opacity: 1;
  color: var(--skin-ink);
}
.geo-qa-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--skin-success-bg);
  border: 1px solid var(--skin-success-line);
  color: var(--skin-success);
  font-style: normal;
  flex: none;
}
.geo-qa-badge svg {
  width: 9px;
  height: 9px;
}
.geo-lock-panel {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border: 1px solid var(--skin-line);
  border-radius: 8px;
  background: var(--skin-subtle);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}
.geo-lock-panel.is-active {
  background: var(--skin-success-bg);
  border-color: var(--skin-success-line);
}
.geo-lock-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.geo-lock-mode {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  color: var(--skin-brand);
}
.geo-lock-flow {
  width: 100px;
  height: 32px;
  flex: none;
  color: var(--skin-brand);
}
.geo-lock-claims {
  display: grid;
  gap: 4px;
  flex: 1;
}
.geo-lock-claim {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--skin-muted);
  transition: color 0.3s ease;
}
.geo-lock-claim.is-linked {
  color: #047857;
  font-weight: 500;
}

/* ── 极简事实检索与状态栏 ───────────────────────────────────── */
.geo-facts-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  margin-bottom: 10px;
  background: var(--skin-canvas);
  border: 1px solid var(--skin-line-soft);
  border-radius: 8px;
}

.geo-facts-search {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--skin-ink);
}

.geo-facts-search__text {
  font-weight: 500;
  color: var(--skin-ink);
}

.geo-facts-search__placeholder {
  color: var(--skin-muted);
}

.geo-facts-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--skin-muted);
}

/* ── 极简外发渠道矩阵卡片 ─────────────────────────────────────── */
.geo-publish-matrix-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid var(--skin-line);
}

.geo-publish-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.geo-publish-channels {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.geo-channel-btn {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--skin-ink);
  background: var(--skin-canvas);
  border: 1px solid var(--skin-line-soft);
  transition: all 0.2s ease;
}

.geo-channel-btn.is-active {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #166534;
}

/* ── 幕 07 展开的闭环留痕卡片 ─────────────────────────────────── */
.geo-report-detail-card {
  padding: 10px 14px;
  background: #f8fafc;
  border: 1px solid #93c5fd;
  border-radius: 8px;
  box-shadow: 0 4px 12px -2px rgba(59, 130, 246, 0.12);
}
.geo-slim-row,
.geo-rec-row {
  min-height: 36px;
  padding: var(--geo-space-2) var(--geo-space-3);
  border-top: 1px solid var(--skin-line-soft);
  font-size: 12px;
}
.geo-run-row {
  min-height: 68px;
  padding: 16px;
  border: 1px solid var(--skin-line);
  border-radius: 8px;
}
.geo-signals {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  margin: 20px 0 14px;
  border: 1px solid var(--skin-line);
  border-radius: 8px;
}
.geo-signal {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 16px 12px;
  border-right: 1px solid var(--skin-line);
}
.geo-signal:last-child {
  border-right: 0;
}
.geo-signal-kind {
  font-size: 11px;
  color: var(--skin-muted);
}
.geo-note-line {
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--skin-canvas);
  color: var(--skin-muted);
  line-height: 1.7;
  font-size: 11px;
}
.geo-rec-row > :first-child {
  flex: 1;
}
.geo-compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: var(--geo-space-3);
}
.geo-compare-bad,
.geo-compare-good {
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--geo-saas-danger-border);
  background: var(--skin-danger-bg);
}
.geo-compare-good {
  border-color: var(--geo-saas-success-border);
  background: var(--skin-success-bg);
}
.geo-compare-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 8px;
}
.geo-compare-text {
  line-height: 1.8;
  font-size: 12px;
}
.geo-strike-wrap {
  position: relative;
}
.geo-strike {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--skin-danger);
  transform-origin: left;
}
.geo-compare-check {
  color: var(--skin-success);
}
/* ---- 八步轨道 ----
   8 列横排是上一版的做法：顺序感来自"一条线贯穿"，但每列只有 150px，
   「先定这个项目的范围：盯哪些模型、花多少钱、做多久」这种句子会被挤成三行碎片。
   Linear / Vercel 那种量级的站点不会把 8 个东西塞进一行 —— 宁可让它换行。

   现在改成 4×2：顺序由编号 + 轨道线一起守（读的时候仍然是左上到右下），
   每列宽度翻倍，句子能正常读。 */
.geo-flow {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  column-gap: 28px;
  row-gap: 40px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.geo-flow-step {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 0 18px 0 0;
}
.geo-flow-step:last-child {
  padding-right: 0;
}
/* 轨道线：每张卡顶部一段，最后一张收成短尾，
   让读者看出「到这里就结束了」而不是「后面还有但被裁掉了」。 */
.geo-flow-step__rail {
  position: relative;
  display: block;
  height: 1px;
  margin-bottom: 14px;
  background: #dbe3ee;
}
.geo-flow-step:last-child .geo-flow-step__rail {
  background: linear-gradient(
    90deg,
    #e5e5e5 0,
    #e5e5e5 14px,
    transparent 14px
  );
}
.geo-flow-step__rail::before {
  position: absolute;
  top: -3px;
  left: 0;
  width: 7px;
  height: 7px;
  content: '';
  background: #fff;
  border: 1.5px solid #94a3b8;
  border-radius: 50%;
}
/* 人工裁定的步骤：节点与标签加重，一眼看出流程在哪里停下等人。 */
.geo-flow-step.is-human .geo-flow-step__rail::before {
  background: #1d4ed8;
  border-color: #1d4ed8;
  box-shadow: 0 0 0 3px #1d4ed81f;
}
.geo-flow-step__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.geo-flow-step__index {
  font-family: var(--geo-saas-mono-font-family, ui-monospace, monospace);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: #94a3b8;
}
.geo-flow-step__gate {
  padding: 1px 6px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--muted);
  white-space: nowrap;
  background: var(--skin-subtle);
  border-radius: 4px;
}
.geo-flow-step.is-human .geo-flow-step__gate {
  color: var(--skin-brand);
  background: var(--skin-brand-soft);
}
.geo-flow-step__name {
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
  color: var(--skin-ink);
}
.geo-flow-step__desc {
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--muted);
}
.geo-flow-step__out {
  margin-top: 10px;
  padding-top: 9px;
  font-size: 11.5px;
  line-height: 1.5;
  color: #475569;
  border-top: 1px dashed #e2e8f0;
}
.geo-flow-step__out-label {
  display: block;
  margin-bottom: 2px;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #94a3b8;
}
.geo-flow-legend {
  display: flex;
  gap: 16px;
  align-items: center;
  padding-bottom: 4px;
}
.geo-flow-legend__item {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  font-size: 12px;
  color: var(--muted);
}
.geo-flow-legend__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.geo-flow-legend__dot--human {
  background: #1d4ed8;
}
.geo-flow-legend__dot--auto {
  background: #fff;
  border: 1.5px solid #94a3b8;
}
/* 每行最后一个（04 / 08）不留右边距，否则右边缘会比标题缩进一截 */
.geo-flow-step:nth-child(4n) {
  padding-right: 0;
}
@media (max-width: 1080px) {
  .geo-flow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 20px;
    row-gap: 32px;
  }
  .geo-flow-step:nth-child(4n) {
    padding-right: 18px;
  }
  .geo-flow-step:nth-child(2n) {
    padding-right: 0;
  }
}
@media (max-width: 640px) {
  .geo-flow {
    grid-template-columns: repeat(1, minmax(0, 1fr));
    row-gap: 22px;
  }
}
.geo-bento-hero {
  background: #101521;
}
.geo-scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(transparent 0 3px, #ffffff03 3px 4px);
}
.geo-term-card {
  overflow: hidden;
  border: 1px solid #303037;
  border-radius: 10px;
  background: #111114;
}
.geo-term-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 16px;
  border-bottom: 1px solid #29292f;
  font-size: 13px;
}
.geo-term-badge {
  padding: 3px 7px;
  border: 1px solid #45454e;
  border-radius: 4px;
  font: 9px monospace;
  color: #a1a1aa;
}
.geo-term-badge--pass {
  color: #6ee7b7;
  border-color: #065f46;
  background: #064e3b44;
}
.geo-term-badge--queued {
  color: #93c5fd;
  border-color: #1e3a8a;
}
.geo-term-rows {
  display: grid;
  gap: 16px;
  padding: 20px 16px;
  font-size: 12px;
}
.geo-term-rows > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.geo-home-faq summary {
  cursor: pointer;
  list-style: none;
}
.geo-home-faq summary::-webkit-details-marker {
  display: none;
}
.geo-home-faq details[open] summary svg {
  transform: rotate(45deg);
}
@media (max-width: 899px) {
  .geo-home-stage__presentation {
    height: auto !important;
  }
  .geo-home-stage__workbench {
    width: 100%;
    min-height: 0;
    display: block;
    transform: none !important;
  }
  .geo-home-stage__sidebar {
    display: none;
  }
  .geo-home-stage__topbar {
    height: 48px;
    padding: 0 16px;
  }
  .geo-home-stage__topbar-right {
    display: none;
  }
  .geo-home-stage__content {
    padding: 12px;
  }
  .geo-home-stage__pipeline {
    padding: 12px;
    align-items: flex-start;
  }
  .geo-home-stage__pipeline-label,
  .geo-home-stage__pipeline-next,
  .geo-home-stage__step-arrow {
    display: none;
  }
  .geo-home-stage__pipeline-steps {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
    gap: 9px;
  }
  /* 窄屏把取景框退化成流式容器：不再裁切，高度由内容决定。 */
  .geo-home-stage__frame,
  .geo-home-stage__scene,
  .geo-home-stage__slides {
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
  }
  /* 场景在窄屏不再承担镜头变换，恢复成普通文档流。 */
  .geo-home-stage__scene {
    position: relative;
    width: 100% !important;
    transform: none !important;
    will-change: auto;
  }
  .geo-home-stage__slides-inner { position: relative; }
  .geo-home-stage__frame { aspect-ratio: auto; }
  .geo-home-stage__slide {
    position: relative;
    display: none;
    padding: 0 12px 16px;
  }
  .geo-home-stage__slide.is-current {
    display: block;
  }
  .geo-home-stage__cursor {
    display: none;
  }
  .geo-cand,
  .geo-article {
    flex-wrap: wrap;
    padding: 14px 12px;
  }
  .geo-cand-side {
    flex-direction: row;
    align-items: center;
    width: 100%;
  }
  .geo-cand-main,
  .geo-article-main {
    flex-basis: 75%;
  }
  .geo-cand-head {
    gap: 8px;
  }
  .geo-search {
    min-width: 0;
    width: 100%;
  }
  .geo-cand-head .ml-auto {
    margin: 0;
  }
  .geo-file-row {
    gap: 8px;
  }
  .geo-file-main {
    flex-basis: 75%;
  }
  .geo-row-bar {
    flex-wrap: wrap;
  }
  .geo-row-bar > :last-child {
    display: none;
  }
  .geo-tab-bar {
    gap: 18px;
    min-height: 48px;
  }
  .geo-tab {
    font-size: 12px;
    min-height: 48px;
  }
  .geo-tab em {
    display: none;
  }
  .geo-run-row {
    flex-wrap: wrap;
  }
  .geo-run-main {
    flex-basis: 100%;
  }
  .geo-signals {
    grid-template-columns: 1fr 1fr;
  }
  .geo-signal {
    border-bottom: 1px solid var(--skin-line);
  }
  .geo-signal:nth-child(2n) {
    border-right: 0;
  }
  .geo-signal:last-child {
    grid-column: 1 / -1;
    border-bottom: 0;
  }
  .geo-signal-kind {
    font-size: 12px;
  }
  .geo-rec-row {
    flex-wrap: wrap;
  }
  .geo-rec-row > :first-child {
    flex-basis: 100%;
  }
  .geo-compare {
    grid-template-columns: 1fr;
  }
  .geo-compare-text {
    font-size: 13px;
  }
  .geo-lock-panel {
    flex-wrap: wrap;
  }
  .geo-lock-flow {
    width: 48px;
  }
  .geo-lock-claims {
    flex-basis: 100%;
    overflow-wrap: anywhere;
  }
  .geo-kpis li {
    padding: 0 8px;
  }
  .geo-kpis span {
    font-size: 10px;
  }
  .geo-kpis strong {
    font-size: 24px;
  }
  .geo-demo-table {
    font-size: 10px;
  }
  .geo-demo-table th,
  .geo-demo-table td {
    padding: 8px 4px;
  }
  .geo-task-table th:nth-child(n + 4):not(:last-child),
  .geo-task-table td:nth-child(n + 4):not(:last-child) {
    display: none;
  }
  .geo-task-table th:first-child,
  .geo-task-table th:nth-child(2) {
    width: 30%;
  }
  .geo-report-table th:nth-child(2),
  .geo-report-table td:nth-child(2),
  .geo-report-table th:nth-child(5),
  .geo-report-table td:nth-child(5) {
    display: none;
  }
  .geo-wizard {
    padding: 14px;
  }
  .geo-wizard-steps {
    gap: 8px;
  }
  .geo-wizard-step {
    gap: 5px;
    font-size: 11px;
  }
  .geo-wizard-step i {
    width: 22px;
    height: 22px;
  }
  .geo-wizard-panels {
    min-height: 172px;
  }
  .geo-seg-ctrl span {
    padding: 8px 14px;
  }
  .geo-genrow {
    flex-wrap: wrap;
  }
  .geo-genrow > :first-child {
    flex-basis: 100%;
  }
  .geo-slim-row {
    flex-wrap: wrap;
  }
  .geo-slim-row > :first-child {
    flex-basis: 100%;
  }
  .geo-drawer {
    display: none;
  }
  .geo-home-stage__slide[data-page='reports'] .geo-tab-bar {
    margin-bottom: 12px;
  }
  .geo-home-stage__slide[data-page='reports'] .geo-signals {
    margin: 12px 0;
  }
  .geo-home-stage__slide[data-page='reports'] .geo-signal {
    gap: 6px;
    padding: 12px;
  }
  .geo-home-stage__slide[data-page='reports'] .geo-cand-head {
    min-height: 32px;
    margin: 8px 0;
  }
  .geo-home-stage__slide[data-page='reports'] .geo-rec-row {
    min-height: 38px;
    padding: 10px 12px;
  }
  .geo-home-stage__slide[data-page='reports'] .geo-compare {
    margin-top: 12px;
  }
  .geo-home-stage__slide[data-page='reports'] .geo-compare-bad,
  .geo-home-stage__slide[data-page='reports'] .geo-compare-good {
    padding: 12px;
  }
  .geo-home-stage__slide[data-page='reports'] .geo-page-foot {
    padding: 8px 0;
    margin-top: 10px;
  }
  .geo-home-stage__slide[data-page='content'] .geo-tab-bar {
    margin-bottom: 12px;
  }
  .geo-home-stage__slide[data-page='content'] .geo-article {
    padding: 14px;
    margin: 12px 0;
  }
}

/* 移动端导航面板：靠右上角弹出 */
.geo-home-mobile-nav > div {
  top: calc(100% + 12px);
  right: 0;
  left: auto;
  z-index: 60;
  width: 212px;
  background: var(--skin-card);
  border: 1px solid var(--skin-line);
  border-radius: 10px;
}

/* 首页 CTA 与深色承载面：营销页不在 .geo-shell 内，需显式声明角色 */
.geo-home-page .geo-home-cta {
  color: var(--btn-ink) !important;
  background: var(--btn) !important;
  border: 1px solid var(--btn) !important;
}

.geo-home-page .geo-home-cta:hover {
  background: var(--btn-hover) !important;
}

/* 深色段里主按钮反相：纯黑段上放白按钮（黑按钮会隐进背景里看不见）。 */
.geo-home-finale .geo-home-cta {
  color: #0a0a0a !important;
  background: #ffffff !important;
  border-color: #ffffff !important;
}
.geo-home-finale .geo-home-cta:hover {
  background: rgb(255 255 255 / 88%) !important;
}

/* Ant Design 全局注入 `a { color: var(--ant-color-link) }`（偏色天蓝 #0284c7），元素选择器与工具类都压不过它，
 * 会把 logo、导航、幽灵按钮、深色面里的链接统统染成全局链接蓝。这里统一收口：
 * 外壳里的链接默认继承所在容器颜色（黑/灰/白系），只有「导航链接」用品牌蓝 #1d4ed8 ——
 * 与工作台同值，蓝=交互项（方案 A：蓝只落在可点击的导航上，正文与按钮都不沾蓝）。
 * `.geo-home-cta` 带 !important，主操作按钮不受影响。 */
.geo-home-page a {
  color: inherit;
}
.geo-home-page nav[aria-label='主导航'] a,
.geo-home-page .geo-home-mobile-nav a {
  color: var(--brand);
}
.geo-home-page nav[aria-label='主导航'] a:hover,
.geo-home-page .geo-home-mobile-nav a:hover {
  color: var(--brand-hover);
}

/* 继承的前提是"所在区块自己有颜色"。深色承载面原先没设，
   于是 `color: inherit` 一路继承到页面的 `--text-primary`（#0f172a）——
   深蓝底上写深色字，「再看一遍演示」这个按钮几乎看不见。
   给承载面本身定下颜色，inherit 才有一个对的终点。 */
.geo-home-finale,
.geo-home-page > footer {
  color: #fff;
}


/* The product is the hero: a quiet, stationary window and one motion owner inside. */
.geo-home-page > header {
  background: transparent;
  border: 0;
  backdrop-filter: none;
}
.geo-home-hero h1 {
  /* H1 现代排版：有思源宋体/宋体SC时呈现人文质感，Windows无思源宋体时平滑降级至现代无衬线栈，
     坚决杜绝 Windows 老旧中易宋体 (SimSun) 导致的像素毛刺和粗重发虚。 */
  font-family: "Noto Serif SC", "Source Han Serif SC", "Songti SC", STSong,
    Georgia, "Times New Roman", var(--font-sans);
  font-weight: var(--fw-medium);
  letter-spacing: -0.02em;
  color: var(--ink);
}
.geo-home-hero p { color: var(--muted); }
.geo-home-hero .animate-pulse { animation: none; }
.geo-home-film-section > div { max-width: 1340px; }
/* .geo-home-stage 的外框与皮肤变量统一声明在样式块前段（靠近各 data-skin 块），
   这里不再重复定义同名选择器 —— 重复定义会让后一处整体覆盖前一处，
   改配色时极易只改到一份，出现静态态与演播态不一致。 */
.geo-film-chrome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--geo-space-4);
  min-height: 40px;
  padding: var(--geo-space-2) var(--geo-space-4);
  border-bottom: 1px solid var(--skin-line);
  color: var(--skin-muted);
  font-size: var(--geo-text-xs);
}
.geo-film-chrome__dots { display: flex; gap: var(--geo-space-1); }
/* 产品窗口的 macOS 三色点（单色空心点读不出「这是截图」） */
.geo-film-chrome__dots i {
  width: 10px;
  height: 10px;
  border: 0;
  border-radius: 50%;
}
.geo-film-chrome__dots i:nth-child(1) { background: #ff5f57; }
.geo-film-chrome__dots i:nth-child(2) { background: #febc2e; }
.geo-film-chrome__dots i:nth-child(3) { background: #28c840; }
/* 演播台只有画面：没有进度条、没有图注、没有播放键、没有章节条。
   原先这五种控件的样式都挂在这里，已经随控件一起删掉。 */
/* 对照卡：左边"AI 自己编的"用暖灰压住，右边"接上资料之后"用品牌蓝提起来。
   两边底色都极淡 —— 这块的力量来自对照，不来自颜色。 */
.geo-contrast {
  background: #fff;
}
.geo-contrast--wrong {
  background: #fcfbfa;
  border-color: #eceef2;
}
.geo-contrast--right {
  background: #fcfcfd;
  border-color: #e4e7ec;
}
.geo-contrast__badge {
  flex-shrink: 0;
  padding: 2px 9px;
  font-size: 12px;
  border-radius: 999px;
}
.geo-contrast--wrong .geo-contrast__badge {
  background: #f4f4f5;
  color: #8b8f96;
}
.geo-contrast--right .geo-contrast__badge {
  background: #ececef;
  color: #0a0a0a;
}

/* 凭什么：细线便当网格（attio 手法）—— 和「三件事」的行式刻意不同。
   网格线靠 1px gap + 容器底色透出，不是卡片阴影；两条核心数字放大成主角。 */
.geo-why-grid {
  display: grid;
  gap: 1px;
  background: #eceef2;
  border: 1px solid #eceef2;
  border-radius: 16px;
  overflow: hidden;
  grid-template-columns: 1.25fr 1fr;
  grid-template-areas: 'map media' 'map ai' 'human human';
}
.geo-why {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 28px 30px;
  background: #fff;
}
.geo-why--map { grid-area: map; }
.geo-why--media { grid-area: media; }
.geo-why--ai { grid-area: ai; }
.geo-why--human { grid-area: human; }
.geo-why__icon { color: var(--ink); }
.geo-why__icon svg { display: block; width: 22px; height: 22px; }
.geo-why--map .geo-why__icon svg { width: 26px; height: 26px; }
.geo-why__title {
  font-size: 17px; font-weight: var(--fw-medium, 500);
  letter-spacing: -0.01em; line-height: 1.4; color: var(--ink);
}
.geo-why--map .geo-why__title { font-size: 21px; }
.geo-why__stat {
  font-size: 46px; font-weight: var(--fw-medium, 500); line-height: 1;
  letter-spacing: -0.03em; color: var(--ink); font-variant-numeric: tabular-nums;
}
.geo-why__unit { font-size: 13.5px; color: var(--ink-soft); }
.geo-why__desc { margin-top: 2px; font-size: 14px; line-height: 1.7; color: var(--muted); }
@media (max-width: 760px) {
  .geo-why-grid { grid-template-columns: 1fr; grid-template-areas: 'map' 'media' 'ai' 'human'; }
  .geo-why__stat { font-size: 40px; }
}

.geo-film-disclaimer {
  margin: 0; padding: var(--geo-space-3) var(--geo-space-4);
  text-align: center; font-size: var(--geo-text-xs); color: var(--text-secondary);
}
@media (max-width: 899px) {
  .geo-home-stage__body, .geo-home-stage__content, .geo-home-stage__workspace { display: block; }
  .geo-home-stage__workspace { padding: var(--geo-space-2); }
  .geo-film-chrome > span:last-child { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .geo-home-page {
    scroll-behavior: auto;
  }

  .geo-home-page *,
  .geo-home-page *::before,
  .geo-home-page *::after {
    animation: none !important;
    transition: none !important;
  }

  .geo-caret {
    display: none;
  }
}

/* ==================================================================
   2026-10 重构：五幕演播的转场载体 + "它是怎么做到的"四条规矩
   色值沿用附 B 的既定体系（品牌蓝 #1d4ed8 / 边框 #e2e8f0 / 文字 #0f172a·var(--muted)）
   ================================================================== */

/* 薄幕：收尾 / 回卷时把画面盖成纯白的那一层。
 * 收尾（46.0s）升到 1，onFilmComplete 在它最厚的一帧把时间轴推回开头、再淡出，
 * 于是循环的首尾接得上（见 buildTimeline 幕 08 与 onFilmComplete）。
 * 它同时是 z-index 最高的一层（40）：回卷那一帧要能盖住整个取景框。 */
.geo-film-veil {
  display: none;
  position: absolute;
  inset: 0;
  z-index: 40;
  pointer-events: none;
  background: transparent;
  opacity: 0;
}

/* 一轮结束的收尾折叠层：画面收干净之后盖一层纯色，再自动重播下一轮。
   刻意不放任何内容：折叠动作本身已经传达了"这一轮结束"。
   定位与薄幕同级；默认 opacity:0 且不拦截指针，只有时间轴末尾那 3 秒才浮现。 */
.geo-film-outro {
  position: absolute;
  inset: 0;
  z-index: 45;
  pointer-events: none;
  background: var(--canvas);
  opacity: 0;
}

/* 候选卡上的原文引用与行列定位 —— 可追溯最直观的一张脸。
 *
 * 前段原有一份同名规则（皮肤变量版），它只被后一份覆盖了字号与颜色，
 * padding / 左边框 / 底色一直是前一份在生效。合并成这一条：
 * 否则改配色时很容易只改到一半，而症状（少了一圈内边距）在真机上极难发现。 */
.geo-cand-quote {
  padding: 9px 12px;
  margin-top: 8px;
  border-left: 2px solid var(--skin-line);
  background: var(--skin-canvas);
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--muted);
}

.geo-cand-locator {
  margin-left: 4px;
  color: #94a3b8;
}

/* 人确认完，机器接手的按钮就在同一行 */
.geo-confirm-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  padding: 9px 14px;
  border: 1px solid var(--skin-success-line);
  border-radius: 8px;
  background: var(--skin-success-bg);
}

.geo-confirm-bar__text {
  font-size: 12px;
  font-weight: 500;
  color: var(--skin-success);
}

/* 「仅限内部，禁止公开」：产品里这一条是警告色的 */
.geo-tag--warning {
  border-color: var(--skin-warning-line);
  background: var(--skin-warning-bg);
  color: var(--skin-warning);
}

/* ── 媒体中心（幕 06）─────────────────────────────────────────────
   五维筛选条体现「知道该往哪儿投」，列表底部总数体现覆盖面。
   取值全部走 --skin-* —— 这一页在窗口里，必须和产品界面同源。 */
.geo-media-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 12px 14px;
  margin-bottom: 14px;
  background: var(--skin-subtle);
  border-radius: 8px;
}

.geo-filter-chip {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 5px 12px;
  font-size: 12px;
  color: var(--skin-ink);
  background: var(--skin-card);
  border: 1px solid var(--skin-line);
  border-radius: 999px;
}

.geo-filter-chip i {
  font-style: normal;
  font-size: 11px;
  color: var(--skin-faint);
}

.geo-filter-more {
  font-size: 12px;
  color: var(--skin-muted);
}

.geo-media-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.geo-media-item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 11px 14px;
  background: var(--skin-card);
  border: 1px solid var(--skin-line);
  border-radius: 8px;
}

.geo-media-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  font-weight: 500;
  color: var(--skin-ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 总数：幕 06 的签名镜头怼的就是这个数字。
   字号给足，特写时才立得住；用等宽数字，推近时不会左右抖。 */
.geo-media-count {
  display: inline-flex;
  gap: 8px;
  align-items: baseline;
}

.geo-media-count strong {
  font-size: 26px;
  font-weight: 500;
  color: var(--skin-brand);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.geo-media-count span {
  font-size: 12px;
  color: var(--skin-muted);
}

/* ── 人工确认痕迹（幕 07）：界面里最直接的「有人在看」的证据 ────── */
.geo-audit-row {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 14px;
  margin-top: 10px;
  font-size: 12px;
  background: var(--skin-subtle);
  border: 1px solid var(--skin-line);
  border-left: 2px solid var(--skin-brand);
  border-radius: 8px;
}

.geo-audit-actor {
  flex: none;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  background: var(--skin-brand);
  border-radius: 999px;
}

.geo-audit-text {
  flex: 1;
  min-width: 0;
  color: var(--skin-muted);
}

/* ── 真实文章工作台 (Act 03/04，还原真实编辑器与只读参考) ──────────── */
.geo-article-workspace {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--skin-card);
  overflow: hidden;
}

.geo-ws-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--skin-canvas);
  border-bottom: 1px solid var(--skin-line);
  flex-shrink: 0;
  font-size: 12px;
}

.geo-ws-bar__left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.geo-ws-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: var(--skin-muted);
  font-size: 12px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: color 0.15s ease;
}

.geo-ws-back:hover {
  color: var(--skin-ink);
}

.geo-ws-bar__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.geo-ws-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  background: var(--skin-subtle);
  color: var(--skin-muted);
  border: 1px solid var(--skin-line-soft);
}

.geo-ws-link-btn {
  font-size: 12px;
  color: var(--skin-muted);
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 4px;
}

.geo-ws-publish-btn {
  min-width: 68px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.geo-btn--success {
  background: var(--skin-brand) !important;
  border-color: var(--skin-brand-hover) !important;
  color: #ffffff !important;
}

.geo-ws-toast {
  position: absolute;
  top: 48px;
  right: 20px;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 500;
  color: var(--skin-success);
  background: var(--skin-card);
  border: 1px solid var(--skin-success-line);
  border-radius: 6px;
  box-shadow: 0 4px 16px -2px var(--skin-shadow-card);
}

.geo-fade-enter-active,
.geo-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.geo-fade-enter-from,
.geo-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.geo-ws-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.ws-editor-pane {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  background: var(--skin-card);
  border-right: 1px solid var(--skin-line);
}

.ws-editor-pane__scroll {
  flex: 1;
  overflow-y: auto;
  padding: 28px 36px;
}

.ws-doc {
  max-width: 720px;
  margin: 0 auto;
}

.ws-doc__head {
  padding-bottom: 16px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--skin-line-soft);
}

.ws-doc__title {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--skin-ink);
  letter-spacing: -0.01em;
}

.ws-doc__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11.5px;
  color: var(--skin-muted);
}

.ws-editor-surface {
  min-height: 240px;
}

.geo-ws-wait-prompt {
  padding: 24px;
  border: 1px dashed var(--skin-line);
  border-radius: 8px;
  background: var(--skin-subtle);
}

.geo-ws-prose {
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--skin-ink);
}

.geo-ws-h2 {
  margin: 18px 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--skin-ink);
}

.geo-ws-p {
  margin: 0;
  text-align: justify;
}

.geo-cite-badge {
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--skin-success);
  background: var(--skin-success-bg);
  border: 1px solid var(--skin-success-line);
  vertical-align: middle;
  transition: all 0.2s ease;
}

.geo-cite-badge.is-active {
  background: var(--skin-brand-soft);
  border-color: var(--skin-brand);
  color: var(--skin-brand);
}


.ws-wordcount {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 24px;
  background: var(--skin-canvas);
  border-top: 1px solid var(--skin-line);
  font-size: 12px;
  color: var(--skin-muted);
}

.ws-wordcount__label {
  color: var(--skin-faint);
}

.ws-wordcount__value {
  color: var(--skin-ink);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.ws-wordcount__target {
  color: var(--skin-faint);
}

.ws-wordcount__badge {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.ws-wordcount__badge.is-long {
  background: var(--skin-danger-bg);
  border: 1px solid var(--skin-danger-line);
  color: var(--skin-danger);
}

.ws-wordcount__badge.is-met {
  background: var(--skin-success-bg);
  border: 1px solid var(--skin-success-line);
  color: var(--skin-success);
}

.ws-context {
  display: flex;
  flex-direction: column;
  width: 280px;
  flex-shrink: 0;
  background: var(--skin-canvas);
  border-left: 1px solid var(--skin-line);
}

.ws-context__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--skin-line);
  font-size: 13px;
  color: var(--skin-ink);
}

.ws-context__head-side {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ws-context__hint {
  font-size: 11px;
  color: var(--skin-faint);
}

.ws-context__collapse {
  padding: 0;
  background: transparent;
  border: none;
  font-size: 14px;
  line-height: 1;
  color: var(--skin-muted);
  cursor: pointer;
}

.geo-ws-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: var(--skin-card);
  border-bottom: 1px solid var(--skin-line);
}

.geo-ws-tab {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11.5px;
  color: var(--skin-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.geo-ws-tab.is-active {
  background: var(--skin-subtle);
  color: var(--skin-brand);
  font-weight: 500;
}

.ws-context__scroll {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
}

.ws-meta {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
}

.ws-meta__row {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.ws-meta__row dt {
  margin: 0;
  font-size: 11px;
  color: var(--skin-muted);
}

.ws-meta__row dd {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--skin-ink);
}

/* ── 内容生产列表与事实关联样式 ──────────────────────────── */
.geo-content-list-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.geo-content-table th:nth-child(1) { width: 36%; }
.geo-content-table th:nth-child(2) { width: 22%; }
.geo-content-table th:nth-child(3) { width: 14%; }
.geo-content-table th:nth-child(4) { width: 14%; }
.geo-content-table th:nth-child(5) { width: 8%; }
.geo-content-table th:nth-child(6) { width: 6%; }

.geo-content-table tr.is-highlight {
  background: var(--skin-brand-soft);
}

.geo-ws-open-btn {
  font-size: 11px;
  height: 24px;
  padding: 0 10px;
}

.ws-facts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ws-facts-item {
  border: 1px solid var(--skin-line);
  background: var(--skin-card);
  border-radius: 6px;
  padding: 10px 12px;
  transition: border-color 0.2s, background-color 0.2s;
}

.ws-facts-item.is-linked {
  border-color: var(--skin-brand-line);
  background: var(--skin-subtle);
}

.ws-facts-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.ws-facts-item__num {
  font-size: 11px;
  font-weight: 600;
  color: var(--skin-brand);
}

.ws-facts-item__claim {
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--skin-ink);
  margin: 0 0 6px;
}

.ws-facts-item__src {
  font-size: 10.5px;
  color: var(--skin-muted);
}

/* ── GitHub Sponsors 风格指标条与背书卡片 ─────────────────── */
.geo-home-stat-strip {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(228, 231, 236, 0.9);
  transition: box-shadow 0.25s ease, border-color 0.25s ease;
}

.geo-home-stat-strip:hover {
  border-color: rgba(208, 213, 221, 1);
  box-shadow: 0 4px 16px -2px rgba(16, 24, 40, 0.05);
}

/* ── 客户背书：牌堆式案例卡组 ───────────────── */

/* 一次只呈现一张，其余收在下面。
   不做扇形错位：错位会把邻卡的正文露进可视区，
   五段文字挤在一起读不成句。切换只用交叉淡入淡出 + 微移位。 */
.geo-deck {
  position: relative;
  display: grid;
  grid-template-areas: 'stack';
  justify-items: center;

  /* 下方预留指示器位置 */
  padding: 10px 0 52px;
}

/* 牌堆厚度：两层略窄的纸边从卡片下方露出，
   让人知道这是一叠而不是一张。尺寸按卡片宽度反推。 */
.geo-deck__pile::before,
.geo-deck__pile::after {
  position: absolute;
  top: 10px;
  bottom: 31px;
  left: 50%;
  width: min(100%, 716px);
  content: '';
  pointer-events: none;
  background: #fbfcfd;
  border: 1px solid #e8edf3;
  border-radius: 16px;
  transform: translateX(-50%);
}

.geo-deck__pile::after {
  top: 20px;
  bottom: 20px;
  width: min(100%, 708px);
  background: #f5f8fb;
}

.geo-deck__card {
  position: relative;
  grid-area: stack;
  width: 100%;
  max-width: 720px;
  padding: 30px 34px;
  overflow: hidden;
  pointer-events: none;
  color: #27272a;
  background: linear-gradient(180deg, #fafbfd 0%, #fff 100%);
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow:
    0 1px 2px rgb(15 23 42 / 4%),
    0 16px 34px -22px rgb(15 23 42 / 24%);
  opacity: 0;
  transform: translateY(16px) scale(0.975);
  transform-origin: center top;
  transition:
    opacity 0.5s ease,
    transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.32s ease;
  will-change: opacity, transform;
}

.geo-deck__card.is-active {
  z-index: 1;
  pointer-events: auto;
  cursor: pointer;
  opacity: 1;
  transform: none;
}

/* 按下去的那一瞬给一点压缩，让“点到了”有物理反馈 */
.geo-deck__card.is-active:active {
  transform: scale(0.995) translateY(-1px);
}

/* 悬停反馈：卡片轻抬 + 阴影加深。
   此时轮播已暂停（见 .geo-deck.is-paused 与 JS），所以“它停了”是可见的。 */
.geo-deck.is-paused .geo-deck__card.is-active {
  box-shadow:
    0 2px 4px rgb(15 23 42 / 5%),
    0 26px 52px -24px rgb(15 23 42 / 28%);
  transform: translateY(-3px);
}

.geo-deck__mark {
  position: absolute;
  top: -8px;
  left: 18px;
  pointer-events: none;
  font-family: Georgia, serif;
  font-size: 96px;
  line-height: 1;
  color: #e2e8f0;
  opacity: 0.6;
  user-select: none;
}

.geo-deck__quote {
  font-size: 16px;
  line-height: 1.72;
  letter-spacing: -0.01em;
}

.geo-deck__foot {
  display: flex;
  gap: 14px;
  align-items: center;
  border-top: 1px solid rgb(226 232 240 / 70%);
  padding-top: 22px;
  margin-top: 22px;
}

.geo-deck__avatar {
  display: flex;
  flex: none;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  color: #f4f4f5;
  background: #18181b;
  border-radius: 9999px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 12%);
}

.geo-deck__avatar svg {
  width: 18px;
  height: 18px;
}

.geo-deck__name {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #18181b;
}

.geo-deck__badge {
  display: inline-flex;
  flex: none;
  gap: 4px;
  align-items: center;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  color: #3f3f46;
  background: #f4f4f5;
  border: 1px solid #e4e4e7;
  border-radius: 9999px;
}

.geo-deck__note {
  font-size: 12.5px;
  color: #71717a;
  margin-top: 2px;
}

.geo-deck__dots {
  position: absolute;
  bottom: 22px;
  left: 50%;
  z-index: 3;
  display: flex;
  gap: 7px;
  transform: translateX(-50%);
}

.geo-deck__dot {
  position: relative;
  width: 30px;
  height: 3px;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  background: #e4e8ee;
  border: 0;
  border-radius: 9999px;
  transition:
    width 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    background 0.2s ease;
}

.geo-deck__dot:hover {
  background: #cbd5e1;
}

/* 选中态靠「更长 + 更深」双重表达。
   只靠进度填充会有一个空窗：刚切过去时进度接近 0，看过去和未选中没差别。 */
.geo-deck__dot.is-active {
  width: 48px;
  background: #a1a1aa;
}

/* 进度填充叠在选中底色之上：走满一次 = 到下一张。
   时长由 --deck-duration 动态设定（首张 2400ms，后续 3800ms），与 JS 调度器完全同步。 */
.geo-deck__dot-fill {
  position: absolute;
  background: #18181b;
  transform-origin: left center;
  animation: geo-deck-progress var(--deck-duration, 3800ms) linear forwards;
  inset: 0;
}

/* 光标进入卡组：进度条原地停住，“暂停”一眼可见 */
.geo-deck.is-paused .geo-deck__dot-fill {
  animation-play-state: paused;
}

@keyframes geo-deck-progress {
  from {
    transform: scaleX(0);
  }

  to {
    transform: scaleX(1);
  }
}

@media (min-width: 640px) {
  .geo-deck__quote {
    font-size: 17.5px;
    line-height: 1.68;
  }
}

/* 窄屏：卡片变短，内边距收一点，指示器紧跟其后 */
@media (max-width: 767px) {
  .geo-deck {
    padding: 6px 0 46px;
  }

  .geo-deck__card {
    padding: 24px 22px;
  }

  .geo-deck__dots {
    bottom: 18px;
  }

  .geo-deck__dot {
    width: 22px;
  }

  .geo-deck__dot.is-active {
    width: 38px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .geo-deck__card {
    transition: none;
  }

  /* 不轮播（JS 侧也不启动），进度条直接置满 */
  .geo-deck__dot-fill {
    transform: scaleX(1);
    animation: none;
  }

  .geo-deck.is-paused .geo-deck__card.is-active {
    transform: none;
  }
}

/* ── 信源地图 200+ 大类行业胶囊标签 ───────────────────────── */
.geo-industry-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  color: #475569;
  letter-spacing: -0.01em;
  transition: all 0.2s ease;
}

.geo-industry-pill:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #1e293b;
}

.geo-industry-pill--more {
  background: #f1f5f9;
  border-color: #e2e8f0;
  color: #64748b;
  font-weight: 600;
}
</style>
