<template>
  <div class="expression-editor" ref="editorRef">
    <div class="expression-input-group">
      <input
        ref="inputRef"
        :value="modelValue"
        @input="handleInput"
        @keydown="handleKeydown"
        @focus="handleFocus"
        @blur="handleBlur"
        :placeholder="placeholder"
        class="expression-input"
      />
      <button
        @click="showHelp = !showHelp"
        class="help-button"
        title="Expression help"
      >
        ?
      </button>
    </div>

    <!-- Autocomplete dropdown -->
    <div v-if="showAutocomplete && filteredSuggestions.length > 0" class="autocomplete-dropdown">
      <div
        v-for="(item, index) in filteredSuggestions"
        :key="item.value"
        class="autocomplete-item"
        :class="{ active: index === activeSuggestionIndex }"
        @mousedown.prevent="selectSuggestion(item)"
        @mouseenter="activeSuggestionIndex = index"
      >
        <span class="autocomplete-type" :class="item.type">{{ item.typeLabel }}</span>
        <span class="autocomplete-value">{{ item.value }}</span>
        <span v-if="item.description" class="autocomplete-desc">{{ item.description }}</span>
      </div>
    </div>

    <!-- Expression help panel -->
    <div v-if="showHelp && !showAutocomplete" class="expression-help">
      <div class="help-section">
        <h5>Common expressions</h5>
        <div class="help-items">
          <div
            v-for="item in commonExpressions"
            :key="item.expression"
            class="help-item"
            @click="insertExpression(item.expression)"
          >
            <span class="expression-text">{{ item.expression }}</span>
            <span class="expression-desc">{{ item.description }}</span>
          </div>
        </div>
      </div>

      <div class="help-section">
        <h5>Field references</h5>
        <div class="help-items">
          <div class="help-item" @click="insertExpression('$F{fieldName}')">
            <span class="expression-text">$F{fieldName}</span>
            <span class="expression-desc">Field reference</span>
          </div>
          <div class="help-item" @click="insertExpression('$P{paramName}')">
            <span class="expression-text">$P{paramName}</span>
            <span class="expression-desc">Parameter reference</span>
          </div>
          <div class="help-item" @click="insertExpression('$V{variableName}')">
            <span class="expression-text">$V{variableName}</span>
            <span class="expression-desc">Variable reference</span>
          </div>
        </div>
      </div>

      <div class="help-section">
        <h5>Built-in variables</h5>
        <div class="help-items">
          <div class="help-item" @click="insertExpression('$V{REPORT_COUNT}')">
            <span class="expression-text">$V{REPORT_COUNT}</span>
            <span class="expression-desc">Total number of records read from the data source</span>
          </div>
          <div class="help-item" @click="insertExpression('$V{PAGE_NUMBER}')">
            <span class="expression-text">$V{PAGE_NUMBER}</span>
            <span class="expression-desc">Current page number (total page count once filling finishes)</span>
          </div>
          <div class="help-item" @click="insertExpression('$V{PAGE_COUNT}')">
            <span class="expression-text">$V{PAGE_COUNT}</span>
            <span class="expression-desc">Number of records processed while generating the current page</span>
          </div>
          <div class="help-item" @click="insertExpression('$V{COLUMN_NUMBER}')">
            <span class="expression-text">$V{COLUMN_NUMBER}</span>
            <span class="expression-desc">Current column number</span>
          </div>
          <div class="help-item" @click="insertExpression('$V{COLUMN_COUNT}')">
            <span class="expression-text">$V{COLUMN_COUNT}</span>
            <span class="expression-desc">Number of records processed while generating the current column</span>
          </div>
          <div class="help-item" @click="insertExpression('$V{MASTER_CURRENT_PAGE}')">
            <span class="expression-text">$V{MASTER_CURRENT_PAGE}</span>
            <span class="expression-desc">Current page number of the master report (Master evaluation time only)</span>
          </div>
          <div class="help-item" @click="insertExpression('$V{MASTER_TOTAL_PAGES}')">
            <span class="expression-text">$V{MASTER_TOTAL_PAGES}</span>
            <span class="expression-desc">Total page count of the master report (Master evaluation time only)</span>
          </div>
        </div>
      </div>

      <div class="help-section">
        <h5>Built-in parameters</h5>
        <div class="help-items">
          <div class="help-item" @click="insertExpression('$P{REPORT_CONNECTION}')">
            <span class="expression-text">$P{REPORT_CONNECTION}</span>
            <span class="expression-desc">JDBC connection</span>
          </div>
          <div class="help-item" @click="insertExpression('$P{REPORT_DATA_SOURCE}')">
            <span class="expression-text">$P{REPORT_DATA_SOURCE}</span>
            <span class="expression-desc">Report data source</span>
          </div>
          <div class="help-item" @click="insertExpression('$P{REPORT_LOCALE}')">
            <span class="expression-text">$P{REPORT_LOCALE}</span>
            <span class="expression-desc">Report locale</span>
          </div>
          <div class="help-item" @click="insertExpression('$P{REPORT_SCRIPTLET}')">
            <span class="expression-text">$P{REPORT_SCRIPTLET}</span>
            <span class="expression-desc">Report scriptlet</span>
          </div>
        </div>
      </div>

      <div class="help-section">
        <h5>Comparison operators</h5>
        <div class="help-items">
          <div class="help-item" @click="insertExpression('==')">
            <span class="expression-text">==</span>
            <span class="expression-desc">Equal to</span>
          </div>
          <div class="help-item" @click="insertExpression('!=')">
            <span class="expression-text">!=</span>
            <span class="expression-desc">Not equal to</span>
          </div>
          <div class="help-item" @click="insertExpression('>')">
            <span class="expression-text">></span>
            <span class="expression-desc">Greater than</span>
          </div>
          <div class="help-item" @click="insertExpression('<')">
            <span class="expression-text"><</span>
            <span class="expression-desc">Less than</span>
          </div>
        </div>
      </div>

      <div class="help-section">
        <h5>Logical operators</h5>
        <div class="help-items">
          <div class="help-item" @click="insertExpression('&&')">
            <span class="expression-text">&&</span>
            <span class="expression-desc">And</span>
          </div>
          <div class="help-item" @click="insertExpression('||')">
            <span class="expression-text">||</span>
            <span class="expression-desc">Or</span>
          </div>
          <div class="help-item" @click="insertExpression('!')">
            <span class="expression-text">!</span>
            <span class="expression-desc">Not</span>
          </div>
        </div>
      </div>

      <div class="help-section">
        <h5>Built-in methods</h5>
        <div class="help-items">
          <div class="help-item" @click="insertExpression('NOW()')">
            <span class="expression-text">NOW()</span>
            <span class="expression-desc">Current time</span>
          </div>
          <div class="help-item" @click="insertExpression('TODAY()')">
            <span class="expression-text">TODAY()</span>
            <span class="expression-desc">Today's date</span>
          </div>
          <div class="help-item" @click="insertExpression('String.valueOf()')">
            <span class="expression-text">String.valueOf()</span>
            <span class="expression-desc">Convert to string</span>
          </div>
          <div class="help-item" @click="insertExpression('Integer.valueOf()')">
            <span class="expression-text">Integer.valueOf()</span>
            <span class="expression-desc">Convert to integer</span>
          </div>
          <div class="help-item" @click="insertExpression('Double.valueOf()')">
            <span class="expression-text">Double.valueOf()</span>
            <span class="expression-desc">Convert to double</span>
          </div>
          <div class="help-item" @click="insertExpression('new java.util.Date()')">
            <span class="expression-text">new java.util.Date()</span>
            <span class="expression-desc">Create the current date</span>
          </div>
          <div class="help-item" @click="insertExpression('new java.text.SimpleDateFormat(&quot;yyyy-MM-dd&quot;).format()')">
            <span class="expression-text">SimpleDateFormat.format()</span>
            <span class="expression-desc">Date formatting</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';

