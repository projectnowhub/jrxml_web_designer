<template>
  <div class="prop-panel table-properties">
    <h4 class="prop-heading-md">{{ t("properties.tableProperties") }}</h4>

    <!-- Data Source Info -->
    <div class="prop-form-group">
      <label class="prop-label">{{ t("table.dataSource") }}</label>
      <input
        :value="element.dataset?.name || 'Main Table Data'"
        @input="updateDatasetProperty('name', ($event.target as HTMLInputElement).value)"
        type="text"
        :placeholder="t('table.dataSourcePlaceholder')"
        class="prop-input"
      />
    </div>

    <!-- Divider -->
    <div class="prop-divider"></div>

    <!-- Table styles -->
    <div class="prop-form-group">
      <h5 class="prop-heading-sm">{{ t("table.styles") }}</h5>

      <div class="prop-style-select">
        <!-- Table header style -->
        <div>
          <label>{{ t("table.tableHeaderStyle") }}</label>
          <span class="prop-select-wrap">
            <select
              :value="element.styles?.tableHeader || 'Table_TH'"
              @input="updateStyleProperty('tableHeader', ($event.target as HTMLSelectElement).value)"
              class="prop-select"
            >
              <option v-for="style in availableStyles" :key="style" :value="style">{{ style }}</option>
            </select>
            <ChevronDown class="prop-select-chevron" :size="14" aria-hidden="true" />
          </span>
        </div>

        <!-- Column header style -->
        <div>
          <label>{{ t("table.columnHeaderStyle") }}</label>
          <span class="prop-select-wrap">
            <select
              :value="element.styles?.columnHeader || 'Table_CH'"
              @input="updateStyleProperty('columnHeader', ($event.target as HTMLSelectElement).value)"
              class="prop-select"
            >
              <option v-for="style in availableStyles" :key="style" :value="style">{{ style }}</option>
            </select>
            <ChevronDown class="prop-select-chevron" :size="14" aria-hidden="true" />
          </span>
        </div>

        <!-- Detail style -->
        <div>
          <label>{{ t("table.detailStyle") }}</label>
          <span class="prop-select-wrap">
            <select
              :value="element.styles?.detail || 'Table_TD'"
              @input="updateStyleProperty('detail', ($event.target as HTMLSelectElement).value)"
              class="prop-select"
            >
              <option v-for="style in availableStyles" :key="style" :value="style">{{ style }}</option>
            </select>
            <ChevronDown class="prop-select-chevron" :size="14" aria-hidden="true" />
          </span>
        </div>

        <!-- Column footer style -->
        <div>
          <label>{{ t("table.columnFooterStyle") }}</label>
          <span class="prop-select-wrap">
            <select
              :value="element.styles?.columnFooter || 'Table_CH'"
              @input="updateStyleProperty('columnFooter', ($event.target as HTMLSelectElement).value)"
              class="prop-select"
            >
              <option v-for="style in availableStyles" :key="style" :value="style">{{ style }}</option>
            </select>
            <ChevronDown class="prop-select-chevron" :size="14" aria-hidden="true" />
          </span>
        </div>

        <!-- Table footer style -->
        <div>
          <label>{{ t("table.tableFooterStyle") }}</label>
          <span class="prop-select-wrap">
            <select
              :value="element.styles?.tableFooter || 'Table_TH'"
              @input="updateStyleProperty('tableFooter', ($event.target as HTMLSelectElement).value)"
              class="prop-select"
            >
              <option v-for="style in availableStyles" :key="style" :value="style">{{ style }}</option>
            </select>
            <ChevronDown class="prop-select-chevron" :size="14" aria-hidden="true" />
          </span>
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div class="prop-divider"></div>

    <!-- Print headers -->
    <div class="prop-form-group">
      <SwitchControl
        :model-value="element.printHeaders !== false"
        @update:model-value="updateProperty('printHeaders', $event)"
        :label="t('table.printHeaders')"
        :description="t('table.printHeadersDescription')"
      />
    </div>

    <!-- Divider -->
    <div class="prop-divider"></div>

    <!-- Row group management -->
    <div class="prop-form-group">
      <h5 class="prop-heading-sm">{{ t("table.rowGroups") }}</h5>
      <div class="prop-list">
        <div
          v-for="(group, index) in element.rowGroups || []"
          :key="index"
          class="prop-list-item"
        >
          <span class="prop-list-item-name">{{ group.name || t('table.groupName', { number: Number(index) + 1 }) }}</span>
          <div class="prop-list-item-actions">
            <button @click="removeRowGroup(Number(index))" class="prop-btn-danger prop-btn-sm">{{ t("actions.delete") }}</button>
          </div>
        </div>
        <div v-if="!element.rowGroups || element.rowGroups.length === 0" class="prop-hint" style="padding: 8px 12px;">{{ t("table.noRowGroups") }}</div>
      </div>
      <button @click="addRowGroup" class="prop-btn-default" style="width: 100%; margin-top: 8px;">{{ t("table.addRowGroup") }}</button>
    </div>

    <!-- Divider -->
    <div class="prop-divider"></div>

    <!-- Style inheritance -->
    <div class="prop-form-group">
      <label class="prop-label">{{ t("styleManagement.parentStyle") }}</label>
      <span class="prop-select-wrap">
        <select
          :value="element.parentStyle || ''"
          @input="updateProperty('parentStyle', ($event.target as HTMLSelectElement).value)"
          class="prop-select"
        >
          <option value="">{{ t("properties.none") }}</option>
          <option v-for="style in availableStyles" :key="style" :value="style">{{ style }}</option>
        </select>
        <ChevronDown class="prop-select-chevron" :size="14" aria-hidden="true" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ChevronDown } from '@lucide/vue';
import SwitchControl from './common/SwitchControl.vue';

const { t } = useI18n();

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
  padding: 0;
}

/* Style select items use vertical layout (label above select) within prop-style-select */
.prop-style-select > div {
  display: flex;
  flex-direction: column;
  gap: var(--prop-spacing-xs);
}

.prop-style-select > div label {
  font-size: 11px;
  font-weight: 500;
  color: var(--prop-text-secondary);
}
</style>
