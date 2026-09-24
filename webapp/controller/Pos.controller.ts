import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import { createPosStatusModel } from "../model/models";
import MessageBox from "sap/m/MessageBox";
import Table from "sap/m/Table";
import ColumnListItem from "sap/m/ColumnListItem";
import Column from "sap/m/Column";
import Input from "sap/m/Input";
import Item from "sap/ui/core/Item";
import Label from "sap/m/Label";
import Text from "sap/m/Text";
import TableSelectDialog from "sap/m/TableSelectDialog";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import DatePicker from "sap/m/DatePicker";
import Event from "sap/ui/base/Event";
import entityUtils from "../utils/entityUtils";
import p13nDialogUtils from "../utils/p13nDialogUtils";
import p13nColumnUtils from "../utils/p13nColumnUtils";
import xlsxUtils from "../utils/xlsxUtils";
import dateUtils from "../utils/dateUtils";

function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

interface IContractRow {
  codiceContratto: string;
  codiceAtto?: string;
  titoloDelContratto?: string;
  codiceSAPOrganizzazioneAcquisti?: string;
  codiceSAPGruppoAcquisti?: string;
}

interface IImpresaRow {
  nomeImpresa: string;
  codiceFiscale?: string;
  ruolo?: string;
}

const DEFAULT_POS = {
  idPos: "",
  contratto: "",
  contrattoValueState: "None" as string,
  contrattoValueStateText: "",
  codiceAtto: "",
  impresaAppaltatrice: "",
  impresaValueState: "None" as string,
  impresaValueStateText: "",
  ruoloImpresa: "",
  codiceContrattoSuperiore: "",
  statoPos: "",
  note: "",
  datoreLavoro: "",
  rspp: "",
  rls: "",
  medicocompetente: "",
  direttoreCantiere: "",
  direttoreTecnico: "",
  dataRedazione: "",
  dataProtocollo: "",
  inizioValidita: "",
  fineValidita: "",
  linkCde: "",
  isEdit: false,
  formTitle: "",
};

