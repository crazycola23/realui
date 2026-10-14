<script lang="ts" setup>
import type { FilmTarget } from './film-config';

import { onBeforeUnmount, onMounted, ref } from 'vue';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import {
  BEAT_STARTS,
  BEATS,
  beatSpan,
  beatTime,
  CAMERA_MOVES,
  CONFIRM_PRESS,
  FILM_TARGETS,
  FOCUS_SCALE,
  PIN_DISTANCE,
  STATUS_FLIP,
} from './film-config';

interface FilmStep {
  number: string;
  title: string;
  description: string;
}

defineProps<{ steps: FilmStep[] }>();

gsap.registerPlugin(ScrollTrigger);

/** 页眉为 sticky，高 72px；pin 起点要避开它。 */
const HEADER_OFFSET = 72;
/** 只在桌面且允许动效时 pin；其余情况保持普通文档流。 */
const LIVE_CONDITION =
  '(min-width: 1024px) and (prefers-reduced-motion: no-preference)';

const sectionRef = ref<HTMLElement | null>(null);
const pinRef = ref<HTMLElement | null>(null);
const viewportRef = ref<HTMLElement | null>(null);
const stageRef = ref<HTMLElement | null>(null);

/** 镜头状态：普通对象，由时间线补间；每次渲染把它写回舞台。 */
const cam = { scale: 1, x: 0, y: 0 };

let motion: ReturnType<typeof gsap.matchMedia> | undefined;

