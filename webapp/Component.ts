import BaseComponent from "sap/ui/core/UIComponent";
import { createDeviceModel } from "./model/models";
import ODataBusyV4Helper from "./helper/ODataBusyV4Helper";

/**
 * @namespace posmanagement
 */
export default class Component extends BaseComponent {
  public static metadata = {
    manifest: "json",
    interfaces: ["sap.ui.core.IAsyncContentCreation"],
  };

  public init(): void {
    // call the base component's init function
    super.init();

    // mostra un BusyIndicator globale durante le richieste OData v4
    ODataBusyV4Helper.install();

    // set the device model
    this.setModel(createDeviceModel(), "device");

    // enable routing
    this.getRouter().initialize();
  }
}
