sap.ui.define([
	"./GoodsMovementDetailBase",
	"sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("dyflex.mm.s4cloud.warehouse.controller.GoodsIssueProdDetail", {
		
		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */
		
		/**
		 * Called when the controller is instantiated.
		 * @public
		 */
		onInit : function () {
			this._onInit("goodsIssueProdDetail");
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
			var oReservation = new JSONModel(this._dataSources.CustomResvItem.uri + "YY1_Warehouse_ResvItem?$filter=ManufacturingOrder eq '" + this._sProdOrder + "'&$format=json");
			
			oReservation.attachRequestCompleted({}, function() {
				that._handleJSONModelError(oEvent);
				that._setMainMaterialModel(oReservation.getData());
				that._createODataModel(oReservation.getData());
				that._oViewModel.setProperty("/busy", false);
			});
			
			this._resetAttachmentControl();
			this._validateSaveEnablement();
		},
		
		_createODataModel: function(oReservation) {
			
			var matDocData = {
				"GoodsMovementCode"			 : "03",
				"DocumentDate"				 : new Date(),
				"PostingDate"				 : new Date(),
				"ReferenceDocument"			 : "",
				"MaterialDocumentHeaderText" : "",
				"VersionForPrintingSlip"	 : "0",
				"ManualPrintIsTriggered"	 : "",
				"to_MaterialDocumentItem"	 : { "results":[] }
			};
			
			var aItems = oReservation.d.results;
			for (var i = 0; i < aItems.length; i++) {
				if (!aItems[i].IsCompletelyDelivered) {
					
					var openQty = aItems[i].ResvnItmRequiredQtyInBaseUnit - aItems[i].ResvnItmWithdrawnQtyInBaseUnit;
					
					if (openQty > 0) {
						var oItem = {
							"Material"				   : aItems[i].Product,
							"Plant"					   : aItems[i].Plant,
							"StorageLocation"		   : aItems[i].StorageLocation,
							"ManufacturingOrder"	   : aItems[i].ManufacturingOrder,
					        "Reservation"			   : aItems[i].Reservation,
					        "ReservationItem"		   : aItems[i].ReservationItem,
							"GoodsMovementType"		   : aItems[i].GoodsMovementType,
							"InventoryUsabilityCode"   : " ",
							"MaterialDocumentItemText" : aItems[i].ProductName,
							"EntryUnit"				   : aItems[i].BaseUnit,
							"QuantityInEntryUnit"	   : openQty.toString(),
							
							"TempOpenQty"			   : openQty.toString(),
							"TempEnableSerialNo"	   : aItems[i].SerialNumberProfile ? true : false,
							"TempPlantName"			   : aItems[i].PlantName,
							"TempStorageLocationName"  : aItems[i].StorageLocationName
						};
						matDocData.to_MaterialDocumentItem.results.push(oItem);
					}
				}
			}
			
			this._oCreateModel = new JSONModel(matDocData);
			this.setModel(this._oCreateModel, "createModel");
		},
		
		_setMainMaterialModel: function(prodOrder) {
			// The main material is item 0001, see I_ManufacturingOrder
			var that = this;
			var sFilter = "ManufacturingOrder eq '" + this._sProdOrder + "' and ManufacturingOrderItem eq '0001'";
			var oProdOrder = new JSONModel(this._dataSources.CustomProdOrd.uri + "YY1_Warehouse_PrdOrdItem?$filter=" + sFilter + "&$format=json");
			oProdOrder.attachRequestCompleted({}, function() {
				that._oViewModel.setProperty("/mainProduct", oProdOrder.getProperty("/d/results/0/Material"));
				that._oViewModel.setProperty("/mainProductDesc", oProdOrder.getProperty("/d/results/0/ProductName"));
			});
		},
		
		_navToListView: function() {
			this.getRouter().navTo("goodsIssueProdList", {}, true);
		}
		
	});

});