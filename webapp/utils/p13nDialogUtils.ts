import MetadataHelper from "sap/m/p13n/MetadataHelper";
import SelectionController from "sap/m/p13n/SelectionController";
import ColumnWidthController from "sap/m/table/ColumnWidthController";
import Engine from "sap/m/p13n/Engine";
import Table from "sap/m/Table";
import Column from "sap/m/Column";
import ColumnMenu from "sap/m/table/columnmenu/Menu";
import QuickSort from "sap/m/table/columnmenu/QuickSort";
import QuickSortItem from "sap/m/table/columnmenu/QuickSortItem";
import { SortOrder } from "sap/ui/core/library";
import p13nColumnUtils from "./p13nColumnUtils";

/** Panel keys accepted by the P13n Engine. Only column personalization (visibility/order/width). */
export type P13nPanel = "Columns";

/**
 * Initial state snapshot captured at register() time (= view-XML defaults).
 * Keyed by table ID so multiple tables can be managed independently.
 */
const _mInitialStates = new Map<string, object>();

// ── Registration ──────────────────────────────────────────────────────────────

/**
 * Registers the table with the P13n Engine (column visibility/order/width only)
 * and wires up the state-change listener.
 * Must be called once after the table is rendered (e.g. in onAfterRendering).
 * Captures the initial column state (visibility = view-XML defaults) for reset().
 */
function register(oTable: Table): void {
    const oMetadataHelper = _buildMetadataHelper(oTable);

    Engine.getInstance().register(oTable, {
        helper: oMetadataHelper,
        controller: {
            Columns: new SelectionController({
                targetAggregation: "columns",
                control: oTable,
            }),
            ColumnWidth: new ColumnWidthController({
                control: oTable,
            }),
        },
    });

    // Snapshot the default state now, while column visibility still reflects the view XML.
    _mInitialStates.set(oTable.getId(), _buildInitialState(oTable));

    Engine.getInstance().attachStateChange((oEvent: any) => {
        if (oEvent.getParameter("control").getId() !== oTable.getId()) return;

        const oState = oEvent.getParameter("state");
        if (!oState) return;

        p13nColumnUtils.applyVisibilityAndOrder(oState, oTable);
        p13nColumnUtils.applyWidths(oState, oTable);
    });
}

function _buildMetadataHelper(oTable: Table): MetadataHelper {
    const aMetadata = (oTable.getColumns() as Column[])
        .filter((oColumn) => !!(oColumn as any).data("p13nKey"))
        .map((oColumn) => {
            const sKey = (oColumn as any).data("p13nKey") as string;
            return {
                key: sKey,
                label: _getColumnHeaderText(oColumn),
                path: sKey,
            };
        });

    return new MetadataHelper(aMetadata);
}

/**
 * Extracts the column header text, needed both by the MetadataHelper (label shown
 * in the column-settings dialog) and by assignColumnMenus (label shown in the
 * QuickSort menu entry).
 */
function _getColumnHeaderText(oColumn: Column): string {
    const oHeader = oColumn.getHeader() as any;
    if (oHeader && typeof oHeader.getText === "function") {
        return oHeader.getText() as string;
    }
    return "";
}

/**
 * Builds the "factory default" P13n state from the current column setup.
 * Called once at register time, before any personalization is applied.
 */
function _buildInitialState(oTable: Table): object {
    const aVisibleColumns = (oTable.getColumns() as Column[])
        .filter((oCol) => !!(oCol as any).data("p13nKey") && oCol.getVisible())
        .map((oCol) => ({ key: (oCol as any).data("p13nKey") as string }));

    return {
        Columns: aVisibleColumns,
        ColumnWidth: {},
    };
}

// ── QuickSort (column header menu) ────────────────────────────────────────────

/**
 * Assigns a header menu with a QuickSort action to every column carrying a
 * `p13nKey`, matching the pattern used by the "Contratti Applicativi" table
 * (fs_monitoraggio_cantieri_cardellini). Replaces the previous click-to-sort
 * Link+Icon header combo.
 *
 * @param oTable  - The sap.m.Table instance.
 * @param onSort  - Called with (sKey, sSortOrder) whenever the user picks a sort
 *                  order from the menu. sSortOrder is "None" | "Ascending" | "Descending".
 */
function assignColumnMenus(oTable: Table, onSort: (sKey: string, sSortOrder: string) => void): void {
    (oTable.getColumns() as Column[]).forEach((oColumn) => {
        if (oColumn.getHeaderMenu()) return;

        const sKey = (oColumn as any).data("p13nKey") as string;
        const sLabel = _getColumnHeaderText(oColumn);
        if (!sKey || !sLabel) return;

        oColumn.setHeaderMenu(
            new ColumnMenu({
                quickActions: [
                    new QuickSort({
                        items: new QuickSortItem({ key: sKey, label: sLabel }),
                        change: (oEvent: any) => {
                            const oItem = oEvent.getParameter("item");
                            const sSortOrder = oItem.getSortOrder() as SortOrder;

                            (oTable.getColumns() as Column[]).forEach((oOtherColumn) => {
                                oOtherColumn.setSortIndicator(oOtherColumn === oColumn ? sSortOrder : SortOrder.None);
                            });

                            onSort(oItem.getKey() as string, sSortOrder);
                        },
                    }),
                ],
            })
        );
    });
}

// ── Dialog ────────────────────────────────────────────────────────────────────

/**
 * Opens the P13n column-settings dialog for the given table.
 *
 * @param oTable   - The registered sap.m.Table instance.
 * @param aPanels  - One or more panel keys (only "Columns" is supported).
 * @param oSource  - The button that triggered the dialog (for popover positioning).
 */
function open(oTable: Table, aPanels: P13nPanel | P13nPanel[], oSource: any): void {
    const aPanelList = Array.isArray(aPanels) ? aPanels : [aPanels];

    Engine.getInstance().show(oTable, aPanelList, {
        contentHeight: "35rem" as unknown as object,
        contentWidth: "32rem" as unknown as object,
        source: oSource ?? oTable,
        // Intercept the "Resetta" button inside the dialog.
        // Engine.reset() alone does not clear xConfig (where the state lives),
        // and does not fire stateChange — so we must do both manually.
        reset: async (oControl: any, aKeys: string[]) => {
            _clearXConfig(oControl);
            await (Engine.getInstance() as any).reset(oControl, aKeys);
            const oInitialState = _mInitialStates.get(oControl.getId()) as any;
            if (oInitialState) {
                p13nColumnUtils.applyVisibilityAndOrder(oInitialState, oControl);
                p13nColumnUtils.applyWidths(oInitialState, oControl);
            }
        },
    } as any);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _clearXConfig(oTable: Table): void {
    const oXConfig = oTable.getCustomData().find((cd: any) => cd.getKey() === "xConfig");
    if (oXConfig) {
        oTable.removeCustomData(oXConfig);
        oXConfig.destroy();
    }
}

export default { register, open, assignColumnMenus };
