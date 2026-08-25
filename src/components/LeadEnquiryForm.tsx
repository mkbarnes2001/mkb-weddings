import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Helmet } from "react-helmet-async";
import {
  CheckCircle2,
  Loader2,
  Send,
} from "lucide-react";

type LeadFormFieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "phone"
  | "date"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "address"
  | "venue";

type LeadFormField = {
  id: string;
  type: LeadFormFieldType;
  label: string;
  help: string;
  placeholder: string;
  required: boolean;
  enabled: boolean;
  options: string[];
  systemKey: string;
  locked: boolean;
};

type LeadAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  formattedAddress?: string;
  placeId?: string;
  lat?: number;
  lng?: number;
};

type PlaceSuggestion = {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
};

type PlaceDetail = {
  placeId: string;
  name: string;
  formattedAddress: string;
  address: LeadAddress;
};

type LeadFormConfig = {
  businessName: string;
  defaultService: string;
  title: string;
  intro: string;
  thankYouTitle: string;
  thankYouMessage: string;
  privacyText: string;
  consentRequired: boolean;
  currency: string;
  fields: LeadFormField[];
};

type Answers = Record<
  string,
  unknown
>;

function currencySymbol(
  currency: string,
) {
  try {
    const part = new Intl.NumberFormat(
      "en-GB",
      {
        style: "currency",
        currency,
      },
    )
      .formatToParts(0)
      .find(
        (item) =>
          item.type === "currency",
      );

    return part?.value || currency;
  } catch {
    return currency || "GBP";
  }
}

function initialAnswers(
  fields: LeadFormField[],
): Answers {
  const answers: Answers = {};

  for (const field of fields) {
    if (field.type === "checkbox") {
      answers[field.id] = false;
    } else if (field.type === "address") {
      answers[field.id] = {};
    } else {
      answers[field.id] = "";
    }
  }

  return answers;
}

function textAnswer(
  answers: Answers,
  id: string,
) {
  const value = answers[id];

  return typeof value === "string"
    || typeof value === "number"
      ? String(value)
      : "";
}

function addressAnswer(
  answers: Answers,
  id: string,
): LeadAddress {
  const value = answers[id];

  return value
    && typeof value === "object"
    && !Array.isArray(value)
      ? value as LeadAddress
      : {};
}

