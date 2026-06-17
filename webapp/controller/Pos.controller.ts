import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import Table from "sap/m/Table";
import ColumnListItem from "sap/m/ColumnListItem";
import Column from "sap/m/Column";
import Label from "sap/m/Label";
import Text from "sap/m/Text";
import TableSelectDialog from "sap/m/TableSelectDialog";
import DatePicker from "sap/m/DatePicker";
import Event from "sap/ui/base/Event";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import entityUtils from "../utils/entityUtils";
import p13nDialogUtils from "../utils/p13nDialogUtils";
import xlsxUtils from "../utils/xlsxUtils";
import dateUtils from "../utils/dateUtils";

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
  codice: string;
  descrizione: string;
  categoria: "ferroviaria" | "decreto";
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

const DEFAULT_SKILLS: SkillsModel = {
  isOpen: false,
  employeeId: "",
  tmpId: "",
  nome: "",
  cognome: "",
  items: [],
};

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
  private _oContractDialog?: TableSelectDialog;
  private _oSkillsCache = new Map<string, SkillItem[]>();
  private _aSkillTypes: { codice: string; categoria: string; descrizione: string }[] = [];

  public onInit(): void {
    this._oModelPOS = new JSONModel(structuredClone(DEFAULT_POS));
    this._oModelStaff = new JSONModel(structuredClone(DEFAULT_STAFF));
    this._oModelSkills = new JSONModel(structuredClone(DEFAULT_SKILLS));

    this.setModel(this._oModelPOS, "POS");
    this.setModel(this._oModelStaff, "Staff");
    this.setModel(this._oModelSkills, "Skills");

    this.getRouter().getRoute("RoutePos")!.attachPatternMatched(this._onRouteMatched, this);
    this.getRouter().getRoute("RoutePosNew")!.attachPatternMatched(this._onRouteMatched, this);
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
      const oTable = this.byId("tblStaff") as Table;
      await p13nDialogUtils.reset(oTable);
      this._oModelStaff.setProperty("/sortCount", 0);
      this._oModelStaff.setProperty("/filterCount", 0);
    } catch (e) {
      entityUtils.handleError(e as Error);
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
    this._sContractCode = oArgs.contractCode ? decodeURIComponent(oArgs.contractCode as string) : "";
    this._sPosId = oArgs.posId ? decodeURIComponent(oArgs.posId as string) : "new";

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

    try {
      await this._loadSkillTypes();
      if (bIsEdit) {
        await this._loadPOSWithPersonale();
      }
    } catch (e) {
      entityUtils.handleError(e as Error);
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

  /** Esegue il salvataggio del POS: PATCH in modalità edit, POST in modalità creazione. */
  private async _executeSave(): Promise<void> {
    const sPosId = (this._oModelPOS.getProperty("/idPos") as string) ?? "";
    const bIsEdit = this._oModelPOS.getProperty("/isEdit") as boolean;
    const sDatore = (this._oModelPOS.getProperty("/datoreLavoro") as string) ?? "";
    const sMedico = (this._oModelPOS.getProperty("/medicocompetente") as string) ?? "";
    const sRls = (this._oModelPOS.getProperty("/rls") as string) ?? "";
    const sContratto = (this._oModelPOS.getProperty("/contratto") as string) ?? "";

    if (!sContratto.trim()) {
      MessageBox.error(this.getText("msg_contract_required"));
      return;
    }

    if (!sDatore.trim() || !sMedico.trim() || !sRls.trim()) {
      MessageBox.error(this.getText("msg_mandatory_fields"));
      return;
    }

    this._flushOpenSkillsToCache();

    const aSkillItems = (this._oModelSkills.getProperty("/items") as SkillItem[]) || [];
    for (const skill of aSkillItems) {
      if (skill.flagAttiva && dateUtils.isDateAfter(skill.inizioAbilitazione, skill.scadenzaAbilitazione)) {
        MessageBox.error(this.getText("msg_error_save_date"));
        return;
      }
    }

    try {
      const oPosPayload = {
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
        dataRicezioneCruscotto: this._oModelPOS.getProperty("/dataRicezioneCruscotto")
          ? (this._oModelPOS.getProperty("/dataRicezioneCruscotto") as string) + "T00:00:00Z"
          : null,
        inizioValidita: this._oModelPOS.getProperty("/inizioValidita") || null,
        fineValidita: this._oModelPOS.getProperty("/fineValidita") || null,
        linkCde: this._oModelPOS.getProperty("/linkCde"),
        personale: this._buildPersonalePayload(sPosId),
      };

      if (bIsEdit) {
        await this.updateEntity("/PosTestataSet", { idPos: sPosId }, oPosPayload);
      } else {
        await this.createEntity("/PosTestataSet", oPosPayload);
      }

      MessageBox.success(this.getText("msg_save_success"));
    } catch (e) {
      entityUtils.handleError(e as Error);
    }
  }

  public onBack(): void {
    this.getRouter().navTo("RoutePosList");
  }

  public onContractValueHelp(): void {
    if (!this._oContractDialog) {
      this._oContractDialog = new TableSelectDialog({
        title: this.getText("lbl_select_contract"),
        search: (oEvt: any) => this._filterContractDialog(oEvt.getParameter("value") as string),
        liveChange: (oEvt: any) => this._filterContractDialog(oEvt.getParameter("value") as string),
        confirm: (oEvt: any) => this._onContractSelected(oEvt),
        columns: [
          new Column({ header: new Label({ text: this.getText("lbl_act_code") }) }),
          new Column({ header: new Label({ text: this.getText("lbl_contract_code") }) }),
          new Column({ header: new Label({ text: this.getText("lbl_contract_title") }) }),
          new Column({ header: new Label({ text: this.getText("lbl_sap_purchase_org_code") }) }),
          new Column({ header: new Label({ text: this.getText("lbl_sap_purchase_group_code") }) }),
        ],
      });
      this._oContractDialog.bindAggregation("items", {
        path: "/Contratti",
        template: new ColumnListItem({
          cells: [
            new Text({ text: "{codiceAtto}", wrapping: false }),
            new Text({ text: "{codiceContratto}", wrapping: false }),
            new Text({ text: "{titoloDelContratto}", wrapping: false }),
            new Text({ text: "{codiceSAPOrganizzazioneAcquisti}", wrapping: false }),
            new Text({ text: "{codiceSAPGruppoAcquisti}", wrapping: false }),
          ],
        }),
      });
      this.getView()!.addDependent(this._oContractDialog);
    }
    this._oContractDialog.open("");
  }

  private _filterContractDialog(sValue: string): void {
    const oBinding = this._oContractDialog!.getBinding("items") as ODataListBinding;
    if (!sValue) {
      oBinding.filter([]);
      return;
    }
    const oFilter = new Filter({
      filters: [
        new Filter("codiceContratto", FilterOperator.Contains, sValue),
        new Filter("titoloDelContratto", FilterOperator.Contains, sValue),
      ],
      and: false,
    });
    oBinding.filter([oFilter]);
  }

  private _onContractSelected(oEvent: any): void {
    const oItem = oEvent.getParameter("selectedItem");
    if (!oItem) return;
    const oRow = oItem.getBindingContext()!.getObject() as { codiceContratto: string };
    this._oModelPOS.setProperty("/contratto", oRow.codiceContratto);
  }

  public onSkillDateChange(oEvent: Event): void {
    const oSource    = oEvent.getSource() as DatePicker;
    const oListItem  = oSource.getParent() as ColumnListItem;
    const aCells     = oListItem.getCells();
    const oPickerInizio = aCells[1] as DatePicker;
    const oPickerFine   = aCells[2] as DatePicker;
    const sInizio = oPickerInizio.getValue() || "";
    const sFine   = oPickerFine.getValue()   || "";
    const bError  = dateUtils.isDateAfter(sInizio, sFine);
    const sState  = bError ? "Error" : "None";
    const sText   = bError ? this.getText("msg_error_skill_range") : "";

    oPickerInizio.setValueState(sState as any);
    oPickerInizio.setValueStateText(sText);
    oPickerFine.setValueState(sState as any);
    oPickerFine.setValueStateText(sText);
  }

  // ── Staff management ──────────────────────────────────────────────────────

  public onAddStaff(): void {
    const aData = this._oModelStaff.getProperty("/data") as (typeof DEFAULT_STAFF_ROW)[];
    aData.unshift({
      ...structuredClone(DEFAULT_STAFF_ROW),
      posTestata_idPos: this._sPosId,
      tmpId: generateRandomId(),
    });
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

    const aCached = this._oSkillsCache.get(sKey);
    const aItems: SkillItem[] =
      aCached ?
        structuredClone(aCached)
      : this._aSkillTypes.map((type) => ({
          codice: type.codice,
          descrizione: type.descrizione,
          categoria: type.categoria as "ferroviaria" | "decreto",
          flagAttiva: false,
          inizioAbilitazione: null,
          scadenzaAbilitazione: null,
        }));

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
      this._oModelSkills.setProperty(`${sPath}/flagAttiva`, bSelected);
      if (!bSelected) {
        this._oModelSkills.setProperty(`${sPath}/inizioAbilitazione`, null);
        this._oModelSkills.setProperty(`${sPath}/scadenzaAbilitazione`, null);
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

  // ── Payload helpers ───────────────────────────────────────────────────────

  /** Salva nella cache le abilitazioni del pannello attualmente aperto, se presente. */
  private _flushOpenSkillsToCache(): void {
    if (!this._oModelSkills.getProperty("/isOpen")) return;
    const sOpenKey = this._oModelSkills.getProperty("/employeeId") || this._oModelSkills.getProperty("/tmpId");
    if (sOpenKey) {
      this._oSkillsCache.set(sOpenKey, structuredClone(this._oModelSkills.getProperty("/items") as SkillItem[]));
    }
  }

  /** Costruisce l'array personale (con abilitazioni) da inviare al backend. */
  private _buildPersonalePayload(sPosId: string): object[] {
    const aStaff = this._oModelStaff.getProperty("/data") as {
      idDipendente: string;
      tmpId: string;
      nome: string;
      cognome: string;
      reparto: string;
      mansione: string;
    }[];
    return aStaff.map((persona) => {
      const sKey = persona.idDipendente || persona.tmpId;
      const aCached = this._oSkillsCache.get(sKey) ?? [];
      const aAbilitazioni = aCached
        .filter((s) => s.flagAttiva)
        .map((s) => ({
          tipoAbilitazione_codice: s.codice,
          flagAttiva: true,
          inizioAbilitazione: s.inizioAbilitazione || null,
          scadenzaAbilitazione: s.scadenzaAbilitazione || null,
        }));
      return {
        posTestata_idPos: sPosId,
        idDipendente: persona.idDipendente || persona.tmpId,
        nome: persona.nome,
        cognome: persona.cognome,
        reparto: persona.reparto,
        mansione: persona.mansione,
        abilitazioni: aAbilitazioni,
      };
    });
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  /** Carica il POS esistente con il personale e le abilitazioni, popola modelli e cache skill. */
  private async _loadPOSWithPersonale(): Promise<void> {
    const oData = await this.getEntity<Record<string, unknown>>(
      "/PosTestataSet",
      { idPos: this._sPosId },
      { expand: ["personale($expand=abilitazioni)"] },
    );

    this._oModelPOS.setData({
      ...oData,
      dataRicezioneCruscotto: dateUtils.formatISOStringToYYYYMMDD(oData.dataRicezioneCruscotto as string | null),
      isEdit: true,
      formTitle: this.getText("lbl_pos_form") + ": " + this._sPosId,
    });

    const aPersonale = (oData.personale as Record<string, unknown>[]) ?? [];
    this._oModelStaff.setProperty("/data", aPersonale);
    this._oModelStaff.setProperty("/count", aPersonale.length);

    this._oSkillsCache.clear();
    for (const persona of aPersonale) {
      const sKey = persona.idDipendente as string;
      const aAbilitazioni = (persona.abilitazioni as Record<string, unknown>[]) ?? [];
      const aItems: SkillItem[] = this._aSkillTypes.map((type) => {
        const found = aAbilitazioni.find((a) => a.tipoAbilitazione_codice === type.codice);
        return {
          codice: type.codice,
          descrizione: type.descrizione,
          categoria: type.categoria as "ferroviaria" | "decreto",
          flagAttiva: found ? (found.flagAttiva as boolean) : false,
          inizioAbilitazione: found ? ((found.inizioAbilitazione as string) ?? null) : null,
          scadenzaAbilitazione: found ? ((found.scadenzaAbilitazione as string) ?? null) : null,
        };
      });
      this._oSkillsCache.set(sKey, aItems);
    }
  }

  /** Carica l'anagrafica dei tipi di abilitazione disponibili. */
  private async _loadSkillTypes(): Promise<void> {
    const { data } = await this.getEntitySet<{ codice: string; categoria: string; descrizione: string }>(
      "/AnagraficaAbilitazioniSet",
    );
    this._aSkillTypes = data;
  }
}
