// Location element: a box (frame) holding a map of the place and its address.
// The place (country, state, city, postcode, full address, latitude,
// longitude: the fields of a CDP project's location) is typed in its panel or
// copied from a project in Report Data, and kept as JSON in the box's
// `com.cdp.location` property with the layout and which address lines show.
//
// Its two parts are ordinary box parts, so they are styled like any picture
// and text: the map (an image, `com.cdp.location.map` = the place and size its
// picture was drawn for) and the address (a text field, `com.cdp.location.address`).
// syncLocations() (run with every JRXML write) lays them out and writes the
// address from the setup. The map picture is drawn in the browser
// (locationMap.ts) and put in by locationMaps.ts when the place or size changes.
//
// No browser code here: the report store and the AI tools use it too.

import type { Band, DesignElement, FrameElement, ImageElement, TextFieldElement } from "@/types";
import { createElement } from "@/components/elements/ElementRegistry";
import { DEFAULT_REPORT_FONT } from "@/config/fonts.config";
import { BOX_PART_PROPERTY, frame } from "../framePresets";
import { MAX_MAP_ZOOM, MIN_MAP_ZOOM } from "./locationMap";

export const LOCATION_PROPERTY = "com.cdp.location";
export const LOCATION_MAP_PROPERTY = "com.cdp.location.map";
export const LOCATION_ADDRESS_PROPERTY = "com.cdp.location.address";
export const LOCATION_ELEMENT_TYPE = "location";

// The fields of a place, in the order of the CDP project form
export const PLACE_FIELDS = ["country", "state", "city", "postcode", "address", "latitude", "longitude"] as const;
export type PlaceField = (typeof PLACE_FIELDS)[number];
export type Place = Record<PlaceField, string>;

export type LocationLayout = "mapAbove" | "mapBeside" | "mapOnly" | "addressOnly";
export const LOCATION_LAYOUTS: LocationLayout[] = ["mapAbove", "mapBeside", "mapOnly", "addressOnly"];

// The address lines that can be shown
export const ADDRESS_LINES = ["address", "postcode", "city", "state", "country", "coordinates"] as const;
export type AddressLine = (typeof ADDRESS_LINES)[number];

export interface LocationSetup extends Place {
  zoom: number;
  layout: LocationLayout;
  show: Record<AddressLine, boolean>;
  // A part's look while its layout leaves it out, so it comes back the same
  spare?: { map?: Partial<ImageElement>; address?: Partial<TextFieldElement> };
}

export const DEFAULT_MAP_ZOOM = 15;
const DEFAULT_SHOW: Record<AddressLine, boolean> = {
  address: true,
  postcode: true,
  city: true,
  state: true,
  country: true,
  coordinates: false,
};

// Room between the map and the address
const GAP = 8;
const MIN_MAP = 40;
// Text needs at least 1.45 × its size per line (JasperReports drops a line that doesn't fit)
const LINE = 1.45;

type WithProperties = { type?: string; properties?: { name?: string; value?: string }[] };

const propertyOf = (el: WithProperties | undefined, name: string) =>
  el?.properties?.find((p) => p?.name === name);

export const isLocationElement = (el: unknown): boolean =>
  (el as WithProperties | undefined)?.type === "frame" && !!propertyOf(el as WithProperties, LOCATION_PROPERTY);
export const isLocationMap = (el: unknown) =>
  (el as WithProperties | undefined)?.type === "image" && !!propertyOf(el as WithProperties, LOCATION_MAP_PROPERTY);
export const isLocationAddress = (el: unknown) =>
  (el as WithProperties | undefined)?.type === "textField" &&
  !!propertyOf(el as WithProperties, LOCATION_ADDRESS_PROPERTY);
export const isLocationPart = (el: unknown) => isLocationMap(el) || isLocationAddress(el);

const text = (value: unknown) => (value == null ? "" : String(value).trim());

