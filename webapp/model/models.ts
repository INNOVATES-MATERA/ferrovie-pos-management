import JSONModel from "sap/ui/model/json/JSONModel";
import Device from "sap/ui/Device";

export function createDeviceModel () {
    const model = new JSONModel(Device);
    model.setDefaultBindingMode("OneWay");
    return model;
}

export function createPosStatusModel(): JSONModel {
    return new JSONModel([
        { key: "Valido",    text: "Valido" },
        { key: "Superato",  text: "Superato" },
        { key: "Scaduto",   text: "Scaduto" },
    ]);
}

export function createCompanyRoleModel(): JSONModel {
    return new JSONModel([
        { key: "Appaltatrice",    text: "Appaltatrice" },
        { key: "Subappaltatrice", text: "Subappaltatrice" },
    ]);
}