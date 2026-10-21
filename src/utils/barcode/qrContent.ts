// What a QR code holds, as form fields: a web link, an email, a phone number,
// a text message, a Wi-Fi login or a contact card are written in the formats
// phone cameras recognise (https://, mailto:, tel:, SMSTO:, WIFI:, vCard).
// Nothing extra is stored: the kind is read back from the value.

export type QrKind = "text" | "link" | "email" | "phone" | "sms" | "wifi" | "contact";

export const QR_KINDS: readonly QrKind[] = ["link", "text", "email", "phone", "sms", "wifi", "contact"];

export type QrFieldInput = "text" | "textarea" | "url" | "email" | "tel" | "password" | "security";

// The form of each kind; keys are translation keys under barcode.qr.fields
export const QR_FIELDS: Record<QrKind, readonly { key: string; input: QrFieldInput }[]> = {
  text: [{ key: "text", input: "textarea" }],
  link: [{ key: "url", input: "url" }],
  email: [
    { key: "to", input: "email" },
    { key: "subject", input: "text" },
    { key: "body", input: "textarea" },
  ],
  phone: [{ key: "number", input: "tel" }],
  sms: [
    { key: "number", input: "tel" },
    { key: "message", input: "textarea" },
  ],
  wifi: [
    { key: "ssid", input: "text" },
    { key: "security", input: "security" },
    { key: "password", input: "password" },
  ],
  contact: [
    { key: "name", input: "text" },
    { key: "organization", input: "text" },
    { key: "phone", input: "tel" },
    { key: "email", input: "email" },
    { key: "website", input: "url" },
  ],
};

export const WIFI_SECURITY = ["WPA", "WEP", "nopass"] as const;

export interface QrContent {
  kind: QrKind;
  fields: Record<string, string>;
}

// Wi-Fi codes escape \ ; , : and "
const wifiEscape = (v: string) => v.replace(/([\\;,:"])/g, "\\$1");
const wifiUnescape = (v: string) => v.replace(/\\(.)/g, "$1");

// One "X:value;" part of a Wi-Fi code
function wifiPart(body: string, key: string): string {
  const m = new RegExp(`(?:^|;)${key}:((?:\\\\.|[^;\\\\])*)`).exec(body);
  return m ? wifiUnescape(m[1] ?? "") : "";
}

// vCard escapes \ , ; and line breaks
const vcardEscape = (v: string) => v.replace(/([\\,;])/g, "\\$1").replace(/\r?\n/g, "\\n");
const vcardUnescape = (v: string) => v.replace(/\\n/gi, "\n").replace(/\\(.)/g, "$1");

function vcardLine(text: string, name: string): string {
  const m = new RegExp(`^${name}(?:;[^:\\n]*)?:(.*)$`, "im").exec(text);
  return m ? vcardUnescape((m[1] ?? "").trim()) : "";
}

const decode = (v: string) => {
  try {
    return decodeURIComponent(v.replace(/\+/g, " "));
  } catch {
    return v;
  }
};

export function parseQr(text: string): QrContent {
  if (/^https?:\/\//i.test(text)) return { kind: "link", fields: { url: text } };
  if (/^mailto:/i.test(text)) {
    const [address = "", query = ""] = text.slice(7).split("?");
    const params = new URLSearchParams(query);
    return { kind: "email", fields: { to: decode(address), subject: params.get("subject") ?? "", body: params.get("body") ?? "" } };
  }
  if (/^tel:/i.test(text)) return { kind: "phone", fields: { number: text.slice(4) } };
  if (/^smsto:/i.test(text)) {
    const body = text.slice(6);
    const split = body.indexOf(":");
    return {
      kind: "sms",
      fields: split < 0 ? { number: body, message: "" } : { number: body.slice(0, split), message: body.slice(split + 1) },
    };
  }
  if (/^WIFI:/i.test(text)) {
    const body = text.slice(5);
    const security = wifiPart(body, "T") || "nopass";
    return {
      kind: "wifi",
      fields: { ssid: wifiPart(body, "S"), password: wifiPart(body, "P"), security: WIFI_SECURITY.includes(security as any) ? security : "WPA" },
    };
  }
  if (/^BEGIN:VCARD/i.test(text)) {
    return {
      kind: "contact",
      fields: {
        name: vcardLine(text, "FN"),
        organization: vcardLine(text, "ORG"),
        phone: vcardLine(text, "TEL"),
        email: vcardLine(text, "EMAIL"),
        website: vcardLine(text, "URL"),
      },
    };
  }
  return { kind: "text", fields: { text } };
}

export function composeQr(content: QrContent): string {
  const f = (key: string) => (content.fields[key] ?? "").trim();
  switch (content.kind) {
    case "link": {
      const url = f("url");
      return !url || /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
    }
    case "email": {
      const query = new URLSearchParams();
      if (f("subject")) query.set("subject", f("subject"));
      if (content.fields.body?.trim()) query.set("body", content.fields.body.trim());
      const q = query.toString().replace(/\+/g, "%20");
      return `mailto:${f("to")}${q ? `?${q}` : ""}`;
    }
    case "phone":
      return `tel:${f("number").replace(/[\s()-]/g, "")}`;
    case "sms":
      return `SMSTO:${f("number").replace(/[\s()-]/g, "")}:${content.fields.message?.trim() ?? ""}`;
    case "wifi": {
      const security = f("security") || "WPA";
      const password = security === "nopass" ? "" : `P:${wifiEscape(f("password"))};`;
      return `WIFI:T:${security};S:${wifiEscape(f("ssid"))};${password};`;
    }
    case "contact": {
      const lines = ["BEGIN:VCARD", "VERSION:3.0"];
      const name = f("name");
      if (name) lines.push(`N:${vcardEscape(name)}`, `FN:${vcardEscape(name)}`);
      if (f("organization")) lines.push(`ORG:${vcardEscape(f("organization"))}`);
      if (f("phone")) lines.push(`TEL:${vcardEscape(f("phone"))}`);
      if (f("email")) lines.push(`EMAIL:${vcardEscape(f("email"))}`);
      if (f("website")) lines.push(`URL:${vcardEscape(f("website"))}`);
      lines.push("END:VCARD");
      return lines.join("\n");
    }
    default:
      return content.fields.text ?? "";
  }
}
