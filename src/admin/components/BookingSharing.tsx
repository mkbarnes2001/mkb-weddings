import { useRef, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import {
  AdminActionButton as Action,
  AdminActionLink as ActionLink,
} from "./ui/AdminActionControl";
import { bookingWebsiteButton } from "../../../shared/online-booking";

export function BookingSharing({
  url,
  available,
  issue,
}: {
  url: string;
  available: boolean;
  issue: string;
}) {
  const [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [buttonText, setButtonText] = useState("Book now");
  const link = useRef<HTMLInputElement>(null),
    code = useRef<HTMLTextAreaElement>(null),
    details = useRef<HTMLDetailsElement>(null);
  let html = "",
    sharingIssue = issue;
  try {
    if (url) html = bookingWebsiteButton(url, buttonText);
  } catch {
    sharingIssue = "The public booking address needs deployment setup.";
  }
  const ready = available && Boolean(url) && !sharingIssue;
  async function copy(website = false) {
    if (!ready) return;
    setNotice("");
    setError("");
    try {
      await navigator.clipboard.writeText(website ? html : url);
      setNotice(
        website ? "Website button code copied." : "Booking link copied.",
      );
    } catch {
      if (website && details.current) details.current.open = true;
      const field = website ? code.current : link.current;
      field?.focus();
      field?.select();
      setError("Copy the selected text to your clipboard.");
    }
  }
  return (
    <section className="ob-panel ob-sharing" aria-label="Share booking page">
      <div className="ob-section-heading">
        <h2>Share booking page</h2>
      </div>
      {sharingIssue && (
        <p className="ob-message" role="status">
          {sharingIssue}
        </p>
      )}
      {!sharingIssue && !available && (
        <p className="ob-message">
          Save your changes and enable bookings to share this page.
        </p>
      )}
      <div className="ob-sharing-grid">
        <div className="ob-sharing-option">
          <h3>Direct booking link</h3>
          <div className="ob-sharing-link">
            <input
              ref={link}
              aria-label="Direct booking link"
              readOnly
              value={ready ? url : ""}
              placeholder="Available when bookings are enabled"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Action icon={Copy} disabled={!ready} onClick={() => copy()}>
              Copy booking link
            </Action>
            <ActionLink
              href={ready ? url : undefined}
              icon={ExternalLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!ready}
              onClick={(e) => {
                if (!ready) e.preventDefault();
              }}
            >
              Preview booking page
            </ActionLink>
          </div>
          <p>
            Share with clients by message, email or social media. No Admin login
            needed.
          </p>
        </div>
        <div className="ob-sharing-option">
          <h3>Your website</h3>
          <p>
            Use the booking link for your website’s <strong>Book now</strong>{" "}
            button, or redirect a page such as <strong>/book</strong> to it.
          </p>
          <details ref={details}>
            <summary>Website button code</summary>
            <label className="ob-field">
              <span>Button text</span>
              <input
                value={buttonText}
                maxLength={80}
                onChange={(e) => setButtonText(e.target.value)}
              />
            </label>
            <div className="ob-section-heading">
              <label htmlFor="ob-website-button-code">
                HTML for your website
              </label>
              <Action icon={Copy} disabled={!ready} onClick={() => copy(true)}>
                Copy website button code
              </Action>
            </div>
            <textarea
              ref={code}
              id="ob-website-button-code"
              readOnly
              rows={4}
              value={ready ? html : ""}
              placeholder="Available when bookings are enabled"
              onFocus={(e) => e.currentTarget.select()}
            />
          </details>
        </div>
      </div>
      {notice && ready && (
        <p className="ob-message" role="status">
          {notice}
        </p>
      )}
      {error && ready && (
        <p className="ob-message" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
