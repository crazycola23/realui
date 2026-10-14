// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { mount } from '@vue/test-utils';
import { gsap } from 'gsap';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import { GEO_NAVIGATION } from '#/layouts/geo-menu';

import MicroWorkbenchTour from './MicroWorkbenchTour.vue';

const maybeHere = (import.meta as unknown as { dirname?: string }).dirname;
if (!maybeHere) {
  throw new Error('自检失败：无法定位测试文件所在目录');
}
const here: string = maybeHere;

const VIEWPORT_W = 569;
const VIEWPORT_H = 356;
const DRAWER_W = 260;
/** 特写倍率，与组件里的 FOCUS_SCALE 同一个数。 */
const FOCUS_SCALE = 1.55;

/** [left, top, width, height]：happy-dom 不排版，取景坐标只能由测试给出。 */
type Rect = [number, number, number, number];

function layoutFor(el: Element): Rect | undefined {
  const text = el.textContent ?? '';
  if (el.classList.contains('geo-home-micro__viewport')) {
    return [0, 0, VIEWPORT_W, VIEWPORT_H];
  }
  if (el.classList.contains('geo-home-micro__stage')) {
    return [0, 0, VIEWPORT_W, VIEWPORT_H];
  }
  if (el.classList.contains('geo-home-micro__drawer')) {
    return [VIEWPORT_W - DRAWER_W, 34, DRAWER_W, VIEWPORT_H - 34];
  }
  if (el.classList.contains('geo-home-micro__ghost-btn')) {
    return [VIEWPORT_W - DRAWER_W - 120, 150, 84, 22];
  }
  if (el.classList.contains('geo-home-micro__btn') && text.includes('确认')) {
    return [VIEWPORT_W - DRAWER_W + 10, VIEWPORT_H - 46, 52, 24];
  }
  return undefined;
}

function stubLayout() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function rect(this: Element) {
      const [left, top, width, height] = layoutFor(this) ?? [0, 0, 10, 10];
      return {
        bottom: top + height,
        height,
        left,
        right: left + width,
        top,
        width,
        x: left,
        y: top,
        toJSON: () => ({}),
      } as DOMRect;
    },
  );
}

type Recorded = {
  method: string;
  position: number | string | undefined;
  target: unknown;
  vars: Record<string, unknown>;
};

/** 链式 timeline 替身：记下每次补间的目标、参数与时间位，供节拍断言。 */
function recordingTimeline(recorded: Recorded[]) {
  const chain: Record<string, unknown> = {};
  for (const method of ['addLabel', 'to', 'fromTo', 'call', 'set']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      const varsIndex = method === 'fromTo' ? 2 : 1;
      recorded.push({
        method,
        position: args[method === 'call' ? 2 : varsIndex + 1] as
          | number
          | string
          | undefined,
        target: args[0],
        vars: (args[varsIndex] ?? {}) as Record<string, unknown>,
      });
      return chain;
    });
  }
  chain.kill = vi.fn();
  chain.pause = vi.fn();
  chain.play = vi.fn();
  return chain;
}

/** 与真实 gsap.matchMedia 一致：两条条件都登记，回调拿到的是命中表。 */
function mockMatchMedia(animate: boolean) {
  return vi.spyOn(gsap, 'matchMedia').mockReturnValue({
    add: vi.fn(
      (
        queries: Record<string, string>,
        callback: (ctx: { conditions: Record<string, boolean> }) => unknown,
      ) => {
        expect(Object.keys(queries)).toEqual(
          expect.arrayContaining(['animate', 'reduce']),
        );
        return callback({
          conditions: { animate, reduce: !animate },
        });
      },
    ),
    revert: vi.fn(),
  } as unknown as ReturnType<typeof gsap.matchMedia>);
}

class IntersectionObserverStub {
  static observed: unknown[] = [];
  observe(target: unknown) {
    IntersectionObserverStub.observed.push(target);
  }
  disconnect() {}
  unobserve() {}
}

const isCamera = (item: Recorded) => item.vars.onUpdate !== undefined;
const isCursor = (item: Recorded) =>
  (item.target as Element)?.classList?.contains('geo-home-micro__cursor') ===
  true;