export function LeadEnquiryForm({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [
    config,
    setConfig,
  ] = useState<LeadFormConfig | null>(
    null,
  );

  const [
    answers,
    setAnswers,
  ] = useState<Answers>({});

  const [
    privacyConsent,
    setPrivacyConsent,
  ] = useState(false);

  const [
    marketingConsent,
    setMarketingConsent,
  ] = useState(false);

  const [
    website,
    setWebsite,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    submitted,
    setSubmitted,
  ] = useState<{
    reference: string;
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    fetch(
      "/api/public/crm/enquiries",
      {
        headers: {
          Accept: "application/json",
        },
      },
    )
      .then(async (response) => {
        const payload = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload.error
            || "Enquiry form is not currently available.",
          );
        }

        const form =
          payload.form as LeadFormConfig;

        setConfig(form);

        setAnswers(
          initialAnswers(
            Array.isArray(form.fields)
              ? form.fields
              : [],
          ),
        );
      })
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Enquiry form is not currently available.",
        )
      )
      .finally(
        () => setLoading(false),
      );
  }, []);

  function setAnswer(
    fieldId: string,
    value: unknown,
  ) {
    setAnswers((current) => ({
      ...current,
      [fieldId]: value,
    }));

    setError("");
  }

  function setAddressPart(
    fieldId: string,
    key: keyof LeadAddress,
    value: string,
  ) {
    setAnswers((current) => ({
      ...current,
      [fieldId]: {
        ...addressAnswer(
          current,
          fieldId,
        ),
        [key]: value,
      },
    }));

    setError("");
  }

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!config) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const systemPayload:
        Record<string, unknown> = {};

      for (
        const field
        of config.fields.filter(
          (item) => item.enabled,
        )
      ) {
        if (!field.systemKey) {
          continue;
        }

        const value =
          answers[field.id];

        if (
          field.systemKey === "budgetMin"
          || field.systemKey === "budgetMax"
        ) {
          const raw =
            String(value ?? "").trim();

          systemPayload[field.systemKey] =
            raw
              ? Math.round(
                  Number(raw) * 100,
                )
              : null;

          continue;
        }

        systemPayload[field.systemKey] =
          value;
      }

      const response = await fetch(
        "/api/public/crm/enquiries",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
          },
          body: JSON.stringify({
            answers,
            ...systemPayload,
            serviceInterest:
              config.defaultService || "",
            privacyConsent,
            marketingConsent,
            website,
          }),
        },
      );

      const payload = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.error
          || "Unable to submit your enquiry.",
        );
      }

      setSubmitted({
        reference:
          payload.enquiry?.reference
          || "",
        title:
          payload.enquiry?.thankYouTitle
          || config.thankYouTitle
          || "Thank you",
        message:
          payload.enquiry?.thankYouMessage
          || config.thankYouMessage
          || "Your enquiry has been received.",
      });

      setAnswers(
        initialAnswers(
          config.fields,
        ),
      );

      setPrivacyConsent(false);
      setMarketingConsent(false);
      setWebsite("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit your enquiry.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center text-foreground/60">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading enquiry form…
      </div>
    );
  }

  if (!config) {
    return (
      <div className="border border-primary/10 bg-secondary/30 p-6 text-foreground/70">
        {error
          || "Enquiry form is not currently available."}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="border border-primary/15 bg-secondary/35 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-primary" />

        <h2 className="mb-3">
          {submitted.title}
        </h2>

        <p className="mx-auto max-w-2xl text-foreground/65">
          {submitted.message}
        </p>

        {submitted.reference ? (
          <p className="mt-4 text-sm font-medium">
            Reference: {submitted.reference}
          </p>
        ) : null}
      </div>
    );
  }

  const visibleFields =
    config.fields.filter(
      (field) => field.enabled,
    );

  function renderControl(
    field: LeadFormField,
  ) {
    const common = {
      required: field.required,
      disabled: submitting,
    };

    if (field.type === "long_text") {
      return (
        <textarea
          {...common}
          rows={6}
          value={textAnswer(
            answers,
            field.id,
          )}
          placeholder={field.placeholder}
          onChange={(event) =>
            setAnswer(
              field.id,
              event.target.value,
            )
          }
        />
      );
    }

    if (field.type === "select") {
      return (
        <select
          {...common}
          value={textAnswer(
            answers,
            field.id,
          )}
          onChange={(event) =>
            setAnswer(
              field.id,
              event.target.value,
            )
          }
        >
          <option value="">
            {field.placeholder
              || "Choose an option…"}
          </option>

          {field.options.map(
            (option) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            ),
          )}
        </select>
      );
    }

    if (field.type === "radio") {
      return (
        <div className="space-y-2">
          {field.options.map(
            (option) => (
              <label
                key={option}
                className="flex items-center gap-3 text-sm"
              >
                <input
                  type="radio"
                  name={field.id}
                  required={field.required}
                  disabled={submitting}
                  checked={
                    textAnswer(
                      answers,
                      field.id,
                    ) === option
                  }
                  value={option}
                  onChange={() =>
                    setAnswer(
                      field.id,
                      option,
                    )
                  }
                />

                <span>{option}</span>
              </label>
            ),
          )}
        </div>
      );
    }

    if (field.type === "checkbox") {
      return (
        <label className="flex items-start gap-3 text-sm">
          <input
            className="mt-1"
            type="checkbox"
            required={field.required}
            disabled={submitting}
            checked={Boolean(
              answers[field.id],
            )}
            onChange={(event) =>
              setAnswer(
                field.id,
                event.target.checked,
              )
            }
          />

          <span>
            {field.placeholder
              || field.label}
          </span>
        </label>
      );
    }

    if (field.type === "address") {
      const address =
        addressAnswer(
          answers,
          field.id,
        );

      return (
        <div className="space-y-2">
          <PublicPlacesAutocomplete
            kind="address"
            value={
              address.formattedAddress
              || address.line1
              || ""
            }
            placeholder={
              field.placeholder
              || "Start typing your address…"
            }
            autoComplete="address-line1"
            required={field.required}
            disabled={submitting}
            onManualChange={(value) =>
              setAnswer(
                field.id,
                {
                  ...address,
                  line1: value,
                  formattedAddress: "",
                  placeId: "",
                  lat: undefined,
                  lng: undefined,
                },
              )
            }
            onPlaceSelect={(place) =>
              setAnswer(
                field.id,
                place.address,
              )
            }
          />

          <details className="group">
            <summary
              className="inline-flex cursor-pointer list-none items-center text-[11px] font-medium text-foreground/45 underline decoration-foreground/20 underline-offset-2 transition-colors hover:text-foreground/65"
              style={{ listStyle: "none" }}
            >
              Can't find your address? Enter manually
            </summary>

            <div className="mt-2 grid gap-3 rounded-lg border border-black/10 bg-black/[0.02] p-3 md:grid-cols-2">
              <input
                className="md:col-span-2"
                disabled={submitting}
                value={address.line1 || ""}
                placeholder="Address line 1"
                autoComplete="address-line1"
                onChange={(event) =>
                  setAddressPart(
                    field.id,
                    "line1",
                    event.target.value,
                  )
                }
              />

              <input
                className="md:col-span-2"
                disabled={submitting}
                value={address.line2 || ""}
                placeholder="Address line 2"
                autoComplete="address-line2"
                onChange={(event) =>
                  setAddressPart(
                    field.id,
                    "line2",
                    event.target.value,
                  )
                }
              />

              <input
                disabled={submitting}
                value={address.city || ""}
                placeholder="Town / city"
                autoComplete="address-level2"
                onChange={(event) =>
                  setAddressPart(
                    field.id,
                    "city",
                    event.target.value,
                  )
                }
              />

              <input
                disabled={submitting}
                value={address.county || ""}
                placeholder="County / region"
                autoComplete="address-level1"
                onChange={(event) =>
                  setAddressPart(
                    field.id,
                    "county",
                    event.target.value,
                  )
                }
              />

              <input
                disabled={submitting}
                value={address.postcode || ""}
                placeholder="Postcode"
                autoComplete="postal-code"
                onChange={(event) =>
                  setAddressPart(
                    field.id,
                    "postcode",
                    event.target.value,
                  )
                }
              />

              <input
                disabled={submitting}
                value={address.country || ""}
                placeholder="Country"
                autoComplete="country-name"
                onChange={(event) =>
                  setAddressPart(
                    field.id,
                    "country",
                    event.target.value,
                  )
                }
              />
            </div>
          </details>
        </div>
      );
    }

    if (field.type === "venue") {
      return (
        <PublicPlacesAutocomplete
          kind="venue"
          value={textAnswer(
            answers,
            field.id,
          )}
          placeholder={
            field.placeholder
            || "Venue name or TBC"
          }
          autoComplete="off"
          required={field.required}
          disabled={submitting}
          onManualChange={(value) => {
            setAnswer(
              field.id,
              value,
            );

            // Manual editing invalidates any previously selected
            // Google identity. Never retain a stale Place ID behind
            // free-text venue content.
            setAnswer(
              "__venuePlace",
              null,
            );
          }}
          onPlaceSelect={(place) => {
            setAnswer(
              field.id,
              place.name
              || place.formattedAddress,
            );

            // Keep the public CRM Venue answer as a plain string.
            // The structured Google identity is submission metadata
            // and is normalised server-side before persistence.
            setAnswer(
              "__venuePlace",
              {
                placeId:
                  place.placeId,
                name:
                  place.name
                  || place.formattedAddress,
                formattedAddress:
                  place.formattedAddress,
                town:
                  place.address?.city
                  || "",
                county:
                  place.address?.county
                  || "",
                country:
                  place.address?.country
                  || "",
                lat:
                  place.address?.lat,
                lng:
                  place.address?.lng,
              },
            );
          }}
        />
      );
    }

    const inputType =
      field.type === "email"
        ? "email"
        : field.type === "phone"
          ? "tel"
          : field.type === "date"
            ? "date"
            : field.type === "number"
              ? "number"
              : "text";

    return (
      <input
        {...common}
        type={inputType}
        min={
          field.type === "number"
            ? "0"
            : undefined
        }
        step={
          field.type === "number"
            ? field.systemKey === "budgetMin"
              || field.systemKey === "budgetMax"
                ? "50"
                : "any"
            : undefined
        }
        value={textAnswer(
          answers,
          field.id,
        )}
        placeholder={field.placeholder}
        onChange={(event) =>
          setAnswer(
            field.id,
            event.target.value,
          )
        }
      />
    );
  }

  const body = (
    <>
      {!embedded ? (
        <Helmet>
          <title>
            {config.title} | {config.businessName}
          </title>

          <meta
            name="description"
            content={
              config.intro
              || `Send an enquiry to ${config.businessName}.`
            }
          />
        </Helmet>
      ) : null}

      <form
        onSubmit={submit}
        className="space-y-6"
      >
        <div>
          <h2
            className={
              embedded
                ? "mb-3"
                : "mb-4 text-center"
            }
          >
            {config.title}
          </h2>

          <p
            className={`text-foreground/60 ${
              embedded
                ? ""
                : "mx-auto max-w-2xl text-center"
            }`}
          >
            {config.intro}
          </p>
        </div>

        {error ? (
          <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          {visibleFields.map((field) => {
            const wide =
              field.type === "long_text"
              || field.type === "address"
              || field.type === "radio"
              || field.type === "checkbox";

            const label =
              (
                field.systemKey === "budgetMin"
                || field.systemKey === "budgetMax"
              )
                ? `${field.label} (${currencySymbol(config.currency)})`
                : field.label;

            return (
              <div
                key={field.id}
                className={
                  wide
                    ? "md:col-span-2"
                    : ""
                }
              >
                <LeadField
                  label={label}
                  required={field.required}
                  help={field.help}
                  hideLabel={
                    field.type === "checkbox"
                  }
                >
                  {renderControl(field)}
                </LeadField>
              </div>
            );
          })}
        </div>

        <div
          className="hidden"
          aria-hidden="true"
        >
          <label>
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) =>
                setWebsite(
                  event.target.value,
                )
              }
            />
          </label>
        </div>

        <label className="flex items-start gap-3 text-sm text-foreground/70">
          <input
            className="mt-1"
            type="checkbox"
            required={config.consentRequired}
            checked={privacyConsent}
            disabled={submitting}
            onChange={(event) =>
              setPrivacyConsent(
                event.target.checked,
              )
            }
          />

          <span>
            {config.privacyText}
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm text-foreground/60">
          <input
            className="mt-1"
            type="checkbox"
            checked={marketingConsent}
            disabled={submitting}
            onChange={(event) =>
              setMarketingConsent(
                event.target.checked,
              )
            }
          />

          <span>
            I am happy to receive occasional wedding
            photography news and offers. Optional.
          </span>
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-primary px-6 py-3 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}

          {submitting
            ? "Sending…"
            : "Send enquiry"}
        </button>
      </form>
    </>
  );

  return body;
}

