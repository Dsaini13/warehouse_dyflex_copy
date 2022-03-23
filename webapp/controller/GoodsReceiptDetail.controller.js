sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter"
], function (BaseController, JSONModel, formatter) {
	"use strict";

	return BaseController.extend("dyflex.mm.s4cloud.warehouse.controller.GoodsReceiptDetail", {

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
			
			this.getRouter().getRoute("goodsReceiptDetail").attachPatternMatched(this._onObjectMatched, this);
			
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
			this._sPurchaseOrder = oEvent.getParameter("arguments").purchaseOrder;
			this._sPurchaseOrderItem = oEvent.getParameter("arguments").purchaseOrderItem;
			
			this._getOrderDetails();
		},
		
		_getOrderDetails: function() {
			this._oViewModel.setProperty("/busy", true);
			
			var that = this;
			var orderKey = "PurchaseOrder='" + this._sPurchaseOrder + "',PurchaseOrderItem='" + this._sPurchaseOrderItem + "'";
			var oOrderModel = new JSONModel(this._dataSources.PurchOrder.uri + "A_PurchaseOrderItem(" + orderKey + ")?$expand=to_PurchaseOrder&$format=json");
			
			oOrderModel.attachRequestCompleted({}, function(oEvent) {
				that._handleJSONModelError(oEvent);
				that._setObjectKeys(oOrderModel);
				
				that._setPlantDescModel();
				that._setStockModel();
				
				that.setModel(oOrderModel, "orderModel");
				that._oViewModel.setProperty("/busy", false);
			});
		},
		
		_setObjectKeys: function(oOrderModel) {
			this._sMaterial = oOrderModel.getProperty("/d/Material");
			this._sPlant    = oOrderModel.getProperty("/d/Plant");
			this._sStoreLoc = oOrderModel.getProperty("/d/StorageLocation");
		},
		
		_setStockModel: function() {
			var filter = "Material eq '" + this._sMaterial + "' and Plant eq '" + this._sPlant + "'";
			var oStockModel = new JSONModel(this._dataSources.CustomStock.uri + "YY1_Warehouse_Stock?$filter=" + filter + "&$format=json");
			this.setModel(oStockModel, "stockModel");
		}
		
	});

});