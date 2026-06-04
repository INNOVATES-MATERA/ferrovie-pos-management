import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import MessageBox from "sap/m/MessageBox";
import Table from "sap/m/Table";
import ColumnListItem from "sap/m/ColumnListItem";
import entityUtils from "../utils/entityUtils";
import p13nDialogUtils from "../utils/p13nDialogUtils";
import xlsxUtils from "../utils/xlsxUtils";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";

function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

const DEFAULT_POS = {
  idPos: "",
  contratto: "",
  impresaAppaltatrice: "",
  ruoloImpresa: "",
  codiceContrattoSuperiore: "",
  committente: "",
  datoreLavoro: "",
  rspp: "",
  rls: "",
  medicocompetente: "",
  direttoreLavori: "",
  direttoreCantiere: "",
  capocantiere: "",
  preposto: "",
  addettiPrimoSoccorso: "",
  addettiPrimoAntincendio: "",
  revisione: "",
  dataRedazione: "",
  dataRicezioneCruscotto: "",
  inizioValidita: "",
  fineValidita: "",
  linkCde: "",
  isEdit: false,
  formTitle: "",
};

const DEFAULT_STAFF = { data: [] as object[], count: 0, sortCount: 0, filterCount: 0 };

const DEFAULT_STAFF_ROW = {
  posTestata_idPos: "",
  idDipendente: "",
  tmpId: "",
  nome: "",
  cognome: "",
  reparto: "",
  mansione: "",
};

type SkillItem = {
  skillId: string;
  label: string;
  category: "ferroviaria" | "decreto";
  flagAttiva: boolean;
  inizioAbilitazione: string | null;
  scadenzaAbilitazione: string | null;
};

type SkillsModel = {
  isOpen: boolean;
  employeeId: string;
  tmpId: string;
  nome: string;
  cognome: string;
  items: SkillItem[];
};

const SKILL_TYPES: { skillId: string; label: string; category: "ferroviaria" | "decreto" }[] = [
  { skillId: "RFI-01", label: "MI.IA.MEPC e MI.IA.QP.METT", category: "ferroviaria" },
  { skillId: "RFI-02", label: "MI.IA.QP.MDO", category: "ferroviaria" },
  { skillId: "RFI-03", label: "MI.IA.QP.ARM", category: "ferroviaria" },
  { skillId: "RFI-04", label: "MI.IA.QP.TE / SSE / DOTE", category: "ferroviaria" },
  { skillId: "RFI-05", label: "MI.IA.QP.SALD", category: "ferroviaria" },
  { skillId: "RFI-06", label: "MI.IA.QP.SCINT", category: "ferroviaria" },
  { skillId: "RFI-07", label: "MI.IA.QP.APME", category: "ferroviaria" },
  { skillId: "RFI-08", label: "MI.IA.QP.CND US", category: "ferroviaria" },
  { skillId: "RFI-09", label: "MI.IA.QP.GEST-TWS e PROG-TWS", category: "ferroviaria" },
  { skillId: "RFI-10", label: "MI.IA.QP.IS", category: "ferroviaria" },
  { skillId: "RFI-11", label: "MI.IA.QP.TLC", category: "ferroviaria" },
  { skillId: "SK-01", label: "Primo Soccorso", category: "decreto" },
  { skillId: "SK-02", label: "Antincendio Base", category: "decreto" },
  { skillId: "SK-03", label: "Antincendio Avanzato", category: "decreto" },
  { skillId: "SK-04", label: "Lavori in Quota", category: "decreto" },
  { skillId: "SK-05", label: "Spazi Confinati", category: "decreto" },
  { skillId: "SK-06", label: "Rischio Elettrico", category: "decreto" },
  { skillId: "SK-07", label: "Movimentazione Carichi", category: "decreto" },
  { skillId: "SK-08", label: "Uso DPI", category: "decreto" },
  { skillId: "SK-09", label: "Ponteggi", category: "decreto" },
  { skillId: "SK-10", label: "Gru e Apparecchi di Sollevamento", category: "decreto" },
  { skillId: "SK-11", label: "Amianto", category: "decreto" },
];

