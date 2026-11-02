// Which environment this build is for, as the CDP app names it (its env.ts
// `appEnvironment`): the deploy workflow passes VITE_APP_ENV = dev / staging /
// production; a build on a developer's computer has none and is "local".

export const APP_ENVIRONMENT: string = import.meta.env.VITE_APP_ENV ?? "local";

// Developer tools (the bottom panel's JRXML Content and Details JSON tabs):
// on a developer's computer (npm run dev or a local build) and on the dev
// server, never on staging or production
export const SHOW_DEVELOPER_TOOLS: boolean =
  import.meta.env.DEV || APP_ENVIRONMENT === "local" || APP_ENVIRONMENT === "dev";
