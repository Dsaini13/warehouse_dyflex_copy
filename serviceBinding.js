function initModel() {
	var sUrl = "/DYFLEX_S4H_CLOUD_API_OAUTH/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/";
	var oModel = new sap.ui.model.odata.ODataModel(sUrl, true);
	sap.ui.getCore().setModel(oModel);
}