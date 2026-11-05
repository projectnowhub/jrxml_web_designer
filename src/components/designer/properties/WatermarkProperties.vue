<template>
  <!-- Watermark settings in plain steps: what it shows, how it looks, its
       angle, where on the page, which pages. The page shows every change. -->
  <div class="watermark-properties">
    <!-- 1. What it shows -->
    <section class="card">
      <h5 class="step"><span class="step-no" aria-hidden="true">1</span>{{ t("watermark.panel.contentTitle") }}<SettingHelpButton id="watermarkContent" /></h5>
      <SettingHelpText id="watermarkContent" />
      <div class="kind-grid" role="radiogroup" :aria-label="t('watermark.panel.contentTitle')">
        <button
          v-for="kind in KINDS"
          :key="kind.id"
          type="button"
          role="radio"
          class="kind-card"
          :class="{ active: setup.kind === kind.id }"
          :aria-checked="setup.kind === kind.id"
          @click="update({ kind: kind.id })"
        >
          <component :is="kind.icon" :size="16" aria-hidden="true" />
          <span>{{ t(`watermark.kinds.${kind.id}`) }}</span>
        </button>
      </div>

      <!-- Text: its words (a line per line) and quick picks -->
      <template v-if="setup.kind === 'text'">
        <span class="field-label">{{ t("watermark.panel.words") }}</span>
        <textarea
          class="words-input"
          rows="2"
          maxlength="120"
          :value="setup.text"
          :placeholder="t('watermark.panel.wordsPlaceholder')"
          :aria-label="t('watermark.panel.words')"
          @focus="typing = false"
          @input="typeWords(($event.target as HTMLTextAreaElement).value)"
        ></textarea>
        <div class="pick-row">
          <button
            v-for="word in WATERMARK_WORDS"
            :key="word"
            type="button"
            class="chip-btn"
            :class="{ active: setup.text === t(`watermark.words.${word}`) }"
            @click="update({ text: t(`watermark.words.${word}`) })"
          >
            {{ t(`watermark.words.${word}`) }}
          </button>
        </div>
        <p class="hint">{{ t("watermark.panel.wordsHint") }}</p>
      </template>

      <!-- Picture: chosen like any picture; washed out to grey if wanted -->
      <template v-else>
        <span class="field-label">{{ t("watermark.panel.picture") }}</span>
        <div class="picture-row">
          <span class="picture-name" :class="{ 'is-empty': !setup.picture }" :title="pictureLabel">{{ pictureLabel }}</span>
          <button type="button" class="solid-btn" @click="pictureChooserOpen = true">
            <ImagePlus :size="14" aria-hidden="true" />
            {{ setup.picture ? t("watermark.panel.changePicture") : t("watermark.panel.choosePicture") }}
          </button>
        </div>
        <p v-if="state === 'error'" class="problem">
          {{ t("watermark.panel.pictureFailed") }}
          <button type="button" class="link-btn" @click="retry">{{ t("watermark.panel.retry") }}</button>
        </p>
        <label class="check-row">
          <input type="checkbox" :checked="setup.grey" @change="update({ grey: ($event.target as HTMLInputElement).checked })" />
          <span>{{ t("watermark.panel.grey") }}</span>
        </label>
        <p class="hint">{{ t("watermark.panel.pictureHint") }}</p>
        <PictureChooserModal v-model:visible="pictureChooserOpen" @choose="choosePicture" />
      </template>
    </section>

    <!-- 2. How it looks -->
    <section class="card">
      <h5 class="step"><span class="step-no" aria-hidden="true">2</span>{{ t("watermark.panel.lookTitle") }}<SettingHelpButton id="watermarkLook" /></h5>
      <SettingHelpText id="watermarkLook" />

      <template v-if="setup.kind === 'text'">
        <div class="color-row">
          <span class="field-label is-inline">{{ t("watermark.panel.colour") }}</span>
          <ColorSwatchPicker :model-value="setup.color" @update:model-value="dragColour" @change="endDrag" />
          <button
            type="button"
            class="chip-btn"
            :class="{ active: setup.bold }"
            :aria-pressed="setup.bold"
            @click="update({ bold: !setup.bold })"
          >
            <Bold :size="13" aria-hidden="true" />
            {{ t("watermark.panel.bold") }}
          </button>
        </div>
        <span class="field-label">{{ t("watermark.panel.size") }}</span>
        <div class="look-grid is-four" role="radiogroup" :aria-label="t('watermark.panel.size')">
          <button
            v-for="(size, i) in WATERMARK_SIZES"
            :key="size"
            type="button"
            role="radio"
            class="look-card"
            :class="{ active: setup.size === size }"
            :aria-checked="setup.size === size"
            @click="update({ size })"
          >
            {{ t(`watermark.sizes.${SIZE_NAMES[i]}`) }}
          </button>
        </div>
        <label class="number-row">
          <span>{{ t("watermark.panel.sizeOwn") }}</span>
          <span class="unit-input">
            <input
              v-live-change
              type="number"
              :min="WATERMARK_LIMITS.size.min"
              :max="WATERMARK_LIMITS.size.max"
              :value="setup.size"
              @change="setNumber('size', $event)"
            />
            <span>pt</span>
          </span>
        </label>
        <p class="hint">{{ t("watermark.panel.sizeHint") }}</p>
      </template>

      <template v-else>
        <span class="field-label">{{ t("watermark.panel.pictureSize") }}</span>
        <div class="slider-row">
          <input
            type="range"
            :min="WATERMARK_LIMITS.pictureSize.min"
            :max="WATERMARK_LIMITS.pictureSize.max"
            step="5"
            :value="setup.pictureSize"
            :aria-label="t('watermark.panel.pictureSize')"
            @input="dragValue('pictureSize', $event)"
            @change="endDrag"
          />
          <span class="slider-value">{{ t("watermark.panel.pictureSizeValue", { n: setup.pictureSize }) }}</span>
        </div>
      </template>

      <span class="field-label">{{ t("watermark.panel.strength") }}</span>
      <div class="look-grid is-four" role="radiogroup" :aria-label="t('watermark.panel.strength')">
        <button
          v-for="(opacity, i) in WATERMARK_OPACITIES"
          :key="opacity"
          type="button"
          role="radio"
          class="look-card"
          :class="{ active: setup.opacity === opacity }"
          :aria-checked="setup.opacity === opacity"
          @click="update({ opacity })"
        >
          {{ t(`watermark.strengths.${STRENGTH_NAMES[i]}`) }}
        </button>
      </div>
      <div class="slider-row">
        <input
          type="range"
          :min="WATERMARK_LIMITS.opacity.min"
          :max="WATERMARK_LIMITS.opacity.max"
          step="1"
          :value="setup.opacity"
          :aria-label="t('watermark.panel.strength')"
          @input="dragValue('opacity', $event)"
          @change="endDrag"
        />
        <span class="slider-value">{{ setup.opacity }}%</span>
      </div>
      <p v-if="setup.opacity > STRONG_OPACITY" class="problem">{{ t("watermark.panel.tooStrong") }}</p>
    </section>

    <!-- 3. Angle -->
    <section class="card">
      <h5 class="step"><span class="step-no" aria-hidden="true">3</span>{{ t("watermark.panel.angleTitle") }}<SettingHelpButton id="watermarkAngle" /></h5>
      <SettingHelpText id="watermarkAngle" />
      <div class="look-grid is-four" role="radiogroup" :aria-label="t('watermark.panel.angleTitle')">
        <button
          v-for="(angle, i) in WATERMARK_ANGLES"
          :key="angle"
          type="button"
          role="radio"
          class="angle-card"
          :class="{ active: setup.angle === angle }"
          :aria-checked="setup.angle === angle"
          @click="update({ angle })"
        >
          <span class="angle-sample" :style="{ transform: `rotate(${-angle}deg)` }" aria-hidden="true">Aa</span>
          <span class="angle-name">{{ t(`watermark.angles.${ANGLE_NAMES[i]}`) }}</span>
        </button>
      </div>
      <div class="slider-row">
        <input
          type="range"
          :min="WATERMARK_LIMITS.angle.min"
          :max="WATERMARK_LIMITS.angle.max"
          step="5"
          :value="setup.angle"
          :aria-label="t('watermark.panel.angleTitle')"
          @input="dragValue('angle', $event)"
          @change="endDrag"
        />
        <span class="slider-value">{{ setup.angle }}°</span>
      </div>
    </section>

    <!-- 4. Where on the page -->
    <section class="card">
      <h5 class="step"><span class="step-no" aria-hidden="true">4</span>{{ t("watermark.panel.placeTitle") }}<SettingHelpButton id="watermarkPlace" /></h5>
      <SettingHelpText id="watermarkPlace" />
      <div class="kind-grid" role="radiogroup" :aria-label="t('watermark.panel.placeTitle')">
        <button
          v-for="repeat in [false, true]"
          :key="String(repeat)"
          type="button"
          role="radio"
          class="kind-card"
          :class="{ active: setup.repeat === repeat }"
          :aria-checked="setup.repeat === repeat"
          @click="update({ repeat })"
        >
          <component :is="repeat ? Grid3x3 : Square" :size="16" aria-hidden="true" />
          <span>{{ t(repeat ? "watermark.panel.repeated" : "watermark.panel.once") }}</span>
        </button>
      </div>
      <template v-if="!setup.repeat">
        <span class="field-label">{{ t("watermark.panel.spot") }}</span>
        <div class="place-grid" role="radiogroup" :aria-label="t('watermark.panel.spot')">
          <button
            v-for="place in WATERMARK_PLACES"
            :key="place"
            type="button"
            role="radio"
            class="place-btn"
            :class="{ active: setup.place === place }"
            :aria-checked="setup.place === place"
            :title="t(`watermark.places.${place}`)"
            :aria-label="t(`watermark.places.${place}`)"
            @click="update({ place })"
          >
            <span class="place-dot" aria-hidden="true"></span>
          </button>
        </div>
        <p class="hint">{{ t(`watermark.places.${setup.place}`) }}</p>
      </template>
      <p v-else class="hint">{{ t("watermark.panel.repeatedHint") }}</p>
    </section>

    <!-- 5. Which pages (only with a cover or contents pages) -->
    <section v-if="hasSpecialPages" class="card">
      <h5 class="step"><span class="step-no" aria-hidden="true">5</span>{{ t("watermark.panel.pagesTitle") }}<SettingHelpButton id="watermarkPages" /></h5>
      <SettingHelpText id="watermarkPages" />
      <div class="pages-list" role="radiogroup" :aria-label="t('watermark.panel.pagesTitle')">
        <button
          v-for="pages in pageChoices"
          :key="pages"
          type="button"
          role="radio"
          class="pages-card"
          :class="{ active: setup.pages === pages }"
          :aria-checked="setup.pages === pages"
          @click="update({ pages })"
        >
          {{ t(`watermark.pages.${pages}`) }}
        </button>
      </div>
      <p v-if="special.fullPageCover" class="hint">{{ t("watermark.panel.sheetCoverNote") }}</p>
    </section>

    <!-- No watermark any more (the Delete key does the same) -->
    <section class="card">
      <button type="button" class="remove-btn" @click="removeWatermark">
        <Trash2 :size="14" aria-hidden="true" />
        {{ t("watermark.panel.remove") }}
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import SettingHelpButton from "../../help/SettingHelpButton.vue";
import SettingHelpText from "../../help/SettingHelpText.vue";
import ColorSwatchPicker from "../../common/ColorSwatchPicker.vue";
import PictureChooserModal from "../../modals/PictureChooserModal.vue";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Bold, Grid3x3, ImagePlus, Image as ImageIcon, Square, Trash2, Type } from "@lucide/vue";
import { useReportStore } from "@/stores/report";
import { useSelectionStore } from "@/stores/selection";
import type { ImageElement } from "../../../types";
import type { ChosenPicture } from "../../../types/projectPhoto";
import { specialPages } from "../../../utils/specialPages";
import {
  getWatermarkSetup,
  normalizeWatermarkSetup,
  setWatermarkSetup,
  WATERMARK_ANGLES,
  WATERMARK_LIMITS,
  WATERMARK_OPACITIES,
  WATERMARK_PLACES,
  WATERMARK_SIZES,
  WATERMARK_WORDS,
  type WatermarkPages,
  type WatermarkSetup,
} from "../../../utils/watermark/watermarkElement";
import { refreshWatermarks, watermarkStates } from "../../../utils/watermark/watermarkPictures";

