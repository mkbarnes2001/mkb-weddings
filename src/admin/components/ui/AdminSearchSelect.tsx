import { useEffect, useId, useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export type AdminSearchSelectOption = {
  value: string;
  label: string;
  description?: string;
  keywords?: string[];
};

type Props = {
  label: string;
  value: string;
  options: readonly AdminSearchSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  help?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
};

function searchKey(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function AdminSearchSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Type to search…",
  help,
  disabled = false,
  allowClear = true,
  className = "",
}: Props) {
  const inputId = useId();
  const listId = `${inputId}-listbox`;
  const selected = options.find((option) => option.value === value);
  const selectedLabel = selected?.label || value || "";
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) setQuery(selectedLabel);
  }, [open, selectedLabel]);

  const filtered = useMemo(() => {
    const target = searchKey(query);
    if (!target) return options.slice(0, 40);
    return options
      .filter((option) => searchKey([option.label, option.description, ...(option.keywords || [])].filter(Boolean).join(" ")).includes(target))
      .slice(0, 40);
  }, [options, query]);

  useEffect(() => setActiveIndex(0), [query]);

  const choose = (option: AdminSearchSelectOption) => {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
  };

  const close = () => {
    const exact = options.find((option) => searchKey(option.label) === searchKey(query));
    if (exact) onChange(exact.value);
    setQuery(exact?.label || selectedLabel);
    setOpen(false);
  };

  return (
    <div className={`admin-search-select ${className}`} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
    }}>
      <label className="admin-search-select__label" htmlFor={inputId}>{label}</label>
      <div className="admin-search-select__input-wrap">
        <div className="admin-search-select__control">
          <Search aria-hidden="true" className="admin-search-select__search-icon" />
          <input
            id={inputId}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            autoComplete="off"
            disabled={disabled}
            value={query}
            placeholder={placeholder}
            onFocus={() => setOpen(true)}
            onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setOpen(true);
                setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter" && open && filtered[activeIndex]) {
                event.preventDefault();
                choose(filtered[activeIndex]);
              } else if (event.key === "Escape") {
                event.preventDefault();
                setQuery(selectedLabel);
                setOpen(false);
              }
            }}
          />
          {allowClear && value ? (
            <button type="button" className="admin-search-select__clear" aria-label={`Clear ${label}`} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(""); setQuery(""); setOpen(true); }}>
              <X aria-hidden="true" />
            </button>
          ) : <ChevronDown aria-hidden="true" className="admin-search-select__chevron" />}
        </div>
        {open ? (
          <div id={listId} role="listbox" className="admin-search-select__menu">
            {filtered.length ? filtered.map((option, index) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`admin-search-select__option ${index === activeIndex ? "is-active" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
              >
                <span><strong>{option.label}</strong>{option.description ? <small>{option.description}</small> : null}</span>
                {option.value === value ? <Check aria-hidden="true" /> : null}
              </button>
            )) : <div className="admin-search-select__empty">No matching options. Choose a value from the controlled list.</div>}
          </div>
        ) : null}
      </div>
      {help ? <p className="admin-search-select__help">{help}</p> : null}
    </div>
  );
}
