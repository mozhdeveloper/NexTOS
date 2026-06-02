export function getServiceDate(record: { completedDate: string | null; scheduledDate: string }) {
  return record.completedDate ?? record.scheduledDate;
}

export function formatServiceType(serviceType?: string | null) {
  const normalized = typeof serviceType === "string" ? serviceType.trim() : "";

  if (!normalized) return "Unknown";
  if (normalized.toLowerCase() === "pms") return "PMS";

  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatStatusLabel(status?: string | null) {
  const normalized = typeof status === "string" ? status.trim() : "";
  return normalized ? normalized.replace(/_/g, " ") : "unknown";
}

export function formatDate(dateISO: string) {
  return new Date(dateISO).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateISO?: string | null) {
  if (!dateISO) return "-";

  return new Date(dateISO).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMoneyPeso(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "--";
}

export function splitDetailText(value?: string) {
  if (!value) return [];

  return value
    .split(/\.|,|;/)
    .map((item) => item.trim())
    .filter((item) => item.length > 2);
}
