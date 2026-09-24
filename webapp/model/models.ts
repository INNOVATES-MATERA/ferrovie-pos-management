import JSONModel from "sap/ui/model/json/JSONModel";
import Device from "sap/ui/Device";

export function createDeviceModel () {
    const model = new JSONModel(Device);
    model.setDefaultBindingMode("OneWay");
    return model;
}

export function createPosStatusModel(): JSONModel {
    return new JSONModel([
        { key: "In Verifica",                 text: "In Verifica" },
        { key: "In Attesa di Integrazioni",   text: "In Attesa di Integrazioni" },
        { key: "Valido",                      text: "Valido" },
        { key: "Non Valido",                  text: "Non Valido" },
    ]);
}
