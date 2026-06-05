const dateUtils = {
    formatDateToYYYYMMDD(oDate: Date | null): string | null {
        if (!oDate) return null;
        if (oDate instanceof Date) {
            const year = oDate.getFullYear();
            const month = String(oDate.getMonth() + 1).padStart(2, "0");
            const day = String(oDate.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        }
        return null;
    },

    formatYYYYMMDDtoDDMMYYYY(sDate: string): string {
        if (!sDate) return "";
        const sStr = String(sDate);
        // Handle both "2026-06-12" and "2026-06-12T..." formats without timezone issues
        const match = sStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return "";
        return `${match[3]}/${match[2]}/${match[1]}`;
    },

    formatISOtoDDMMYYYY_HHMMSS(sDate: string): string {
        if (!sDate) return "";
        const oDate = new Date(sDate);
        if (isNaN(oDate.getTime())) return "";
        const sDay = ("0" + oDate.getUTCDate()).slice(-2);
        const sMonth = ("0" + (oDate.getUTCMonth() + 1)).slice(-2);
        const sYear = oDate.getUTCFullYear();
        const sHours = ("0" + oDate.getUTCHours()).slice(-2);
        const sMinutes = ("0" + oDate.getUTCMinutes()).slice(-2);
        const sSeconds = ("0" + oDate.getUTCSeconds()).slice(-2);
        return `${sDay}/${sMonth}/${sYear} ${sHours}:${sMinutes}:${sSeconds}`;
    },

    formatISOStringToYYYYMMDD(sDate: string | null): string | null {
        if (!sDate) return null;
        return sDate.substring(0, 10);
    },

    isDateAfter(date1: string | null, date2: string | null): boolean {
        if (!date1 || !date2) return false;
        return date1 > date2;
    },
};

export default dateUtils;
