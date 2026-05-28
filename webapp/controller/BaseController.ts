import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import JSONModel from "sap/ui/model/json/JSONModel";
import Router from "sap/ui/core/routing/Router";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import ResourceModel from "sap/ui/model/resource/ResourceModel";

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

    public setBusy(bBusy: boolean): void {
        const oComponent = this.getOwnerComponent()!;
        const oRootControl = (oComponent as any).getRootControl?.() ?? (oComponent as any).getAggregation?.("rootControl");
        if (oRootControl) {
            (oRootControl as any).setBusy(bBusy);
        }
    }

    public getText(sKey: string): string {
        const oModel = this.getOwnerComponent()!.getModel("i18n") as ResourceModel;
        const oBundle = oModel.getResourceBundle() as ResourceBundle;
        return oBundle.getText(sKey) as string;
    }
}
