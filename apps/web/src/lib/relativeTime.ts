// FILE: relativeTime.ts
// Purpose: Compact locale-aware relative-time labels for task and pull request lists.
// Layer: Web UI utility

import type { AppLocale } from "../locale";

export function formatRelativeTime(iso: string, locale: AppLocale = "en"): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return locale === "zh-CN" ? "刚刚" : "now";
  if (minutes < 60) return locale === "zh-CN" ? `${minutes}分` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return locale === "zh-CN" ? `${hours}小时` : `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return locale === "zh-CN" ? `${days}天` : `${days}d`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return locale === "zh-CN" ? `${weeks}周` : `${weeks}w`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return locale === "zh-CN" ? `${months}个月` : `${months}mo`;
  }
  const years = Math.floor(days / 365);
  return locale === "zh-CN" ? `${years}年` : `${years}y`;
}
