import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';

import App from './App.vue';
import './styles/main.css';

/**
 * 独立开发库的入口。
 *
 * 只注册首页和它需要的两条路由 —— 首页里 `<RouterLink to="/geo/login">`
 * 指向登录页，主项目里它由 geo 布局承载；这里给一个占位页，
 * 好让首页开发期点得到、看得见，不必把整个登录页也搬过来。
 */
const Placeholder = {
  template:
    '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font:14px/1.6 system-ui;color:#64748b">登录页不在本库范围内（主项目中由 geo 布局承载）</div>',
};

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/geo/home' },
    {
      path: '/geo/home',
      name: 'GeoHome',
      component: () => import('./views/geo/home/index.vue'),
    },
    { path: '/geo/login', name: 'GeoLogin', component: Placeholder },
    { path: '/:pathMatch(.*)*', component: Placeholder },
  ],
});

createApp(App).use(router).mount('#app');
