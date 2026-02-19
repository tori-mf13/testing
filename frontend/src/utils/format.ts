export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatPercent(num: number): string {
  return `${Math.round(num)}%`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function severityColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return 'badge-critical';
    case 'HIGH': case 'URGENT': return 'badge-high';
    case 'MEDIUM': return 'badge-medium';
    case 'LOW': return 'badge-low';
    default: return 'badge-info';
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'ACTIVE': case 'ONLINE': case 'RESOLVED': case 'APPROVED': case 'COMPLETED': return 'text-emerald-400';
    case 'OPEN': case 'PENDING': case 'PENDING_APPROVAL': case 'IN_PROGRESS': return 'text-blue-400';
    case 'SHADOW_IT': case 'DEGRADED': case 'CRITICAL': return 'text-red-400';
    case 'INACTIVE': case 'OFFLINE': case 'RETIRED': case 'REJECTED': return 'text-slate-500';
    case 'MAINTENANCE': return 'text-yellow-400';
    default: return 'text-slate-400';
  }
}
