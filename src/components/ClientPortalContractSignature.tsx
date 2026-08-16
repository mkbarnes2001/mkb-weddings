import {
  useEffect,
  useState,
} from "react";
import {
  CheckCircle2,
  PenLine,
} from "lucide-react";

const CONSENT_TEXT =
  "I confirm this electronic signature represents my agreement to this contract.";

function portalApiPath(
  path: string,
) {
  const url = new URL(
    path,
    window.location.origin,
  );

  const workspace =
    new URLSearchParams(
      window.location.search,
    ).get("workspace");

  if (workspace) {
    url.searchParams.set(
      "workspace",
      workspace,
    );
  }

  return `${url.pathname}${url.search}`;
}

function snapshotName(
  client: Record<string, unknown>,
) {
  const direct = String(
    client?.displayName
    || client?.name
    || client?.clientName
    || "",
  ).trim();

  if (direct) return direct;

  return [
    client?.firstName,
    client?.lastName,
  ]
    .map((value) =>
      String(value || "").trim()
    )
    .filter(Boolean)
    .join(" ");
}

export function ClientPortalContractSignature({
  contract,
}: {
  contract: any;
}) {
  const [signerName, setSignerName] =
    useState("");
  const [
    signatureText,
    setSignatureText,
  ] = useState("");
  const [confirmed, setConfirmed] =
    useState(false);
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState("");

  const status = String(
    contract?.status || "",
  );

  const currentIdentitySigned =
    Boolean(
      contract?.currentIdentitySigned,
    );

  useEffect(() => {
    setSignerName(
      snapshotName(
        contract?.client || {},
      )
    );
    setSignatureText("");
    setConfirmed(false);
    setError("");
  }, [contract?.id]);

  if (currentIdentitySigned) {
    return (
      <section
        className="client-portal-signature-form client-portal-signature-form--complete"
      >
        <CheckCircle2 />
        <div>
          <strong>
            Your signature is recorded
          </strong>
          <p>
            {status === "signed"
              ? "The required contract signatures are complete."
              : "This contract is waiting for any remaining required signatures."}
          </p>
        </div>
      </section>
    );
  }

  if (
    !["sent", "viewed"].includes(
      status,
    )
  ) {
    return null;
  }

  async function signContract() {
    const name =
      signerName.trim();
    const signature =
      signatureText.trim();

    if (!name) {
      setError(
        "Enter your full name."
      );
      return;
    }

    if (!signature) {
      setError(
        "Enter your electronic signature."
      );
      return;
    }

    if (!confirmed) {
      setError(
        "Confirm your agreement before signing."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        portalApiPath(
          `/api/public/client-portal/contracts/${encodeURIComponent(
            String(
              contract?.id || "",
            ),
          )}`,
        ),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            signerName: name,
            signatureText: signature,
            confirmed: true,
          }),
        },
      );

      const result: any =
        await response.json().catch(
          () => ({}),
        );

      if (!response.ok) {
        throw new Error(
          result?.error
          || "Unable to sign contract.",
        );
      }

      window.sessionStorage.setItem(
        "wedplanned:booking-next",
        JSON.stringify({
          jobId:
            String(
              contract?.jobId
              || "",
            ),
        }),
      );

      window.location.reload();
    } catch (signError) {
      setError(
        signError instanceof Error
          ? signError.message
          : "Unable to sign contract.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="client-portal-signature-form"
      aria-label="Sign contract"
    >
      <header>
        <PenLine />
        <div>
          <span>
            Electronic signature
          </span>
          <h3>
            Sign this contract
          </h3>
        </div>
      </header>

      {error ? (
        <div
          className="client-portal-signature-form__error"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div
        className="client-portal-signature-form__fields"
      >
        <label>
          <span>Full name</span>
          <input
            value={signerName}
            maxLength={120}
            autoComplete="name"
            disabled={saving}
            onChange={(event) =>
              setSignerName(
                event.target.value,
              )
            }
          />
        </label>

        <label>
          <span>
            Type your signature
          </span>
          <input
            value={signatureText}
            maxLength={240}
            disabled={saving}
            onChange={(event) =>
              setSignatureText(
                event.target.value,
              )
            }
          />
        </label>
      </div>

      <label
        className="client-portal-signature-form__consent"
      >
        <input
          type="checkbox"
          checked={confirmed}
          disabled={saving}
          onChange={(event) =>
            setConfirmed(
              event.target.checked,
            )
          }
        />
        <span>{CONSENT_TEXT}</span>
      </label>

      <div
        className="client-portal-signature-form__actions"
      >
        <button
          type="button"
          disabled={
            saving
            || !signerName.trim()
            || !signatureText.trim()
            || !confirmed
          }
          onClick={() =>
            void signContract()
          }
        >
          {saving
            ? "Signing…"
            : "Sign contract"}
        </button>
      </div>
    </section>
  );
}
