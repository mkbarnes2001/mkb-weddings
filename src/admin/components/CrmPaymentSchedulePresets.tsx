import {
  useEffect,
  useState,
} from "react";
import {
  Archive,
  Check,
  CreditCard,
  Plus,
  Save,
} from "lucide-react";
import {
  AdminIconButton,
  AdminField,
  AdminPanel,
  AdminStatus,
} from "./ui/AdminUI";
import {
  AdminApiService,
} from "../services/AdminApiService";
import type {
  CrmPaymentSchedulePreset,
  CrmPaymentSchedulePresetInput,
} from "../types/crm";

type Props = {
  canManage: boolean;
};

const EMPTY:
  CrmPaymentSchedulePresetInput = {
    name: "",
    description: "",
    status: "active",
    default: false,
    depositType: "fixed",
    depositValue: 15000,
    depositDueDaysAfterAcceptance: 0,
    finalBalanceDueDaysBeforeEvent: 30,
    sortOrder: 10,
  };

function summary(
  preset: CrmPaymentSchedulePreset,
) {
  if (
    preset.depositType
    === "fixed"
  ) {
    const pounds =
      preset.depositValue / 100;

    return (
      `£${pounds.toFixed(
        preset.depositValue % 100
          ? 2
          : 0,
      )} booking fee`
    );
  }

  if (
    preset.depositType
    === "percentage"
  ) {
    return `${
      preset.depositValue / 100
    }% deposit`;
  }

  return "No deposit";
}

