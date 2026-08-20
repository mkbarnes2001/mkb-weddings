import { getPublicLeadForm } from "../../../../serverless/crm-d1";
import { getAuthenticatedClientIdentity } from "../../../../serverless/client-auth-d1";
import { resolvePublicWorkspaceId } from "../../../../serverless/tenant-context";

type Env = {
  MKB_DB: D1Database;
  GOOGLE_PLACES_API_KEY?: string;
};

type LookupKind = "address" | "venue";

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type GooglePlace = {
  id?: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
  location?: {
    latitude?: number;
    longitude?: number;
  };
};

type GoogleAutocompleteSuggestion = {
  placePrediction?: {
    placeId?: string;
    text?: {
      text?: string;
    };
    structuredFormat?: {
      mainText?: {
        text?: string;
      };
      secondaryText?: {
        text?: string;
      };
    };
  };
};

type RateState = {
  startedAt: number;
  count: number;
};

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 40;
const RATE_BUCKETS = new Map<string, RateState>();

function text(value: unknown) {
  return String(value ?? "").trim();
}

function json(
  payload: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(
    payload,
    {
      status,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        ...headers,
      },
    },
  );
}

function component(
  place: GooglePlace,
  type: string,
) {
  return place.addressComponents?.find(
    (item) =>
      item.types?.includes(type),
  );
}

function sessionToken(value: unknown) {
  const token = text(value);

  if (
    token.length < 16
    || token.length > 128
    || !/^[A-Za-z0-9_-]+$/.test(token)
  ) {
    return "";
  }

  return token;
}

function placeId(value: unknown) {
  const id = text(value);

  if (
    id.length < 8
    || id.length > 300
    || !/^[A-Za-z0-9_-]+$/.test(id)
  ) {
    return "";
  }

  return id;
}

function lookupKind(
  value: unknown,
): LookupKind | "" {
  return value === "address"
    || value === "venue"
      ? value
      : "";
}

function activeFieldExists(
  form: any,
  kind: LookupKind,
) {
  return Array.isArray(
    form?.fields,
  ) && form.fields.some(
    (field: any) =>
      field?.enabled !== false
      && text(field?.type) === kind,
  );
}

function rateLimitKey(
  request: Request,
  workspaceId: string,
) {
  const ip = text(
    request.headers.get(
      "CF-Connecting-IP",
    ),
  );

  const agent = text(
    request.headers.get(
      "user-agent",
    ),
  ).slice(
    0,
    120,
  );

  return [
    workspaceId,
    ip || "unknown",
    ip
      ? ""
      : agent,
  ].join("|");
}

function allowBurst(
  request: Request,
  workspaceId: string,
) {
  const now = Date.now();
  const key = rateLimitKey(
    request,
    workspaceId,
  );

  const current =
    RATE_BUCKETS.get(key);

  if (
    !current
    || now - current.startedAt >= RATE_WINDOW_MS
  ) {
    RATE_BUCKETS.set(
      key,
      {
        startedAt: now,
        count: 1,
      },
    );

    return true;
  }

  if (
    current.count >= RATE_MAX_REQUESTS
  ) {
    return false;
  }

  current.count += 1;

  if (
    RATE_BUCKETS.size > 2000
  ) {
    for (
      const [
        candidateKey,
        candidate,
      ]
      of RATE_BUCKETS
    ) {
      if (
        now - candidate.startedAt
        >= RATE_WINDOW_MS
      ) {
        RATE_BUCKETS.delete(
          candidateKey,
        );
      }
    }
  }

  return true;
}

function mapAddress(
  place: GooglePlace,
) {
  const streetNumber = text(
    component(
      place,
      "street_number",
    )?.longText,
  );

  const route = text(
    component(
      place,
      "route",
    )?.longText,
  );

  const premise = text(
    component(
      place,
      "premise",
    )?.longText,
  );

  const subpremise = text(
    component(
      place,
      "subpremise",
    )?.longText,
  );

  const city =
    text(
      component(
        place,
        "postal_town",
      )?.longText,
    )
    || text(
      component(
        place,
        "locality",
      )?.longText,
    )
    || text(
      component(
        place,
        "administrative_area_level_3",
      )?.longText,
    );

  const county =
    text(
      component(
        place,
        "administrative_area_level_2",
      )?.longText,
    )
    || text(
      component(
        place,
        "administrative_area_level_1",
      )?.longText,
    );

  const postcode = text(
    component(
      place,
      "postal_code",
    )?.longText,
  );

  const country = text(
    component(
      place,
      "country",
    )?.longText,
  );

  const formattedAddress = text(
    place.formattedAddress,
  );

  const line1 =
    [
      streetNumber,
      route,
    ]
      .filter(Boolean)
      .join(" ")
    || premise
    || formattedAddress
      .split(",")[0]
      ?.trim()
    || "";

  const latitude = Number(
    place.location?.latitude,
  );

  const longitude = Number(
    place.location?.longitude,
  );

  return {
    line1,
    line2: subpremise,
    city,
    county,
    postcode,
    country,
    formattedAddress,
    placeId: text(place.id),
    ...(
      Number.isFinite(latitude)
        ? {
            lat: latitude,
          }
        : {}
    ),
    ...(
      Number.isFinite(longitude)
        ? {
            lng: longitude,
          }
        : {}
    ),
  };
}

