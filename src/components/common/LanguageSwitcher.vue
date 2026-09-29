<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Languages } from '@lucide/vue'
import { setAppLocale, type AppLocale } from '../../i18n'

const { locale, t } = useI18n()

// Short labels shown on the buttons; the full names come from the locale files
const languages: { code: AppLocale; short: string; nameKey: string }[] = [
  { code: 'en', short: 'EN', nameKey: 'language.english' },
  { code: 'ms', short: 'BM', nameKey: 'language.malay' },
]
</script>

<template>
  <div class="language-switcher" role="group" :aria-label="t('language.label')">
    <Languages class="language-icon" :size="15" :stroke-width="2.25" aria-hidden="true" />
    <button
      v-for="lang in languages"
      :key="lang.code"
      type="button"
      class="language-option"
      :class="{ active: locale === lang.code }"
      :aria-pressed="locale === lang.code"
      :title="t(lang.nameKey)"
      @click="setAppLocale(lang.code)"
    >
      {{ lang.short }}
    </button>
  </div>
</template>

<style scoped>
.language-switcher {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 3px 2px 8px;
  border: 1px solid #d9dce3;
  border-radius: 999px;
  background: #fff;
  color: #5b6272;
  flex-shrink: 0;
}

.language-icon {
  margin-right: 3px;
}

.language-option {
  min-width: 32px;
  padding: 3px 8px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.4;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.language-option:hover:not(.active) {
  background: #f1f3f7;
  color: #1f2430;
}

.language-option.active {
  background: #4f46e5;
  color: #fff;
}

.language-option:focus-visible {
  outline: 2px solid #4f46e5;
  outline-offset: 1px;
}
</style>