const MOCK_EMPLOYEE_SKILLS: { idDipendente: string; skillId: string; inizioAbilitazione: string; scadenzaAbilitazione: string }[] = [
  { idDipendente: "EMP-001", skillId: "SK-01", inizioAbilitazione: "2023-01-10", scadenzaAbilitazione: "2025-01-10" },
  { idDipendente: "EMP-001", skillId: "SK-02", inizioAbilitazione: "2023-03-15", scadenzaAbilitazione: "2025-03-15" },
  { idDipendente: "EMP-001", skillId: "SK-04", inizioAbilitazione: "2022-06-01", scadenzaAbilitazione: "2024-06-01" },
  { idDipendente: "EMP-002", skillId: "SK-01", inizioAbilitazione: "2024-02-20", scadenzaAbilitazione: "2026-02-20" },
  { idDipendente: "EMP-002", skillId: "SK-08", inizioAbilitazione: "2023-09-01", scadenzaAbilitazione: "2025-09-01" },
  { idDipendente: "EMP-003", skillId: "SK-06", inizioAbilitazione: "2023-05-10", scadenzaAbilitazione: "2025-05-10" },
  { idDipendente: "EMP-003", skillId: "SK-07", inizioAbilitazione: "2022-11-01", scadenzaAbilitazione: "2024-11-01" },
  { idDipendente: "EMP-003", skillId: "SK-09", inizioAbilitazione: "2023-07-15", scadenzaAbilitazione: "2025-07-15" },
  { idDipendente: "EMP-004", skillId: "SK-01", inizioAbilitazione: "2024-01-05", scadenzaAbilitazione: "2026-01-05" },
  { idDipendente: "EMP-004", skillId: "SK-03", inizioAbilitazione: "2023-08-20", scadenzaAbilitazione: "2025-08-20" },
  { idDipendente: "EMP-005", skillId: "SK-05", inizioAbilitazione: "2022-04-01", scadenzaAbilitazione: "2024-04-01" },
  { idDipendente: "EMP-005", skillId: "SK-11", inizioAbilitazione: "2023-10-10", scadenzaAbilitazione: "2025-10-10" },
  { idDipendente: "EMP-006", skillId: "SK-01", inizioAbilitazione: "2024-03-01", scadenzaAbilitazione: "2026-03-01" },
  { idDipendente: "EMP-006", skillId: "SK-02", inizioAbilitazione: "2023-12-15", scadenzaAbilitazione: "2025-12-15" },
  { idDipendente: "EMP-007", skillId: "SK-04", inizioAbilitazione: "2022-09-01", scadenzaAbilitazione: "2024-09-01" },
  { idDipendente: "EMP-007", skillId: "SK-06", inizioAbilitazione: "2023-02-10", scadenzaAbilitazione: "2025-02-10" },
  { idDipendente: "EMP-007", skillId: "SK-10", inizioAbilitazione: "2023-06-20", scadenzaAbilitazione: "2025-06-20" },
];

const DEFAULT_SKILLS: SkillsModel = {
  isOpen: false,
  employeeId: "",
  tmpId: "",
  nome: "",
  cognome: "",
  items: [],
};

const MOCK_STAFF_DATA = [
  {
    posTestata_idPos: "POS-001",
    idDipendente: "EMP-001",
    nome: "Mario",
    cognome: "Rossi",
    reparto: "Sicurezza",
    mansione: "Responsabile",
  },
  {
    posTestata_idPos: "POS-001",
    idDipendente: "EMP-002",
    nome: "Anna",
    cognome: "Bianchi",
    reparto: "Operativo",
    mansione: "Addetto",
  },
  {
    posTestata_idPos: "POS-002",
    idDipendente: "EMP-003",
    nome: "Carlo",
    cognome: "Neri",
    reparto: "Tecnico",
    mansione: "Tecnico",
  },
  {
    posTestata_idPos: "POS-002",
    idDipendente: "EMP-004",
    nome: "Sara",
    cognome: "Gialli",
    reparto: "Operativo",
    mansione: "Addetto",
  },
  {
    posTestata_idPos: "POS-003",
    idDipendente: "EMP-005",
    nome: "Luca",
    cognome: "Blu",
    reparto: "Sicurezza",
    mansione: "RSPP",
  },
  {
    posTestata_idPos: "POS-004",
    idDipendente: "EMP-006",
    nome: "Elena",
    cognome: "Verdi",
    reparto: "Operativo",
    mansione: "Addetto",
  },
  {
    posTestata_idPos: "POS-005",
    idDipendente: "EMP-007",
    nome: "Marco",
    cognome: "Ferrari",
    reparto: "Tecnico",
    mansione: "DL",
  },
];

/**
 * @namespace posmanagement.controller
 */
