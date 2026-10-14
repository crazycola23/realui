// @vitest-environment happy-dom

import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

import { gsap } from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BEAT_STARTS,
  BEATS,
  CAMERA_MOVES,
  CONFIRM_PRESS,
  FILM_TARGETS,
  PIN_DISTANCE,
  STATUS_FLIP,
} from './film-config';
import ProcessFilm from './ProcessFilm.vue';

const LIVE_CONDITION =
  '(min-width: 1024px) and (prefers-reduced-motion: no-preference)';

const steps = [
  { number: '01', title: '明确问题', description: '复核客户真实提问。' },
  { number: '02', title: '确认事实', description: '确认资料与来源证据。' },
  { number: '03', title: '生产内容', description: '依据已确认事实生成文章。' },
  {
    number: '04',
    title: '管理发布',
    description: '跟进已接入渠道的发布结果。',
  },
  {
    number: '05',
    title: '巡检复盘',
    description: '根据已取得的结果调整方向。',
  },
];

let add: ReturnType<typeof vi.fn>;

// 与 MicroWorkbenchTour.test.ts 一致：不让 ScrollTrigger 在 happy-dom 里真正 pin。
// add 只记录调用、从不执行回调 = 媒体条件不命中（窄屏或减弱动效）。
beforeEach(() => {
  add = vi.fn();
  vi.spyOn(gsap, 'matchMedia').mockReturnValue({
    add,
    revert: vi.fn(),
  } as unknown as ReturnType<typeof gsap.matchMedia>);
});
afterEach(() => {
  vi.restoreAllMocks();
});

/** 组件靠 closest('.geo-home-root') 找滚动容器，所以要挂在这样一个宿主里。 */
function mountFilm() {
  const Host = defineComponent({
    render: () =>
      h('div', { class: 'geo-home-root' }, [h(ProcessFilm, { steps })]),
  });
  return mount(Host);
}

describe('ProcessFilm 编排数据', () => {
  it('总长与每段起点都由 BEATS 推出，不会各写各的', () => {
    expect(BEATS.every((length) => length > 0)).toBe(true);
    // 独立地累加一遍，再与导出的起点和总长对照。
    let running = 0;
    BEATS.forEach((length, index) => {
      expect(BEAT_STARTS[index]).toBe(running);
      running += length;
    });
    expect(PIN_DISTANCE).toBe(running);
    expect(BEATS).toHaveLength(steps.length);
  });

  it('每个动作都落在自己那一段之内', () => {
    for (const move of CAMERA_MOVES) {
      expect(move.beat).toBeGreaterThanOrEqual(0);
      expect(move.beat).toBeLessThan(BEATS.length);
      expect(move.at).toBeGreaterThanOrEqual(0);
      expect(move.at + move.span).toBeLessThanOrEqual(1);
    }
    // 按压是 yoyo，实际占用 2 × span。
    expect(CONFIRM_PRESS.at + 2 * CONFIRM_PRESS.span).toBeLessThanOrEqual(1);
    expect(STATUS_FLIP.at).toBeLessThanOrEqual(1);
  });

  it('同一段里的镜头运动按时间排列且互不重叠', () => {
    for (let beat = 0; beat < BEATS.length; beat++) {
      const moves = CAMERA_MOVES.filter((m) => m.beat === beat).toSorted(
        (a, b) => a.at - b.at,
      );
      moves.forEach((move, index) => {
        const previous = moves[index - 1];
        if (!previous) return;
        expect(move.at).toBeGreaterThanOrEqual(previous.at + previous.span);
      });
    }
  });

  it('镜头脚本引用的目标名与声明的完全一致：没有拼错，也没有闲置的名字', () => {
    const referenced = new Set<string>([
      ...CAMERA_MOVES.map((m) => m.target).filter((t) => t !== 'panorama'),
      CONFIRM_PRESS.target,
      STATUS_FLIP.target,
    ]);
    expect([...referenced].toSorted()).toEqual([...FILM_TARGETS].toSorted());
  });
});

describe('ProcessFilm 标记', () => {
  it('每个声明过的镜头目标在渲染结果里恰好出现一次，且没有多余的', () => {
    const rendered = mountFilm()
      .findAll('[data-film-target]')
      .map((node) => node.attributes('data-film-target'));

    expect(rendered.toSorted()).toEqual([...FILM_TARGETS].toSorted());
  });

  it('每一段有且仅有一个画面和一个步骤标记', () => {
    const wrapper = mountFilm();

    expect(wrapper.findAll('[data-film-frame]')).toHaveLength(BEATS.length);
    expect(wrapper.findAll('[data-film-rail]')).toHaveLength(BEATS.length);
  });

  it('只在桌面且允许动效时登记 pin', () => {
    const wrapper = mountFilm();

    expect(add).toHaveBeenCalledWith(
      LIVE_CONDITION,
      expect.any(Function),
      expect.anything(),
    );
    expect(wrapper.find('.geo-home-film').exists()).toBe(true);
  });
});

describe('ProcessFilm 静态分段（窄屏与减弱动效走的路径）', () => {
  // 注意：happy-dom 下 scoped CSS 不参与计算，这里断言的是「live 路径没有留下任何痕迹」，
  // 即 CSS 里 :not(.is-live) 的静态规则成立的前提；规则本身要在浏览器里看。
  it('条件不命中时五个画面都留在普通文档流里，没有任何内联样式', () => {
    const wrapper = mountFilm();
    const frames = wrapper.findAll('[data-film-frame]');

    expect(wrapper.find('.geo-home-film').classes()).not.toContain('is-live');
    expect(frames).toHaveLength(5);
    steps.forEach((step, index) => {
      // 画面缺席时 frame 为 undefined，toContain 会直接失败，而不是静默通过。
      expect(frames[index]?.attributes('style')).toBeUndefined();
      expect(frames[index]?.text()).toContain(step.title);
    });
    expect(
      wrapper.find('.geo-home-film__stage').attributes('style'),
    ).toBeUndefined();
  });

  it('任一镜头目标缺席时不进入 live：宁可静态，也不留半截镜头运动', () => {
    const wrapper = mountFilm();
    wrapper.find('[data-film-target="drawer"]').element.remove();

    const run = add.mock.calls[0]?.[1] as (() => unknown) | undefined;
    expect(run).toBeTypeOf('function');
    const cleanup = run?.();

    expect(cleanup).toBeUndefined();
    expect(wrapper.find('.geo-home-film').classes()).not.toContain('is-live');
  });
});
