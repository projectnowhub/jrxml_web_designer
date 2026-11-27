// The map picture of a Location element: OpenStreetMap tiles (the map the CDP
// app shows) around the point, a pin on it and the map's credit line, drawn in
// the browser and kept as a JPEG data URI. The report server prints it like
// any embedded picture, so it needs no map service of its own.
//
// Browser only (canvas, Image). Web Mercator maths as in every web map: 256px
// tiles, 2^zoom tiles across the world.

export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
// Required by the OpenStreetMap licence wherever the map is shown
export const MAP_CREDIT = "© OpenStreetMap contributors";

// Every level the tile server draws: 0 = the whole world on one tile (wider
// maps show it repeated, as any web map), 19 = single buildings
export const MIN_MAP_ZOOM = 0;
export const MAX_MAP_ZOOM = 19;
const TILE = 256;
// The picture has twice the pixels of its place on the page, so it prints
// sharp; the tiles come from the next zoom level, which covers the same area
const PRINT_SCALE = 2;
// Larger pictures only grow the template, not what can be seen in print
const MAX_PICTURE_SIDE = 1600;
const SEA = "#aad3df";
export const PIN_COLOR = "#e5383b";

export interface MapView {
  latitude: number;
  longitude: number;
  zoom: number;
}

const clampLatitude = (lat: number) => Math.max(-85.0511, Math.min(85.0511, lat));

// A point's place in the world, in pixels at this zoom (tiles of `tileSize`)
export function project(lat: number, lng: number, zoom: number, tileSize = TILE): { x: number; y: number } {
  const world = tileSize * 2 ** zoom;
  const rad = (clampLatitude(lat) * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * world,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * world,
  };
}

// The tiles that cover a box of width × height pixels centred on the point,
// with where each goes in the box (also the canvas's live map while the
// picture is drawn). Tiles are drawn `tileSize` wide (256: as they come)
export function tilesFor(view: MapView, width: number, height: number, tileSize = TILE) {
  const zoom = Math.round(view.zoom);
  const centre = project(view.latitude, view.longitude, zoom, tileSize);
  const left = centre.x - width / 2;
  const top = centre.y - height / 2;
  const count = 2 ** zoom;
  const tiles: { url: string | null; left: number; top: number }[] = [];
  for (let ty = Math.floor(top / tileSize); ty <= Math.floor((top + height) / tileSize); ty++) {
    for (let tx = Math.floor(left / tileSize); tx <= Math.floor((left + width) / tileSize); tx++) {
      const wrapped = ((tx % count) + count) % count;
      tiles.push({
        // Above the top or below the bottom of the world: sea
        url: ty < 0 || ty >= count ? null : TILE_URL.replace("{z}", String(zoom)).replace("{x}", String(wrapped)).replace("{y}", String(ty)),
        left: Math.round(tx * tileSize - left),
        top: Math.round(ty * tileSize - top),
      });
    }
  }
  return tiles;
}

const fetchTile = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    // The tile server allows it, so the picture can be read back from the canvas
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Map tile failed: ${url}`));
    image.src = url;
  });

// A tile that fails is asked for again twice (the tile server sometimes
// turns away a burst of requests)
const RETRY_DELAYS = [600, 1800];
async function fetchTileWithRetries(url: string): Promise<HTMLImageElement> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchTile(url);
    } catch (error) {
      const delay = RETRY_DELAYS[attempt];
      if (delay === undefined) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// One tile, kept for the session (the browser caches the file as well)
const tileCache = new Map<string, Promise<HTMLImageElement>>();
function loadTile(url: string): Promise<HTMLImageElement> {
  let pending = tileCache.get(url);
  if (!pending) {
    pending = fetchTileWithRetries(url);
    pending.catch(() => tileCache.delete(url));
    tileCache.set(url, pending);
  }
  return pending;
}

// The pin: a drop with a white dot, its tip on the point
export function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color = PIN_COLOR) {
  const r = size * 0.32;
  const cy = y - size + r;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.04;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x - r * 0.35, y - size * 0.3, x - r, cy + r * 0.7, x - r, cy);
  ctx.arc(x, cy, r, Math.PI, 0);
  ctx.bezierCurveTo(x + r, cy + r * 0.7, x + r * 0.35, y - size * 0.3, x, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, cy, r * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
}

// The map picture for a place on the page of width × height (report pixels)
export async function renderMapPicture(view: MapView, width: number, height: number): Promise<string> {
  const scale = Math.min(PRINT_SCALE, MAX_PICTURE_SIDE / Math.max(width, height, 1));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  // The same area as the map shows at its zoom, with tiles of the level that
  // matches the picture's pixels (twice the size: the next level, sharper).
  // Past the closest level the tile server has, its tiles are drawn larger
  const zoom = Math.round(view.zoom);
  const tileZoom = Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, Math.round(zoom + Math.log2(scale))));
  const tileSize = (TILE * scale * 2 ** zoom) / 2 ** tileZoom;
  const tiles = tilesFor({ ...view, zoom: tileZoom }, w, h, tileSize);
  const drawn = Math.ceil(tileSize);
  const images = await Promise.all(tiles.map((tile) => (tile.url ? loadTile(tile.url) : Promise.resolve(null))));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = SEA;
  ctx.fillRect(0, 0, w, h);
  tiles.forEach((tile, i) => {
    const image = images[i];
    if (image) ctx.drawImage(image, tile.left, tile.top, drawn, drawn);
  });

  drawPin(ctx, w / 2, h / 2, Math.min(30 * scale, h * 0.45));

  // The credit line, bottom right
  const fontSize = Math.max(7, Math.round(6.5 * scale));
  ctx.font = `${fontSize}px "Noto Sans SC", Arial, sans-serif`;
  const textWidth = ctx.measureText(MAP_CREDIT).width;
  const pad = Math.round(fontSize * 0.35);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillRect(w - textWidth - pad * 2, h - fontSize - pad * 2, textWidth + pad * 2, fontSize + pad * 2);
  ctx.fillStyle = "#333333";
  ctx.textBaseline = "bottom";
  ctx.fillText(MAP_CREDIT, w - textWidth - pad, h - pad);

  return canvas.toDataURL("image/jpeg", 0.82);
}
