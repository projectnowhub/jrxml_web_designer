// Which environment this build is for, as the CDP app names it (its env.ts
// `appEnvironment`): the deploy workflow passes VITE_APP_ENV = dev / staging /
// production; a build on a developer's computer has none and is "local".

export const APP_ENVIRONMENT: string = import.meta.env.VITE_APP_ENV ?? "local";

// Developer tools (the bottom panel's JRXML Content and Report Bands tabs):
// on a developer's computer (npm run dev or a local build) and on the dev
// server, never on staging or production
export const SHOW_DEVELOPER_TOOLS: boolean =
  import.meta.env.DEV || APP_ENVIRONMENT === "local" || APP_ENVIRONMENT === "dev";

// The AI Assistant (the right panel's tab, a guide's "Or let the AI assistant
// do it", its shortcuts): hidden on staging and production for now, like the
// developer tools (the user's rule, 2026-11-27)
export const SHOW_AI_ASSISTANT: boolean = SHOW_DEVELOPER_TOOLS;
