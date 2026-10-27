// The user's default settings, saved with their account through the
// properties config API (stores/userSettings.ts): one setting of this app.

// This app's name and the key its default settings are saved under
export const USER_SETTINGS_APP_NAME = "CDP_REPORT_STUDIO";
export const USER_SETTINGS_KEY = "user default settings";
export const USER_SETTINGS_VERSION = 1;

// Settings read in one request (the CDP app's limit)
export const PROPERTIES_CONFIG_LIMIT = 500;

// A change is sent this long after the last one (several quick changes: one
// request), as the CDP app's table settings
export const USER_SETTINGS_SAVE_DELAY_MS = 300;

// Set while a change made here hasn't reached the server (sent again at the next start)
export const USER_SETTINGS_UNSENT_KEY = "designer.userSettingsUnsent";
