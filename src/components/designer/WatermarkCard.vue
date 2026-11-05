<template>
  <!-- Template Settings: the template's watermark (it prints behind every
       page and can't be clicked on the page, so it is reached from here) -->
  <div class="watermark-card" data-help="watermark-card">
    <div class="card-head">
      <h5>
        {{ t("watermark.card.title") }}
        <SettingHelpButton id="templateWatermark" />
      </h5>
    </div>
    <SettingHelpText id="templateWatermark" />

    <template v-if="watermark">
      <div class="summary">
        <span class="summary-icon" aria-hidden="true">
          <component :is="setup.kind === 'text' ? Type : ImageIcon" :size="15" />
        </span>
        <span class="summary-text">
          <strong :title="mainLine">{{ mainLine }}</strong>
          <span>{{ detailLine }}</span>
        </span>
      </div>
      <div class="actions">
        <button type="button" class="primary-btn" @click="selectWatermark">
          <Pencil :size="13" aria-hidden="true" />
          {{ t("watermark.card.change") }}
        </button>
        <button type="button" class="plain-btn is-danger" @click="removeWatermark">
          <Trash2 :size="13" aria-hidden="true" />
          {{ t("watermark.card.remove") }}
        </button>
      </div>
    </template>

    <template v-else>
      <p class="hint">{{ t("watermark.card.none") }}</p>
      <div class="actions">
        <button type="button" class="primary-btn" @click="emit('add')">
          <Stamp :size="13" aria-hidden="true" />
          {{ t("watermark.card.add") }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Image as ImageIcon, Pencil, Stamp, Trash2, Type } from "@lucide/vue";
import SettingHelpButton from "../help/SettingHelpButton.vue";
import SettingHelpText from "../help/SettingHelpText.vue";
import { useReportStore } from "@/stores/report";
import { useSelectionStore } from "@/stores/selection";
import { specialPages } from "@/utils/specialPages";
import {
  findWatermark,
  getWatermarkSetup,
  WATERMARK_ANGLES,
  WATERMARK_OPACITIES,
} from "@/utils/watermark/watermarkElement";

const emit = defineEmits<{ add: [] }>();

const { t } = useI18n();
const report = useReportStore();
const selection = useSelectionStore();

const STRENGTH_NAMES = ["veryLight", "light", "medium", "strong"] as const;
const ANGLE_NAMES = ["diagonalUp", "straight", "diagonalDown", "upwards"] as const;

const at = computed(() => findWatermark(report.bands));
const watermark = computed(() => (at.value ? report.bands[at.value.bandIndex]!.elements[at.value.elementIndex]! : null));
const setup = computed(() => getWatermarkSetup(watermark.value ?? {}));

// What it shows: its first line of words, or its picture's name
const mainLine = computed(() => {
  const s = setup.value;
  if (s.kind === "picture") return s.picture ? s.pictureName || t("watermark.panel.pictureNoName") : t("watermark.panel.noPicture");
  return s.text.split("\n").find((line) => line.trim())?.trim() || t("watermark.card.noWords");
});

// How strong, its angle and (with a cover / contents pages) which pages
const detailLine = computed(() => {
  const s = setup.value;
  const strength = WATERMARK_OPACITIES.indexOf(s.opacity as (typeof WATERMARK_OPACITIES)[number]);
  const angle = WATERMARK_ANGLES.indexOf(s.angle as (typeof WATERMARK_ANGLES)[number]);
  const parts = [
    strength >= 0 ? `${t(`watermark.strengths.${STRENGTH_NAMES[strength]}`)} (${s.opacity}%)` : `${s.opacity}%`,
    angle >= 0 ? t(`watermark.angles.${ANGLE_NAMES[angle]}`) : `${s.angle}°`,
  ];
  if (s.repeat) parts.push(t("watermark.panel.repeated"));
  if (specialPages(report.reportProperties).count > 0) parts.push(t(`watermark.pages.${s.pages}`));
  return parts.join(" · ");
});

// Its settings open in this panel
function selectWatermark() {
  const spot = at.value;
  const element = watermark.value;
  if (!spot || !element) return;
  const selected = { bandIndex: spot.bandIndex, elementIndex: spot.elementIndex, uuid: element.uuid };
  selection.selectedBandIndex = null;
  selection.selectedElement = selected;
  selection.selectedElements = [selected];
}

// One undo step
function removeWatermark() {
  const spot = at.value;
  if (!spot) return;
  report.saveStateToHistory();
  report.bands[spot.bandIndex]!.elements.splice(spot.elementIndex, 1);
  report.updateJrxml();
}
</script>

<style scoped>
/* Same card as Paper, Margins… above it */
.watermark-card {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.04);
}

.card-head h5 {
  display: flex;
  align-items: center;
  margin: 0;
  color: #1c1b26;
  font-size: 13px;
  font-weight: 700;
}

.summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: 1px solid #eeedf4;
  border-radius: 8px;
  background: #fafafd;
}

.summary-icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: #f1edff;
  color: #6440f4;
}

.summary-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.summary-text strong {
  overflow: hidden;
  color: #1c1b26;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-text span {
  color: #6f6a7e;
  font-size: 11.5px;
  line-height: 1.4;
}

.hint {
  margin: 0;
  color: #6f6a7e;
  font-size: 12px;
  line-height: 1.45;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.primary-btn,
.plain-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.primary-btn {
  border: none;
  background: #6440f4;
  color: #ffffff;
}

.primary-btn:hover {
  background: #5534e0;
}

.plain-btn {
  border: 1px solid #e6e5ee;
  background: #ffffff;
  color: #45425a;
}

.plain-btn.is-danger {
  color: #b91c1c;
}

.plain-btn.is-danger:hover {
  border-color: #fca5a5;
  background: #fef2f2;
}

.primary-btn:focus-visible,
.plain-btn:focus-visible {
  outline: 2px solid #6440f4;
  outline-offset: 2px;
}
</style>
