<template>
  <div class="frame-properties">
    <h4>{{ t("frame.title") }}</h4>

    <!-- Layout mode -->
    <div class="form-group">
      <SelectControl
        :model-value="element.layout || 'FreeLayout'"
        @update:model-value="updateProperty('layout', $event)"
        :options="layoutOptions"
        :label="t('frame.layout')"
        :description="t('frame.layoutDescription')"
      />
    </div>


    <!-- Background color -->
    <div class="form-group">
      <label>{{ t("properties.backgroundColor") }}</label>
      <div class="color-input-group">
        <input
          type="color"
          :value="element.backcolor || '#FFFFFF'"
          @input="updateProperty('backcolor', ($event.target as HTMLInputElement).value)"
          class="color-input"
        />
        <input
          type="text"
          :value="element.backcolor || '#FFFFFF'"
          @input="updateProperty('backcolor', ($event.target as HTMLInputElement).value)"
          class="color-text"
          placeholder="#FFFFFF"
        />
      </div>
    </div>

    <!-- Display mode -->
    <div class="form-group">
      <SelectControl
        :model-value="element.mode || 'Transparent'"
        @update:model-value="updateProperty('mode', $event)"
        :options="modeOptions"
        :label="t('frame.mode')"
        :description="t('frame.modeDescription')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import SelectControl from './common/SelectControl.vue';

const props = defineProps<{
  element: any;
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

const modeOptions = computed(() => [
  { value: 'Opaque', label: t('properties.opaque') },
  { value: 'Transparent', label: t('properties.transparent') }
]);

const updateProperty = (property: string, value: any) => {
  const updatedElement = { ...props.element };
  updatedElement[property] = value;
  emit('update:element', updatedElement);
};
</script>

<style scoped>
.frame-properties {
  padding: var(--prop-spacing-lg);
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

.form-group label {
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

.color-input-group {
  display: flex;
  gap: var(--prop-spacing-sm);
  align-items: center;
}

.color-input {
  width: 32px;
  height: 32px;
  border: 1px solid var(--prop-border-color);
  border-radius: var(--prop-border-radius-md);
  cursor: pointer;
  padding: 2px;
}

.color-text {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--prop-border-color);
  border-radius: var(--prop-border-radius-md);
  font-family: monospace;
  font-size: var(--prop-font-size-sm);
  transition: border-color var(--prop-transition-fast), box-shadow var(--prop-transition-fast);
}

.color-text:hover {
  border-color: var(--prop-border-hover);
}

.color-text:focus {
  outline: none;
  border-color: var(--prop-border-focus);
  box-shadow: var(--prop-focus-ring);
}
</style>