export function normalizeLocationSetup(value: Partial<LocationSetup> | null | undefined): LocationSetup {
  const v = value ?? {};
  const zoom = Number(v.zoom);
  const setup = {
    ...Object.fromEntries(PLACE_FIELDS.map((f) => [f, text(v[f])])),
    zoom: Number.isFinite(zoom) ? Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, Math.round(zoom))) : DEFAULT_MAP_ZOOM,
    layout: LOCATION_LAYOUTS.includes(v.layout as LocationLayout) ? (v.layout as LocationLayout) : "mapAbove",
    show: Object.fromEntries(
      ADDRESS_LINES.map((line) => [line, typeof v.show?.[line] === "boolean" ? v.show[line] : DEFAULT_SHOW[line]]),
    ),
  } as LocationSetup;
  if (v.spare && typeof v.spare === "object") setup.spare = v.spare;
  return setup;
}

export function getLocationSetup(box: WithProperties): LocationSetup {
  const raw = propertyOf(box, LOCATION_PROPERTY)?.value;
  try {
    return normalizeLocationSetup(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeLocationSetup(null);
  }
}

export function setLocationSetup(box: FrameElement, setup: LocationSetup): void {
  const value = JSON.stringify(normalizeLocationSetup(setup));
  const properties = (box.properties ?? []).filter((p) => p?.name !== LOCATION_PROPERTY);
  box.properties = [...properties, { name: LOCATION_PROPERTY, value }];
}

// A place from a project (Report Data) or the AI: any missing field is empty;
// numbers may come as numbers
export function toPlace(value: Partial<Record<PlaceField, unknown>> | null | undefined): Place {
  return Object.fromEntries(PLACE_FIELDS.map((f) => [f, text(value?.[f])])) as Place;
}

// ── Coordinates ──

// "3.1390", "3,1390" or "3.1390°"; null when it isn't a number
export function parseCoordinate(value: string): number | null {
  const cleaned = value.trim().replace(/°/g, "").replace(/^(-?\d+),(\d+)$/, "$1.$2");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

// Why a latitude / longitude can't be used (a translation key under location.problems), or null
export function coordinateProblem(field: "latitude" | "longitude", value: string): string | null {
  if (!value.trim()) return null;
  const n = parseCoordinate(value);
  if (n === null) return "notNumber";
  const limit = field === "latitude" ? 90 : 180;
  return Math.abs(n) > limit ? (field === "latitude" ? "latitudeRange" : "longitudeRange") : null;
}

// The point, when both are valid numbers
export function placePoint(place: Place): { latitude: number; longitude: number } | null {
  if (coordinateProblem("latitude", place.latitude) || coordinateProblem("longitude", place.longitude)) return null;
  const latitude = parseCoordinate(place.latitude);
  const longitude = parseCoordinate(place.longitude);
  return latitude === null || longitude === null ? null : { latitude, longitude };
}

// "3.1390, 101.6869" typed or pasted into one field: both numbers
export function splitPastedPoint(value: string): { latitude: string; longitude: string } | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*°?\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*°?$/);
  return match ? { latitude: match[1]!, longitude: match[2]! } : null;
}

// Coordinates written by the map (about 10 cm)
export const formatCoordinate = (n: number) => String(Math.round(n * 1e6) / 1e6);

// ── The address ──

export function addressLines(setup: LocationSetup): string[] {
  const { show } = setup;
  const lines: string[] = [];
  if (show.address && setup.address) lines.push(...setup.address.split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean));
  const townLine = [show.postcode ? setup.postcode : "", show.city ? setup.city : ""].filter(Boolean).join(" ");
  if (townLine) lines.push(townLine);
  const regionLine = [show.state ? setup.state : "", show.country ? setup.country : ""].filter(Boolean).join(", ");
  if (regionLine) lines.push(regionLine);
  const point = placePoint(setup);
  if (show.coordinates && point) lines.push(`${formatCoordinate(point.latitude)}, ${formatCoordinate(point.longitude)}`);
  return lines;
}

// A Java string, plain text: "<" and "&" print as typed. Backslashes and
// quotes escaped as in framePresets' literal (a lone "\" stops the report)
const literal = (value: string) =>
  `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r\n|\r|\n/g, "\\n")}"`;

