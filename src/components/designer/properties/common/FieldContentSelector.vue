<template>
  <div class="field-content-selector">
    <!-- Mode Switcher -->
    <div class="mode-tabs">
      <button
        type="button"
        class="mode-tab-btn"
        :class="{ active: currentMode === 'data_field' }"
        @click="switchMode('data_field')"
      >
        📊 {{ t("fieldContent.modeDataField") }}
      </button>
      <button
        type="button"
        class="mode-tab-btn"
        :class="{ active: currentMode === 'document_info' }"
        @click="switchMode('document_info')"
      >
        📄 {{ t("fieldContent.modeDocInfo") }}
      </button>
      <button
        type="button"
        class="mode-tab-btn"
        :class="{ active: currentMode === 'template' }"
        @click="switchMode('template')"
      >
        ✏️ {{ t("fieldContent.modeTemplate") }}
      </button>
    </div>

    <!-- Mode 1: Single Data Field -->
    <div v-if="currentMode === 'data_field'" class="mode-content">
      <label class="control-label">{{ t("fieldContent.selectField") }}</label>
      <select v-model="selectedField" @change="applyField" class="form-select">
        <option value="" disabled>{{ t("fieldContent.chooseDataField") }}</option>
        <optgroup v-if="reportFields && reportFields.length > 0" :label="t('fieldContent.reportFields')">
          <option v-for="f in reportFields" :key="'f_' + f.name" :value="'$F{' + f.name + '}'">
            {{ f.name }} ({{ getFriendlyType(f.class) }})
          </option>
        </optgroup>
        <optgroup v-if="reportParameters && reportParameters.length > 0" :label="t('fieldContent.parameters')">
          <option v-for="p in reportParameters" :key="'p_' + p.name" :value="'$P{' + p.name + '}'">
            {{ p.name }}
          </option>
        </optgroup>
        <optgroup v-if="reportVariables && reportVariables.length > 0" :label="t('fieldContent.variables')">
          <option v-for="v in reportVariables" :key="'v_' + v.name" :value="'$V{' + v.name + '}'">
            {{ v.name }}
          </option>
        </optgroup>
      </select>
    </div>

    <!-- Mode 2: Document Info Preset -->
    <div v-if="currentMode === 'document_info'" class="mode-content">
      <label class="control-label">{{ t("fieldContent.selectDocInfo") }}</label>
      <div class="preset-grid">
        <button
          v-for="preset in docInfoPresets"
          :key="preset.id"
          type="button"
          class="preset-card"
          :class="{ selected: selectedPresetId === preset.id }"
          @click="applyDocInfoPreset(preset)"
        >
          <span class="preset-icon">{{ preset.icon }}</span>
          <div class="preset-info">
            <span class="preset-name">{{ preset.label }}</span>
            <span class="preset-sample">{{ preset.sample }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Mode 3: Text & Field Template -->
    <div v-if="currentMode === 'template'" class="mode-content">
      <label class="control-label">{{ t("fieldContent.templateHelp") }}</label>
      <textarea
        ref="templateInputRef"
        v-model="templateText"
        @input="compileTemplate"
        rows="3"
        class="form-textarea"
        :placeholder="t('fieldContent.templatePlaceholder')"
      ></textarea>

      <!-- Quick insert field pills -->
      <div v-if="availableFieldNames.length > 0" class="field-pills-container">
        <span class="pills-label">{{ t("fieldContent.insertField") }}:</span>
        <div class="pills-list">
          <button
            v-for="name in availableFieldNames"
            :key="name"
            type="button"
            class="field-pill"
            @click="insertFieldIntoTemplate(name)"
          >
            + {{ name }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  modelValue?: string;
  reportFields?: Array<{ name: string; class?: string }>;
  reportParameters?: Array<{ name: string; class?: string }>;
  reportVariables?: Array<{ name: string; class?: string }>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const currentMode = ref<'data_field' | 'document_info' | 'template'>('data_field');
const selectedField = ref<string>('');
const selectedPresetId = ref<string>('');
const templateText = ref<string>('');
const templateInputRef = ref<HTMLTextAreaElement | null>(null);

const docInfoPresets = [
  { id: 'page_num', icon: '📄', label: 'Page Number', sample: '1', expr: '$V{PAGE_NUMBER}' },
  { id: 'page_x_of_y', icon: '📑', label: 'Page X of Y', sample: 'Page 1 of 5', expr: '"Page " + $V{PAGE_NUMBER} + " of " + $V{PAGE_COUNT}' },
  { id: 'current_date', icon: '📅', label: 'Current Date', sample: '2026-09-22', expr: 'new java.util.Date()' },
  { id: 'record_count', icon: '🔢', label: 'Total Records', sample: '150', expr: '$V{REPORT_COUNT}' },
];

const availableFieldNames = computed(() => {
  return (props.reportFields || []).map(f => f.name);
});

function getFriendlyType(javaClass?: string): string {
  if (!javaClass) return 'Text';
  if (javaClass.includes('Integer') || javaClass.includes('Long')) return 'Number';
  if (javaClass.includes('Double') || javaClass.includes('BigDecimal') || javaClass.includes('Float')) return 'Decimal/Currency';
  if (javaClass.includes('Date') || javaClass.includes('Timestamp')) return 'Date';
  if (javaClass.includes('Boolean')) return 'Yes/No';
  return 'Text';
}

function detectMode(expr: string | undefined | null) {
  if (!expr || expr.trim() === '') {
    currentMode.value = 'data_field';
    selectedField.value = props.reportFields?.[0] ? `$F{${props.reportFields[0].name}}` : '';
    return;
  }
  const clean = expr.trim();

  // Check document info presets
  const matchedPreset = docInfoPresets.find(p => p.expr === clean);
  if (matchedPreset) {
    currentMode.value = 'document_info';
    selectedPresetId.value = matchedPreset.id;
    return;
  }

  // Check if single field: $F{name}, $P{name}, $V{name}
  const singleFieldMatch = clean.match(/^(\$[FPV]\{[^}]+\})$/);
  if (singleFieldMatch && singleFieldMatch[1]) {
    currentMode.value = 'data_field';
    selectedField.value = singleFieldMatch[1];
    return;
  }

  // Otherwise, it's a template or complex expression
  currentMode.value = 'template';
  // Attempt to deconstruct concatenation: "Hello " + $F{name} + "!" -> Hello {name}!
  try {
    const deconstructed = clean
      .replace(/"\s*\+\s*\$F\{([^}]+)\}\s*\+\s*"/g, '{$1}')
      .replace(/^\s*"\s*/, '')
      .replace(/\s*"\s*$/, '')
      .replace(/"\s*\+\s*\$F\{([^}]+)\}/g, '{$1}')
      .replace(/\$F\{([^}]+)\}\s*\+\s*"/g, '{$1}')
      .replace(/\$F\{([^}]+)\}/g, '{$1}');
    templateText.value = deconstructed;
  } catch {
    templateText.value = clean;
  }
}

function switchMode(mode: 'data_field' | 'document_info' | 'template') {
  currentMode.value = mode;
  if (mode === 'data_field') {
    if (!selectedField.value && props.reportFields?.[0]) {
      selectedField.value = `$F{${props.reportFields[0].name}}`;
    }
    emit('update:modelValue', selectedField.value);
  } else if (mode === 'document_info') {
    if (!selectedPresetId.value && docInfoPresets[0]) {
      selectedPresetId.value = docInfoPresets[0].id;
    }
    const p = docInfoPresets.find(item => item.id === selectedPresetId.value) || docInfoPresets[0];
    if (p) {
      emit('update:modelValue', p.expr);
    }
  } else if (mode === 'template') {
    compileTemplate();
  }
}

function applyField() {
  emit('update:modelValue', selectedField.value);
}

function applyDocInfoPreset(preset: typeof docInfoPresets[0]) {
  selectedPresetId.value = preset.id;
  emit('update:modelValue', preset.expr);
}

function insertFieldIntoTemplate(fieldName: string) {
  const token = `{${fieldName}}`;
  const textarea = templateInputRef.value;
  if (textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = templateText.value;
    templateText.value = current.substring(0, start) + token + current.substring(end);
    nextTick(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    });
  } else {
    templateText.value += token;
  }
  compileTemplate();
}

function compileTemplate() {
  const text = templateText.value;
  if (!text || text.trim() === '') {
    emit('update:modelValue', '""');
    return;
  }

  const tokens: string[] = [];
  let lastIndex = 0;
  const regex = /\{([^{}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const literal = text.substring(lastIndex, match.index);
      const escaped = literal.replace(/"/g, '\\"');
      tokens.push(`"${escaped}"`);
    }
    const fieldName = match[1]?.trim() || '';
    if (fieldName) {
      tokens.push(`$F{${fieldName}}`);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    const literal = text.substring(lastIndex);
    const escaped = literal.replace(/"/g, '\\"');
    tokens.push(`"${escaped}"`);
  }

  if (tokens.length === 0) {
    emit('update:modelValue', '""');
  } else if (tokens.length === 1 && tokens[0]) {
    emit('update:modelValue', tokens[0]);
  } else {
    emit('update:modelValue', tokens.join(' + '));
  }
}

watch(() => props.modelValue, (newVal) => {
  detectMode(newVal);
}, { immediate: true });

onMounted(() => {
  detectMode(props.modelValue);
});
</script>

<style scoped>
.field-content-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mode-tabs {
  display: flex;
  border-radius: 6px;
  background: #f3f4f6;
  padding: 2px;
  gap: 2px;
}

.mode-tab-btn {
  flex: 1;
  padding: 5px 6px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.mode-tab-btn:hover {
  color: #1f2937;
}

.mode-tab-btn.active {
  background: #ffffff;
  color: #2563eb;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.mode-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #4b5563;
}

.form-select, .form-textarea {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  color: #1f2937;
  background-color: #ffffff;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  font-family: inherit;
}

.form-select:focus, .form-textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.preset-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.preset-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}

.preset-card:hover {
  border-color: #93c5fd;
  background: #f8fafc;
}

.preset-card.selected {
  border-color: #2563eb;
  background: #eff6ff;
}

.preset-icon {
  font-size: 16px;
}

.preset-info {
  display: flex;
  flex-direction: column;
}

.preset-name {
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
}

.preset-sample {
  font-size: 10px;
  color: #6b7280;
}

.field-pills-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pills-label {
  font-size: 11px;
  color: #6b7280;
}

.pills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.field-pill {
  background: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.field-pill:hover {
  background: #0284c7;
  color: #ffffff;
}
</style>