const KINDS = [
  { id: "text", icon: Type },
  { id: "picture", icon: ImageIcon },
] as const;
const SIZE_NAMES = ["small", "medium", "large", "huge"] as const;
const STRENGTH_NAMES = ["veryLight", "light", "medium", "strong"] as const;
const ANGLE_NAMES = ["diagonalUp", "straight", "diagonalDown", "upwards"] as const;
// Above this, the content over it gets hard to read
const STRONG_OPACITY = 40;

const props = defineProps<{
  element: ImageElement;
}>();

const report = useReportStore();
const { t } = useI18n();

const setup = computed(() => getWatermarkSetup(props.element));
const special = computed(() => specialPages(report.reportProperties));
const hasSpecialPages = computed(() => special.value.count > 0);
// "All but the cover" only when there is a cover
const pageChoices = computed<WatermarkPages[]>(() =>
  special.value.cover ? ["all", "notCover", "normal"] : ["all", "normal"],
);
const state = computed(() => (props.element.uuid ? watermarkStates[props.element.uuid] : undefined));

const pictureChooserOpen = ref(false);
const pictureLabel = computed(() =>
  setup.value.picture ? setup.value.pictureName || t("watermark.panel.pictureNoName") : t("watermark.panel.noPicture"),
);

// One undo step per change
function update(patch: Partial<WatermarkSetup>) {
  const next = normalizeWatermarkSetup({ ...setup.value, ...patch });
  if (JSON.stringify(next) === JSON.stringify(setup.value)) return;
  report.saveStateToHistory();
  setWatermarkSetup(props.element, next);
  report.updateJrxml();
}

