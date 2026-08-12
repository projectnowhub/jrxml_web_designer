<template>
  <div class="prop-panel table-properties">
    <h4 class="prop-heading-md">Table Properties</h4>

    <!-- Dataset -->
    <div class="prop-form-group">
      <label class="prop-label">Dataset name</label>
      <input
        :value="element.dataset?.name || ''"
        @input="updateDatasetProperty('name', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="tableDataset"
        class="prop-input"
      />
    </div>

    <!-- Connection expression -->
    <div class="prop-form-group">
      <label class="prop-label">Connection expression</label>
      <ExpressionEditor
        :model-value="element.dataset?.connectionExpression || ''"
        @update:model-value="updateDatasetProperty('connectionExpression', $event)"
        placeholder="$P{REPORT_CONNECTION}"
        :report-fields="reportFields"
        :report-parameters="reportParameters"
        :report-variables="reportVariables"
      />
    </div>

    <!-- Query text -->
    <div class="prop-form-group">
      <label class="prop-label">Query text</label>
      <textarea
        :value="element.dataset?.query?.text || ''"
        @input="updateQueryProperty('text', ($event.target as HTMLTextAreaElement).value)"
        placeholder="SELECT * FROM table"
        rows="3"
        class="prop-textarea"
      ></textarea>
    </div>

    <!-- Query language -->
    <div class="prop-form-group">
      <SelectControl
        :model-value="element.dataset?.query?.language || 'sql'"
        @update:model-value="updateQueryProperty('language', $event)"
        :options="queryLanguageOptions"
        label="Query language"
      />
    </div>

    <!-- Divider -->
    <div class="prop-divider"></div>

    <!-- Table styles -->
    <div class="prop-form-group">
      <h5 class="prop-heading-sm">Table styles</h5>

      <div class="prop-style-select">
        <!-- Table header style -->
        <div>
          <label>Table header style</label>
          <select
            :value="element.styles?.tableHeader || 'Table_TH'"
            @input="updateStyleProperty('tableHeader', ($event.target as HTMLSelectElement).value)"
            class="prop-select"
          >
            <option v-for="style in availableStyles" :key="style" :value="style">{{ style }}</option>
          </select>
        </div>

        <!-- Column header style -->
        <div>
          <label>Column header style</label>
          <select
            :value="element.styles?.columnHeader || 'Table_CH'"
            @input="updateStyleProperty('columnHeader', ($event.target as HTMLSelectElement).value)"
            class="prop-select"
          >
            <option v-for="style in availableStyles" :key="style" :value="style">{{ style }}</option>
          </select>
        </div>

        <!-- Detail style -->
        <div>
          <label>Detail style</label>
          <select
            :value="element.styles?.detail || 'Table_TD'"
            @input="updateStyleProperty('detail', ($event.target as HTMLSelectElement).value)"
            class="prop-select"
          >
            <option v-for="style in availableStyles" :key="style" :value="style">{{ style }}</option>
          </select>
        </div>

        <!-- Column footer style -->
        <div>
          <label>Column footer style</label>
          <select
            :value="element.styles?.columnFooter || 'Table_CH'"
            @input="updateStyleProperty('columnFooter', ($event.target as HTMLSelectElement).value)"
            class="prop-select"
          >
            <option v-for="style in availableStyles" :key="style" :value="style">{{ style }}</option>
          </select>
        </div>

        <!-- Table footer style -->
        <div>
          <label>Table footer style</label>
          <select
            :value="element.styles?.tableFooter || 'Table_TH'"
            @input="updateStyleProperty('tableFooter', ($event.target as HTMLSelectElement).value)"
            class="prop-select"
          >
            <option v-for="style in availableStyles" :key="style" :value="style">{{ style }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div class="prop-divider"></div>

    <!-- When-no-data type -->
    <div class="prop-form-group">
      <SelectControl
        :model-value="element.whenNoDataType || 'AllSectionsNoDetail'"
        @update:model-value="updateProperty('whenNoDataType', $event)"
        :options="whenNoDataTypeOptions"
        label="When no data"
        description="How to handle the table when there is no data"
      />
    </div>

    <!-- Print headers -->
    <div class="prop-form-group">
      <SwitchControl
        :model-value="element.printHeaders !== false"
        @update:model-value="updateProperty('printHeaders', $event)"
        label="Print headers"
        description="Whether to print the table headers"
      />
    </div>

    <!-- Ignore width -->
    <div class="prop-form-group">
      <SwitchControl
        :model-value="element.ignoreWidth || false"
        @update:model-value="updateProperty('ignoreWidth', $event)"
        label="Ignore width"
        description="Ignore the table width constraint"
      />
    </div>

    <!-- Ignore pagination -->
    <div class="prop-form-group">
      <SwitchControl
        :model-value="element.isIgnorePagination || false"
        @update:model-value="updateProperty('isIgnorePagination', $event)"
        label="Ignore pagination"
        description="Table content will not be split across pages"
      />
    </div>

    <!-- Divider -->
    <div class="prop-divider"></div>

    <!-- Row group management -->
    <div class="prop-form-group">
      <h5 class="prop-heading-sm">Row groups</h5>
      <div class="prop-list">
        <div
          v-for="(group, index) in element.rowGroups || []"
          :key="index"
          class="prop-list-item"
        >
          <span class="prop-list-item-name">{{ group.name || `Group ${Number(index) + 1}` }}</span>
          <div class="prop-list-item-actions">
            <button @click="removeRowGroup(Number(index))" class="prop-btn-danger prop-btn-sm">Delete</button>
          </div>
        </div>
        <div v-if="!element.rowGroups || element.rowGroups.length === 0" class="prop-hint" style="padding: 8px 12px;">No row groups yet</div>
      </div>
      <button @click="addRowGroup" class="prop-btn-default" style="width: 100%; margin-top: 8px;">Add row group</button>
    </div>

    <!-- Divider -->
    <div class="prop-divider"></div>

    <!-- Style inheritance -->
    <div class="prop-form-group">
      <label class="prop-label">Parent style</label>
      <select
        :value="element.parentStyle || ''"
        @input="updateProperty('parentStyle', ($event.target as HTMLSelectElement).value)"
        class="prop-select"
      >
        <option value="">None</option>
        <option v-for="style in availableStyles" :key="style" :value="style">{{ style }}</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ExpressionEditor from './common/ExpressionEditor.vue';
import SwitchControl from './common/SwitchControl.vue';
import SelectControl from './common/SelectControl.vue';

const props = defineProps<{
  element: any;
  availableStyles?: string[];
  reportFields?: Array<{ name: string; class?: string }>;
  reportParameters?: Array<{ name: string; class?: string }>;
  reportVariables?: Array<{ name: string; class?: string }>;
}>();

const emit = defineEmits<{
  'update:element': [element: any];
}>();

const queryLanguageOptions = [
  { value: 'sql', label: 'SQL' },
  { value: 'xPath', label: 'XPath' },
  { value: 'HQL', label: 'HQL' },
  { value: 'EJBQL', label: 'EJBQL' },
  { value: 'MDX', label: 'MDX' }
];

const whenNoDataTypeOptions = [
  { value: 'Blank', label: 'Blank' },
  { value: 'NoDataCell', label: 'No-data cell' },
  { value: 'AllSectionsNoDetail', label: 'All sections, no detail' },
  { value: 'AllSectionsWithDetail', label: 'All sections, with detail' }
];

const updateProperty = (property: string, value: any) => {
  const updatedElement = { ...props.element };
  updatedElement[property] = value;
  emit('update:element', updatedElement);
};

const updateDatasetProperty = (property: string, value: any) => {
  const updatedElement = { ...props.element };
  if (!updatedElement.dataset) {
    updatedElement.dataset = {};
  }
  updatedElement.dataset[property] = value;
  emit('update:element', updatedElement);
};

const updateQueryProperty = (property: string, value: any) => {
  const updatedElement = { ...props.element };
  if (!updatedElement.dataset) {
    updatedElement.dataset = {};
  }
  if (!updatedElement.dataset.query) {
    updatedElement.dataset.query = { language: 'sql', text: '' };
  }
  updatedElement.dataset.query[property] = value;
  emit('update:element', updatedElement);
};

const updateStyleProperty = (property: string, value: any) => {
  const updatedElement = { ...props.element };
  if (!updatedElement.styles) {
    updatedElement.styles = {};
  }
  updatedElement.styles[property] = value;
  emit('update:element', updatedElement);
};

const addRowGroup = () => {
  const updatedElement = { ...props.element };
  if (!updatedElement.rowGroups) {
    updatedElement.rowGroups = [];
  }
  updatedElement.rowGroups.push({
    uuid: crypto.randomUUID(),
    name: `Group ${updatedElement.rowGroups.length + 1}`,
    height: 30,
    isStartNewPage: false,
    isRepeatHeader: false,
    expression: ''
  });
  emit('update:element', updatedElement);
};

const removeRowGroup = (index: number) => {
  const updatedElement = { ...props.element };
  if (updatedElement.rowGroups) {
    updatedElement.rowGroups.splice(index, 1);
    emit('update:element', updatedElement);
  }
};
</script>

<style scoped>
.table-properties {
  padding: var(--prop-spacing-lg);
}

/* Style select items use vertical layout (label above select) within prop-style-select */
.prop-style-select > div {
  display: flex;
  flex-direction: column;
  gap: var(--prop-spacing-xs);
}

.prop-style-select > div label {
  font-size: var(--prop-font-size-sm);
  color: var(--prop-text-secondary);
}
</style>
