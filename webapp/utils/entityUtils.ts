import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import MessageBox from "sap/m/MessageBox";

const entityUtils = {
    setFilterEQ(aFilters: Filter[], sProperty: string, sValue: string): void {
        if (sValue) {
            aFilters.push(new Filter(sProperty, FilterOperator.EQ, sValue));
        }
    },

    setFilterGE(aFilters: Filter[], sProperty: string, sValue: string): void {
        if (sValue) {
            aFilters.push(new Filter(sProperty, FilterOperator.GE, sValue));
        }
    },

    setFilterLE(aFilters: Filter[], sProperty: string, sValue: string): void {
        if (sValue) {
            aFilters.push(new Filter(sProperty, FilterOperator.LE, sValue));
        }
    },

    setFilterBT(aFilters: Filter[], sProperty: string, sFrom: string, sTo: string): void {
        if (sFrom && sTo) {
            aFilters.push(new Filter(sProperty, FilterOperator.BT, sFrom, sTo));
        } else if (sFrom && !sTo) {
            this.setFilterGE(aFilters, sProperty, sFrom);
        } else if (!sFrom && sTo) {
            this.setFilterLE(aFilters, sProperty, sTo);
        }
    },

    setFilterContains(aFilters: Filter[], sProperty: string, sValue: string): void {
        if (sValue) {
            aFilters.push(new Filter(sProperty, FilterOperator.Contains, String(sValue)));
        }
    },

    handleError(error: Error): void {
        console.error(error);
        MessageBox.error(error.message);
    },

    setFilters(oFilters: Record<string, string>, aFields: string[]): Filter[] {
        const aFilters: Filter[] = [];

        Object.entries(oFilters)
            .filter(([, value]) => value !== undefined && value !== null && value !== "")
            .forEach(([key, value]) => {
                if (key === "qFilter") {
                    const aOrFilters: Filter[] = [];
                    aFields.forEach((f) => {
                        this.setFilterContains(aOrFilters, f, value);
                    });
                    aFilters.push(new Filter({ filters: aOrFilters, and: false }));
                    return;
                }
                this.setFilterEQ(aFilters, key, value);
            });

        return aFilters;
    },
};

export default entityUtils;
