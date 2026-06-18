import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import Table from "sap/m/Table";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import dateUtils from "../utils/dateUtils";
import entityUtils from "../utils/entityUtils";

const DEFAULT_DASHBOARD = {
  posInserted: 0,
  posToInsert: 0,
  posScaduti: 0,
  posSuperati: 0,
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
      const [oPos, oContracts, oScaduti, oSuperati] = await Promise.all([
        this.getEntitySet<{ contratto: string }>("/PosTestataSet"),
        this.getEntitySet<{ codiceContratto: string }>("/Contratti"),
        this.getEntitySet("/PosTestataSet", { filters: [new Filter("statoPos", FilterOperator.EQ, "Scaduto")], top: 0 }),
        this.getEntitySet("/PosTestataSet", { filters: [new Filter("statoPos", FilterOperator.EQ, "Superato")], top: 0 }),
      ]);

      const aContractsWithPos = new Set(oPos.data.map((p) => p.contratto));
      const iToInsert = oContracts.data.filter(
        (c) => !aContractsWithPos.has(c.codiceContratto)
      ).length;

      this._oModelDashboard.setProperty("/posInserted", oPos.count);
      this._oModelDashboard.setProperty("/posToInsert", iToInsert);
      this._oModelDashboard.setProperty("/posScaduti", oScaduti.count);
      this._oModelDashboard.setProperty("/posSuperati", oSuperati.count);
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
