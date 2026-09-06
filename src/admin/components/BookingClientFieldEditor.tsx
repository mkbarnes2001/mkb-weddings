import { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import { AdminActionButton as Action } from "./ui/AdminActionControl";
import { BookingField } from "../pages/CRMOnlineBooking";
import type { BookingFieldDefinition } from "../../../shared/online-booking";
const labels: Record<string, string> = {
  name: "Full name",
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  phone: "Phone",
  lead_source: "How did you hear about us?",
  short: "Short answer",
  long: "Long answer",
};
export function BookingClientFieldEditor({
  fields,
  onChange,
}: {
  fields: BookingFieldDefinition[];
  onChange: (v: BookingFieldDefinition[]) => void;
}) {
  const [kind, setKind] = useState("short"),
    [drag, setDrag] = useState(-1);
  const make = (kind: any) => ({
    id: "field_" + crypto.randomUUID(),
    kind,
    label: labels[kind],
    placeholder: "",
    required: ["name", "first_name", "email"].includes(kind),
  });
  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || to >= fields.length) return;
    const next = [...fields],
      item = next.splice(from, 1)[0];
    next.splice(to, 0, item);
    onChange(next);
  }
  function change(index: number, value: Partial<BookingFieldDefinition>) {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...value } : f)));
  }
  return (
    <>
      <div className="ob-panel ob-field-toolbar">
        <label className="ob-check">
          <input
            type="checkbox"
            checked={fields.some((f) => f.kind === "first_name")}
            onChange={(e) => {
              const first = fields.findIndex((f) =>
                  ["name", "first_name"].includes(f.kind),
                ),
                rest = fields.filter(
                  (f) => !["name", "first_name", "last_name"].includes(f.kind),
                );
              rest.splice(
                Math.max(0, first),
                0,
                ...(e.target.checked
                  ? [make("first_name"), make("last_name")]
                  : [make("name")]),
              );
              onChange(rest);
            }}
          />
          Separate first and last name
        </label>
        <div className="ob-inline">
          <BookingField label="Add field type">
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {["phone", "lead_source", "short", "long"]
                .filter(
                  (k) =>
                    ["short", "long"].includes(k) ||
                    !fields.some((f) => f.kind === k),
                )
                .map((k) => (
                  <option key={k} value={k}>
                    {labels[k]}
                  </option>
                ))}
            </select>
          </BookingField>
          <Action
            icon={Plus}
            disabled={
              fields.length >= 24 ||
              (!["short", "long"].includes(kind) &&
                fields.some((f) => f.kind === kind))
            }
            onClick={() => onChange([...fields, make(kind)])}
          >
            Add booking field
          </Action>
        </div>
      </div>
      {fields.map((f, i) => (
        <section
          className="ob-panel ob-client-field"
          key={f.id}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            move(drag, i);
            setDrag(-1);
          }}
        >
          <div className="ob-section-heading">
            <h3>{labels[f.kind]}</h3>
            <div className="ob-inline">
              <Action
                icon={GripVertical}
                draggable
                onDragStart={(e) => {
                  setDrag(i);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", f.id);
                }}
                onDragEnd={() => setDrag(-1)}
              >
                Drag {f.label} to reorder
              </Action>
              <Action
                icon={ChevronUp}
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
              >
                Move {f.label} up
              </Action>
              <Action
                icon={ChevronDown}
                disabled={i === fields.length - 1}
                onClick={() => move(i, i + 1)}
              >
                Move {f.label} down
              </Action>
              <Action
                icon={Trash2}
                disabled={["name", "first_name", "email"].includes(f.kind)}
                onClick={() => onChange(fields.filter((_, n) => n !== i))}
              >
                Remove {f.label}
              </Action>
            </div>
          </div>
          <div className="ob-form-grid">
            <BookingField label="Field label">
              <input
                value={f.label}
                onChange={(e) => change(i, { label: e.target.value })}
              />
            </BookingField>
            <BookingField label="Placeholder">
              <input
                value={f.placeholder}
                onChange={(e) => change(i, { placeholder: e.target.value })}
              />
            </BookingField>
            {["short", "long"].includes(f.kind) && (
              <BookingField label="Answer type">
                <select
                  value={f.kind}
                  onChange={(e) => change(i, { kind: e.target.value as any })}
                >
                  <option value="short">Single line</option>
                  <option value="long">Multiple lines</option>
                </select>
              </BookingField>
            )}
            <label className="ob-check">
              <input
                type="checkbox"
                checked={f.required}
                disabled={["name", "first_name", "email"].includes(f.kind)}
                onChange={(e) => change(i, { required: e.target.checked })}
              />
              Required
            </label>
          </div>
        </section>
      ))}
    </>
  );
}