afterEach(() => {
  IntersectionObserverStub.observed = [];
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('MicroWorkbenchTour.vue', () => {
  it('减弱动效：不建镜头、不加 is-live，全景直接呈现已确认终态', async () => {
    const media = mockMatchMedia(false);
    const timeline = vi.spyOn(gsap, 'timeline');
    const wrapper = mount(MicroWorkbenchTour);
    await nextTick();

    expect(wrapper.text()).toContain('交互演示 · 非实时数据');
    expect(wrapper.find('.geo-home-micro').classes()).not.toContain('is-live');
    expect(wrapper.text()).toContain('已确认');
    expect(wrapper.text().includes('待确认 1')).toBe(false);
    expect(wrapper.text()).toContain('待确认 0 · 已确认 2');
    expect(timeline).not.toHaveBeenCalled();

    wrapper.unmount();
    expect(media.mock.results[0]?.value.revert).toHaveBeenCalledOnce();
  });

  it('首页红线：无百分比、无金额、无哈希、无翻页控件、无可聚焦假控件', () => {
    mockMatchMedia(false);
    const wrapper = mount(MicroWorkbenchTour);
    const text = wrapper.text();

    expect(text).not.toMatch(/\d+(?:\.\d+)?\s*%|\d+\s*家企业|\d+\s*倍/);
    expect(text).not.toMatch(/¥|\$|\bCNY\b|\d+(?:\.\d+)?\s*元/);
    expect(text).not.toMatch(/SHA-?256|[0-9a-f]{16,}/i);
    expect(text).not.toContain('上一屏');
    expect(text).not.toContain('下一屏');
    expect(text).not.toContain('下一页');
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.find('a[href]').exists()).toBe(false);
    expect(wrapper.find('input').exists()).toBe(false);
    expect(wrapper.find('.geo-home-micro__cursor').attributes('aria-hidden')).toBe(
      'true',
    );
  });

  it('图标栏与菜单名取自侧边栏唯一来源 GEO_NAVIGATION，不是手抄', () => {
    mockMatchMedia(false);
    const wrapper = mount(MicroWorkbenchTour);
    const items = wrapper.findAll('.geo-home-micro__rail-item path');
    const paths = ['/geo/projects', '/geo/facts', '/geo/content', '/geo/reports'];
    const nav = GEO_NAVIGATION.flatMap((group) => group.items);

    expect(items).toHaveLength(4);
    expect(items.map((item) => item.attributes('d'))).toEqual(
      paths.map((path) => nav.find((item) => item.path === path)?.icon),
    );
  });

  it('运镜剧本：一条循环 timeline，位移干脆、缓动高爆发、整条不超 7 秒', () => {
    mockMatchMedia(true);
    stubLayout();
    const recorded: Recorded[] = [];
    const stub = recordingTimeline(recorded);
    const timeline = vi
      .spyOn(gsap, 'timeline')
      .mockReturnValue(stub as unknown as ReturnType<typeof gsap.timeline>);
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);

    const wrapper = mount(MicroWorkbenchTour);

    expect(timeline).toHaveBeenCalledOnce();
    expect(timeline.mock.calls[0]?.[0]).toMatchObject({ repeat: -1 });
    expect(wrapper.find('.geo-home-micro').classes()).toContain('is-live');
    expect(IntersectionObserverStub.observed.length).toBe(1);

    /** 到位位移：0.5s / 0.4s，必须 power3.out，不许拖泥带水。 */
    const approaches = recorded.filter(
      (item) =>
        item.method === 'to' &&
        isCursor(item) &&
        item.vars.x !== undefined &&
        Number(item.position) < 3,
    );
    expect(approaches).toHaveLength(2);
    expect(
      Math.max(...approaches.map((item) => item.vars.duration as number)),
    ).toBeLessThanOrEqual(0.5);
    expect(approaches.every((item) => item.vars.ease === 'power3.out')).toBe(true);

    /** 镜头：推近 0.9s expo.out、拉回 0.9s power3.inOut，没有第三种慢速补间。 */
    const camera = recorded.filter(isCamera);
    expect(camera.map((item) => item.vars.duration)).toEqual([0.9, 0.9]);
    expect(camera.map((item) => item.vars.ease)).toEqual(['expo.out', 'power3.inOut']);

    const lastPosition = Math.max(
      ...recorded.map((item) => Number(item.position)).filter(Number.isFinite),
    );
    const repeatDelay = (timeline.mock.calls[0]?.[0] as { repeatDelay: number })
      .repeatDelay;
    expect(lastPosition + repeatDelay).toBeLessThanOrEqual(7);

    wrapper.unmount();
    expect(stub.kill).toHaveBeenCalled();
  });

  it('取景几何：1.55x 特写把抽屉中心锁到视窗中线，全景回到 1.0x 原点', () => {
    mockMatchMedia(true);
    stubLayout();
    const recorded: Recorded[] = [];
    const stub = recordingTimeline(recorded);
    vi.spyOn(gsap, 'timeline').mockReturnValue(
      stub as unknown as ReturnType<typeof gsap.timeline>,
    );
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);

    const wrapper = mount(MicroWorkbenchTour);
    const [push, pull] = recorded.filter(isCamera);

    expect(Number(push?.vars.scale)).toBeCloseTo(FOCUS_SCALE, 6);
    const drawerLeft = VIEWPORT_W - DRAWER_W;
    const drawerCenterX = drawerLeft + DRAWER_W / 2;
    const confirmCenter = { x: drawerLeft + 10 + 26, y: VIEWPORT_H - 46 + 12 };
    const x = Number(push?.vars.x);
    const y = Number(push?.vars.y);
    const visibleW = VIEWPORT_W / FOCUS_SCALE;
    const leftEdge = -x / FOCUS_SCALE;
    /** 画面必须完全落在舞台内：贴边节点居中会露出舞台外的空白。 */
    expect(leftEdge).toBeGreaterThanOrEqual(0);
    expect(leftEdge + visibleW).toBeLessThanOrEqual(VIEWPORT_W + 0.5);
    expect(-y / FOCUS_SCALE).toBeGreaterThanOrEqual(0);
    /** 抽屉整块横向留在画面内（纵向按设计裁掉头部，取按钮所在的下半段）。 */
    expect(drawerLeft * FOCUS_SCALE + x).toBeGreaterThanOrEqual(0);
    expect(VIEWPORT_W * FOCUS_SCALE + x).toBeCloseTo(VIEWPORT_W, 1);
    /** 「确认」按钮必须落在特写画面里且留有余量——这是点击能不能看上去命中的关键。 */
    expect(confirmCenter.x * FOCUS_SCALE + x).toBeGreaterThan(40);
    expect(confirmCenter.x * FOCUS_SCALE + x).toBeLessThan(VIEWPORT_W - 40);
    expect(confirmCenter.y * FOCUS_SCALE + y).toBeGreaterThan(40);
    expect(confirmCenter.y * FOCUS_SCALE + y).toBeLessThan(VIEWPORT_H - 40);
    /** 抽屉中心被夹在右侧：不再严格居中，但整块可见。 */
    expect(drawerCenterX * FOCUS_SCALE + x).toBeGreaterThan(VIEWPORT_W / 2);

    expect(pull?.vars).toMatchObject({ scale: 1, x: 0, y: 0 });

    wrapper.unmount();
  });

  it('源码级守卫：无字面色值、圆角走令牌、含减弱动效熄火与回收', () => {
    const source = readFileSync(join(here, 'MicroWorkbenchTour.vue'), 'utf-8');

    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(source).not.toContain('--geo-saas-error');
    expect(source).not.toMatch(/border-radius:\s*\d/);
    expect(source).toContain('var(--geo-saas-radius-lg)');
    expect(source).toContain('prefers-reduced-motion: reduce');
    expect(source).toContain('timeline?.kill()');
    expect(source).toContain('motion?.revert()');
    expect(source).not.toMatch(/上一屏|下一屏|ScrollTrigger/);
  });
});