interface SuggestionItem {
  value: string;
  type: 'field' | 'parameter' | 'variable' | 'method';
  typeLabel: string;
  description?: string;
}

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  reportFields?: Array<{ name: string; class?: string }>;
  reportParameters?: Array<{ name: string; class?: string }>;
  reportVariables?: Array<{ name: string; class?: string }>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const editorRef = ref<HTMLElement>();
const inputRef = ref<HTMLInputElement>();
const showHelp = ref(false);
const showAutocomplete = ref(false);
const activeSuggestionIndex = ref(0);
const currentPrefix = ref<'$F{' | '$P{' | '$V{' | 'method' | 'any' | null>(null);
const currentFilter = ref('');

const allSuggestions = computed<SuggestionItem[]>(() => {
  const items: SuggestionItem[] = [];

  if (props.reportFields) {
    for (const field of props.reportFields) {
      items.push({
        value: field.name,
        type: 'field',
        typeLabel: 'F',
        description: field.class,
      });
    }
  }

  if (props.reportParameters) {
    for (const param of props.reportParameters) {
      items.push({
        value: param.name,
        type: 'parameter',
        typeLabel: 'P',
        description: param.class,
      });
    }
  }

  // Built-in parameters (from JRParameter.java)
  const builtInParams = [
    { value: 'REPORT_PARAMETERS_MAP', description: 'Map of report parameters passed in when the user fills the report' },
    { value: 'JASPER_REPORTS_CONTEXT', description: 'The current report-filling context' },
    { value: 'JASPER_REPORT', description: 'The JasperReport template object currently being filled' },
    { value: 'REPORT_CONNECTION', description: 'The JDBC connection needed to run the default report query' },
    { value: 'REPORT_MAX_COUNT', description: 'Limits the number of records processed from the data source' },
    { value: 'REPORT_DATA_SOURCE', description: 'The report data source instance' },
    { value: 'REPORT_SCRIPTLET', description: 'The user-supplied report scriptlet instance' },
    { value: 'REPORT_LOCALE', description: 'The locale required for the resource bundle' },
    { value: 'REPORT_RESOURCE_BUNDLE', description: 'The resource bundle containing localized messages' },
    { value: 'REPORT_TIME_ZONE', description: 'The time zone used for date formatting' },
    { value: 'REPORT_VIRTUALIZER', description: 'The virtualizer used for page virtualization' },
    { value: 'REPORT_CLASS_LOADER', description: 'The class loader used to load resources during filling' },
    { value: 'REPORT_FORMAT_FACTORY', description: 'The format factory used to create DateFormat and NumberFormat instances' },
    { value: 'IS_IGNORE_PAGINATION', description: 'Whether to ignore the pagination flag' },
    { value: 'REPORT_TEMPLATES', description: 'The collection of report templates passed in while filling' },
  ];
  for (const p of builtInParams) {
    items.push({
      value: p.value,
      type: 'parameter',
      typeLabel: 'P',
      description: p.description,
    });
  }

  // Built-in variables (from JRVariable.java)
  const builtInVars = [
    { value: 'REPORT_COUNT', description: 'Total number of records read from the data source' },
    { value: 'PAGE_COUNT', description: 'Number of records processed while generating the current page' },
    { value: 'COLUMN_COUNT', description: 'Number of records processed while generating the current column' },
    { value: 'PAGE_NUMBER', description: 'Current page number (total page count once report filling finishes)' },
    { value: 'COLUMN_NUMBER', description: 'Current column number' },
    { value: 'MASTER_CURRENT_PAGE', description: 'Current page number of the master report (Master evaluation time only)' },
    { value: 'MASTER_TOTAL_PAGES', description: 'Total page count of the master report (Master evaluation time only)' },
  ];
  for (const v of builtInVars) {
    items.push({
      value: v.value,
      type: 'variable',
      typeLabel: 'V',
      description: v.description,
    });
  }

  // User-defined report variables
  if (props.reportVariables) {
    for (const variable of props.reportVariables) {
      items.push({
        value: variable.name,
        type: 'variable',
        typeLabel: 'V',
        description: variable.class,
      });
    }
  }

  // Built-in methods
  const builtInMethods = [
    { value: 'NOW()', description: 'Current time' },
    { value: 'TODAY()', description: "Today's date" },
    { value: 'String.valueOf(', description: 'Convert to string' },
    { value: 'Integer.valueOf(', description: 'Convert to integer' },
    { value: 'Double.valueOf(', description: 'Convert to double' },
    { value: 'new java.util.Date()', description: 'Create the current date' },
    { value: 'new java.text.SimpleDateFormat("yyyy-MM-dd").format(', description: 'Date formatting' },
  ];
  for (const m of builtInMethods) {
    items.push({
      value: m.value,
      type: 'method',
      typeLabel: 'M',
      description: m.description,
    });
  }

  return items;
});

