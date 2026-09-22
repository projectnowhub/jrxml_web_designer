<template>
  <div class="visibility-condition-builder">
    <!-- Preset Selection -->
    <div class="form-group mb-2">
      <label class="control-label">{{ t("displayRules.ruleType") }}</label>
      <select v-model="selectedPreset" @change="handlePresetChange" class="form-select">
        <option value="always">{{ t("displayRules.alwaysShow") }}</option>
        <option value="first_page_only">{{ t("displayRules.firstPageOnly") }}</option>
        <option value="hide_first_page">{{ t("displayRules.hideOnFirstPage") }}</option>
        <option value="last_page_only">{{ t("displayRules.lastPageOnly") }}</option>
        <option value="custom">{{ t("displayRules.customCondition") }}</option>
      </select>
    </div>

    <!-- Custom Condition Builder -->
    <div v-if="selectedPreset === 'custom'" class="custom-conditions-panel">
      <div class="conditions-list">
        <div
          v-for="(cond, index) in conditions"
          :key="index"
          class="condition-row"
        >
          <!-- Logic separator for 2nd+ condition -->
          <div v-if="index > 0" class="logic-operator">
            <span class="logic-badge">{{ logicOperator }}</span>
          </div>

          <div class="condition-inputs">
            <!-- Field select -->
            <select v-model="cond.field" @change="compileAndEmit" class="form-select field-select">
              <option value="" disabled>{{ t("displayRules.selectField") }}</option>
              <optgroup v-if="reportFields && reportFields.length > 0" :label="t('displayRules.fieldsGroup')">
                <option v-for="f in reportFields" :key="'f_' + f.name" :value="'$F{' + f.name + '}'">
                  {{ f.name }}
                </option>
              </optgroup>
              <optgroup v-if="reportParameters && reportParameters.length > 0" :label="t('displayRules.parametersGroup')">
                <option v-for="p in reportParameters" :key="'p_' + p.name" :value="'$P{' + p.name + '}'">
                  {{ p.name }}
                </option>
              </optgroup>
              <optgroup :label="t('displayRules.documentVarsGroup')">
                <option value="$V{PAGE_NUMBER}">{{ t("displayRules.pageNumber") }}</option>
                <option value="$V{REPORT_COUNT}">{{ t("displayRules.recordCount") }}</option>
              </optgroup>
            </select>

            <!-- Operator select -->
            <select v-model="cond.operator" @change="compileAndEmit" class="form-select op-select">
              <option value="equals">{{ t("displayRules.opEquals") }}</option>
              <option value="not_equals">{{ t("displayRules.opNotEquals") }}</option>
              <option value="gt">{{ t("displayRules.opGreaterThan") }}</option>
              <option value="lt">{{ t("displayRules.opLessThan") }}</option>
              <option value="gte">{{ t("displayRules.opGreaterOrEqual") }}</option>
              <option value="lte">{{ t("displayRules.opLessOrEqual") }}</option>
              <option value="contains">{{ t("displayRules.opContains") }}</option>
              <option value="not_empty">{{ t("displayRules.opNotEmpty") }}</option>
              <option value="is_empty">{{ t("displayRules.opIsEmpty") }}</option>
            </select>

            <!-- Value input (not needed for is_empty / not_empty) -->
            <input
              v-if="cond.operator !== 'is_empty' && cond.operator !== 'not_empty'"
              v-model="cond.value"
              @input="compileAndEmit"
              type="text"
              :placeholder="t('displayRules.enterValue')"
              class="form-input value-input"
            />

            <!-- Remove row button -->
            <button
              v-if="conditions.length > 1"
              @click="removeCondition(index)"
              type="button"
              class="remove-cond-btn"
              title="Remove condition"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- Add condition button & logic operator toggle -->
      <div class="condition-actions">
        <button @click="addCondition" type="button" class="add-cond-btn">
          + {{ t("displayRules.addCondition") }}
        </button>

        <div v-if="conditions.length > 1" class="logic-toggle">
          <label>{{ t("displayRules.matchType") }}:</label>
          <select v-model="logicOperator" @change="compileAndEmit" class="form-select select-sm">
            <option value="AND">{{ t("displayRules.allMustMatch") }} (AND)</option>
            <option value="OR">{{ t("displayRules.anyCanMatch") }} (OR)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Informational summary badge -->
    <div v-if="selectedPreset !== 'always'" class="rule-summary">
      <span class="summary-icon">👁️</span>
      <span class="summary-text">{{ ruleSummaryText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface Condition {
  field: string;
  operator: 'equals' | 'not_equals' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_empty' | 'is_empty';
  value: string;
}

const props = defineProps<{
  modelValue?: string;
  reportFields?: Array<{ name: string; class?: string }>;
  reportParameters?: Array<{ name: string; class?: string }>;
  reportVariables?: Array<{ name: string; class?: string }>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const selectedPreset = ref<'always' | 'first_page_only' | 'hide_first_page' | 'last_page_only' | 'custom'>('always');
const logicOperator = ref<'AND' | 'OR'>('AND');
const conditions = ref<Condition[]>([
  { field: '', operator: 'equals', value: '' }
]);

// Parse incoming JRXML expression into visual state
function parseExpression(expr: string | undefined | null) {
  if (!expr || expr.trim() === '') {
    selectedPreset.value = 'always';
    return;
  }
  const clean = expr.trim();
  if (clean === '$V{PAGE_NUMBER} == 1' || clean === '$V{PAGE_NUMBER}.equals(1)') {
    selectedPreset.value = 'first_page_only';
  } else if (clean === '$V{PAGE_NUMBER} > 1') {
    selectedPreset.value = 'hide_first_page';
  } else if (clean === '$V{PAGE_NUMBER} == $V{PAGE_COUNT}') {
    selectedPreset.value = 'last_page_only';
  } else {
    // Try to parse basic condition
    selectedPreset.value = 'custom';
    
    // Check for not_empty
    const notEmptyMatch = clean.match(/(\$[FPV]\{[^}]+\})\s*!=\s*null\s*&&\s*!\1\.toString\(\)\.trim\(\)\.isEmpty\(\)/);
    if (notEmptyMatch && notEmptyMatch[1]) {
      conditions.value = [{ field: notEmptyMatch[1], operator: 'not_empty', value: '' }];
      return;
    }
    
    // Check for is_empty
    const isEmptyMatch = clean.match(/(\$[FPV]\{[^}]+\})\s*==\s*null\s*\|\|\s*\1\.toString\(\)\.trim\(\)\.isEmpty\(\)/);
    if (isEmptyMatch && isEmptyMatch[1]) {
      conditions.value = [{ field: isEmptyMatch[1], operator: 'is_empty', value: '' }];
      return;
    }

    // Check for equals string
    const equalsMatch = clean.match(/(\$[FPV]\{[^}]+\})\s*!=\s*null\s*&&\s*\1\.toString\(\)\.equals\("([^"]*)"\)/);
    if (equalsMatch && equalsMatch[1]) {
      conditions.value = [{ field: equalsMatch[1], operator: 'equals', value: equalsMatch[2] || '' }];
      return;
    }

    // Check for comparison: $F{x} > 100
    const compMatch = clean.match(/(\$[FPV]\{[^}]+\})\s*(>|<|>=|<=|==|!=)\s*([0-9.]+)/);
    if (compMatch && compMatch[1] && compMatch[2]) {
      const opMap: Record<string, Condition['operator']> = {
        '>': 'gt',
        '<': 'lt',
        '>=': 'gte',
        '<=': 'lte',
        '==': 'equals',
        '!=': 'not_equals'
      };
      conditions.value = [{
        field: compMatch[1],
        operator: opMap[compMatch[2]] || 'equals',
        value: compMatch[3] || ''
      }];
      return;
    }

    // If already has default field, use it
    if (conditions.value.length === 0 || !conditions.value[0]?.field) {
      const firstField = props.reportFields?.[0]?.name ? `$F{${props.reportFields[0].name}}` : '$V{PAGE_NUMBER}';
      conditions.value = [{ field: firstField, operator: 'equals', value: '' }];
    }
  }
}

