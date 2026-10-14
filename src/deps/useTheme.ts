import { computed, ref } from 'vue';

export type Theme = 'default' | 'structured-soft' | 'nordic' | 'warm-editorial';
export type ColorMode = 'light' | 'dark';
export type ResolvedColorMode = ColorMode;

export interface ThemeOption {
  value: Theme;
  label: string;
  description: string;
  colors: {
    accent: string;
    background: string;
    primary: string;
  };
}

const THEME_STORAGE_KEY = 'geo-theme';
const COLOR_MODE_STORAGE_KEY = 'geo-color-mode';
const DEFAULT_THEME: Theme = 'default';
const DEFAULT_COLOR_MODE: ColorMode = 'light';
const isGeoApp = import.meta.env.VITE_APP_MODE === 'geo';

export const COLOR_MODE_OPTIONS: ReadonlyArray<{
  label: string;
  value: ColorMode;
}> = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
];

export const GEO_THEME_OPTIONS: readonly ThemeOption[] = [
  {
    value: 'default',
    label: '旗舰深海宝蓝',
    description: 'Sapphire Blue 云白体系，适合日常后台工作',
    colors: {
      background: '#F8FAFC',
      primary: '#1D4ED8',
      accent: '#EFF6FF',
    },
  },
  {
    value: 'structured-soft',
    label: '极客科技蓝紫',
    description: 'Indigo 靛蓝紫，适合大模型与 GEO 探索场景',
    colors: {
      background: '#F8F8FC',
      primary: '#5E6AD2',
      accent: '#F0F2FE',
    },
  },
  {
    value: 'nordic',
    label: '北欧松绿',
    description: 'Nordic Pine · 静谧专注',
    colors: {
      background: '#F7FAF8',
      primary: '#2D6A4F',
      accent: '#F1F8F4',
    },
  },
  {
    value: 'warm-editorial',
    label: '暖色编辑',
    description: '暖白底色、重点内容更突出，适合编辑稿件和复盘报告',
    colors: {
      background: '#FAF8F5',
      primary: '#C15F3D',
      accent: '#FBF0EB',
    },
  },
];

export const GEO_THEME_MODES: Readonly<Record<Theme, readonly ColorMode[]>> = {
  default: ['light', 'dark'],
  'structured-soft': ['light'],
  nordic: ['light'],
  'warm-editorial': ['light'],
};

const LEGACY_THEME_ALIASES: Readonly<Record<string, Theme>> = {
  neutral: 'default',
  shadcn: 'default',
  purple: 'structured-soft',
  green: 'nordic',
  'vivid-brand': 'nordic',
  pastel: 'warm-editorial',
};

const theme = ref<Theme>(readStoredTheme());
const mode = ref<ColorMode>(
  readStoredValue(COLOR_MODE_STORAGE_KEY, DEFAULT_COLOR_MODE, isColorMode),
);
let initialized = false;

function isTheme(value: string): value is Theme {
  return GEO_THEME_OPTIONS.some((item) => item.value === value);
}

function isColorMode(value: string): value is ColorMode {
  return value === 'light' || value === 'dark';
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME;
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY) || '';
  const normalized = LEGACY_THEME_ALIASES[stored] || stored;
  if (!isTheme(normalized)) {
    return DEFAULT_THEME;
  }

  if (normalized !== stored) {
    window.localStorage.setItem(THEME_STORAGE_KEY, normalized);
  }
  return normalized;
}

function isModeAvailable(themeName: Theme, colorMode: ColorMode) {
  return GEO_THEME_MODES[themeName].includes(colorMode);
}

function readStoredValue<T extends string>(
  key: string,
  fallback: T,
  validate: (value: string) => value is T,
): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const stored = window.localStorage.getItem(key);
  return stored && validate(stored) ? stored : fallback;
}

const resolvedMode = computed<ResolvedColorMode>(() => mode.value);

function applyTheme() {
  if (!isGeoApp || typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const isDark = resolvedMode.value === 'dark';

  // data-geo-theme is intentionally separate from Vben's data-theme, which
  // already represents its built-in primary-color presets for the SCRM app.
  root.classList.add('geo-app');
  root.dataset.geoTheme = theme.value;
  root.dataset.geoColorMode = mode.value;
  root.dataset.geoResolvedColorMode = resolvedMode.value;
  root.classList.toggle('geo-dark', isDark);
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = resolvedMode.value;

  // The shared Vben preference manager writes its built-in blue primary color
  // inline on <html>. GEO owns its primary token per palette, so remove only
  // that stale inline value and let geo-theme.css resolve the active token.
  root.style.removeProperty('--primary');
}

export function initTheme() {
  if (initialized || !isGeoApp) {
    return;
  }

  initialized = true;
  if (!isModeAvailable(theme.value, mode.value)) {
    mode.value = 'light';
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode.value);
    }
  }
  applyTheme();
}

export function useTheme() {
  initTheme();

  function setTheme(nextTheme: Theme) {
    theme.value = nextTheme;
    if (!isModeAvailable(nextTheme, mode.value)) {
      mode.value = 'light';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode.value);
      }
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    }
    applyTheme();
  }

  function setMode(nextMode: ColorMode) {
    if (!isModeAvailable(theme.value, nextMode)) {
      return;
    }
    mode.value = nextMode;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, nextMode);
    }
    applyTheme();
  }

  const availableModes = computed(() =>
    COLOR_MODE_OPTIONS.filter((item) =>
      isModeAvailable(theme.value, item.value),
    ),
  );

  return {
    availableModes,
    mode,
    resolvedMode,
    setMode,
    setTheme,
    theme,
    themes: GEO_THEME_OPTIONS,
  };
}

export {
  COLOR_MODE_STORAGE_KEY,
  DEFAULT_COLOR_MODE,
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
};
