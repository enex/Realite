// Determine timezone from location
export const getTimezoneFromLocation = (
  countryCode?: string,
  lat?: number,
  lng?: number
): string => {
  // Map common country codes to timezones
  const countryTimezoneMap: Record<string, string> = {
    DE: "Europe/Berlin",
    AT: "Europe/Vienna",
    CH: "Europe/Zurich",
    FR: "Europe/Paris",
    IT: "Europe/Rome",
    ES: "Europe/Madrid",
    NL: "Europe/Amsterdam",
    BE: "Europe/Brussels",
    PL: "Europe/Warsaw",
    CZ: "Europe/Prague",
    DK: "Europe/Copenhagen",
    SE: "Europe/Stockholm",
    NO: "Europe/Oslo",
    FI: "Europe/Helsinki",
    GB: "Europe/London",
    IE: "Europe/Dublin",
    PT: "Europe/Lisbon",
    GR: "Europe/Athens",
  };

  if (countryCode && countryTimezoneMap[countryCode]) {
    return countryTimezoneMap[countryCode];
  }

  // Fallback: try to infer from coordinates (rough approximation)
  if (lat !== undefined && lng !== undefined) {
    // Germany and Central Europe: roughly 47-55°N, 5-15°E
    if (lat >= 47 && lat <= 55 && lng >= 5 && lng <= 15) {
      return "Europe/Berlin";
    }
    // Western Europe
    if (lat >= 40 && lat <= 51 && lng >= -5 && lng <= 10) {
      return "Europe/Paris";
    }
    // Eastern Europe
    if (lat >= 45 && lat <= 55 && lng >= 10 && lng <= 25) {
      return "Europe/Warsaw";
    }
  }

  // Default fallback
  return "Europe/Berlin";
};
