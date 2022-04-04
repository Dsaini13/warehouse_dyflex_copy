sap.ui.define([
	"./GoodsReceiptDetailBase",
	"sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("dyflex.mm.s4cloud.warehouse.controller.GoodsReceiptDetail", {
		
		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit : function () {
			
			this._oViewModel = new JSONModel({
					busy: true,
					delay: 0,
					orderNo: "",
					enableSave: false
				});
			this.setModel(this._oViewModel, "viewModel");
			
			this.getRouter().getRoute("goodsReceiptDetail").attachPatternMatched(this._onObjectMatched, this);
			
			this._dataSources = this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").dataSources;
			
			this._initAttachmentControl();
		},
		
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
			this._oViewModel.setProperty("/busy", true);
			this._oViewModel.setProperty("/orderNo", this._sPurchaseOrder);
			
			var that = this;
			var oPurchOrder = new JSONModel(this._dataSources.CustomPOItem.uri + "YY1_Warehouse_POItem?$filter=PurchaseOrder eq '" + this._sPurchaseOrder + "'&$expand=to_POHist&$format=json");
			
			oPurchOrder.attachRequestCompleted({}, function() {
				that._handleJSONModelError(oEvent);
				that._setSupplierDescModel(oPurchOrder.getProperty("/d/results/0/Supplier"));
				that._createODataModel(oPurchOrder.getData());
				that._oViewModel.setProperty("/busy", false);
			});
			
			this._resetAttachmentControl();
			this._validateSaveEnablement();
		},
		
		_createODataModel: function(purchOrder) {
			
			var matDocData = {
				"GoodsMovementCode"			 : "01",
				"DocumentDate"				 : new Date(),
				"PostingDate"				 : new Date(),
				"ReferenceDocument"			 : "",
				"MaterialDocumentHeaderText" : "",
				"VersionForPrintingSlip"	 : "0",
				"ManualPrintIsTriggered"	 : "",
				"to_MaterialDocumentItem"	 : { "results":[] }
			};
			
			var aItems = purchOrder.d.results;
			for (var i = 0; i < aItems.length; i++) {
				if (!aItems[i].IsCompletelyDelivered && aItems[i].OrderQuantity > 0) {
					
					var openQty = aItems[i].OrderQuantity;
					if (aItems[i].to_POHist) {
						openQty = aItems[i].OrderQuantity - aItems[i].to_POHist.GoodsRcptQty;
					}
					if (openQty > 0) {
						matDocData.to_MaterialDocumentItem.results.push({
							"Material"				   : aItems[i].Material,
							"Plant"					   : aItems[i].Plant,
							"StorageLocation"		   : aItems[i].StorageLocation,
							"PurchaseOrder"			   : aItems[i].PurchaseOrder,
							"PurchaseOrderItem"		   : aItems[i].PurchaseOrderItem,
							"GoodsMovementType"		   : "101",
							"GoodsMovementRefDocType"  : "B",
							"InventoryUsabilityCode"   : aItems[i].StockType ? aItems[i].StockType : " ",
							"MaterialDocumentItemText" : aItems[i].PurchaseOrderItemText,
							"EntryUnit"				   : aItems[i].PurchaseOrderQuantityUnit,
							"QuantityInEntryUnit"	   : openQty.toString(),
							
							"TempOpenQty"			   : openQty.toString(),
							"TempEnableSerialNo"	   : aItems[i].SerialNumberProfile ? true : false,
							"TempPlantName"			   : aItems[i].PlantName,
							"TempStorageLocationName"  : aItems[i].StorageLocationName
						});		
					}
				}
			}
			
			this._oCreateModel = new JSONModel(matDocData);
			this.setModel(this._oCreateModel, "createModel");
		},
		
		_navToListView: function() {
			this.getRouter().navTo("goodsReceiptList", {}, true);
		}
		
	});

});