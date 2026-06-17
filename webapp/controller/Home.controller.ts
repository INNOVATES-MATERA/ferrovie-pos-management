import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import Table from "sap/m/Table";
import dateUtils from "../utils/dateUtils";
import entityUtils from "../utils/entityUtils";

const DEFAULT_DASHBOARD = {
  posInserted: 0,
  posToInsert: 0,
};

/**
 * @namespace posmanagement.controller
 */
export default class Home extends BaseController {
  public dateUtils = dateUtils;
  private _oModelDashboard!: JSONModel;

  public onInit(): void {
    this._oModelDashboard = new JSONModel(structuredClone(DEFAULT_DASHBOARD));
    this.setModel(this._oModelDashboard, "Dashboard");

    this.getRouter().getRoute("RouteHome")!.attachPatternMatched(this._onRouteMatched, this);
  }

  private async _onRouteMatched(): Promise<void> {
    (this.byId("tblLatestPos") as Table).getBinding("items")?.refresh();
    try {
      const [oPos, oContracts] = await Promise.all([
        this.getEntitySet<{ contratto: string }>("/PosTestataSet"),
        this.getEntitySet<{ codiceContratto: string }>("/Contratti"),
      ]);

      const aContractsWithPos = new Set(oPos.data.map((p) => p.contratto));
      const iToInsert = oContracts.data.filter(
        (c) => !aContractsWithPos.has(c.codiceContratto)
      ).length;

      this._oModelDashboard.setProperty("/posInserted", oPos.count);
      this._oModelDashboard.setProperty("/posToInsert", iToInsert);
    } catch (e) {
      entityUtils.handleError(e as Error);
    }
  }

  public onNewPos(): void {
    this.getRouter().navTo("RoutePosNew");
  }

  public onOpenPos(oEvent: any): void {
    const oContext = oEvent.getSource().getBindingContext();
    if (!oContext) return;
    const oRow = oContext.getObject() as { idPos: string; contratto: string };
    this.navTo("RoutePos", {
      contractCode: oRow.contratto,
      posId: oRow.idPos,
    });
  }
}
