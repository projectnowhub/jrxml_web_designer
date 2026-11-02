// The address of a point on the map, from the reverse geocoder the CDP app's
// location picker uses (Nominatim; VITE_LAT_AND_LANG_API to use another).
// Asked only when the user clicks "Fill the address from the pin", once per
// click (Nominatim allows about one request a second).
//
//   GET {REVERSE_GEOCODE_API}?format=json&lat=…&lon=…&addressdetails=1
//   -> { display_name, name?, address: { country, state, city | town | village…, postcode, road… } }

import { REVERSE_GEOCODE_API } from "@/config/apiConfig";
import type { Place } from "@/utils/location/locationElement";

type Address = Record<string, string | undefined>;

// The street part of the address (the rest has its own fields): the place's
// name, house number and road, and the neighbourhood
function streetLine(name: string | undefined, a: Address, displayName: string): string {
  const road = [a.house_number, a.road].filter(Boolean).join(" ");
  const parts = [name && name !== a.road ? name : "", road, a.neighbourhood ?? a.suburb ?? a.quarter ?? ""];
  const line = parts.filter(Boolean).join(", ");
  return line || displayName.split(",")[0]?.trim() || "";
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<Omit<Place, "latitude" | "longitude">> {
  const url = `${REVERSE_GEOCODE_API}?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
  const response = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!response.ok) throw new Error(`Reverse geocoding failed: ${response.status}`);
  const data = (await response.json()) as { display_name?: string; name?: string; address?: Address };
  const a = data.address ?? {};
  return {
    country: a.country ?? "",
    state: a.state ?? a.region ?? "",
    city: a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? "",
    postcode: a.postcode ?? "",
    address: streetLine(data.name, a, data.display_name ?? ""),
  };
}
