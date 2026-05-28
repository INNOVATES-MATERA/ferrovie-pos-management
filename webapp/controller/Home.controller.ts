import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import tableSettingsUtils from "../utils/tableSettingsUtils";
import entityUtils from "../utils/entityUtils";
import dateUtils from "../utils/dateUtils";
import xlsxUtils from "../utils/xlsxUtils";
import Table from "sap/ui/table/Table";

const DEFAULT_MODEL = {
    count: 0,
    filters: { qFilter: "" },
};

/**
 * @namespace posmanagement.controller
 */
export default class Home extends BaseController {
    public dateUtils = dateUtils;
    private _oModelPos!: JSONModel;

    public onInit(): void {
        this._oModelPos = new JSONModel(structuredClone(DEFAULT_MODEL));
        this.setModel(this._oModelPos, "Pos");

        this.getRouter()
            .getRoute("RouteHome")!
            .attachPatternMatched(this._onRouteMatched, this);
    }

    public onAfterRendering(): void {
        const oTable = this.byId("tblPos") as Table;
        if (oTable) {
            tableSettingsUtils.registerForP13n(oTable);
        }
    }

    private async _onRouteMatched(): Promise<void> {
        try {
            this.setBusy(true);
            await this._applyFilters();
        } catch (e) {
            entityUtils.handleError(e as Error);
        } finally {
            this.setBusy(false);
        }
    }

    public async onReset(): Promise<void> {
        try {
            this.setBusy(true);
            this._oModelPos.setProperty("/filters/qFilter", "");
            const oTable = this.byId("tblPos") as Table;
            await tableSettingsUtils.resetTable(oTable);
            await this._applyFilters();
        } catch (e) {
            entityUtils.handleError(e as Error);
        } finally {
            this.setBusy(false);
        }
    }

    public async onFiltersChange(): Promise<void> {
        try {
            this.setBusy(true);
            await this._applyFilters();
        } catch (e) {
            entityUtils.handleError(e as Error);
        } finally {
            this.setBusy(false);
        }
    }

    public onSettings(oEvent: any): void {
        const oTable = this.byId("tblPos") as Table;
        const sPanel = oEvent.getSource().data("panel") as string;
        tableSettingsUtils.open(oTable, sPanel, oEvent.getSource());
    }

    public async onDownload(): Promise<void> {
        const oTable = this.byId("tblPos") as Table;
        const oBinding = oTable.getBinding("rows") as ODataListBinding;
        const aContexts = await oBinding.requestContexts(0, Infinity);
        const aData = aContexts.map((ctx) => ctx.getObject());
        const aColumns = xlsxUtils.getColumnsFromTable(this, oTable);
        await xlsxUtils.generateSpreadsheet(aColumns, aData, "GestionePOS.xlsx");
    }

    public onDetail(oEvent: any): void {
        const oContext = oEvent.getSource().getParent().getBindingContext();
        if (!oContext) return;
        const oRow = oContext.getObject() as { codiceContratto: string };
        this.navTo("RouteContract", { contractCode: oRow.codiceContratto });
    }

    private async _applyFilters(): Promise<void> {
        const qFilter = (this._oModelPos.getProperty("/filters/qFilter") as string ?? "");
        const aODataFields = ["codiceContratto", "titoloDelContratto", "oggettoDelContratto", "codiceNPP", "CUP", "CIGDerivato"];
        const aFilters = entityUtils.setFilters({ qFilter }, aODataFields);
        const oTable = this.byId("tblPos") as Table;
        const oBinding = oTable.getBinding("rows") as ODataListBinding;
        oBinding.filter(aFilters);
        oBinding.attachEventOnce("dataReceived", () => {
            this._oModelPos.setProperty("/count", oBinding.getLength());
        });
    }

}