// Height the address needs at this width: lines wrap at about 0.58 em per letter
function addressHeight(lines: string[], width: number, fontSize: number): number {
  const perLine = Math.max(1, Math.floor((width - 4) / (fontSize * 0.58)));
  const count = Math.max(1, lines.reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / perLine)), 0));
  return Math.ceil(count * fontSize * LINE) + 4;
}

// ── The map picture's key: what it was drawn for ──

export function mapKey(setup: LocationSetup, width: number, height: number): string {
  const point = placePoint(setup);
  if (!point) return "none";
  return [formatCoordinate(point.latitude), formatCoordinate(point.longitude), setup.zoom, Math.round(width), Math.round(height)].join(",");
}

export const pictureKeyOf = (map: DesignElement) => propertyOf(map as WithProperties, LOCATION_MAP_PROPERTY)?.value ?? "";

export function setPictureKey(map: DesignElement, key: string): void {
  map.properties = [...(map.properties ?? []).filter((p) => p?.name !== LOCATION_MAP_PROPERTY), { name: LOCATION_MAP_PROPERTY, value: key }];
}

// ── Building ──

const partProperties = (marker: string, value = "true") => [
  { name: BOX_PART_PROPERTY, value: "true" },
  { name: marker, value },
];

function buildMapPart(): ImageElement {
  return createElement("image", {
    uuid: crypto.randomUUID(),
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    // Empty until the picture is drawn; "Blank" so an empty spot never stops the PDF
    imageExpression: "",
    onErrorType: "Blank",
    scaleType: "FillFrame",
    properties: partProperties(LOCATION_MAP_PROPERTY, "none"),
  } as Partial<DesignElement>) as ImageElement;
}

function buildAddressPart(font: LocationFont): TextFieldElement {
  return createElement("textField", {
    uuid: crypto.randomUUID(),
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    expression: '""',
    fontFamily: font.fontFamily || DEFAULT_REPORT_FONT,
    fontSize: Math.min(font.fontSize || 9, 10),
    isBold: false,
    isItalic: false,
    isUnderline: false,
    forecolor: "#333333",
    textAlignment: "Left",
    verticalAlignment: "Top",
    markup: "none",
    // A longer address grows downwards in the PDF instead of being cut off
    textAdjust: "StretchHeight",
    properties: partProperties(LOCATION_ADDRESS_PROPERTY),
  } as Partial<DesignElement>) as TextFieldElement;
}

export interface LocationFont {
  fontFamily?: string;
  fontSize?: number;
}

export const LOCATION_SIZE = { width: 300, height: 240 };

// A new Location: map above the address. Width: at most the printable width
export function buildLocationElement(
  place: Partial<Place> = {},
  options: { font?: LocationFont; maxWidth?: number; layout?: LocationLayout } = {},
): FrameElement {
  const width = Math.min(LOCATION_SIZE.width, Math.round(options.maxWidth ?? LOCATION_SIZE.width));
  const box = {
    ...frame(width, LOCATION_SIZE.height, {}, [buildMapPart(), buildAddressPart(options.font ?? {})]),
    uuid: crypto.randomUUID(),
  } as FrameElement;
  setLocationSetup(box, normalizeLocationSetup({ ...toPlace(place), layout: options.layout }));
  layoutLocation(box, options.font);
  return box;
}

// Change the setup (place fields, zoom, layout, lines) and lay the box out again
export function updateLocation(box: FrameElement, patch: Partial<LocationSetup>, font?: LocationFont): void {
  setLocationSetup(box, { ...getLocationSetup(box), ...patch });
  layoutLocation(box, font);
}

// ── Keeping it in step ──