const filteredSuggestions = computed(() => {
  const filter = currentFilter.value.toLowerCase();
  let typeFilter: string | null = null;
  if (currentPrefix.value === '$F{') typeFilter = 'field';
  else if (currentPrefix.value === '$P{') typeFilter = 'parameter';
  else if (currentPrefix.value === '$V{') typeFilter = 'variable';
  else if (currentPrefix.value === 'method') typeFilter = 'method';
  else if (currentPrefix.value === 'any') typeFilter = null;

  return allSuggestions.value
    .filter(item => {
      if (typeFilter && item.type !== typeFilter) return false;
      if (filter && !item.value.toLowerCase().includes(filter)) return false;
      return true;
    })
    .slice(0, 10);
});

function detectAutocompleteContext(value: string, cursorPos: number) {
  const beforeCursor = value.substring(0, cursorPos);
  const match = beforeCursor.match(/\$(F|P|V)\{([^}]*)$/);
  if (match) {
    currentPrefix.value = `$${match[1]}{` as '$F{' | '$P{' | '$V{';
    currentFilter.value = match[2] || '';
    showAutocomplete.value = true;
    activeSuggestionIndex.value = 0;
  } else {
    // Check for any word at cursor to trigger autocomplete
    const wordMatch = beforeCursor.match(/([A-Za-z][A-Za-z0-9_.]*)$/);
    const word = wordMatch?.[1];
    if (word && word.length >= 1) {
      currentPrefix.value = 'any';
      currentFilter.value = word;
      showAutocomplete.value = true;
      activeSuggestionIndex.value = 0;
    } else {
      showAutocomplete.value = false;
      currentPrefix.value = null;
      currentFilter.value = '';
    }
  }
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const value = target.value;
  emit('update:modelValue', value);
  nextTick(() => {
    detectAutocompleteContext(value, target.selectionStart || value.length);
  });
}

