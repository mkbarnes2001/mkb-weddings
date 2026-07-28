import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  CircleDashed,
  Globe2,
  MapPinned,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import {
  AdminButton,
  AdminField,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminStatus,
  AdminTab,
  AdminTabs,
} from "../components/ui/AdminUI";
import { AdminApiService } from "../services/AdminApiService";
import type {
  WedPlannedBusiness,
  WedPlannedMember,
  WedPlannedPlatformPayload,
  WedPlannedServiceArea,
} from "../types/platform";

type TabKey = "business" | "services" | "team" | "access";

const emptyArea: Partial<WedPlannedServiceArea> = {
  label: "",
  areaType: "region",
  countryCode: "GB",
  regionCode: "",
  radiusMiles: null,
  remoteAvailable: false,
};

const emptyMember: Partial<WedPlannedMember> & { email: string } = {
  email: "",
  displayName: "",
  jobTitle: "",
  role: "staff",
};

function FieldInput({ value, onChange, placeholder = "", type = "text" }: {
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="admin-input"
    />
  );
}

function FieldSelect({ value, onChange, children }: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="admin-select">
      {children}
    </select>
  );
}

function toneForScope(status: string): "success" | "warning" | "info" {
  if (status === "scoped") return "success";
  if (status === "migration") return "warning";
  return "info";
}

function labelForScope(status: string) {
  if (status === "scoped") return "Tenant scoped";
  if (status === "migration") return "Migration required";
  return "Planned";
}

