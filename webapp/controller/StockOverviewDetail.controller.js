sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter"
], function (BaseController, JSONModel, formatter) {
	"use strict";

	return BaseController.extend("dyflex.mm.s4cloud.warehouse.controller.StockOverviewDetail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit : function () {
			
			this._oViewModel = new JSONModel({
					busy : true,
					delay : 0
				});
			this.setModel(this._oViewModel, "detailView");
			
			this.getRouter().getRoute("stockOverviewDetail").attachPatternMatched(this._onObjectMatched, this);
			
			// Get Service URL
			var manifest = this.getOwnerComponent().getMetadata().getManifestEntry("sap.app");
			this._serviceUrl = manifest.dataSources.YY1_WAREHOUSE_STOCK_CDS.uri;
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */
		
		
		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched : function (oEvent) {
			this._sObjectId = oEvent.getParameter("arguments").objectId;
			
			var that = this;
			var oStockModel = new JSONModel(this._serviceUrl + "YY1_Warehouse_Stock('" + this._sObjectId + "')?$format=json");
			
			this._oViewModel.setProperty("/busy", true);
			
			oStockModel.attachRequestCompleted({}, function() {
				that._handleJSONModelError(oEvent);
				that.setModel(oStockModel, "dataModel");
				that._oViewModel.setProperty("/busy", false);
			});
		}
		
	});

});