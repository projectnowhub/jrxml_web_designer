<template>
  <!-- A template's ⋯ menu (cards and list rows): Open, Rename, Duplicate,
       Delete (red, like Sign out), with its rename / delete questions.
       Opened with toggle(event, template); `openId` lights up its button;
       run(action, template) does an action without the menu (list view).
       On the body so a card's rounded edge doesn't cut it off. -->
    <Teleport to="body">
      <Transition name="menu-pop">
        <div
          v-if="menu"
          ref="menuRef"
          class="card-menu"
          role="menu"
          :style="{ top: menu.top + 'px', left: menu.left + 'px' }"
        >
          <button type="button" role="menuitem" class="card-menu-item is-open" @click="onMenu('open')">
            <ExternalLink :size="16" :stroke-width="2.25" aria-hidden="true" />
            <span>{{ t("home.menu.open") }}</span>
          </button>
          <button type="button" role="menuitem" class="card-menu-item is-rename" @click="onMenu('rename')">
            <Pencil :size="16" :stroke-width="2.25" aria-hidden="true" />
            <span>{{ t("home.menu.rename") }}</span>
          </button>
          <button type="button" role="menuitem" class="card-menu-item is-duplicate" @click="onMenu('duplicate')">
            <Copy :size="16" :stroke-width="2.25" aria-hidden="true" />
            <span>{{ t("home.menu.duplicate") }}</span>
          </button>
          <div class="card-menu-divider" />
          <button type="button" role="menuitem" class="card-menu-item is-delete" @click="onMenu('delete')">
            <Trash2 :size="16" :stroke-width="2.25" aria-hidden="true" />
            <span>{{ t("home.menu.delete") }}</span>
          </button>
        </div>
      </Transition>
    </Teleport>

    <InputModal
      v-model:visible="showRename"
      :title="t('home.renameTitle')"
      :message="t('home.renameMessage')"
      :default-value="pending?.name || ''"
      @confirm="(name: string) => pending && rename(pending, name)"
    />
    <ConfirmModal
      v-model:visible="showOpen"
      :title="t('home.openTitle')"
      :message="t('home.openMessage', { name: pending?.name })"
      :confirm-text="t('home.menu.open')"
      @confirm="pending && openTemplate(pending)"
    />
    <ConfirmModal
      v-model:visible="showDuplicate"
      :title="t('home.duplicateTitle')"
      :message="t('home.duplicateMessage', { name: pending?.name })"
      :confirm-text="t('home.menu.duplicate')"
      @confirm="pending && duplicate(pending)"
    />
    <ConfirmModal
      v-model:visible="showDelete"
      :title="t('home.deleteTitle')"
      :message="t('home.deleteMessage', { name: pending?.name })"
      :confirm-text="t('home.menu.delete')"
      danger
      @confirm="pending && remove(pending)"
    />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Copy, ExternalLink, Pencil, Trash2 } from "@lucide/vue";
import { useTemplates } from "@/composables/useTemplates";
import InputModal from "@/components/modals/InputModal.vue";
import ConfirmModal from "@/components/modals/ConfirmModal.vue";

type Named = { id: string; name: string };

const { t } = useI18n();
const { openTemplate, rename, duplicate, remove } = useTemplates();

const MENU_WIDTH = 200;

// The open card menu: its template and where it sits (under the ⋯ button,
// right edges lined up, kept inside the window)
const menu = ref<{ file: Named; top: number; left: number } | null>(null);
const menuRef = ref<HTMLElement | null>(null);

function toggle(event: MouseEvent, file: Named) {
  if (menu.value?.file.id === file.id) {
    menu.value = null;
    return;
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
  const below = rect.bottom + 6;
  const top = below + 190 > window.innerHeight ? Math.max(8, rect.top - 196) : below;
  menu.value = { file, top, left };
}

const closeMenu = () => (menu.value = null);
function onPressOutside(event: PointerEvent) {
  if (!menu.value) return;
  const target = event.target as Element | null;
  if (menuRef.value?.contains(target) || target?.closest("[data-template-menu]")) return;
  closeMenu();
}
const onKey = (event: KeyboardEvent) => event.key === "Escape" && closeMenu();
onMounted(() => {
  document.addEventListener("pointerdown", onPressOutside, true);
  document.addEventListener("keydown", onKey);
  window.addEventListener("scroll", closeMenu, true);
  window.addEventListener("resize", closeMenu);
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onPressOutside, true);
  document.removeEventListener("keydown", onKey);
  window.removeEventListener("scroll", closeMenu, true);
  window.removeEventListener("resize", closeMenu);
});

const pending = ref<Named | null>(null);
const showRename = ref(false);
const showDelete = ref(false);
const showOpen = ref(false);
const showDuplicate = ref(false);

export type TemplateAction = "open" | "rename" | "duplicate" | "delete";

function onMenu(key: TemplateAction) {
  const template = menu.value?.file;
  closeMenu();
  if (template) run(key, template);
}

// An action for a template; the list view's icon buttons call it straight
function run(key: TemplateAction, template: Named) {
  pending.value = template;
  // Each asks first (rename asks for the name)
  if (key === "open") showOpen.value = true;
  else if (key === "rename") showRename.value = true;
  else if (key === "duplicate") showDuplicate.value = true;
  else showDelete.value = true;
}

const openId = computed(() => menu.value?.file.id ?? null);
defineExpose({ toggle, openId, run });
</script>

<style>
/* On the body (not scoped); same look as the account menu */
.card-menu {
  position: fixed;
  z-index: 2000;
  width: 200px;
  padding: 8px;
  border: 1px solid rgba(28, 27, 38, 0.1);
  border-radius: 12px;
  background: #ffffff;
  box-shadow:
    0 18px 38px rgba(23, 20, 44, 0.16),
    0 2px 6px rgba(23, 20, 44, 0.08);
  box-sizing: border-box;
}
.card-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #45425a;
  font-size: 12.5px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background 0.14s ease;
}
.card-menu-item:hover,
.card-menu-item:focus-visible {
  background: rgba(124, 92, 247, 0.08);
  outline: none;
}
/* Each action's icon in its colour (as in the list view); Delete all red */
.card-menu-item.is-open svg {
  color: #6440f4;
}
.card-menu-item.is-rename svg {
  color: #2f6fdf;
}
.card-menu-item.is-duplicate svg {
  color: #16936a;
}
.card-menu-item.is-delete {
  color: #e5484d;
}
.card-menu-item.is-delete:hover,
.card-menu-item.is-delete:focus-visible {
  background: rgba(229, 72, 77, 0.09);
  color: #d0342e;
}
.card-menu-divider {
  height: 1px;
  margin: 6px 0;
  background: rgba(28, 27, 38, 0.08);
}
</style>
