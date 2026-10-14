<script lang="ts" setup>
import { gsap } from 'gsap';
import { onBeforeUnmount, onMounted, ref } from 'vue';

import { GEO_ENUM_LABELS, GEO_STATUS_LABELS } from '#/api/geo/contracts';
import { GEO_NAVIGATION } from '#/layouts/geo-menu';
import { GEO_FACT_TYPE_LABELS } from '#/views/geo/display';

const FACT = GEO_STATUS_LABELS.FactRevision;
const BOUNDARY = GEO_ENUM_LABELS.FactPublicBoundary;
const EVIDENCE = GEO_ENUM_LABELS.EvidenceStatus;
const LINK_VERIFY = GEO_ENUM_LABELS.UrlVerifyStatus;

/** 演播只翻一个业务状态位：这条候选是否已确认。不发请求、不改数据、不写持久存储。 */
const admitted = ref(false);
/** 第一行是否被点开（行高亮；抽屉的位移由 GSAP 直接推）。 */
const opened = ref(false);

/**
 * 两条候选取 `60-fixtures/fixtures.json` 的 factRevisions/302 与 /301，
 * 来源名取 evidenceSources/201。303 的「识别率 98.7%」是首页禁用的效果率值，不用；
 * 301 的 validUntil 在 fixture 里是 null，页面也不展示，所以不编造「长期有效」。
 */
const pendingFact = {
  claim: 'X9 Pro 已通过 2026 年第三方安全检测',
  factType: GEO_FACT_TYPE_LABELS.security_test,
  revisionNo: 1,
  sourceName: '2026 产品手册.pdf',
  subject: 'X9 Pro',
  validUntil: '2027-07-31',
};

const confirmedFact = {
  claim: 'S900 支持 3D 结构光人脸识别',
  factType: GEO_FACT_TYPE_LABELS.capability,
  revisionNo: 2,
  sourceName: '2026 产品手册.pdf',
  subject: 'S900',
};

const candidateCount = 2;

/**
 * 图标栏取侧边栏装配的唯一来源 `GEO_NAVIGATION`（由 scrm-specs 路由清单生成），
 * 连菜单名一起避免手抄漂移；上游改了 path 就会少一项，测试会红。
 */
const RAIL_PATHS = [
  '/geo/projects',
  '/geo/facts',
  '/geo/content',
  '/geo/reports',
];
const NAV_ITEMS = GEO_NAVIGATION.flatMap((group) => group.items);
const railItems = RAIL_PATHS.map((path) => {
  const item = NAV_ITEMS.find((nav) => nav.path === path);
  return item
    ? { icon: item.icon, label: item.label, path: item.path }
    : undefined;
}).filter(
  (item): item is { icon: string; label: string; path: string } => Boolean(item),
);

const rootRef = ref<HTMLElement | null>(null);
const viewportRef = ref<HTMLElement | null>(null);
const stageRef = ref<HTMLElement | null>(null);
const cursorRef = ref<HTMLElement | null>(null);
const rowActionRef = ref<HTMLElement | null>(null);
const drawerRef = ref<HTMLElement | null>(null);
const drawerBtnRef = ref<HTMLElement | null>(null);

let motion: ReturnType<typeof gsap.matchMedia> | undefined;
let timeline: ReturnType<typeof gsap.timeline> | undefined;
let observer: IntersectionObserver | undefined;
let resizeTimer: number | undefined;

type Frame = { scale: number; x: number; y: number };
type Point = { x: number; y: number };

/**
 * 镜头补间代理对象而不是直接补间元素：光标在**视窗层**（不受镜头缩放，尺寸恒定），
 * 每帧要按当前镜头把舞台本地坐标投影成视窗坐标，才能既自由飞行又吸附跟随。
 */
const cam: Frame = { scale: 1, x: 0, y: 0 };
const lock: { target: null | Point } = { target: null };

/** 特写倍率：1.55x 是抽屉里的字段读起来刚好的倍率。 */
const FOCUS_SCALE = 1.55;

function applyCamera() {
  const stage = stageRef.value;
  if (!stage) return;
  gsap.set(stage, { scale: cam.scale, x: cam.x, y: cam.y, transformOrigin: '0 0' });
  if (lock.target && cursorRef.value) {
    gsap.set(cursorRef.value, {
      x: lock.target.x * cam.scale + cam.x,
      y: lock.target.y * cam.scale + cam.y,
    });
  }
}

