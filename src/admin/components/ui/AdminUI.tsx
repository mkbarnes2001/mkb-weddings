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
  return (
    <header className={cx("admin-page-header", className)}>
      <div className="admin-page-header__content">
        {eyebrow ? <div className="admin-eyebrow">{eyebrow}</div> : null}
        <h1 className="admin-page-title">{title}</h1>
        {description ? <p className="admin-page-description">{description}</p> : null}
        {meta ? <div className="admin-page-meta">{meta}</div> : null}
      </div>
      {actions ? <div className="admin-page-actions">{actions}</div> : null}
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
