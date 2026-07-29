import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import p13nDialogUtils from "../utils/p13nDialogUtils";
import p13nColumnUtils from "../utils/p13nColumnUtils";
import entityUtils from "../utils/entityUtils";
import dateUtils from "../utils/dateUtils";
import xlsxUtils from "../utils/xlsxUtils";
import Table from "sap/m/Table";
import Column from "sap/m/Column";
import Icon from "sap/ui/core/Icon";
import Link from "sap/m/Link";
import Sorter from "sap/ui/model/Sorter";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";

const DEFAULT_MODEL = {
  count: 0,
  sortCount: 0,
  filterCount: 0,
};

/**
 * @namespace posmanagement.controller
 */
export default class PosList extends BaseController {
  public dateUtils = dateUtils;

  private _oModelPos!: JSONModel;
  private _bP13nRegistered = false;
  private _oColumnSortState: { key: string; state: "asc" | "desc" } | null = null;
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
      p13nDialogUtils.register(oTable, (s, f) => {
        this._oModelPos.setProperty("/sortCount", s);
        this._oModelPos.setProperty("/filterCount", f);
      });
      this._bP13nRegistered = true;
    }
  }

  private _onRouteMatched(): void {
    const oTable = this.byId("tblPos") as Table;
    const oBinding = oTable.getBinding("items") as ODataListBinding;
    if (!oBinding) return;
    oBinding.attachEventOnce("dataReceived", async () => {
      const iCount = await oBinding.getHeaderContext()!.requestProperty("$count");
      this._oModelPos.setProperty("/count", iCount);
    });
    oBinding.refresh();
  }

  public async onReset(): Promise<void> {
    try {
      const oTable = this.byId("tblPos") as Table;
      await p13nDialogUtils.reset(oTable);
      this._oModelPos.setProperty("/sortCount", 0);
      this._oModelPos.setProperty("/filterCount", 0);
    } catch (e) {
      entityUtils.handleError(e as Error);
    }
  }

  public onSettings(oEvent: any): void {
    const oTable = this.byId("tblPos") as Table;
    const sPanel = oEvent.getSource().data("panel") as string;
    p13nDialogUtils.open(oTable, sPanel as any, oEvent.getSource());
  }

  public onColumnSort(oEvent: any): void {
    const oLink = oEvent.getSource() as Link;
    const sKey = oLink.data("sortKey") as string;
    const oCurrentState = this._oColumnSortState;
    const bSameColumn = oCurrentState && oCurrentState.key === sKey;

    let sNextState: "asc" | "desc" | null;
    if (!bSameColumn) {
      sNextState = "asc";
    } else if (oCurrentState!.state === "asc") {
      sNextState = "desc";
    } else {
      sNextState = null;
    }

    this._oColumnSortState = sNextState ? { key: sKey, state: sNextState } : null;
    this._updateSortHeaders(sKey, sNextState);

    const oTable = this.byId("tblPos") as Table;
    const oBinding = oTable.getBinding("items") as ODataListBinding;
    if (!oBinding) return;

    const aSorters = this._oColumnSortState
      ? [new Sorter(this._oColumnSortState.key, this._oColumnSortState.state === "desc")]
      : [];
    oBinding.sort(aSorters);
  }

  private _updateSortHeaders(sKey: string, sState: "asc" | "desc" | null): void {
    const oTable = this.byId("tblPos") as Table;
    if (!oTable) return;

    (oTable.getColumns() as Column[]).forEach((oColumn) => {
      const oHeader = oColumn.getHeader() as any;
      if (!oHeader?.getItems) return;
      const oLink = oHeader.getItems()[0] as Link;
      const oIcon = oHeader.getItems()[1] as Icon;
      if (!oLink || !oIcon) return;

      if (oLink.data("sortKey") === sKey && sState) {
        oIcon.setSrc(sState === "desc" ? "sap-icon://sort-descending" : "sap-icon://sort-ascending");
        oIcon.setVisible(true);
      } else {
        oIcon.setVisible(false);
      }
    });
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
      oBinding.filter([]);
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
    oBinding.filter([new Filter({ filters: aOrFilters, and: false })]);
  }

  public async onDownload(): Promise<void> {
    const oTable = this.byId("tblPos") as Table;
    const oBinding = oTable.getBinding("items") as ODataListBinding;
    const aContexts = await oBinding.requestContexts(0, Infinity);
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

  public onDelete(): void {
    const oTable = this.byId("tblPos") as Table;
    const aSelected = oTable.getSelectedItems();
    if (!aSelected.length) {
      MessageBox.warning(this.getText("msg_no_selection"));
      return;
    }
    MessageBox.confirm(this.getText("msg_confirm_delete_pos"), {
      onClose: async (sAction: string | null) => {
        if (sAction === MessageBox.Action.OK) {
          const aIds = aSelected.map((item) => {
            const oCtx = item.getBindingContext();
            return (oCtx?.getObject() as { idPos: string }).idPos;
          });
          const bSuccess = await this.deleteEntitiesBatch(
            "/PosTestataSet",
            aIds.map((sId) => ({ idPos: sId }))
          );
          if (bSuccess) {
            MessageBox.success(this.getText("msg_delete_success"));
          }
          (oTable.getBinding("items") as ODataListBinding).refresh();
        }
      },
    });
  }
}
