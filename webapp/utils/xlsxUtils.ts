import Spreadsheet from "sap/ui/export/Spreadsheet";
import * as exportLib from "sap/ui/export/library";

const xlsxUtils = {
    EdmType: exportLib.EdmType,

    generateSpreadsheet(aColumns: object[], aData: object[], sFileName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const oSheet = new Spreadsheet({
                workbook: { columns: aColumns },
                dataSource: aData,
                fileName: sFileName,
            });
            oSheet.build().then(resolve as any).catch(reject).finally(() => oSheet.destroy());
        });
    },

    getColumnsFromTable(that: any, oTable: any): object[] {
        return (oTable._getVisibleColumns() as any[])
            .map((c: any) => {
                const sKey = c.data("p13nKey") as string;
                const sI18nKey = c.data("i18nKey") as string;
                const sProp = (c.data("prop") as string) || sKey;
                if (!sKey) return null;
                const sLabel = sI18nKey
                    ? that.getText(sI18nKey)
                    : that.getText(`lbl_${sKey}`);
                return {
                    label: sLabel,
                    property: sProp,
                };
            })
            .filter(Boolean) as object[];
    },
};

export default xlsxUtils;
