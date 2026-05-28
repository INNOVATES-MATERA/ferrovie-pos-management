import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import MessageBox from "sap/m/MessageBox";
import Table from "sap/ui/table/Table";
import entityUtils from "../utils/entityUtils";
import tableSettingsUtils from "../utils/tableSettingsUtils";
import { createPosStatusModel } from "../model/models";

const DEFAULT_POS = {
    posId: "", contractCode: "", contractorCompany: "", companyRole: "",
    parentContractCode: "", client: "", employer: "", rspp: "", rls: "",
    worksDirector: "", firstAidPersonnel: "", firePersonnel: "",
    status: "", revision: "", draftDate: "", receptionDate: "",
    validityStart: "", validityEnd: "", link: "",
    isEdit: false,
    formTitle: "",
};

const DEFAULT_STAFF = { data: [] as object[], count: 0 };

const DEFAULT_STAFF_ROW = {
    posId: "", employeeId: "", firstName: "", lastName: "", department: "", role: "",
};

type SkillItem = {
    skillId: string;
    label: string;
    selected: boolean;
    startDate: string | null;
    endDate: string | null;
};

type SkillsModel = {
    isOpen: boolean;
    employeeId: string;
    firstName: string;
    lastName: string;
    items: SkillItem[];
};

const SKILL_TYPES: { skillId: string; label: string }[] = [
    { skillId: "SK-01", label: "Primo Soccorso" },
    { skillId: "SK-02", label: "Antincendio Base" },
    { skillId: "SK-03", label: "Antincendio Avanzato" },
    { skillId: "SK-04", label: "Lavori in Quota" },
    { skillId: "SK-05", label: "Spazi Confinati" },
    { skillId: "SK-06", label: "Rischio Elettrico" },
    { skillId: "SK-07", label: "Movimentazione Carichi" },
    { skillId: "SK-08", label: "Uso DPI" },
    { skillId: "SK-09", label: "Ponteggi" },
    { skillId: "SK-10", label: "Gru e Apparecchi di Sollevamento" },
    { skillId: "SK-11", label: "Amianto" },
];

const MOCK_EMPLOYEE_SKILLS: { employeeId: string; skillId: string; startDate: string; endDate: string }[] = [
    { employeeId: "EMP-001", skillId: "SK-01", startDate: "2023-01-10", endDate: "2025-01-10" },
    { employeeId: "EMP-001", skillId: "SK-02", startDate: "2023-03-15", endDate: "2025-03-15" },
    { employeeId: "EMP-001", skillId: "SK-04", startDate: "2022-06-01", endDate: "2024-06-01" },
    { employeeId: "EMP-002", skillId: "SK-01", startDate: "2024-02-20", endDate: "2026-02-20" },
    { employeeId: "EMP-002", skillId: "SK-08", startDate: "2023-09-01", endDate: "2025-09-01" },
    { employeeId: "EMP-003", skillId: "SK-06", startDate: "2023-05-10", endDate: "2025-05-10" },
    { employeeId: "EMP-003", skillId: "SK-07", startDate: "2022-11-01", endDate: "2024-11-01" },
    { employeeId: "EMP-003", skillId: "SK-09", startDate: "2023-07-15", endDate: "2025-07-15" },
    { employeeId: "EMP-004", skillId: "SK-01", startDate: "2024-01-05", endDate: "2026-01-05" },
    { employeeId: "EMP-004", skillId: "SK-03", startDate: "2023-08-20", endDate: "2025-08-20" },
    { employeeId: "EMP-005", skillId: "SK-05", startDate: "2022-04-01", endDate: "2024-04-01" },
    { employeeId: "EMP-005", skillId: "SK-11", startDate: "2023-10-10", endDate: "2025-10-10" },
    { employeeId: "EMP-006", skillId: "SK-01", startDate: "2024-03-01", endDate: "2026-03-01" },
    { employeeId: "EMP-006", skillId: "SK-02", startDate: "2023-12-15", endDate: "2025-12-15" },
    { employeeId: "EMP-007", skillId: "SK-04", startDate: "2022-09-01", endDate: "2024-09-01" },
    { employeeId: "EMP-007", skillId: "SK-06", startDate: "2023-02-10", endDate: "2025-02-10" },
    { employeeId: "EMP-007", skillId: "SK-10", startDate: "2023-06-20", endDate: "2025-06-20" },
];