function centerInStage(el: HTMLElement, stageBox: DOMRect): Point {
  const box = el.getBoundingClientRect();
  return {
    x: box.left - stageBox.left + box.width / 2,
    y: box.top - stageBox.top + box.height / 2,
  };
}

/** 镜头位移夹在「画面不越过舞台边界」的区间内（scale ≥ 1 时区间有效）。 */
function clampCamera(
  x: number,
  y: number,
  scale: number,
  viewBox: DOMRect,
  stageBox: DOMRect,
): Frame {
  return {
    scale,
    x: gsap.utils.clamp(viewBox.width - scale * stageBox.width, 0, x),
    y: gsap.utils.clamp(viewBox.height - scale * stageBox.height, 0, y),
  };
}

function buildTimeline() {
  const cursor = cursorRef.value;
  const drawer = drawerRef.value;
  const drawerBtn = drawerBtnRef.value;
  const rowAction = rowActionRef.value;
  const stage = stageRef.value;
  const viewport = viewportRef.value;
  // 演播靠量出来的取景坐标工作，任一节点缺席就整条不建，避免把 NaN 交给补间。
  if (
    !cursor ||
    !drawer ||
    !drawerBtn ||
    !rowAction ||
    !stage ||
    !viewport
  ) {
    return undefined;
  }

  // 量算前把镜头归零，并按「抽屉已展开」量：CSS 里它默认藏在右侧，
  // 直接量会得到一个舞台外的坐标，特写与光标落点都会算到画面外面去。
  // 抽屉位移全程用 px（GSAP 会把 CSS 的 translateX(100%) 解析成 x 像素值，
  // 再混用 xPercent 会与原值叠加，落点差一个抽屉宽）。
  gsap.set(stage, { clearProps: 'transform' });
  gsap.set(drawer, { x: 0, xPercent: 0 });
  const viewBox = viewport.getBoundingClientRect();
  const stageBox = stage.getBoundingClientRect();
  const drawerBox = drawer.getBoundingClientRect();
  if (!stageBox.width || !stageBox.height || !viewBox.width || !drawerBox.width) {
    return undefined;
  }

  const panorama: Frame = { scale: 1, x: 0, y: 0 };
  const action = centerInStage(rowAction, stageBox);
  const confirm = centerInStage(drawerBtn, stageBox);
  /**
   * 特写：横向锁抽屉中心（整块面板留在画面内），纵向锁「确认」按钮上方一点——
   * 1.55x 的画面装不下满高抽屉，取按钮所在的下半段。
   * 舞台本地坐标 × scale + 位移 = 视窗坐标，位移直接反解，再把镜头夹在舞台内。
   */
  const drawerCenter = centerInStage(drawer, stageBox);
  const focus = clampCamera(
    viewBox.width / 2 - FOCUS_SCALE * drawerCenter.x,
    viewBox.height / 2 - FOCUS_SCALE * (confirm.y - 30),
    FOCUS_SCALE,
    viewBox,
    stageBox,
  );
  const focusOn = (target: Point): Point => ({
    x: target.x * focus.scale + focus.x,
    y: target.y * focus.scale + focus.y,
  });
  const confirmOnScreen = focusOn(confirm);
  /** 推近结束后光标的回位点：按钮右上方，且必须仍在全画面内。 */
  const entry: Point = {
    x: Math.min(confirmOnScreen.x + 56, viewBox.width - 24),
    y: Math.max(confirmOnScreen.y - 44, 24),
  };
  /** 待命位在视窗右外侧：开场那一下是「划入」而不是凭空出现。 */
  const home: Point = { x: viewBox.width * 1.06, y: viewBox.height * 0.78 };

  cam.scale = panorama.scale;
  cam.x = panorama.x;
  cam.y = panorama.y;
  lock.target = null;
  applyCamera();
  gsap.set(cursor, {
    x: home.x,
    xPercent: -22,
    y: home.y,
    yPercent: -12,
    scale: 1,
    opacity: 0,
    transformOrigin: '22% 12%',
  });
  gsap.set(drawer, { x: drawerBox.width, xPercent: 0 });
  admitted.value = false;
  opened.value = false;

  const tl = gsap.timeline({
    repeat: -1,
    repeatDelay: 0.5,
    defaults: { ease: 'power3.out' },
  });

  /** [0.00-0.80] 全景巡视：光标自视窗外划入，0.5s 内吸附到第一条候选。 */
  tl.call(() => {
    lock.target = null;
  }, undefined, 0)
    .to(cursor, { duration: 0.12, opacity: 1 }, 0.04)
    .to(cursor, { duration: 0.5, ease: 'power3.out', x: action.x }, 0.05)
    .to(cursor, { duration: 0.5, ease: 'power2.inOut', y: action.y }, 0.05);

  /** [0.80-1.80] 点击行 → 镜头 1.55x 强力推近，证据抽屉随推进滑入。 */
  tl.to(cursor, { duration: 0.1, scale: 0.85, yoyo: true, repeat: 1, ease: 'power2.out' }, 0.8)
    .to(rowAction, { duration: 0.1, scale: 0.96, yoyo: true, repeat: 1, ease: 'power2.out' }, 0.8)
    .call(() => {
      opened.value = true;
    }, undefined, 0.86)
    .call(() => {
      lock.target = null;
    }, undefined, 0.9)
    .to(cam, {
      ...focus,
      duration: 0.9,
      ease: 'expo.out',
      onUpdate: applyCamera,
    }, 0.9)
    .to(drawer, { duration: 0.75, ease: 'power3.out', x: 0 }, 1)
    // 推近途中被摄行会滑出画面，光标跟着出去会很跳；按剪辑惯例在过渡里淡出
    .to(cursor, { duration: 0.18, ease: 'power2.in', opacity: 0 }, 0.92);

  /** [1.80-2.60] 特写下的干脆点击：光标回到画面内滑向【确认】，状态翻成已确认。 */
  tl.set(cursor, { x: entry.x, y: entry.y }, 1.6)
    .to(cursor, { duration: 0.14, opacity: 1 }, 1.62)
    .to(cursor, { duration: 0.4, ease: 'power3.out', x: confirmOnScreen.x }, 1.7)
    .to(cursor, { duration: 0.4, ease: 'power2.inOut', y: confirmOnScreen.y }, 1.7)
    .call(() => {
      lock.target = confirm;
    }, undefined, 2.1)
    .to(cursor, { duration: 0.1, scale: 0.85, yoyo: true, repeat: 1, ease: 'power2.out' }, 2.16)
    .to(drawerBtn, { duration: 0.12, scale: 0.94, yoyo: true, repeat: 1, ease: 'power2.out' }, 2.16)
    .call(() => {
      admitted.value = true;
    }, undefined, 2.24);

  /** [2.60-3.80] 特写定格：看清已确认状态与公开边界、证据口径。 */
  tl.to({}, { duration: 1.2 }, 2.6);

  /** [3.80-4.80] 镜头拉回全景，抽屉收回，光标淡出回位；第一行保持已确认。 */
  tl.call(() => {
    lock.target = null;
  }, undefined, 3.8)
    .to(cam, {
      ...panorama,
      duration: 0.9,
      ease: 'power3.inOut',
      onUpdate: applyCamera,
    }, 3.8)
    .to(drawer, {
      duration: 0.6,
      ease: 'power2.in',
      x: drawerBox.width,
      xPercent: 0,
    }, 3.9)
    .to(cursor, { duration: 0.8, x: home.x }, 3.85)
    .to(cursor, { duration: 0.8, ease: 'power2.inOut', y: home.y }, 3.85)
    .to(cursor, { duration: 0.4, ease: 'power2.in', opacity: 0 }, 4.2);

  /** [4.80-6.00] 全景定格闭环成果，随后平滑交还待确认态，无缝接下一次。 */
  tl.call(() => {
    opened.value = false;
  }, undefined, 6)
    .call(() => {
      admitted.value = false;
    }, undefined, 6.3);

  return tl;
}