function applyCamera() {
  const stage = stageRef.value;
  if (!stage) return;
  stage.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})`;
}

/** 元素中心在舞台坐标系里的位置：沿 offsetParent 累加版式偏移，不受舞台 transform 影响。 */
function layoutCenter(el: HTMLElement, root: HTMLElement) {
  let x = el.offsetLeft + el.offsetWidth / 2;
  let y = el.offsetTop + el.offsetHeight / 2;
  let parent = el.offsetParent as HTMLElement | null;
  while (parent && parent !== root) {
    x += parent.offsetLeft;
    y += parent.offsetTop;
    parent = parent.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

/**
 * 按 film-config 的编排数据建时间线。任一镜头目标、画面或步骤缺席就整条不建
 * （返回 undefined，调用方保持静态分段）：宁可退回静态，也不留下半截镜头运动。
 */
function buildTimeline(
  root: HTMLElement,
  stage: HTMLElement,
  viewport: HTMLElement,
) {
  const frames = [...stage.querySelectorAll<HTMLElement>('[data-film-frame]')];
  const rail = [...root.querySelectorAll<HTMLElement>('[data-film-rail]')];
  if (frames.length !== BEATS.length || rail.length !== BEATS.length) {
    return undefined;
  }

  const targets = new Map<FilmTarget, HTMLElement>();
  for (const name of FILM_TARGETS) {
    const el = stage.querySelector<HTMLElement>(`[data-film-target="${name}"]`);
    if (!el) return undefined;
    targets.set(name, el);
  }
  const target = (name: FilmTarget) => targets.get(name) as HTMLElement;

  /** 把某个元素推到画面中心的镜头位置，并夹在舞台边界内（舞台与视窗同尺寸）。 */
  const focusOn = (el: HTMLElement, scale: number) => {
    const c = layoutCenter(el, stage);
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    return {
      x: gsap.utils.clamp(vw - scale * vw, 0, vw / 2 - scale * c.x),
      y: gsap.utils.clamp(vh - scale * vh, 0, vh / 2 - scale * c.y),
    };
  };

  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: 'power2.inOut' },
  });
  tl.eventCallback('onUpdate', applyCamera);

  // 切段：只显示当前段的画面、高亮对应步骤，镜头回到全景。
  // 每次都传新对象：tl.set 会就地改写传入的 vars，共享对象会带着旧时间线的引用。
  BEAT_STARTS.forEach((at, index) => {
    frames.forEach((frame, k) =>
      tl.set(frame, { autoAlpha: k === index ? 1 : 0 }, at),
    );
    rail.forEach((item, k) =>
      tl.set(
        item,
        { className: k === index ? '+=is-active' : '-=is-active' },
        at,
      ),
    );
    tl.set(cam, { scale: 1, x: 0, y: 0 }, at);
  });

  // 镜头运动。
  for (const move of CAMERA_MOVES) {
    const at = beatTime(move.beat, move.at);
    const duration = beatSpan(move.beat, move.span);
    if (move.target === 'panorama') {
      tl.to(cam, { scale: 1, x: 0, y: 0, duration, ease: 'power3.inOut' }, at);
      continue;
    }
    const el = target(move.target);
    tl.to(
      cam,
      {
        scale: FOCUS_SCALE,
        x: () => focusOn(el, FOCUS_SCALE).x,
        y: () => focusOn(el, FOCUS_SCALE).y,
        duration,
      },
      at,
    );
  }

  // 点击「确认」：按压并翻转状态（滚回去时两者都会还原）。
  const status = target(STATUS_FLIP.target);
  tl.set(status, { className: '-=is-confirmed' }, 0);
  tl.to(
    target(CONFIRM_PRESS.target),
    {
      scale: 0.94,
      duration: beatSpan(CONFIRM_PRESS.beat, CONFIRM_PRESS.span),
      yoyo: true,
      repeat: 1,
      ease: 'power2.out',
    },
    beatTime(CONFIRM_PRESS.beat, CONFIRM_PRESS.at),
  );
  tl.set(
    status,
    { className: '+=is-confirmed' },
    beatTime(STATUS_FLIP.beat, STATUS_FLIP.at),
  );

  // 固定总长，使 scrub 的映射恰为 PIN_DISTANCE。
  tl.to({}, { duration: 0 }, PIN_DISTANCE);
  return tl;
}

onMounted(() => {
  const section = sectionRef.value;
  const pin = pinRef.value;
  const viewport = viewportRef.value;
  const stage = stageRef.value;
  const root = section?.closest<HTMLElement>('.geo-home-root');
  if (!section || !pin || !viewport || !stage || !root) return;

  motion = gsap.matchMedia();
  motion.add(
    LIVE_CONDITION,
    () => {
      const tl = buildTimeline(section, stage, viewport);
      if (!tl) return;
      // 先进入 live 版式再建触发器：pin 与镜头测量都以固定 480px 舞台为准。
      section.classList.add('is-live');
      const trigger = ScrollTrigger.create({
        trigger: section,
        scroller: root,
        start: `top top+=${HEADER_OFFSET}`,
        end: `+=${PIN_DISTANCE}`,
        pin,
        pinSpacing: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
        animation: tl,
      });
      return () => {
        // kill(true) 还原 pin 与内联样式、删除 spacer；否则窄屏下会残留 fixed 定位。
        trigger.kill(true);
        // tl.set 写入的 autoAlpha（opacity + visibility）既不被 kill 还原、实测 revert 也清不掉
        // （autoAlpha 是 GSAP 特殊属性，revert 不完整回滚），必须显式移除内联属性。
        // 否则窄屏静态布局只剩第一屏可见，其余四屏是空白。
        // 复现：宽屏 pin 跑过后，把窗口缩到 1024px 以下。
        tl.revert();
        for (const frame of stage.querySelectorAll<HTMLElement>(
          '[data-film-frame]',
        )) {
          frame.style.removeProperty('opacity');
          frame.style.removeProperty('visibility');
        }
        stage.style.transform = '';
        section.classList.remove('is-live');
      };
    },
    section,
  );
});

onBeforeUnmount(() => motion?.revert());
</script>

<template>
  <section
    ref="sectionRef"
    class="geo-home-film"
    aria-label="运营流程的滚动演示"
  >
    <div class="geo-home-film__container">
      <div ref="pinRef" class="geo-home-film__pin">
        <div class="geo-home-film__window" aria-hidden="true">
          <header class="geo-home-film__chrome">
            <span class="geo-home-film__brand">GEO</span>
            <span class="geo-home-film__crumb">工作台</span>
            <span class="geo-home-film__project">橙科智能 · 智能锁 GEO 攻势</span>
          </header>
          <div class="geo-home-film__body">
            <ol class="geo-home-film__rail">
              <li
                v-for="step in steps"
                :key="step.number"
                class="geo-home-film__rail-item"
                data-film-rail
              >
                {{ step.number }}
              </li>
            </ol>
            <div ref="viewportRef" class="geo-home-film__viewport">
              <div ref="stageRef" class="geo-home-film__stage">
                <!-- 01 明确问题 -->
                <article class="geo-home-film__frame" data-film-frame>
                  <header class="geo-home-film__beat">
                    <span class="geo-home-film__beat-number">{{
                      steps[0]?.number
                    }}</span>
                    <strong>{{ steps[0]?.title }}</strong>
                  </header>
                  <div class="geo-home-film__panel">
                    <p class="geo-home-film__label">核心主题</p>
                    <div class="geo-home-film__input">智能锁选购</div>
                    <ul
                      class="geo-home-film__list"
                      data-film-target="question-list"
                    >
                      <li class="is-checked">小户型适合什么样的智能锁？</li>
                      <li>智能锁和普通门锁有什么区别？</li>
                      <li>租房可以安装智能锁吗？</li>
                    </ul>
                  </div>
                </article>

                <!-- 02 确认事实 -->
                <article class="geo-home-film__frame" data-film-frame>
                  <header class="geo-home-film__beat">
                    <span class="geo-home-film__beat-number">{{
                      steps[1]?.number
                    }}</span>
                    <strong>{{ steps[1]?.title }}</strong>
                  </header>
                  <div class="geo-home-film__panel">
                    <div
                      class="geo-home-film__source"
                      data-film-target="source-row"
                    >
                      <span>2026 产品手册.pdf</span>
                      <span class="geo-status-tag geo-status-tag--success">已解析</span>
                    </div>
                    <div class="geo-home-film__split">
                      <div class="geo-home-film__candidate">
                        <span>X9 Pro · 安全验证</span>
                        <span
                          class="geo-home-film__status"
                          data-film-target="status"
                        >
                          <span
                            class="geo-status-tag geo-status-tag--processing geo-home-film__status-pending"
                            >待确认</span>
                          <span
                            class="geo-status-tag geo-status-tag--success geo-home-film__status-done"
                            >已确认</span>
                        </span>
                      </div>
                      <aside
                        class="geo-home-film__drawer"
                        data-film-target="drawer"
                      >
                        <dl>
                          <div>
                            <dt>类型</dt>
                            <dd>安全验证 · 第 1 版</dd>
                          </div>
                          <div>
                            <dt>有效期</dt>
                            <dd>至 2027-07-31</dd>
                          </div>
                          <div>
                            <dt>公开边界</dt>
                            <dd>可公开</dd>
                          </div>
                          <div>
                            <dt>证据</dt>
                            <dd>证据完整 · 链接待验证</dd>
                          </div>
                        </dl>
                        <footer class="geo-home-film__drawer-foot">
                          <span
                            class="geo-home-film__btn geo-home-film__btn--primary"
                            data-film-target="confirm"
                            >确认</span>
                          <span
                            class="geo-home-film__btn geo-home-film__btn--danger"
                            >驳回</span>
                        </footer>
                      </aside>
                    </div>
                  </div>
                </article>

                <!-- 03 生产内容 -->
                <article class="geo-home-film__frame" data-film-frame>
                  <header class="geo-home-film__beat">
                    <span class="geo-home-film__beat-number">{{
                      steps[2]?.number
                    }}</span>
                    <strong>{{ steps[2]?.title }}</strong>
                  </header>
                  <div class="geo-home-film__panel">
                    <div class="geo-home-film__chain">
                      <div
                        class="geo-home-film__node"
                        data-film-target="node-fact"
                      >
                        <span class="geo-home-film__kind">事实</span>
                        <strong>S900 · 产品能力</strong>
                        <span>S900 支持 3D 结构光人脸识别</span>
                        <span class="geo-status-tag geo-status-tag--success">已确认</span>
                      </div>
                      <span class="geo-home-film__arrow">→</span>
                      <div
                        class="geo-home-film__node"
                        data-film-target="node-content"
                      >
                        <span class="geo-home-film__kind">内容要素</span>
                        <strong>全部启用</strong>
                      </div>
                      <span class="geo-home-film__arrow">→</span>
                      <div
                        class="geo-home-film__node"
                        data-film-target="node-article"
                      >
                        <span class="geo-home-film__kind">文章</span>
                        <strong>品牌专题稿</strong>
                        <span class="geo-status-tag geo-status-tag--success">已生成</span>
                        <span class="geo-status-tag geo-status-tag--success">已启用</span>
                      </div>
                    </div>
                  </div>
                </article>

                <!-- 04 管理发布（静止段） -->
                <article class="geo-home-film__frame" data-film-frame>
                  <header class="geo-home-film__beat">
                    <span class="geo-home-film__beat-number">{{
                      steps[3]?.number
                    }}</span>
                    <strong>{{ steps[3]?.title }}</strong>
                  </header>
                  <div class="geo-home-film__panel">
                    <div class="geo-home-film__table">
                      <div class="geo-home-film__table-head">
                        <span>文章</span><span>发布渠道</span><span>状态</span><span>发布时间</span>
                      </div>
                      <div class="geo-home-film__table-row">
                        <span>智能锁选购指南</span><span>媒体直发</span>
                        <span class="geo-status-tag geo-status-tag--success">已发布</span>
                        <span>2026-10-08 10:30</span>
                      </div>
                    </div>
                  </div>
                </article>

                <!-- 05 巡检复盘 -->
                <article class="geo-home-film__frame" data-film-frame>
                  <header class="geo-home-film__beat">
                    <span class="geo-home-film__beat-number">{{
                      steps[4]?.number
                    }}</span>
                    <strong>{{ steps[4]?.title }}</strong>
                  </header>
                  <div class="geo-home-film__panel">
                    <div class="geo-home-film__table">
                      <div class="geo-home-film__table-head">
                        <span>检测</span><span>检测时间</span><span>范围</span><span>处理状态</span>
                      </div>
                      <div
                        class="geo-home-film__table-row"
                        data-film-target="run-row"
                      >
                        <span>智能锁选购 · 检测运行</span><span>2026-10-08 09:14</span><span>10 个问题</span>
                        <span class="geo-status-tag geo-status-tag--success">可查看</span>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
        <p class="geo-home-film__caption">示例数据 · 滚动演示，非实时数据</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.geo-home-film {
  padding-block: 24px 64px;
  margin: 0;
  background: var(--bg-app);
}

.geo-home-film__container {
  width: min(1200px, calc(100% - 48px));
  margin-inline: auto;
}

.geo-home-film__pin {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.geo-home-film__window {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--geo-saas-radius-lg);
  box-shadow: var(--geo-saas-shadow-card);
}

.geo-home-film__chrome {
  display: flex;
  gap: 12px;
  align-items: center;
  min-height: 40px;
  padding: 0 16px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-subtle);
  border-bottom: 1px solid var(--border-default);
}

.geo-home-film__brand {
  font-weight: 600;
  color: var(--text-primary);
}

.geo-home-film__project {
  margin-left: auto;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.geo-home-film__body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.geo-home-film__rail {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 8px;
  width: 52px;
  padding: 16px 0;
  margin: 0;
  font-size: 11px;
  color: var(--text-tertiary);
  text-align: center;
  list-style: none;
  background: var(--bg-subtle);
  border-right: 1px solid var(--border-default);
}

.geo-home-film__rail-item {
  padding: 6px 0;
}

.geo-home-film__rail-item.is-active {
  font-weight: 600;
  color: var(--accent-primary);
  background: var(--accent-light);
}

.geo-home-film__viewport {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.geo-home-film__stage {
  position: relative;
  transform-origin: 0 0;
}

.geo-home-film__frame {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px;
  background: var(--bg-card);
}

.geo-home-film__beat {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 14px;
  color: var(--text-primary);
}

.geo-home-film__beat-number {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-primary);
}

.geo-home-film__panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.geo-home-film__label {
  margin: 0;
  font-size: 12px;
  color: var(--text-tertiary);
}

.geo-home-film__input {
  padding: 10px 12px;
  font-size: 13px;
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  border-radius: 8px;
}

.geo-home-film__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  list-style: none;
}

.geo-home-film__list li {
  position: relative;
  padding: 10px 12px 10px 34px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
}

.geo-home-film__list li::before {
  position: absolute;
  top: 50%;
  left: 12px;
  width: 12px;
  height: 12px;
  margin-top: -6px;
  content: '';
  border: 1px solid var(--border-hover);
  border-radius: 3px;
}

.geo-home-film__list li.is-checked::before {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

.geo-home-film__source,
.geo-home-film__candidate {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  font-size: 13px;
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  border-radius: 8px;
}

.geo-home-film__split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 16px;
  align-items: start;
}

/* 静态分段直接呈现「已确认」终态（与首页演示的减弱动效口径一致）；live 时才从待确认起演。 */
.geo-home-film__status-pending {
  display: none;
}

.geo-home-film__status-done {
  display: inline-flex;
}

.geo-home-film.is-live .geo-home-film__status-pending {
  display: inline-flex;
}

.geo-home-film.is-live .geo-home-film__status-done {
  display: none;
}

.geo-home-film.is-live
  .geo-home-film__status.is-confirmed
  .geo-home-film__status-pending {
  display: none;
}

.geo-home-film.is-live
  .geo-home-film__status.is-confirmed
  .geo-home-film__status-done {
  display: inline-flex;
}

.geo-home-film__drawer {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  font-size: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  box-shadow: var(--geo-saas-shadow-card);
}

.geo-home-film__drawer dl {
  display: grid;
  gap: 8px;
  margin: 0;
}

.geo-home-film__drawer dl > div {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 8px;
}

.geo-home-film__drawer dt {
  color: var(--text-tertiary);
}

.geo-home-film__drawer dd {
  margin: 0;
  color: var(--text-primary);
}

.geo-home-film__drawer-foot {
  display: flex;
  gap: 8px;
}

.geo-home-film__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  height: 30px;
  padding: 0 12px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: 6px;
}

.geo-home-film__btn--primary {
  color: var(--text-inverse);
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

.geo-home-film__btn--danger {
  color: var(--status-error-text);
}

.geo-home-film__chain {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.geo-home-film__node {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 14px;
  font-size: 13px;
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
  border-radius: 8px;
}

.geo-home-film__node strong {
  font-weight: 600;
  color: var(--text-primary);
}

.geo-home-film__kind {
  font-size: 11px;
  color: var(--text-tertiary);
}

.geo-home-film__arrow {
  align-self: center;
  color: var(--text-tertiary);
}

.geo-home-film__table {
  overflow: hidden;
  font-size: 13px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
}

.geo-home-film__table-head,
.geo-home-film__table-row {
  display: grid;
  grid-template-columns: 2fr 1.2fr 0.9fr 1.4fr;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
}

.geo-home-film__table-head {
  font-size: 12px;
  color: var(--text-tertiary);
  background: var(--bg-subtle);
}

.geo-home-film__table-row {
  color: var(--text-secondary);
  border-top: 1px solid var(--border-default);
}

.geo-home-film__table-row > span:first-child {
  color: var(--text-primary);
}

.geo-home-film__caption {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-tertiary);
}

/* 静态分段：未 pin 时（窄屏、减弱动效）五段按文档流纵向排列，不另行设计布局。 */
.geo-home-film:not(.is-live) .geo-home-film__rail,
.geo-home-film:not(.is-live) .geo-home-film__drawer-foot {
  display: none;
}

.geo-home-film:not(.is-live) .geo-home-film__frame {
  position: relative;
  min-height: 320px;
  border-top: 1px solid var(--border-default);
}

.geo-home-film:not(.is-live) .geo-home-film__frame:first-child {
  border-top: 0;
}

/* 桌面 pin：固定 480px 舞台，五段叠放，只显示当前段。 */
.geo-home-film.is-live .geo-home-film__pin {
  height: 480px;
}

.geo-home-film.is-live .geo-home-film__window {
  flex: 1;
  min-height: 0;
}

.geo-home-film.is-live .geo-home-film__stage {
  position: absolute;
  inset: 0;
  will-change: transform;
}

.geo-home-film.is-live .geo-home-film__frame {
  position: absolute;
  inset: 0;
  visibility: hidden;
}

.geo-home-film.is-live .geo-home-film__frame:first-child {
  visibility: visible;
}
</style>
