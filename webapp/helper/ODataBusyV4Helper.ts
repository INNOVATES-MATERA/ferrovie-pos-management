import BusyIndicator from "sap/ui/core/BusyIndicator";

/**
 * @namespace posmanagement.helper
 */
export default class ODataBusyV4Helper {
  private static _bInstalled = false;
  private static _iPendingRequests = 0;

  /**
   * Mostra un BusyIndicator globale finché ci sono richieste HTTP pendenti.
   * Avvolge sia XMLHttpRequest (usato da jQuery.ajax, ovvero dal modello OData
   * v4: getEntity/getEntitySet/create/submitBatch...) sia window.fetch (usato
   * dalle fetch() dirette di updateEntity/callAction nel BaseController).
   * Idempotente: chiamate multiple non reinstallano i wrapper.
   */
  public static install(): void {
    if (ODataBusyV4Helper._bInstalled) return;
    ODataBusyV4Helper._bInstalled = true;

    ODataBusyV4Helper._wrapXHR();
    ODataBusyV4Helper._wrapFetch();
  }

  private static _onRequestStart(): void {
    if (ODataBusyV4Helper._iPendingRequests === 0) BusyIndicator.show(0);
    ODataBusyV4Helper._iPendingRequests++;
  }

  private static _onRequestEnd(): void {
    ODataBusyV4Helper._iPendingRequests = Math.max(0, ODataBusyV4Helper._iPendingRequests - 1);
    if (ODataBusyV4Helper._iPendingRequests === 0) BusyIndicator.hide();
  }

  /** Intercetta le richieste XMLHttpRequest (jQuery.ajax → modello OData v4). */
  private static _wrapXHR(): void {
    const fnOriginalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.send = function (
      this: XMLHttpRequest,
      ...args: Parameters<XMLHttpRequest["send"]>
    ): void {
      let bEnded = false;
      const fnEnd = () => {
        if (bEnded) return;
        bEnded = true;
        ODataBusyV4Helper._onRequestEnd();
      };

      ODataBusyV4Helper._onRequestStart();
      // loadend copre success, error e abort
      this.addEventListener("loadend", fnEnd);

      try {
        return fnOriginalSend.apply(this, args);
      } catch (e) {
        // send() ha lanciato in modo sincrono: loadend non scatterà
        fnEnd();
        throw e;
      }
    };
  }

  /** Intercetta le richieste window.fetch (updateEntity/callAction). */
  private static _wrapFetch(): void {
    const fnOriginalFetch = window.fetch.bind(window);

    window.fetch = async (...args: Parameters<typeof window.fetch>) => {
      ODataBusyV4Helper._onRequestStart();
      try {
        return await fnOriginalFetch(...args);
      } finally {
        ODataBusyV4Helper._onRequestEnd();
      }
    };
  }
}
