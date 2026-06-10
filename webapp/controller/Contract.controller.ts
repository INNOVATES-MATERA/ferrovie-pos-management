import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import p13nDialogUtils from "../utils/p13nDialogUtils";
import entityUtils from "../utils/entityUtils";
import dateUtils from "../utils/dateUtils";
import xlsxUtils from "../utils/xlsxUtils";
import Table from "sap/m/Table";
import ColumnListItem from "sap/m/ColumnListItem";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";

const DEFAULT_MODEL = {
  count: 0,
  sortCount: 0,
  filterCount: 0,
};

const DEFAULT_CONTRACT = {
  contractCode: "",
  contractTitle: "",
  contractObject: "",
  contractType: "",
  tenderType: "",
  nppCode: "",
  nppDescription: "",
  cup: "",
  derivedCig: "",
  status: "",
  closureDocument: "",
  cellNumber: "",
  sapPurchaseOrgCode: "",
  sapPurchaseOrgDesc: "",
  sapPurchaseGroupCode: "",
  sapPurchaseGroupDesc: "",
  inventoryCategory: "",
  technicalSubjectResponsibility: "",
  technicalSite: "",
  assetOwnerStructure: "",
};

/**
 * @namespace posmanagement.controller
 */
export default class Contract extends BaseController {
  public dateUtils = dateUtils;
  private _oModelPos!: JSONModel;
  private _oModelContract!: JSONModel;
  private _sContractCode!: string;
  private _bP13nRegistered = false;

  public onInit(): void {
    this._oModelPos = new JSONModel(structuredClone(DEFAULT_MODEL));
    this._oModelContract = new JSONModel(structuredClone(DEFAULT_CONTRACT));
    this.setModel(this._oModelPos, "Pos");
    this.setModel(this._oModelContract, "Contract");

    this.getRouter().getRoute("RouteContract")!.attachPatternMatched(this._onRouteMatched, this);
  }

  public onAfterRendering(): void {
    if (this._bP13nRegistered) return;
    const oTable = this.byId("tblContract") as Table;
    if (oTable) {
      p13nDialogUtils.register(oTable, (s, f) => {
        this._oModelPos.setProperty("/sortCount", s);
        this._oModelPos.setProperty("/filterCount", f);
      });
      this._bP13nRegistered = true;
    }
  }

  private async _onRouteMatched(oEvent: any): Promise<void> {
    const oArgs = oEvent.getParameter("arguments");
    this._sContractCode = decodeURIComponent(oArgs.contractCode as string);

    try {
      this.setBusy(true);

      const oData = await this.getEntity<Record<string, string>>(
        "/Contratti",
        { codiceContratto: this._sContractCode },
      );

      this._oModelContract.setData({
        contractCode: oData.codiceContratto ?? "",
        contractTitle: oData.titoloDelContratto ?? "",
        contractObject: oData.oggettoDelContratto ?? "",
        contractType: oData.tipoDiContratto ?? "",
        tenderType: oData.tipologiaAppalto ?? "",
        nppCode: oData.codiceNPP ?? "",
        nppDescription: oData.descrizioneNPP ?? "",
        cup: oData.CUP ?? "",
        derivedCig: oData.CIGDerivato ?? "",
        status: oData.stato ?? "",
        closureDocument: oData.documentoDiChiusuraContratto ?? "",
        cellNumber: oData.numCel ?? "",
        sapPurchaseOrgCode: oData.codiceSAPOrganizzazioneAcquisti ?? "",
        sapPurchaseOrgDesc: oData.descrizioneSAPOrganizzazioneAcquisti ?? "",
        sapPurchaseGroupCode: oData.codiceSAPGruppoAcquisti ?? "",
        sapPurchaseGroupDesc: oData.descrizioneSAPGruppoAcquisti ?? "",
        inventoryCategory: oData.categoriaInventariale ?? "",
        technicalSubjectResponsibility: oData.responsabilitaSoggettoTecnico ?? "",
        technicalSite: oData.sedeTecnica ?? "",
        assetOwnerStructure: oData.strutturaTitolareAsset ?? "",
      });

      this._loadPos();
    } catch (e) {
      entityUtils.handleError(e as Error);
    } finally {
      this.setBusy(false);
    }
  }

  public async onReset(): Promise<void> {
    try {
      this.setBusy(true);
      const oTable = this.byId("tblContract") as Table;
      await p13nDialogUtils.reset(oTable);
      this._oModelPos.setProperty("/sortCount", 0);
      this._oModelPos.setProperty("/filterCount", 0);
    } catch (e) {
      entityUtils.handleError(e as Error);
    } finally {
      this.setBusy(false);
    }
  }

  public onSettings(oEvent: any): void {
    const oTable = this.byId("tblContract") as Table;
    const sPanel = oEvent.getSource().data("panel") as string;
    p13nDialogUtils.open(oTable, sPanel as any, oEvent.getSource());
  }

  public async onDownload(): Promise<void> {
    const oTable = this.byId("tblContract") as Table;
    const oBinding = oTable.getBinding("items") as ODataListBinding;
    const aContexts = await oBinding.requestContexts(0, Infinity);
    const aData = aContexts.map((ctx) => ctx.getObject());
    const aColumns = xlsxUtils.getColumnsFromTable(this, oTable);
    await xlsxUtils.generateSpreadsheet(aColumns, aData, "ListaPOS.xlsx");
  }

  public onCreate(): void {
    this.navTo("RoutePos", {
      contractCode: this._sContractCode,
      posId: "new",
    });
  }

  public onEdit(oEvent: any): void {
    const oItem = oEvent.getSource().getParent() as ColumnListItem;
    const oContext = oItem.getBindingContext();
    if (!oContext) return;
    const oRow = oContext.getObject() as { idPos: string };
    this.navTo("RoutePos", {
      contractCode: this._sContractCode,
      posId: oRow.idPos,
    });
  }

  public onDetail(oEvent: any): void {
    const oContext = oEvent.getSource().getBindingContext();
    if (!oContext) return;
    const oRow = oContext.getObject() as { idPos: string };
    this.navTo("RoutePos", {
      contractCode: this._sContractCode,
      posId: oRow.idPos,
    });
  }

  public onDelete(): void {
    const oTable = this.byId("tblContract") as Table;
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

  public onBack(): void {
    this.navTo("RouteHome");
  }

  private _loadPos(): void {
    const oTable = this.byId("tblContract") as Table;
    const oInfo = oTable.getBindingInfo("items") as any;
    oTable.bindItems({
      path: "/PosTestataSet",
      parameters: { $count: true },
      filters: [new Filter("contratto", FilterOperator.EQ, this._sContractCode)],
      template: oInfo?.template,
      events: {
        dataReceived: async () => {
          const oBinding = oTable.getBinding("items") as ODataListBinding;
          const iCount = await oBinding.getHeaderContext()!.requestProperty("$count");
          this._oModelPos.setProperty("/count", iCount);
        },
      },
    });
  }
}
