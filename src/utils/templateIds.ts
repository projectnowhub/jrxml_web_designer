// Template ids. A template on the report server has the server row's id (a
// UUID): it is the only id the designer's address ever shows (/designer/<id>).
// A template not on the server yet (a fresh one before its create, a .jrxml
// opened from the computer, a default template's copy being made) gets a
// browser-only id, kept inside the app and never put in the address.
const LOCAL_TEMPLATE_ID_PREFIX = "file_";

export const newLocalTemplateId = () => `${LOCAL_TEMPLATE_ID_PREFIX}${Date.now()}`;

// The id is the report server's (shown in the address), not a browser-only one
export const isServerTemplateId = (id: string | null | undefined): id is string =>
  !!id && !id.startsWith(LOCAL_TEMPLATE_ID_PREFIX);
