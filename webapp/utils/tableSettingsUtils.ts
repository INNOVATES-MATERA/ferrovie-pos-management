import MetadataHelper from "sap/m/p13n/MetadataHelper";
import SelectionController from "sap/m/p13n/SelectionController";
import SortController from "sap/m/p13n/SortController";
import GroupController from "sap/m/p13n/GroupController";
import FilterController from "sap/m/p13n/FilterController";
import ColumnWidthController from "sap/m/table/ColumnWidthController";
import Engine from "sap/m/p13n/Engine";
import Sorter from "sap/ui/model/Sorter";
import Filter from "sap/ui/model/Filter";
import Table from "sap/ui/table/Table";
import Column from "sap/ui/table/Column";
import * as coreLibrary from "sap/ui/core/library";

const tableSettingsUtils = {
    oMetadataHelper: null as MetadataHelper | null,

    getMetadataHelper(oTable: Table): MetadataHelper {
        const aMetadata = oTable
            .getColumns()
            .filter((c: Column) => (c as any).data("p13nKey"))
            .map((c: Column) => {
                return {
                    key: (c as any).data("p13nKey") as string,
                    label: (c.getLabel() as any).getText() as string,
                    path: (c as any).data("p13nKey") as string,
                };
            });

        return new MetadataHelper(aMetadata);
    },

    registerForP13n(oTable: Table): void {
        this.oMetadataHelper = this.getMetadataHelper(oTable);

        Engine.getInstance().register(oTable, {
            helper: this.oMetadataHelper,
            controller: {
                Columns: new SelectionController({
                    targetAggregation: "columns",
                    control: oTable,
                }),
                Sorter: new SortController({
                    control: oTable,
                }),
                Groups: new GroupController({
                    control: oTable,
                }),
                ColumnWidth: new ColumnWidthController({
                    control: oTable,
                }),
                Filter: new FilterController({
                    control: oTable,
                }),
            },
        });

        Engine.getInstance().attachStateChange(
            function (this: typeof tableSettingsUtils, oEvent: any) {
                const oChangedTable = oEvent.getParameter("control");
                if (oChangedTable.getId() === oTable.getId()) {
                    this.handleStateChange(oEvent, oTable, this.oMetadataHelper!);
                }
            }.bind(this)
        );
    },

    open(oTable: Table, aPanels: string | string[], oSource: any): void {
        const panels = Array.isArray(aPanels) ? aPanels : [aPanels];
        Engine.getInstance().show(oTable, panels, {
            contentHeight: (panels.length > 1 ? "50rem" : "35rem") as unknown as object,
            contentWidth: (panels.length > 1 ? "45rem" : "32rem") as unknown as object,
            source: oSource || oTable,
        });
    },

    handleStateChange(oEvent: any, oTable: Table, oMetadata: MetadataHelper): void {
        const oState = oEvent.getParameter("state");
        if (!oState) return;

        this.updateColumns(oState, oTable);

        const aSorters = (oState.Sorter || []).map((s: any) => {
            return new Sorter(s.key, s.descending);
        });

        const aFilters: Filter[] = [];

        if (oState.Filter) {
            Object.keys(oState.Filter).forEach((key) => {
                const aFilterConditions = oState.Filter[key];
                const aAndFilters: Filter[] = [];

                aFilterConditions.forEach((f: any) => {
                    (f.values || []).forEach((v: any) => {
                        aAndFilters.push(new Filter(key, f.operator, v));
                    });
                });

                if (aAndFilters.length > 0) {
                    aFilters.push(new Filter({ filters: aAndFilters, and: true }));
                }
            });
        }

        const oBinding = oTable.getBinding("rows") as any;
        if (oBinding) {
            oBinding.sort(aSorters);
            oBinding.filter(aFilters);
        }
    },

    updateColumns(oState: any, oTable: Table): void {
        const aColumns = oTable.getColumns() as Column[];

        aColumns.forEach((oColumn: Column) => {
            const key = (oColumn as any).data("p13nKey");

            if (key) {
                oColumn.setVisible(false);
                (oColumn as any).setSortOrder(coreLibrary.SortOrder.None);

                if (oState.ColumnWidth && oState.ColumnWidth[key]) {
                    oColumn.setWidth(oState.ColumnWidth[key]);
                }
            } else {
                oColumn.setVisible(true);
            }
        });

        // Rimuovi le colonne senza p13nKey (action columns) e reinseriscile alla fine
        const aActionColumns = aColumns.filter((c: Column) => !(c as any).data("p13nKey"));
        aActionColumns.forEach((c: Column) => oTable.removeColumn(c));

        (oState.Columns || []).forEach((oProp: any, index: number) => {
            const oColumn = aColumns.find((c: Column) => (c as any).data("p13nKey") === oProp.key);
            if (oColumn) {
                oColumn.setVisible(true);
                oTable.removeColumn(oColumn);
                oTable.insertColumn(oColumn, index);
            }
        });

        // Reinserisci le action columns sempre in fondo
        aActionColumns.forEach((c: Column) => oTable.addColumn(c));
    },

    async resetTable(oTable: Table): Promise<void> {
        const oEngine = Engine.getInstance();
        await (oEngine as any).reset(oTable);
    },
};

export default tableSettingsUtils;
