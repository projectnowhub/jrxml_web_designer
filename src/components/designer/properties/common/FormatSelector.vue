<template>
  <div class="format-selector">
    <!-- Category Picker -->
    <div class="form-group mb-2">
      <label class="control-label">{{ t("formatSelector.category") }}</label>
      <select v-model="selectedCategory" @change="handleCategoryChange" class="form-select">
        <option value="none">{{ t("formatSelector.textPlain") }}</option>
        <option value="number">{{ t("formatSelector.number") }}</option>
        <option value="currency">{{ t("formatSelector.currency") }}</option>
        <option value="date">{{ t("formatSelector.date") }}</option>
        <option value="time">{{ t("formatSelector.time") }}</option>
        <option value="percentage">{{ t("formatSelector.percentage") }}</option>
      </select>
    </div>

    <!-- Number options -->
    <div v-if="selectedCategory === 'number'" class="format-options">
      <label class="control-label">{{ t("formatSelector.formatStyle") }}</label>
      <select v-model="selectedPreset" @change="applyPreset" class="form-select">
        <option value="#,##0">1,234 ({{ t("formatSelector.wholeNumber") }})</option>
        <option value="#,##0.00">1,234.56 ({{ t("formatSelector.twoDecimals") }})</option>
        <option value="#,##0.0">1,234.5 ({{ t("formatSelector.oneDecimal") }})</option>
        <option value="0">1234 ({{ t("formatSelector.noSeparators") }})</option>
      </select>
    </div>

    <!-- Currency options -->
    <div v-if="selectedCategory === 'currency'" class="format-options">
      <div class="currency-row">
        <div class="currency-symbol-group">
          <label class="control-label">{{ t("formatSelector.symbol") }}</label>
          <select v-model="currencySymbol" @change="applyCurrency" class="form-select">
            <option value="$">$ (USD)</option>
            <option value="€">€ (EUR)</option>
            <option value="£">£ (GBP)</option>
            <option value="₹">₹ (INR)</option>
            <option value="¥">¥ (JPY/CNY)</option>
            <option value="₱">₱ (PHP)</option>
            <option value="₩">₩ (KRW)</option>
          </select>
        </div>
        <div class="currency-decimals-group">
          <label class="control-label">{{ t("formatSelector.decimals") }}</label>
          <select v-model="currencyDecimals" @change="applyCurrency" class="form-select">
            <option value="2">2 (1,234.56)</option>
            <option value="0">0 (1,234)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Date options -->
    <div v-if="selectedCategory === 'date'" class="format-options">
      <label class="control-label">{{ t("formatSelector.dateStyle") }}</label>
      <select v-model="selectedPreset" @change="applyPreset" class="form-select">
        <option value="yyyy-MM-dd">2026-09-22 (YYYY-MM-DD)</option>
        <option value="dd/MM/yyyy">22/09/2026 (DD/MM/YYYY)</option>
        <option value="MM/dd/yyyy">09/22/2026 (MM/DD/YYYY)</option>
        <option value="MMM d, yyyy">Sep 22, 2026</option>
        <option value="MMMM d, yyyy">September 22, 2026</option>
        <option value="EEEE, MMMM d, yyyy">Tuesday, September 22, 2026</option>
      </select>
    </div>

    <!-- Time options -->
    <div v-if="selectedCategory === 'time'" class="format-options">
      <label class="control-label">{{ t("formatSelector.timeStyle") }}</label>
      <select v-model="selectedPreset" @change="applyPreset" class="form-select">
        <option value="hh:mm a">02:30 PM (12-hour)</option>
        <option value="HH:mm:ss">14:30:00 (24-hour)</option>
        <option value="yyyy-MM-dd HH:mm">2026-09-22 14:30 (Date & Time)</option>
      </select>
    </div>

    <!-- Percentage options -->
    <div v-if="selectedCategory === 'percentage'" class="format-options">
      <label class="control-label">{{ t("formatSelector.formatStyle") }}</label>
      <select v-model="selectedPreset" @change="applyPreset" class="form-select">
        <option value="#,##0%">75% ({{ t("formatSelector.wholeNumber") }})</option>
        <option value="#,##0.00%">75.00% ({{ t("formatSelector.twoDecimals") }})</option>
        <option value="#,##0.0%">75.0% ({{ t("formatSelector.oneDecimal") }})</option>
      </select>
    </div>

    <!-- Live Preview Box -->
    <div v-if="selectedCategory !== 'none'" class="preview-box">
      <span class="preview-label">{{ t("formatSelector.preview") }}:</span>
      <span class="preview-value">{{ previewText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  modelValue?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const selectedCategory = ref<'none' | 'number' | 'currency' | 'date' | 'time' | 'percentage'>('none');
const selectedPreset = ref<string>('');
const currencySymbol = ref<string>('$');
const currencyDecimals = ref<string>('2');

function detectCategory(pat: string | undefined | null) {
  if (!pat || pat.trim() === '') {
    selectedCategory.value = 'none';
    selectedPreset.value = '';
    return;
  }
  const clean = pat.trim();

  // Percentage
  if (clean.includes('%')) {
    selectedCategory.value = 'percentage';
    selectedPreset.value = clean;
    return;
  }

  // Currency
  const currMatch = clean.match(/^([$€£₹¥₱₩¤])(.*)$/);
  if (currMatch && currMatch[1]) {
    selectedCategory.value = 'currency';
    currencySymbol.value = currMatch[1];
    currencyDecimals.value = clean.includes('.00') ? '2' : '0';
    return;
  }

  // Date / Time
  if (clean.includes('y') || clean.includes('M') || clean.includes('d') || clean.includes('E')) {
    selectedCategory.value = 'date';
    selectedPreset.value = clean;
    return;
  }
  if (clean.includes('H') || clean.includes('h') || clean.includes('s')) {
    selectedCategory.value = 'time';
    selectedPreset.value = clean;
    return;
  }

  // Number
  if (clean.includes('#') || clean.includes('0')) {
    selectedCategory.value = 'number';
    selectedPreset.value = clean;
    return;
  }

  // Fallback
  selectedCategory.value = 'none';
  selectedPreset.value = clean;
}

function handleCategoryChange() {
  switch (selectedCategory.value) {
    case 'none':
      emit('update:modelValue', '');
      break;
    case 'number':
      selectedPreset.value = '#,##0.00';
      emit('update:modelValue', '#,##0.00');
      break;
    case 'currency':
      currencySymbol.value = '$';
      currencyDecimals.value = '2';
      applyCurrency();
      break;
    case 'date':
      selectedPreset.value = 'yyyy-MM-dd';
      emit('update:modelValue', 'yyyy-MM-dd');
      break;
    case 'time':
      selectedPreset.value = 'hh:mm a';
      emit('update:modelValue', 'hh:mm a');
      break;
    case 'percentage':
      selectedPreset.value = '#,##0.00%';
      emit('update:modelValue', '#,##0.00%');
      break;
  }
}

function applyPreset() {
  emit('update:modelValue', selectedPreset.value);
}

function applyCurrency() {
  const dec = currencyDecimals.value === '2' ? '.00' : '';
  const pattern = `${currencySymbol.value}#,##0${dec};(${currencySymbol.value}#,##0${dec})`;
  emit('update:modelValue', pattern);
}

const previewText = computed(() => {
  switch (selectedCategory.value) {
    case 'number':
      if (selectedPreset.value === '#,##0') return '1,235';
      if (selectedPreset.value === '#,##0.0') return '1,234.6';
      if (selectedPreset.value === '0') return '1235';
      return '1,234.56';
    case 'currency':
      return currencyDecimals.value === '2' 
        ? `${currencySymbol.value} 1,234.56` 
        : `${currencySymbol.value} 1,235`;
    case 'date':
      if (selectedPreset.value === 'dd/MM/yyyy') return '22/09/2026';
      if (selectedPreset.value === 'MM/dd/yyyy') return '09/22/2026';
      if (selectedPreset.value === 'MMM d, yyyy') return 'Sep 22, 2026';
      if (selectedPreset.value === 'MMMM d, yyyy') return 'September 22, 2026';
      if (selectedPreset.value === 'EEEE, MMMM d, yyyy') return 'Tuesday, September 22, 2026';
      return '2026-09-22';
    case 'time':
      if (selectedPreset.value === 'HH:mm:ss') return '14:30:00';
      if (selectedPreset.value === 'yyyy-MM-dd HH:mm') return '2026-09-22 14:30';
      return '02:30 PM';
    case 'percentage':
      if (selectedPreset.value === '#,##0%') return '75%';
      if (selectedPreset.value === '#,##0.0%') return '75.4%';
      return '75.40%';
    default:
      return 'Plain Text';
  }
});

watch(() => props.modelValue, (newVal) => {
  detectCategory(newVal);
}, { immediate: true });

onMounted(() => {
  detectCategory(props.modelValue);
});
</script>

<style scoped>
.format-selector {
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

.form-select {
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

.form-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.format-options {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
}

.currency-row {
  display: flex;
  gap: 8px;
}

.currency-symbol-group {
  flex: 1;
}

.currency-decimals-group {
  flex: 1;
}

.preview-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  font-size: 12px;
}

.preview-label {
  color: #166534;
  font-weight: 500;
}

.preview-value {
  color: #15803d;
  font-weight: 700;
  font-family: monospace;
}
</style>
