<template>
  <div class="frame-properties">
    <h4>Frame Properties</h4>

    <!-- Layout mode -->
    <div class="form-group">
      <SelectControl
        :model-value="element.layout || 'FreeLayout'"
        @update:model-value="updateProperty('layout', $event)"
        :options="layoutOptions"
        label="Layout mode"
        description="Choose how the Frame lays out its content"
      />
    </div>

    <!-- Print-when expression -->
    <div class="form-group">
      <label>Print-when expression</label>
      <ExpressionEditor
        :model-value="element.printWhenExpression || ''"
        @update:model-value="updateProperty('printWhenExpression', $event)"
        placeholder="e.g.: $F{status}.equals(&quot;active&quot;)"
        :report-fields="reportFields"
        :report-parameters="reportParameters"
        :report-variables="reportVariables"
      />
      <span class="form-hint">This Frame prints when the expression evaluates to true</span>
    </div>

    <!-- Pagination control -->
    <div class="form-group">
      <SwitchControl
        :model-value="element.isIgnorePagination || false"
        @update:model-value="updateProperty('isIgnorePagination', $event)"
        label="Ignore pagination"
        description="Frame content will not be split across pages"
      />
    </div>

    <!-- Split control -->
    <div class="form-group">
      <SwitchControl
        :model-value="element.isSplitAllowed !== false"
        @update:model-value="updateProperty('isSplitAllowed', $event)"
        label="Allow split"
        description="Allow the Frame to be split across pages"
      />
    </div>

    <!-- Split type -->
    <div v-if="element.isSplitAllowed !== false" class="form-group">
      <SelectControl
        :model-value="element.splitType || 'Stretch'"
        @update:model-value="updateProperty('splitType', $event)"
        :options="splitTypeOptions"
        label="Split type"
        description="Choose how the Frame is handled when split"
      />
    </div>

    <!-- Print control -->
    <div class="form-group">
      <SwitchControl
        :model-value="element.isPrintRepeatedValues !== false"
        @update:model-value="updateProperty('isPrintRepeatedValues', $event)"
        label="Print repeated values"
        description="Whether to print repeated values"
      />
    </div>

    <!-- Remove blank line -->
    <div class="form-group">
      <SwitchControl
        :model-value="element.isRemoveLineWhenBlank || false"
        @update:model-value="updateProperty('isRemoveLineWhenBlank', $event)"
        label="Remove line when blank"
        description="Remove the entire row when the Frame content is empty"
      />
    </div>

    <!-- Background color -->
    <div class="form-group">
      <label>Background color</label>
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
        label="Display mode"
        description="Opaque shows the background, Transparent is see-through"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ExpressionEditor from './common/ExpressionEditor.vue';
import SwitchControl from './common/SwitchControl.vue';
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

const layoutOptions = [
  { value: 'FreeLayout', label: 'Free layout' },
  { value: 'HorizontalLayout', label: 'Horizontal layout' },
  { value: 'VerticalLayout', label: 'Vertical layout' }
];

const splitTypeOptions = [
  { value: 'Stretch', label: 'Stretch' },
  { value: 'Prevent', label: 'Prevent' },
  { value: 'Immediate', label: 'Immediate' }
];

const modeOptions = [
  { value: 'Opaque', label: 'Opaque' },
  { value: 'Transparent', label: 'Transparent' }
];

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