// Typing, a slider or a colour dragged: one undo step for the whole visit / drag
const typing = ref(false);
const dragging = ref(false);
function applyLive(patch: Partial<WatermarkSetup>, recorded: { value: boolean }) {
  const next = normalizeWatermarkSetup({ ...setup.value, ...patch });
  if (JSON.stringify(next) === JSON.stringify(setup.value)) return;
  if (!recorded.value) {
    report.saveStateToHistory();
    recorded.value = true;
  }
  setWatermarkSetup(props.element, next);
  report.updateJrxml();
}
const typeWords = (text: string) => applyLive({ text }, typing);
const dragColour = (color: string) => applyLive({ color }, dragging);
function dragValue(key: "pictureSize" | "opacity" | "angle", event: Event) {
  applyLive({ [key]: Number((event.target as HTMLInputElement).value) }, dragging);
}
const endDrag = () => {
  dragging.value = false;
};

// A typed size: applied when typing stops (v-live-change); refused values put back
function setNumber(key: "size", event: Event) {
  const input = event.target as HTMLInputElement;
  const value = Number(input.value);
  const { min, max } = WATERMARK_LIMITS[key];
  if (!Number.isFinite(value) || value < min || value > max) {
    if (event.isTrusted) input.value = String(setup.value[key]);
    return;
  }
  update({ [key]: Math.round(value) });
}

