import { ClientPortalContractSignature } from "./ClientPortalContractSignature";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, Printer } from "lucide-react";

type DocumentKind = "contract" | "invoice";

type ContractSignature = {
  signerName: string;
  signerEmail: string;
  actorType: string;
  signedAt: string;
};

type PortalContract = {
  id: string;
  jobId: string;
  reference: string;
  title: string;
  status: string;
  versionId: string;
  versionNumber: number;
  content: unknown;
  business: Record<string, unknown>;
  client: Record<string, unknown>;
  booking: Record<string, unknown>;
  terms: Record<string, unknown>;
  requiredSignatures: number;
  currentIdentitySigned: boolean;
  signatures: ContractSignature[];
  sentAt: string;
  viewedAt: string;
  signedAt: string;
};

type InvoiceItem = {
  id: string;
  itemType: string;
  name: string;
  description: string;
  quantity: number;
  unitPriceAmount: number;
  lineTotalAmount: number;
  displayOrder: number;
};

type InvoiceScheduleItem = {
  id: string;
  scheduleType: string;
  label: string;
  amount: number;
  dueDate: string;
  displayOrder: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
};

type InvoicePayment = {
  id: string;
  scheduleItemId: string;
  paymentType: string;
  amount: number;
  currency: string;
  method: string;
  reference: string;
  notes: string;
  paidAt: string;
};

type PortalInvoice = {
  id: string;
  jobId: string;
  quoteId: string;
  reference: string;
  status: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  business: Record<string, unknown>;
  client: Record<string, unknown>;
  booking: Record<string, unknown>;
  notes: string;
  terms: string;
  issuedAt: string;
  sentAt: string;
  paidAt: string;
  items: InvoiceItem[];
  schedule: InvoiceScheduleItem[];
  payments: InvoicePayment[];
};

function portalApiPath(path: string) {
  const url = new URL(path, window.location.origin);
  const workspace =
    new URLSearchParams(window.location.search).get("workspace");

  if (workspace) {
    url.searchParams.set("workspace", workspace);
  }

  return `${url.pathname}${url.search}`;
}

async function jsonRequest<T>(path: string): Promise<T> {
  const response = await fetch(
    path,
    {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      body?.error || `Request failed (${response.status}).`,
    );
  }

  return body as T;
}

function money(value: number, currency = "GBP") {
  return new Intl.NumberFormat(
    "en-GB",
    {
      style: "currency",
      currency,
    },
  ).format((value || 0) / 100);
}

function dateLabel(value: string) {
  if (!value) return "—";

  const parsed = new Date(
    value.length <= 10
      ? `${value}T12:00:00`
      : value,
  );

  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );
}

