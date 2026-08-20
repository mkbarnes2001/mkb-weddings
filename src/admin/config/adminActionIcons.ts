import {
  Archive,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  Check,
  CircleEllipsis,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileQuestion,
  FileSignature,
  FileText,
  FolderOpen,
  Globe2,
  Image,
  Images,
  Mail,
  MapPin,
  Package,
  Palette,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings2,
  Share2,
  ShoppingBag,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Users,
  Workflow,
  X,
  ZoomIn,
  type LucideIcon,
} from "lucide-react";


export type AdminActionDefinition = {
  key: string;
  label: string;
  defaultIconKey: string;
};


export type AdminActionIconOption = {
  key: string;
  label: string;
  icon: LucideIcon;
  keywords: string[];
};


export const adminActionIconCatalogue: AdminActionIconOption[] = [
  { key: "archive", label: "Archive", icon: Archive, keywords: ["archive", "store", "close"] },
  { key: "arrow-up-right", label: "Open external", icon: ArrowUpRight, keywords: ["open", "external", "launch"] },
  { key: "bell", label: "Bell", icon: Bell, keywords: ["alert", "notification"] },
  { key: "briefcase-business", label: "Job", icon: BriefcaseBusiness, keywords: ["job", "work", "booking"] },
  { key: "calendar-days", label: "Calendar", icon: CalendarDays, keywords: ["calendar", "date", "schedule"] },
  { key: "camera", label: "Camera", icon: Camera, keywords: ["photo", "photography"] },
  { key: "check", label: "Check", icon: Check, keywords: ["confirm", "complete", "done"] },
  { key: "circle-ellipsis", label: "More", icon: CircleEllipsis, keywords: ["more", "generic", "other"] },
  { key: "clipboard-list", label: "Questionnaire", icon: ClipboardList, keywords: ["questionnaire", "form", "list"] },
  { key: "copy", label: "Copy", icon: Copy, keywords: ["copy", "duplicate"] },
  { key: "download", label: "Download", icon: Download, keywords: ["download", "export"] },
  { key: "external-link", label: "Open", icon: ExternalLink, keywords: ["open", "external", "view"] },
  { key: "eye", label: "Preview", icon: Eye, keywords: ["preview", "view", "review"] },
  { key: "file-check-2", label: "Approved file", icon: FileCheck2, keywords: ["approve", "document", "complete"] },
  { key: "file-question", label: "Quote", icon: FileQuestion, keywords: ["quote", "proposal"] },
  { key: "file-signature", label: "Contract", icon: FileSignature, keywords: ["contract", "signature", "sign"] },
  { key: "file-text", label: "Template", icon: FileText, keywords: ["template", "document", "text"] },
  { key: "folder-open", label: "Open folder", icon: FolderOpen, keywords: ["folder", "open", "files"] },
  { key: "globe-2", label: "Website", icon: Globe2, keywords: ["website", "web", "publish", "public"] },
  { key: "image", label: "Image", icon: Image, keywords: ["image", "photo"] },
  { key: "images", label: "Gallery", icon: Images, keywords: ["gallery", "images", "photos"] },
  { key: "mail", label: "Email", icon: Mail, keywords: ["email", "mail", "message"] },
  { key: "map-pin", label: "Venue", icon: MapPin, keywords: ["venue", "location", "place"] },
  { key: "package", label: "Package", icon: Package, keywords: ["package", "product", "catalogue"] },
  { key: "palette", label: "Appearance", icon: Palette, keywords: ["appearance", "branding", "design"] },
  { key: "pencil", label: "Edit", icon: Pencil, keywords: ["edit", "change"] },
  { key: "plus", label: "Add", icon: Plus, keywords: ["add", "new", "create"] },
  { key: "printer", label: "Print", icon: Printer, keywords: ["print", "printer"] },
  { key: "receipt-text", label: "Invoice", icon: ReceiptText, keywords: ["invoice", "receipt", "payment"] },
  { key: "refresh-cw", label: "Refresh", icon: RefreshCw, keywords: ["refresh", "reload", "sync"] },
  { key: "save", label: "Save", icon: Save, keywords: ["save", "store"] },
  { key: "search", label: "Search", icon: Search, keywords: ["search", "find"] },
  { key: "send", label: "Send", icon: Send, keywords: ["send", "invite", "deliver"] },
  { key: "settings-2", label: "Settings", icon: Settings2, keywords: ["settings", "configure", "configuration"] },
  { key: "share-2", label: "Share", icon: Share2, keywords: ["share", "link"] },
  { key: "shopping-bag", label: "Store", icon: ShoppingBag, keywords: ["store", "shop", "commerce"] },
  { key: "sparkles", label: "Sparkles", icon: Sparkles, keywords: ["ai", "magic", "generate"] },
  { key: "trash-2", label: "Delete", icon: Trash2, keywords: ["delete", "remove", "trash"] },
  { key: "upload", label: "Upload", icon: Upload, keywords: ["upload", "import"] },
  { key: "user-round", label: "Client", icon: UserRound, keywords: ["client", "contact", "person"] },
  { key: "users", label: "People", icon: Users, keywords: ["clients", "suppliers", "people", "team"] },
  { key: "workflow", label: "Workflow", icon: Workflow, keywords: ["workflow", "automation", "process"] },
  { key: "x", label: "Close", icon: X, keywords: ["close", "cancel"] },
  { key: "zoom-in", label: "Inspect", icon: ZoomIn, keywords: ["zoom", "inspect", "view"] },
];


