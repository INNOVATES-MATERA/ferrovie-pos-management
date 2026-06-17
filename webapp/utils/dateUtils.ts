const dateUtils = {
  formatISOStringToYYYYMMDD(sDate: string | null): string | null {
    if (!sDate) return null;
    return sDate.substring(0, 10);
  },

  formatDateTimeOffsetToDDMMYYYY(value: string | Date | null): string {
    if (!value) return "";
    if (value instanceof Date) {
      const sDay = ("0" + value.getUTCDate()).slice(-2);
      const sMonth = ("0" + (value.getUTCMonth() + 1)).slice(-2);
      return `${sDay}/${sMonth}/${value.getUTCFullYear()}`;
    }
    const monthMap: Record<string, string> = {
      gen: "01", feb: "02", mar: "03", apr: "04", mag: "05", giu: "06",
      lug: "07", ago: "08", set: "09", ott: "10", nov: "11", dic: "12",
    };
    // "17 giu 2026, 15:17:24"
    const match = value.match(/^(\d{1,2})\s+([a-z]{3})\s+(\d{4}),\s*(\d{2}:\d{2}:\d{2})/i);
    if (match) {
      const sDay = match[1].padStart(2, "0");
      const sMonth = monthMap[match[2].toLowerCase()] ?? "??";
      return `${sDay}/${sMonth}/${match[3]} ${match[4]}`;
    }
    // ISO fallback: "2026-06-17T..."
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    return "";
  },

  isDateAfter(date1: string | null, date2: string | null): boolean {
    if (!date1 || !date2) return false;
    return date1 > date2;
  },
};

export default dateUtils;
