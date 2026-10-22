<template>
  <!-- A Location in plain steps: the place (typed, or copied from a project),
       the map, the layout, and which address lines show -->
  <div class="location-properties">
    <!-- 1. The place -->
    <section class="card">
      <h5 class="step"><span class="step-no" aria-hidden="true">1</span>{{ t("location.panel.placeTitle") }}<SettingHelpButton id="locationPlace" /></h5>
      <SettingHelpText id="locationPlace" />
      <label v-if="projectPlaces.length" class="copy-row">
        <span class="field-label is-first">{{ t("location.panel.copyFrom") }}</span>
        <select class="card-select" :value="''" @change="copyFrom(($event.target as HTMLSelectElement))">
          <option value="">{{ t("location.panel.chooseProject") }}</option>
          <option v-for="p in projectPlaces" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </label>
      <div class="place-grid">
        <label v-for="field in SHORT_FIELDS" :key="field" class="place-field">
          <span class="field-label">{{ t(`location.fields.${field}`) }}</span>
          <input
            type="text"
            :value="setup[field]"
            :placeholder="t(`location.placeholders.${field}`)"
            @focus="typing = ''"
            @input="typeField(field, ($event.target as HTMLInputElement).value)"
          />
        </label>
        <label class="place-field is-wide">
          <span class="field-label">{{ t("location.fields.address") }}</span>
          <textarea
            rows="2"
            :value="setup.address"
            :placeholder="t('location.placeholders.address')"
            @focus="typing = ''"
            @input="typeField('address', ($event.target as HTMLTextAreaElement).value)"
          ></textarea>
        </label>
        <label v-for="field in POINT_FIELDS" :key="field" class="place-field">
          <span class="field-label">{{ t(`location.fields.${field}`) }}</span>
          <input
            type="text"
            inputmode="decimal"
            :value="setup[field]"
            :placeholder="t(`location.placeholders.${field}`)"
            :class="{ 'has-problem': problems[field] }"
            @focus="typing = ''"
            @input="typePoint(field, ($event.target as HTMLInputElement).value)"
          />
          <span v-if="problems[field]" class="problem">{{ t(`location.problems.${problems[field]}`) }}</span>
        </label>
      </div>
    </section>

    <!-- 2. The map -->
    <section v-if="setup.layout !== 'addressOnly'" class="card">
      <h5 class="step"><span class="step-no" aria-hidden="true">2</span>{{ t("location.panel.mapTitle") }}<SettingHelpButton id="locationMap" /></h5>
      <SettingHelpText id="locationMap" />
      <LocationMapPicker :point="point" :zoom="setup.zoom" :ratio="mapRatio" @move="movePin" @zoom="setZoom" />
      <p class="hint">
        <strong>{{ t(`location.levels.${zoomLevel}`) }}</strong> · {{ t("location.panel.mapHint") }}
      </p>
      <!-- The address of the spot under the pin (as the CDP app's picker fills it) -->
      <button v-if="point" type="button" class="fill-btn" :disabled="filling" @click="fillAddress">
        <Loader2 v-if="filling" :size="14" class="spin" aria-hidden="true" />
        <MapPinned v-else :size="14" aria-hidden="true" />
        {{ filling ? t("location.panel.fillingAddress") : t("location.panel.fillAddress") }}
      </button>
      <p v-if="fillFailed" class="hint is-error">{{ t("location.panel.fillFailed") }}</p>
      <p v-if="mapState === 'error'" class="hint is-error">
        {{ t("location.states.errorHint") }}
        <button type="button" class="link-btn" @click="retryMap">{{ t("location.panel.retry") }}</button>
      </p>
    </section>

    <!-- 3. The layout -->
    <section class="card">
      <h5 class="step"><span class="step-no" aria-hidden="true">{{ setup.layout === 'addressOnly' ? 2 : 3 }}</span>{{ t("location.panel.layoutTitle") }}<SettingHelpButton id="locationLayout" /></h5>
      <SettingHelpText id="locationLayout" />
      <div class="layout-grid" role="radiogroup" :aria-label="t('location.panel.layoutTitle')">
        <button
          v-for="layout in LOCATION_LAYOUTS"
          :key="layout"
          type="button"
          role="radio"
          class="layout-card"
          :class="{ active: setup.layout === layout }"
          :aria-checked="setup.layout === layout"
          @click="update({ layout })"
        >
          <span class="layout-preview" :class="`is-${layout}`" aria-hidden="true">
            <span v-if="layout !== 'addressOnly'" class="lp-map"></span>
            <span v-if="layout !== 'mapOnly'" class="lp-lines"><i></i><i></i><i></i></span>
          </span>
          <span class="layout-name">{{ t(`location.layouts.${layout}`) }}</span>
        </button>
      </div>
    </section>

    <!-- 4. The address lines -->
    <section v-if="setup.layout !== 'mapOnly'" class="card">
      <h5 class="step"><span class="step-no" aria-hidden="true">{{ setup.layout === 'addressOnly' ? 3 : 4 }}</span>{{ t("location.panel.linesTitle") }}<SettingHelpButton id="locationLines" /></h5>
      <SettingHelpText id="locationLines" />
      <div class="lines-list">
        <label v-for="line in ADDRESS_LINES" :key="line" class="line-check">
          <input type="checkbox" :checked="setup.show[line]" @change="update({ show: { ...setup.show, [line]: !setup.show[line] } })" />
          <span>{{ t(`location.lines.${line}`) }}</span>
        </label>
      </div>
      <p class="preview-label">{{ t("location.panel.shows") }}</p>
      <p class="address-preview">
        <template v-if="lines.length">
          <span v-for="(line, i) in lines" :key="i">{{ line }}</span>
        </template>
        <em v-else>{{ t("location.panel.noLines") }}</em>
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import SettingHelpButton from "../../help/SettingHelpButton.vue";
import SettingHelpText from "../../help/SettingHelpText.vue";
import LocationMapPicker from "./LocationMapPicker.vue";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useReportStore } from "@/stores/report";
import { getProject } from "@/services/dataSourceService";
import { reverseGeocode } from "@/services/geocodeService";
import { Loader2, MapPinned } from "@lucide/vue";
import type { FrameElement } from "../../../types";
import type { ReportProject } from "@/types/dataSource";
import {
  ADDRESS_LINES,
  addressLines,
  coordinateProblem,
  formatCoordinate,
  getLocationSetup,
  isLocationMap,
  LOCATION_LAYOUTS,
  normalizeLocationSetup,
  PLACE_FIELDS,
  placePoint,
  splitPastedPoint,
  toPlace,
  updateLocation,
  type LocationSetup,
  type Place,
  type PlaceField,
} from "../../../utils/location/locationElement";
import { mapStates, refreshLocationMaps } from "../../../utils/location/locationMaps";