function handlePresetChange() {
  if (selectedPreset.value === 'always') {
    emit('update:modelValue', '');
  } else if (selectedPreset.value === 'first_page_only') {
    emit('update:modelValue', '$V{PAGE_NUMBER} == 1');
  } else if (selectedPreset.value === 'hide_first_page') {
    emit('update:modelValue', '$V{PAGE_NUMBER} > 1');
  } else if (selectedPreset.value === 'last_page_only') {
    emit('update:modelValue', '$V{PAGE_NUMBER} == $V{PAGE_COUNT}');
  } else if (selectedPreset.value === 'custom') {
    if (!conditions.value[0]?.field) {
      const firstField = props.reportFields?.[0]?.name ? `$F{${props.reportFields[0].name}}` : '$V{PAGE_NUMBER}';
      if (conditions.value[0]) {
        conditions.value[0].field = firstField;
      } else {
        conditions.value = [{ field: firstField, operator: 'equals', value: '' }];
      }
    }
    compileAndEmit();
  }
}

function addCondition() {
  const firstField = props.reportFields?.[0]?.name ? `$F{${props.reportFields[0].name}}` : '$V{PAGE_NUMBER}';
  conditions.value.push({ field: firstField, operator: 'equals', value: '' });
  compileAndEmit();
}

