sap.ui.define([
	"./GoodsReceiptDetailBase",
	"sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("dyflex.mm.s4cloud.warehouse.controller.GoodsRcptProdDetail", {
		
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
			
			this.getRouter().getRoute("goodsRcptProdDetail").attachPatternMatched(this._onObjectMatched, this);
			
			// Set Global Models
			this._dataSources = this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").dataSources;
			//this._setPlantGlobalModel();
			
			// Set Attachment Control
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
			this._sProdOrder = oEvent.getParameter("arguments").manufacturingOrder;
			this._oViewModel.setProperty("/busy", true);
			this._oViewModel.setProperty("/orderNo", this._sProdOrder);
			
			var that = this;
			var oProdOrder = new JSONModel(this._dataSources.CustomProdOrd.uri + "YY1_Warehouse_PrdOrdItem?$filter=ManufacturingOrder eq '" + this._sProdOrder + "'&$expand=to_SerialNumbers&$format=json");
			
			oProdOrder.attachRequestCompleted({}, function() {
				that._handleJSONModelError(oEvent);
				//that._setSupplierDescModel(oPurchOrder.getProperty("/d/results/0/Supplier"));
				that._createODataModel(oProdOrder.getData());
				that._oViewModel.setProperty("/busy", false);
			});
			
			this._resetAttachmentControl();
			this._validateSaveEnablement();
		},
		
		_createODataModel: function(prodOrder) {
			
			var matDocData = {
				"GoodsMovementCode"			 : "02",
				"DocumentDate"				 : new Date(),
				"PostingDate"				 : new Date(),
				"ReferenceDocument"			 : "",
				"MaterialDocumentHeaderText" : "",
				"VersionForPrintingSlip"	 : "0",
				"ManualPrintIsTriggered"	 : "",
				"to_MaterialDocumentItem"	 : { "results":[] }
			};
			
			var aItems = prodOrder.d.results;
			for (var i = 0; i < aItems.length; i++) {
				if (!aItems[i].IsCompletelyDelivered) {
					
					var openQty = aItems[i].MfgOrderItemPlannedTotalQty - aItems[i].MfgOrderItemGoodsReceiptQty;
					
					if (openQty > 0) {
						matDocData.to_MaterialDocumentItem.results.push({
							"Material"				   : aItems[i].Material,
							"Plant"					   : aItems[i].Plant,
							"StorageLocation"		   : aItems[i].StorageLocation,
							"ManufacturingOrder"	   : aItems[i].ManufacturingOrder,
							"ManufacturingOrderItem"   : aItems[i].ManufacturingOrderItem,
							"GoodsMovementType"		   : "101",
							"GoodsMovementRefDocType"  : "F",
							"InventoryUsabilityCode"   : aItems[i].InventoryUsabilityCode ? aItems[i].InventoryUsabilityCode : " ",
							"MaterialDocumentItemText" : aItems[i].ProductName,
							"EntryUnit"				   : aItems[i].ProductionUnit,
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
			this.getRouter().navTo("goodsRcptProdList", {}, true);
		}
		
	});

});