function handleKeydown(event: KeyboardEvent) {
  if (!showAutocomplete.value) return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeSuggestionIndex.value = Math.min(
      activeSuggestionIndex.value + 1,
      filteredSuggestions.value.length - 1
    );
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeSuggestionIndex.value = Math.max(activeSuggestionIndex.value - 1, 0);
  } else if (event.key === 'Enter' || event.key === 'Tab') {
    if (filteredSuggestions.value.length > 0) {
      event.preventDefault();
      const selected = filteredSuggestions.value[activeSuggestionIndex.value];
      if (selected) {
        selectSuggestion(selected);
      }
    }
  } else if (event.key === 'Escape') {
    showAutocomplete.value = false;
  }
}

function selectSuggestion(item: SuggestionItem) {
  const input = inputRef.value;
  if (!input) return;

  const value = props.modelValue || '';
  const cursorPos = input.selectionStart || value.length;
  const beforeCursor = value.substring(0, cursorPos);
  const afterCursor = value.substring(cursorPos);

  if (item.type === 'method') {
    // Replace the partial word before cursor with the full method text
    const wordMatch = beforeCursor.match(/([A-Za-z][A-Za-z0-9_.]*)$/);
    if (wordMatch) {
      const prefixStart = beforeCursor.length - wordMatch[0].length;
      const newValue = beforeCursor.substring(0, prefixStart) + item.value + afterCursor;
      emit('update:modelValue', newValue);
    }
  } else if (currentPrefix.value === 'any') {
    // For 'any' mode, replace the partial word with the appropriate reference
    const wordMatch = beforeCursor.match(/([A-Za-z][A-Za-z0-9_.]*)$/);
    if (wordMatch) {
      const prefixStart = beforeCursor.length - wordMatch[0].length;
      let replacement = '';
      if (item.type === 'field') {
        replacement = `$F{${item.value}}`;
      } else if (item.type === 'parameter') {
        replacement = `$P{${item.value}}`;
      } else if (item.type === 'variable') {
        replacement = `$V{${item.value}}`;
      } else {
        replacement = item.value;
      }
      const newValue = beforeCursor.substring(0, prefixStart) + replacement + afterCursor;
      emit('update:modelValue', newValue);
    }
  } else {
    const prefixMatch = beforeCursor.match(/\$(F|P|V)\{[^}]*$/);
    if (prefixMatch) {
      const prefixStart = beforeCursor.lastIndexOf('$');
      const newValue = beforeCursor.substring(0, prefixStart) + `$${prefixMatch[1]}{${item.value}}` + afterCursor;
      emit('update:modelValue', newValue);
    }
  }

  showAutocomplete.value = false;
  currentPrefix.value = null;

  nextTick(() => {
    input.focus();
  });
}

function handleFocus() {
  if (inputRef.value) {
    detectAutocompleteContext(
      props.modelValue || '',
      inputRef.value.selectionStart || 0
    );
  }
}

function handleBlur() {
  // Delay to allow click on autocomplete item
  setTimeout(() => {
    showAutocomplete.value = false;
  }, 200);
}

