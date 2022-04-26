sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
	"sap/m/MessageBox"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, MessageToast, MessageBox) {
	"use strict";

	return BaseController.extend("dyflex.mm.s4cloud.warehouse.controller.StockTransferDetail", {

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
					delay : 0,
					orderNo: "",
					enableSave: false,
					serialNoTableTitle: ""
				});
			this.setModel(this._oViewModel, "detailView");
			
			this.getRouter().getRoute("stockTransferDetail").attachPatternMatched(this._onObjectMatched, this);
			
			// Get Service URL
			this._dataSources = this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").dataSources;
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */
		
		onCancel: function() {
			this._navToListView();
		},
		
		/* =========================================================== */
		/* POST Methods                                                */
		/* =========================================================== */
		
		onPostST: function (oEvent) {
			this._oViewModel.setProperty("/busy", true);
			var createData = jQuery.extend(true, {}, this._oCreateModel.getData());
			
			//Workout which movement type to use
			var fromPlant = createData.to_MaterialDocumentItem.results[0].Plant;
			var fromStockType = createData.TempCurrentType;
			var fromLocation = createData.to_MaterialDocumentItem.results[0].StorageLocation;
			var toPlant = createData.to_MaterialDocumentItem.results[0].IssuingOrReceivingPlant;
			var toLocation = createData.to_MaterialDocumentItem.results[0].IssuingOrReceivingStorageLoc;
			var toStockType = createData.TempTransferType;
			var codeToUse = "";
			var reserseCode = false;
			
			if (fromPlant !== toPlant)
			{
				if (fromStockType === " " && toStockType === " ")
				{
					codeToUse = "301";
				}
			}
			else
			{
				if(fromLocation !== toLocation && fromStockType === " " && toStockType === " ") //urestr to unrestr
				{
					codeToUse = "311";
				}
				else if (fromStockType === "X" && toStockType === " ") //quality to unrestr
				{
					codeToUse = "321";
				}
				else if (fromStockType === " " && toStockType === "X") //unrestr to quality
				{
					codeToUse = "322";
					reserseCode = true;
				}
				else if (fromStockType === "S" && toStockType === " ") //blocked to unrestr
				{
					codeToUse = "343";
				}
				else if (fromStockType === " " && toStockType === "5") //unrestr to blocked
				{
					codeToUse = "344";
					reserseCode = true;
				}
				else if (fromStockType === "S" && toStockType === "X") //blocked to quality
				{
					codeToUse = "349";
				}
				else if (fromStockType === "X" && toStockType === "S") //quality to blocked
				{
					codeToUse = "350";
					reserseCode = true;
				}
			}
			createData.to_MaterialDocumentItem.results[0].GoodsMovementType = codeToUse;
			
			if (!codeToUse) {
				this._oViewModel.setProperty("/busy", false);
				MessageBox.error("Transfer FROM and TO combination is not valid");
				return;
			}
			
			// Adjust From and To Plant and SLOC if reversal movement code
			if (reserseCode) {
				createData.to_MaterialDocumentItem.results[0].Plant 				       = toPlant;
				createData.to_MaterialDocumentItem.results[0].StorageLocation			   = toLocation;
				createData.to_MaterialDocumentItem.results[0].IssuingOrReceivingPlant	   = fromPlant;
				createData.to_MaterialDocumentItem.results[0].IssuingOrReceivingStorageLoc = fromLocation;
			}
			
			// Adjust date values
			createData.DocumentDate = this._getDateObject(this.byId("idDocumentDate"));
			createData.PostingDate  = this._getDateObject(this.byId("idPostingDate"));
			
			//Remove the temp fields
			delete createData.TempCurrentType;
			delete createData.TempTransferType;
			
			// Adjust printing parameters
			if (createData.VersionForPrintingSlip === "0") {
				createData.VersionForPrintingSlip = "";
			} else {
				createData.ManualPrintIsTriggered = "X";
			}
			
			this.getModel("matDocSrv").create("/A_MaterialDocumentHeader", createData, {
				success: this._saveEntitySuccess.bind(this),
				error: this._saveEntityFailed.bind(this)
			});
		},
		
		_saveEntitySuccess: function(oData, response) {
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
		
		/* =========================================================== */
		/* Serial No Dialog                                            */
		/* =========================================================== */
		
		onSerialNoShow: function(oEvent) {
			this._oItemPath = "/to_MaterialDocumentItem/results/0";
			var itemData = jQuery.extend(true, {}, this._oCreateModel.getProperty(this._oItemPath));
			
			this._oItemModel = new JSONModel(itemData);
			this.setModel(this._oItemModel, "itemModel");
			
			if (!this._serialNoDialog) {
				this._serialNoDialog = sap.ui.xmlfragment("dyflex.mm.s4cloud.warehouse.view.SerialNoDialog",this);
				this.getView().addDependent(this._serialNoDialog);
				jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._serialNoDialog);
			}
			this._serialNoDialog.open();
		},
		
		/* =========================================================== */
		/* Value Help - Storage Location                               */
		/* =========================================================== */
		
		onHandleValueHelpStoreLoc: function(oEvent) {
			var sInputValue = oEvent.getSource().getValue();
			if (sInputValue.length > 20) {
				sInputValue = sInputValue.substring(0, 20);
			}
			this.savedStoreLocInputField = oEvent.getSource();
			
			// create value help dialog
			if (!this._valueHelpDialogStoreLoc) {
				this._valueHelpDialogStoreLoc = sap.ui.xmlfragment( "dyflex.mm.s4cloud.warehouse.view.ValueHelpStoreLoc", this );
				this.getView().addDependent(this._valueHelpDialogStoreLoc);
				jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._valueHelpDialogStoreLoc);
			}
			
			// create a filter for the binding
			var aFilters = this._createStoreLocFilter(sInputValue);
			this._valueHelpDialogStoreLoc.getBinding("items").filter(aFilters);
			
			// open value help dialog filtered by the input value
			this._valueHelpDialogStoreLoc.open(sInputValue);
		},
		
		onHandleSuggestStoreLoc: function(oEvent) {
			this.savedStoreLocInputField = oEvent.getSource();
			var sInputValue = oEvent.getSource().getValue();
			var aFilters = this._createStoreLocFilter(sInputValue);
			oEvent.getSource().getBinding("suggestionRows").filter(aFilters);
		},
		
		onHandleValueHelpStoreLocSearch: function (oEvent) {
			var sValue = oEvent.getParameter("value");
			if (sValue.length > 20) {
				sValue = sValue.substring(0, 20);
			}
			var aFilters = this._createStoreLocFilter(sValue);
			oEvent.getSource().getBinding("items").filter(aFilters);
		},
		
		onHandleValueHelpStoreLocClose: function (oEvent) {
			var oInputField = this.savedStoreLocInputField;
			
			var oSelectedRow = oEvent.getParameter("selectedRow");
			if (oSelectedRow) { //suggestions
				oInputField.setValue(oSelectedRow.getCells()[0].getText());
				oInputField.setTooltip(oSelectedRow.getCells()[1].getText());
			} else { // value help dialog
				var oSelectedItem = oEvent.getParameter("selectedItem");
				if (oSelectedItem) {
					oInputField.setValue(oSelectedItem.getTitle());
					oInputField.setTooltip(oSelectedItem.getDescription());
					oEvent.getSource().getBinding("items").filter([]);
				}
			}
		},
		
		onLiveChangeStoreLoc: function(oEvent) {
			oEvent.getSource().setTooltip("");
		},
		
		_createStoreLocFilter: function (sValue) {
			var orFilter = [];
			var andFilter = [];
			
			andFilter.push(new Filter("Product", FilterOperator.EQ, this.savedStoreLocInputField.data("Material")));
			andFilter.push(new Filter("Plant", FilterOperator.EQ, this.savedStoreLocInputField.data("Plant")));
			orFilter.push(new Filter(andFilter, true));

			return new Filter(orFilter, false);
		},
		
		/* =========================================================== */
		/* Value Help - Plant               						   */
		/* =========================================================== */
		
		onHandleValueHelpPlant: function(oEvent) {
			var sInputValue = oEvent.getSource().getValue();
			if (sInputValue.length > 20) {
				sInputValue = sInputValue.substring(0, 20);
			}
			this.savedPlantInputField = oEvent.getSource();
			
			// create value help dialog
			if (!this._valueHelpDialogPlant) {
				this._valueHelpDialogPlant = sap.ui.xmlfragment( "dyflex.mm.s4cloud.warehouse.view.ValueHelpPlant", this );
				this.getView().addDependent(this._valueHelpDialogPlant);
				jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._valueHelpDialogPlant);
			}
			
			// create a filter for the binding
			var aFilters = this._createPlantFilter(sInputValue);
			this._valueHelpDialogPlant.getBinding("items").filter(aFilters);
			
			// open value help dialog filtered by the input value
			this._valueHelpDialogPlant.open(sInputValue);
		},
		
		onHandleSuggestPlant: function(oEvent) {
			this.savedPlantInputField = oEvent.getSource();
			var sInputValue = oEvent.getSource().getValue();
			var aFilters = this._createPlantFilter(sInputValue);
			oEvent.getSource().getBinding("suggestionRows").filter(aFilters);
		},
		
		onHandleValueHelpPlantSearch: function (oEvent) {
			var sValue = oEvent.getParameter("value");
			if (sValue.length > 20) {
				sValue = sValue.substring(0, 20);
			}
			var aFilters = this._createPlantFilter(sValue);
			oEvent.getSource().getBinding("items").filter(aFilters);
		},
		
		onHandleValueHelpPlantClose: function (oEvent) {
			var oInputField = this.savedPlantInputField;
			
			var oSelectedRow = oEvent.getParameter("selectedRow");
			if (oSelectedRow) { //suggestions
				oInputField.setValue(oSelectedRow.getCells()[0].getText());
				oInputField.setTooltip(oSelectedRow.getCells()[1].getText());
			} else { // value help dialog
				var oSelectedItem = oEvent.getParameter("selectedItem");
				if (oSelectedItem) {
					oInputField.setValue(oSelectedItem.getTitle());
					oInputField.setTooltip(oSelectedItem.getDescription());
					oEvent.getSource().getBinding("items").filter([]);
				}
			}
		},
		
		onLiveChangePlant: function(oEvent) {
			oEvent.getSource().setTooltip("");
		},
		
		_createPlantFilter: function (sValue) {
			var orFilter = [];
			var andFilter = [];
			
			andFilter.push(new Filter("Product", FilterOperator.EQ, this.savedPlantInputField.data("Material")));
			orFilter.push(new Filter(andFilter, true));
	
			return new Filter(orFilter, false);
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
			this._oViewModel.setProperty("/busy", true);
			this._getObjectKeys(oEvent);
			this._getStockDetails();
			this._getMaterialDetails();
			this._getPlantDetails();
		},
		
		/**
		 * Split object ID to individual keys
		 * ObjectID is like '.1~000000000000000014.2~3010.3~301A.4~.15~ST.16~Fan Cover.17~Plant 1 AU.18~Std&as storage 1' OR
		 *  '.1~RM1420.2~3010.3~301B.4~0000000001.15~L.16~RM1420, PD, Solvent.17~Plant 1 AU.18~Std&as storage 2-SMATERIAL LIKE '%rm1420%''
		 *  when there is a search
		 */
		_getObjectKeys: function(oEvent) {
			this._sObjectId = oEvent.getParameter("arguments").objectId.split("-")[0];
			this._sMaterial = this._sObjectId.split(".")[1].split("~")[1];
			this._sPlant    = this._sObjectId.split(".")[2].split("~")[1];
			this._sStoreLoc = this._sObjectId.split(".")[3].split("~")[1];
			this._sBatch    = this._sObjectId.split(".")[4].split("~")[1];
		},
		
		_getStockDetails: function() {
			var that = this;
			var oStockModelST = new JSONModel(this._dataSources.CustomStock.uri + "YY1_Warehouse_Stock('" + this._sObjectId + "')?$format=json");
			that.setModel(oStockModelST, "stockModelST");
			
			oStockModelST.attachRequestCompleted({}, function(oEvent) {
				that._handleJSONModelError(oEvent);
				that._createODatStockTransferModel(oStockModelST.getData());
				that._oViewModel.setProperty("/busy", false);
			});
		},
		
		_getMaterialDetails: function() {
			var oMaterialModelST = new JSONModel(this._dataSources.Product.uri + "A_Product('" + this._sMaterial + "')?$format=json");
			this.setModel(oMaterialModelST, "materialModelST");
		},
		
		_getPlantDetails: function() {
			var oPlantModelST = new JSONModel(this._dataSources.Product.uri + "A_ProductPlant(Product='" + this._sMaterial + "',Plant='" + this._sPlant + "')?$format=json");
			this.setModel(oPlantModelST, "plantModelST");
		},
		
		_createODatStockTransferModel: function(oMaterial) {
			
			var matDocData = {
				"GoodsMovementCode"			 : "04",
				"DocumentDate"				 : new Date(),
				"PostingDate"				 : new Date(),
				"ReferenceDocument"			 : "",
				"MaterialDocumentHeaderText" : "",
				"VersionForPrintingSlip"	 : "0",
				"ManualPrintIsTriggered"	 : "",
				"TempCurrentType"			 : " ",
				"TempTransferType"			 : " ",
				"to_MaterialDocumentItem"	 : { "results":[] }
			};
			
			var oItem = {
				"Material": oMaterial.d.Material,
				"Plant": oMaterial.d.Plant,
				"StorageLocation": oMaterial.d.StorageLocation,
				"Batch": oMaterial.d.Batch,
				"GoodsMovementType": "311",
				"EntryUnit": oMaterial.d.MaterialBaseUnit,
				"QuantityInEntryUnit": "",
				"IssuingOrReceivingPlant": "",
				"IssuingOrReceivingStorageLoc" : "",
				"IssgOrRcvgBatch": ""
			};
			
			matDocData.to_MaterialDocumentItem.results.push(oItem);
			
			this._oCreateModel = new JSONModel(matDocData);
			this.setModel(this._oCreateModel, "createModel");
		},
		
		_updateListModel: function() {
			this.getModel("customStockSrv").refresh(true /*force update*/, false /*remove data*/);
			this.getModel("customStockSrv").resetChanges();
		},
		
		_navToListView: function() {
			this.getRouter().navTo("stockTransferList", {}, true);
		}
		
	});

});