function labelKey(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type SnapshotKind =
  | "business"
  | "client"
  | "booking";

type SnapshotField = {
  key: string;
  label: string;
  sourceKeys: string[];
  format?: (value: string) => string;
};

const CLIENT_SNAPSHOT_FIELDS: Record<
  SnapshotKind,
  SnapshotField[]
> = {
  business: [
    {
      key: "name",
      label: "Name",
      sourceKeys: [
        "businessName",
        "publicName",
        "legalName",
      ],
    },
    {
      key: "email",
      label: "Email",
      sourceKeys: [
        "contactEmail",
        "email",
      ],
    },
    {
      key: "website",
      label: "Website",
      sourceKeys: [
        "websiteUrl",
        "website",
      ],
    },
  ],

  client: [
    {
      key: "name",
      label: "Name",
      sourceKeys: [
        "displayName",
        "name",
      ],
    },
    {
      key: "email",
      label: "Email",
      sourceKeys: [
        "email",
      ],
    },
    {
      key: "phone",
      label: "Phone",
      sourceKeys: [
        "phone",
      ],
    },
  ],

  booking: [
    {
      key: "eventDate",
      label: "Event date",
      sourceKeys: [
        "eventDate",
      ],
      format: dateLabel,
    },
    {
      key: "venue",
      label: "Venue",
      sourceKeys: [
        "venue",
      ],
    },
    {
      key: "package",
      label: "Package",
      sourceKeys: [
        "packageName",
      ],
    },
    {
      key: "service",
      label: "Service",
      sourceKeys: [
        "serviceName",
      ],
    },
  ],
};

function snapshotPrimitive(
  value: Record<string, unknown>,
  sourceKeys: string[],
) {
  for (const sourceKey of sourceKeys) {
    const item = value[sourceKey];

    if (
      item !== null
      && item !== undefined
      && item !== ""
      && [
        "string",
        "number",
        "boolean",
      ].includes(typeof item)
    ) {
      return String(item);
    }
  }

  return "";
}

function snapshotEntries(
  kind: SnapshotKind,
  value: Record<string, unknown>,
) {
  return CLIENT_SNAPSHOT_FIELDS[kind]
    .map((field) => {
      const rawValue =
        snapshotPrimitive(
          value,
          field.sourceKeys,
        );

      if (!rawValue) return null;

      return {
        key: field.key,
        label: field.label,
        value:
          field.format
            ? field.format(rawValue)
            : rawValue,
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        key: string;
        label: string;
        value: string;
      } => Boolean(entry),
    );
}

function contractBlocks(value: unknown) {
  if (typeof value === "string") {
    return value.trim()
      ? [{ heading: "", body: value }]
      : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string") {
        return item.trim()
          ? [{ heading: "", body: item }]
          : [];
      }

      if (!item || typeof item !== "object") return [];

      const record = item as Record<string, unknown>;

      const heading = String(
        record.heading
        || record.title
        || record.name
        || "",
      ).trim();

      const rawBody =
        record.body
        ?? record.text
        ?? record.content
        ?? record.description
        ?? "";

      const body = Array.isArray(rawBody)
        ? rawBody.map(String).join("\n")
        : typeof rawBody === "object" && rawBody
          ? JSON.stringify(rawBody, null, 2)
          : String(rawBody || "");

      return heading || body.trim()
        ? [{ heading, body }]
        : [];
    });
  }

  if (value && typeof value === "object") {
    return Object.entries(
      value as Record<string, unknown>,
    ).flatMap(([key, item]) => {
      if (
        item === null
        || item === undefined
        || item === ""
      ) {
        return [];
      }

      const body = Array.isArray(item)
        ? item.map(String).join("\n")
        : typeof item === "object"
          ? JSON.stringify(item, null, 2)
          : String(item);

      return [{
        heading: labelKey(key),
        body,
      }];
    });
  }

  return [];
}

