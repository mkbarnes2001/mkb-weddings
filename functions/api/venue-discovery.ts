import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../serverless/venue-d1";

type Env = {
  ADMIN_API_ENABLED?: string;
  ADMIN_HOSTNAME?: string;
  GOOGLE_PLACES_API_KEY?: string;
};

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
  googleMapsUri?: string;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function component(place: GooglePlace, type: string) {
  return place.addressComponents?.find((item) => item.types?.includes(type));
}

function mapPlace(place: GooglePlace) {
  const town =
    component(place, "postal_town")?.longText ||
    component(place, "locality")?.longText ||
    component(place, "administrative_area_level_3")?.longText ||
    "";
  const county =
    component(place, "administrative_area_level_2")?.longText ||
    component(place, "administrative_area_level_1")?.longText ||
    "";
  const country = component(place, "country");
  return {
    provider: "google" as const,
    configured: true,
    id: text(place.id),
    name: text(place.displayName?.text),
    formattedAddress: text(place.formattedAddress),
    town: text(town),
    county: text(county),
    country: text(country?.longText),
    countryCode: text(country?.shortText).toUpperCase(),
    googleMapsUrl: text(place.googleMapsUri),
  };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();

  try {
    const url = new URL(context.request.url);
    const query = text(url.searchParams.get("q"));
    if (query.length < 3) {
      return Response.json({ ok: true, provider: "none", configured: false, results: [] });
    }

    const apiKey = text(context.env.GOOGLE_PLACES_API_KEY);
    if (!apiKey) {
      return Response.json({ ok: true, provider: "none", configured: false, results: [] });
    }

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.addressComponents,places.googleMapsUri",
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 6,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Venue directory lookup failed (${response.status}). ${detail}`.trim());
    }

    const payload = await response.json<any>();
    const results = (Array.isArray(payload?.places) ? payload.places : [])
      .map(mapPlace)
      .filter((place: ReturnType<typeof mapPlace>) => place.id && place.name);

    return Response.json({ ok: true, provider: "google", configured: true, results });
  } catch (error) {
    return errorResponse(error);
  }
};
