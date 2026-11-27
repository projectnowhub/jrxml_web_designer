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
// badge or Ctrl+S. The changes stay kept in this browser meanwhile
// (utils/activeTemplate.ts), and are forgotten once the server has them.
import { useI18n } from "vue-i18n";
import { useFilesStore } from "@/stores/files";
import { saveServerTemplate } from "@/queries/reportCatalogQueries";
import { reportServerErrorText } from "@/services/helpers/reportCatalogMappers";
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

  function send(snapshot: TemplateSaveSnapshot): Promise<boolean> {
    filesStore.saveStatus = "saving";
    const key = keyOf(snapshot);
    inFlight = (async () => {
      try {
        await saveServerTemplate(snapshot.id, {
          name: snapshot.name,
          code: snapshot.name,
          regions: EDIT_TEMPLATE_REGIONS,
          templateContent: snapshot.jrxml,
        });
        lastSaved = key;
        failureShown = false;
        options.onSaved?.(snapshot);
        return true;
      } catch (error) {
        filesStore.saveStatus = "error";
        if (!failureShown) {
          failureShown = true;
          const reason = await reportServerErrorText(error, t("reportCatalog.errors.server"));
          notification.error(t("reportCatalog.save.failed", { reason }));
        }
        return false;
      }
    })();
    const done = inFlight;
    void done.then((ok) => {
      inFlight = null;
      const next = queued;
      queued = null;
      if (next && keyOf(next) !== lastSaved) {
        void send(next);
        return;
      }
      if (ok) settleStatus();
    });
    return done;
  }

  // Saves now (when there is something new); true when the server has it.
  // `tellFailure`: asked for by the user (Ctrl+S, the badge), so a failure is
  // told even when it was told before
  function flush(tellFailure = false): Promise<boolean> {
    clearTimer();
    if (tellFailure) failureShown = false;
    const snapshot = options.snapshot();
    if (!snapshot || keyOf(snapshot) === lastSaved) {
      // A newer change waiting behind one on its way isn't dropped
      if (inFlight) return inFlight;
      if (filesStore.saveStatus !== "error" || !snapshot) settleStatus();
      return Promise.resolve(filesStore.saveStatus !== "error");
    }
    if (inFlight) {
      queued = snapshot;
      return inFlight.then(() => flush());
    }
    return send(snapshot);
  }

  // Saves once the changes pause
  function schedule(): void {
    if (!options.snapshot()) {
      settleStatus();
      return;
    }
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
    failureShown = false;
    if (!inFlight) filesStore.saveStatus = "saved";
  }

  return { schedule, flush, hasUnsaved, startTemplate };
}