export function PublicPlacesAutocomplete({
  kind,
  context = "lead",
  endpoint = "/api/public/crm/places",
  value,
  placeholder,
  autoComplete,
  required,
  disabled,
  onManualChange,
  onPlaceSelect,
}: {
  kind: "address" | "venue";
  context?: "lead" | "questionnaire";
  endpoint?: string;
  value: string;
  placeholder: string;
  autoComplete: string;
  required?: boolean;
  disabled?: boolean;
  onManualChange: (value: string) => void;
  onPlaceSelect: (place: PlaceDetail) => void;
}) {
  const [
    suggestions,
    setSuggestions,
  ] = useState<PlaceSuggestion[]>([]);

  const [
    configured,
    setConfigured,
  ] = useState<boolean | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    query,
    setQuery,
  ] = useState(value);

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(-1);

  const listIdRef =
    useRef("");

  if (!listIdRef.current) {
    listIdRef.current =
      `places-${kind}-${crypto.randomUUID()}`;
  }

  const sessionTokenRef =
    useRef<string>("");

  useEffect(
    () => {
      setQuery(value);
    },
    [value],
  );

  useEffect(
    () => {
      const input =
        query.trim();

      if (
        disabled
        || input.length < 3
      ) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      if (
        !sessionTokenRef.current
      ) {
        sessionTokenRef.current =
          crypto.randomUUID();
      }

      const controller =
        new AbortController();

      const timer =
        window.setTimeout(
          async () => {
            setLoading(true);

            try {
              const response =
                await fetch(
                  endpoint,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type":
                        "application/json",
                      Accept:
                        "application/json",
                    },
                    signal:
                      controller.signal,
                    body:
                      JSON.stringify({
                        action:
                          "autocomplete",
                        kind,
                        context,
                        input,
                        sessionToken:
                          sessionTokenRef.current,
                      }),
                  },
                );

              const payload =
                await response
                  .json()
                  .catch(
                    () => ({}),
                  );

              if (
                controller.signal.aborted
              ) {
                return;
              }

              if (!response.ok) {
                setSuggestions([]);
                return;
              }

              setConfigured(
                Boolean(
                  payload.configured,
                ),
              );

              setSuggestions(
                Array.isArray(
                  payload.suggestions,
                )
                  ? payload.suggestions
                  : [],
              );
            } catch (lookupError) {
              if (
                !controller.signal.aborted
              ) {
                setSuggestions([]);
              }
            } finally {
              if (
                !controller.signal.aborted
              ) {
                setLoading(false);
              }
            }
          },
          280,
        );

      return () => {
        window.clearTimeout(
          timer,
        );

        controller.abort();
      };
    },
    [
      query,
      kind,
      context,
      endpoint,
      disabled,
    ],
  );

  async function choose(
    suggestion:
      PlaceSuggestion,
  ) {
    const token =
      sessionTokenRef.current;

    setQuery(
      suggestion.text,
    );

    setOpen(false);
    setSuggestions([]);

    if (!token) {
      onManualChange(
        suggestion.mainText
        || suggestion.text,
      );

      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          endpoint,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
            body:
              JSON.stringify({
                action:
                  "details",
                kind,
                context,
                placeId:
                  suggestion.placeId,
                sessionToken:
                  token,
              }),
          },
        );

      const payload =
        await response
          .json()
          .catch(
            () => ({}),
          );

      if (
        response.ok
        && payload?.place
      ) {
        const place =
          payload.place as PlaceDetail;

        onPlaceSelect(
          place,
        );

        setQuery(
          kind === "venue"
            ? (
                place.name
                || suggestion.mainText
                || suggestion.text
              )
            : (
                place.formattedAddress
                || suggestion.text
              ),
        );
      } else {
        onManualChange(
          kind === "venue"
            ? (
                suggestion.mainText
                || suggestion.text
              )
            : suggestion.text,
        );
      }
    } catch {
      onManualChange(
        kind === "venue"
          ? (
              suggestion.mainText
              || suggestion.text
            )
          : suggestion.text,
      );
    } finally {
      sessionTokenRef.current =
        "";

      setLoading(false);
    }
  }

  const visibleSuggestions =
    suggestions.slice(
      0,
      5,
    );

  const listId =
    listIdRef.current;

  const expanded =
    Boolean(
      open
      && configured
      && visibleSuggestions.length,
    );

  return (
    <div className="relative w-full">
      <div className="relative w-full">
        <input
          role="combobox"
          value={query}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={
            expanded
              ? listId
              : undefined
          }
          aria-activedescendant={
            expanded
            && activeIndex >= 0
              ? `${listId}-option-${activeIndex}`
              : undefined
          }
          className="w-full"
          onFocus={() =>
            setOpen(true)
          }
          onBlur={() =>
            window.setTimeout(
              () => {
                setOpen(false);
                setActiveIndex(-1);
              },
              120,
            )
          }
          onKeyDown={(event) => {
            if (
              event.key === "ArrowDown"
            ) {
              if (
                !visibleSuggestions.length
              ) {
                return;
              }

              event.preventDefault();
              setOpen(true);

              setActiveIndex(
                (current) =>
                  current < 0
                    ? 0
                    : Math.min(
                        current + 1,
                        visibleSuggestions.length - 1,
                      ),
              );

              return;
            }

            if (
              event.key === "ArrowUp"
            ) {
              if (
                !visibleSuggestions.length
              ) {
                return;
              }

              event.preventDefault();
              setOpen(true);

              setActiveIndex(
                (current) =>
                  current <= 0
                    ? 0
                    : current - 1,
              );

              return;
            }

            if (
              event.key === "Enter"
              && expanded
              && activeIndex >= 0
              && visibleSuggestions[
                activeIndex
              ]
            ) {
              event.preventDefault();

              void choose(
                visibleSuggestions[
                  activeIndex
                ],
              );

              return;
            }

            if (
              event.key === "Escape"
            ) {
              event.preventDefault();
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
          onChange={(event) => {
            const next =
              event.target.value;

            setQuery(next);
            setOpen(true);
            setActiveIndex(-1);
            onManualChange(next);

            if (
              next.trim().length < 3
            ) {
              sessionTokenRef.current =
                "";

              setSuggestions([]);
            }
          }}
        />

        {loading ? (
          <Loader2
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-foreground/40"
          />
        ) : null}
      </div>

      {expanded ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-[90] mt-1.5 w-full max-h-72 overflow-y-auto rounded-xl border border-black/10 bg-white p-1 shadow-[0_12px_30px_rgba(0,0,0,0.12)]"
        >
          {visibleSuggestions.map(
            (
              suggestion,
              index,
            ) => (
              <button
                key={
                  suggestion.placeId
                }
                id={`${listId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={
                  index
                  === activeIndex
                }
                className={`block min-w-0 w-full overflow-hidden rounded-lg px-3 py-2.5 text-left transition-colors focus:outline-none ${
                  index
                  === activeIndex
                    ? "bg-secondary/60"
                    : "hover:bg-secondary/60"
                }`}
                onMouseDown={(event) =>
                  event.preventDefault()
                }
                onMouseEnter={() =>
                  setActiveIndex(
                    index,
                  )
                }
                onClick={() =>
                  void choose(
                    suggestion,
                  )
                }
              >
                <span className="block min-w-0 truncate text-sm font-semibold text-foreground">
                  {suggestion.mainText
                    || suggestion.text}
                </span>

                {suggestion.secondaryText ? (
                  <span className="mt-0.5 block min-w-0 truncate text-[11px] leading-4 text-foreground/55">
                    {
                      suggestion
                        .secondaryText
                    }
                  </span>
                ) : null}
              </button>
            ),
          )}

          <div className="flex justify-end border-t border-primary/10 px-3 py-2">
            <span
              className="text-[11px] font-medium text-foreground/55"
              translate="no"
              aria-label="Google Maps"
            >
              Google Maps
            </span>
          </div>
        </div>
      ) : null}

      {configured === false
      && query.trim().length >= 3 ? (
        <p className="mt-1.5 text-[11px] leading-4 text-foreground/50">
          Place search is unavailable. You can continue typing manually.
        </p>
      ) : null}
    </div>
  );
}

export function Enquire() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20 md:px-10">
      <LeadEnquiryForm />
    </section>
  );
}

function LeadField({
  label,
  required,
  help,
  hideLabel = false,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  hideLabel?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="block">
      {!hideLabel ? (
        <label className="mb-2 block text-sm font-medium">
          {label}
          {required ? " *" : ""}
        </label>
      ) : null}

      <div className="lead-form-control">
        {children}
      </div>

      {help ? (
        <p className="mt-2 text-xs leading-5 text-foreground/50">
          {help}
        </p>
      ) : null}
    </div>
  );
}
