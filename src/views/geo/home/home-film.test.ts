import { describe, expect, it } from 'vitest';

import {
  HOME_FILM_CHAPTERS,
  HOME_FILM_DURATION,
  HOME_FILM_LINK_TOTAL,
  homeFilmFrame,
  homeFilmState,
} from './home-film';

const viewport = { width: 1120, height: 1120 * 908 / 1440 };
const scene = { width: 1440, height: 908 };

describe('Home film score', () => {
  it('七幕按顺序排开，总长 48 秒，末幕停在复盘报告', () => {
    expect(HOME_FILM_CHAPTERS.map((chapter) => chapter.at)).toEqual([
      0, 6.5, 11, 18, 23, 29.5, 34,
    ]);
    expect(HOME_FILM_CHAPTERS.map((chapter) => chapter.key)).toEqual([
      'appear',
      'grounded',
      'generate',
      'ship',
      'measure',
      'sourcemap',
      'loop',
    ]);
    expect(HOME_FILM_DURATION).toBe(48);
    expect(homeFilmState(40)).toMatchObject({
      page: 'reports',
      admitted: true,
      boundary: true,
      publishReady: true,
      unmeasuredNote: true,
    });
  });

  it('后两幕讲的是「凭什么」，不是「我们很合规」', () => {
    // 这条钉的是定位。旧版五幕叫「你点头的，才算事实 / 系统先替你划出红线 /
    // 每句话都要有出处」—— 把一个"让 AI 提到你"的产品讲成了合规工具。
    // 判据见 design-handoff/03-产品能力与差异化.md：删掉之后产品显得更普通
    // 才是能力叙事；显得更可疑就是合规叙事，不许复活。
    const text = HOME_FILM_CHAPTERS.map((c) => `${c.title}${c.detail}`).join('');
    for (const banned of ['合规', '红线', '越权', '禁止公开', '守规']) {
      expect(text, `第 ${banned} 属于合规叙事`).not.toContain(banned);
    }
    // 效果段（前五幕）之后必须接上能力段：信源规律 / 测看调。
    expect(HOME_FILM_CHAPTERS.map((c) => c.page).slice(5)).toEqual([
      'reports',
      'reports',
    ]);
  });

  it('换幕不等于换页：七幕只占三页，避免为了换页而换页', () => {
    expect(HOME_FILM_CHAPTERS.map((chapter) => chapter.page)).toEqual([
      'facts',
      'facts',
      'content',
      'content',
      'reports',
      'reports',
      'reports',
    ]);
    // 01 / 02 同页，03 / 04 同页，05 / 06 / 07 同页 —— 叙事单位是镜头，不是页面。
    expect(homeFilmState(0).page).toBe('facts');
    expect(homeFilmState(7).page).toBe('facts');
    expect(homeFilmState(12).page).toBe('content');
    expect(homeFilmState(19).page).toBe('content');
    expect(homeFilmState(24).page).toBe('reports');
    expect(homeFilmState(30).page).toBe('reports');
    expect(homeFilmState(35).page).toBe('reports');
  });

  it('确认发生在第一幕之内，判定标签要等确认之后才出现', () => {
    // 点「确认」之前，候选还是待确认状态
    expect(homeFilmState(0).admitted).toBe(false);
    expect(homeFilmState(3.4).admitted).toBe(false);
    expect(homeFilmState(3.5).admitted).toBe(true);
    // 「仅限内部，禁止公开」是系统在确认之后才给的判定，不能提前盖上去
    expect(homeFilmState(3.5).boundary).toBe(false);
    expect(homeFilmState(7).boundary).toBe(true);
  });

  it('引用逐句绑定，且不超过总句数', () => {
    expect(homeFilmState(0).linkedCount).toBe(0);
    expect(homeFilmState(12.6).linkedCount).toBe(1);
    expect(homeFilmState(14.2).linkedCount).toBe(2);
    expect(homeFilmState(15.8).linkedCount).toBe(3);
    // 到顶之后不再增长，避免把不存在的句子画出来
    expect(homeFilmState(18).linkedCount).toBe(HOME_FILM_LINK_TOTAL);
    expect(homeFilmState(40).linkedCount).toBe(HOME_FILM_LINK_TOTAL);
  });

  it('发布与未测量两个状态都落在各自那一幕之内', () => {
    expect(homeFilmState(18).publishReady).toBe(false);
    expect(homeFilmState(18.5).publishReady).toBe(true);
    expect(homeFilmState(26.4).unmeasuredNote).toBe(false);
    expect(homeFilmState(26.5).unmeasuredNote).toBe(true);
  });

  it('往回 seek 时所有演示状态一起复位', () => {
    homeFilmState(39);
    expect(homeFilmState(0)).toMatchObject({
      page: 'facts',
      admitted: false,
      boundary: false,
      linkedCount: 0,
      publishReady: false,
      unmeasuredNote: false,
    });
  });

  it.each([
    { x: 940, y: 100, width: 420, height: 640 },
    { x: 280, y: 240, width: 1080, height: 160 },
    { x: 350, y: 400, width: 850, height: 300 },
  ])('fits the entire subject and never reveals empty stage edges: %j', (subject) => {
    const frame = homeFilmFrame(subject, viewport, scene, 1.65);
    const k = viewport.width / scene.width * frame.scale;
    expect(frame.scale).toBeGreaterThanOrEqual(1);
    expect(frame.scale).toBeLessThanOrEqual(1.65);
    expect(frame.x).toBeLessThanOrEqual(0);
    expect(frame.y).toBeLessThanOrEqual(0);
    expect(scene.width * k + frame.x).toBeGreaterThanOrEqual(viewport.width - 0.01);
    expect(scene.height * k + frame.y).toBeGreaterThanOrEqual(viewport.height - 0.01);
    expect(subject.x * k + frame.x).toBeGreaterThanOrEqual(0);
    expect(subject.y * k + frame.y).toBeGreaterThanOrEqual(0);
    expect((subject.x + subject.width) * k + frame.x).toBeLessThanOrEqual(viewport.width);
    expect((subject.y + subject.height) * k + frame.y).toBeLessThanOrEqual(viewport.height);
  });
});