const DEFAULT_SKILLS: SkillsModel = {
    isOpen: false, employeeId: "", firstName: "", lastName: "",
    items: [],
};

const MOCK_STAFF_DATA = [
    { posId: "POS-001", employeeId: "EMP-001", firstName: "Mario", lastName: "Rossi", department: "Sicurezza", role: "Responsabile" },
    { posId: "POS-001", employeeId: "EMP-002", firstName: "Anna", lastName: "Bianchi", department: "Operativo", role: "Addetto" },
    { posId: "POS-002", employeeId: "EMP-003", firstName: "Carlo", lastName: "Neri", department: "Tecnico", role: "Tecnico" },
    { posId: "POS-002", employeeId: "EMP-004", firstName: "Sara", lastName: "Gialli", department: "Operativo", role: "Addetto" },
    { posId: "POS-003", employeeId: "EMP-005", firstName: "Luca", lastName: "Blu", department: "Sicurezza", role: "RSPP" },
    { posId: "POS-004", employeeId: "EMP-006", firstName: "Elena", lastName: "Verdi", department: "Operativo", role: "Addetto" },
    { posId: "POS-005", employeeId: "EMP-007", firstName: "Marco", lastName: "Ferrari", department: "Tecnico", role: "DL" },
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

    public onInit(): void {
        this._oModelPOS = new JSONModel(structuredClone(DEFAULT_POS));
        this._oModelStaff = new JSONModel(structuredClone(DEFAULT_STAFF));
        this._oModelSkills = new JSONModel(structuredClone(DEFAULT_SKILLS));

        this.setModel(this._oModelPOS, "POS");
        this.setModel(createPosStatusModel(), "PosStatus");
        this.setModel(this._oModelStaff, "Staff");
        this.setModel(this._oModelSkills, "Skills");

        this.getRouter()
            .getRoute("RoutePos")!
            .attachPatternMatched(this._onRouteMatched, this);
    }

    public onAfterRendering(): void {
        const oTable = this.byId("tblStaff") as Table;
        if (oTable) {
            tableSettingsUtils.registerForP13n(oTable);
        }
    }

    private async _onRouteMatched(oEvent: any): Promise<void> {
        const oArgs = oEvent.getParameter("arguments");
        this._sContractCode = decodeURIComponent(oArgs.contractCode as string);
        this._sPosId = decodeURIComponent(oArgs.posId as string);

        const bIsEdit = this._sPosId !== "new";

        this._oModelPOS.setData({
            ...structuredClone(DEFAULT_POS),
            contractCode: this._sContractCode,
            posId: bIsEdit ? this._sPosId : "",
            isEdit: bIsEdit,
            formTitle: bIsEdit
                ? this.getText("lbl_pos_form") + ": " + this._sPosId
                : this.getText("lbl_pos_form_create"),
        });

        this._oModelSkills.setData(structuredClone(DEFAULT_SKILLS));

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

    public async onSave(): Promise<void> {
        try {
            this.setBusy(true);

            if (this._oModelPOS.getProperty("/isEdit")) {
                // Stub: await this.updateEntity("POS", oData);
            } else {
                // Stub: await this.createEntity("POS", oData);
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
        const aData = this._oModelStaff.getProperty("/data") as typeof DEFAULT_STAFF_ROW[];
        aData.unshift({ ...structuredClone(DEFAULT_STAFF_ROW), posId: this._sPosId });
        this._oModelStaff.setProperty("/data", aData);
        this._oModelStaff.setProperty("/count", aData.length);
    }

    public onDeleteStaff(): void {
        const oTable = this.byId("tblStaff") as Table;
        const aIndices = oTable.getSelectedIndices();
        if (!aIndices.length) {
            MessageBox.warning(this.getText("msg_no_selection"));
            return;
        }
        MessageBox.confirm(this.getText("msg_confirm_delete"), {
            onClose: async (sAction: string | null) => {
                if (sAction === MessageBox.Action.OK) {
                    const aData = this._oModelStaff.getProperty("/data") as object[];
                    const aIndexSet = new Set(aIndices);
                    const aFiltered = aData.filter((_, i) => !aIndexSet.has(i));
                    this._oModelStaff.setProperty("/data", aFiltered);
                    this._oModelStaff.setProperty("/count", aFiltered.length);
                    oTable.clearSelection();
                }
            },
        });
    }

    // ── Skills management ─────────────────────────────────────────────────────

    public onOpenSkills(oEvent: any): void {
        const oContext = oEvent.getSource().getParent().getBindingContext("Staff");
        if (!oContext) return;
        const oRow = oContext.getObject() as { employeeId: string; firstName: string; lastName: string };

        // Toggle: se già aperto per lo stesso dipendente, chiudi
        const bSameEmployee = this._oModelSkills.getProperty("/isOpen") &&
            this._oModelSkills.getProperty("/employeeId") === oRow.employeeId;
        if (bSameEmployee) {
            this._oModelSkills.setData(structuredClone(DEFAULT_SKILLS));
            return;
        }

        const aEmployeeSkills = MOCK_EMPLOYEE_SKILLS.filter((s) => s.employeeId === oRow.employeeId);

        const aItems: SkillItem[] = SKILL_TYPES.map((type) => {
            const found = aEmployeeSkills.find((s) => s.skillId === type.skillId);
            return {
                skillId: type.skillId,
                label: type.label,
                selected: !!found,
                startDate: found?.startDate ?? null,
                endDate: found?.endDate ?? null,
            };
        });

        this._oModelSkills.setData({
            isOpen: true,
            employeeId: oRow.employeeId,
            firstName: oRow.firstName,
            lastName: oRow.lastName,
            items: aItems,
        });
    }

    public onSelectAll(oEvent: any): void {
        const bSelected = oEvent.getSource().getSelected() as boolean;
        const aItems = this._oModelSkills.getProperty("/items") as SkillItem[];
        aItems.forEach((item, i) => {
            this._oModelSkills.setProperty(`/items/${i}/selected`, bSelected);
            if (!bSelected) {
                this._oModelSkills.setProperty(`/items/${i}/startDate`, null);
                this._oModelSkills.setProperty(`/items/${i}/endDate`, null);
            }
        });
    }

    public onSkillChange(oEvent: any): void {
        const oCheckBox = oEvent.getSource();
        const oCtx = oCheckBox.getBindingContext("Skills");
        if (!oCtx) return;

        const sPath = oCtx.getPath(); // e.g. "/items/2"
        const bSelected = oCheckBox.getSelected() as boolean;
        if (!bSelected) {
            this._oModelSkills.setProperty(`${sPath}/startDate`, null);
            this._oModelSkills.setProperty(`${sPath}/endDate`, null);
        }

        // Aggiorna stato "Seleziona tutto"
        const aItems = this._oModelSkills.getProperty("/items") as SkillItem[];
        const bAllSelected = aItems.length > 0 && aItems.every((item) => item.selected);
        const oChk = this.byId("chkSelectAll") as any;
        if (oChk) oChk.setSelected(bAllSelected);
    }

    public async onSaveSkills(): Promise<void> {
        try {
            this.setBusy(true);
            // Stub: salvare le abilitazioni per il dipendente
            // await this.createEntity("Skills", this._oModelSkills.getData());
            this._oModelSkills.setData(structuredClone(DEFAULT_SKILLS));
        } catch (e) {
            entityUtils.handleError(e as Error);
        } finally {
            this.setBusy(false);
        }
    }

    public onCancelSkills(): void {
        this._oModelSkills.setData(structuredClone(DEFAULT_SKILLS));
    }

    // ── Data loading ──────────────────────────────────────────────────────────

    private async _loadPOS(): Promise<void> {
        // Stub: caricare POS per posId
        // const data = await this.getEntity("POS", { posId: this._sPosId });
        // this._oModelPOS.setData({ ...data, isEdit: true, formTitle: ... });
    }

    private async _loadStaff(): Promise<void> {
        const aFiltered = MOCK_STAFF_DATA.filter((row) => row.posId === this._sPosId);
        this._oModelStaff.setProperty("/data", aFiltered);
        this._oModelStaff.setProperty("/count", aFiltered.length);
    }
}
