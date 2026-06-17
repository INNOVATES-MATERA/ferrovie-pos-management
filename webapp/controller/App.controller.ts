import BaseController from "./BaseController";
import SideNavigation from "sap/tnt/SideNavigation";
import ToolPage from "sap/tnt/ToolPage";

const KEY_TO_ROUTE: Record<string, string> = {
  home: "RouteHome",
  posList: "RoutePosList",
  newPos: "RoutePosNew",
};

const ROUTE_TO_KEY: Record<string, string> = {
  RouteHome: "home",
  RoutePosList: "posList",
  RoutePosNew: "newPos",
};

/**
 * @namespace posmanagement.controller
 */
export default class App extends BaseController {
  public onInit(): void {
    this.getRouter().attachRouteMatched(this._onRouteMatched, this);
  }

  public onMenuToggle(): void {
    const oToolPage = this.byId("toolPage") as ToolPage;
    oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
  }

  public onNav(oEvent: any): void {
    const sKey = oEvent.getParameter("item").getKey() as string;
    const sRoute = KEY_TO_ROUTE[sKey];
    if (sRoute) {
      this.getRouter().navTo(sRoute);
    }
  }

  private _onRouteMatched(oEvent: any): void {
    const sRouteName = oEvent.getParameter("name") as string;
    const sKey = ROUTE_TO_KEY[sRouteName];
    if (sKey) {
      const oSideNav = this.byId("sideNavigation") as SideNavigation;
      oSideNav.setSelectedKey(sKey);
    }
  }
}