const props = defineProps<{ box: FrameElement }>();

const report = useReportStore();
const { t } = useI18n();

const SHORT_FIELDS = ["country", "state", "city", "postcode"] as const satisfies readonly PlaceField[];
const POINT_FIELDS = ["latitude", "longitude"] as const;

const setup = computed(() => getLocationSetup(props.box));
const point = computed(() => placePoint(setup.value));
const lines = computed(() => addressLines(setup.value));
const problems = computed(() => ({
  latitude: coordinateProblem("latitude", setup.value.latitude),
  longitude: coordinateProblem("longitude", setup.value.longitude),
}));

const font = () => ({
  fontFamily: report.reportProperties.defaultFont?.name,
  fontSize: report.reportProperties.defaultFont?.size,
});

// One undo step per change
function update(patch: Partial<LocationSetup>) {
  const next = normalizeLocationSetup({ ...setup.value, ...patch });
  if (JSON.stringify(next) === JSON.stringify(setup.value)) return;
  report.saveStateToHistory();
  updateLocation(props.box, patch, font());
  report.updateJrxml();
}

// Typing is one undo step per visit to a field, not one per key
const typing = ref("");
function typeField(field: PlaceField, value: string) {
  if (typing.value !== field) {
    report.saveStateToHistory();
    typing.value = field;
  }
  updateLocation(props.box, { [field]: value }, font());
  report.updateJrxml();
}

// "3.1390, 101.6869" pasted into either one fills both
function typePoint(field: "latitude" | "longitude", value: string) {
  const both = splitPastedPoint(value);
  if (!both) return typeField(field, value);
  if (typing.value !== field) {
    report.saveStateToHistory();
    typing.value = field;
  }
  updateLocation(props.box, both, font());
  report.updateJrxml();
}

// Country, state, city, postcode and street from the spot under the pin
// (one undo step; only when asked, so typed fields are never replaced unasked)
const filling = ref(false);
const fillFailed = ref(false);
async function fillAddress() {
  const at = point.value;
  if (!at || filling.value) return;
  filling.value = true;
  fillFailed.value = false;
  try {
    const found = await reverseGeocode(at.latitude, at.longitude);
    update(Object.fromEntries(Object.entries(found).filter(([, v]) => v)));
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    fillFailed.value = true;
  } finally {
    filling.value = false;
  }
}

const movePin = (p: { latitude: number; longitude: number }, zoom?: number) =>
  update({ latitude: formatCoordinate(p.latitude), longitude: formatCoordinate(p.longitude), ...(zoom ? { zoom } : {}) });
const setZoom = (zoom: number) => update({ zoom });

// The map part's proportions, so the panel's map shows what prints
const mapPart = computed(() => (props.box.elements ?? []).find(isLocationMap));
const mapRatio = computed(() => (mapPart.value ? mapPart.value.height / Math.max(1, mapPart.value.width) : 0.6));

// How close the map is, in words
const zoomLevel = computed(() => {
  const z = setup.value.zoom;
  return z <= 5 ? "country" : z <= 8 ? "region" : z <= 11 ? "city" : z <= 14 ? "area" : z <= 16 ? "streets" : "buildings";
});

const mapState = computed(() => (props.box.uuid ? mapStates[props.box.uuid] : undefined));
const retryMap = () => refreshLocationMaps(() => report.bands, () => report.updateJrxml(), true);

