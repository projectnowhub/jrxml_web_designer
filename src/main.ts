import { createApp } from "vue";
import { createPinia } from "pinia";
import "./style.css";
import "./styles/fonts.css";
import "./styles/properties-panel.css";
import App from "./App.vue";
import i18n, { LOCALE_TAGS, type AppLocale } from "./i18n";
import { setChartTextSource } from "./utils/chart/chartText";
import router from "./router";
import { initializeAllPlugins } from "./plugins/PluginRegistry";

// Initialize the plugin system
initializeAllPlugins();

// Charts print their texts in the app's language
setChartTextSource({
  t: (key, params) => i18n.global.t(key, params ?? {}) as string,
  localeTag: () => LOCALE_TAGS[i18n.global.locale.value as AppLocale] ?? LOCALE_TAGS.en,
});

const app = createApp(App);
app.use(createPinia());
app.use(i18n);
app.use(router);
app.mount("#app");
