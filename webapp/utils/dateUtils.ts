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
        const oDate = new Date(sDate);
        if (isNaN(oDate.getTime())) return "";
        const sDay = ("0" + oDate.getDate()).slice(-2);
        const sMonth = ("0" + (oDate.getMonth() + 1)).slice(-2);
        const sYear = oDate.getFullYear();
        return `${sDay}/${sMonth}/${sYear}`;
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
};

export default dateUtils;
