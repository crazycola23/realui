// @vitest-environment happy-dom
/**
 * AgentChatScene 的验收测试（2026-10-10，任务 T3）。
 *
 * 覆盖四类：
 * 1. **剧本数据自洽**：站点由各段独立累加得出，不各写各的；
 * 2. **静态终态**：reduced-motion 下不建时间轴，七段全部可见；
 * 3. **播放**：`active=false` 时只留第一句、`active=true` 时建时间轴并收尾发 complete；
 * 4. **文案与样式红线**：无百分比 / 倍数 / 金额 / 真实客户名；hover 进 media；圆角与字重守规范。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import { gsap } from 'gsap';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AgentChatScene, {
  BEAT_COUNT,
  beatEnd,
  beatHold,
  beatSpan,
  beatStart,
  beatTail,
  beatText,
  CONTENT_MODE_LABEL,
  READ_HOLD,
  SCRIPT,
  TAIL_HOLD,
  THINK_SPAN,
  TOTAL_SPAN,
  TYPE_CONSTANT,
  TYPE_SPEED,
} from './AgentChatScene.vue';

const maybeHere = (import.meta as unknown as { dirname?: string }).dirname;
if (!maybeHere) {
  throw new Error('自检失败：无法定位测试文件所在目录');
}
const here: string = maybeHere;

/** 时间轴替身记录下来的单条调用。 */
type Recorded = {
  method: string;
  position: number | string | undefined;
  target: unknown;
  vars: Record<string, unknown>;
};

/**
 * 可见性判据。
 *
 * **不能用 `wrapper.isVisible()`**：happy-dom 不做样式计算，`v-show` 写下的
 * `display: none` 被 `isVisible()` 忽略，隐藏与否都返回 true（实测已确认）。
 * 这里直接读 `v-show` 写进元素的行内样式 —— 它才是组件真正输出的东西。
 */
function visibleBeats(wrapper: ReturnType<typeof mount>) {
  return wrapper
    .findAll('[data-chat-beat]')
    .filter(
      (node) => !/display:\s*none/.test(node.attributes('style') ?? ''),
    );
}

/** 与 MicroWorkbenchTour.test.ts 同一套路：把两条媒体条件都可控地喂给组件。 */
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
        return callback({ conditions: { animate, reduce: !animate } });
      },
    ),
    revert: vi.fn(),
  } as unknown as ReturnType<typeof gsap.matchMedia>);
}

/**
 * 记录型时间轴替身：记下每次补间的目标、参数与时间位。
 *
 * 两条容易踩空的点，替身必须与真身一致：
 * 1. `tl.set(target, vars, at)` 是链式调用，返回值必须还是这条 timeline；
 * 2. `call` 的签名是 `call(fn, params, at)`，时间位在第 3 个参数，
 *    跟其他方法的位置不同 —— 混用会让站点断言全部读到 undefined 而假绿。
 *
 * 收尾事件刻意**不**由替身代发：组件用 `gsap.timeline({ onComplete })` 声明，
 * 测试直接读 `gsap.timeline` 的调用参数即可，避免替身与真身语义漂移。
 */
