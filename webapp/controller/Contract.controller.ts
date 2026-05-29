import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import p13nDialogUtils from "../utils/p13nDialogUtils";
import entityUtils from "../utils/entityUtils";
import dateUtils from "../utils/dateUtils";
import xlsxUtils from "../utils/xlsxUtils";
import Table from "sap/m/Table";
import ColumnListItem from "sap/m/ColumnListItem";

const DEFAULT_MODEL = {
  data: [] as object[],
  count: 0,
  sortCount: 0,
  filterCount: 0,
};

const MOCK_POS_DATA = [
  {
    posId: "POS-001",
    contractCode: "1004/2025",
    contractorCompany: "Impresa Rossi S.r.l.",
    companyRole: "Appaltante",
    status: "Approvato",
    revision: "3",
    draftDate: "2024-01-15",
    validityStart: "2024-02-01",
    validityEnd: "2025-01-31",
  },
  {
    posId: "POS-002",
    contractCode: "1004/2025",
    contractorCompany: "Tecno Edil S.p.A.",
    companyRole: "Subappaltatore",
    status: "Da approvare",
    revision: "1",
    draftDate: "2024-03-10",
    validityStart: "2024-04-01",
    validityEnd: "2025-03-31",
  },
];

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

// Mock: dati contratto indicizzati per contractCode
const MOCK_CONTRACTS: Record<string, typeof DEFAULT_CONTRACT> = {
  "CONTR-001": {
    contractCode: "1004/2025_002/2025",
    contractTitle: "Lavori di conservazione e risanamento delle opere d'arte",
    contractObject:
      "Lavori di conservazione e risanamento delle opere d'arte ai km. 4+846, 33+901, 35+199, 61+216 della linea Foligno-Terontola ",
    contractType: "01- Contratto Applicativo ",
    tenderType: "servizi",
    nppCode: "1707",
    nppDescription: "Opere d'arte",
    cup: "J87F20000220001",
    derivedCig: "8908585CE5",
    status: "Prenotato",
    closureDocument: "Certificato Regolare Esecuzione",
    cellNumber: "",
    sapPurchaseOrgCode: "IT01",
    sapPurchaseOrgDesc: "",
    sapPurchaseGroupCode: "FST",
    sapPurchaseGroupDesc: "",
    inventoryCategory: "",
    technicalSubjectResponsibility: "",
    technicalSite: "",
    assetOwnerStructure: "",
  },
  "CONTR-002": {
    contractCode: "CONTR-002",
    contractTitle: "Realizzazione Opere Civili",
    contractObject: "Costruzione edificio uffici",
    contractType: "Concessione",
    tenderType: "Procedura ristretta",
    nppCode: "NPP-102",
    nppDescription: "Costruzioni civili",
    cup: "C23456789012345",
    derivedCig: "CIG-002",
    status: "toApprove",
    closureDocument: "",
    cellNumber: "CEL-002",
    sapPurchaseOrgCode: "1000",
    sapPurchaseOrgDesc: "Org. Acquisti Italia",
    sapPurchaseGroupCode: "G02",
    sapPurchaseGroupDesc: "Gruppo Infrastrutture",
    inventoryCategory: "Edilizia",
    technicalSubjectResponsibility: "anna.bianchi",
    technicalSite: "Milano",
    assetOwnerStructure: "Struttura B",
  },
  "CONTR-003": {
    contractCode: "CONTR-003",
    contractTitle: "Fornitura Apparecchiature Medicali",
    contractObject: "Dispositivi diagnostica per immagini",
    contractType: "Appalto",
    tenderType: "Affidamento diretto",
    nppCode: "NPP-103",
    nppDescription: "Forniture sanitarie",
    cup: "D34567890123456",
    derivedCig: "CIG-003",
    status: "draft",
    closureDocument: "",
    cellNumber: "CEL-003",
    sapPurchaseOrgCode: "2000",
    sapPurchaseOrgDesc: "Org. Acquisti Nord",
    sapPurchaseGroupCode: "G03",
    sapPurchaseGroupDesc: "Gruppo Sanitario",
    inventoryCategory: "Medicale",
    technicalSubjectResponsibility: "carlo.neri",
    technicalSite: "Torino",
    assetOwnerStructure: "Struttura C",
  },
  "CONTR-004": {
    contractCode: "CONTR-004",
    contractTitle: "Gestione Verde Pubblico",
    contractObject: "Manutenzione parchi e giardini comunali",
    contractType: "Appalto",
    tenderType: "Procedura aperta",
    nppCode: "NPP-104",
    nppDescription: "Servizi ambientali",
    cup: "E45678901234567",
    derivedCig: "CIG-004",
    status: "closed",
    closureDocument: "DOC-2023-045",
    cellNumber: "CEL-004",
    sapPurchaseOrgCode: "1000",
    sapPurchaseOrgDesc: "Org. Acquisti Italia",
    sapPurchaseGroupCode: "G04",
    sapPurchaseGroupDesc: "Gruppo Servizi",
    inventoryCategory: "Verde",
    technicalSubjectResponsibility: "sara.gialli",
    technicalSite: "Napoli",
    assetOwnerStructure: "Struttura D",
  },
  "CONTR-005": {
    contractCode: "CONTR-005",
    contractTitle: "Servizi Informatici Integrati",
    contractObject: "Sviluppo e manutenzione software gestionale",
    contractType: "Appalto",
    tenderType: "Procedura negoziata",
    nppCode: "NPP-105",
    nppDescription: "Servizi IT",
    cup: "F56789012345678",
    derivedCig: "CIG-005",
    status: "approved",
    closureDocument: "",
    cellNumber: "CEL-005",
    sapPurchaseOrgCode: "3000",
    sapPurchaseOrgDesc: "Org. Acquisti Sud",
    sapPurchaseGroupCode: "G05",
    sapPurchaseGroupDesc: "Gruppo Digitale",
    inventoryCategory: "IT",
    technicalSubjectResponsibility: "luca.blu",
    technicalSite: "Bari",
    assetOwnerStructure: "Struttura E",
  },
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

    // Carica testata contratto (fallback al primo mock se il codice non è presente)
    const oContract =
      MOCK_CONTRACTS[this._sContractCode] ??
      MOCK_CONTRACTS[Object.keys(MOCK_CONTRACTS)[0]] ??
      structuredClone(DEFAULT_CONTRACT);
    this._oModelContract.setData(oContract);

    try {
      this.setBusy(true);
      await this._loadData();
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
    const aData = this._oModelPos.getProperty("/data") as object[];
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
    const oContext = oItem.getBindingContext("Pos");
    if (!oContext) return;
    const oRow = oContext.getObject() as { posId: string };
    this.navTo("RoutePos", {
      contractCode: this._sContractCode,
      posId: oRow.posId,
    });
  }

  public onDetail(oEvent: any): void {
    const oContext = oEvent.getSource().getBindingContext("Pos");
    if (!oContext) return;
    const oRow = oContext.getObject() as { posId: string };
    this.navTo("RoutePos", {
      contractCode: this._sContractCode,
      posId: oRow.posId,
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
          await this._loadData();
        }
      },
    });
  }

  public onBack(): void {
    this.navTo("RouteHome");
  }

  private async _loadData(): Promise<void> {
    let aFiltered = MOCK_POS_DATA.filter((row) => row.contractCode === this._sContractCode);
    if (!aFiltered.length) {
      const sFirstCode = MOCK_POS_DATA[0]?.contractCode;
      aFiltered = MOCK_POS_DATA.filter((row) => row.contractCode === sFirstCode);
    }
    this._oModelPos.setProperty("/data", aFiltered);
    this._oModelPos.setProperty("/count", aFiltered.length);
  }
}
