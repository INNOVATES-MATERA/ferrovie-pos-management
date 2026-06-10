import Sorter from "sap/ui/model/Sorter";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import Table from "sap/m/Table";

/**
 * Builds a Sorter array from the P13n state and applies it to the table binding.
 *
 * oState.Sorter structure:
 *   Array<{ key: string; descending: boolean }>
 */
function applyFromState(oState: any, oTable: Table): void {
    const aSorters = _buildSorters(oState);
    const oBinding = oTable.getBinding("items") as ODataListBinding;
    if (oBinding) {
        oBinding.sort(aSorters as any);
    }
}

function _buildSorters(oState: any): Sorter[] {
    return (oState.Sorter || []).map(
        (oEntry: { key: string; descending: boolean }) =>
            new Sorter(oEntry.key, oEntry.descending)
    );
}

export default { applyFromState };
