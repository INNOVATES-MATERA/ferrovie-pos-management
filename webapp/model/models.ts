import JSONModel from "sap/ui/model/json/JSONModel";
import Device from "sap/ui/Device";

export function createDeviceModel () {
    const model = new JSONModel(Device);
    model.setDefaultBindingMode("OneWay");
    return model;
}

export function createPosStatusModel(): JSONModel {
    return new JSONModel([
        { key: "draft",      text: "In bozza" },
        { key: "toApprove",  text: "Da approvare" },
        { key: "approved",   text: "Approvato" },
        { key: "closed",     text: "Chiuso" },
    ]);
}