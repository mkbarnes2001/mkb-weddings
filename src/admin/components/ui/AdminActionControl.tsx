import { Children, forwardRef, isValidElement, type ReactNode, type ReactElement, type ButtonHTMLAttributes, type AnchorHTMLAttributes, type LabelHTMLAttributes, type ComponentProps } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, X, Plus, Save, Search, RefreshCw, Trash2, Upload, Download, type LucideIcon } from "lucide-react";
import { inferAdminActionKey, resolveAdminActionIcon } from "../../config/adminActionIcons";
import type { PlatformBrandingIdentity } from "../../types/platform";

export function actionText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  return Children.toArray(node).map(child => typeof child === "string" || typeof child === "number" ? String(child) : isValidElement(child) ? actionText((child.props as {children?: ReactNode}).children) : "").join(" ").replace(/\s+/g, " ").trim();
}

function childIcon(node: ReactNode): ReactElement | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement(child)) continue;
    const props = child.props as {children?: ReactNode; className?: string};
    if (child.type === "svg" || (typeof child.type !== "string" && !props.children)) return child;
    const nested = props.children ? childIcon(props.children) : undefined;
    if (nested) return nested;
  }
}

const actionIcons: Array<[RegExp, LucideIcon]> = [
  [/^(back|return|previous)\b/i, ArrowLeft], [/^(next|continue)\b/i, ArrowRight],
  [/^(cancel|close|dismiss)\b/i, X], [/^(new|add|create)\b/i, Plus],
  [/^(save|saving|saved)\b/i, Save], [/^(delete|remove|clear)\b/i, Trash2],
  [/^(search|find)\b/i, Search], [/^(refresh|retry|reload|sync)\b/i, RefreshCw],
  [/^(upload|import)\b/i, Upload], [/^(download|export)\b/i, Download],
  [/^(apply|confirm|complete|approve|accept|select|recommend)\b/i, Check],
];

type ActionProps = { children?: ReactNode; icon?: LucideIcon; "aria-label"?: string; title?: string; className?: string; "data-admin-tooltip"?: string; "data-admin-action"?: string };
function useAction({children, icon: Icon, ...props}: ActionProps) {
  const context = useOutletContext<{platformIdentity?: PlatformBrandingIdentity}>();
  const label = props["aria-label"] || actionText(children) || props.title || "Action";
  const action = props["data-admin-action"] || inferAdminActionKey(label);
  const overrides = context?.platformIdentity?.adminActionIcons || {};
  const FallbackIcon = overrides[action] ? resolveAdminActionIcon(action, overrides) : actionIcons.find(([pattern]) => pattern.test(label))?.[1] || resolveAdminActionIcon(action, overrides);
  const glyph = overrides[action] ? <FallbackIcon /> : Icon ? <Icon /> : childIcon(children) || <FallbackIcon />;
  return {
    label,
    tooltip: props.title || props["data-admin-tooltip"] || label,
    className: [props.className, "admin-square-action"].filter(Boolean).join(" "),
    content: <><span className="admin-square-action__glyph" aria-hidden="true">{glyph}</span><span className="admin-square-action__text" aria-hidden="true">{children}</span></>,
  };
}

export const AdminActionButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {icon?: LucideIcon}>(function AdminActionButton({children, icon, ...props}, ref) {
  const action = useAction({...props, children, icon});
  return <button {...props} ref={ref} title={undefined} aria-label={action.label} data-admin-tooltip={action.tooltip} className={action.className}>{action.content}</button>;
});

export const AdminActionLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & {icon?: LucideIcon}>(function AdminActionLink({children, icon, ...props}, ref) {
  const action = useAction({...props, children, icon});
  return <a {...props} ref={ref} title={undefined} aria-label={action.label} data-admin-tooltip={action.tooltip} className={action.className}>{action.content}</a>;
});

export const AdminActionRouterLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof Link> & {icon?: LucideIcon}>(function AdminActionRouterLink({children, icon, ...props}, ref) {
  const action = useAction({...props, children, icon});
  return <Link {...props} ref={ref} title={undefined} aria-label={action.label} data-admin-tooltip={action.tooltip} className={action.className}>{action.content}</Link>;
});

// Native summary keeps pointer and keyboard disclosure behaviour for toolbar menus.
export function AdminActionSummary({children, icon, ...props}: ComponentProps<"summary"> & {icon?: LucideIcon}) {
  const action = useAction({...props, children, icon});
  return <summary {...props} title={undefined} aria-label={action.label} data-admin-tooltip={action.tooltip} className={action.className}>{action.content}</summary>;
}

// Keep native file-input label activation, including keyboard activation.
export function AdminActionLabel({children, icon, ...props}: LabelHTMLAttributes<HTMLLabelElement> & {icon?: LucideIcon}) {
  const action = useAction({...props, children, icon});
  return <label {...props} title={undefined} aria-label={action.label} data-admin-tooltip={action.tooltip} className={action.className} role="button" tabIndex={0} onKeyDown={event => {
    props.onKeyDown?.(event);
    if (!event.defaultPrevented && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      (event.currentTarget.control as HTMLInputElement | null)?.click();
    }
  }}>{action.content}</label>;
}
