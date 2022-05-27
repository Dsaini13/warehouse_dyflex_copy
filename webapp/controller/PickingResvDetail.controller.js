sap.ui.define([
	"./GoodsMovementDetailBase",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/MessageBox"
], function (BaseController, JSONModel, MessageToast, MessageBox) {
	"use strict";

	return BaseController.extend("dyflex.mm.s4cloud.warehouse.controller.PickingResvDetail", {
		
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
			
			this.getRouter().getTargets().getTarget("pickingResvDetail").attachDisplay(null, this._onDisplay, this);
			
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
				"TempStagingArea"			 : "",
				"to_MaterialDocumentItem"	 : { "results":[] }
			};
			
			for (var i = 0; i < aSelectedResv.length; i++) {
				
				var openQty = aSelectedResv[i].ResvnItmRequiredQtyInBaseUnit - aSelectedResv[i].ResvnItmWithdrawnQtyInBaseUnit;
				var stockOnHand = aSelectedResv[i].to_Stock ? aSelectedResv[i].to_Stock.StockOnHand : 0;
				
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
						
						"CostCenter"			   : aSelectedResv[i].CostCenter,
						"WBSElement"			   : aSelectedResv[i].WBSElement,
						
						"TempStockOnHand"		   : stockOnHand.toString(),
						"TempEnableSerialNo"	   : aSelectedResv[i].SerialNumberProfile ? true : false,
						"TempPlantName"			   : aSelectedResv[i].PlantName,
						"TempStorageLocationName"  : aSelectedResv[i].StorageLocationName,
						"TempWarehouseStorageBin"  : aSelectedResv[i].WarehouseStorageBin
					
					};
					matDocData.to_MaterialDocumentItem.results.push(oItem);
				}
			}
			
			this._oCreateModel = new JSONModel(matDocData);
			this.setModel(this._oCreateModel, "createModel");
		},
		
		onStagingAreaScanSuccess: function(oEvent) {
			var oStageField = this.byId("idStageArea");
			
			if (oEvent.getParameter("cancelled")) {
				MessageToast.show("Scan cancelled", { duration:1000 });
			} else {
				if (oEvent.getParameter("text")) {
					oStageField.setValue(oEvent.getParameter("text"));
				} else {
					oStageField.setValue("");
				}
			}
		},
		
		updateStagingArea: function(oEvent){
			
			var createData = jQuery.extend(true, {}, this._oCreateModel.getData());
			
			for (var i = 0; i < createData.to_MaterialDocumentItem.results.length; i++) {
							
				//create new odata model
				var stagingAreaData = {
					"CombinedKey"		: createData.to_MaterialDocumentItem.results[i].Reservation.replace(/^0+/, "") + "-" + createData.to_MaterialDocumentItem.results[i].ReservationItem.replace(/^0+/, ""),
					"SAP_Description"	: "upload",
					"ReservationID"		: createData.to_MaterialDocumentItem.results[i].Reservation,
					"ReservationLineID"	: createData.to_MaterialDocumentItem.results[i].ReservationItem,
					"StagingStatus"		: "Staged",
					"StagingArea"		: createData.TempStagingArea
				};
				
				if (createData.TempStagingArea != "")
				{
				//	this.getModel("customResvStagingSrv").create("/YY1_RESVITEMSTAGINGAREASap_upsert?", stagingAreaData, {
					this.getModel("customResvStagingSrv").create("/YY1_RESVITEMSTAGINGAREASap_upsert?CombinedKey='32-1'&SAP_Description='upload'&ReservationID='0000000032'&ReservationLineID='0001'&StagingStatus='Christine'&StagingArea='Stage1'", stagingAreaData, {
						success: this._saveEntitySuccess.bind(this),
						error: this._saveEntityFailed.bind(this)
					});
				}
				//Now call the standard post
				//this.onPost(oEvent);
		
			}

		},
		
		_saveEntitySuccess: function(oData, response) {
			this._oViewModel.setProperty("/busy", false);
			
			//var msg = this.getResourceBundle().getText("materialDocSucessMsg", [oData.MaterialDocument, oData.MaterialDocumentYear]);
			MessageToast.show( "Success", {
				duration: 5000,
				closeOnBrowserNavigation: false
			});
			
		},
		
		_saveEntityFailed: function(oData) {
			this._oViewModel.setProperty("/busy", false);
						MessageToast.show( "Fail", {
				duration: 5000,
				closeOnBrowserNavigation: false
			});
		},
		
		_updateListModel: function() {
			this.getModel("customResvItemSrv").refresh(true /*force update*/, false /*remove data*/);
			this.getModel("customResvItemSrv").resetChanges();
		},
		
		_navToListView: function() {
			this.getRouter().getTargets().display("pickingResvList", { reset: false } );
		}
		
	});

});