function recordingTimeline(recorded: Recorded[]) {
  const chain: Record<string, unknown> = {};
  for (const method of ['addLabel', 'to', 'fromTo', 'call', 'set']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      if (method === 'call') {
        recorded.push({
          method,
          position: args[2] as number | undefined,
          target: args[0],
          vars: {},
        });
        return chain;
      }
      const varsIndex = method === 'fromTo' ? 2 : 1;
      recorded.push({
        method,
        position: args[varsIndex + 1] as number | string | undefined,
        target: args[0],
        vars: (args[varsIndex] ?? {}) as Record<string, unknown>,
      });
      return chain;
    });
  }
  chain.kill = vi.fn();
  chain.pause = vi.fn();
  chain.play = vi.fn();
  chain.eventCallback = vi.fn(() => chain);
  return chain;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AgentChatScene 剧本数据', () => {
  it('每段宽度只由「静止 + 字数 × 速度 + 尾停」决定，没有另写的数字', () => {
    for (const beat of SCRIPT) {
      expect(beatSpan(beat)).toBeCloseTo(
        beatHold(beat) + TYPE_SPEED * beatText(beat).length + beatTail(beat),
        10,
      );
    }
  });

  it('Agent 段的静止时长是思考相位，用户段是发出前的停顿', () => {
    // 思考相位要长到能被感知，又不能长到像卡住 —— 这是本轮观感的关键参数。
    expect(THINK_SPAN).toBeGreaterThanOrEqual(0.4);
    expect(THINK_SPAN).toBeLessThanOrEqual(0.9);
    for (const beat of SCRIPT) {
      if (beat.kind === 'agent') {
        expect(beatHold(beat)).toBe(THINK_SPAN);
        expect(beatTail(beat)).toBe(READ_HOLD);
      } else {
        expect(beatHold(beat)).toBe(TYPE_CONSTANT);
        expect(beatTail(beat)).toBe(TAIL_HOLD);
      }
    }
    // 用户段的停顿必须明显短于 Agent 的思考，否则一问一答会变成同一节奏。
    expect(TYPE_CONSTANT).toBeLessThan(THINK_SPAN);
  });

  it('Agent 说完后有留白，否则七轮会在七秒内滚完', () => {
    // 这条钉的是「能读完」这件事：没有尾停时全片约 7 秒，
    // 观众只看到一串气泡飞过去。加上尾停后落在 11 秒量级。
    expect(READ_HOLD).toBeGreaterThan(0.5);
    expect(TAIL_HOLD).toBeLessThan(READ_HOLD);
    expect(TOTAL_SPAN).toBeGreaterThan(9);
    expect(TOTAL_SPAN).toBeLessThan(16);
  });

  it('站点连续：前段终点就是后段起点，总长等于各段之和', () => {
    let running = 0;
    for (let index = 0; index < BEAT_COUNT; index++) {
      expect(beatStart(index)).toBeCloseTo(running, 10);
      running += beatSpan(SCRIPT[index] as (typeof SCRIPT)[number]);
      expect(beatEnd(index)).toBeCloseTo(running, 10);
    }
    expect(TOTAL_SPAN).toBeCloseTo(running, 10);
  });

  it('打字速度落在规格要求的 18–24ms/字', () => {
    const msPerChar = TYPE_SPEED * 1000;
    expect(msPerChar).toBeGreaterThanOrEqual(18);
    expect(msPerChar).toBeLessThanOrEqual(24);
  });

  it('越界索引返回 undefined，不静默返回 0', () => {
    expect(beatStart(-1)).toBeUndefined();
    expect(beatStart(BEAT_COUNT)).toBeUndefined();
    expect(beatEnd(BEAT_COUNT)).toBeUndefined();
    expect(beatStart(1.5)).toBeUndefined();
  });

  it('剧本至少 6 段，用户块与 Agent 块都存在，且含思考标签与工具卡', () => {
    expect(SCRIPT.length).toBeGreaterThanOrEqual(6);
    expect(SCRIPT.filter((beat) => beat.kind === 'user').length).toBeGreaterThanOrEqual(3);
    expect(SCRIPT.filter((beat) => beat.kind === 'agent').length).toBeGreaterThanOrEqual(3);
    expect(SCRIPT.filter((beat) => beat.kind === 'agent' && beat.tool).length).toBe(3);
  });

  it('每个 Agent 段都写了思考标签，否则思考相位只剩骨架条在闪', () => {
    const agents = SCRIPT.filter((beat) => beat.kind === 'agent');
    expect(agents.length).toBeGreaterThan(0);
    for (const beat of agents) {
      expect(
        beat.loading?.label.trim(),
        `第 ${SCRIPT.indexOf(beat)} 段缺思考标签`,
      ).toBeTruthy();
    }
  });
});