const DEFAULT_STAFF = { data: [] as object[], count: 0 };

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
  private _oImpresaDialog?: TableSelectDialog;
  private _oSkillsCache = new Map<string, SkillItem[]>();
  private _aSkillTypes: { codice: string; categoria: string; descrizione: string }[] = [];
  private _oStaffSortState: { key: string; state: "asc" | "desc" } | null = null;
  private _sStaffSearchQuery = "";
  private _aStaffAllRows: object[] = [];

  public onInit(): void {
    this._oModelPOS = new JSONModel(structuredClone(DEFAULT_POS));
    this._oModelStaff = new JSONModel(structuredClone(DEFAULT_STAFF));
    this._oModelSkills = new JSONModel(structuredClone(DEFAULT_SKILLS));

    this.setModel(this._oModelPOS, "POS");
    this.setModel(this._oModelStaff, "Staff");
    this.setModel(this._oModelSkills, "Skills");
    this.setModel(createPosStatusModel(), "PosStatus");

    this.getRouter().getRoute("RoutePos")!.attachPatternMatched(this._onRouteMatched, this);
    this.getRouter().getRoute("RoutePosNew")!.attachPatternMatched(this._onRouteMatched, this);
  }

  public onAfterRendering(): void {
    if (this._bP13nRegistered) return;
    const oTable = this.byId("tblStaff") as Table;
    if (oTable) {
      p13nDialogUtils.register(oTable);
      p13nDialogUtils.assignColumnMenus(oTable, this._onQuickSortStaff.bind(this, oTable));
      this._bP13nRegistered = true;
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
      formTitle: bIsEdit ? this.getText("lblPosForm") : this.getText("lblPosFormCreate"),
    });

    this._oModelSkills.setData(structuredClone(DEFAULT_SKILLS));
    this._oModelStaff.setData(structuredClone(DEFAULT_STAFF));
    this._aStaffAllRows = [];
    this._oStaffSortState = null;
    this._sStaffSearchQuery = "";

    void this._getContractsCache();

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
    MessageBox.confirm(this.getText("msgConfirmSave"), {
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
      MessageBox.error(this.getText("msgContractRequired"));
      return;
    }

    const aStaff = this._aStaffAllRows as { reparto: string }[];
    if (aStaff.some((p) => !p.reparto?.trim())) {
      MessageBox.error(this.getText("msgRepartoRequired"));
      return;
    }

    this._flushOpenSkillsToCache();

    const aSkillItems = (this._oModelSkills.getProperty("/items") as SkillItem[]) || [];
    for (const skill of aSkillItems) {
      if (skill.flagAttiva && dateUtils.isDateAfter(skill.inizioAbilitazione, skill.scadenzaAbilitazione)) {
        MessageBox.error(this.getText("msgErrorSaveDate"));
        return;
      }
    }

    try {
      const oPosPayload = {
        idPos: sPosId,
        contratto_codiceContratto: this._oModelPOS.getProperty("/contratto"),
        impresaAppaltatrice: this._oModelPOS.getProperty("/impresaAppaltatrice"),
        ruoloImpresa: this._oModelPOS.getProperty("/ruoloImpresa"),
        codiceContrattoSuperiore: this._oModelPOS.getProperty("/codiceContrattoSuperiore"),
        statoPos: this._oModelPOS.getProperty("/statoPos"),
        note: this._oModelPOS.getProperty("/note"),
        datoreLavoro: sDatore,
        rspp: this._oModelPOS.getProperty("/rspp"),
        rls: sRls,
        medicocompetente: sMedico,
        direttoreCantiere: this._oModelPOS.getProperty("/direttoreCantiere"),
        direttoreTecnico: this._oModelPOS.getProperty("/direttoreTecnico"),
        dataRedazione: this._oModelPOS.getProperty("/dataRedazione") || null,
        dataProtocollo: this._oModelPOS.getProperty("/dataProtocollo") || null,
        inizioValidita: this._oModelPOS.getProperty("/inizioValidita") || null,
        fineValidita: this._oModelPOS.getProperty("/fineValidita") || null,
        linkCde: this._oModelPOS.getProperty("/linkCde"),
        personale: this._buildPersonalePayload(sPosId),
      };

      if (bIsEdit) {
        await this.updateEntity("/PosTestataSet", { idPos: sPosId }, oPosPayload);
        MessageBox.success(this.getText("msgSaveSuccess"), {
          onClose: () => {
            this.getRouter().navTo("RoutePosList");
          },
        });
      } else {
        await this.createEntity("/PosTestataSet", oPosPayload);
        MessageBox.success(this.getText("msgSaveSuccess"), {
          onClose: () => {
            this.getRouter().navTo("RoutePosList");
          },
        });
      }
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
        title: this.getText("lblSelectContract"),
        search: (oEvt: any) => this._filterContractDialog(oEvt.getParameter("value") as string),
        liveChange: (oEvt: any) => this._filterContractDialog(oEvt.getParameter("value") as string),
        confirm: (oEvt: any) => this._onContractSelected(oEvt),
        columns: [
          new Column({ header: new Label({ text: this.getText("lblActCode") }) }),
          new Column({ header: new Label({ text: this.getText("lblContractCode") }) }),
          new Column({ header: new Label({ text: this.getText("lblContractTitle") }) }),
          new Column({ header: new Label({ text: this.getText("lblSapPurchaseOrgCode") }) }),
          new Column({ header: new Label({ text: this.getText("lblSapPurchaseGroupCode") }) }),
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
        new Filter({ path: "codiceAtto", operator: FilterOperator.Contains, value1: sValue, caseSensitive: false }),
        new Filter({
          path: "codiceContratto",
          operator: FilterOperator.Contains,
          value1: sValue,
          caseSensitive: false,
        }),
        new Filter({
          path: "titoloDelContratto",
          operator: FilterOperator.Contains,
          value1: sValue,
          caseSensitive: false,
        }),
        new Filter({
          path: "codiceSAPOrganizzazioneAcquisti",
          operator: FilterOperator.Contains,
          value1: sValue,
          caseSensitive: false,
        }),
        new Filter({
          path: "codiceSAPGruppoAcquisti",
          operator: FilterOperator.Contains,
          value1: sValue,
          caseSensitive: false,
        }),
      ],
      and: false,
    });
    oBinding.filter([oFilter]);
  }

  private _onContractSelected(oEvent: any): void {
    const oItem = oEvent.getParameter("selectedItem");
    if (!oItem) return;
    this._selectContract(oItem.getBindingContext()!.getObject() as IContractRow);
  }

  private _selectContract(oRow: IContractRow): void {
    const sOldContratto = this._oModelPOS.getProperty("/contratto") as string;
    if (sOldContratto !== oRow.codiceContratto) {
      this._oModelPOS.setProperty("/impresaAppaltatrice", "");
      this._oModelPOS.setProperty("/ruoloImpresa", "");
      this._setImpresaValueState("None");
      this._aImpreseCache = undefined;
    }
    this._setContractValueState("None");
    this._oModelPOS.setProperty("/contratto", oRow.codiceContratto);
    this._oModelPOS.setProperty("/codiceAtto", oRow.codiceAtto ?? "");
  }

  private _setContractValueState(sState: "None" | "Error", sText = ""): void {
    this._oModelPOS.setProperty("/contrattoValueState", sState);
    this._oModelPOS.setProperty("/contrattoValueStateText", sText);
  }

  private _resetContractDerivedData(): void {
    this._oModelPOS.setProperty("/codiceAtto", "");
    this._oModelPOS.setProperty("/impresaAppaltatrice", "");
    this._oModelPOS.setProperty("/ruoloImpresa", "");
    this._setImpresaValueState("None");
    this._aImpreseCache = undefined;
  }

  // ── Contract suggestions ──────────────────────────────────────────────────────
  // Elenco contratti caricato una sola volta e tenuto in memoria: il filtro alla
  // digitazione è locale (JSONModel), quindi istantaneo e senza una request per lettera.

  private _aContractsCache?: IContractRow[];
  private _oContractSuggestModel?: JSONModel;

  private async _getContractsCache(): Promise<IContractRow[]> {
    if (!this._aContractsCache) {
      try {
        const oBinding = this.getView()!.getModel()!.bindList("/Contratti", undefined, [], [], {
          $select: "codiceAtto,codiceContratto,titoloDelContratto,codiceSAPOrganizzazioneAcquisti,codiceSAPGruppoAcquisti",
        }) as ODataListBinding;
        const aContexts = await oBinding.requestContexts(0, 10000);
        this._aContractsCache = aContexts.map((oCtx) => oCtx.getObject() as IContractRow);
      } catch (e) {
        entityUtils.handleError(e as Error);
        return [];
      }
    }
    return this._aContractsCache;
  }

  public async onContractSuggest(oEvent: any): Promise<void> {
    const oInput = oEvent.getSource() as Input;
    const sValue = ((oEvent.getParameter("suggestValue") as string) || "").toLowerCase();

    if (!this._oContractSuggestModel) {
      this._oContractSuggestModel = new JSONModel({ rows: [] });
      oInput.bindAggregation("suggestionItems", {
        path: "contractSuggest>/rows",
        template: new Item({ text: "{contractSuggest>codiceContratto}" }),
      });
      oInput.setModel(this._oContractSuggestModel, "contractSuggest");
    }

    const aContracts = await this._getContractsCache();
    const aFiltered = sValue
      ? aContracts.filter(
          (oRow) =>
            oRow.codiceAtto?.toLowerCase().includes(sValue) ||
            oRow.codiceContratto?.toLowerCase().includes(sValue) ||
            oRow.titoloDelContratto?.toLowerCase().includes(sValue),
        )
      : aContracts;

    this._oContractSuggestModel.setProperty("/rows", aFiltered);
  }

  public onContractSuggestionItemSelected(oEvent: any): void {
    const oItem = oEvent.getParameter("selectedItem");
    if (!oItem) return;
    this._selectContract(oItem.getBindingContext("contractSuggest")!.getObject() as IContractRow);
  }

  // Il contratto deve essere uno di quelli esistenti: se l'utente digita un valore libero
  // (o lo cancella) senza scegliere un suggerimento, validiamo contro la cache all'uscita
  // dal campo e, se non corrisponde a nessun codiceContratto, segnaliamo errore e puliamo
  // i dati derivati dal contratto precedente.
  public async onContractChange(oEvent: any): Promise<void> {
    const sValue = (oEvent.getParameter("value") as string) || "";

    if (!sValue) {
      this._setContractValueState("None");
      this._resetContractDerivedData();
      return;
    }

    const aContracts = await this._getContractsCache();
    const oMatch = aContracts.find((oRow) => oRow.codiceContratto === sValue);

    if (!oMatch) {
      this._setContractValueState("Error", this.getText("msgContrattoInesistente"));
      this._resetContractDerivedData();
      return;
    }

    this._selectContract(oMatch);
  }

  // ── Impresa suggestions ────────────────────────────────────────────────────────
  // Elenco imprese caricato dalla function import getImpreseContratto, in base al
  // contratto selezionato, e tenuto in cache: il filtro alla digitazione è locale.

  private _aImpreseCache?: IImpresaRow[];
  private _oImpresaSuggestModel?: JSONModel;

  private async _getImpreseCache(): Promise<IImpresaRow[]> {
    const sContratto = this._oModelPOS.getProperty("/contratto") as string;
    if (!sContratto) return [];

    if (!this._aImpreseCache) {
      try {
        this._aImpreseCache = await this.callFunctionImportCollection<IImpresaRow>("getImpreseContratto", {
          codiceContratto: sContratto,
        });
      } catch (e) {
        entityUtils.handleError(e as Error);
        return [];
      }
    }
    return this._aImpreseCache;
  }

  public async onImpresaValueHelp(): Promise<void> {
    const sContratto = this._oModelPOS.getProperty("/contratto") as string;
    if (!sContratto) return;

    const aImprese = await this._getImpreseCache();

    if (!this._oImpresaDialog) {
      this._oImpresaDialog = new TableSelectDialog({
        title: this.getText("lblSelectImpresa"),
        search: (oEvt: any) => this._filterImpresaDialog(oEvt.getParameter("value") as string),
        liveChange: (oEvt: any) => this._filterImpresaDialog(oEvt.getParameter("value") as string),
        confirm: (oEvt: any) => this._onImpresaSelected(oEvt),
        columns: [
          new Column({ header: new Label({ text: this.getText("lblRagioneSociale") }) }),
          new Column({ header: new Label({ text: this.getText("lblCodiceFiscale") }) }),
          new Column({ header: new Label({ text: this.getText("lblCompanyRole") }) }),
        ],
      });
      this._oImpresaDialog.setModel(new JSONModel({ items: [] }), "ImpresaList");
      this.getView()!.addDependent(this._oImpresaDialog);
    }

    (this._oImpresaDialog.getModel("ImpresaList") as JSONModel).setProperty("/items", aImprese);
    this._oImpresaDialog.bindAggregation("items", {
      path: "ImpresaList>/items",
      template: new ColumnListItem({
        cells: [
          new Text({ text: "{ImpresaList>nomeImpresa}", wrapping: false }),
          new Text({ text: "{ImpresaList>codiceFiscale}", wrapping: false }),
          new Text({ text: "{ImpresaList>ruolo}", wrapping: false }),
        ],
      }),
    });
    this._oImpresaDialog.open("");
  }

  private _filterImpresaDialog(sValue: string): void {
    const oBinding = this._oImpresaDialog!.getBinding("items") as ODataListBinding;
    if (!sValue) {
      oBinding.filter([]);
      return;
    }
    oBinding.filter([
      new Filter({
        filters: [
          new Filter({
            path: "nomeImpresa",
            operator: FilterOperator.Contains,
            value1: sValue,
            caseSensitive: false,
          }),
          new Filter({
            path: "codiceFiscale",
            operator: FilterOperator.Contains,
            value1: sValue,
            caseSensitive: false,
          }),
          new Filter({ path: "ruolo", operator: FilterOperator.Contains, value1: sValue, caseSensitive: false }),
        ],
        and: false,
      }),
    ]);
  }

  private _selectImpresa(oRow: IImpresaRow): void {
    this._setImpresaValueState("None");
    this._oModelPOS.setProperty("/impresaAppaltatrice", oRow.nomeImpresa);
    this._oModelPOS.setProperty("/ruoloImpresa", oRow.ruolo ?? "");
  }

  private _setImpresaValueState(sState: "None" | "Error", sText = ""): void {
    this._oModelPOS.setProperty("/impresaValueState", sState);
    this._oModelPOS.setProperty("/impresaValueStateText", sText);
  }

  private _onImpresaSelected(oEvent: any): void {
    const oItem = oEvent.getParameter("selectedItem");
    if (!oItem) return;
    const oRow = oItem.getBindingContext("ImpresaList")!.getObject() as IImpresaRow;
    this._selectImpresa(oRow);
  }

  public async onImpresaSuggest(oEvent: any): Promise<void> {
    const oInput = oEvent.getSource() as Input;
    const sValue = ((oEvent.getParameter("suggestValue") as string) || "").toLowerCase();

    if (!this._oImpresaSuggestModel) {
      this._oImpresaSuggestModel = new JSONModel({ rows: [] });
      oInput.bindAggregation("suggestionItems", {
        path: "impresaSuggest>/rows",
        template: new Item({ text: "{impresaSuggest>nomeImpresa}" }),
      });
      oInput.setModel(this._oImpresaSuggestModel, "impresaSuggest");
    }

    const aImprese = await this._getImpreseCache();
    const aFiltered = sValue
      ? aImprese.filter(
          (oRow) =>
            oRow.nomeImpresa?.toLowerCase().includes(sValue) || oRow.codiceFiscale?.toLowerCase().includes(sValue),
        )
      : aImprese;

    this._oImpresaSuggestModel.setProperty("/rows", aFiltered);
  }

  public onImpresaSuggestionItemSelected(oEvent: any): void {
    const oItem = oEvent.getParameter("selectedItem");
    if (!oItem) return;
    this._selectImpresa(oItem.getBindingContext("impresaSuggest")!.getObject() as IImpresaRow);
  }

  public async onImpresaChange(oEvent: any): Promise<void> {
    const sValue = (oEvent.getParameter("value") as string) || "";

    if (!sValue) {
      this._setImpresaValueState("None");
      this._oModelPOS.setProperty("/ruoloImpresa", "");
      return;
    }

    const aImprese = await this._getImpreseCache();
    const oMatch = aImprese.find((oRow) => oRow.nomeImpresa === sValue);

    if (!oMatch) {
      this._setImpresaValueState("Error", this.getText("msgImpresaInesistente"));
      this._oModelPOS.setProperty("/ruoloImpresa", "");
      return;
    }

    this._selectImpresa(oMatch);
  }

  public onSkillDateChange(oEvent: Event): void {
    const oSource = oEvent.getSource() as DatePicker;
    const oListItem = oSource.getParent() as ColumnListItem;
    const aCells = oListItem.getCells();
    const oPickerInizio = aCells[1] as DatePicker;
    const oPickerFine = aCells[2] as DatePicker;
    const sInizio = oPickerInizio.getValue() || "";
    const sFine = oPickerFine.getValue() || "";
    const bError = dateUtils.isDateAfter(sInizio, sFine);
    const sState = bError ? "Error" : "None";
    const sText = bError ? this.getText("msgErrorSkillRange") : "";

    oPickerInizio.setValueState(sState as any);
    oPickerInizio.setValueStateText(sText);
    oPickerFine.setValueState(sState as any);
    oPickerFine.setValueStateText(sText);
  }

  // ── Staff management ──────────────────────────────────────────────────────

  public onAddStaff(): void {
    this._aStaffAllRows.unshift({
      ...structuredClone(DEFAULT_STAFF_ROW),
      posTestata_idPos: this._sPosId,
      tmpId: generateRandomId(),
    });
    this._refreshStaffTable();
  }

  public onDeleteStaff(oEvent: any): void {
    const oContext = oEvent.getSource().getBindingContext("Staff");
    if (!oContext) return;
    const oRow = oContext.getObject() as object;

    MessageBox.confirm(this.getText("msgConfirmDeleteEmployee"), {
      onClose: (sAction: string | null) => {
        if (sAction === MessageBox.Action.OK) {
          this._aStaffAllRows = this._aStaffAllRows.filter((row) => row !== oRow);
          this._refreshStaffTable();
        }
      },
    });
  }

  private _onQuickSortStaff(_oTable: Table, sKey: string, sSortOrder: string): void {
    this._oStaffSortState = sSortOrder === "None" ? null : { key: sKey, state: sSortOrder === "Descending" ? "desc" : "asc" };
    this._refreshStaffTable();
  }

  public onSearchStaff(oEvent: any): void {
    this._sStaffSearchQuery = (oEvent.getParameter("query") || oEvent.getParameter("newValue") || "") as string;
    this._refreshStaffTable();
  }

  /** Ricalcola /data (visualizzati in tabella) da _aStaffAllRows applicando ricerca e sort correnti. */
  private _refreshStaffTable(): void {
    const sQuery = this._sStaffSearchQuery.toLowerCase();
    const oTable = this.byId("tblStaff") as Table;
    const aSearchableFields = oTable ? p13nColumnUtils.getVisibleP13nKeys(oTable) : [];

    let aRows = !sQuery
      ? this._aStaffAllRows
      : this._aStaffAllRows.filter((row) =>
          aSearchableFields.some((sField) =>
            String((row as Record<string, unknown>)[sField] ?? "")
              .toLowerCase()
              .includes(sQuery),
          ),
        );

    if (this._oStaffSortState) {
      const { key, state } = this._oStaffSortState;
      aRows = [...aRows].sort((a, b) => {
        const vA = (a as Record<string, unknown>)[key] ?? "";
        const vB = (b as Record<string, unknown>)[key] ?? "";
        const iCompare = String(vA).localeCompare(String(vB), undefined, { numeric: true });
        return state === "desc" ? -iCompare : iCompare;
      });
    }

    this._oModelStaff.setProperty("/data", aRows);
    this._oModelStaff.setProperty("/count", aRows.length);
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
    const aStaff = this._aStaffAllRows as {
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
    const oData = await this.getEntity<
      Record<string, unknown> & { contratto_codiceContratto?: string; contratto?: { codiceAtto?: string } }
    >("/PosTestataSet", { idPos: this._sPosId }, { expand: ["personale($expand=abilitazioni)", "contratto"] });

    this._oModelPOS.setData({
      ...oData,
      contratto: oData.contratto_codiceContratto,
      codiceAtto: oData.contratto?.codiceAtto ?? "",
      isEdit: true,
      formTitle: this.getText("lblPosForm"),
    });

    const aPersonale = (oData.personale as Record<string, unknown>[]) ?? [];
    this._aStaffAllRows = aPersonale;
    this._refreshStaffTable();

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
