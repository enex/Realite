const DEFAULT_LOCALE = "de-DE";

type DateInput = Date | string | number | null | undefined;

type DateFormatter = {
  (input: DateInput, options?: Intl.DateTimeFormatOptions, locale?: string | string[]): string;
};

const toDate = (input: DateInput): Date | null => {
  if (!input && input !== 0) return null;
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  const parsed = new Date(input as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatWithIntl = (
  date: Date,
  locale: string | string[] | undefined,
  options: Intl.DateTimeFormatOptions,
  fallback: () => string
): string => {
  try {
    if (typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function") {
      const formatter = new Intl.DateTimeFormat(locale, options);
      return formatter.format(date);
    }
  } catch {}
  return fallback();
};

export const formatLocalTime: DateFormatter = (
  input,
  options,
  locale = DEFAULT_LOCALE
) => {
  const date = toDate(input);
  if (!date) return "";
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...options,
  };
  return formatWithIntl(date, locale, timeOptions, () =>
    date.toLocaleTimeString(locale, timeOptions)
  );
};

export const formatLocalDate: DateFormatter = (
  input,
  options,
  locale = DEFAULT_LOCALE
) => {
  const date = toDate(input);
  if (!date) return "";
  const dateOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...options,
  };
  return formatWithIntl(date, locale, dateOptions, () =>
    date.toLocaleDateString(locale, dateOptions)
  );
};

export const formatLocalDateTime = (
  input: DateInput,
  {
    dateOptions,
    timeOptions,
    locale = DEFAULT_LOCALE,
    separator = " ",
    includeDate = true,
    includeTime = true,
  }: {
    dateOptions?: Intl.DateTimeFormatOptions;
    timeOptions?: Intl.DateTimeFormatOptions;
    locale?: string | string[];
    separator?: string;
    includeDate?: boolean;
    includeTime?: boolean;
  } = {}
): string => {
  const date = toDate(input);
  if (!date) return "";

  const parts: string[] = [];
  if (includeDate) {
    const datePart = formatLocalDate(date, dateOptions, locale);
    if (datePart) parts.push(datePart);
  }
  if (includeTime) {
    const timePart = formatLocalTime(date, timeOptions, locale);
    if (timePart) parts.push(timePart);
  }
  return parts.join(separator).trim();
};