function removeCondition(index: number) {
  conditions.value.splice(index, 1);
  compileAndEmit();
}

function compileCondition(c: Condition): string {
  if (!c.field) return '';
  const isNumber = !isNaN(Number(c.value)) && c.value.trim() !== '';

  switch (c.operator) {
    case 'not_empty':
      return `${c.field} != null && !${c.field}.toString().trim().isEmpty()`;
    case 'is_empty':
      return `${c.field} == null || ${c.field}.toString().trim().isEmpty()`;
    case 'contains':
      return `${c.field} != null && ${c.field}.toString().contains("${c.value || ''}")`;
    case 'equals':
      if (isNumber) {
        return `${c.field} == ${c.value}`;
      }
      return `${c.field} != null && ${c.field}.toString().equals("${c.value || ''}")`;
    case 'not_equals':
      if (isNumber) {
        return `${c.field} != ${c.value}`;
      }
      return `${c.field} == null || !${c.field}.toString().equals("${c.value || ''}")`;
    case 'gt':
      return `${c.field} > ${isNumber ? c.value : 0}`;
    case 'lt':
      return `${c.field} < ${isNumber ? c.value : 0}`;
    case 'gte':
      return `${c.field} >= ${isNumber ? c.value : 0}`;
    case 'lte':
      return `${c.field} <= ${isNumber ? c.value : 0}`;
    default:
      return '';
  }
}

function compileAndEmit() {
  if (selectedPreset.value !== 'custom') return;
  const compiledParts = conditions.value
    .map(c => compileCondition(c))
    .filter(p => p.length > 0);

  if (compiledParts.length === 0) {
    emit('update:modelValue', '');
    return;
  }

  const joiner = logicOperator.value === 'AND' ? ' && ' : ' || ';
  const result = compiledParts.length > 1 
    ? compiledParts.map(p => `(${p})`).join(joiner)
    : (compiledParts[0] || '');

  emit('update:modelValue', result);
}

const ruleSummaryText = computed(() => {
  if (selectedPreset.value === 'first_page_only') return t('displayRules.summaryFirstPage');
  if (selectedPreset.value === 'hide_first_page') return t('displayRules.summaryHideFirstPage');
  if (selectedPreset.value === 'last_page_only') return t('displayRules.summaryLastPage');
  if (selectedPreset.value === 'custom') {
    const valid = conditions.value.filter(c => c.field);
    if (valid.length === 0) return t('displayRules.customCondition');
    return t('displayRules.summaryCustomActive', { count: valid.length });
  }
  return '';
});

watch(() => props.modelValue, (newVal) => {
  parseExpression(newVal);
}, { immediate: true });

onMounted(() => {
  parseExpression(props.modelValue);
});
</script>

<style scoped>
.visibility-condition-builder {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #4b5563;
  margin-bottom: 4px;
}

.form-select, .form-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  color: #1f2937;
  background-color: #ffffff;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.form-select:focus, .form-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.custom-conditions-panel {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.conditions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.condition-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.logic-operator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 2px 0;
}

.logic-badge {
  background: #e0e7ff;
  color: #3730a3;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  text-transform: uppercase;
}

.condition-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.field-select {
  flex: 1.2;
  min-width: 110px;
}

.op-select {
  flex: 1.1;
  min-width: 110px;
}

.value-input {
  flex: 1.2;
  min-width: 100px;
}

.remove-cond-btn {
  background: transparent;
  border: none;
  color: #9ca3af;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  line-height: 1;
}

.remove-cond-btn:hover {
  color: #ef4444;
  background: #fee2e2;
}

.condition-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
}

.add-cond-btn {
  background: #ffffff;
  border: 1px dashed #d1d5db;
  color: #2563eb;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.add-cond-btn:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

.logic-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #6b7280;
}

.select-sm {
  padding: 3px 6px;
  font-size: 11px;
  width: auto;
}

.rule-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  font-size: 12px;
  color: #1e40af;
}

.summary-icon {
  font-size: 14px;
}
</style>