describe('AgentChatScene 内容红线', () => {
  const source = readFileSync(
    join(here, 'AgentChatScene.vue'),
    'utf8',
  );
  // 只看渲染出来的文案，不看源码注释：注释里写着「无百分比」这类说明，
  // 对原文断言会因注释本身而红，那样只会训练人忽略守卫（同 ui-restraint 的口径）。
  const rendered = SCRIPT.map((beat) =>
    beat.kind === 'agent'
      ? [
          beat.text,
          beat.loading?.label ?? '',
          beat.tool?.result ?? '',
          beat.tool?.name ?? '',
        ].join(' ')
      : beat.title,
  ).join('\n');

  it('不出现百分比 / 倍数 / 「N 家企业」类断言', () => {
    expect(rendered).not.toMatch(/\d+(?:\.\d+)?\s*[%％]|\d+\s*倍|\d+\s*家企业/);
    // 再看刻度数字：时间轴常量不能伪装成「效率提升 N%」一类断言。
    expect(rendered).not.toMatch(/\d+\s*倍/);
  });

  it('不出现金额与真实客户名', () => {
    expect(rendered).not.toMatch(/¥|\$|\bCNY\b|\d+\s*元/);
    for (const client of ['绍兴肩颈腰腿调理', '卡奈斯通', '疯狂的狮子Li']) {
      expect(source).not.toContain(client);
    }
  });

  it('用脱敏示范语境', () => {
    expect(source).toContain('高新材料制造');
    expect(source).toContain('环保资质认证');
  });

  it('不引用 index.vue 的任何东西：没有相对上级目录，也没有 #/ 别名', () => {
    expect(source).not.toMatch(/from '\.\.\//);
    expect(source).not.toMatch(/from '#\//);
    expect(source).not.toMatch(/from '\.\.'/);
    expect(source).not.toMatch(/\bimport\(['"]/);
  });
});

describe('AgentChatScene 样式红线', () => {
  const source = readFileSync(
    join(here, 'AgentChatScene.vue'),
    'utf8',
  );

  it('hover 规则都在 @media (hover: hover) 里', () => {
    const style = source.slice(source.lastIndexOf('<style'));
    const hoverRules = style
      .split('\n')
      .filter((line) => line.includes(':hover'));
    expect(hoverRules.length).toBeGreaterThan(0);
    const hoverBlock = /@media \(hover: hover\) \{[\s\S]*?\n\}/.exec(style)?.[0];
    expect(hoverBlock).toBeTruthy();
    for (const rule of hoverRules) {
      expect(hoverBlock).toContain(rule.trim());
    }
  });

  it('圆角只用 8 / 12 / 16 / 999', () => {
    const radii = [...source.matchAll(/border-radius:\s*([^;]+);/g)].map((m) =>
      m[1]?.trim(),
    );
    expect(radii.length).toBeGreaterThan(0);
    for (const radius of radii) {
      const value = radius ?? '';
      expect(
        ['8px', '12px', '16px', '999px', 'var(--chat-radius-tool)'].includes(value) ||
          value.startsWith('var('),
        `圆角取值越界：${value}`,
      ).toBe(true);
    }
  });

  it('字重只用 500 / 600，或继承宿主（不许出现 700+）', () => {
    const weights = [...source.matchAll(/font-weight:\s*([^;]+);/g)].map((m) =>
      m[1]?.trim(),
    );
    expect(weights.length).toBeGreaterThan(0);
    // 400 属于「不必声明」的继承基线，声明它等于没声明。标出非法值而不是一刀切断言。
    const offenders = weights.filter(
      (w) => w !== '500' && w !== '600' && w !== 'inherit',
    );
    expect(offenders, `越界字重：${offenders.join(', ')}`).toEqual([]);
  });

  it('阴影是多层叠加，不是单层 0 4px 12px', () => {
    expect(source).toContain('rgba(11, 13, 24, 0.06) 0 0 0 1px');
    expect(source).toContain('rgba(11, 13, 24, 0.04) 0 16px 28px 0');
    expect(source).not.toMatch(/box-shadow:\s*0 4px 12px/);
  });

  it('动画有 prefers-reduced-motion 分支，且清理了时间轴', () => {
    expect(source).toContain('prefers-reduced-motion: reduce');
    expect(source).toContain('timeline?.kill()');
    expect(source).toContain('motion?.revert()');
  });

  it('打字光标在 reduced-motion 下不显示', () => {
    const block = /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/.exec(
      source,
    )?.[0];
    expect(block).toBeTruthy();
    expect(block).toContain('agent-chat__caret');
    expect(block).toContain('display: none');
  });
});

describe('AgentChatScene reduce 分支：完整静态终态', () => {
  const component = readFileSync(join(here, 'AgentChatScene.vue'), 'utf8');

  it('不建时间轴，七段全部可见，光标不出现', async () => {
    mockMatchMedia(false);
    const timeline = vi.spyOn(gsap, 'timeline');
    const wrapper = mount(AgentChatScene, { props: { active: true } });
    await nextTick();

    expect(timeline).not.toHaveBeenCalled();
    expect(wrapper.findAll('[data-chat-beat]')).toHaveLength(BEAT_COUNT);
    expect(visibleBeats(wrapper)).toHaveLength(BEAT_COUNT);
    expect(wrapper.find('.agent-chat__caret').exists()).toBe(false);
    expect(wrapper.classes()).toContain('is-terminal');
    // 终态下没有骨架屏：思考相位已经过去，留下的必须是完整正文，
    // 否则收尾会停在两根占位条上。
    expect(wrapper.find('.agent-chat__skeleton').exists()).toBe(false);
    expect(wrapper.find('.agent-chat__thinking').exists()).toBe(false);
    // 终态下三张工具卡都在，且都是已完成 —— 不能停在执行中的虚线上。
    expect(wrapper.findAll('.agent-chat__tool')).toHaveLength(3);
    expect(wrapper.findAll('.agent-chat__tool--done')).toHaveLength(3);
    expect(wrapper.find('.agent-chat__tool--running').exists()).toBe(false);
    // 终态文案是完整的，不是被截断的半句。
    for (const beat of SCRIPT) {
      expect(wrapper.text()).toContain(beatText(beat));
    }
    expect(wrapper.emitted('complete')).toHaveLength(1);

    wrapper.unmount();
  });

  it('reduce 下思考态与打字光标都不参与动画（CSS 已熄火）', () => {
    const block = /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/.exec(
      component,
    )?.[0];
    expect(block).toBeTruthy();
    expect(block).toContain('agent-chat__skeleton i::after');
    expect(block).toContain('agent-chat__thinking-pulse');
    expect(block).toContain('agent-chat__tool-scan');
    expect(block).toContain('animation: none');
  });
});

describe('AgentChatScene active 分支', () => {
  it('active=false 时只留第一句，没有第二段的痕迹', async () => {
    mockMatchMedia(true);
    const wrapper = mount(AgentChatScene, { props: { active: false } });
    await nextTick();

    const beats = wrapper.findAll('[data-chat-beat]');
    expect(beats).toHaveLength(BEAT_COUNT);
    expect(beats[0]?.attributes('style') ?? '').not.toContain('display: none');
    expect(beats[1]?.attributes('style')).toContain('display: none');
    expect(visibleBeats(wrapper)).toHaveLength(1);
    expect(wrapper.emitted('complete')).toBeUndefined();
    // 只看可见的那一条：v-show 让七段都留在 DOM 里，wrapper.text() 会把隐藏段
    // 一并读出来，所以这里必须走 visibleBeats。
    const visible = visibleBeats(wrapper);
    expect(visible[0]?.text()).toContain(
      beatText(SCRIPT[0] as (typeof SCRIPT)[number]),
    );
    // 思考态也不能在初始帧里露头，否则一进页面就有一根骨架条挂在第二段上。
    expect(wrapper.find('.agent-chat__skeleton').exists()).toBe(false);
    expect(wrapper.find('.agent-chat__tool').exists()).toBe(false);

    wrapper.unmount();
  });

  it('active=true 时建时间轴，段落站点与剧本数据一致', async () => {
    mockMatchMedia(true);
    const recorded: Recorded[] = [];
    const stub = recordingTimeline(recorded);
    const timeline = vi
      .spyOn(gsap, 'timeline')
      .mockReturnValue(stub as unknown as ReturnType<typeof gsap.timeline>);

    const wrapper = mount(AgentChatScene, { props: { active: true } });
    await nextTick();

    expect(timeline).toHaveBeenCalledOnce();
    const options = timeline.mock.calls[0]?.[0] as undefined | { paused?: boolean };
    expect(options?.paused).toBe(true);
    expect(stub.play).toHaveBeenCalled();

    // 每段显形（call）的落点就是该段起点，一个不多一个不少。
    const calls = recorded.filter((item) => item.method === 'call');
    const callPositions = calls
      .map((item) => Number(item.position))
      .filter((n) => Number.isFinite(n));
    for (let index = 0; index < BEAT_COUNT; index++) {
      expect(callPositions).toContain(beatStart(index));
    }

    // 打字补间：时长 = 段宽 - 常量，也就是字数 × 速度。
    const typingTweens = recorded.filter(
      (item) => item.method === 'fromTo' && item.vars.ease === 'none',
    );
    expect(typingTweens).toHaveLength(BEAT_COUNT);
    typingTweens.forEach((item, index) => {
      const beat = SCRIPT[index] as (typeof SCRIPT)[number];
      expect(Number(item.vars.duration)).toBeCloseTo(
        TYPE_SPEED * beatText(beat).length,
        6,
      );
    });

    wrapper.unmount();
    expect(stub.kill).toHaveBeenCalled();
  });

  it('收尾时 emit complete，并把可见范围锁到全部节拍', async () => {
    mockMatchMedia(true);
    const recorded: Recorded[] = [];
    const stub = recordingTimeline(recorded);
    const timeline = vi
      .spyOn(gsap, 'timeline')
      .mockReturnValue(stub as unknown as ReturnType<typeof gsap.timeline>);

    const wrapper = mount(AgentChatScene, { props: { active: true } });
    await nextTick();

    // 手动把每一段的显形回调跑一遍，模拟时间轴走到末尾。
    for (const call of recorded.filter((item) => item.method === 'call')) {
      (call.target as () => void)();
      await nextTick();
    }

    // 收尾事件必须来自时间轴自己的 onComplete（组件用 gsap.timeline({ onComplete }) 声明）。
    const options = timeline.mock.calls[0]?.[0] as
      | undefined
      | { onComplete?: () => void };
    expect(options?.onComplete).toBeTypeOf('function');
    options?.onComplete?.();
    await nextTick();

    // 清点：显形回调不发事件，complete 只由 onComplete 发出一次。
    expect(wrapper.emitted('complete')).toHaveLength(1);
    expect(wrapper.classes()).toContain('is-terminal');
    expect(visibleBeats(wrapper)).toHaveLength(BEAT_COUNT);
    expect(wrapper.find('.agent-chat__caret').exists()).toBe(false);

    wrapper.unmount();
  });

  it('active 翻回 false 时回到初始态：只留第一句、不发 complete', async () => {
    mockMatchMedia(true);
    const recorded: Recorded[] = [];
    const stub = recordingTimeline(recorded);
    vi.spyOn(gsap, 'timeline').mockReturnValue(
      stub as unknown as ReturnType<typeof gsap.timeline>,
    );

    const wrapper = mount(AgentChatScene, { props: { active: true } });
    await nextTick();
    for (const call of recorded.filter((item) => item.method === 'call')) {
      (call.target as () => void)();
    }
    await nextTick();
    expect(visibleBeats(wrapper)).toHaveLength(BEAT_COUNT);

    await wrapper.setProps({ active: false });
    await nextTick();

    expect(visibleBeats(wrapper)).toHaveLength(1);
    expect(wrapper.text()).toContain(beatText(SCRIPT[0] as (typeof SCRIPT)[number]));
    expect(wrapper.emitted('complete')).toBeUndefined();
    expect(stub.kill).toHaveBeenCalled();

    wrapper.unmount();
  });

  it('卸载时清理 matchMedia 与时间轴', async () => {
    const media = mockMatchMedia(true);
    const recorded: Recorded[] = [];
    const stub = recordingTimeline(recorded);
    vi.spyOn(gsap, 'timeline').mockReturnValue(
      stub as unknown as ReturnType<typeof gsap.timeline>,
    );

    const wrapper = mount(AgentChatScene, { props: { active: true } });
    await nextTick();
    wrapper.unmount();

    expect(media.mock.results[0]?.value.revert).toHaveBeenCalledOnce();
    expect(stub.kill).toHaveBeenCalled();
  });
});

describe('AgentChatScene 结构与无障碍', () => {
  it('工具卡渲染动作名、状态位与结果标签', async () => {
    mockMatchMedia(false);
    const wrapper = mount(AgentChatScene, { props: { active: true } });
    await nextTick();

    const cards = wrapper.findAll('.agent-chat__tool');
    expect(cards).toHaveLength(3);
    expect(wrapper.text()).toContain('提取事实候选');
    expect(wrapper.text()).toContain('事实库已锁定 · 12 条');
    expect(wrapper.text()).toContain(`${CONTENT_MODE_LABEL} · 3 篇`);

    wrapper.unmount();
  });

  it('是纯演示：没有可聚焦假控件、没有表单、没有链接', async () => {
    mockMatchMedia(false);
    const wrapper = mount(AgentChatScene, { props: { active: true } });
    await nextTick();

    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.find('a[href]').exists()).toBe(false);
    expect(wrapper.find('input').exists()).toBe(false);
    expect(wrapper.find('section').attributes('aria-label')).toBe(
      '通过对话驱动 GEO 平台运营的演示',
    );
    // 装饰性头像与光标对读屏隐藏。
    for (const avatar of wrapper.findAll('.agent-chat__avatar')) {
      expect(avatar.attributes('aria-hidden')).toBe('true');
    }

    wrapper.unmount();
  });
});

describe('AgentChatScene 折叠中间步骤', () => {
  /** 把前 count 段的「显形」回调（落点 = 各段起点）跑一遍，推进可见范围。 */
  function revealThrough(recorded: Recorded[], count: number) {
    const stops = Array.from({ length: count }, (_, i) => beatStart(i));
    for (const call of recorded.filter(
      (item) =>
        item.method === 'call' && stops.includes(Number(item.position)),
    )) {
      (call.target as () => void)();
    }
  }

  it('播放中：被顶下去的 agent 步骤收成一行摘要，最新一条仍展开', async () => {
    mockMatchMedia(true);
    const recorded: Recorded[] = [];
    const stub = recordingTimeline(recorded);
    vi.spyOn(gsap, 'timeline').mockReturnValue(
      stub as unknown as ReturnType<typeof gsap.timeline>,
    );

    const wrapper = mount(AgentChatScene, { props: { active: true } });
    await nextTick();
    revealThrough(recorded, 3); // 推进到第 3 段：第 2 段（index 1，agent）被顶下去
    await nextTick();

    const beat1 = wrapper.find('[data-chat-beat="1"]');
    const fold = beat1.find('.agent-chat__fold');
    expect(fold.exists()).toBe(true);
    expect(fold.attributes('type')).toBe('button');
    expect(fold.attributes('aria-expanded')).toBe('false');
    expect(fold.text()).toContain('解析环保资质认证资料');
    expect(beat1.find('.agent-chat__bubble--agent').exists()).toBe(false);

    // 最新一段（index 2，agent）仍是展开的气泡，不是折叠条。
    const beat2 = wrapper.find('[data-chat-beat="2"]');
    expect(beat2.find('.agent-chat__fold').exists()).toBe(false);
    expect(beat2.find('.agent-chat__bubble--agent').exists()).toBe(true);

    wrapper.unmount();
  });

  it('点开折叠步骤后铺开完整正文', async () => {
    mockMatchMedia(true);
    const recorded: Recorded[] = [];
    const stub = recordingTimeline(recorded);
    vi.spyOn(gsap, 'timeline').mockReturnValue(
      stub as unknown as ReturnType<typeof gsap.timeline>,
    );

    const wrapper = mount(AgentChatScene, { props: { active: true } });
    await nextTick();
    revealThrough(recorded, 3);
    await nextTick();

    const beat1 = wrapper.find('[data-chat-beat="1"]');
    await beat1.find('.agent-chat__fold').trigger('click');
    await nextTick();

    expect(beat1.find('.agent-chat__fold').exists()).toBe(false);
    expect(beat1.find('.agent-chat__bubble--agent').exists()).toBe(true);
    expect(beat1.text()).toContain(
      beatText(SCRIPT[1] as (typeof SCRIPT)[number]),
    );

    wrapper.unmount();
  });

  it('执行中的工具卡用确定性进度环，不再用转圈 spinner', () => {
    const source = readFileSync(join(here, 'AgentChatScene.vue'), 'utf8');
    expect(source).toContain('agent-chat__tool-ring');
    expect(source).toContain('conic-gradient');
    expect(source).not.toContain('agent-chat__tool-spinner');
    expect(source).not.toContain('agent-chat-spin');
  });
});
