"use client";

import { useEffect, useState } from "react";

type DateFormat = "event" | "inbox" | "search" | "sent";
const formatters = new Map<string, Intl.DateTimeFormat>();

function getFormatter(key: string, options: Intl.DateTimeFormatOptions) {
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(undefined, options);
    formatters.set(key, formatter);
  }
  return formatter;
}

function formatDate(value: string, format: DateFormat) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  if (format === "sent") {
    return getFormatter("sent", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }
  if (format === "search") {
    return getFormatter("search", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
  if (format === "event") {
    return getFormatter("event-time", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  return isToday
    ? getFormatter("inbox-time", { hour: "numeric", minute: "2-digit" }).format(
        date,
      )
    : getFormatter("inbox-date", { month: "short", day: "numeric" }).format(
        date,
      );
}

export function ClientDateTime({
  value,
  format,
  className,
  fallback = "",
}: {
  value: string | null;
  format: DateFormat;
  className?: string;
  fallback?: string;
}) {
  const [label, setLabel] = useState(fallback);
  useEffect(
    () => setLabel(value ? formatDate(value, format) : fallback),
    [fallback, format, value],
  );
  return (
    <time className={className} dateTime={value ?? undefined}>
      {label}
    </time>
  );
}
