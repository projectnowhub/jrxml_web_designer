<template>
  <div class="frame-properties">
    <div class="frame-card-head">
      <h5>{{ isPageBorder ? t("framePresets.pageBorderTitle") : t("frame.title") }}</h5>
      <span v-if="!activePreset" class="custom-badge">{{ t("framePresets.custom") }}</span>
    </div>

    <!-- Border presets (one active at a time) -->
    <span class="field-label">{{ t("framePresets.styleLabel") }}</span>
    <div class="preset-grid" role="radiogroup" :aria-label="t('framePresets.styleLabel')">
      <button
        v-for="preset in BORDER_PRESETS"
        :key="preset.id"
        type="button"
        role="radio"
        class="preset-swatch"
        :class="{ active: activePreset === preset.id }"
        :aria-checked="activePreset === preset.id"
        :title="t(preset.labelKey)"
        @click="applyPreset(preset)"
      >
        <span class="preset-sample-wrap">
          <span class="preset-sample" :class="{ 'is-none': preset.id === 'none' }" :style="previewStyle(preset)"></span>
        </span>
        <span class="preset-name">{{ t(preset.labelKey) }}</span>
      </button>
    </div>
    <p class="form-hint">{{ t("framePresets.customizeHint") }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  applyBorderPreset,
  BORDER_PRESETS,
  BORDER_SIDES,
  getActiveBorderPreset,
  getSidePen,
  type BorderPreset,
} from '../../../utils/framePresets';

const props = defineProps<{
  element: any;
  // Frame lives in the Background band (drawn on every page)
  isPageBorder?: boolean;
  reportFields?: Array<{ name: string; class?: string }>;
  reportParameters?: Array<{ name: string; class?: string }>;
  reportVariables?: Array<{ name: string; class?: string }>;
}>();

const emit = defineEmits<{
  'update:element': [element: any];
}>();

const { t } = useI18n();

const activePreset = computed(() => getActiveBorderPreset(props.element.box));

// Legacy root-level border fields (older imports) are dropped so they can't add
// lines back on sides the preset leaves off
const applyPreset = (preset: BorderPreset) => {
  const box = applyBorderPreset(props.element.box, preset.id);
  const { border, borderWidth, borderStyle, borderColor, ...rest } = props.element;
  emit('update:element', { ...rest, box });
};

// Small swatch showing roughly what the preset looks like
const previewStyle = (preset: BorderPreset) => {
  const pens = preset.pens();
  const css = (side: (typeof BORDER_SIDES)[number]) => {
    const pen = getSidePen(pens, side);
    if (!pen) return 'none';
    const px = pen.lineStyle === 'Double' ? 3 : Math.max(1, Math.round(pen.lineWidth ?? 1));
    return `${px}px ${pen.lineStyle!.toLowerCase()} ${pen.lineColor}`;
  };
  // "None" keeps the dashed placeholder outline from CSS
  if (preset.id === 'none') return {};
  return {
    borderTop: css('top'),
    borderRight: css('right'),
    borderBottom: css('bottom'),
    borderLeft: css('left'),
  };
};
</script>

<style scoped>
/* Card, matching the property panel's other sections */
.frame-properties {
  margin-bottom: var(--prop-spacing-md);
  padding: var(--prop-spacing-sm);
  background-color: var(--prop-bg-secondary);
  border-radius: var(--prop-border-radius-md);
}

.frame-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.frame-card-head h5 {
  margin: 0;
  font-size: var(--prop-font-size-sm);
  font-weight: 600;
  color: var(--prop-text-primary, #374151);
}

.custom-badge {
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(24, 144, 255, 0.1);
  font-size: 10px;
  font-weight: 600;
  color: var(--prop-border-focus, #1890ff);
}

.field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 500;
  color: var(--prop-text-secondary, #6b7280);
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 8px;
}

.preset-swatch {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 6px;
  background: #fff;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.preset-swatch:hover {
  border-color: var(--prop-border-hover, #9ca3af);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
}

.preset-swatch.active {
  border-color: var(--prop-border-focus, #1890ff);
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.preset-swatch:focus-visible {
  outline: none;
  border-color: var(--prop-border-focus, #1890ff);
  box-shadow: var(--prop-focus-ring);
}

/* Small "page" the border is drawn on */
.preset-sample-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  border-radius: 5px;
  background: var(--prop-bg-tertiary, #f3f4f6);
}

.preset-swatch.active .preset-sample-wrap {
  background: rgba(24, 144, 255, 0.08);
}

.preset-sample {
  display: block;
  width: 46px;
  height: 30px;
  box-sizing: border-box;
  background: #fff;
}

.preset-sample.is-none {
  border: 1px dashed #d1d5db;
  background: transparent;
}

.preset-name {
  font-size: 11px;
  line-height: 1.2;
  color: var(--prop-text-secondary, #6b7280);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preset-swatch.active .preset-name {
  color: var(--prop-border-focus, #1890ff);
  font-weight: 600;
}

.form-hint {
  margin: 10px 0 0;
  font-size: var(--prop-font-size-xs);
  color: var(--prop-text-tertiary);
}
</style>