export default class Pos extends BaseController {
  private _oModelPOS!: JSONModel;
  private _oModelStaff!: JSONModel;
  private _oModelSkills!: JSONModel;
  private _sContractCode!: string;
  private _sPosId!: string;
  private _bP13nRegistered = false;
  private _oSkillsCache = new Map<string, SkillItem[]>();

  public onInit(): void {
    this._oModelPOS = new JSONModel(structuredClone(DEFAULT_POS));
    this._oModelStaff = new JSONModel(structuredClone(DEFAULT_STAFF));
    this._oModelSkills = new JSONModel(structuredClone(DEFAULT_SKILLS));

    this.setModel(this._oModelPOS, "POS");
    this.setModel(this._oModelStaff, "Staff");
    this.setModel(this._oModelSkills, "Skills");

    this.getRouter().getRoute("RoutePos")!.attachPatternMatched(this._onRouteMatched, this);
  }

  public onAfterRendering(): void {
    if (this._bP13nRegistered) return;
    const oTable = this.byId("tblStaff") as Table;
    if (oTable) {
      p13nDialogUtils.register(oTable, (s, f) => {
        this._oModelStaff.setProperty("/sortCount", s);
        this._oModelStaff.setProperty("/filterCount", f);
      });
      this._bP13nRegistered = true;
    }
  }

  public async onReset(): Promise<void> {
    try {
      this.setBusy(true);
      const oTable = this.byId("tblStaff") as Table;
      await p13nDialogUtils.reset(oTable);
      this._oModelStaff.setProperty("/sortCount", 0);
      this._oModelStaff.setProperty("/filterCount", 0);
    } catch (e) {
      entityUtils.handleError(e as Error);
    } finally {
      this.setBusy(false);
    }
  }

  public onSettings(oEvent: any): void {
    const oTable = this.byId("tblStaff") as Table;
    const sPanel = oEvent.getSource().data("panel") as string;
    p13nDialogUtils.open(oTable, sPanel as any, oEvent.getSource());
  }

  public async onDownload(): Promise<void> {
    const oTable = this.byId("tblStaff") as Table;
    const aData = this._oModelStaff.getProperty("/data") as object[];
    const aColumns = xlsxUtils.getColumnsFromTable(this, oTable);
    await xlsxUtils.generateSpreadsheet(aColumns, aData, "ListaStaff.xlsx");
  }

  private async _onRouteMatched(oEvent: any): Promise<void> {
    const oArgs = oEvent.getParameter("arguments");
    this._sContractCode = decodeURIComponent(oArgs.contractCode as string);
    this._sPosId = decodeURIComponent(oArgs.posId as string);

    const bIsEdit = this._sPosId !== "new";

    this._oModelPOS.setData({
      ...structuredClone(DEFAULT_POS),
      contratto: this._sContractCode,
      idPos: bIsEdit ? this._sPosId : generateRandomId(),
      isEdit: bIsEdit,
      formTitle: bIsEdit ? this.getText("lbl_pos_form") + ": " + this._sPosId : this.getText("lbl_pos_form_create"),
    });

    this._oModelSkills.setData(structuredClone(DEFAULT_SKILLS));
    this._oModelStaff.setData(structuredClone(DEFAULT_STAFF));

    if (bIsEdit) {
      try {
        this.setBusy(true);
        await Promise.all([this._loadPOS(), this._loadStaff()]);
      } catch (e) {
        entityUtils.handleError(e as Error);
      } finally {
        this.setBusy(false);
      }
    }
  }

  public onSave(): void {
    MessageBox.confirm(this.getText("msg_confirm_save"), {
      onClose: async (sAction: string | null) => {
        if (sAction === MessageBox.Action.OK) {
          await this._executeSave();
        }
      },
    });
  }

