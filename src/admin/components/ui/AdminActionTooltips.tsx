import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";

type Tip = { label: string; target: HTMLElement };

// One floating layer serves shared and legacy actions, including disabled buttons.
// It lives outside panels so overflow and scrolling cannot clip the label.
export function AdminActionTooltips() {
  const location = useLocation();
  const [tip, setTip] = useState<Tip | null>(null);
  const [position, setPosition] = useState({left: 0, top: 0});
  const tooltip = useRef<HTMLDivElement>(null);
  const dismiss = useRef<() => void>(() => {});

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current: HTMLElement | null = null;
    const clear = () => { clearTimeout(timer); timer = undefined; };
    const hide = () => { clear(); current = null; setTip(null); };
    dismiss.current = hide;
    const control = (target: EventTarget | null) => target instanceof Element ? target.closest<HTMLElement>('.admin-shell [data-admin-tooltip]') : null;
    const show = (target: HTMLElement, delay: number) => {
      clear(); current = target;
      timer = setTimeout(() => {
        const label = target.dataset.adminTooltip;
        if (target.isConnected && label) setTip({label, target});
      }, delay);
    };
    const over = (event: PointerEvent) => {
      if (tooltip.current?.contains(event.target as Node)) { clear(); return; }
      const target = control(event.target);
      if (target && target !== current) show(target, event.pointerType === "touch" ? 0 : 250);
    };
    const out = (event: PointerEvent) => {
      const next = event.relatedTarget;
      if (next instanceof Node && (current?.contains(next) || tooltip.current?.contains(next))) return;
      if (control(event.target) || tooltip.current?.contains(event.target as Node)) { clear(); timer = setTimeout(hide, 120); }
    };
    const focus = (event: FocusEvent) => { const target = control(event.target); if (target) show(target, 0); };
    const blur = (event: FocusEvent) => { if (control(event.target)) hide(); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") hide(); };
    document.addEventListener("pointerover", over, true);
    document.addEventListener("pointerout", out, true);
    document.addEventListener("focusin", focus, true);
    document.addEventListener("focusout", blur, true);
    document.addEventListener("keydown", key, true);
    document.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      hide();
      document.removeEventListener("pointerover", over, true);
      document.removeEventListener("pointerout", out, true);
      document.removeEventListener("focusin", focus, true);
      document.removeEventListener("focusout", blur, true);
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, []);

  useEffect(() => { dismiss.current(); }, [location.pathname, location.search]);
  useLayoutEffect(() => {
    if (!tip || !tooltip.current) return;
    const anchor = tip.target.getBoundingClientRect();
    const box = tooltip.current.getBoundingClientRect();
    const top = anchor.bottom + box.height + 10 < window.innerHeight ? anchor.bottom + 7 : anchor.top - box.height - 7;
    setPosition({left: Math.max(8, Math.min(anchor.left + (anchor.width - box.width) / 2, window.innerWidth - box.width - 8)), top: Math.max(8, top)});
  }, [tip]);

  return tip ? createPortal(<div ref={tooltip} role="tooltip" className="admin-floating-action-tooltip" style={position}>{tip.label}</div>, document.body) : null;
}