function startLoop() {
  timeline?.kill();
  timeline = buildTimeline();
  observer?.disconnect();
  if (timeline && viewportRef.value) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) timeline?.play();
          else timeline?.pause();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(viewportRef.value);
  }
}

function onResize() {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(startLoop, 250);
}

function teardown() {
  window.removeEventListener('resize', onResize);
  window.clearTimeout(resizeTimer);
  observer?.disconnect();
  timeline?.kill();
}

onMounted(() => {
  motion = gsap.matchMedia();
  // matchMedia 只在「至少一条条件命中」时才执行回调：只登记 no-preference 的话，
  // 减动效用户根本不会进来，终态就永远停在待办。两条都要登记。
  motion.add(
    {
      animate: '(prefers-reduced-motion: no-preference)',
      reduce: '(prefers-reduced-motion: reduce)',
    },
    ({ conditions }) => {
      if (conditions?.reduce) {
        // 减弱动效：不加镜头、不建 timeline，舞台保持 1.0x 全景，直接呈现已确认终态。
        admitted.value = true;
        return;
      }
      if (!conditions?.animate) return;
      // 由 JS 打开运镜形态：只有要动效时视窗才按固定比例裁切舞台。
      rootRef.value?.classList.add('is-live');
      startLoop();
      window.addEventListener('resize', onResize);
      return teardown;
    },
  );
});

