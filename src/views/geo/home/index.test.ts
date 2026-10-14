// @vitest-environment happy-dom

import { mount } from '@vue/test-utils';

import { gsap } from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HOME_FILM_CHAPTERS } from './home-film';
import Home from './index.vue';

vi.mock('#/views/geo/brand', async (importOriginal) => {
  // 保留真实的 BRAND_MARK_BY_THEME：演播台与页头共用这张表，
  // 若这里只 mock useBrandMark，映射表会变成 undefined，渲染直接抛错。
  const actual = await importOriginal<typeof import('#/views/geo/brand')>();
  return {
    ...actual,
    useBrandMark: () => '/geo-brand/logo-default.png',
  };
});

const routerLink = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
};

function renderHome() {
  return mount(Home, { global: { stubs: { RouterLink: routerLink } } });
}

describe('GEO public home', () => {
  // 与 ProcessFilm.test.ts 一致：不让 ScrollTrigger 在 happy-dom 里真正 pin。
  // add 只记录调用、从不执行回调 = 媒体条件不命中（窄屏或减弱动效）。
  beforeEach(() => {
    vi.spyOn(gsap, 'matchMedia').mockReturnValue({
      add: vi.fn(),
      revert: vi.fn(),
    } as unknown as ReturnType<typeof gsap.matchMedia>);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('offers a public product introduction with a working login path', () => {
    const wrapper = renderHome();

    // H1 讲的是**结果**（AI 提不提你），不是我们的手段（出处、留痕、审计）。
    // 客户不买"我们很严谨"，客户买"AI 会说我好话"。
    expect(wrapper.find('h1').text()).toContain('提到你');
    expect(wrapper.findAll('a[href="/geo/login"]').length).toBeGreaterThan(0);
    // 导航锚点必须指向页面上真实存在的区块 —— 删区块时这里会红，逼着导航一起改。
    for (const id of ['#product-film', '#questions']) {
      expect(wrapper.findAll(`a[href="${id}"]`).length).toBeGreaterThan(0);
    }
  });

  it('labels its illustration and keeps unverified numerical claims out', () => {
    const wrapper = renderHome();
    const text = wrapper.text();

    expect(text).toContain('交互演示 · 非实时数据');
    // 红线：不许出现没测过的百分比 / 家数 / 倍数 —— 但复盘运行表的「有效回答率」是产品自家度量
    // （真机 1:1 复刻，用户 2026-10-12 确认保留 %），先把运行表那一块排除，再查营销红线。
    const reportTable = wrapper.find('.geo-report-table');
    const marketingText = reportTable.exists()
      ? text.replace(reportTable.text(), '')
      : text;
    expect(marketingText).not.toMatch(/\d+(?:\.\d+)?\s*%|\d+\s*家企业|\d+\s*倍/);
    // 运行表内应当出现有效回答率（真机度量，不是营销话术）
    expect(reportTable.text()).toMatch(/\d+(?:\.\d+)?\s*%/);
  });

  it('closes the mobile menu after following an anchor', async () => {
    const wrapper = renderHome();
    const menu = wrapper.find('.geo-home-mobile-nav');

    expect(wrapper.findAll('.geo-home-faq details')).toHaveLength(3);
    expect(menu.find('summary').attributes('aria-label')).toBe('打开导航菜单');
    (menu.element as HTMLDetailsElement).open = true;
    await menu.find('a[href="#questions"]').trigger('click');
    expect((menu.element as HTMLDetailsElement).open).toBe(false);
  });

  it('keeps section titles but does not restore redundant explanatory layers', () => {
    const wrapper = renderHome();

    expect(wrapper.find('.geo-home-principles').exists()).toBe(false);
    expect(wrapper.find('.geo-home-hero__footnote').exists()).toBe(false);
    expect(wrapper.find('.geo-home-preview__heading').exists()).toBe(false);
    expect(wrapper.find('.geo-home-section__index').exists()).toBe(false);
    // 页面结构已经换成"一段主张 + 三行承诺"：卡片墙不回来了。
    // 这两条同时守住两个方向 —— 既有区块不许复活，新内容也不许退回清单式堆砌。
    expect(wrapper.findAll('.geo-home-capability')).toHaveLength(0);
    expect(wrapper.findAll('.geo-flow-step')).toHaveLength(0);
    expect(wrapper.findAll('.geo-promise')).toHaveLength(3);
  });

  /**
   * 术语守卫：首页只对客户说话。
   *
   * 判定标准来自任务书第 8 节 ——「这句话是给客户的，还是给同事的？
   * 需要读过代码或开发文档才能理解的，不上页面。」
   * 黑名单覆盖：后端枚举、数据模型名、内部模块代号、技术栈名、内部系统代号、
   * 审计快照键值对、阈值版本号。新增页面文案时若命中，说明又写回了同事的话。
   */
  it('只说客户听得懂的话：内部枚举、模块代号与技术栈名一律不上页面', () => {
    const text = renderHome().text();
    const banned = [
      // 后端枚举与状态码
      'not_measured',
      'LOCKED_BY_POLICY',
      'STRICT_ENFORCE',
      // 数据模型名
      'ArticleClaim',
      'FactRevision',
      // 内部功能代号 / 模块名
      'Prompt_Lock',
      'Evidence Vault',
      'Diff Engine',
      'Brand Diff',
      // 内部度量用语：真机上候选卡印的是「已通过基线校验」，但客户不知道"基线"是什么。
      // 2026-10-12 用户点名去掉，加进黑名单防回退。
      '基线',
      // 技术栈与算法细节
      'ProseMirror',
      'Jaccard',
      // 内部系统代号与凭证前缀
      'DSH',
      'geop_',
      // 审计快照键值对与阈值版本
      'AUDIT_LOG_SNAPSHOT',
      'STATUS: PASS',
      'strict-v3',
      // 卡片右上角的内部模块标签
      'Core Engine',
      'Lock: ON',
      'API Tokens Ready',
      // 半成品可视化的空标签
      'Constraint:',
      'Binding:',
    ];
    for (const word of banned) {
      expect(text, `首页不该出现内部术语「${word}」`).not.toContain(word);
    }
    // 英文 eyebrow 也一并清掉（层级用排版解决，不要用文案解释界面）
    for (const eyebrow of [
      'The 8-Step Lifecycle',
      'Architecture',
      'Human-in-the-loop',
      'Detection Matrix',
      'PRODUCT WALKTHROUGH',
      'AGENT',
    ]) {
      expect(text, `首页不该出现英文 eyebrow「${eyebrow}」`).not.toContain(eyebrow);
    }
  });


  it('演播台不给控件：没有播放键、没有章节跳转、没有图注，只有画面本身', async () => {
    const wrapper = renderHome();
    expect(wrapper.find('.geo-home-stage__cursor').element.parentElement).toBe(
      wrapper.find('.geo-home-stage__frame').element,
    );
    // 实测 attio 的产品窗口就是这样：它 hero 区只有两个「Send me a demo」，
    // 窗口内没有任何控件，推进完全交给滚动和自动循环。
    // 这组断言是防回退的 —— 谁把控件加回来，这里就红。
    expect(wrapper.find('.geo-film-chapters').exists()).toBe(false);
    expect(wrapper.find('.geo-film-play').exists()).toBe(false);
    expect(wrapper.find('.geo-film-caption').exists()).toBe(false);
    expect(wrapper.find('.geo-film-progress').exists()).toBe(false);
    // 但合规声明是唯一必须留在窗口外的字，不能跟着控件一起被清掉
    expect(wrapper.find('.geo-film-disclaimer').text()).toContain(
      '交互演示 · 非实时数据',
    );
    // 演播是**固定循环**（用户 2026-10-12 要求）：播完无缝回卷接着播，
    // 没有"播一次就停"的结束层。谁把结束层加回来，这里就红。
    expect(wrapper.find('.geo-home-stage__ended').exists()).toBe(false);
    expect(wrapper.find('.geo-home-stage__replay').exists()).toBe(false);
    wrapper.unmount();
  });

  it('七幕落在三个页面上：换幕不等于换页', () => {
    // 这条设计约束原先由"章节按钮点了会换页"来证明；控件拿掉之后，
    // 改由数据本身守 —— 七幕是三页的产品界面，不是七页。
    // media 页真机为空态因此不设单独一幕，保持换幕不等于换页。
    expect(HOME_FILM_CHAPTERS).toHaveLength(7);
    expect(new Set(HOME_FILM_CHAPTERS.map((c) => c.page)).size).toBe(3);
    // 每一幕都要真的落到某个页面上，不能有空挂的幕
    for (const c of HOME_FILM_CHAPTERS) {
      expect(['facts', 'content', 'reports']).toContain(c.page);
    }
  });
});