async function googleAutocomplete(
  apiKey: string,
  input: string,
  token: string,
) {
  const response = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
        "X-Goog-Api-Key":
          apiKey,
      },
      body: JSON.stringify({
        input,
        sessionToken: token,
        includeQueryPredictions: false,
      }),
    },
  );

  if (!response.ok) {
    throw Object.assign(
      new Error(
        "Places autocomplete is temporarily unavailable.",
      ),
      {
        statusCode: 502,
      },
    );
  }

  const payload: any =
    await response.json();

  const suggestions =
    (
      Array.isArray(payload?.suggestions)
        ? payload.suggestions
        : []
    )
      .map(
        (
          item:
            GoogleAutocompleteSuggestion,
        ) => {
          const prediction =
            item?.placePrediction;

          if (!prediction) {
            return null;
          }

          const id = text(
            prediction.placeId,
          );

          const fullText = text(
            prediction.text?.text,
          );

          const mainText = text(
            prediction
              .structuredFormat
              ?.mainText
              ?.text,
          );

          const secondaryText = text(
            prediction
              .structuredFormat
              ?.secondaryText
              ?.text,
          );

          if (
            !id
            || !fullText
          ) {
            return null;
          }

          return {
            placeId: id,
            text: fullText,
            mainText:
              mainText
              || fullText,
            secondaryText,
          };
        },
      )
      .filter(Boolean)
      .slice(
        0,
        6,
      );

  return suggestions;
}

async function googleDetails(
  apiKey: string,
  id: string,
  token: string,
) {
  const url = new URL(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`,
  );

  url.searchParams.set(
    "sessionToken",
    token,
  );

  const response = await fetch(
    url.toString(),
    {
      headers: {
        "X-Goog-Api-Key":
          apiKey,
        "X-Goog-FieldMask":
          "id,displayName,formattedAddress,addressComponents,location",
      },
    },
  );

  if (!response.ok) {
    throw Object.assign(
      new Error(
        "Place details are temporarily unavailable.",
      ),
      {
        statusCode: 502,
      },
    );
  }

  const place =
    await response.json<GooglePlace>();

  return {
    placeId:
      text(place.id),
    name:
      text(
        place.displayName?.text,
      ),
    formattedAddress:
      text(
        place.formattedAddress,
      ),
    address:
      mapAddress(place),
  };
}

export const onRequestPost:
  PagesFunction<Env> =
async (context) => {
  try {
    const workspaceId =
      await resolvePublicWorkspaceId(
        context.env.MKB_DB,
        context.request,
      );

    if (!workspaceId) {
      return json(
        {
          error:
            "Places lookup is not available.",
        },
        404,
      );
    }

    const body: any =
      await context.request
        .json()
        .catch(
          () => ({}),
        );

    const kind =
      lookupKind(
        body?.kind,
      );

    if (!kind) {
      return json(
        {
          error:
            "Places lookup is not available.",
        },
        404,
      );
    }

    const lookupContext =
      text(
        body?.context,
      ) === "questionnaire"
        ? "questionnaire"
        : "lead";

    if (
      lookupContext
      === "questionnaire"
    ) {
      const identity =
        await getAuthenticatedClientIdentity(
          context.env.MKB_DB,
          context.request,
        );

      if (
        !identity
        || identity.workspaceId
          !== workspaceId
      ) {
        return json(
          {
            error:
              "Sign in to use questionnaire place search.",
          },
          401,
        );
      }
    } else {
      const form =
        await getPublicLeadForm(
          context.env.MKB_DB,
          workspaceId,
        );

      if (
        !activeFieldExists(
          form,
          kind,
        )
      ) {
        return json(
          {
            error:
              "Places lookup is not available for this form.",
          },
          404,
        );
      }
    }

    if (
      !allowBurst(
        context.request,
        workspaceId,
      )
    ) {
      return json(
        {
          error:
            "Too many place searches. Please wait a moment and try again.",
        },
        429,
        {
          "Retry-After":
            "60",
        },
      );
    }

    const token =
      sessionToken(
        body?.sessionToken,
      );

    if (!token) {
      return json(
        {
          error:
            "A valid search session is required.",
        },
        400,
      );
    }

    const apiKey =
      text(
        context.env
          .GOOGLE_PLACES_API_KEY,
      );

    if (!apiKey) {
      return json({
        ok: true,
        provider: "none",
        configured: false,
        suggestions: [],
      });
    }

    const action =
      text(
        body?.action,
      );

    if (
      action === "autocomplete"
    ) {
      const input =
        text(
          body?.input,
        ).slice(
          0,
          160,
        );

      if (
        input.length < 3
      ) {
        return json({
          ok: true,
          provider: "google",
          configured: true,
          suggestions: [],
        });
      }

      return json({
        ok: true,
        provider: "google",
        configured: true,
        suggestions:
          await googleAutocomplete(
            apiKey,
            input,
            token,
          ),
      });
    }

    if (
      action === "details"
    ) {
      const id =
        placeId(
          body?.placeId,
        );

      if (!id) {
        return json(
          {
            error:
              "Choose a valid place.",
          },
          400,
        );
      }

      return json({
        ok: true,
        provider: "google",
        configured: true,
        place:
          await googleDetails(
            apiKey,
            id,
            token,
          ),
      });
    }

    return json(
      {
        error:
          "Unsupported Places action.",
      },
      400,
    );
  } catch (error: any) {
    return json(
      {
        error:
          error?.message
          || "Places lookup failed.",
      },
      Number(
        error?.statusCode
        || 500,
      ),
    );
  }
};