onBeforeUnmount(() => {
  motion?.revert();
  teardown();
});
</script>

<template>
  <section
    ref="rootRef"
    class="geo-home-micro"
    aria-label="候选准入的微缩工作台演播"
  >
    <div ref="viewportRef" class="geo-home-micro__viewport">
      <div ref="stageRef" class="geo-home-micro__stage">
        <header class="geo-home-micro__chrome">
          <span class="geo-home-micro__brand">GEO</span>
          <span class="geo-home-micro__crumb">工作台</span>
          <span class="geo-home-micro__project">橙科智能 · 智能锁 GEO 攻势</span>
          <span class="geo-home-micro__note">交互演示 · 非实时数据</span>
        </header>

        <div class="geo-home-micro__body">
          <nav class="geo-home-micro__rail" aria-hidden="true">
            <span class="geo-home-micro__rail-mark"></span>
            <span
              v-for="item in railItems"
              :key="item.path"
              class="geo-home-micro__rail-item"
              :class="{ 'is-active': item.path === '/geo/facts' }"
              :title="item.label"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path :d="item.icon" />
              </svg>
            </span>
          </nav>

          <div class="geo-home-micro__main">
            <div class="geo-home-micro__tabs">
              <span class="geo-home-micro__tab is-active">资料来源</span>
              <span class="geo-home-micro__tab">内容要素</span>
            </div>
            <div class="geo-home-micro__toolbar">
              <span class="geo-home-micro__counts">
                共 {{ candidateCount }} 条 · 待确认
                {{ admitted ? 0 : 1 }} · 已确认 {{ admitted ? 2 : 1 }}
              </span>
              <span class="geo-home-micro__search">搜索事实、证据、资料名称</span>
              <span class="geo-home-micro__select">全部状态</span>
            </div>

            <ul class="geo-home-micro__rows">
              <li
                class="geo-home-micro__row"
                :class="{
                  'is-opened': opened,
                  'is-admitted': admitted,
                }"
              >
                <span class="geo-home-micro__check" aria-hidden="true"></span>
                <div class="geo-home-micro__row-main">
                  <div class="geo-home-micro__row-title">
                    <span class="geo-home-micro__subject">
                      {{ pendingFact.subject }} · {{ pendingFact.factType }}
                    </span>
                    <span
                      class="geo-status-tag"
                      :class="
                        admitted
                          ? 'geo-status-tag--success'
                          : 'geo-status-tag--processing'
                      "
                    >
                      {{ admitted ? FACT.confirmed : FACT.pending_confirm }}
                    </span>
                  </div>
                  <p class="geo-home-micro__claim">{{ pendingFact.claim }}</p>
                  <div class="geo-home-micro__meta">
                    <span>来源 {{ pendingFact.sourceName }}</span>
                    <span>第 {{ pendingFact.revisionNo }} 版</span>
                    <span>{{ BOUNDARY.public }}</span>
                  </div>
                </div>
                <div class="geo-home-micro__row-side">
                  <!-- 演播道具：真实页面这里是 a-button，此处用 span 不进可聚焦序列 -->
                  <span ref="rowActionRef" class="geo-home-micro__ghost-btn">
                    查看证据与详情
                  </span>
                </div>
              </li>

              <li class="geo-home-micro__row">
                <span class="geo-home-micro__check" aria-hidden="true"></span>
                <div class="geo-home-micro__row-main">
                  <div class="geo-home-micro__row-title">
                    <span class="geo-home-micro__subject">
                      {{ confirmedFact.subject }} · {{ confirmedFact.factType }}
                    </span>
                    <span class="geo-status-tag geo-status-tag--success">
                      {{ FACT.confirmed }}
                    </span>
                  </div>
                  <p class="geo-home-micro__claim">{{ confirmedFact.claim }}</p>
                  <div class="geo-home-micro__meta">
                    <span>来源 {{ confirmedFact.sourceName }}</span>
                    <span>第 {{ confirmedFact.revisionNo }} 版</span>
                    <span>{{ BOUNDARY.public }}</span>
                  </div>
                </div>
                <div class="geo-home-micro__row-side">
                  <span class="geo-home-micro__link-btn">撤回</span>
                </div>
              </li>
            </ul>

            <p class="geo-home-micro__foot-tip">
              内容要素只能从已确认事实提炼，待确认候选不会进入生产。
            </p>
          </div>

          <aside ref="drawerRef" class="geo-home-micro__drawer">
            <header class="geo-home-micro__drawer-head">
              <span class="geo-home-micro__drawer-title">证据与详情</span>
              <span class="geo-home-micro__close" aria-hidden="true">✕</span>
            </header>
            <div class="geo-home-micro__drawer-body">
              <p class="geo-home-micro__drawer-claim">{{ pendingFact.claim }}</p>
              <dl class="geo-home-micro__fields">
                <div class="geo-home-micro__field">
                  <dt>来源</dt>
                  <dd>{{ pendingFact.sourceName }} · 已解析</dd>
                </div>
                <div class="geo-home-micro__field">
                  <dt>类型</dt>
                  <dd>{{ pendingFact.factType }} · 第 {{ pendingFact.revisionNo }} 版</dd>
                </div>
                <div class="geo-home-micro__field">
                  <dt>有效期</dt>
                  <dd>至 {{ pendingFact.validUntil }}</dd>
                </div>
                <div class="geo-home-micro__field">
                  <dt>公开边界</dt>
                  <dd>{{ BOUNDARY.public }}</dd>
                </div>
                <div class="geo-home-micro__field">
                  <dt>证据</dt>
                  <dd>
                    {{ EVIDENCE.complete }} · 链接{{ LINK_VERIFY.pending_verify }}
                  </dd>
                </div>
              </dl>
            </div>
            <footer class="geo-home-micro__drawer-foot">
              <span
                ref="drawerBtnRef"
                class="geo-home-micro__btn"
                :class="{ 'is-done': admitted }"
              >
                {{ admitted ? '已确认' : '确认' }}
              </span>
              <span class="geo-home-micro__btn geo-home-micro__btn--danger">驳回</span>
            </footer>
          </aside>
        </div>
      </div>

      <!-- 光标在视窗层而不是舞台层：不受镜头缩放，尺寸恒定，投影即落点 -->
      <div ref="cursorRef" class="geo-home-micro__cursor" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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

    <p class="geo-home-micro__caption">
      示例资料 · 虚拟光标代表人工动作：展开「查看证据与详情」后点击「确认」，
      候选才从待确认变为已确认；未确认的事实不会进入内容生产。
    </p>
  </section>