function SnapshotPanel({
  title,
  kind,
  value,
}: {
  title: string;
  kind: SnapshotKind;
  value: Record<string, unknown>;
}) {
  const entries =
    snapshotEntries(
      kind,
      value,
    );

  if (!entries.length) return null;

  return (
    <section className="client-portal-document__snapshot">
      <h3>{title}</h3>

      <dl>
        {entries.map((entry) => (
          <div key={entry.key}>
            <dt>{entry.label}</dt>
            <dd>{entry.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ContractDocument({
  contract,
}: {
  contract: PortalContract;
}) {
  const blocks = useMemo(
    () => contractBlocks(contract.content),
    [contract.content],
  );

  const complete =
    contract.signatures.length
    >= contract.requiredSignatures;

  return (
    <article className="client-portal-document client-portal-document--contract">
      <header className="client-portal-document__header">
        <div>
          <span>Contract</span>
          <h1>{contract.title || "Your contract"}</h1>
          <p>
            {contract.reference}
            {" · "}
            Version {contract.versionNumber}
          </p>
        </div>

        <strong
          className={
            complete
              ? "client-portal-document__status complete"
              : "client-portal-document__status"
          }
        >
          {contract.status.replace(/_/g, " ")}
        </strong>
      </header>

      <div className="client-portal-document__meta-grid">
        <SnapshotPanel
          title="Business"
          kind="business"
          value={contract.business}
        />
        <SnapshotPanel
          title="Client"
          kind="client"
          value={contract.client}
        />
        <SnapshotPanel
          title="Booking"
          kind="booking"
          value={contract.booking}
        />
      </div>

      <section className="client-portal-contract-content">
        {blocks.length ? blocks.map((block, index) => (
          <div key={`${index}-${block.heading}`}>
            {block.heading ? <h2>{block.heading}</h2> : null}
            {block.body
              .split(/\n{2,}/)
              .filter(Boolean)
              .map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex}>{paragraph}</p>
              ))}
          </div>
        )) : (
          <p>No contract text is available for this version.</p>
        )}
      </section>

      {snapshotEntries(contract.terms).length ? (
        <SnapshotPanel
          title="Contract terms"
          value={contract.terms}
        />
      ) : null}

      <section className="client-portal-document__signatures">
        <div>
          <span>Signatures</span>
          <strong>
            {contract.signatures.length}
            {" of "}
            {contract.requiredSignatures}
            {" recorded"}
          </strong>
        </div>

        {contract.signatures.length ? (
          <div className="client-portal-document__signature-list">
            {contract.signatures.map((signature, index) => (
              <article
                key={`${signature.signerEmail}-${signature.signedAt}-${index}`}
              >
                <CheckCircle2 />
                <div>
                  <strong>
                    {signature.signerName || "Signer"}
                  </strong>
                  <span>
                    {signature.signerEmail}
                    {signature.actorType
                      ? ` · ${signature.actorType}`
                      : ""}
                  </span>
                  <small>
                    Signed {dateLabel(signature.signedAt)}
                  </small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="client-portal-document__notice">
            This contract is awaiting its required signature.
          </p>
        )}
      </section>

      <ClientPortalContractSignature
        contract={contract}
      />
    </article>
  );
}

function InvoiceDocument({
  invoice,
}: {
  invoice: PortalInvoice;
}) {
  return (
    <article className="client-portal-document client-portal-document--invoice">
      <div className="client-portal-document__actions">
        <button
          type="button"
          onClick={() => window.print()}
        >
          <Printer />
          Print / Save PDF
        </button>
      </div>

      <header className="client-portal-document__header">
        <div>
          <span>Invoice</span>
          <h1>{invoice.reference}</h1>
          <p>
            Issued {dateLabel(invoice.issueDate || invoice.issuedAt)}
            {invoice.dueDate
              ? ` · Due ${dateLabel(invoice.dueDate)}`
              : ""}
          </p>
        </div>

        <strong
          className={
            invoice.balanceAmount <= 0
              ? "client-portal-document__status complete"
              : "client-portal-document__status"
          }
        >
          {invoice.status.replace(/_/g, " ")}
        </strong>
      </header>

      <div className="client-portal-document__meta-grid">
        <SnapshotPanel
          title="From"
          kind="business"
          value={invoice.business}
        />
        <SnapshotPanel
          title="Bill to"
          kind="client"
          value={invoice.client}
        />
        <SnapshotPanel
          title="Booking"
          kind="booking"
          value={invoice.booking}
        />
      </div>

      <section className="client-portal-document__section">
        <h2>Invoice items</h2>

        <div className="client-portal-invoice-table">
          <div className="client-portal-invoice-table__head">
            <span>Description</span>
            <span>Qty</span>
            <span>Unit</span>
            <span>Total</span>
          </div>

          {invoice.items.map((item) => (
            <div
              key={item.id}
              className="client-portal-invoice-table__row"
            >
              <span>
                <strong>{item.name}</strong>
                {item.description
                  ? <small>{item.description}</small>
                  : null}
              </span>
              <span>{item.quantity}</span>
              <span>
                {money(
                  item.unitPriceAmount,
                  invoice.currency,
                )}
              </span>
              <span>
                {money(
                  item.lineTotalAmount,
                  invoice.currency,
                )}
              </span>
            </div>
          ))}
        </div>

        <dl className="client-portal-invoice-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>
              {money(
                invoice.subtotalAmount,
                invoice.currency,
              )}
            </dd>
          </div>

          {invoice.discountAmount ? (
            <div>
              <dt>Discount</dt>
              <dd>
                −
                {money(
                  invoice.discountAmount,
                  invoice.currency,
                )}
              </dd>
            </div>
          ) : null}

          {invoice.taxAmount ? (
            <div>
              <dt>Tax</dt>
              <dd>
                {money(
                  invoice.taxAmount,
                  invoice.currency,
                )}
              </dd>
            </div>
          ) : null}

          <div className="total">
            <dt>Total</dt>
            <dd>
              {money(
                invoice.totalAmount,
                invoice.currency,
              )}
            </dd>
          </div>

          <div>
            <dt>Paid</dt>
            <dd>
              {money(
                invoice.paidAmount,
                invoice.currency,
              )}
            </dd>
          </div>

          <div className="balance">
            <dt>Balance</dt>
            <dd>
              {money(
                invoice.balanceAmount,
                invoice.currency,
              )}
            </dd>
          </div>
        </dl>
      </section>

      {invoice.schedule.length ? (
        <section className="client-portal-document__section">
          <h2>Payment schedule</h2>

          <div className="client-portal-payment-schedule">
            {invoice.schedule.map((item) => (
              <article
                key={item.id}
                className={`client-portal-payment-schedule__item client-portal-payment-schedule__item--${item.status}`}
              >
                <div>
                  <strong>{item.label}</strong>
                  <span>
                    {item.scheduleType.replace(/_/g, " ")}
                    {item.dueDate
                      ? ` · ${dateLabel(item.dueDate)}`
                      : ""}
                  </span>
                </div>

                <div>
                  <strong>
                    {money(
                      item.amount,
                      invoice.currency,
                    )}
                  </strong>
                  <span>
                    {item.balanceAmount <= 0
                      ? "Paid"
                      : `${money(
                          item.balanceAmount,
                          invoice.currency,
                        )} remaining`}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {invoice.payments.length ? (
        <section className="client-portal-document__section">
          <h2>Payment history</h2>

          <div className="client-portal-payment-history">
            {invoice.payments.map((payment) => (
              <article key={payment.id}>
                <div>
                  <strong>
                    {payment.paymentType === "refund"
                      ? "Refund"
                      : "Payment"}
                  </strong>
                  <span>
                    {payment.method.replace(/_/g, " ")}
                    {payment.reference
                      ? ` · ${payment.reference}`
                      : ""}
                  </span>
                </div>

                <div>
                  <strong>
                    {money(
                      payment.amount,
                      payment.currency,
                    )}
                  </strong>
                  <span>{dateLabel(payment.paidAt)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {invoice.notes || invoice.terms ? (
        <section className="client-portal-document__notes">
          {invoice.notes ? (
            <div>
              <h3>Notes</h3>
              <p>{invoice.notes}</p>
            </div>
          ) : null}

          {invoice.terms ? (
            <div>
              <h3>Terms</h3>
              <p>{invoice.terms}</p>
            </div>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}

export function ClientPortalCommercialDocument({
  kind,
  id,
}: {
  kind: DocumentKind;
  id: string;
}) {
  const [data, setData] = useState<
    PortalContract | PortalInvoice | null
  >(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (!id) {
      setData(null);
      setError("");
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setData(null);
    setError("");
    setLoading(true);

    const endpoint =
      kind === "contract"
        ? `/api/public/client-portal/contracts/${encodeURIComponent(id)}`
        : `/api/public/client-portal/invoices/${encodeURIComponent(id)}`;

    jsonRequest<{
      ok: true;
      contract?: PortalContract;
      invoice?: PortalInvoice;
    }>(portalApiPath(endpoint))
      .then((result) => {
        if (cancelled) return;

        setData(
          kind === "contract"
            ? result.contract || null
            : result.invoice || null,
        );
      })
      .catch((loadError) => {
        if (cancelled) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : `Unable to load ${kind}.`,
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, kind]);

  if (!id) {
    return (
      <section className="client-portal-document-empty">
        <FileText />
        <h1>
          Choose a {kind}
        </h1>
        <p>
          Select a document from the list to view its details.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <div className="client-portal-loading">
        Loading {kind}…
      </div>
    );
  }

  if (error) {
    return (
      <div className="client-portal-alert client-portal-alert--error">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <section className="client-portal-document-empty">
        <FileText />
        <h1>{kind} unavailable</h1>
        <p>
          This document is not currently available in your portal.
        </p>
      </section>
    );
  }

  return kind === "contract"
    ? <ContractDocument contract={data as PortalContract} />
    : <InvoiceDocument invoice={data as PortalInvoice} />;
}
