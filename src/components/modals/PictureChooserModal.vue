<template>
  <!-- The picture of an Image element: one of the template's project photos
       (the CDP app's Photos page, with its filters), or a file from the
       computer. Teleported: it is opened from inside the zoomed page. -->
  <Teleport to="body">
    <BaseModal
      :visible="visible"
      :title="t('pictureChooser.title')"
      :show-footer="tab === 'photos' && !!projectId"
      :content-style="{ width: 'min(1120px, 96vw)', maxWidth: '96vw' }"
      @update:visible="emit('update:visible', $event)"
    >
      <!-- Keys typed here never reach the page (Backspace would delete the image) -->
      <div class="pc" @keydown.stop="onKey">
        <div class="pc-tabs" role="tablist">
          <button
            v-for="item in TABS"
            :key="item"
            type="button"
            role="tab"
            class="pc-tab"
            :class="{ active: tab === item }"
            :aria-selected="tab === item"
            @click="tab = item"
          >
            <component :is="item === 'photos' ? Images : HardDrive" :size="15" aria-hidden="true" />
            {{ t(`pictureChooser.tabs.${item}`) }}
          </button>
        </div>

        <!-- Project photos -->
        <div v-if="tab === 'photos'" class="pc-body">
          <div v-if="!projectId" class="pc-empty">
            <FolderKanban :size="28" aria-hidden="true" />
            <strong>{{ t("pictureChooser.noProject") }}</strong>
            <span>{{ t("pictureChooser.noProjectHint") }}</span>
          </div>

          <template v-else>
            <!-- Filters, laid out like the CDP Photos page's bar -->
            <div class="pc-filters">
              <div class="pc-filter-row">
                <label v-if="projects.length > 1" class="pc-field">
                  <span>{{ t("pictureChooser.project") }}</span>
                  <span class="pc-select-wrap">
                    <select v-model="projectId" class="pc-select">
                      <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option>
                    </select>
                    <ChevronDown :size="13" aria-hidden="true" />
                  </span>
                </label>
                <label class="pc-field">
                  <span>{{ t("pictureChooser.filterBy") }}</span>
                  <span class="pc-select-wrap">
                    <select v-model="dateKind" class="pc-select">
                      <option value="uploadedAt">{{ t("pictureChooser.dateKinds.uploadedAt") }}</option>
                      <option value="photoTakenAt">{{ t("pictureChooser.dateKinds.photoTakenAt") }}</option>
                    </select>
                    <ChevronDown :size="13" aria-hidden="true" />
                  </span>
                </label>
                <label class="pc-field">
                  <span>{{ t("pictureChooser.period") }}</span>
                  <span class="pc-select-wrap">
                    <select :value="period" class="pc-select" @change="pickPeriod(($event.target as HTMLSelectElement).value as PhotoPeriod)">
                      <option v-for="item in PHOTO_PERIODS" :key="item" :value="item">{{ t(`pictureChooser.periods.${item}`) }}</option>
                    </select>
                    <ChevronDown :size="13" aria-hidden="true" />
                  </span>
                </label>
                <label class="pc-field">
                  <span>{{ t("pictureChooser.from") }}</span>
                  <input :value="startDate ?? ''" type="date" class="pc-date" :max="endDate ?? undefined" @change="typeDate('start', $event)" />
                </label>
                <label class="pc-field">
                  <span>{{ t("pictureChooser.to") }}</span>
                  <input :value="endDate ?? ''" type="date" class="pc-date" :min="startDate ?? undefined" @change="typeDate('end', $event)" />
                </label>
                <button type="button" class="pc-clear" :disabled="!hasFilters" @click="clearFilters">
                  <X :size="13" aria-hidden="true" />{{ t("pictureChooser.clearFilters") }}
                </button>
              </div>
              <div v-if="tags.length" class="pc-tag-row">
                <span class="pc-tag-label">{{ t("pictureChooser.tags") }}</span>
                <button
                  v-for="tag in tags"
                  :key="tag.id ?? tag.name"
                  type="button"
                  class="pc-tag"
                  :class="{ on: chosenTags.includes(tag.name) }"
                  :aria-pressed="chosenTags.includes(tag.name)"
                  @click="toggleTag(tag.name)"
                >
                  <span class="pc-tag-dot" aria-hidden="true" />{{ tag.name }}
                </button>
              </div>
            </div>

            <p class="pc-count">{{ t("pictureChooser.count", total) }}</p>

            <div class="pc-grid-wrap" :class="{ fetching: photosQuery.isFetching.value && !photosQuery.isLoading.value }">
              <div v-if="photosQuery.isLoading.value" class="pc-grid">
                <SkeletonBlock v-for="i in 8" :key="i" height="auto" radius="10px" class="pc-skeleton" />
              </div>
              <div v-else-if="photosQuery.isError.value" class="pc-empty">
                <ImageOff :size="28" aria-hidden="true" />
                <strong>{{ t("pictureChooser.loadFailed") }}</strong>
                <button type="button" class="pc-retry" @click="photosQuery.refetch()">{{ t("pictureChooser.retry") }}</button>
              </div>
              <div v-else-if="!photos.length" class="pc-empty">
                <ImageOff :size="28" aria-hidden="true" />
                <strong>{{ hasFilters ? t("pictureChooser.noMatch") : t("pictureChooser.none") }}</strong>
                <span>{{ hasFilters ? t("pictureChooser.noMatchHint") : t("pictureChooser.noneHint") }}</span>
              </div>
              <div v-else class="pc-grid">
                <ProjectPhotoCard
                  v-for="photo in photos"
                  :key="photo.id"
                  :photo="photo"
                  :chosen="chosen?.id === photo.id"
                  @choose="chosen = photo"
                  @use="usePhoto(photo)"
                />
              </div>
            </div>

            <PageNavigation
              v-if="total > PHOTO_PAGE_SIZE"
              class="pc-pages"
              :page="page"
              :page-size="PHOTO_PAGE_SIZE"
              :total="total"
              @update:page="page = $event"
            />
          </template>
        </div>

        <!-- From the computer -->
        <div v-else class="pc-body">
          <div
            class="pc-drop"
            :class="{ over: dragOver, busy: uploading }"
            role="button"
            tabindex="0"
            :aria-busy="uploading"
            @click="pickFile"
            @keydown.enter="pickFile"
            @dragover.prevent="dragOver = true"
            @dragleave="dragOver = false"
            @drop.prevent="onDrop"
          >
            <Loader2 v-if="uploading" :size="28" class="pc-spin" aria-hidden="true" />
            <Upload v-else :size="28" :stroke-width="2" aria-hidden="true" />
            <strong>{{ uploading ? t("properties.uploadingImage") : t("pictureChooser.dropTitle") }}</strong>
            <span>{{ t("properties.imageUploadHint") }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <span class="pc-footer-hint">{{ chosen ? chosen.name : t("pictureChooser.chooseHint") }}</span>
        <n-button @click="close">{{ t("common.cancel") }}</n-button>
        <n-button type="primary" :disabled="!chosen" @click="chosen && usePhoto(chosen)">
          {{ t("pictureChooser.usePhoto") }}
        </n-button>
      </template>
    </BaseModal>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { NButton } from "naive-ui";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import { ChevronDown, FolderKanban, HardDrive, ImageOff, Images, Loader2, Upload, X } from "@lucide/vue";
import BaseModal from "./BaseModal.vue";
import ProjectPhotoCard from "./ProjectPhotoCard.vue";
import PageNavigation from "@/components/common/PageNavigation.vue";
import SkeletonBlock from "@/components/common/SkeletonBlock.vue";
import { useReportStore } from "@/stores/report";
import { photoTagsQuery, projectPhotosQuery } from "@/queries/photoQueries";
import { ImageUploadError, resolveImageSource } from "@/services/imageService";
import { toFileRefParam } from "@/services/helpers/fileRefHelpers";
import { PHOTO_PAGE_SIZE, PHOTO_PERIOD_DAYS, PHOTO_PERIODS } from "@/constants/photoConstants";
import notification from "@/utils/notification";
import type { FileTag } from "@/types/entities/fileTag";
import type { ChosenPicture, PhotoDateKind, PhotoPeriod, ProjectPhotoFilter } from "@/types/projectPhoto";

const props = defineProps<{
  visible: boolean;
  // The tab to open on (the right-click menu's two items); none: Project photos when there is a project
  initialTab?: "photos" | "computer";
}>();
const emit = defineEmits<{
  "update:visible": [value: boolean];
  choose: [picture: ChosenPicture];
}>();

const { t } = useI18n();
const report = useReportStore();

const TABS = ["photos", "computer"] as const;
const tab = ref<(typeof TABS)[number]>("photos");

// The template's projects (one for now); photos come from the one chosen here
const projects = computed(() => report.reportProperties.projects ?? []);
const projectId = ref("");

const dateKind = ref<PhotoDateKind>("uploadedAt");
const period = ref<PhotoPeriod>("all");
const startDate = ref<string | null>(null);
const endDate = ref<string | null>(null);
const chosenTags = ref<string[]>([]);
const page = ref(1);
const chosen = ref<FileTag | null>(null);

const dragOver = ref(false);
const uploading = ref(false);

watch(
  () => props.visible,
  (open) => {
    if (!open) return;
    projectId.value = projects.value[0]?.id ?? "";
    tab.value = props.initialTab ?? (projectId.value ? "photos" : "computer");
    chosen.value = null;
    dragOver.value = false;
  },
);

const filter = computed<ProjectPhotoFilter>(() => ({
  startDate: startDate.value,
  endDate: endDate.value,
  tags: chosenTags.value,
  filterByDate: dateKind.value,
}));
// A new filter or project starts again at page 1
watch([filter, projectId], () => {
  page.value = 1;
});

const photosQuery = useQuery(
  computed(() => ({
    ...projectPhotosQuery({ projectId: projectId.value, filter: filter.value, page: page.value, size: PHOTO_PAGE_SIZE }),
    enabled: props.visible && tab.value === "photos" && !!projectId.value,
    placeholderData: keepPreviousData,
  })),
);
const photos = computed(() => photosQuery.data.value?.data ?? []);
const total = computed(() => photosQuery.data.value?.total ?? 0);

const tagsQuery = useQuery(computed(() => photoTagsQuery(props.visible && !!projectId.value)));
const tags = computed(() => tagsQuery.data.value ?? []);

const hasFilters = computed(() => !!(startDate.value || endDate.value || chosenTags.value.length));

// yyyy-MM-dd of a day in the user's own time zone
const isoDay = (day: Date) =>
  `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;

// A period fills From / To (today back N days); All time clears them
function pickPeriod(next: PhotoPeriod) {
  period.value = next;
  if (next === "custom") return;
  if (next === "all") {
    startDate.value = null;
    endDate.value = null;
    return;
  }
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (PHOTO_PERIOD_DAYS[next] ?? 0));
  startDate.value = isoDay(start);
  endDate.value = isoDay(today);
}

// A typed From / To date is a period of one's own
function typeDate(end: "start" | "end", event: Event) {
  const value = (event.target as HTMLInputElement).value || null;
  if (end === "start") startDate.value = value;
  else endDate.value = value;
  period.value = startDate.value || endDate.value ? "custom" : "all";
}

function toggleTag(name: string) {
  chosenTags.value = chosenTags.value.includes(name)
    ? chosenTags.value.filter((tag) => tag !== name)
    : [...chosenTags.value, name];
}

function clearFilters() {
  period.value = "all";
  startDate.value = null;
  endDate.value = null;
  chosenTags.value = [];
}

const close = () => emit("update:visible", false);

function onKey(event: KeyboardEvent) {
  if (event.key === "Escape") close();
}

function usePhoto(photo: FileTag) {
  const source = toFileRefParam(photo.fileRef);
  if (!source) {
    notification.error(t("pictureChooser.cantUse"));
    return;
  }
  emit("choose", { source, name: photo.name });
  close();
}

// A picture from the computer: checked and uploaded, then used at once
async function useFile(file: File | undefined) {
  if (!file || uploading.value) return;
  uploading.value = true;
  try {
    const source = await resolveImageSource(file);
    emit("choose", { source, name: file.name || "" });
    close();
  } catch (error) {
    console.error("Image upload failed:", error);
    notification.error(error instanceof ImageUploadError ? t(error.messageKey, error.params) : t("imageUpload.uploadFailed"));
  } finally {
    uploading.value = false;
  }
}

function pickFile() {
  if (uploading.value) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".png,.jpg,.jpeg,image/png,image/jpeg";
  input.onchange = () => useFile(input.files?.[0]);
  input.click();
}

function onDrop(event: DragEvent) {
  dragOver.value = false;
  useFile(event.dataTransfer?.files?.[0]);
}
</script>

<style scoped>
.pc {
  display: flex;
  flex-direction: column;
  height: min(68vh, 640px);
}
.pc-tabs {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  max-width: 520px;
  padding: 4px;
  margin-bottom: 14px;
  border-radius: 10px;
  background: #f4f3f8;
}
.pc-tab {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: #6e6a80;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.pc-tab.active {
  background: #ffffff;
  color: #6440f4;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.1);
}
.pc-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.pc-filters {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid rgba(28, 27, 38, 0.09);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(23, 20, 44, 0.04);
}
.pc-filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
}
.pc-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pc-field > span:first-child {
  color: #8a84a3;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.pc-select-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  color: #8a84a3;
}
.pc-select-wrap svg {
  position: absolute;
  right: 10px;
  pointer-events: none;
}
.pc-select,
.pc-date {
  height: 34px;
  min-width: 150px;
  padding: 0 30px 0 11px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #ffffff;
  color: #1c1b26;
  font-size: 12.5px;
  font-weight: 600;
  appearance: none;
  cursor: pointer;
}
.pc-date {
  padding-right: 8px;
  font-weight: 500;
}
.pc-select:focus,
.pc-date:focus {
  border-color: #6440f4;
  outline: none;
  box-shadow: 0 0 0 3px rgba(100, 64, 244, 0.12);
}
.pc-clear {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  margin-left: auto;
  padding: 0 12px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #ffffff;
  color: #6e6a80;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.pc-clear:hover:not(:disabled) {
  border-color: #6440f4;
  color: #6440f4;
}
.pc-clear:disabled {
  opacity: 0.5;
  cursor: default;
}
.pc-tag-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.pc-tag-label {
  margin-right: 4px;
  color: #8a84a3;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.pc-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px;
  border: 1px solid #e6e5ee;
  border-radius: 999px;
  background: #ffffff;
  color: #4a4659;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}
.pc-tag:hover {
  border-color: #6440f4;
}
.pc-tag.on {
  border-color: #6440f4;
  background: #6440f4;
  color: #ffffff;
}
.pc-tag-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #6440f4;
}
.pc-tag.on .pc-tag-dot {
  background: #ffffff;
}
.pc-count {
  flex-shrink: 0;
  margin: 12px 0 8px;
  color: #1c1b26;
  font-size: 13px;
  font-weight: 700;
}
.pc-grid-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 3px;
  transition: opacity 0.15s ease;
}
.pc-grid-wrap.fetching {
  opacity: 0.6;
}
.pc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px;
}
.pc-skeleton {
  aspect-ratio: 4 / 3;
}
.pc-pages {
  flex-shrink: 0;
  margin-top: 12px;
}
.pc-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 240px;
  padding: 24px;
  color: #b3aec6;
  text-align: center;
}
.pc-empty strong {
  color: #1c1b26;
  font-size: 13.5px;
}
.pc-empty span {
  max-width: 420px;
  color: #8a84a3;
  font-size: 12px;
}
.pc-retry {
  padding: 6px 14px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #ffffff;
  color: #6440f4;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.pc-drop {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  border: 1.5px dashed #cfc8f5;
  border-radius: 10px;
  background: rgba(124, 92, 247, 0.04);
  color: #6440f4;
  text-align: center;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.pc-drop:hover,
.pc-drop.over,
.pc-drop:focus-visible {
  border-color: #6440f4;
  background: rgba(124, 92, 247, 0.09);
  outline: none;
}
.pc-drop.busy {
  cursor: progress;
}
.pc-drop strong {
  color: #1c1b26;
  font-size: 14px;
}
.pc-drop span {
  color: #8a84a3;
  font-size: 12px;
}
.pc-spin {
  animation: pc-spin 1s linear infinite;
}
@keyframes pc-spin {
  to {
    transform: rotate(360deg);
  }
}
.pc-footer-hint {
  flex: 1;
  min-width: 0;
  align-self: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #8a84a3;
  font-size: 12px;
}
@media (prefers-reduced-motion: reduce) {
  .pc-spin {
    animation: none;
  }
}
</style>
