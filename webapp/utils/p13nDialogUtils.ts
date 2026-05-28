import MetadataHelper from "sap/m/p13n/MetadataHelper";
import SelectionController from "sap/m/p13n/SelectionController";
import SortController from "sap/m/p13n/SortController";
import FilterController from "sap/m/p13n/FilterController";
import ColumnWidthController from "sap/m/table/ColumnWidthController";
import Engine from "sap/m/p13n/Engine";
import Table from "sap/m/Table";
import Column from "sap/m/Column";
import p13nColumnUtils from "./p13nColumnUtils";
import p13nSortUtils from "./p13nSortUtils";
import p13nFilterUtils from "./p13nFilterUtils";

/** Panel keys accepted by the P13n Engine. */
export type P13nPanel = "Columns" | "Sorter" | "Filter";

/**
 * Initial state snapshot captured at register() time (= view-XML defaults).
 * Keyed by table ID so multiple tables can be managed independently.
 */
const _mInitialStates = new Map<string, object>();

// ── Registration ──────────────────────────────────────────────────────────────

/**
 * Registers the table with the P13n Engine and wires up the state-change listener.
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
            Sorter: new SortController({
                control: oTable,
            }),
            Filter: new FilterController({
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
        p13nSortUtils.applyFromState(oState, oTable);
        p13nFilterUtils.applyFromState(oState, oTable);
    });
}

function _buildMetadataHelper(oTable: Table): MetadataHelper {
    const aMetadata = (oTable.getColumns() as Column[])
        .filter((oColumn) => !!(oColumn as any).data("p13nKey"))
        .map((oColumn) => {
            const sKey = (oColumn as any).data("p13nKey") as string;
            return {
                key: sKey,
                label: (oColumn.getHeader() as any).getText() as string,
                path: sKey,
            };
        });

    return new MetadataHelper(aMetadata);
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
        Sorter: [],
        Filter: {},
        ColumnWidth: {},
    };
}

// ── Dialog ────────────────────────────────────────────────────────────────────

/**
 * Opens the P13n settings dialog for the given table.
 *
 * @param oTable   - The registered sap.m.Table instance.
 * @param aPanels  - One or more panel keys: "Columns", "Sorter", "Filter".
 * @param oSource  - The button that triggered the dialog (for popover positioning).
 */
function open(oTable: Table, aPanels: P13nPanel | P13nPanel[], oSource: any): void {
    const aPanelList = Array.isArray(aPanels) ? aPanels : [aPanels];
    const bMultiple = aPanelList.length > 1;

    Engine.getInstance().show(oTable, aPanelList, {
        contentHeight: (bMultiple ? "50rem" : "35rem") as unknown as object,
        contentWidth: (bMultiple ? "45rem" : "32rem") as unknown as object,
        source: oSource ?? oTable,
        // Intercept the "Resetta" button inside the dialog.
        // Engine.reset() alone does not clear xConfig (where filter/sort state lives),
        // and does not fire stateChange — so we must do both manually.
        reset: async (oControl: any, aKeys: string[]) => {
            _clearXConfig(oControl);
            await (Engine.getInstance() as any).reset(oControl, aKeys);
            const oInitialState = _mInitialStates.get(oControl.getId()) as any;
            if (oInitialState) {
                p13nColumnUtils.applyVisibilityAndOrder(oInitialState, oControl);
                p13nColumnUtils.applyWidths(oInitialState, oControl);
                p13nSortUtils.applyFromState({ Sorter: [] }, oControl);
                p13nFilterUtils.applyFromState({ Filter: {} }, oControl);
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

// ── Reset ─────────────────────────────────────────────────────────────────────

/**
 * Resets all P13n personalization (columns, sort, filter, widths)
 * and restores the table to the state captured at register() time.
 *
 * Engine.reset() clears the internal Engine state for each controller,
 * which ensures dialogs re-open empty. Then we manually restore the
 * default column visibility and clear the OData binding sort/filters.
 */
async function reset(oTable: Table): Promise<void> {
    const oInitialState = _mInitialStates.get(oTable.getId()) as any;
    if (!oInitialState) return;

    // The P13n Engine stores all personalization (filter conditions, sort, column order)
    // in a custom data entry keyed "xConfig" on the control. Without flex/variant
    // management, Engine.reset() and applyState() do not clear this entry, so dialogs
    // always re-open showing the old state. Removing the entry directly is the only
    // reliable way to wipe it.
    _clearXConfig(oTable);

    // Re-initialize the Engine's internal registry so controllers refresh
    // their cached state from the now-empty xConfig.
    await (Engine.getInstance() as any).reset(oTable);

    // Restore default column visibility/order and clear the OData binding.
    p13nColumnUtils.applyVisibilityAndOrder(oInitialState, oTable);
    p13nColumnUtils.applyWidths(oInitialState, oTable);
    p13nSortUtils.applyFromState({ Sorter: [] }, oTable);
    p13nFilterUtils.applyFromState({ Filter: {} }, oTable);
}

export default { register, open, reset };
