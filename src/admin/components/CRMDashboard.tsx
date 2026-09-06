import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { AdminButton, AdminPanel, AdminStatus } from "./ui/AdminUI";
import { AdminApiService } from "../services/AdminApiService";
import { dashboardRange, validateDashboardRange } from "../../../shared/crm-dashboard";
import type { DashboardData, DashboardPeriod } from "../../../shared/crm-dashboard";
import type { CrmOverview } from "../types/crm";

const COLORS = ["#2563eb", "#059669", "#b45309", "#7c3aed", "#db2777", "#0891b2"];
const dateLabel = (date: string) => date ? new Date(`${date.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "No date";
const money = (amount: number, currency: string) => new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount / 100);
const typeLabel = (type: string) => type.replace(/[_-]/g, " ").replace(/^./, letter => letter.toUpperCase());

function TableCard({ title, headings, rows, empty, to }: { title: string; headings: string[]; rows: ReactNode[]; empty: string; to?: string }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / 6));
  const current = Math.min(page, pages - 1);
  return <AdminPanel className="crm-dashboard-table-card" title={title} actions={to ? <Link className="crm-dashboard-all" to={to} aria-label={`View all ${title.toLowerCase()}`}>View all <ArrowRight size={13} /></Link> : undefined}>
    {rows.length ? <div className="crm-dashboard-table-scroll"><table className="crm-dashboard-table"><thead><tr>{headings.map(heading => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{rows.slice(current * 6, current * 6 + 6)}</tbody></table></div> : <div className="crm-dashboard-empty">{empty}</div>}
    {rows.length > 6 ? <div className="crm-dashboard-pagination"><AdminButton size="sm" icon={ChevronLeft} disabled={current === 0} onClick={() => setPage(current - 1)} aria-label={`Previous page of ${title.toLowerCase()}`}>Previous</AdminButton><span>{current + 1} / {pages}</span><AdminButton size="sm" icon={ChevronRight} disabled={current + 1 === pages} onClick={() => setPage(current + 1)} aria-label={`Next page of ${title.toLowerCase()}`}>Next</AdminButton></div> : null}
  </AdminPanel>;
}

type ChartSeries = { label: string; color: string; values: number[]; dates?: string[] };
function ActivityChart({ dates, series, currency }: { dates: string[]; series: ChartSeries[]; currency?: string }) {
  const figure = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    if (!figure.current) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(200, entries[0].contentRect.width)));
    observer.observe(figure.current);
    return () => observer.disconnect();
  }, []);
  const chartWidth = Math.max(200, width);
  const labelCount = chartWidth < 450 ? 3 : 6;
  const plotWidth = chartWidth - 82;
  const values = series.flatMap(row => row.values);
  const low = Math.min(0, ...values), high = Math.max(currency ? 100 : 1, ...values);
  const floor = low < 0 ? Math.floor(low / (currency ? 100 : 1)) * (currency ? 100 : 1) : 0;
  const top = Math.ceil(high / (currency ? 100 : 1)) * (currency ? 100 : 1);
  const x = (index: number) => 60 + (dates.length === 1 ? plotWidth / 2 : index * plotWidth / (dates.length - 1));
  const y = (value: number) => 224 - (value - floor) * 194 / (top - floor);
  const ticks = [...new Set(Array.from({ length: 5 }, (_, i) => currency ? floor + (top - floor) * i / 4 : Math.round(floor + (top - floor) * i / 4)))];
  const labels = [...new Set(Array.from({ length: Math.min(labelCount, dates.length) }, (_, i) => Math.round(i * (dates.length - 1) / Math.max(1, Math.min(labelCount, dates.length) - 1))))];
  const summary = series.map(line => `${line.label}: ${currency ? money(line.values.reduce((a, b) => a + b, 0), currency) : line.values.reduce((a, b) => a + b, 0)}`).join(". ");
  return <figure ref={figure} className="crm-dashboard-chart">
    <svg viewBox={`0 0 ${chartWidth} 275`} role="img" aria-label={summary}>
      <title>{summary}</title>
      {ticks.map(tick => <g key={tick}><line x1="60" x2={chartWidth - 22} y1={y(tick)} y2={y(tick)} stroke="#e6e8eb" /><text x="50" y={y(tick) + 4} textAnchor="end">{currency ? new Intl.NumberFormat("en-GB", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(tick / 100) : tick}</text></g>)}
      {labels.map(index => <text key={index} x={x(index)} y="250" textAnchor="middle">{dateLabel(dates[index]).replace(/ \d{4}$/, "")}</text>)}
      {series.map(line => <g key={line.label}><polyline fill="none" stroke={line.color} strokeWidth="2.5" strokeLinejoin="round" points={line.values.map((value, index) => `${x(index)},${y(value)}`).join(" ")} />{line.values.map((value, index) => <circle key={index} cx={x(index)} cy={y(value)} r={dates.length > 62 ? 2 : 3.5} fill={line.color}><title>{dateLabel(line.dates?.[index] || dates[index])}: {line.label} {currency ? money(value, currency) : value}</title></circle>)}</g>)}
    </svg>
    <figcaption>{series.map(line => <span key={line.label}><i style={{ background: line.color }} />{line.label}</span>)}</figcaption>
  </figure>;
}

export function CRMDashboard({ crm, workspaceId }: { crm: CrmOverview; workspaceId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [period, setPeriod] = useState<DashboardPeriod>("30d");
  const [range, setRange] = useState(() => dashboardRange("30d", today));
  const [custom, setCustom] = useState(range);
  const [datesOpen, setDatesOpen] = useState(false);
  const [jobType, setJobType] = useState("");
  const [metric, setMetric] = useState("leads");
  const [currency, setCurrency] = useState(crm.workspace.currency || "GBP");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [rangeError, setRangeError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setData(null); setError("");
    AdminApiService.getCrmDashboard(range.from, range.to, jobType).then(result => {
      if (!active) return;
      setData(result);
      setCurrency(current => result.currencies.includes(current) ? current : result.currencies[0] || crm.workspace.currency || "GBP");
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load dashboard."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspaceId, range.from, range.to, jobType, revision, crm]);
  const recentLeads = useMemo(() => crm.workspace.id === workspaceId ? crm.enquiries.filter(lead => !jobType || lead.eventType === jobType).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [], [crm, workspaceId, jobType]);
  function selectPeriod(value: Exclude<DashboardPeriod, "custom">) { const next = dashboardRange(value, today); setPeriod(value); setRange(next); setCustom(next); setRangeError(""); }
  function applyRange() { try { validateDashboardRange(custom.from, custom.to); setRange(custom); setPeriod("custom"); setRangeError(""); setDatesOpen(false); } catch (reason) { setRangeError((reason as Error).message); } }
  const sum = (key: "leads" | "weddings" | "bookings") => data?.days.reduce((total, day) => total + day[key], 0) || 0;
  const paid = data?.days.reduce((total, day) => total + (day.payments[currency] || 0), 0) || 0;
  const priorPaid = data?.previousDays.reduce((total, day) => total + (day.payments[currency] || 0), 0) || 0;
  const activeMetric = !data?.capabilities.bookings ? "leads" : !data.capabilities.payments && ["payments", "comparison"].includes(metric) ? "leads" : metric;
  const series: ChartSeries[] = !data ? [] : activeMetric === "leads" ? [{ label: "Leads created", color: COLORS[0], values: data.days.map(day => day.leads) }, ...(data.capabilities.bookings ? [{ label: "Jobs booked", color: COLORS[1], values: data.days.map(day => day.bookings) }] : [])] : activeMetric === "weddings" ? [{ label: "Weddings & shoots", color: COLORS[1], values: data.days.map(day => day.weddings) }] : [{ label: "Payments received", color: COLORS[0], values: data.days.map(day => day.payments[currency] || 0) }, ...(activeMetric === "comparison" ? [{ label: `Previous period · ${dateLabel(data.range.previousFrom)} – ${dateLabel(data.range.previousTo)}`, color: COLORS[1], dates: data.previousDays.map(day => day.date), values: data.previousDays.map(day => day.payments[currency] || 0) }] : [])];
  const metrics = [{ id: "leads", title: "Leads", value: sum("leads") }, ...(data?.capabilities.bookings ? [{ id: "weddings", title: "Weddings & shoots", value: sum("weddings") }] : []), ...(data?.capabilities.payments ? [{ id: "payments", title: "Payments received", value: money(paid, currency) }, { id: "comparison", title: "Payment comparison", value: money(paid - priorPaid, currency) }] : [])];
  const sourceTotal = data?.sources.reduce((total, source) => total + source.count, 0) || 0;
  let segment = 0;
  const gradient = data?.sources.map((source, i) => { const from = segment; segment += source.count / sourceTotal * 100; return `${COLORS[i % COLORS.length]} ${from}% ${segment}%`; }).join(", ");
  const dueDate = (date: string) => <span className={date && date < today ? "crm-dashboard-overdue" : ""}>{dateLabel(date)}{date === today ? <small>Today</small> : date && date < today ? <small>Overdue</small> : null}</span>;
  return <div className="crm-dashboard">
    <section className="crm-dashboard-overview" aria-label="Period overview" aria-busy={loading}>
      <div className="crm-dashboard-filters">
        <label><span className="admin-field__label">Job type</span><select className="admin-select" aria-label="Job type" value={jobType} onChange={event => setJobType(event.target.value)}><option value="">All job types</option>{[...new Set([...(data?.jobTypes || []), jobType].filter(Boolean))].map(type => <option key={type} value={type}>{typeLabel(type)}</option>)}</select></label>
        <div className="crm-dashboard-periods" aria-label="Dashboard period">{([["7d", "7 days"], ["30d", "30 days"], ["mtd", "Month to date"], ["ytd", "Year to date"]] as const).map(([value, title]) => <button key={value} type="button" aria-pressed={period === value} onClick={() => selectPeriod(value)}>{title}</button>)}</div>
        <details className="crm-dashboard-dates" open={datesOpen} onToggle={event => setDatesOpen(event.currentTarget.open)}><summary>{dateLabel(range.from)} – {dateLabel(range.to)}</summary><div><label className="admin-field"><span className="admin-field__label">From</span><input className="admin-input" type="date" value={custom.from} onChange={event => setCustom(current => ({ ...current, from: event.target.value }))} /></label><label className="admin-field"><span className="admin-field__label">To</span><input className="admin-input" type="date" value={custom.to} onChange={event => setCustom(current => ({ ...current, to: event.target.value }))} /></label><AdminButton size="sm" onClick={applyRange}>Apply dates</AdminButton>{rangeError ? <p role="alert">{rangeError}</p> : null}</div></details>
      </div>
      {error ? <div className="admin-alert admin-alert--error" role="alert">{error} <AdminButton size="sm" icon={RefreshCw} onClick={() => setRevision(value => value + 1)}>Retry</AdminButton></div> : loading ? <div className="crm-dashboard-loading" role="status">Loading dashboard…</div> : data ? <div className="crm-dashboard-analytics">
        <div className="crm-dashboard-trends"><div className="crm-dashboard-metrics" aria-label="Chart metric">{metrics.map(item => <button type="button" key={item.id} aria-pressed={activeMetric === item.id} onClick={() => setMetric(item.id)}><span>{item.title}</span><strong>{item.value}</strong></button>)}</div>
          {data.currencies.length > 1 && ["payments", "comparison"].includes(activeMetric) ? <div className="crm-dashboard-currency"><select className="admin-select" aria-label="Chart currency" value={currency} onChange={event => setCurrency(event.target.value)}>{data.currencies.map(value => <option key={value}>{value}</option>)}</select></div> : null}
          <ActivityChart dates={data.days.map(day => day.date)} series={series} currency={["payments", "comparison"].includes(activeMetric) ? currency : undefined} />
        </div>
        <div className="crm-dashboard-sources"><h2>Lead sources</h2><div className="crm-dashboard-donut" role="img" aria-label={sourceTotal ? data.sources.map(source => `${source.name}: ${source.count}`).join(", ") : "No leads in this period"} style={{ background: sourceTotal ? `conic-gradient(${gradient})` : "#f0f1f3" }}><span><strong>{sourceTotal || "—"}</strong>{sourceTotal ? "leads" : "No leads in this period"}</span></div>{sourceTotal ? <ul>{data.sources.map((source, i) => <li key={source.name}><i style={{ background: COLORS[i % COLORS.length] }} /><span>{typeLabel(source.name)}</span><strong>{source.count}</strong></li>)}</ul> : null}</div>
      </div> : null}
    </section>
    <div className="crm-dashboard-tables" key={jobType}>
      {data?.capabilities.bookings ? <TableCard title="Upcoming weddings & shoots" headings={["Date", "Job", "Venue"]} empty="No upcoming weddings or shoots" to="/admin/crm?view=schedule" rows={data.upcoming.map(job => <tr key={job.id}><td>{dateLabel(job.date)}</td><td><Link to={`/admin/crm/jobs/${job.id}`}>{job.title}</Link></td><td>{job.venue || "Venue TBC"}</td></tr>)} /> : null}
      <TableCard title="Recent leads" headings={["Created", "Lead", "Mail status", "Stage"]} empty="No leads yet" to="/admin/crm" rows={recentLeads.map(lead => <tr key={lead.id}><td>{dateLabel(lead.createdAt.slice(0, 10))}</td><td><Link to={`/admin/crm/enquiries/${lead.id}`}>{lead.primaryContact?.displayName || lead.reference}</Link></td><td><AdminStatus tone={lead.mailStatus === "failed" ? "danger" : ["clicked", "opened"].includes(lead.mailStatus) ? "success" : "neutral"}>{lead.mailStatus === "none" ? "Not sent" : typeLabel(lead.mailStatus)}</AdminStatus></td><td>{lead.stageName || typeLabel(lead.status)}</td></tr>)} />
      {data?.capabilities.payments ? <TableCard title="Overdue & upcoming payments" headings={["Due", "Invoice", "Job", "Amount"]} empty="No outstanding payments" rows={data.payments.map(row => <tr key={row.id}><td>{dueDate(row.due)}</td><td><Link to={`/admin/crm/jobs/${row.jobId}/invoices/${row.invoiceId}`}>{row.reference}</Link></td><td><Link to={`/admin/crm/jobs/${row.jobId}`}>{row.jobTitle}</Link></td><td className="crm-dashboard-money">{money(row.amount, row.currency)}</td></tr>)} /> : null}
      {data?.capabilities.bookings ? <TableCard title="Job tasks with due dates" headings={["Due", "Job", "Task"]} empty="No tasks with due dates" to="/admin/crm?view=workflows" rows={data.tasks.map(task => <tr key={task.id}><td>{dueDate(task.due)}</td><td><Link to={`/admin/crm/jobs/${task.jobId}`}>{task.jobTitle}</Link></td><td>{task.title}</td></tr>)} /> : null}
    </div>
  </div>;
}
