import Table from "sap/m/Table";
import Column from "sap/m/Column";

/**
 * Applies column visibility and order from the P13n state to the table.
 *
 * Uses setOrder() instead of removeColumn/insertColumn so that cells in
 * ColumnListItem rows are never displaced (sap.m.Table cells stay in
 * their original DOM position; only the column header order changes visually).
 */
function applyVisibilityAndOrder(oState: any, oTable: Table): void {
    if (!oState.Columns?.length) return;

    const aColumns = oTable.getColumns() as Column[];

    // Hide all managed columns
    aColumns.forEach((oColumn) => {
        if ((oColumn as any).data("p13nKey")) {
            oColumn.setVisible(false);
        }
    });

    // Make visible and set visual order via setOrder (does not move cells)
    (oState.Columns || []).forEach((oEntry: { key: string }, iIndex: number) => {
        const oColumn = aColumns.find(
            (c) => (c as any).data("p13nKey") === oEntry.key
        );
        if (oColumn) {
            oColumn.setVisible(true);
            (oColumn as any).setOrder(iIndex);
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

/**
 * Returns the p13nKey of every column currently visible in the table, excluding
 * columns explicitly marked app:searchable="false" (e.g. Date/Decimal/Int32 fields
 * that FilterOperator.Contains cannot run against on the OData v4 backend).
 * Used to scope free-text search to what the user actually sees.
 */
function getVisibleP13nKeys(oTable: Table): string[] {
    return (oTable.getColumns() as Column[])
        .filter(
            (oColumn) =>
                !!(oColumn as any).data("p13nKey") &&
                oColumn.getVisible() &&
                (oColumn as any).data("searchable") !== "false"
        )
        .map((oColumn) => (oColumn as any).data("p13nKey") as string);
}

export default { applyVisibilityAndOrder, applyWidths, getVisibleP13nKeys };