</template>

<style scoped>
.geo-home-micro {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: var(--geo-saas-radius-lg);
  background: var(--bg-card);
  box-shadow: var(--geo-saas-shadow-card);
}

/* 摄像机视窗：固定比例 + 裁切，圆角按规范封顶 12px */
.geo-home-micro__viewport {
  position: relative;
  overflow: hidden;
  background: var(--geo-saas-preview-bg);
}

.geo-home-micro.is-live .geo-home-micro__viewport {
  aspect-ratio: 16 / 10;
}

.geo-home-micro__viewport::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  box-shadow: inset 0 0 40px
    color-mix(in srgb, var(--geo-saas-preview-text) 10%, transparent);
}

/* 被摄舞台：1:1 复刻工作台骨架，镜头只改它的 transform */
.geo-home-micro__stage {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 250px;
  flex-direction: column;
  background: var(--geo-saas-preview-surface);
  color: var(--geo-saas-preview-text);
  will-change: transform;
}

.geo-home-micro.is-live .geo-home-micro__stage {
  height: 100%;
  min-height: 0;
}

.geo-home-micro__chrome {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding-inline: 10px;
  border-bottom: 1px solid var(--geo-saas-preview-border);
  background: color-mix(
    in srgb,
    var(--geo-saas-preview-surface) 82%,
    var(--geo-saas-preview-bg)
  );
}

.geo-home-micro__brand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: var(--geo-saas-radius-sm);
  background: var(--geo-saas-brand);
  color: var(--geo-saas-brand-foreground);
  font-size: 10px;
  font-weight: 700;
}

