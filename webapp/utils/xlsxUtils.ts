import Spreadsheet from "sap/ui/export/Spreadsheet";
import * as exportLib from "sap/ui/export/library";

const xlsxUtils = {
    EdmType: exportLib.EdmType,

    /**
     * Sostituisce nei dati da esportare i valori booleani con una "X" (vero) o con una cella vuota (falso).
     * @param oRow riga di dati da esportare
     * @returns copia della riga con i booleani convertiti
     */
    formatBooleans(oRow: object): object {
        return Object.fromEntries(
            Object.entries(oRow).map(([sKey, vValue]) => [sKey, typeof vValue === "boolean" ? (vValue ? "X" : "") : vValue]),
        );
    },

    generateSpreadsheet(aColumns: object[], aData: object[], sFileName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const oSheet = new Spreadsheet({
                workbook: { columns: aColumns },
                dataSource: aData.map((oRow) => xlsxUtils.formatBooleans(oRow)),
                fileName: sFileName,
            });
            oSheet.build().then(resolve as any).catch(reject).finally(() => oSheet.destroy());
        });
    },

    getColumnsFromTable(_that: any, oTable: any): object[] {
        return (oTable.getColumns() as any[])
            .filter((c: any) => c.getVisible())
            .map((c: any) => {
                const sKey = c.data("p13nKey") as string;
                const sProp = (c.data("prop") as string) || sKey;
                if (!sKey) return null;
                const sLabel = c.getHeader()?.getText?.() ?? sKey;
                return {
                    label: sLabel,
                    property: sProp,
                };
            })
            .filter(Boolean) as object[];
    },
};

export default xlsxUtils;
