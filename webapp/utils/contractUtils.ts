const contractUtils = {
  /**
   * Restituisce la parte del numero contratto successiva al primo underscore (solo per visualizzazione).
   * Non va usato per chiavi, filtri o payload, che devono usare il valore completo.
   * @param sContractCode numero contratto completo (es. AQ001_CA001)
   * @returns parte dopo il primo underscore, o il valore originale se privo di underscore
   */
  getContractNumberSuffix(sContractCode?: string | null): string {
    if (!sContractCode) return "";
    const iIndex = sContractCode.indexOf("_");
    return iIndex === -1 ? sContractCode : sContractCode.slice(iIndex + 1);
  },
};

export default contractUtils;