.geo-home-micro__crumb {
  flex: none;
  color: var(--geo-saas-preview-muted);
  font-size: 11px;
}

.geo-home-micro__project {
  min-width: 0;
  color: var(--geo-saas-preview-text);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.geo-home-micro__note {
  flex: none;
  margin-left: auto;
  color: var(--geo-saas-preview-muted);
  font-size: 11px;
  white-space: nowrap;
}

.geo-home-micro__body {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
}

/* 微缩侧边栏：图标直接用 GEO_NAVIGATION 里的 path 数据 */
.geo-home-micro__rail {
  display: flex;
  flex: 0 0 56px;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  padding-block: 12px;
  border-right: 1px solid var(--geo-saas-preview-border);
  background: color-mix(
    in srgb,
    var(--geo-saas-preview-surface) 70%,
    var(--geo-saas-preview-bg)
  );
}

.geo-home-micro__rail-mark {
  width: 22px;
  height: 22px;
  border-radius: var(--geo-saas-radius-md);
  background: var(--geo-saas-brand);
  opacity: 0.86;
}

.geo-home-micro__rail-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 26px;
  border-radius: var(--geo-saas-radius-md);
  color: var(--geo-saas-preview-muted);
}

.geo-home-micro__rail-item.is-active {
  background: var(--geo-saas-brand-soft);
  color: var(--geo-saas-brand);
}

.geo-home-micro__rail-item svg {
  width: 15px;
  height: 15px;
}

.geo-home-micro__main {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
}

.geo-home-micro__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.geo-home-micro__counts {
  flex: none;
  color: var(--geo-saas-preview-muted);
  font-size: 11px;
  white-space: nowrap;
}

.geo-home-micro__search {
  flex: 1 1 auto;
  min-width: 0;
  padding: 4px 8px;
  border: 1px solid var(--geo-saas-preview-border);
  border-radius: var(--geo-saas-radius-md);
  background: var(--geo-saas-preview-surface);
  color: var(--geo-saas-preview-muted);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.geo-home-micro__select {
  flex: none;
  padding: 4px 8px;
  border: 1px solid var(--geo-saas-preview-border);
  border-radius: var(--geo-saas-radius-md);
  color: var(--geo-saas-preview-muted);
  font-size: 11px;
  white-space: nowrap;
}

/* 真实页面这一层是 a-tabs：资料来源 / 内容要素 */
.geo-home-micro__tabs {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--geo-saas-preview-border);
}

.geo-home-micro__tab {
  position: relative;
  padding-bottom: 4px;
  color: var(--geo-saas-preview-muted);
  font-size: 11px;
  white-space: nowrap;
}

.geo-home-micro__tab.is-active {
  color: var(--geo-saas-brand);
  font-weight: 650;
}

.geo-home-micro__tab.is-active::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  border-radius: var(--geo-saas-radius-xs);
  background: var(--geo-saas-brand);
}

.geo-home-micro__rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.geo-home-micro__row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--geo-saas-preview-border);
  border-radius: var(--geo-saas-radius-md);
  background: var(--geo-saas-preview-surface);
  transition:
    background-color 240ms ease,
    border-color 240ms ease;
}

/* 展开态与准入态都只用色底表达，位移一律留给 GSAP */
.geo-home-micro__row.is-opened {
  border-color: var(--geo-saas-brand-border);
  background: color-mix(
    in srgb,
    var(--geo-saas-brand) 6%,
    var(--geo-saas-preview-surface)
  );
}

.geo-home-micro__row.is-admitted {
  background: color-mix(
    in srgb,
    var(--geo-saas-success) 6%,
    var(--geo-saas-preview-surface)
  );
}

.geo-home-micro__check {
  flex: none;
  width: 12px;
  height: 12px;
  margin-top: 3px;
  border: 1px solid var(--geo-saas-preview-border);
  border-radius: var(--geo-saas-radius-xs);
}

