import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import p13nDialogUtils from "../utils/p13nDialogUtils";
import entityUtils from "../utils/entityUtils";
import dateUtils from "../utils/dateUtils";
import xlsxUtils from "../utils/xlsxUtils";
import Table from "sap/m/Table";
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
