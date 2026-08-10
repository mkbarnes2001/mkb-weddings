import {
  useState,
} from "react";
import {
  Banknote,
} from "lucide-react";

import {
  AdminButton,
  AdminField,
  AdminPanel,
} from "./ui/AdminUI";

import {
  AdminApiService,
} from "../services/AdminApiService";


function money(
  minor: number,
  currency = "GBP",
) {
  return new Intl.NumberFormat(
    "en-GB",
    {
      style: "currency",
      currency,
    },
  ).format(
    (Number(minor) || 0) / 100,
  );
}


function today() {
  return new Date()
    .toISOString()
    .slice(
      0,
      10,
    );
}


export function CrmInvoicePaymentForm({
  jobId,
  invoice,
  canManage,
  onSaved,
  onError,
}: {
  jobId: string;
  invoice: any;
  canManage: boolean;
  onSaved: (
    workspace: any,
    message: string,
  ) => void;
  onError: (
    message: string,
  ) => void;
}) {
  const [
    paymentType,
    setPaymentType,
  ] = useState<
    "payment" | "refund"
  >("payment");

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    method,
    setMethod,
  ] = useState<
    | "manual"
    | "bank_transfer"
    | "cash"
    | "card"
    | "other"
  >("bank_transfer");

  const [
    paidAt,
    setPaidAt,
  ] = useState(
    today(),
  );

  const [
    reference,
    setReference,
  ] = useState("");

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  const status = String(
    invoice?.status || "",
  );

  if (
    ![
      "issued",
      "part_paid",
      "paid",
    ].includes(
      status,
    )
  ) {
    return null;
  }

  const currency = String(
    invoice?.currency || "GBP",
  );

  const paidAmount =
    Math.max(
      0,
      Number(
        invoice?.paidAmount || 0,
      ),
    );

  const balanceAmount =
    Math.max(
      0,
      Number(
        invoice?.balanceAmount || 0,
      ),
    );

  const maximumMinor =
    paymentType === "refund"
      ? paidAmount
      : balanceAmount;

  async function submit() {
    const pounds = Number(
      amount,
    );

    const minor =
      Math.round(
        pounds * 100,
      );

    if (
      !Number.isFinite(
        pounds,
      )
      || pounds <= 0
      || minor <= 0
    ) {
      onError(
        "Enter an amount greater than zero.",
      );
      return;
    }

    if (
      Math.abs(
        pounds * 100
        - minor,
      ) > 0.001
    ) {
      onError(
        "Enter no more than two decimal places.",
      );
      return;
    }

    if (
      minor > maximumMinor
    ) {
      onError(
        paymentType === "refund"
          ? "Refund exceeds the amount currently paid."
          : "Payment exceeds the outstanding invoice balance.",
      );
      return;
    }

    if (
      paymentType === "refund"
      && !window.confirm(
        `Record a ${money(
          minor,
          currency,
        )} refund against invoice ${invoice.reference}?`,
      )
    ) {
      return;
    }

    setSaving(true);
    onError("");

    try {
      const result =
        await AdminApiService
          .recordCrmInvoicePayment(
            jobId,
            String(
              invoice.id,
            ),
            {
              paymentType,
              amount:
                minor,
              method,
              paidAt,
              reference:
                reference.trim(),
              notes:
                notes.trim(),
            },
          );

      setAmount("");
      setReference("");
      setNotes("");

      onSaved(
        result.workspace,
        paymentType === "refund"
          ? "Refund recorded."
          : "Manual payment recorded.",
      );
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Unable to record invoice payment.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPanel
      title="Record manual payment"
      description={
        `Invoice ${invoice.reference} · `
        + `${money(
          balanceAmount,
          currency,
        )} outstanding · `
        + `${money(
          paidAmount,
          currency,
        )} recorded. `
        + "Payments are allocated automatically against the payment schedule."
      }
      icon={Banknote}
      compact
    >
      <div
        className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
      >
        <AdminField label="Action">
          <select
            className="admin-select"
            value={paymentType}
            disabled={
              saving
              || !canManage
            }
            onChange={(event) => {
              setPaymentType(
                event.target.value
                  === "refund"
                  ? "refund"
                  : "payment",
              );

              setAmount("");
            }}
          >
            <option value="payment">
              Payment
            </option>

            <option
              value="refund"
              disabled={
                paidAmount <= 0
              }
            >
              Refund
            </option>
          </select>
        </AdminField>

        <AdminField
          label={`Amount (${currency})`}
          help={
            paymentType === "refund"
              ? `Maximum refund ${money(
                  maximumMinor,
                  currency,
                )}`
              : `Maximum payment ${money(
                  maximumMinor,
                  currency,
                )}`
          }
        >
          <input
            className="admin-input"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            disabled={
              saving
              || !canManage
              || maximumMinor <= 0
            }
            placeholder="0.00"
            onChange={(event) =>
              setAmount(
                event.target.value,
              )
            }
          />
        </AdminField>

        <AdminField label="Method">
          <select
            className="admin-select"
            value={method}
            disabled={
              saving
              || !canManage
            }
            onChange={(event) =>
              setMethod(
                event.target.value as
                  | "manual"
                  | "bank_transfer"
                  | "cash"
                  | "card"
                  | "other",
              )
            }
          >
            <option value="bank_transfer">
              Bank transfer
            </option>

            <option value="cash">
              Cash
            </option>

            <option value="card">
              Card taken offline
            </option>

            <option value="manual">
              Manual
            </option>

            <option value="other">
              Other
            </option>
          </select>
        </AdminField>

        <AdminField label="Date">
          <input
            className="admin-input"
            type="date"
            value={paidAt}
            disabled={
              saving
              || !canManage
            }
            onChange={(event) =>
              setPaidAt(
                event.target.value,
              )
            }
          />
        </AdminField>

        <AdminField label="Reference">
          <input
            className="admin-input"
            value={reference}
            maxLength={160}
            disabled={
              saving
              || !canManage
            }
            placeholder="Bank reference, receipt…"
            onChange={(event) =>
              setReference(
                event.target.value,
              )
            }
          />
        </AdminField>

        <AdminField label="Internal note">
          <input
            className="admin-input"
            value={notes}
            maxLength={1000}
            disabled={
              saving
              || !canManage
            }
            onChange={(event) =>
              setNotes(
                event.target.value,
              )
            }
          />
        </AdminField>
      </div>

      <div
        className="mt-4 flex flex-wrap items-center justify-between gap-3"
      >
        <p
          className="text-[9px] text-neutral-500"
        >
          Offline record only · this does not charge
          the client or contact a payment provider.
        </p>

        <AdminButton
          variant="primary"
          size="sm"
          icon={Banknote}
          disabled={
            saving
            || !canManage
            || !amount
            || maximumMinor <= 0
          }
          onClick={() =>
            void submit()
          }
        >
          {saving
            ? "Recording…"
            : paymentType === "refund"
              ? "Record refund"
              : "Record payment"}
        </AdminButton>
      </div>
    </AdminPanel>
  );
}