// The parts the layout needs exist (a part left out is kept in the setup's
// `spare`, and comes back with its look), sit in their places, and the address
// shows the setup. The box keeps its width; its height follows the address.
// Whether anything changed.
export function layoutLocation(box: FrameElement, font: LocationFont = {}): boolean {
  const before = JSON.stringify(box);
  const setup = getLocationSetup(box);
  const items = box.elements ?? (box.elements = []);
  const wantMap = setup.layout !== "addressOnly";
  const wantAddress = setup.layout !== "mapOnly";

  const spare = { ...(setup.spare ?? {}) };
  let map = items.find(isLocationMap) as ImageElement | undefined;
  let address = items.find(isLocationAddress) as TextFieldElement | undefined;
  // A part the layout leaves out: its look is kept for later
  if (!wantMap && map) {
    const { imageExpression: _picture, ...look } = map;
    spare.map = look;
    items.splice(items.indexOf(map), 1);
    map = undefined;
  }
  if (!wantAddress && address) {
    const { expression: _text, ...look } = address;
    spare.address = look;
    items.splice(items.indexOf(address), 1);
    address = undefined;
  }
  // A part that comes back keeps its size (a new map: three fifths as tall as wide)
  let mapBack = false;
  if (wantMap && !map) {
    mapBack = true;
    map = { ...buildMapPart(), height: Math.round(box.width * 0.6), ...(spare.map ?? {}), imageExpression: "" } as ImageElement;
    setPictureKey(map, "none");
    delete spare.map;
    items.unshift(map);
  }
  if (wantAddress && !address) {
    address = { ...buildAddressPart(font), ...(spare.address ?? {}), expression: '""' } as TextFieldElement;
    delete spare.address;
    items.push(address);
  }
  if (JSON.stringify(spare) !== JSON.stringify(setup.spare ?? {})) {
    setLocationSetup(box, { ...setup, spare: Object.keys(spare).length ? spare : undefined });
  }

  const W = Math.max(40, Math.round(box.width));
  const lines = addressLines(setup);
  if (address) address.expression = literal(lines.join("\n"));
  const fontSize = address?.fontSize || font.fontSize || 9;

  if (map && address && setup.layout === "mapAbove") {
    const addrH = addressHeight(lines, W, fontSize);
    const mapH = Math.max(MIN_MAP, mapBack ? Math.round(map.height) : Math.round(box.height) - GAP - addrH);
    Object.assign(map, { x: 0, y: 0, width: W, height: mapH });
    Object.assign(address, { x: 0, y: mapH + GAP, width: W, height: addrH });
    box.height = mapH + GAP + addrH;
  } else if (map && address) {
    const mapW = Math.round(W * 0.55);
    const addrW = Math.max(20, W - mapW - GAP);
    const addrH = addressHeight(lines, addrW, fontSize);
    box.height = Math.max(Math.round(box.height), addrH, MIN_MAP, mapBack ? Math.round(map.height) : 0);
    Object.assign(map, { x: 0, y: 0, width: mapW, height: box.height });
    Object.assign(address, { x: mapW + GAP, y: 0, width: addrW, height: addrH });
  } else if (map) {
    box.height = Math.max(MIN_MAP, mapBack ? Math.round(map.height) : Math.round(box.height));
    Object.assign(map, { x: 0, y: 0, width: W, height: box.height });
  } else if (address) {
    const addrH = addressHeight(lines, W, fontSize);
    Object.assign(address, { x: 0, y: 0, width: W, height: addrH });
    box.height = addrH;
  }
  box.width = W;

  if (map) {
    const point = placePoint(setup);
    const view = point ? { ...point, zoom: setup.zoom } : null;
    // Only when it changed: a new object every time would be a change to Vue,
    // and the designer writes the JRXML again on every change
    if (JSON.stringify(view) !== JSON.stringify(map.locationView ?? null)) map.locationView = view;
    // No place yet (or it was cleared): no picture
    if (!point && pictureKeyOf(map) !== "none") {
      map.imageExpression = "";
      setPictureKey(map, "none");
    }
  }
  return JSON.stringify(box) !== before;
}

// Every Location of the report, laid out and its address written (run with
// every JRXML write, in the same undo step as the change that caused it)
export function syncLocations(bands: Band[], font: LocationFont = {}): boolean {
  let changed = false;
  for (const band of bands) {
    for (const element of band.elements ?? []) {
      if (isLocationElement(element) && layoutLocation(element as FrameElement, font)) changed = true;
    }
  }
  return changed;
}

// Every Location's box (with where it is), for the map pictures
export function* locationBoxes(bands: Band[]): Generator<FrameElement> {
  for (const band of bands) {
    for (const element of band.elements ?? []) if (isLocationElement(element)) yield element as FrameElement;
  }
}
