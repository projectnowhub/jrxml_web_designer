<template>
  <!-- What the QR code holds: a kind, then its fields -->
  <div class="qr-editor">
    <span class="field-label">{{ t("barcode.qr.kind") }}</span>
    <div class="kind-grid" role="radiogroup" :aria-label="t('barcode.qr.kind')">
      <button
        v-for="k in QR_KINDS"
        :key="k"
        type="button"
        role="radio"
        class="kind-btn"
        :class="{ active: kind === k }"
        :aria-checked="kind === k"
        @click="setKind(k)"
      >
        <component :is="KIND_ICONS[k]" :size="14" aria-hidden="true" />
        <span>{{ t(`barcode.qr.kinds.${k}`) }}</span>
      </button>
    </div>

    <label v-for="field in QR_FIELDS[kind]" :key="`${kind}-${field.key}`" class="qr-field">
      <span class="field-label">{{ t(`barcode.qr.fields.${field.key}`) }}</span>
      <textarea
        v-if="field.input === 'textarea'"
        rows="3"
        :value="fields[field.key] ?? ''"
        :placeholder="t(`barcode.qr.placeholders.${field.key}`)"
        @input="setField(field.key, ($event.target as HTMLTextAreaElement).value)"
      />
      <select
        v-else-if="field.input === 'security'"
        :value="fields.security || 'WPA'"
        @change="setField('security', ($event.target as HTMLSelectElement).value, true)"
      >
        <option v-for="s in WIFI_SECURITY" :key="s" :value="s">{{ t(`barcode.qr.security.${s}`) }}</option>
      </select>
      <input
        v-else
        :type="field.input === 'password' ? 'text' : field.input"
        :value="fields[field.key] ?? ''"
        :placeholder="t(`barcode.qr.placeholders.${field.key}`)"
        :disabled="field.input === 'password' && fields.security === 'nopass'"
        @input="setField(field.key, ($event.target as HTMLInputElement).value)"
      />
    </label>

    <p v-if="kind !== 'text' && value" class="encoded">
      <span>{{ t("barcode.qr.encoded") }}</span>
      <code>{{ value }}</code>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Contact, Link, Mail, MessageSquare, Phone, Type, Wifi } from "@lucide/vue";
import { QR_FIELDS, QR_KINDS, WIFI_SECURITY, composeQr, parseQr, type QrKind } from "@/utils/barcode/qrContent";

const props = defineProps<{
  value: string;
}>();

// discrete: a choice (kind, security) rather than typing, one undo step each
const emit = defineEmits<{
  change: [value: string, discrete: boolean];
}>();

const { t } = useI18n();

const KIND_ICONS = { text: Type, link: Link, email: Mail, phone: Phone, sms: MessageSquare, wifi: Wifi, contact: Contact };

// The form follows the value; a kind picked with nothing typed yet (an empty
// link reads back as text) is kept while the value is what this form wrote
const kind = ref<QrKind>("text");
const fields = ref<Record<string, string>>({});
let written: string | null = null;

watch(
  () => props.value,
  (value) => {
    if (value === written) return;
    const content = parseQr(value);
    kind.value = content.kind;
    fields.value = content.fields;
  },
  { immediate: true },
);

function write(discrete: boolean) {
  written = composeQr({ kind: kind.value, fields: fields.value });
  emit("change", written, discrete);
}

function setKind(next: QrKind) {
  if (kind.value === next) return;
  // Moving between kinds keeps what fits: a link's address, a phone number…
  const old = fields.value;
  kind.value = next;
  fields.value = next === "wifi" ? { security: "WPA" } : {};
  if (next === "text") fields.value.text = props.value;
  if (old.number && (next === "phone" || next === "sms")) fields.value.number = old.number;
  write(true);
}

function setField(key: string, value: string, discrete = false) {
  fields.value = { ...fields.value, [key]: value };
  write(discrete);
}
</script>

<style scoped>
.field-label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--prop-text-secondary, #6b7280);
}

.kind-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 4px;
  margin-bottom: 10px;
}

.kind-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 5px 8px;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  color: var(--prop-text-secondary, #6b7280);
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.kind-btn span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kind-btn:hover {
  border-color: var(--prop-border-hover, #9ca3af);
}

.kind-btn.active {
  border-color: var(--prop-border-focus, #1890ff);
  background: #e6f4ff;
  color: var(--prop-border-focus, #1890ff);
  font-weight: 600;
}

.kind-btn:focus-visible {
  outline: 2px solid var(--prop-border-focus, #1890ff);
  outline-offset: 1px;
}

.qr-field {
  display: block;
  margin-bottom: 8px;
}

.qr-field input,
.qr-field select,
.qr-field textarea {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  font-size: 12px;
  font-family: inherit;
  background: #fff;
  box-sizing: border-box;
}

.qr-field input,
.qr-field select {
  height: 30px;
  padding-top: 0;
  padding-bottom: 0;
}

.qr-field textarea {
  resize: vertical;
}

.qr-field input:focus,
.qr-field select:focus,
.qr-field textarea:focus {
  outline: none;
  border-color: var(--prop-border-focus);
  box-shadow: var(--prop-focus-ring);
}

.qr-field input:disabled {
  background: var(--prop-bg-tertiary, #f3f4f6);
}

.encoded {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 2px 0 0;
  font-size: var(--prop-font-size-xs);
  color: var(--prop-text-tertiary);
}

.encoded code {
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  color: var(--prop-text-secondary);
  text-overflow: ellipsis;
  white-space: pre-line;
  max-height: 4.5em;
}
</style>
