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
			this._dataSources = this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").dataSources;
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
			this._oViewModel.setProperty("/busy", true);
			
			this._splitObjectId();
			this._getStockDetails();
			this._getMaterialDetails();
			this._getPlantDetails();
		},
		
		/**
		 * Split object ID to individual keys
		 * ObjectID is like '.1~000000000000000014.2~3010.3~301A.4~.15~ST.16~Fan Cover.17~Plant 1 AU.18~Std&as storage 1'
		 */
		_splitObjectId: function() {
			this._sMaterial = this._sObjectId.split(".")[1].split("~")[1];
			this._sPlant    = this._sObjectId.split(".")[2].split("~")[1];
			this._sStoreLoc = this._sObjectId.split(".")[3].split("~")[1];
			this._sBatch    = this._sObjectId.split(".")[4].split("~")[1];
		},
		
		_getStockDetails: function() {
			var that = this;
			var oStockModel = new JSONModel(this._dataSources.CustomStock.uri + "YY1_Warehouse_Stock('" + this._sObjectId + "')?$format=json");
			that.setModel(oStockModel, "stockModel");
			
			oStockModel.attachRequestCompleted({}, function(oEvent) {
				that._handleJSONModelError(oEvent);
				that._oViewModel.setProperty("/busy", false);
			});
		},
		
		_getMaterialDetails: function() {
			var oMaterialModel = new JSONModel(this._dataSources.Product.uri + "A_Product('" + this._sMaterial + "')?$format=json");
			this.setModel(oMaterialModel, "materialModel");
		},
		
		_getPlantDetails: function() {
			var oPlantModel = new JSONModel(this._dataSources.Product.uri + "A_ProductPlant(Product='" + this._sMaterial + "',Plant='" + this._sPlant + "')?$format=json");
			this.setModel(oPlantModel, "plantModel");
		}
		
	});

});