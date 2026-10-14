import type { Theme } from '#/composables/useTheme';

import { computed } from 'vue';

import { useTheme } from '#/composables/useTheme';

export const BRAND_MARK_BY_THEME: Readonly<Record<Theme, string>> = {
  default: '/geo-brand/logo-default.png',
  nordic: '/geo-brand/logo-nordic.png',
  // Keep the existing public asset names stable; these two files were
  // generated with their palette names crossed, so the visual pairing lives
  // here with the actual theme tokens.
  'structured-soft': '/geo-brand/logo-warm-editorial.png',
  'warm-editorial': '/geo-brand/logo-structured-soft.png',
};

export function useBrandMark() {
  const { theme } = useTheme();

  return computed(
    () => BRAND_MARK_BY_THEME[theme.value] ?? BRAND_MARK_BY_THEME.default,
  );
}
