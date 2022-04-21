sap.ui.define([
	"./BaseController"
], function (BaseController) {
	"use strict";

	return BaseController.extend("dyflex.mm.s4cloud.warehouse.controller.MainList", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf dyflex.mm.s4cloud.warehouse.view.MainList
		 */
		onInit: function() {
			
		},
		
		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */
		onStockOverviewPress: function(oEvent) {
			this.getRouter().navTo("stockOverviewList");
		},
		
		onGoodsReceiptPress: function(oEvent) {
			this.getRouter().navTo("goodsReceiptList");
		},
		
		onGoodsRcptProdPress: function(oEvent) {
			this.getRouter().navTo("goodsRcptProdList");
		},
		
		onGoodsIssueProdPress: function(oEvent) {
			this.getRouter().navTo("goodsIssueProdList");
		},
		
		onStocktakePress: function(oEvent) {
			this.getRouter().navTo("stocktakeList");
		}

	});

});