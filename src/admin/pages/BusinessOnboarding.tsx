import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Globe2,
  Image,
  MapPinned,
  Pause,
  Save,
  Sparkles,
} from "lucide-react";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import {
  AdminButton,
  AdminField,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminStatus,
} from "../components/ui/AdminUI";
import { AdminApiService } from "../services/AdminApiService";
import type {
  WedPlannedBusiness,
  WedPlannedPlatformPayload,
  WedPlannedServiceArea,
} from "../types/platform";

const emptyServiceArea: Partial<WedPlannedServiceArea> = {
  label: "",
  areaType: "region",
  countryCode: "GB",
  regionCode: "",
  radiusMiles: null,
  remoteAvailable: false,
};

function TextInput({
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="admin-input"
    />
  );
}

function SelectInput({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="admin-select"
    >
      {children}
    </select>
  );
}

export function BusinessOnboarding() {
  const { auth } = useProfessionalAuth();
  const navigate = useNavigate();

  const [platform, setPlatform] =
    useState<WedPlannedPlatformPayload | null>(null);

  const [business, setBusiness] =
    useState<WedPlannedBusiness | null>(null);

  const [selectedCategories, setSelectedCategories] =
    useState<string[]>([]);

  const [primaryCategory, setPrimaryCategory] =
    useState("");

  const [serviceArea, setServiceArea] =
    useState<Partial<WedPlannedServiceArea>>(
      emptyServiceArea,
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const canEditBusiness =
    auth.permissions.includes(
      "business:update",
    );

  const canEditServices =
    auth.permissions.includes(
      "services:update",
    );

  function apply(
    next: WedPlannedPlatformPayload,
  ) {
    setPlatform(next);
    setBusiness(next.business);

    const categoryKeys =
      next.categories
        .filter(
          (category) =>
            category.selected,
        )
        .map(
          (category) =>
            category.key,
        );

    setSelectedCategories(
      categoryKeys,
    );

    setPrimaryCategory(
      next.categories.find(
        (category) =>
          category.primary,
      )?.key
      || categoryKeys[0]
      || "",
    );

    setServiceArea(
      (current) => ({
        ...current,
        countryCode:
          current.countryCode
          || next.business.defaultCountry
          || "GB",
      }),
    );
  }

  useEffect(() => {
    setLoading(true);

    AdminApiService
      .getWedPlannedPlatform()
      .then(apply)
      .catch(
        (loadError) =>
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load business setup.",
          ),
      )
      .finally(
        () =>
          setLoading(false),
      );
  }, [auth.workspaceId]);

  const categoryGroups =
    useMemo(() => {
      const groups =
        new Map<
          string,
          WedPlannedPlatformPayload["categories"]
        >();

      for (
        const category
        of platform?.categories || []
      ) {
        const current =
          groups.get(
            category.group,
          ) || [];

        current.push(category);

        groups.set(
          category.group,
          current,
        );
      }

      return Array.from(
        groups.entries(),
      );
    }, [platform?.categories]);

  function updateBusiness<
    K extends keyof WedPlannedBusiness
  >(
    key: K,
    value: WedPlannedBusiness[K],
  ) {
    setBusiness(
      (current) =>
        current
          ? {
              ...current,
              [key]: value,
            }
          : current,
    );

    setMessage("");
  }

  async function run(
    action: () =>
      Promise<WedPlannedPlatformPayload>,
    success: string,
  ) {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const next =
        await action();

      apply(next);
      setMessage(success);

      return true;
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to save business setup.",
      );

      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveBusinessStep(
    step:
      | "identity"
      | "contact"
      | "brand",
    success: string,
  ) {
    if (!business) {
      return;
    }

    await run(
      async () => {
        const savedBusiness =
          await AdminApiService
            .saveWedPlannedBusiness(
              business,
            );

        apply(savedBusiness);

        return AdminApiService
          .saveWedPlannedOnboarding(
            "confirm",
            step,
          );
      },
      success,
    );
  }

  async function saveCategories() {
    if (!selectedCategories.length) {
      setError(
        "Select at least one service.",
      );
      return;
    }

    await run(
      () =>
        AdminApiService
          .saveWedPlannedCategories(
            selectedCategories,
            primaryCategory,
          ),
      "Business services saved.",
    );
  }

  async function saveServiceArea() {
    if (
      !String(
        serviceArea.label || "",
      ).trim()
    ) {
      setError(
        "Enter a service-area name.",
      );
      return;
    }

    const saved =
      await run(
        () =>
          AdminApiService
            .saveWedPlannedServiceArea(
              serviceArea,
            ),
        "Service area added.",
      );

    if (saved) {
      setServiceArea({
        ...emptyServiceArea,
        countryCode:
          business?.defaultCountry
          || "GB",
      });
    }
  }

  async function deferOptionalStep(
    step:
      | "contact"
      | "brand",
  ) {
    await run(
      () =>
        AdminApiService
          .saveWedPlannedOnboarding(
            "defer-step",
            step,
          ),
      "This optional step can be completed later.",
    );
  }

  async function pauseOnboarding() {
    const saved =
      await run(
        () =>
          AdminApiService
            .saveWedPlannedOnboarding(
              "pause",
            ),
        "Business setup paused.",
      );

    if (saved) {
      navigate("/admin");
    }
  }

  async function resumeOnboarding() {
    await run(
      () =>
        AdminApiService
          .saveWedPlannedOnboarding(
            "resume",
          ),
      "Business setup resumed.",
    );
  }

  async function finishOnboarding() {
    const saved =
      await run(
        () =>
          AdminApiService
            .saveWedPlannedOnboarding(
              "complete",
            ),
        "Business setup complete.",
      );

    if (saved) {
      navigate("/admin");
    }
  }

  if (loading) {
    return (
      <div className="admin-page text-sm text-neutral-500">
        Loading business setup…
      </div>
    );
  }

  if (
    !platform
    || !business
  ) {
    return (
      <div className="admin-page rounded-xl bg-red-50 p-5 text-sm text-red-800">
        {error || "Business setup is unavailable."}
      </div>
    );
  }

  const onboarding =
    platform.onboarding;

  if (!onboarding.applicable) {
    return (
      <AdminPage>
        <AdminPageHeader
          eyebrow="WedNav · Business setup"
          title="Business setup"
          description="This workspace does not require the first-run setup flow."
        />

        <AdminPanel
          title="Workspace already established"
          description="Existing workspaces remain unchanged and can continue using the normal WedNav business settings."
        >
          <Link
            to="/admin"
            className="admin-button admin-button--primary admin-button--md"
          >
            Return to WedNav
          </Link>
        </AdminPanel>
      </AdminPage>
    );
  }

  if (
    onboarding.state
    === "complete"
  ) {
    return (
      <AdminPage>
        <AdminPageHeader
          eyebrow="WedNav · Business setup"
          title="Setup complete"
          description="Your essential WedPlanned business setup has been completed."
        />

        <AdminPanel
          title="Your workspace is ready"
          icon={CheckCircle2}
        >
          <Link
            to="/admin"
            className="admin-button admin-button--primary admin-button--md"
          >
            Open WedNav
          </Link>
        </AdminPanel>
      </AdminPage>
    );
  }

  const allStepsResolved =
    onboarding.completedCount
    === onboarding.totalCount;

  const progressPercent =
    onboarding.totalCount
      ? Math.round(
          onboarding.completedCount
          / onboarding.totalCount
          * 100,
        )
      : 0;

  const stepState =
    Object.fromEntries(
      onboarding.steps.map(
        (step) => [
          step.key,
          step,
        ],
      ),
    );

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="WedNav · First-run setup"
        title="Set up your business"
        description="Complete the essential details WedPlanned needs to make this workspace useful. Optional details can be deferred and completed later."
        meta={
          <div className="flex flex-wrap gap-2">
            <AdminStatus tone="info">
              {onboarding.completedCount}
              {" / "}
              {onboarding.totalCount}
              {" steps"}
            </AdminStatus>

            <AdminStatus
              tone={
                onboarding.state
                === "deferred"
                  ? "warning"
                  : "success"
              }
            >
              {onboarding.state}
            </AdminStatus>
          </div>
        }
        actions={
          <AdminButton
            variant="ghost"
            icon={Pause}
            onClick={pauseOnboarding}
            disabled={
              saving
              || !canEditBusiness
            }
          >
            Continue later
          </AdminButton>
        }
      />

      {message ? (
        <div className="admin-alert admin-alert--success">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="admin-alert admin-alert--error">
          {error}
        </div>
      ) : null}

      <AdminPanel
        title="Setup progress"
        description="Required steps must be completed. Optional steps may be marked for later."
        icon={Sparkles}
      >
        <div className="h-2 overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full bg-black transition-all"
            style={{
              width:
                `${progressPercent}%`,
            }}
          />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {onboarding.steps.map(
            (step) => (
              <div
                key={step.key}
                className="rounded-xl bg-[#f7f5f1] p-3"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={15}
                    className={
                      step.complete
                      || step.deferred
                        ? "text-emerald-600"
                        : "text-neutral-300"
                    }
                  />

                  <span className="text-xs font-semibold">
                    {step.label}
                  </span>
                </div>

                <p className="mt-1 text-[10px] text-neutral-500">
                  {step.complete
                    ? "Complete"
                    : step.deferred
                      ? "Do later"
                      : step.required
                        ? "Required"
                        : "Optional"}
                </p>
              </div>
            ),
          )}
        </div>
      </AdminPanel>

      {onboarding.state
        === "deferred" ? (
        <AdminPanel
          title="Setup paused"
          description="Resume when you are ready. Your saved business data has not been lost."
          icon={Pause}
          actions={
            <AdminButton
              variant="primary"
              onClick={resumeOnboarding}
              disabled={
                saving
                || !canEditBusiness
              }
            >
              Resume setup
            </AdminButton>
          }
        >
          <p className="text-xs text-neutral-600">
            You can still review the sections below while setup is paused.
          </p>
        </AdminPanel>
      ) : null}

      <AdminPanel
        title="1. Business identity"
        description="Confirm the basic identity and operating defaults created during signup."
        icon={Building2}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AdminField label="Business name">
            <TextInput
              value={business.publicName}
              onChange={
                (value) =>
                  updateBusiness(
                    "publicName",
                    value,
                  )
              }
            />
          </AdminField>

          <AdminField label="Business type">
            <SelectInput
              value={business.businessType}
              onChange={
                (value) =>
                  updateBusiness(
                    "businessType",
                    value as WedPlannedBusiness["businessType"],
                  )
              }
            >
              <option value="sole_trader">
                Sole trader
              </option>
              <option value="partnership">
                Partnership
              </option>
              <option value="limited_company">
                Limited company
              </option>
              <option value="charity">
                Charity
              </option>
              <option value="other">
                Other
              </option>
            </SelectInput>
          </AdminField>

          <AdminField
            label="Country"
            help="Two-letter country code."
          >
            <TextInput
              value={business.defaultCountry}
              onChange={
                (value) =>
                  updateBusiness(
                    "defaultCountry",
                    value
                      .toUpperCase()
                      .slice(0, 2),
                  )
              }
            />
          </AdminField>

          <AdminField label="Timezone">
            <TextInput
              value={business.timezone}
              onChange={
                (value) =>
                  updateBusiness(
                    "timezone",
                    value,
                  )
              }
            />
          </AdminField>

          <AdminField label="Currency">
            <TextInput
              value={business.currency}
              onChange={
                (value) =>
                  updateBusiness(
                    "currency",
                    value
                      .toUpperCase()
                      .slice(0, 3),
                  )
              }
            />
          </AdminField>
        </div>

        <div className="mt-5 flex justify-end">
          <AdminButton
            variant="primary"
            icon={Save}
            onClick={
              () =>
                saveBusinessStep(
                  "identity",
                  "Business identity confirmed.",
                )
            }
            disabled={
              saving
              || !canEditBusiness
              || !business.publicName.trim()
            }
          >
            {stepState.identity?.complete
              ? "Save identity"
              : "Save & confirm identity"}
          </AdminButton>
        </div>
      </AdminPanel>

      <AdminPanel
        title="2. Services"
        description="Choose what your business does. Supplier taxonomy is platform-owned and is deliberately excluded here."
        icon={BriefcaseBusiness}
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(260px,.45fr)]">
          <div className="space-y-4">
            {categoryGroups.map(
              ([group, categories]) => (
                <div key={group}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                    {group}
                  </p>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {categories.map(
                      (category) => {
                        const checked =
                          selectedCategories.includes(
                            category.key,
                          );

                        return (
                          <label
                            key={category.key}
                            className={
                              `flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs ${
                                checked
                                  ? "border-black bg-black text-white"
                                  : "border-black/10 bg-white"
                              }`
                            }
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={
                                (event) => {
                                  const next =
                                    event.target.checked
                                      ? [
                                          ...selectedCategories,
                                          category.key,
                                        ]
                                      : selectedCategories.filter(
                                          (key) =>
                                            key
                                            !== category.key,
                                        );

                                  setSelectedCategories(
                                    next,
                                  );

                                  if (
                                    !event.target.checked
                                    && primaryCategory
                                      === category.key
                                  ) {
                                    setPrimaryCategory(
                                      next[0] || "",
                                    );
                                  }
                                }
                              }
                            />

                            <span className="font-medium">
                              {category.name}
                            </span>
                          </label>
                        );
                      },
                    )}
                  </div>
                </div>
              ),
            )}
          </div>

          <div>
            <AdminField
              label="Primary service"
              help="Used as the main description of what your business does."
            >
              <SelectInput
                value={primaryCategory}
                onChange={setPrimaryCategory}
              >
                <option value="">
                  Choose primary service
                </option>

                {platform.categories
                  .filter(
                    (category) =>
                      selectedCategories.includes(
                        category.key,
                      ),
                  )
                  .map(
                    (category) => (
                      <option
                        key={category.key}
                        value={category.key}
                      >
                        {category.name}
                      </option>
                    ),
                  )}
              </SelectInput>
            </AdminField>

            <div className="mt-4">
              <AdminButton
                variant="primary"
                icon={Save}
                onClick={saveCategories}
                disabled={
                  saving
                  || !canEditServices
                  || !selectedCategories.length
                }
              >
                Save services
              </AdminButton>
            </div>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel
        title="3. Where you work"
        description="Add at least one region, country, destination or remote service area."
        icon={MapPinned}
      >
        {platform.serviceAreas.length ? (
          <div className="mb-5 flex flex-wrap gap-2">
            {platform.serviceAreas.map(
              (area) => (
                <span
                  key={area.id}
                  className="rounded-full bg-[#f2eee7] px-3 py-1.5 text-[10px] font-medium"
                >
                  {area.label}
                </span>
              ),
            )}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminField label="Area name">
            <TextInput
              value={serviceArea.label}
              placeholder="e.g. Northern Ireland"
              onChange={
                (value) =>
                  setServiceArea(
                    (current) => ({
                      ...current,
                      label: value,
                    }),
                  )
              }
            />
          </AdminField>

          <AdminField label="Area type">
            <SelectInput
              value={
                String(
                  serviceArea.areaType
                  || "region",
                )
              }
              onChange={
                (value) =>
                  setServiceArea(
                    (current) => ({
                      ...current,
                      areaType:
                        value as WedPlannedServiceArea["areaType"],
                    }),
                  )
              }
            >
              <option value="local">
                Local
              </option>
              <option value="city">
                City
              </option>
              <option value="county">
                County
              </option>
              <option value="region">
                Region
              </option>
              <option value="country">
                Country
              </option>
              <option value="destination">
                Destination
              </option>
              <option value="remote">
                Remote / online
              </option>
              <option value="custom">
                Custom
              </option>
            </SelectInput>
          </AdminField>

          <AdminField
            label="Country"
            help="Two-letter country code."
          >
            <TextInput
              value={serviceArea.countryCode}
              onChange={
                (value) =>
                  setServiceArea(
                    (current) => ({
                      ...current,
                      countryCode:
                        value
                          .toUpperCase()
                          .slice(0, 2),
                    }),
                  )
              }
            />
          </AdminField>

          <AdminField
            label="Radius"
            help="Optional miles."
          >
            <TextInput
              type="number"
              value={serviceArea.radiusMiles}
              onChange={
                (value) =>
                  setServiceArea(
                    (current) => ({
                      ...current,
                      radiusMiles:
                        value
                          ? Number(value)
                          : null,
                    }),
                  )
              }
            />
          </AdminField>
        </div>

        <div className="mt-5 flex justify-end">
          <AdminButton
            variant="primary"
            icon={MapPinned}
            onClick={saveServiceArea}
            disabled={
              saving
              || !canEditServices
              || !String(
                serviceArea.label
                || "",
              ).trim()
            }
          >
            Add service area
          </AdminButton>
        </div>
      </AdminPanel>

      <AdminPanel
        title="4. Contact & online presence"
        description="Optional. Add the public details clients can use to find or contact the business."
        icon={Globe2}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Contact email">
            <TextInput
              type="email"
              value={business.contactEmail}
              onChange={
                (value) =>
                  updateBusiness(
                    "contactEmail",
                    value,
                  )
              }
            />
          </AdminField>

          <AdminField label="Phone">
            <TextInput
              value={business.phone}
              onChange={
                (value) =>
                  updateBusiness(
                    "phone",
                    value,
                  )
              }
            />
          </AdminField>

          <AdminField label="Website">
            <TextInput
              value={business.websiteUrl}
              placeholder="https://…"
              onChange={
                (value) =>
                  updateBusiness(
                    "websiteUrl",
                    value,
                  )
              }
            />
          </AdminField>

          <AdminField label="Instagram">
            <TextInput
              value={business.instagram}
              placeholder="without @"
              onChange={
                (value) =>
                  updateBusiness(
                    "instagram",
                    value,
                  )
              }
            />
          </AdminField>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <AdminButton
            variant="ghost"
            onClick={
              () =>
                deferOptionalStep(
                  "contact",
                )
            }
            disabled={
              saving
              || !canEditBusiness
            }
          >
            Do this later
          </AdminButton>

          <AdminButton
            variant="primary"
            icon={Save}
            onClick={
              () =>
                saveBusinessStep(
                  "contact",
                  "Contact details saved.",
                )
            }
            disabled={
              saving
              || !canEditBusiness
            }
          >
            Save contact details
          </AdminButton>
        </div>
      </AdminPanel>

      <AdminPanel
        title="5. Brand identity"
        description="Optional. Add an existing logo URL now, or defer brand setup until later."
        icon={Image}
      >
        <AdminField
          label="Business logo URL"
          help="The workspace already has a canonical logo field. A dedicated asset upload can be added separately without duplicating brand data."
        >
          <TextInput
            value={business.logoUrl}
            placeholder="https://…"
            onChange={
              (value) =>
                updateBusiness(
                  "logoUrl",
                  value,
                )
            }
          />
        </AdminField>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <AdminButton
            variant="ghost"
            onClick={
              () =>
                deferOptionalStep(
                  "brand",
                )
            }
            disabled={
              saving
              || !canEditBusiness
            }
          >
            Do this later
          </AdminButton>

          <AdminButton
            variant="primary"
            icon={Save}
            onClick={
              () =>
                saveBusinessStep(
                  "brand",
                  "Brand choice saved.",
                )
            }
            disabled={
              saving
              || !canEditBusiness
            }
          >
            Save brand choice
          </AdminButton>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Finish setup"
        description="When all five setup decisions are resolved, WedPlanned will leave first-run mode and return you to the normal WedNav dashboard."
        icon={CheckCircle2}
        actions={
          <AdminButton
            variant="primary"
            icon={CheckCircle2}
            onClick={finishOnboarding}
            disabled={
              saving
              || !canEditBusiness
              || !onboarding.requiredComplete
              || !allStepsResolved
            }
          >
            Finish setup
          </AdminButton>
        }
      >
        {!onboarding.requiredComplete ? (
          <p className="text-xs text-neutral-600">
            Complete business identity, services and at least one service area first.
          </p>
        ) : !allStepsResolved ? (
          <p className="text-xs text-neutral-600">
            Complete or defer the remaining optional steps before finishing.
          </p>
        ) : (
          <p className="text-xs text-neutral-600">
            Your setup checklist is complete and ready to finish.
          </p>
        )}
      </AdminPanel>
    </AdminPage>
  );
}
