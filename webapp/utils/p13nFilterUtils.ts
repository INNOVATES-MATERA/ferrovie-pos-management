import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import Table from "sap/m/Table";

/**
 * Builds a Filter array from the P13n state and applies it to the table binding.
 *
 * oState.Filter structure:
 *   { [propertyKey]: Array<{ operator: FilterOperator; values: any[] }> }
 *
 * Conditions on the same property are combined with AND.
 * Conditions across different properties are also combined with AND.
 */
function applyFromState(oState: any, oTable: Table): void {
    const aFilters = _buildFilters(oState);
    const oBinding = oTable.getBinding("items") as ODataListBinding;
    if (oBinding) {
        oBinding.filter(aFilters as any);
    }
}

function _buildFilters(oState: any): Filter[] {
    if (!oState.Filter) return [];

    return Object.entries(oState.Filter).reduce<Filter[]>(
        (aResult, [sKey, aConditions]) => {
            const aKeyFilters = _buildFiltersForKey(
                sKey,
                aConditions as Array<{ operator: FilterOperator; values: any[] }>
            );
            if (aKeyFilters.length > 0) {
                aResult.push(new Filter({ filters: aKeyFilters, and: true }));
            }
            return aResult;
        },
        []
    );
}

/**
 * Expands each condition's values array into individual Filter instances
 * for a single OData property.
 */
function _buildFiltersForKey(
    sKey: string,
    aConditions: Array<{ operator: FilterOperator; values: any[] }>
): Filter[] {
    return aConditions.flatMap(({ operator, values }) =>
        (values || []).map((vValue) => new Filter(sKey, operator, vValue))
    );
}

export default { applyFromState };
