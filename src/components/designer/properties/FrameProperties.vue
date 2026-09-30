<template>
  <div class="frame-properties">
    <h4>{{ isPageBorder ? t("framePresets.pageBorderTitle") : t("frame.title") }}</h4>

    <!-- Border presets (one active at a time) -->
    <div class="form-group">
      <label>{{ t("framePresets.styleLabel") }}</label>
      <div class="preset-grid" role="radiogroup">
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
          <span class="preset-sample" :style="previewStyle(preset)"></span>
          <span class="preset-name">{{ t(preset.labelKey) }}</span>
        </button>
      </div>
      <span v-if="!activePreset" class="form-hint">{{ t("framePresets.custom") }}</span>
      <span class="form-hint">{{ t("framePresets.customizeHint") }}</span>
    </div>

    <!-- Layout of the items inside (a page border has none) -->
    <div v-if="!isPageBorder" class="form-group">
      <SelectControl
        :model-value="element.layout || 'FreeLayout'"
        @update:model-value="updateProperty('layout', $event)"
        :options="layoutOptions"
        :label="t('frame.layout')"
        :description="t('frame.layoutDescription')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import SelectControl from './common/SelectControl.vue';
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

const layoutOptions = computed(() => [
  { value: 'FreeLayout', label: `🖐️ ${t('frame.layoutFree')}` },
  { value: 'HorizontalLayout', label: `↔️ ${t('frame.layoutRow')}` },
  { value: 'VerticalLayout', label: `↕️ ${t('frame.layoutStack')}` }
]);

const activePreset = computed(() => getActiveBorderPreset(props.element.box));
const updateProperty = (property: string, value: any) => {
  const updatedElement = { ...props.element };
  updatedElement[property] = value;
  emit('update:element', updatedElement);
};

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
.frame-properties {
  padding: var(--prop-spacing-lg) 0;
}

.frame-properties h4 {
  margin: 0 0 var(--prop-spacing-lg) 0;
  padding: 0 0 var(--prop-spacing-sm) 0;
  font-size: var(--prop-font-size-md);
  color: var(--prop-text-primary);
  font-weight: var(--prop-font-weight-semibold);
  border-bottom: 1px solid var(--prop-divider-color);
}

.form-group {
  margin-bottom: var(--prop-spacing-lg);
}

.form-group > label {
  display: block;
  margin-bottom: var(--prop-spacing-xs);
  font-size: var(--prop-font-size-sm);
  color: var(--prop-text-secondary);
  font-weight: var(--prop-font-weight-medium);
}

.form-hint {
  display: block;
  margin-top: var(--prop-spacing-xs);
  font-size: var(--prop-font-size-xs);
  color: var(--prop-text-tertiary);
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: var(--prop-spacing-sm);
}

.preset-swatch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 4px;
  background: transparent;
  border: 1px solid var(--prop-border-color);
  border-radius: var(--prop-border-radius-md);
  cursor: pointer;
  transition: border-color var(--prop-transition-fast), box-shadow var(--prop-transition-fast);
}

.preset-swatch:hover {
  border-color: var(--prop-border-hover);
}

.preset-swatch.active {
  border-color: var(--prop-border-focus);
  box-shadow: var(--prop-focus-ring);
  background-color: rgba(24, 144, 255, 0.06);
}

.preset-swatch:focus-visible {
  outline: none;
  border-color: var(--prop-border-focus);
  box-shadow: var(--prop-focus-ring);
}

.preset-sample {
  display: block;
  width: 40px;
  height: 26px;
  box-sizing: border-box;
  border: 1px dashed #d9d9d9;
}

.preset-name {
  font-size: var(--prop-font-size-xs);
  color: var(--prop-text-secondary);
  text-align: center;
  line-height: 1.2;
}

</style>
