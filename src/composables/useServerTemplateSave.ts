// Saves the open template to the report server (PUT /v2/reports/{id}/edit,
// saveServerTemplate) without sending it on every change:
// - schedule(): TEMPLATE_SAVE_DELAY_MS after the last change, so a burst of
//   changes is one request
// - flush(): at once (leaving the template, closing or hiding the tab, Ctrl+S)
// - never two at once: a change made while one is on its way is sent after
//   it (only the newest), and nothing is sent when it is what was sent last
// - never cancelled (no "(canceled)" request): a newer save simply follows
// The header's save badge follows it (files store saveStatus); a failure
// shows the server's reason once and is tried again with the next change, the
// badge or Ctrl+S, never by itself (a failing request used to be sent again
// and again until the tab crashed). Nothing is kept in this browser: until
// the server has them, the changes are only in the open designer (closing the
// page asks first).
import { useI18n } from "vue-i18n";
import { useFilesStore } from "@/stores/files";
import { saveServerTemplate } from "@/queries/reportCatalogQueries";
import { reportServerErrorText } from "@/services/helpers/reportCatalogMappers";
import { toTemplateContentBase64 } from "@/services/helpers/templateContentHelpers";
import { SHOW_DEVELOPER_TOOLS } from "@/config/appEnvironment";
import { EDIT_TEMPLATE_REGIONS, TEMPLATE_SAVE_DELAY_MS } from "@/constants/reportCatalogConstants";
import notification from "@/utils/notification";

// What is saved: the template's row id, its name and its JRXML
export interface TemplateSaveSnapshot {
  id: string;
  name: string;
  jrxml: string;
}

const keyOf = (snapshot: TemplateSaveSnapshot) => `${snapshot.id}\u0000${snapshot.name}\u0000${snapshot.jrxml}`;

export function useServerTemplateSave(options: {
  // The open template as it is now, or null when it isn't to be saved (not on
  // the server, a default template, unchanged since it opened, still opening)
  snapshot: () => TemplateSaveSnapshot | null;
  // The server has it (the browser's copy can go)
  onSaved?: (snapshot: TemplateSaveSnapshot) => void;
}) {
  const { t } = useI18n();
  const filesStore = useFilesStore();

  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<boolean> | null = null;
  // Asked for while one was on its way (only the newest is kept)
  let queued: TemplateSaveSnapshot | null = null;
  // What the server has: the last one sent successfully
  let lastSaved = "";
  // The last one the server refused: never sent again by itself (that looped
  // when the edit request kept failing); only a new change or the user asking
  // (Ctrl+S, the badge) sends it again
  let lastFailed = "";
  // A failure is told once, until a save works again
  let failureShown = false;

  function clearTimer(): void {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function settleStatus(): void {
    if (inFlight || timer || queued) filesStore.saveStatus = "saving";
    else if (filesStore.saveStatus === "saving") filesStore.saveStatus = "saved";
  }

  // Worth sending: not what the server has, not what it just refused
  const isNew = (key: string) => key !== lastSaved && key !== lastFailed;

  function send(snapshot: TemplateSaveSnapshot): Promise<boolean> {
    filesStore.saveStatus = "saving";
    const key = keyOf(snapshot);
    // Developers (localhost and the dev server): the JRXML being saved, as
    // text, before it is sent as base64 (the opening side logs what it read)
    if (SHOW_DEVELOPER_TOOLS) {
      console.groupCollapsed(`[Template save] ${snapshot.name} (${snapshot.jrxml.length} characters)`);
      console.log(snapshot.jrxml);
      console.groupEnd();
    }
    const done = (async () => {
      try {
        await saveServerTemplate(snapshot.id, {
          name: snapshot.name,
          code: snapshot.name,
          regions: EDIT_TEMPLATE_REGIONS,
          // The server takes the JRXML as base64 (its UTF-8 bytes)
          templateContent: toTemplateContentBase64(snapshot.jrxml),
        });
        lastSaved = key;
        lastFailed = "";
        failureShown = false;
        options.onSaved?.(snapshot);
        return true;
      } catch (error) {
        lastFailed = key;
        if (!failureShown) {
          failureShown = true;
          const reason = await reportServerErrorText(error, t("reportCatalog.errors.server"));
          notification.error(t("reportCatalog.save.failed", { reason }));
        }
        return false;
      } finally {
        // The next one waiting goes only when it is something new
        inFlight = null;
        const next = queued;
        queued = null;
        if (next && isNew(keyOf(next))) void send(next);
      }
    })();
    inFlight = done;
    void done.then((ok) => {
      if (inFlight) return;
      if (ok) settleStatus();
      else filesStore.saveStatus = "error";
    });
    return done;
  }

  // Waits until nothing is on its way (a queued save follows the current one);
  // true when the last one sent worked
  async function settled(): Promise<boolean> {
    let ok = true;
    while (inFlight) ok = await inFlight;
    return ok;
  }

  // Saves now (when there is something new); true when the server has it.
  // `userAsked` (Ctrl+S, the badge): sent even when the server refused this
  // very version before, and a failure is told again
  function flush(userAsked = false): Promise<boolean> {
    clearTimer();
    if (userAsked) {
      failureShown = false;
      lastFailed = "";
    }
    const snapshot = options.snapshot();
    const key = snapshot ? keyOf(snapshot) : "";
    if (!snapshot || !isNew(key)) {
      // Nothing new: wait for one on its way, else answer from what is known
      if (inFlight) return settled();
      if (snapshot && key === lastFailed) {
        filesStore.saveStatus = "error";
        return Promise.resolve(false);
      }
      if (filesStore.saveStatus !== "error" || !snapshot) settleStatus();
      return Promise.resolve(filesStore.saveStatus !== "error");
    }
    if (inFlight) {
      queued = snapshot;
      return settled();
    }
    return send(snapshot);
  }

  // Saves once the changes pause
  function schedule(): void {
    const snapshot = options.snapshot();
    if (!snapshot) {
      settleStatus();
      return;
    }
    // A write that changed nothing (or the version just refused): no wait, no "Saving…"
    if (!isNew(keyOf(snapshot)) && !timer) return;
    clearTimer();
    filesStore.saveStatus = "saving";
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, TEMPLATE_SAVE_DELAY_MS);
  }

  // Something not on the server yet (waiting, on its way or failed)
  function hasUnsaved(): boolean {
    if (timer || inFlight || queued) return true;
    const snapshot = options.snapshot();
    return !!snapshot && keyOf(snapshot) !== lastSaved;
  }

  // Another template opened: what it has on the server is what it opened with
  function startTemplate(): void {
    clearTimer();
    lastSaved = "";
    lastFailed = "";
    failureShown = false;
    if (!inFlight) filesStore.saveStatus = "saved";
  }

  return { schedule, flush, hasUnsaved, startTemplate };
}
