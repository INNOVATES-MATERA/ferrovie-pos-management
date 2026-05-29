import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import dateUtils from "../utils/dateUtils";
import xlsxUtils from "../utils/xlsxUtils";
import p13nDialogUtils from "../utils/p13nDialogUtils";
import Table from "sap/m/Table";

const DEFAULT_MODEL = {
  count: 0,
  sortCount: 0,
  filterCount: 0,
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

    this.getRouter().getRoute("RouteHome")!.attachPatternMatched(this._onRouteMatched, this);
  }

  public onAfterRendering(): void {
    const oTable = this.byId("tblPos") as Table;
    if (oTable) {
      p13nDialogUtils.register(oTable, (s, f) => {
        this._oModelPos.setProperty("/sortCount", s);
        this._oModelPos.setProperty("/filterCount", f);
      });
    }
  }

  private async _onRouteMatched(): Promise<void> {
    const oTable = this.byId("tblPos") as Table;
    const oBinding = oTable.getBinding("items") as ODataListBinding;
    oBinding.attachEventOnce("dataReceived", async () => {
      const iCount = await oBinding.getHeaderContext()!.requestProperty("$count");
      this._oModelPos.setProperty("/count", iCount);
    });
  }

  public async onReset(): Promise<void> {
    const oTable = this.byId("tblPos") as Table;
    await p13nDialogUtils.reset(oTable);
    this._oModelPos.setProperty("/sortCount", 0);
    this._oModelPos.setProperty("/filterCount", 0);
  }

  public onSettings(oEvent: any): void {
    const oTable = this.byId("tblPos") as Table;
    const sPanel = oEvent.getSource().data("panel") as "Columns" | "Sorter" | "Filter";
    p13nDialogUtils.open(oTable, sPanel, oEvent.getSource());
  }

  public async onDownload(): Promise<void> {
    const oTable = this.byId("tblPos") as Table;
    const oBinding = oTable.getBinding("items") as ODataListBinding;
    const aContexts = await oBinding.requestContexts(0, Infinity);
    const aData = aContexts.map((ctx) => ctx.getObject());
    const aColumns = xlsxUtils.getColumnsFromTable(this, oTable);
    await xlsxUtils.generateSpreadsheet(aColumns, aData, "GestionePOS.xlsx");
  }

  public onDetail(oEvent: any): void {
    const oContext = oEvent.getSource().getBindingContext();
    if (!oContext) return;
    const oRow = oContext.getObject() as { codiceContratto: string };
    this.navTo("RouteContract", { contractCode: oRow.codiceContratto });
  }
}
