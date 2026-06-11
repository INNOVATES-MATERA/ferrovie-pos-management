import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import JSONModel from "sap/ui/model/json/JSONModel";
import Router from "sap/ui/core/routing/Router";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";

/**
 * @namespace posmanagement.controller
 */
export default abstract class BaseController extends Controller {

    public getModel(sName?: string): JSONModel {
        return this.getView()!.getModel(sName) as JSONModel;
    }

    public setModel(oModel: JSONModel, sName?: string): JSONModel {
        this.getView()!.setModel(oModel, sName);
        return this.getModel(sName);
    }

    public getRouter(): Router {
        return UIComponent.getRouterFor(this);
    }

    public navTo(sName: string, oParameters?: Record<string, string>, bReplace?: boolean): void {
        function customEncode(value: string): string {
            return encodeURIComponent(value).replace(/%23/g, "#");
        }
        let oEncoded: Record<string, string> | undefined;
        if (oParameters) {
            oEncoded = {};
            Object.keys(oParameters).forEach((key) => {
                oEncoded![key] = customEncode(String(oParameters[key]));
            });
        }
        this.getRouter().navTo(sName, oEncoded, undefined, bReplace);
    }

    public getText(sKey: string): string {
        const oModel = this.getOwnerComponent()!.getModel("i18n") as ResourceModel;
        const oBundle = oModel.getResourceBundle() as ResourceBundle;
        return oBundle.getText(sKey) as string;
    }

    protected getODataModel(sName?: string): ODataModel {
        return this.getView()!.getModel(sName) as ODataModel;
    }

    public async getEntitySet<T = object>(
        sEntityName: string,
        { filters = [] as Filter[], skip = undefined as number | undefined, top = undefined as number | undefined, model = undefined as string | undefined } = {}
    ): Promise<{ data: T[]; count: number }> {
        const oModel = this.getODataModel(model);
        const oBind = oModel.bindList(sEntityName, undefined, [], filters, { $count: true });
        const aContexts = await oBind.requestContexts(skip, top);
        return { data: aContexts.map((c) => c.getObject() as T), count: oBind.getLength() };
    }

    public async getEntity<T = object>(
        sEntityName: string,
        oKey: Record<string, unknown>,
        { expand = [] as string[], model = undefined as string | undefined } = {}
    ): Promise<T> {
        const oModel = this.getODataModel(model);
        const sKey = this._buildKey(oKey);
        const sPath = `${sEntityName}${sKey}`;
        const mParams: Record<string, unknown> = {};
        if (expand.length > 0) {
            mParams["$expand"] = expand.join(",");
        }
        const oBind = oModel.bindContext(sPath, undefined, mParams);
        return (await oBind.requestObject()) as T;
    }

    public async createEntity<T = object>(
        sEntityName: string,
        oData: Record<string, unknown>,
        { model = undefined as string | undefined } = {}
    ): Promise<T> {
        const oModel = this.getODataModel(model);
        const oList = oModel.bindList(sEntityName);
        const oContext = oList.create(oData);
        await oContext.created();
        return oContext.getObject() as T;
    }

    public async deleteEntity(
        sEntityName: string,
        aKeys: Record<string, unknown>[] = [],
        { model = undefined as string | undefined } = {}
    ): Promise<boolean> {
        if (aKeys.length === 0) return false;
        const oModel = this.getODataModel(model);
        const aFilters = aKeys.flatMap((oKey) =>
            Object.entries(oKey).map(([key, value]) => new Filter(key, FilterOperator.EQ, value))
        );
        const oBind = oModel.bindList(sEntityName, undefined, [], aFilters);
        const aContexts = await oBind.requestContexts();
        const aResults = await Promise.all(aContexts.map(async (c) => { await c.delete(); return c.isDeleted(); }));
        return aResults.every((r) => r === true);
    }

    public async deleteEntitiesBatch(
        sEntityName: string,
        aKeysList: Record<string, unknown>[],
        { model = undefined as string | undefined } = {}
    ): Promise<boolean> {
        if (aKeysList.length === 0) return false;
        const oModel = this.getODataModel(model);
        const aFilters = aKeysList.map((oKey) =>
            new Filter({
                filters: Object.entries(oKey).map(([key, value]) => new Filter(key, FilterOperator.EQ, value)),
                and: true,
            })
        );
        const oOrFilter = new Filter({ filters: aFilters, and: false });
        const oBind = oModel.bindList(sEntityName, undefined, [], aFilters.length > 1 ? [oOrFilter] : aFilters, { $$groupId: "$auto" } as any);
        const aContexts = await oBind.requestContexts();
        await Promise.all(aContexts.map((c) => c.delete("$auto")));
        await oModel.submitBatch("$auto");
        return true;
    }

    public async updateEntity<T = object>(
        sEntityName: string,
        oKey: Record<string, unknown>,
        oData: Record<string, unknown>,
        { model = undefined as string | undefined } = {}
    ): Promise<T> {
        const oModel = this.getODataModel(model);
        const sServiceUrl: string = (oModel as unknown as { sServiceUrl: string }).sServiceUrl ?? "";
        const sKey = this._buildKey(oKey);
        const sPath = `${sEntityName}${sKey}`;
        const response = await fetch(`${sServiceUrl}${sPath}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(oData),
        });
        if (!response.ok) {
            const json = await response.json() as { error?: { message?: string } };
            throw new Error(json?.error?.message ?? `HTTP error! status: ${response.status}`);
        }
        return (response.status === 204 ? oData : await response.json()) as T;
    }

    public async callAction<T = unknown>(
        sActionName: string,
        oParams: Record<string, unknown> = {},
        { model = undefined as string | undefined, method = "GET", headers = {} as Record<string, string> } = {}
    ): Promise<T> {
        const oModel = this.getODataModel(model);
        const sServiceUrl: string = (oModel as unknown as { sServiceUrl: string }).sServiceUrl ?? "";
        const response = await fetch(`${sServiceUrl}/${sActionName}`, {
            method,
            headers,
            body: method !== "GET" ? JSON.stringify(oParams) : undefined,
        });
        if (!response.ok) {
            const json = await response.json() as { error?: { message?: string } };
            throw new Error(json?.error?.message ?? `HTTP error! status: ${response.status}`);
        }
        return (await response.json()) as T;
    }

    protected _buildKey(oKey: Record<string, unknown>): string {
        const entries = Object.entries(oKey);
        if (entries.length === 1) {
            const [, value] = entries[0];
            return `(${typeof value === "string" ? `'${value}'` : value})`;
        }
        return `(${entries.map(([k, v]) => `${k}=${typeof v === "string" ? `'${v}'` : v}`).join(",")})`;
    }
}