const commonExpressions = [
  { expression: '$F{field}.equals("value")', description: 'Field equals a specific value' },
  { expression: '$F{field} != null', description: 'Field is not null' },
  { expression: '$F{field} > 0', description: 'Field is greater than 0' },
  { expression: '$V{PAGE_NUMBER} > 1', description: 'Page number is greater than 1' },
  { expression: '$F{status}.equals("active")', description: 'Status equals "active"' },
  { expression: '$F{amount}.doubleValue() > 100', description: 'Amount is greater than 100' },
];

const insertExpression = (expression: string) => {
  const currentValue = props.modelValue || '';
  emit('update:modelValue', currentValue + expression);
  showHelp.value = false;
};
</script>

<style scoped>
.expression-editor {
  position: relative;
}

.expression-input-group {
  display: flex;
  gap: var(--prop-spacing-xs);
}

.expression-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--prop-border-color);
  border-radius: var(--prop-border-radius-md);
  font-family: monospace;
  font-size: var(--prop-font-size-sm);
  color: var(--prop-text-primary);
  background-color: var(--prop-bg-primary);
  transition: border-color var(--prop-transition-fast), box-shadow var(--prop-transition-fast);
}

.expression-input:hover {
  border-color: var(--prop-border-hover);
}

.expression-input:focus {
  outline: none;
  border-color: var(--prop-border-focus);
  box-shadow: var(--prop-focus-ring);
}

.help-button {
  width: 28px;
  height: 28px;
  border: 1px solid var(--prop-border-color);
  border-radius: var(--prop-border-radius-md);
  background: var(--prop-bg-secondary);
  cursor: pointer;
  font-weight: bold;
  color: var(--prop-text-secondary);
  transition: background-color var(--prop-transition-fast), border-color var(--prop-transition-fast);
}

.help-button:hover {
  background: var(--prop-bg-hover);
  border-color: var(--prop-border-hover);
}

/* Autocomplete dropdown */
.autocomplete-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--prop-bg-primary);
  border: 1px solid var(--prop-border-color);
  border-radius: var(--prop-border-radius-md);
  box-shadow: var(--prop-shadow-md);
  z-index: 1100;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 2px;
}

.autocomplete-item {
  display: flex;
  align-items: center;
  gap: var(--prop-spacing-sm);
  padding: 5px 10px;
  cursor: pointer;
  font-size: var(--prop-font-size-sm);
  transition: background-color var(--prop-transition-fast);
}

.autocomplete-item:hover,
.autocomplete-item.active {
  background: #e6f4ff;
}

.autocomplete-type {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  font-size: var(--prop-font-size-xs);
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.autocomplete-type.field {
  background: var(--prop-primary-color);
}

.autocomplete-type.parameter {
  background: #722ed1;
}

.autocomplete-type.variable {
  background: #fa8c16;
}

.autocomplete-type.method {
  background: var(--prop-success-color);
}

.autocomplete-value {
  font-family: monospace;
  font-weight: var(--prop-font-weight-medium);
  color: var(--prop-text-primary);
}

.autocomplete-desc {
  color: var(--prop-text-tertiary);
  font-size: 11px;
  margin-left: auto;
}

/* Help panel */
.expression-help {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--prop-bg-primary);
  border: 1px solid var(--prop-border-color);
  border-radius: var(--prop-border-radius-md);
  box-shadow: var(--prop-shadow-md);
  z-index: 1000;
  max-height: 400px;
  overflow-y: auto;
  margin-top: var(--prop-spacing-xs);
}

.help-section {
  padding: var(--prop-spacing-sm) var(--prop-spacing-md);
  border-bottom: 1px solid var(--prop-divider-color);
}

.help-section:last-child {
  border-bottom: none;
}

.help-section h5 {
  margin: 0 0 var(--prop-spacing-sm) 0;
  font-size: var(--prop-font-size-sm);
  color: var(--prop-text-secondary);
  font-weight: var(--prop-font-weight-semibold);
}

.help-items {
  display: flex;
  flex-direction: column;
  gap: var(--prop-spacing-xs);
}

.help-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--prop-spacing-xs) var(--prop-spacing-sm);
  border-radius: var(--prop-border-radius-md);
  cursor: pointer;
  font-size: var(--prop-font-size-sm);
  transition: background-color var(--prop-transition-fast);
}

.help-item:hover {
  background: var(--prop-bg-tertiary);
}

.expression-text {
  font-family: monospace;
  color: var(--prop-primary-color);
  font-weight: var(--prop-font-weight-medium);
}

.expression-desc {
  color: var(--prop-text-tertiary);
  font-size: 11px;
}
</style>