  private async _executeSave(): Promise<void> {
    const sPosId = (this._oModelPOS.getProperty("/idPos") as string) ?? "";
    const bIsEdit = this._oModelPOS.getProperty("/isEdit") as boolean;
    const sDatore = (this._oModelPOS.getProperty("/datoreLavoro") as string) ?? "";
    const sMedico = (this._oModelPOS.getProperty("/medicocompetente") as string) ?? "";
    const sRls = (this._oModelPOS.getProperty("/rls") as string) ?? "";

    if (!sDatore.trim() || !sMedico.trim() || !sRls.trim()) {
      MessageBox.error(this.getText("msg_mandatory_fields"));
      return;
    }

    try {
      this.setBusy(true);

      if (bIsEdit) {
        // Stub: await this.updateEntity("POS", oData);
      } else {
        const oODataModel = this.getOwnerComponent()!.getModel() as ODataModel;
        const oListBinding = oODataModel.bindList("/PosTestataSet");
        const oContext = oListBinding.create({
          idPos: sPosId,
          contratto: this._oModelPOS.getProperty("/contratto"),
          impresaAppaltatrice: this._oModelPOS.getProperty("/impresaAppaltatrice"),
          ruoloImpresa: this._oModelPOS.getProperty("/ruoloImpresa"),
          codiceContrattoSuperiore: this._oModelPOS.getProperty("/codiceContrattoSuperiore"),
          committente: this._oModelPOS.getProperty("/committente"),
          datoreLavoro: sDatore,
          rspp: this._oModelPOS.getProperty("/rspp"),
          rls: sRls,
          medicocompetente: sMedico,
          direttoreLavori: this._oModelPOS.getProperty("/direttoreLavori"),
          direttoreCantiere: this._oModelPOS.getProperty("/direttoreCantiere"),
          capocantiere: this._oModelPOS.getProperty("/capocantiere"),
          preposto: this._oModelPOS.getProperty("/preposto"),
          addettiPrimoSoccorso: this._oModelPOS.getProperty("/addettiPrimoSoccorso"),
          addettiPrimoAntincendio: this._oModelPOS.getProperty("/addettiPrimoAntincendio"),
          revisione: parseInt(this._oModelPOS.getProperty("/revisione") || "0", 10),
          dataRedazione: this._oModelPOS.getProperty("/dataRedazione") || null,
          dataRicezioneCruscotto: this._oModelPOS.getProperty("/dataRicezioneCruscotto") || null,
          inizioValidita: this._oModelPOS.getProperty("/inizioValidita") || null,
          fineValidita: this._oModelPOS.getProperty("/fineValidita") || null,
          linkCde: this._oModelPOS.getProperty("/linkCde"),
        });
        await oContext.created();
      }

      MessageToast.show(this.getText("msg_save_success"));
      this.navTo("RouteContract", { contractCode: this._sContractCode });
    } catch (e) {
      entityUtils.handleError(e as Error);
    } finally {
      this.setBusy(false);
    }
  }

  public onCancel(): void {
    this.navTo("RouteContract", { contractCode: this._sContractCode });
  }

  public onBack(): void {
    this.navTo("RouteContract", { contractCode: this._sContractCode });
  }

  // ── Staff management ──────────────────────────────────────────────────────

  public onAddStaff(): void {
    const aData = this._oModelStaff.getProperty("/data") as (typeof DEFAULT_STAFF_ROW)[];
    aData.unshift({ ...structuredClone(DEFAULT_STAFF_ROW), posId: this._sPosId, tmpId: Date.now().toString() });
    this._oModelStaff.setProperty("/data", aData);
    this._oModelStaff.setProperty("/count", aData.length);
  }

  public onDeleteStaff(): void {
    const oTable = this.byId("tblStaff") as Table;
    const aSelected = oTable.getSelectedItems();
    if (!aSelected.length) {
      MessageBox.warning(this.getText("msg_no_selection"));
      return;
    }
    MessageBox.confirm(this.getText("msg_confirm_delete_employees"), {
      onClose: async (sAction: string | null) => {
        if (sAction === MessageBox.Action.OK) {
          const aData = this._oModelStaff.getProperty("/data") as object[];
          const aIndicesToDelete = new Set(aSelected.map((item) => oTable.indexOfItem(item as any)));
          const aFiltered = aData.filter((_, i) => !aIndicesToDelete.has(i));
          this._oModelStaff.setProperty("/data", aFiltered);
          this._oModelStaff.setProperty("/count", aFiltered.length);
          oTable.removeSelections(true);
        }
      },
    });
  }

  // ── Skills management ─────────────────────────────────────────────────────

