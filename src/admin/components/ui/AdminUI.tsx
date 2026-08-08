import { useOutletContext } from "react-router-dom";
import type {
  PlatformBrandingIdentity,
  PlatformModuleConfiguration,
} from "../../types/platform";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function AdminPage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cx("admin-page", className)}>{children}</div>;
}

export function AdminModuleWordmark({
  label,
  trailing,
  className = "",
}: {
  label: string;
  trailing?: string;
  className?: string;
}) {
  const isCompactLabel = label.startsWith("W.");
  const moduleName = label.startsWith("Wed")
    ? label.slice(3)
    : label;

  const accessibleLabel = trailing
    ? `${label} ${trailing}`
    : label;

  return (
    <span
      className={cx("admin-module-wordmark", className)}
      aria-label={accessibleLabel}
    >
      {isCompactLabel ? (
        <span className="admin-module-wordmark__name" aria-hidden="true">
          {moduleName}
        </span>
      ) : (
        <>
          <span className="admin-module-wordmark__wed" aria-hidden="true">
            Wed
          </span>
          <span className="admin-module-wordmark__name" aria-hidden="true">
            {moduleName}
          </span>
        </>
      )}
      {trailing ? (
        <span
          className="admin-module-wordmark__trailing"
          aria-hidden="true"
        >
          {trailing}
        </span>
      ) : null}
    </span>
  );
}

export function AdminModulePageWordmark({
  label,
  trailing,
}: {
  label: string;
  trailing?: string;
}) {
  const { moduleAppearance } = useOutletContext<{
    moduleAppearance?: PlatformModuleConfiguration;
  }>();

  const source = moduleAppearance?.wordmarkUrl || "";

  if (!source) {
    return (
      <AdminModuleWordmark
        label={label}
        trailing={trailing}
      />
    );
  }

  return (
    <span className="admin-module-page-wordmark">
      <img
        src={source}
        alt={label}
        className="admin-module-page-wordmark__asset"
      />
      {trailing ? (
        <span className="admin-module-page-wordmark__trailing">
          {trailing}
        </span>
      ) : null}
    </span>
  );
}


type AdminPageHeaderOutletContext = {
  moduleAppearance?: PlatformModuleConfiguration;
  moduleLabel?: string;
  platformIdentity?: PlatformBrandingIdentity;
  isPlatformRoute?: boolean;
};

function AdminPageHeaderIdentity() {
  const {
    moduleAppearance,
    moduleLabel,
    platformIdentity,
    isPlatformRoute,
  } = useOutletContext<AdminPageHeaderOutletContext>();

  if (isPlatformRoute) {
    const label = platformIdentity?.platformName || "WedPlanned";
    const source =
      platformIdentity?.wordmarkUrl
      || platformIdentity?.compactWordmarkUrl
      || platformIdentity?.iconUrl
      || "";

    return source ? (
      <img
        src={source}
        alt={label}
        className="admin-page-header__identity-asset"
      />
    ) : (
      <AdminModuleWordmark
        label={label}
        className="admin-page-header__identity-fallback"
      />
    );
  }

  const label = moduleLabel || "WedPlanned";
  const source = moduleAppearance?.wordmarkUrl || "";

  return source ? (
    <img
      src={source}
      alt={label}
      className="admin-page-header__identity-asset"
    />
  ) : (
    <AdminModuleWordmark
      label={label}
      className="admin-page-header__identity-fallback"
    />
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className = "",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  const backControl =
    eyebrow && typeof eyebrow !== "string"
      ? eyebrow
      : null;

  return (
    <header className={cx("admin-page-header", className)}>
      <div className="admin-page-header__brand">
        <AdminPageHeaderIdentity />
      </div>

      <div className="admin-page-header__content">
        {backControl ? (
          <div className="admin-page-header__back">
            {backControl}
          </div>
        ) : null}

        <h1 className="admin-page-title">{title}</h1>

        {description ? (
          <p className="admin-page-description">
            {description}
          </p>
        ) : null}
      </div>

      {meta ? (
        <div className="admin-page-summary admin-page-meta">
          {meta}
        </div>
      ) : null}

      {actions ? (
        <div className="admin-page-actions">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export function AdminPanel({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className = "",
  compact = false,
}: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <section className={cx("admin-panel", compact && "admin-panel--compact", className)}>
      {title || description || Icon || actions ? (
        <div className="admin-panel__header">
          <div className="admin-panel__heading">
            {Icon ? (
              <span className="admin-panel__icon" aria-hidden="true">
                <Icon size={15} />
              </span>
            ) : null}
            <div>
              {title ? <h2 className="admin-panel__title">{title}</h2> : null}
              {description ? <p className="admin-panel__description">{description}</p> : null}
            </div>
          </div>
          {actions ? <div className="admin-panel__actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className="admin-panel__body">{children}</div>
    </section>
  );
}

export function AdminToolbar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cx("admin-toolbar", className)}>{children}</div>;
}

export function AdminButton({
  variant = "secondary",
  size = "md",
  icon: Icon,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  icon?: LucideIcon;
}) {
  return (
    <button
      {...props}
      className={cx("admin-button", `admin-button--${variant}`, `admin-button--${size}`, className)}
    >
      {Icon ? <Icon className="admin-button__icon" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function AdminLinkButton({
  variant = "secondary",
  size = "md",
  icon: Icon,
  children,
  className = "",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  icon?: LucideIcon;
}) {
  return (
    <a
      {...props}
      className={cx("admin-button", `admin-button--${variant}`, `admin-button--${size}`, className)}
    >
      {Icon ? <Icon className="admin-button__icon" aria-hidden="true" /> : null}
      {children}
    </a>
  );
}

export function AdminIconButton({
  icon: Icon,
  label,
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  variant?: "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      {...props}
      type={props.type || "button"}
      aria-label={label}
      title={props.title || label}
      className={cx("admin-icon-control", `admin-icon-control--${variant}`, className)}
    >
      <Icon aria-hidden="true" />
    </button>
  );
}

export function AdminTabs({ children, className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cx("admin-tabs", className)}>{children}</div>;
}

export function AdminTab({ active, children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...props}
      type={props.type || "button"}
      className={cx("admin-tab", active && "admin-tab--active", className)}
    >
      {children}
    </button>
  );
}

export function AdminStatus({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  children: ReactNode;
  className?: string;
}) {
  return <span className={cx("admin-status", `admin-status--${tone}`, className)}>{children}</span>;
}

export function AdminField({
  label,
  help,
  children,
  className = "",
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & {
  label: ReactNode;
  help?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label {...props} className={cx("admin-field", className)}>
      <span className="admin-field__label">{label}</span>
      {children}
      {help ? <span className="admin-field__help">{help}</span> : null}
    </label>
  );
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="admin-empty-state">
      {Icon ? <span className="admin-empty-state__icon"><Icon aria-hidden="true" /></span> : null}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="admin-empty-state__action">{action}</div> : null}
    </div>
  );
}

export function AdminAccordion({
  title,
  description,
  icon: Icon,
  summary,
  children,
  defaultOpen = false,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  summary?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details className={cx("admin-accordion", className)} open={defaultOpen || undefined}>
      <summary className="admin-accordion__summary">
        <span className="admin-accordion__heading">
          {Icon ? <span className="admin-accordion__icon" aria-hidden="true"><Icon /></span> : null}
          <span><strong>{title}</strong>{description ? <small>{description}</small> : null}</span>
        </span>
        <span className="admin-accordion__meta">{summary}<span className="admin-accordion__chevron" aria-hidden="true"></span></span>
      </summary>
      <div className="admin-accordion__body">{children}</div>
    </details>
  );
}
