import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import p13nDialogUtils from "../utils/p13nDialogUtils";
import p13nColumnUtils from "../utils/p13nColumnUtils";
import dateUtils from "../utils/dateUtils";
import xlsxUtils from "../utils/xlsxUtils";
import Table from "sap/m/Table";
import Sorter from "sap/ui/model/Sorter";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import FilterType from "sap/ui/model/FilterType";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";

const DEFAULT_MODEL = {
  count: 0,
};

/**
 * @namespace posmanagement.controller
 */
export default class PosList extends BaseController {
  public dateUtils = dateUtils;

  private _oModelPos!: JSONModel;
  private _bP13nRegistered = false;
  private _sSearchQuery = "";

  public onInit(): void {
    this._oModelPos = new JSONModel(structuredClone(DEFAULT_MODEL));
    this.setModel(this._oModelPos, "Pos");

    this.getRouter().getRoute("RoutePosList")!.attachPatternMatched(this._onRouteMatched, this);
  }

  public onAfterRendering(): void {
    if (this._bP13nRegistered) return;
    const oTable = this.byId("tblPos") as Table;
    if (oTable) {
      p13nDialogUtils.register(oTable);
      p13nDialogUtils.assignColumnMenus(oTable, this._onQuickSort.bind(this, oTable));
      this._attachCountUpdate(oTable);
      this._bP13nRegistered = true;
    }
  }

  private _attachCountUpdate(oTable: Table): void {
    const oBinding = oTable.getBinding("items") as ODataListBinding;
    if (!oBinding) return;

    oBinding.attachEvent("change", () => {
      const iCount = oBinding.getCount();
      if (iCount !== undefined) {
        this._oModelPos.setProperty("/count", iCount);
      }
    });
  }

  private _onRouteMatched(): void {
    const oTable = this.byId("tblPos") as Table;
    (oTable.getBinding("items") as ODataListBinding)?.refresh();
  }

  public onSettings(oEvent: any): void {
    const oTable = this.byId("tblPos") as Table;
    const sPanel = oEvent.getSource().data("panel") as string;
    p13nDialogUtils.open(oTable, sPanel as any, oEvent.getSource());
  }

  private _onQuickSort(oTable: Table, sKey: string, sSortOrder: string): void {
    const oBinding = oTable.getBinding("items") as ODataListBinding;
    if (!oBinding) return;

    const aSorters = sSortOrder === "None" ? [] : [new Sorter(sKey, sSortOrder === "Descending")];
    oBinding.sort(aSorters);
  }

  public onSearch(oEvent: any): void {
    this._sSearchQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
    this._applySearchFilter();
  }

  private _applySearchFilter(): void {
    const oTable = this.byId("tblPos") as Table;
    const oBinding = oTable.getBinding("items") as ODataListBinding;
    if (!oBinding) return;

    if (!this._sSearchQuery) {
      oBinding.filter([], FilterType.Control);
      return;
    }

    // Solo le colonne attualmente visibili (app:searchable="false" esclude i campi
    // non Edm.String, es. "revisione", su cui FilterOperator.Contains non è supportato).
    const aSearchableFields = p13nColumnUtils.getVisibleP13nKeys(oTable);
    const aOrFilters = aSearchableFields.map(
      (sField) =>
        new Filter({
          path: sField,
          operator: FilterOperator.Contains,
          value1: this._sSearchQuery,
          caseSensitive: false,
        })
    );
    oBinding.filter([new Filter({ filters: aOrFilters, and: false })], FilterType.Control);
  }

  public async onDownload(): Promise<void> {
    const oTable = this.byId("tblPos") as Table;
    const oBinding = oTable.getBinding("items") as ODataListBinding;
    const aContexts = await this.getAllContexts(oBinding);
    const aData = aContexts.map((ctx) => ctx.getObject());
    const aColumns = xlsxUtils.getColumnsFromTable(this, oTable);
    await xlsxUtils.generateSpreadsheet(aColumns, aData, "GestionePOS.xlsx");
  }

  public onNewPos(): void {
    this.getRouter().navTo("RoutePosNew");
  }

  public onDetail(oEvent: any): void {
    const oContext = oEvent.getSource().getBindingContext();
    if (!oContext) return;
    const oRow = oContext.getObject() as { idPos: string; contratto: string };
    this.navTo("RoutePos", {
      contractCode: oRow.contratto,
      posId: oRow.idPos,
    });
  }

  public onDelete(oEvent: any): void {
    const oContext = oEvent.getSource().getBindingContext();
    if (!oContext) return;
    const oRow = oContext.getObject() as { idPos: string };

    MessageBox.confirm(this.getText("msgConfirmDeletePos"), {
      onClose: async (sAction: string | null) => {
        if (sAction !== MessageBox.Action.OK) return;
        const oTable = this.byId("tblPos") as Table;
        const bSuccess = await this.deleteEntitiesBatch("/PosTestataSet", [{ idPos: oRow.idPos }]);
        if (bSuccess) {
          MessageBox.success(this.getText("msgDeleteSuccess"));
        }
        (oTable.getBinding("items") as ODataListBinding).refresh();
      },
    });
  }
}