export function WedPlannedPlatform() {
  const [platform, setPlatform] = useState<WedPlannedPlatformPayload | null>(null);
  const [business, setBusiness] = useState<WedPlannedBusiness | null>(null);
  const [tab, setTab] = useState<TabKey>("business");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [primaryCategory, setPrimaryCategory] = useState("");
  const [serviceArea, setServiceArea] = useState(emptyArea);
  const [member, setMember] = useState(emptyMember);

  function apply(next: WedPlannedPlatformPayload) {
    setPlatform(next);
    setBusiness(next.business);
    const keys = next.categories.filter((category) => category.selected).map((category) => category.key);
    setSelectedCategories(keys);
    setPrimaryCategory(next.categories.find((category) => category.primary)?.key || keys[0] || "");
  }

  useEffect(() => {
    AdminApiService.getWedPlannedPlatform()
      .then(apply)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load WedPlanned foundation."))
      .finally(() => setLoading(false));
  }, []);

  const categoryGroups = useMemo(() => {
    const groups = new Map<string, WedPlannedPlatformPayload["categories"]>();
    for (const category of platform?.categories || []) {
      const list = groups.get(category.group) || [];
      list.push(category);
      groups.set(category.group, list);
    }
    return Array.from(groups.entries());
  }, [platform?.categories]);

  function updateBusiness<K extends keyof WedPlannedBusiness>(key: K, value: WedPlannedBusiness[K]) {
    setBusiness((current) => current ? { ...current, [key]: value } : current);
    setMessage("");
  }

  async function run(action: () => Promise<WedPlannedPlatformPayload>, success: string): Promise<boolean> {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const next = await action();
      apply(next);
      setMessage(success);
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to save WedPlanned settings.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveBusiness() {
    if (!business) return;
    await run(() => AdminApiService.saveWedPlannedBusiness(business), "Business profile saved.");
  }

  async function saveCategories() {
    await run(
      () => AdminApiService.saveWedPlannedCategories(selectedCategories, primaryCategory),
      "Business categories saved.",
    );
  }

  async function addServiceArea() {
    const saved = await run(
      () => AdminApiService.saveWedPlannedServiceArea(serviceArea),
      "Service area saved.",
    );
    if (saved) setServiceArea(emptyArea);
  }

  async function inviteMember() {
    const saved = await run(
      () => AdminApiService.inviteWedPlannedMember(member),
      "Team invitation staged. Email delivery will be enabled with professional authentication.",
    );
    if (saved) setMember(emptyMember);
  }

  if (loading) return <div className="admin-page text-sm text-neutral-500">Loading WedPlanned foundation…</div>;
  if (!platform || !business) {
    return <div className="admin-page rounded-xl bg-red-50 p-5 text-sm text-red-800">{error || "WedPlanned foundation is unavailable."}</div>;
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Commercial platform"
        title="WedPlanned"
        description="The neutral business foundation for wedding professionals, CRM, bookings, connected payments and the future marketplace."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <AdminStatus tone="info">Schema {platform.schemaVersion}</AdminStatus>
            <AdminStatus tone="success">{business.publicName}</AdminStatus>
            <span className="text-xs text-neutral-500">{platform.brand.primaryDomain}</span>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06]">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2eee7]"><Building2 size={17} /></span>
            <div><p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">First business</p><p className="text-sm font-semibold">{business.publicName}</p></div>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06]">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2eee7]"><BriefcaseBusiness size={17} /></span>
            <div><p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">Categories</p><p className="text-sm font-semibold">{selectedCategories.length} selected</p></div>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06]">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2eee7]"><ShieldCheck size={17} /></span>
            <div><p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">Tenant readiness</p><p className="text-sm font-semibold">{platform.scopeReadiness.filter((item) => item.status === "scoped").length} modules scoped</p></div>
          </div>
        </div>
      </div>

      <AdminTabs className="mt-1">
        <AdminTab active={tab === "business"} onClick={() => setTab("business")}>Business</AdminTab>
        <AdminTab active={tab === "services"} onClick={() => setTab("services")}>Services & areas</AdminTab>
        <AdminTab active={tab === "team"} onClick={() => setTab("team")}>Team</AdminTab>
        <AdminTab active={tab === "access"} onClick={() => setTab("access")}>Platform access</AdminTab>
      </AdminTabs>

      {message ? <div className="rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-800">{message}</div> : null}
      {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-800">{error}</div> : null}

      {tab === "business" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
          <AdminPanel title="Business identity" description="This neutral record will represent photographers, venues, planners and every other WedPlanned professional." icon={Building2}>
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="Public business name"><FieldInput value={business.publicName} onChange={(value) => updateBusiness("publicName", value)} /></AdminField>
              <AdminField label="Legal name"><FieldInput value={business.legalName} onChange={(value) => updateBusiness("legalName", value)} /></AdminField>
              <AdminField label="Business type">
                <FieldSelect value={business.businessType} onChange={(value) => updateBusiness("businessType", value as WedPlannedBusiness["businessType"])}>
                  <option value="sole_trader">Sole trader</option><option value="partnership">Partnership</option><option value="limited_company">Limited company</option><option value="charity">Charity</option><option value="other">Other</option>
                </FieldSelect>
              </AdminField>
              <AdminField label="Marketplace slug" help={`Future profile: wedplanned.com/pro/${business.marketplaceSlug || "your-business"}`}><FieldInput value={business.marketplaceSlug} onChange={(value) => updateBusiness("marketplaceSlug", value)} /></AdminField>
              <AdminField label="Year established"><FieldInput type="number" value={business.yearEstablished} onChange={(value) => updateBusiness("yearEstablished", value ? Number(value) : null)} /></AdminField>
              <AdminField label="Registration country"><FieldInput value={business.registrationCountry} onChange={(value) => updateBusiness("registrationCountry", value.toUpperCase())} /></AdminField>
              <AdminField label="Company number"><FieldInput value={business.companyNumber} onChange={(value) => updateBusiness("companyNumber", value)} /></AdminField>
              <AdminField label="Tax/VAT reference"><FieldInput value={business.taxNumber} onChange={(value) => updateBusiness("taxNumber", value)} /></AdminField>
            </div>
            <AdminField label="Business summary" className="mt-4">
              <textarea value={business.summary} onChange={(event) => updateBusiness("summary", event.target.value)} rows={4} className="admin-textarea" />
            </AdminField>

            <div className="mt-6 border-t border-black/[0.06] pt-5">
              <h3 className="text-sm font-semibold">Contact and public identity</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <AdminField label="Website"><FieldInput value={business.websiteUrl} onChange={(value) => updateBusiness("websiteUrl", value)} placeholder="https://…" /></AdminField>
                <AdminField label="Contact email"><FieldInput type="email" value={business.contactEmail} onChange={(value) => updateBusiness("contactEmail", value)} /></AdminField>
                <AdminField label="Phone"><FieldInput value={business.phone} onChange={(value) => updateBusiness("phone", value)} /></AdminField>
                <AdminField label="Instagram"><FieldInput value={business.instagram} onChange={(value) => updateBusiness("instagram", value)} placeholder="without @" /></AdminField>
                <AdminField label="Facebook"><FieldInput value={business.facebook} onChange={(value) => updateBusiness("facebook", value)} /></AdminField>
                <AdminField label="TikTok"><FieldInput value={business.tiktok} onChange={(value) => updateBusiness("tiktok", value)} /></AdminField>
                <AdminField label="Timezone"><FieldInput value={business.timezone} onChange={(value) => updateBusiness("timezone", value)} /></AdminField>
                <AdminField label="Currency"><FieldInput value={business.currency} onChange={(value) => updateBusiness("currency", value.toUpperCase())} /></AdminField>
              </div>
            </div>
            <div className="mt-5"><AdminButton variant="primary" icon={Save} onClick={saveBusiness} disabled={saving}>{saving ? "Saving…" : "Save business"}</AdminButton></div>
          </AdminPanel>

          <div className="space-y-5">
            <AdminPanel title="Foundation status" icon={Sparkles} compact>
              <dl className="space-y-3 text-xs">
                <div className="flex justify-between gap-4"><dt className="text-neutral-500">Workspace</dt><dd className="text-right font-medium">{business.workspaceSlug}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-neutral-500">Status</dt><dd className="text-right font-medium">{business.workspaceStatus}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-neutral-500">Plan</dt><dd className="text-right font-medium">{business.plan}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-neutral-500">Onboarding</dt><dd className="text-right font-medium">{business.onboardingStatus}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-neutral-500">Marketplace</dt><dd className="text-right font-medium">{business.marketplaceStatus}</dd></div>
              </dl>
            </AdminPanel>
            <AdminPanel title="Brand direction" icon={Globe2} compact>
              <p className="text-xs leading-5 text-neutral-600"><strong>WedPlanned</strong> is the commercial product. MKB Weddings remains the first live business and proving ground while tenant isolation is completed.</p>
              <div className="mt-4 rounded-xl bg-[#f5f3ef] p-3 text-xs"><div className="font-medium">{platform.brand.primaryDomain}</div><div className="mt-1 text-neutral-500">{platform.brand.ukDomain} will redirect to the primary domain.</div></div>
            </AdminPanel>
          </div>
        </div>
      ) : null}

      {tab === "services" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
          <AdminPanel title="Wedding-professional categories" description="Select every service the business provides and choose one primary marketplace category." icon={BriefcaseBusiness}>
            <div className="space-y-5">
              {categoryGroups.map(([group, categories]) => (
                <div key={group}>
                  <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{group}</h3>
                  <div className="grid gap-2 md:grid-cols-2">
                    {categories.map((category) => {
                      const selected = selectedCategories.includes(category.key);
                      return (
                        <label key={category.key} className={`flex cursor-pointer gap-3 rounded-xl p-3 ring-1 transition ${selected ? "bg-black text-white ring-black" : "bg-white ring-black/[0.08] hover:ring-black/20"}`}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(event) => {
                              const next = event.target.checked ? [...selectedCategories, category.key] : selectedCategories.filter((key) => key !== category.key);
                              setSelectedCategories(next);
                              if (!event.target.checked && primaryCategory === category.key) setPrimaryCategory(next[0] || "");
                            }}
                            className="mt-0.5"
                          />
                          <span className="min-w-0"><span className="block text-xs font-semibold">{category.name}</span><span className={`mt-1 block text-[10px] leading-4 ${selected ? "text-white/65" : "text-neutral-500"}`}>{category.description}</span></span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 border-t border-black/[0.06] pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <AdminField label="Primary category">
                <FieldSelect value={primaryCategory} onChange={setPrimaryCategory}>
                  <option value="">Choose primary category</option>
                  {platform.categories.filter((category) => selectedCategories.includes(category.key)).map((category) => <option key={category.key} value={category.key}>{category.name}</option>)}
                </FieldSelect>
              </AdminField>
              <AdminButton variant="primary" icon={Save} onClick={saveCategories} disabled={saving || !selectedCategories.length}>Save categories</AdminButton>
            </div>
          </AdminPanel>

          <div className="space-y-5">
            <AdminPanel title="Service areas" description="Where this business works. These are separate from MKB's venue-location intelligence." icon={MapPinned}>
              <div className="space-y-3">
                {platform.serviceAreas.length ? platform.serviceAreas.map((area) => (
                  <div key={area.id} className="flex items-start justify-between gap-3 rounded-xl bg-[#f5f3ef] p-3">
                    <div><p className="text-xs font-semibold">{area.label}</p><p className="mt-1 text-[10px] text-neutral-500">{area.areaType} · {area.countryCode}{area.radiusMiles != null ? ` · ${area.radiusMiles} miles` : ""}</p></div>
                    <button type="button" onClick={() => run(() => AdminApiService.archiveWedPlannedServiceArea(area.id), "Service area removed." )} className="rounded-lg p-2 text-neutral-400 hover:bg-white hover:text-red-600" aria-label={`Remove ${area.label}`}><Trash2 size={14} /></button>
                  </div>
                )) : <p className="text-xs text-neutral-500">No service areas added yet.</p>}
              </div>
              <div className="mt-5 space-y-3 border-t border-black/[0.06] pt-5">
                <AdminField label="Area name"><FieldInput value={serviceArea.label} onChange={(value) => setServiceArea({ ...serviceArea, label: value })} placeholder="Northern Ireland" /></AdminField>
                <div className="grid gap-3 sm:grid-cols-2">
                  <AdminField label="Area type"><FieldSelect value={String(serviceArea.areaType)} onChange={(value) => setServiceArea({ ...serviceArea, areaType: value as WedPlannedServiceArea["areaType"] })}><option value="local">Local</option><option value="city">City</option><option value="county">County</option><option value="region">Region</option><option value="country">Country</option><option value="destination">Destination</option><option value="remote">Remote</option><option value="custom">Custom</option></FieldSelect></AdminField>
                  <AdminField label="Country code"><FieldInput value={serviceArea.countryCode} onChange={(value) => setServiceArea({ ...serviceArea, countryCode: value.toUpperCase() })} /></AdminField>
                  <AdminField label="Radius (miles)"><FieldInput type="number" value={serviceArea.radiusMiles} onChange={(value) => setServiceArea({ ...serviceArea, radiusMiles: value ? Number(value) : null })} /></AdminField>
                </div>
                <AdminButton variant="secondary" icon={Plus} onClick={addServiceArea} disabled={saving || !serviceArea.label}>Add service area</AdminButton>
              </div>
            </AdminPanel>
          </div>
        </div>
      ) : null}

      {tab === "team" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
          <AdminPanel title="Business team" description="Memberships are business-owned. Sign-in and invitation delivery arrive in the professional-authentication phase." icon={Users}>
            <div className="space-y-3">
              {platform.members.length ? platform.members.map((teamMember) => (
                <div key={teamMember.id} className="grid gap-3 rounded-xl bg-[#f5f3ef] p-4 md:grid-cols-[minmax(0,1fr)_150px_120px_auto] md:items-center">
                  <div className="min-w-0"><p className="truncate text-xs font-semibold">{teamMember.displayName || teamMember.email}</p><p className="mt-1 truncate text-[10px] text-neutral-500">{teamMember.email}{teamMember.jobTitle ? ` · ${teamMember.jobTitle}` : ""}</p></div>
                  <select value={teamMember.role} onChange={(event) => run(() => AdminApiService.updateWedPlannedMember({ ...teamMember, role: event.target.value as WedPlannedMember["role"] }), "Team role updated.")} className="admin-select text-xs"><option value="owner">Owner</option><option value="admin">Admin</option><option value="manager">Manager</option><option value="content">Content</option><option value="finance">Finance</option><option value="staff">Staff</option><option value="viewer">Viewer</option></select>
                  <AdminStatus tone={teamMember.status === "active" ? "success" : "warning"}>{teamMember.status}</AdminStatus>
                  <button type="button" onClick={() => run(() => AdminApiService.updateWedPlannedMember({ ...teamMember, status: "disabled" }), "Team member disabled.")} className="rounded-lg p-2 text-neutral-400 hover:bg-white hover:text-red-600" aria-label={`Disable ${teamMember.email}`}><Trash2 size={14} /></button>
                </div>
              )) : <p className="text-xs text-neutral-500">No team memberships have been added.</p>}
            </div>
          </AdminPanel>

          <AdminPanel title="Stage an invitation" description="This records the intended member and role. It does not send an email until authentication is enabled." icon={Plus}>
            <div className="space-y-3">
              <AdminField label="Email"><FieldInput type="email" value={member.email} onChange={(value) => setMember({ ...member, email: value })} /></AdminField>
              <AdminField label="Name"><FieldInput value={member.displayName} onChange={(value) => setMember({ ...member, displayName: value })} /></AdminField>
              <AdminField label="Job title"><FieldInput value={member.jobTitle} onChange={(value) => setMember({ ...member, jobTitle: value })} /></AdminField>
              <AdminField label="Role"><FieldSelect value={String(member.role)} onChange={(value) => setMember({ ...member, role: value as WedPlannedMember["role"] })}><option value="owner">Owner</option><option value="admin">Admin</option><option value="manager">Manager</option><option value="content">Content</option><option value="finance">Finance</option><option value="staff">Staff</option><option value="viewer">Viewer</option></FieldSelect></AdminField>
              <AdminButton variant="primary" icon={Plus} onClick={inviteMember} disabled={saving || !member.email}>Stage invitation</AdminButton>
            </div>
          </AdminPanel>
        </div>
      ) : null}

      {tab === "access" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
          <AdminPanel title="Tenant-isolation readiness" description="This is the live audit boundary for external WedPlanned businesses." icon={ShieldCheck}>
            <div className="space-y-2">
              {platform.scopeReadiness.map((item) => (
                <div key={item.key} className="grid gap-2 rounded-xl bg-[#f5f3ef] p-3 md:grid-cols-[minmax(0,1fr)_150px] md:items-center">
                  <div><p className="text-xs font-semibold">{item.label}</p><p className="mt-1 text-[10px] leading-4 text-neutral-500">{item.detail}</p></div>
                  <AdminStatus tone={toneForScope(item.status)}>{labelForScope(item.status)}</AdminStatus>
                </div>
              ))}
            </div>
          </AdminPanel>

          <div className="space-y-5">
            <AdminPanel title="Feature entitlements" description="MKB is an internal founder business, so all foundation features are enabled while commercial plans are designed." icon={BadgeCheck}>
              <div className="space-y-2">
                {platform.entitlements.map((feature) => (
                  <div key={feature.key} className="flex items-start gap-3 rounded-xl bg-[#f5f3ef] p-3">
                    <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ${feature.enabled ? "bg-emerald-100 text-emerald-700" : "bg-neutral-200 text-neutral-500"}`}>{feature.enabled ? <Check size={12} /> : <CircleDashed size={12} />}</span>
                    <div><p className="text-xs font-semibold">{feature.name}</p><p className="mt-1 text-[10px] leading-4 text-neutral-500">{feature.description}</p></div>
                  </div>
                ))}
              </div>
            </AdminPanel>
            <AdminPanel title="Recent foundation activity" compact>
              <div className="space-y-3">
                {platform.recentAudit.length ? platform.recentAudit.map((event) => (
                  <div key={event.id} className="border-b border-black/[0.06] pb-3 last:border-0 last:pb-0"><p className="text-xs font-medium">{event.summary}</p><p className="mt-1 text-[10px] text-neutral-500">{event.createdAt}</p></div>
                )) : <p className="text-xs text-neutral-500">No platform changes recorded yet.</p>}
              </div>
            </AdminPanel>
          </div>
        </div>
      ) : null}
    </AdminPage>
  );
}