  public onOpenSkills(oEvent: any): void {
    const oItem = oEvent.getSource().getParent() as ColumnListItem;
    const oContext = oItem.getBindingContext("Staff");
    if (!oContext) return;
    const oRow = oContext.getObject() as { idDipendente: string; tmpId: string; nome: string; cognome: string };
    const sKey = oRow.idDipendente || oRow.tmpId;

    // Salva abilitazioni correnti in cache prima di cambiare dipendente
    if (this._oModelSkills.getProperty("/isOpen")) {
      const sCurrentKey = this._oModelSkills.getProperty("/employeeId") || this._oModelSkills.getProperty("/tmpId");
      if (sCurrentKey) {
        this._oSkillsCache.set(sCurrentKey, structuredClone(this._oModelSkills.getProperty("/items") as SkillItem[]));
      }
      // Toggle: stessa riga → chiudi
      if (sCurrentKey === sKey) {
        this._oModelSkills.setProperty("/isOpen", false);
        return;
      }
    }

    // Legge dalla cache (modifiche in sessione) o dalla sorgente mock
    const aCached = this._oSkillsCache.get(sKey);
    const aItems: SkillItem[] =
      aCached ?
        structuredClone(aCached)
      : SKILL_TYPES.map((type) => {
          const found = MOCK_EMPLOYEE_SKILLS.find(
            (s) => s.idDipendente === oRow.idDipendente && s.skillId === type.skillId,
          );
          return {
            skillId: type.skillId,
            label: type.label,
            category: type.category,
            flagAttiva: !!found,
            inizioAbilitazione: found?.inizioAbilitazione ?? null,
            scadenzaAbilitazione: found?.scadenzaAbilitazione ?? null,
          };
        });

    this._oModelSkills.setData({
      isOpen: true,
      employeeId: oRow.idDipendente,
      tmpId: oRow.tmpId,
      nome: oRow.nome,
      cognome: oRow.cognome,
      items: aItems,
    });
  }

  public onSkillSelectionChange(oEvent: any): void {
    const oTable = oEvent.getSource() as Table;
    oTable.getItems().forEach((oItem: any) => {
      const oCtx = oItem.getBindingContext("Skills");
      if (!oCtx) return;
      const sPath = oCtx.getPath();
      const bSelected = oItem.isSelected() as boolean;
      this._oModelSkills.setProperty(`${sPath}/selected`, bSelected);
      if (!bSelected) {
        this._oModelSkills.setProperty(`${sPath}/startDate`, null);
        this._oModelSkills.setProperty(`${sPath}/endDate`, null);
      }
    });
  }

  public onCloseSkills(): void {
    const sKey = this._oModelSkills.getProperty("/employeeId") || this._oModelSkills.getProperty("/tmpId");
    if (sKey) {
      this._oSkillsCache.set(sKey, structuredClone(this._oModelSkills.getProperty("/items") as SkillItem[]));
    }
    this._oModelSkills.setProperty("/isOpen", false);
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  private async _loadPOS(): Promise<void> {
    const oODataModel = this.getOwnerComponent()!.getModel() as ODataModel;
    const oBinding = oODataModel.bindContext(`/PosTestataSet(idPos='${encodeURIComponent(this._sPosId)}')`);
    const oData = (await oBinding.requestObject()) as Record<string, unknown>;
    this._oModelPOS.setData({
      idPos: oData.idPos ?? "",
      contratto: oData.contratto ?? "",
      impresaAppaltatrice: oData.impresaAppaltatrice ?? "",
      ruoloImpresa: oData.ruoloImpresa ?? "",
      codiceContrattoSuperiore: oData.codiceContrattoSuperiore ?? "",
      committente: oData.committente ?? "",
      datoreLavoro: oData.datoreLavoro ?? "",
      rspp: oData.rspp ?? "",
      rls: oData.rls ?? "",
      medicocompetente: oData.medicocompetente ?? "",
      direttoreLavori: oData.direttoreLavori ?? "",
      direttoreCantiere: oData.direttoreCantiere ?? "",
      capocantiere: oData.capocantiere ?? "",
      preposto: oData.preposto ?? "",
      addettiPrimoSoccorso: oData.addettiPrimoSoccorso ?? "",
      addettiPrimoAntincendio: oData.addettiPrimoAntincendio ?? "",
      status: "",
      revisione: oData.revisione != null ? String(oData.revisione) : "",
      dataRedazione: oData.dataRedazione ?? "",
      dataRicezioneCruscotto: oData.dataRicezioneCruscotto ?? "",
      inizioValidita: oData.inizioValidita ?? "",
      fineValidita: oData.fineValidita ?? "",
      linkCde: oData.linkCde ?? "",
      isEdit: true,
      formTitle: this.getText("lbl_pos_form") + ": " + this._sPosId,
    });
  }

  private async _loadStaff(): Promise<void> {
    const aFiltered = MOCK_STAFF_DATA.filter((row) => row.posId === this._sPosId);
    this._oModelStaff.setProperty("/data", aFiltered);
    this._oModelStaff.setProperty("/count", aFiltered.length);
  }
}