export const adminActionDefinitions: AdminActionDefinition[] = [
  { key: "create", label: "Add / new", defaultIconKey: "plus" },
  { key: "save", label: "Save", defaultIconKey: "save" },
  { key: "edit", label: "Edit", defaultIconKey: "pencil" },
  { key: "delete", label: "Delete / remove", defaultIconKey: "trash-2" },
  { key: "archive", label: "Archive", defaultIconKey: "archive" },
  { key: "send", label: "Send / invite", defaultIconKey: "send" },
  { key: "email", label: "Email", defaultIconKey: "mail" },
  { key: "templates", label: "Templates", defaultIconKey: "file-text" },
  { key: "settings", label: "Settings / configure", defaultIconKey: "settings-2" },
  { key: "preview", label: "Preview / review", defaultIconKey: "eye" },
  { key: "open", label: "Open / view", defaultIconKey: "external-link" },
  { key: "upload", label: "Upload / import", defaultIconKey: "upload" },
  { key: "download", label: "Download / export", defaultIconKey: "download" },
  { key: "refresh", label: "Refresh / reload / sync", defaultIconKey: "refresh-cw" },
  { key: "duplicate", label: "Duplicate / copy", defaultIconKey: "copy" },
  { key: "share", label: "Share", defaultIconKey: "share-2" },
  { key: "search", label: "Search", defaultIconKey: "search" },
  { key: "calendar", label: "Calendar / schedule", defaultIconKey: "calendar-days" },
  { key: "client", label: "Client / contact", defaultIconKey: "user-round" },
  { key: "job", label: "Job / booking", defaultIconKey: "briefcase-business" },
  { key: "quote", label: "Quote", defaultIconKey: "file-question" },
  { key: "invoice", label: "Invoice", defaultIconKey: "receipt-text" },
  { key: "contract", label: "Contract", defaultIconKey: "file-signature" },
  { key: "questionnaire", label: "Questionnaire", defaultIconKey: "clipboard-list" },
  { key: "publish", label: "Publishing / website", defaultIconKey: "globe-2" },
  { key: "gallery", label: "Gallery / images", defaultIconKey: "images" },
  { key: "package", label: "Package / catalogue", defaultIconKey: "package" },
  { key: "supplier", label: "Supplier", defaultIconKey: "users" },
  { key: "venue", label: "Venue / location", defaultIconKey: "map-pin" },
  { key: "appearance", label: "Appearance / branding", defaultIconKey: "palette" },
  { key: "workflow", label: "Workflow", defaultIconKey: "workflow" },
  { key: "print", label: "Print", defaultIconKey: "printer" },
  { key: "generic", label: "Other action", defaultIconKey: "circle-ellipsis" },
];


const iconByKey = new Map<string, LucideIcon>(
  adminActionIconCatalogue.map(
    (option) => [
      option.key,
      option.icon,
    ],
  ),
);


const actionByKey = new Map(
  adminActionDefinitions.map(
    (action) => [
      action.key,
      action,
    ],
  ),
);


export function defaultAdminActionIconKey(
  actionKey: string,
) {
  return actionByKey.get(actionKey)?.defaultIconKey
    || "circle-ellipsis";
}


export function configuredAdminActionIconKey(
  actionKey: string,
  overrides: Record<string, string> | null | undefined,
) {
  const candidate = String(
    overrides?.[actionKey] || "",
  ).trim();

  return iconByKey.has(candidate)
    ? candidate
    : defaultAdminActionIconKey(actionKey);
}


export function resolveAdminActionIcon(
  actionKey: string,
  overrides: Record<string, string> | null | undefined,
): LucideIcon {
  return iconByKey.get(
    configuredAdminActionIconKey(
      actionKey,
      overrides,
    ),
  ) || CircleEllipsis;
}


export function inferAdminActionKey(
  label: string,
) {
  const value = String(label || "")
    .trim()
    .toLowerCase();

  if (!value) {
    return "generic";
  }

  const tests: Array<[string, RegExp]> = [
    ["questionnaire", /questionnaire|form\b/],
    ["contract", /contract|signature|sign\b/],
    ["invoice", /invoice|receipt/],
    ["quote", /quote|proposal/],
    ["workflow", /workflow|automation/],
    ["templates", /template/],
    ["package", /package|catalogue|catalog\b/],
    ["supplier", /supplier/],
    ["venue", /venue|location|place/],
    ["calendar", /calendar|schedule/],
    ["gallery", /gallery|galleries|images|photos/],
    ["appearance", /appearance|branding|theme/],
    ["publish", /publish|publishing|website|live site/],
    ["download", /download|export/],
    ["upload", /upload|import|index missing/],
    ["refresh", /refresh|reload|sync|retry/],
    ["duplicate", /duplicate|copy/],
    ["share", /share/],
    ["search", /search|find/],
    ["delete", /delete|remove|trash/],
    ["archive", /archive/],
    ["save", /save|saving/],
    ["edit", /edit/],
    ["create", /\bnew\b|\badd\b|create/],
    ["send", /send|invite|deliver/],
    ["email", /email|mail/],
    ["settings", /settings|configure|configuration/],
    ["preview", /preview|review/],
    ["client", /client|contact/],
    ["job", /\bjob\b|booking/],
    ["print", /print/],
    ["open", /open|view/],
  ];

  for (const [key, pattern] of tests) {
    if (pattern.test(value)) {
      return key;
    }
  }

  return "generic";
}
