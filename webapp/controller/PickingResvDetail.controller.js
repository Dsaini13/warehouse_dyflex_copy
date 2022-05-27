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
		
		onPost: function(oEvent){
			
			var createData = jQuery.extend(true, {}, this._oCreateModel.getData());
			
			this._oViewModel.setProperty("/busy", true);
	
			// Adjust date values
			createData.DocumentDate = this._getDateObject(this.byId("idDocumentDate"));
			createData.PostingDate  = this._getDateObject(this.byId("idPostingDate"));
			
			// Adjust printing parameters
			if (createData.VersionForPrintingSlip === "0") {
				createData.VersionForPrintingSlip = "";
			} else {
				createData.ManualPrintIsTriggered = "X";
			}
			
			// Remove temp fields
			delete createData.TempStagingArea;
			for (var i = 0; i < createData.to_MaterialDocumentItem.results.length; i++) {
				delete createData.to_MaterialDocumentItem.results[i].TempOpenQty;
				delete createData.to_MaterialDocumentItem.results[i].TempStockOnHand;
				delete createData.to_MaterialDocumentItem.results[i].TempEnableSerialNo;
				delete createData.to_MaterialDocumentItem.results[i].TempPlantName;
				delete createData.to_MaterialDocumentItem.results[i].TempStorageLocationName;
				delete createData.to_MaterialDocumentItem.results[i].TempWarehouseStorageBin;
			}
			
			this.getModel("matDocSrv").create("/A_MaterialDocumentHeader", createData, {
				success: this._saveEntitySuccess.bind(this),
				error: this._saveEntityFailed.bind(this)
			});
			
		},
		
		_saveEntitySuccess: function(oData, response) {
			
			
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
				
				//Set staging area
				if (createData.TempStagingArea != "")
				{
					this.getModel("customResvStagingSrv").create("/YY1_RESVITEMSTAGINGAREA", stagingAreaData);
				}
			}	
			
			
			// Save created material document for attachment
			this._sMatDocNo = oData.MaterialDocument + oData.MaterialDocumentYear;
			this._oAttachmentsControl.upload();
			
			this._oViewModel.setProperty("/busy", false);
			
			var msg = this.getResourceBundle().getText("materialDocSucessMsg", [oData.MaterialDocument, oData.MaterialDocumentYear]);
			MessageToast.show( msg, {
				duration: 5000,
				closeOnBrowserNavigation: false
			});
			
			this._updateListModel();
			this._navToListView();
		},
		
		_saveEntityFailed: function(oData) {
			this._oViewModel.setProperty("/busy", false);
		},
		
		
		_updateListModel: function() {
			this.getModel("customResvItemSrv").refresh(true /*force update*/, false /*remove data*/);
			this.getModel("customResvItemSrv").resetChanges();
		},
		
		_navToListView: function() {
			this.getRouter().getTargets().display("pickingResvList", { reset: true } );
		}
		
	});

});