function choosePicture(picture: ChosenPicture) {
  update({ picture: picture.source, pictureName: picture.name });
}

const retry = () => refreshWatermarks(() => report.bands, () => report.updateJrxml(), true);

// Remove it: one undo step, nothing selected afterwards
const selection = useSelectionStore();
function removeWatermark() {
  const band = report.bands.find((b) => b.type === "background");
  const index = band?.elements.indexOf(props.element) ?? -1;
  if (!band || index === -1) return;
  report.saveStateToHistory();
  band.elements.splice(index, 1);
  selection.selectedElement = null;
  selection.selectedElements = [];
  report.updateJrxml();
}
</script>

<style scoped>
/* Sized for easy reading, like the date and page-number panels */
.watermark-properties {
  font-size: 13px;
}

.card {
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.04);
}

.step {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--prop-text-primary);
}

.step-no {
  display: inline-grid;
  flex-shrink: 0;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--prop-primary-color, #6440f4);
  font-size: 12px;
  font-weight: 700;
  color: #fff;
}

.field-label {
  display: block;
  margin: 14px 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--prop-text-primary);
}

.field-label.is-inline {
  margin: 0;
}

.hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--prop-text-secondary);
}

.problem {
  margin: 8px 0 0;
  padding: 6px 10px;
  border-radius: 6px;
  background: #fffbeb;
  font-size: 12px;
  line-height: 1.45;
  color: #92400e;
}