.geo-home-micro__row-main {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.geo-home-micro__row-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.geo-home-micro__subject {
  min-width: 0;
  color: var(--geo-saas-preview-text);
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.geo-home-micro__claim {
  margin: 0;
  color: var(--geo-saas-preview-text);
  font-size: 11px;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.geo-home-micro__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  color: var(--geo-saas-preview-muted);
  font-size: 10px;
}

.geo-home-micro__meta span {
  white-space: nowrap;
}

.geo-home-micro__row-side {
  display: flex;
  flex: none;
  align-items: center;
  gap: 6px;
}

.geo-home-micro__ghost-btn {
  padding: 3px 7px;
  border: 1px solid var(--geo-saas-preview-border);
  border-radius: var(--geo-saas-radius-md);
  color: var(--geo-saas-preview-muted);
  font-size: 10px;
  white-space: nowrap;
}

.geo-home-micro__link-btn {
  padding: 3px 7px;
  color: var(--geo-saas-brand);
  font-size: 10px;
  white-space: nowrap;
}

.geo-home-micro__foot-tip {
  margin: auto 0 0;
  color: var(--geo-saas-preview-muted);
  font-size: 10px;
  line-height: 1.5;
}

/* 证据抽屉：默认藏在主区右侧，随镜头推进滑入 */
.geo-home-micro__drawer {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
  display: flex;
  width: min(46%, 260px);
  height: 100%;
  flex-direction: column;
  background: var(--geo-saas-preview-surface);
  border-left: 1px solid var(--geo-saas-preview-border);
  box-shadow: var(--geo-saas-shadow-card);
  transform: translateX(100%);
}

.geo-home-micro__drawer-head {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--geo-saas-preview-border);
}

.geo-home-micro__drawer-title {
  color: var(--geo-saas-preview-text);
  font-size: 12px;
  font-weight: 650;
}

.geo-home-micro__close {
  color: var(--geo-saas-preview-muted);
  font-size: 11px;
}

.geo-home-micro__drawer-body {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
}

.geo-home-micro__drawer-claim {
  margin: 0;
  padding: 6px 8px;
  border-left: 2px solid var(--geo-saas-brand);
  background: var(--geo-saas-brand-soft);
  color: var(--geo-saas-preview-text);
  font-size: 11px;
  line-height: 1.5;
}

.geo-home-micro__fields {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
}

.geo-home-micro__field {
  display: flex;
  gap: 6px;
  align-items: baseline;
  font-size: 10px;
}

.geo-home-micro__field dt {
  flex: none;
  color: var(--geo-saas-preview-muted);
}

.geo-home-micro__field dd {
  min-width: 0;
  margin: 0;
  color: var(--geo-saas-preview-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.geo-home-micro__drawer-foot {
  display: flex;
  flex: none;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-top: 1px solid var(--geo-saas-preview-border);
}

.geo-home-micro__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 10px;
  border: 1px solid var(--geo-saas-brand);
  border-radius: var(--geo-saas-radius-md);
  background: var(--geo-saas-brand);
  color: var(--geo-saas-brand-foreground);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  transition:
    color 240ms ease,
    background-color 240ms ease,
    border-color 240ms ease;
}

.geo-home-micro__btn.is-done {
  border-color: var(--geo-saas-success-border);
  background: var(--geo-saas-success-soft);
  color: var(--geo-saas-success);
}

.geo-home-micro__btn--danger {
  border-color: var(--geo-saas-danger-border);
  background: var(--geo-saas-danger-soft);
  color: var(--geo-saas-danger);
}

.geo-home-micro__cursor {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 4;
  width: 20px;
  height: 20px;
  color: var(--geo-saas-preview-text);
  pointer-events: none;
  opacity: 0;
  filter: drop-shadow(0 2px 5px
      color-mix(in srgb, var(--geo-saas-preview-text) 40%, transparent));
}

.geo-home-micro__cursor svg {
  display: block;
  width: 100%;
  height: 100%;
}

.geo-home-micro__caption {
  margin: 0;
  padding: 12px 20px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
  border-top: 1px solid var(--border-default);
}

@media (max-width: 800px) {
  .geo-home-micro__rail {
    flex-basis: 48px;
  }
  .geo-home-micro__main {
    padding: 8px;
  }
  .geo-home-micro__drawer {
    width: min(58%, 240px);
  }
}

@media (max-width: 560px) {
  .geo-home-micro__caption {
    padding: 12px 16px;
  }
  .geo-home-micro__meta,
  .geo-home-micro__field {
    font-size: 9px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .geo-home-micro__row,
  .geo-home-micro__btn {
    transition: none;
  }
  /* 静态全景终态：抽屉是过渡中的面板，不参与无动效呈现 */
  .geo-home-micro__drawer,
  .geo-home-micro__cursor {
    display: none;
  }
}
</style>