export function CrmPaymentSchedulePresets({
  canManage,
}: Props) {
  const [
    items,
    setItems,
  ] = useState<
    CrmPaymentSchedulePreset[]
  >([]);

  const [
    activeId,
    setActiveId,
  ] = useState("");

  const [
    draft,
    setDraft,
  ] = useState<
    CrmPaymentSchedulePresetInput
  >({
    ...EMPTY,
  });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  function select(
    preset: CrmPaymentSchedulePreset,
  ) {
    setActiveId(
      preset.id,
    );

    setDraft({
      name:
        preset.name,

      description:
        preset.description,

      status:
        preset.status,

      default:
        preset.default,

      depositType:
        preset.depositType,

      depositValue:
        preset.depositValue,

      depositDueDaysAfterAcceptance:
        preset
          .depositDueDaysAfterAcceptance,

      finalBalanceDueDaysBeforeEvent:
        preset
          .finalBalanceDueDaysBeforeEvent,

      sortOrder:
        preset.sortOrder,
    });
  }

  async function load(
    preferredId = "",
  ) {
    setLoading(true);
    setError("");

    try {
      const next =
        await AdminApiService
          .getCrmPaymentSchedulePresets(
            true,
          );

      setItems(
        next,
      );

      const selected =
        next.find(
          (item) =>
            item.id
            === preferredId,
        )
        || next.find(
          (item) =>
            item.id
            === activeId,
        )
        || next.find(
          (item) =>
            item.default
            && item.status
              === "active",
        )
        || next.find(
          (item) =>
            item.status
            === "active",
        )
        || next[0];

      if (selected) {
        select(
          selected,
        );
      } else {
        setActiveId("");

        setDraft({
          ...EMPTY,
        });
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load payment schedules.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function newSchedule() {
    const nextSortOrder =
      Math.max(
        0,
        ...items.map(
          (item) =>
            item.sortOrder,
        ),
      ) + 10;

    setActiveId("");

    setDraft({
      ...EMPTY,
      sortOrder:
        nextSortOrder,
    });

    setError("");
    setMessage("");
  }

  async function save() {
    if (
      !draft.name
        ?.trim()
    ) {
      setError(
        "Payment schedule name is required.",
      );

      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const saved =
        activeId
          ? await AdminApiService
              .saveCrmPaymentSchedulePreset(
                activeId,
                draft,
              )
          : await AdminApiService
              .createCrmPaymentSchedulePreset(
                draft,
              );

      setMessage(
        activeId
          ? "Payment schedule updated."
          : "Payment schedule created.",
      );

      await load(
        saved.id,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save payment schedule.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function makeDefault(
    preset: CrmPaymentSchedulePreset,
  ) {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await AdminApiService
        .saveCrmPaymentSchedulePreset(
          preset.id,
          {
            default: true,
          },
        );

      setMessage(
        `${preset.name} is now the default payment schedule.`,
      );

      await load(
        preset.id,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to set the default payment schedule.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function archive(
    preset: CrmPaymentSchedulePreset,
  ) {
    if (
      !window.confirm(
        `Archive "${preset.name}"? Existing sent quotes and invoices remain unchanged.`,
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await AdminApiService
        .archiveCrmPaymentSchedulePreset(
          preset.id,
        );

      setMessage(
        "Payment schedule archived.",
      );

      await load();
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Unable to archive payment schedule.",
      );
    } finally {
      setSaving(false);
    }
  }

  const selected =
    items.find(
      (item) =>
        item.id
        === activeId,
    )
    || null;

  const fixedDisplay =
    draft.depositType
      === "fixed"
      ? Number(
          draft.depositValue
          || 0,
        ) / 100
      : 0;

  const percentageDisplay =
    draft.depositType
      === "percentage"
      ? Number(
          draft.depositValue
          || 0,
        ) / 100
      : 0;

  return (
    <AdminPanel
      title="Payment schedule presets"
      compact
      icon={CreditCard}
      actions={
        canManage ? (
          <AdminIconButton
            icon={Plus}
            label="New schedule"
            disabled={saving}
            onClick={
              newSchedule
            }
          />
        ) : undefined
      }
    >
      {error ? (
        <div className="admin-alert admin-alert--error">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="admin-alert admin-alert--success">
          {message}
        </div>
      ) : null}

      {loading ? (
        <p className="text-[10px] text-neutral-500">
          Loading payment schedules…
        </p>
      ) : (
        <div className="crm-payment-presets">
          <div className="crm-payment-presets__list">
            {items.map(
              (preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={
                    `crm-payment-preset-row ${
                      activeId
                        === preset.id
                        ? "is-active"
                        : ""
                    }`
                  }
                  onClick={() =>
                    select(
                      preset,
                    )
                  }
                >
                  <span className="crm-payment-preset-row__main">
                    <strong>
                      {preset.name}
                    </strong>

                    <small>
                      {summary(
                        preset,
                      )}
                      {" · "}
                      balance{" "}
                      {
                        preset
                          .finalBalanceDueDaysBeforeEvent
                      }{" "}
                      days before event
                    </small>
                  </span>

                  <span className="crm-payment-preset-row__status">
                    {preset.default ? (
                      <AdminStatus tone="success">
                        Default
                      </AdminStatus>
                    ) : null}

                    <AdminStatus tone="neutral">
                      {preset.status}
                    </AdminStatus>
                  </span>
                </button>
              ),
            )}

            {!items.length ? (
              <div className="crm-payment-presets__empty">
                No payment schedules yet.
              </div>
            ) : null}
          </div>

          <div className="crm-payment-preset-editor">
            <div className="crm-payment-preset-editor__grid">
              <AdminField label="Schedule name">
                <input
                  className="admin-input"
                  disabled={
                    !canManage
                    || saving
                  }
                  value={
                    draft.name
                    || ""
                  }
                  placeholder="£150 booking fee + balance 30 days before"
                  onChange={(event) =>
                    setDraft(
                      (current) => ({
                        ...current,
                        name:
                          event.target
                            .value,
                      }),
                    )
                  }
                />
              </AdminField>

              <AdminField label="Deposit type">
                <select
                  className="admin-select"
                  disabled={
                    !canManage
                    || saving
                  }
                  value={
                    draft.depositType
                    || "none"
                  }
                  onChange={(event) =>
                    setDraft(
                      (current) => ({
                        ...current,

                        depositType:
                          event.target
                            .value as
                            | "none"
                            | "fixed"
                            | "percentage",

                        depositValue:
                          event.target
                            .value
                            === "none"
                            ? 0
                            : current
                                .depositValue
                                || 0,
                      }),
                    )
                  }
                >
                  <option value="none">
                    No deposit
                  </option>

                  <option value="fixed">
                    Fixed booking fee
                  </option>

                  <option value="percentage">
                    Percentage deposit
                  </option>
                </select>
              </AdminField>

              {draft.depositType
                === "fixed" ? (
                <AdminField label="Deposit (£)">
                  <input
                    className="admin-input"
                    type="number"
                    min="0"
                    step="1"
                    disabled={
                      !canManage
                      || saving
                    }
                    value={
                      fixedDisplay
                    }
                    onChange={(event) =>
                      setDraft(
                        (current) => ({
                          ...current,
                          depositValue:
                            Math.round(
                              Math.max(
                                0,
                                Number(
                                  event.target
                                    .value
                                  || 0,
                                ),
                              ) * 100,
                            ),
                        }),
                      )
                    }
                  />
                </AdminField>
              ) : null}

              {draft.depositType
                === "percentage" ? (
                <AdminField label="Deposit (%)">
                  <input
                    className="admin-input"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    disabled={
                      !canManage
                      || saving
                    }
                    value={
                      percentageDisplay
                    }
                    onChange={(event) =>
                      setDraft(
                        (current) => ({
                          ...current,
                          depositValue:
                            Math.round(
                              Math.min(
                                100,
                                Math.max(
                                  0,
                                  Number(
                                    event.target
                                      .value
                                    || 0,
                                  ),
                                ),
                              ) * 100,
                            ),
                        }),
                      )
                    }
                  />
                </AdminField>
              ) : null}

              <AdminField label="Deposit due after acceptance">
                <div className="crm-payment-preset-editor__days">
                  <input
                    className="admin-input"
                    type="number"
                    min="0"
                    disabled={
                      !canManage
                      || saving
                    }
                    value={
                      draft
                        .depositDueDaysAfterAcceptance
                      || 0
                    }
                    onChange={(event) =>
                      setDraft(
                        (current) => ({
                          ...current,
                          depositDueDaysAfterAcceptance:
                            Math.max(
                              0,
                              Math.round(
                                Number(
                                  event.target
                                    .value
                                  || 0,
                                ),
                              ),
                            ),
                        }),
                      )
                    }
                  />

                  <span>
                    days
                  </span>
                </div>
              </AdminField>

              <AdminField label="Final balance due before event">
                <div className="crm-payment-preset-editor__days">
                  <input
                    className="admin-input"
                    type="number"
                    min="0"
                    disabled={
                      !canManage
                      || saving
                    }
                    value={
                      draft
                        .finalBalanceDueDaysBeforeEvent
                      || 0
                    }
                    onChange={(event) =>
                      setDraft(
                        (current) => ({
                          ...current,
                          finalBalanceDueDaysBeforeEvent:
                            Math.max(
                              0,
                              Math.round(
                                Number(
                                  event.target
                                    .value
                                  || 0,
                                ),
                              ),
                            ),
                        }),
                      )
                    }
                  />

                  <span>
                    days
                  </span>
                </div>
              </AdminField>
            </div>

            <AdminField label="Description">
              <input
                className="admin-input"
                disabled={
                  !canManage
                  || saving
                }
                value={
                  draft.description
                  || ""
                }
                placeholder="Optional internal description"
                onChange={(event) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      description:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </AdminField>

            <label className="crm-payment-preset-editor__default">
              <input
                type="checkbox"
                disabled={
                  !canManage
                  || saving
                  || draft.status
                    === "archived"
                }
                checked={
                  Boolean(
                    draft.default,
                  )
                }
                onChange={(event) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      default:
                        event.target
                          .checked,
                    }),
                  )
                }
              />

              <span>
                Default for new quotes
              </span>
            </label>

            <div className="crm-payment-preset-editor__actions">
              {canManage ? (
                <AdminIconButton
                  icon={Save}
                  label={activeId ? "Save schedule" : "Create schedule"}
                  disabled={
                    saving
                    || !draft.name
                      ?.trim()
                  }
                  onClick={() =>
                    void save()
                  }
                />
              ) : null}

              {canManage
                && selected
                && !selected.default
                && selected.status
                  === "active" ? (
                <AdminIconButton
                  icon={Check}
                  label="Make default"
                  disabled={saving}
                  onClick={() =>
                    void makeDefault(
                      selected,
                    )
                  }
                />
              ) : null}

              {canManage
                && selected
                && selected.status
                  === "active" ? (
                <AdminIconButton
                  icon={Archive}
                  label="Archive"
                  disabled={saving}
                  onClick={() =>
                    void archive(
                      selected,
                    )
                  }
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </AdminPanel>
  );
}