.kind-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.kind-card,
.look-card,
.angle-card,
.pages-card {
  border: 1px solid var(--prop-border-color);
  border-radius: 8px;
  background: #fff;
  color: var(--prop-text-primary);
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.kind-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 38px;
  font-size: 13px;
  font-weight: 600;
}

.kind-card:hover,
.look-card:hover,
.angle-card:hover,
.pages-card:hover,
.place-btn:hover {
  border-color: var(--prop-border-hover, #9ca3af);
}

.kind-card.active,
.look-card.active,
.angle-card.active,
.pages-card.active {
  border-color: var(--prop-primary-color, #6440f4);
  box-shadow: inset 0 0 0 1px var(--prop-primary-color, #6440f4);
  background: #f1edff;
  color: var(--prop-primary-color, #6440f4);
}

.look-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.look-grid.is-four {
  grid-template-columns: repeat(4, 1fr);
}

.look-card {
  min-width: 0;
  min-height: 32px;
  padding: 4px 4px;
  overflow: hidden;
  font-size: 12px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.angle-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 10px 4px 6px;
}

.angle-sample {
  display: inline-block;
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
}

.angle-name {
  max-width: 100%;
  overflow: hidden;
  font-size: 11.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pages-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pages-card {
  min-height: 34px;
  padding: 6px 10px;
  font-size: 13px;
  text-align: left;
}

.place-grid {
  display: grid;
  grid-template-columns: repeat(3, 34px);
  gap: 4px;
  padding: 6px;
  border: 1px solid var(--prop-border-color);
  border-radius: 8px;
  width: max-content;
  background: #fafafc;
}

.place-btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}

.place-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #d4d1e0;
}

.place-btn.active {
  border-color: var(--prop-primary-color, #6440f4);
  background: #f1edff;
}

.place-btn.active .place-dot {
  background: var(--prop-primary-color, #6440f4);
}

.words-input {
  width: 100%;
  min-height: 52px;
  padding: 8px 10px;
  border: 1px solid var(--prop-border-color);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  line-height: 1.4;
  resize: vertical;
  box-sizing: border-box;
}

.words-input:focus,
.unit-input input:focus {
  border-color: var(--prop-border-focus, #6440f4);
  outline: none;
}

.pick-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.chip-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--prop-border-color);
  border-radius: 999px;
  background: #fff;
  font-size: 12px;
  color: var(--prop-text-primary);
  cursor: pointer;
}

.chip-btn:hover {
  border-color: var(--prop-border-hover, #9ca3af);
}

.chip-btn.active {
  border-color: var(--prop-primary-color, #6440f4);
  background: #f1edff;
  color: var(--prop-primary-color, #6440f4);
}

.color-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.number-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 8px;
  font-size: 12.5px;
  color: var(--prop-text-secondary);
}

.unit-input {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.unit-input input {
  width: 76px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--prop-border-color);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  box-sizing: border-box;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.slider-row input[type="range"] {
  flex: 1;
  min-width: 0;
  accent-color: var(--prop-primary-color, #6440f4);
}

.slider-value {
  min-width: 64px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--prop-text-primary);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.picture-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.picture-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 12.5px;
  color: var(--prop-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picture-name.is-empty {
  color: var(--prop-text-secondary);
}

.solid-btn {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: none;
  border-radius: 8px;
  background: var(--prop-primary-color, #6440f4);
  font-size: 12.5px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
}

.solid-btn:hover {
  background: #5534e0;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 13px;
  color: var(--prop-text-primary);
  cursor: pointer;
}

.check-row input {
  accent-color: var(--prop-primary-color, #6440f4);
}

.link-btn {
  padding: 0;
  border: none;
  background: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--prop-primary-color, #6440f4);
  text-decoration: underline;
  cursor: pointer;
}

.remove-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--prop-border-color);
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  color: #b91c1c;
  cursor: pointer;
}

.remove-btn:hover {
  border-color: #fca5a5;
  background: #fef2f2;
}

.remove-btn:focus-visible,
.kind-card:focus-visible,
.look-card:focus-visible,
.angle-card:focus-visible,
.pages-card:focus-visible,
.place-btn:focus-visible,
.chip-btn:focus-visible,
.solid-btn:focus-visible {
  outline: 2px solid var(--prop-border-focus, #6440f4);
  outline-offset: 2px;
}
</style>
