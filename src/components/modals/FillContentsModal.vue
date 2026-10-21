<template>
  <!-- "Fill from my headings" on a list that already has rows: add or replace -->
  <BaseModal
    :visible="visible"
    :title="t('contentsList.fillAsk.title', { n: rowCount }, rowCount)"
    :show-footer="false"
    :content-style="{ width: '440px', maxWidth: '92vw' }"
    @update:visible="$event || emit('choose', null)"
  >
    <div class="choices">
      <button
        v-for="choice in choices"
        :key="choice.mode"
        type="button"
        class="choice"
        :class="{ 'is-recommended': choice.mode === 'new', 'is-danger': choice.mode === 'replace' }"
        :disabled="choice.mode === 'new' && !newCount"
        @click="emit('choose', choice.mode)"
      >
        <span class="choice-icon"><component :is="choice.icon" :size="16" aria-hidden="true" /></span>
        <span class="choice-text">
          <span class="choice-name">
            {{ t(`contentsList.fillAsk.${choice.mode}`) }}
            <span v-if="choice.mode === 'new' && newCount" class="badge">{{ t("contentsList.fillAsk.recommended") }}</span>
          </span>
          <span class="choice-desc">{{ description(choice.mode) }}</span>
        </span>
      </button>
    </div>
    <div class="footer">
      <button type="button" class="cancel-btn" @click="emit('choose', null)">{{ t("common.cancel") }}</button>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { ListPlus, ListRestart, Sparkles } from "@lucide/vue";
import BaseModal from "./BaseModal.vue";

export type FillMode = "new" | "all" | "replace";

const props = defineProps<{ visible: boolean; rowCount: number; headingCount: number; newCount: number }>();
const emit = defineEmits<{ choose: [FillMode | null] }>();
const { t } = useI18n();

const choices = [
  { mode: "new" as const, icon: Sparkles },
  { mode: "all" as const, icon: ListPlus },
  { mode: "replace" as const, icon: ListRestart },
];

function description(mode: FillMode): string {
  if (mode === "new")
    return props.newCount
      ? t("contentsList.fillAsk.newDesc", { n: props.newCount }, props.newCount)
      : t("contentsList.fillAsk.noneNew");
  if (mode === "all") return t("contentsList.fillAsk.allDesc", { n: props.headingCount }, props.headingCount);
  return t("contentsList.fillAsk.replaceDesc");
}
</script>

<style scoped>
.choices {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.choice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--prop-border-color, #e6e5ee);
  border-radius: 10px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.choice:hover:not(:disabled) {
  border-color: var(--prop-primary-color, #6440f4);
  background: #f7f5ff;
}

.choice:disabled {
  opacity: 0.55;
  cursor: default;
}

.choice-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: #f1edff;
  color: var(--prop-primary-color, #6440f4);
}

.choice.is-danger .choice-icon {
  background: #fef2f2;
  color: #dc2626;
}

.choice-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.choice-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #1c1b26;
}

.choice-desc {
  font-size: 12px;
  line-height: 1.4;
  color: #6b6a7a;
}

.badge {
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--prop-primary-color, #6440f4);
  font-size: 10px;
  font-weight: 600;
  color: #fff;
}

.footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.cancel-btn {
  height: 30px;
  padding: 0 14px;
  border: 1px solid var(--prop-border-color, #e6e5ee);
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  color: #1c1b26;
  cursor: pointer;
}

.cancel-btn:hover {
  border-color: var(--prop-primary-color, #6440f4);
}
</style>
