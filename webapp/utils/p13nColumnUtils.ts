import Table from "sap/m/Table";
import Column from "sap/m/Column";

/**
 * Applies column visibility and order from the P13n state to the table.
 *
 * Algorithm:
 *  1. All p13n-managed columns are hidden.
 *  2. Columns listed in oState.Columns are made visible and repositioned
 *     in the order they appear in the state array.
 */
function applyVisibilityAndOrder(oState: any, oTable: Table): void {
    const aColumns = oTable.getColumns() as Column[];

    // 1. Hide all managed columns
    aColumns.forEach((oColumn) => {
        if ((oColumn as any).data("p13nKey")) {
            oColumn.setVisible(false);
        }
    });

    // 2. Re-show and re-insert in saved order
    (oState.Columns || []).forEach((oEntry: { key: string }, iIndex: number) => {
        const oColumn = aColumns.find(
            (c) => (c as any).data("p13nKey") === oEntry.key
        );
        if (oColumn) {
            oColumn.setVisible(true);
            oTable.removeColumn(oColumn);
            oTable.insertColumn(oColumn, iIndex);
        }
    });
}

/**
 * Applies saved column widths from the P13n state.
 */
function applyWidths(oState: any, oTable: Table): void {
    if (!oState.ColumnWidth) return;

    (oTable.getColumns() as Column[]).forEach((oColumn) => {
        const sKey = (oColumn as any).data("p13nKey") as string;
        if (sKey && oState.ColumnWidth[sKey]) {
            oColumn.setWidth(oState.ColumnWidth[sKey]);
        }
    });
}

export default { applyVisibilityAndOrder, applyWidths };
