sap.ui.define([
	"./GoodsMovementDetailBase",
	"sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("dyflex.mm.s4cloud.warehouse.controller.GoodsIssueResvDetail", {
		
		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */
		
		/**
		 * Called when the controller is instantiated.
		 * @public
		 */
		onInit : function () {
			this._oViewModel = new JSONModel({
					busy: true,
					delay: 0,
					enableSave: false,
					serialNoTableTitle: ""
				});
			this.setModel(this._oViewModel, "viewModel");
			
			this.getRouter().getTargets().getTarget("goodsIssueResvDetail").attachDisplay(null, this._onDisplay, this);
			
			this._dataSources = this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").dataSources;
			
			this._initAttachmentControl();
		},
		
		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */
		
		_onDisplay: function (oEvent) {
			var aSelectedResv = oEvent.getParameter("data").selectedResv;
			this._createODataModel(aSelectedResv);
			this._resetAttachmentControl();
			this._validateSaveEnablement();
			this._oViewModel.setProperty("/busy", false);
		},
		
		_createODataModel: function(aSelectedResv) {
			
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
			
			for (var i = 0; i < aSelectedResv.length; i++) {
				
				var openQty = aSelectedResv[i].ResvnItmRequiredQtyInBaseUnit - aSelectedResv[i].ResvnItmWithdrawnQtyInBaseUnit;
				
				if (openQty > 0) {
					var oItem = {
						"Material"				   : aSelectedResv[i].Product,
						"Plant"					   : aSelectedResv[i].Plant,
						"StorageLocation"		   : aSelectedResv[i].StorageLocation,
						"ManufacturingOrder"	   : aSelectedResv[i].ManufacturingOrder,
				        "Reservation"			   : aSelectedResv[i].Reservation,
				        "ReservationItem"		   : aSelectedResv[i].ReservationItem,
						"GoodsMovementType"		   : aSelectedResv[i].GoodsMovementType,
						"InventoryUsabilityCode"   : " ",
						"MaterialDocumentItemText" : aSelectedResv[i].ProductName,
						"EntryUnit"				   : aSelectedResv[i].BaseUnit,
						"QuantityInEntryUnit"	   : openQty.toString(),
						
						"TempOpenQty"			   : openQty.toString(),
						"TempEnableSerialNo"	   : aSelectedResv[i].SerialNumberProfile ? true : false,
						"TempPlantName"			   : aSelectedResv[i].PlantName,
						"TempStorageLocationName"  : aSelectedResv[i].StorageLocationName
					};
					matDocData.to_MaterialDocumentItem.results.push(oItem);
				}
			}
			
			this._oCreateModel = new JSONModel(matDocData);
			this.setModel(this._oCreateModel, "createModel");
		},
		
		_updateListModel: function() {
			this.getModel("customResvItemSrv").refresh(true /*force update*/, false /*remove data*/);
			this.getModel("customResvItemSrv").resetChanges();
		},
		
		_navToListView: function() {
			this.getRouter().getTargets().display("goodsIssueResvList", { reset: false } );
		}
		
	});

});