// The report's projects that have a location (Report Data), to copy one
const projectPlaces = ref<(ReportProject & { place: Place })[]>([]);
watch(
  () => (report.reportProperties.projects ?? []).map((p) => p.id).join("|"),
  async () => {
    const projects = report.reportProperties.projects ?? [];
    const found = await Promise.all(
      projects.map(async (p) => {
        try {
          const details = await getProject(p.id);
          const place = toPlace(details.location);
          return PLACE_FIELDS.some((f) => place[f]) ? { ...p, place } : null;
        } catch {
          return null;
        }
      }),
    );
    projectPlaces.value = found.filter((p) => p !== null);
  },
  { immediate: true },
);

function copyFrom(select: HTMLSelectElement) {
  const project = projectPlaces.value.find((p) => p.id === select.value);
  select.value = "";
  if (project) update(project.place);
}
</script>

<style scoped>
/* Sized for easy reading, like the Date and page-number panels */
.location-properties {
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
  margin: 10px 0 4px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--prop-text-primary);
}

.field-label.is-first {
  margin-top: 0;
}

.copy-row {
  display: block;
  margin-bottom: 4px;
}

.place-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 8px;
}

.place-field {
  min-width: 0;
}

.place-field.is-wide {
  grid-column: 1 / -1;
}

input[type="text"],
textarea,
.card-select {
  width: 100%;
  padding: 0 10px;
  border: 1px solid var(--prop-border-color);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  background: #fff;
  box-sizing: border-box;
}

input[type="text"],
.card-select {
  height: 36px;
}

textarea {
  padding: 8px 10px;
  resize: vertical;
  line-height: 1.4;
}

input:focus,
textarea:focus,
.card-select:focus {
  border-color: var(--prop-border-focus, #6440f4);
  outline: none;
}

input.has-problem {
  border-color: #dc2626;
}

.problem {
  display: block;
  margin-top: 3px;
  font-size: 11.5px;
  color: #dc2626;
}

.hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--prop-text-secondary);
}

.hint.is-error {
  color: #dc2626;
}

.fill-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 6px 10px;
  border: 1px solid var(--prop-border-color);
  border-radius: 8px;
  background: #fff;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--prop-text-primary);
  cursor: pointer;
}

.fill-btn:hover:not(:disabled) {
  border-color: var(--prop-primary-color, #6440f4);
  color: var(--prop-primary-color, #6440f4);
}

.fill-btn:disabled {
  cursor: progress;
  opacity: 0.7;
}

.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.link-btn {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 600;
  color: var(--prop-primary-color, #6440f4);
  text-decoration: underline;
  cursor: pointer;
}

.layout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.layout-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 8px 6px;
  border: 1px solid var(--prop-border-color);
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.layout-card:hover {
  border-color: var(--prop-border-hover, #9ca3af);
}

.layout-card.active {
  border-color: var(--prop-primary-color, #6440f4);
  box-shadow: inset 0 0 0 1px var(--prop-primary-color, #6440f4);
  background: #f1edff;
}

.layout-card:focus-visible {
  outline: 2px solid var(--prop-border-focus, #6440f4);
  outline-offset: 2px;
}

.layout-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--prop-text-primary);
  text-align: center;
}

.layout-card.active .layout-name {
  color: var(--prop-primary-color, #6440f4);
}

/* Small drawings of each layout: a map block and address lines */
.layout-preview {
  display: flex;
  gap: 4px;
  width: 64px;
  height: 44px;
}

.layout-preview.is-mapAbove,
.layout-preview.is-addressOnly {
  flex-direction: column;
}

.lp-map {
  flex: 1;
  border-radius: 3px;
  background: linear-gradient(135deg, #cfe8d5 0 40%, #aad3df 40% 60%, #f3eee3 60%);
  position: relative;
}

.lp-map::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50% 50% 50% 0;
  background: #e5383b;
  transform: translate(-50%, -70%) rotate(-45deg);
}

.layout-preview.is-mapBeside .lp-map {
  flex: 0 0 55%;
}

.lp-lines {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
}

.layout-preview.is-mapBeside .lp-lines {
  flex: 1;
}

.layout-preview.is-addressOnly .lp-lines {
  flex: 1;
}

.lp-lines i {
  display: block;
  height: 3px;
  border-radius: 2px;
  background: #b8b5c4;
}

.lp-lines i:nth-child(2) {
  width: 80%;
}

.lp-lines i:nth-child(3) {
  width: 60%;
}

.lines-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 8px;
}

.line-check {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  font-size: 12.5px;
  color: var(--prop-text-primary);
  cursor: pointer;
}

.line-check input {
  width: 15px;
  height: 15px;
  accent-color: var(--prop-primary-color, #6440f4);
}

.preview-label {
  margin: 10px 0 4px;
  font-size: 12px;
  color: var(--prop-text-secondary);
}

.address-preview {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f7f6fb;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--prop-text-primary);
}

.address-preview em {
  color: var(--prop-text-secondary);
}
</style>
