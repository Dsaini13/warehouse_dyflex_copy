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

	return BaseController.extend("dyflex.mm.s4cloud.warehouse.controller.StagedResvList", {

		formatter: formatter,
		
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf dyflex.mm.s4cloud.warehouse.view.GoodsIssueResvList
		 */
		onInit: function () {
			
			var that = this;
			this._oTable = this.byId("idStagedReservationListTable");
			this._aSelectedResv = [];
			
			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			var iOriginalBusyDelay = this._oTable.getBusyIndicatorDelay();
			
			// Model used to manipulate control states
			this._oViewModel = new JSONModel({
				listTableTitle : this.getResourceBundle().getText("stagedResvListTableTitle"),
				saveAsTileTitle: this.getResourceBundle().getText("saveAsTileTitle", this.getResourceBundle().getText("stagedResvListTitle")),
				shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailListSubject"),
				shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailListMessage", [location.href]),
				tableNoDataText : this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay : 0,
				buttonCountResv : 0
			});
			this.setModel(this._oViewModel, "listView");
			
			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			this._oTable.attachEventOnce("updateFinished", function(){
				// Restore original busy indicator delay for worklist's table
				that._oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
			});
		},
		
		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished : function (oEvent) {
			// update the worklist's object counter after the table update
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final and
			// the table is not empty
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("goodsIssueListTableTitleCount", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("goodsIssueListTableTitle");
			}
			this._oViewModel.setProperty("/listTableTitle", sTitle);
		},
		
		onSearch : function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
			} else {
				
				this._oStagingStatus = this.byId("iStageFilter");
				var currentStageStatusKey = this._oStagingStatus.getProperty("selectedKey");
				var currentStageStatus = "Staged";
				if (currentStageStatusKey == "002")
				{	
					currentStageStatus = "Handed out to Requestor";
				}
				var aTableSearchState = [new Filter("OrderCategory", FilterOperator.EQ, null), new Filter("OrderCategory", FilterOperator.NE, "10"), new Filter("StagingStatus", FilterOperator.EQ, currentStageStatus)];
				//var aTableSearchState = [];
				var sQuery = oEvent.getParameter("query");
				
				if (sQuery && sQuery.length > 0) {
					var aFilters = [];
					aFilters.push(new Filter("Reservation", FilterOperator.EQ, sQuery));
					aFilters.push(new Filter("Product", FilterOperator.EQ, sQuery));
					aFilters.push(new Filter("ManufacturingOrder", FilterOperator.EQ, sQuery));
					aFilters.push(new Filter("CostCenter", FilterOperator.EQ, sQuery));
					aFilters.push(new Filter("WBSElement", FilterOperator.EQ, sQuery));
					aTableSearchState.push(new Filter(aFilters, false));
				}
				this._applySearch(aTableSearchState);
			}
		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh : function () {
			this._oTable.getBinding("items").refresh();
		},
		
		onHandedToRequestor: function(oEvent) {
			
			for (var i = 0; i < this._aSelectedResv.length; i++) {
					
					var uuid = this._aSelectedResv[i].SAP_UUID;
					var stagingAreaData = {
					"CombinedKey"		: this._aSelectedResv[i].Reservation.replace(/^0+/, "") + "-" + this._aSelectedResv[i].ReservationItem.replace(/^0+/, ""),
					"SAP_Description"	: "upload",
					"ReservationID"		: this._aSelectedResv[i].Reservation,
					"ReservationLineID"	: this._aSelectedResv[i].ReservationItem,
					"StagingStatus"		: "Handed out to Requestor",
					"StagingArea"		: this._aSelectedResv[i].StagingArea
					};
					
					this.getModel("customResvStagingSrv").update("/YY1_RESVITEMSTAGINGAREA(guid'" + uuid + "')", stagingAreaData);
			}
			
			this._oTable = this.byId("idStagedReservationListTable");
		
			MessageToast.show(this._aSelectedResv.length.toString() + " Reservation(s) updated. Please refresh", {
				duration: 5000,
				closeOnBrowserNavigation: false
			});
		
			this._aSelectedResv = [];
			this._oTable.setMode(sap.m.ListMode.None); // Delete mode selection
			this._oTable.setMode(sap.m.ListMode.MultiSelect);
			this._updateButtonCounts();
			
			var aTableSearchState = [new Filter("OrderCategory", FilterOperator.EQ, null), new Filter("OrderCategory", FilterOperator.NE, "10"), new Filter("StagingStatus", FilterOperator.EQ, "Staged")];
			this._applySearch(aTableSearchState);
			this._oTable.getBinding("items").refresh();
				
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
		
		onSelectionChange: function(oEvent) {
			var aItems = oEvent.getParameter("listItems");
			var oSelected;
			
			function isMatched(oValue) {
				return oValue === oSelected;
			}
			
			for (var i = 0; i < aItems.length; i++) {
				var oBindingContext = aItems[i].getBindingContext("customStagedResvSrv");
				oSelected = oBindingContext.getObject();
				
				if (oEvent.getParameter("selected")) {
					this._aSelectedResv.push(oSelected);
				} else {
					this._aSelectedResv.splice(this._aSelectedResv.findIndex(isMatched), 1);
				}
			}
			this._updateButtonCounts();
		},
		
		onPlantSelect: function(oEvent)
		{
			var sInputValue = oEvent.getSource().getSelectedItem().getProperty("key");
			if (sInputValue.length > 20) {
				sInputValue = sInputValue.substring(0, 20);
			}
		
			// create a filter for the binding
			var plantFilter = [];
			plantFilter.push(new Filter("Plant", FilterOperator.EQ, sInputValue));
			var aFilters = new Filter(plantFilter, false);
			//var aFilters = this._createFilter("Plant", sInputValue);
	
			var _oSelectSL = this.getView().byId("sStorageLoc");
			var listBinding = _oSelectSL.getBinding("items");
			listBinding.filter(aFilters);
		},
		
		onFilterBarGo: function (oEvent) {
		
			var aTableSearchState = [new Filter("OrderCategory", FilterOperator.EQ, null), new Filter("OrderCategory", FilterOperator.NE, "10")];
			
			var sStagingStatusKey = oEvent.getParameter("selectionSet")[0].getProperty("selectedKey");
			var sStagingStatus = "Staged";
			if(sStagingStatusKey == "002")
			{
				sStagingStatus = "Handed out to Requestor";
			}
			
			var sReservationNo = oEvent.getParameter("selectionSet")[1].getProperty("value");
			var sPlant =  oEvent.getParameter("selectionSet")[2].getProperty("selectedKey");
			var sStoreLoc = oEvent.getParameter("selectionSet")[3].getProperty("selectedKey");
			var sOrderNo = oEvent.getParameter("selectionSet")[4].getProperty("value");

			var aFilters = [];
			var addtoSearchState = false;
			if (sStagingStatus.length > 0)
			{
		 		aFilters.push(new Filter("StagingStatus", FilterOperator.EQ, sStagingStatus));
		 		addtoSearchState = true;
			}
			if (sReservationNo.length > 0)
			{
		 		aFilters.push(new Filter("Reservation", FilterOperator.Contains, sReservationNo));
		 		addtoSearchState = true;
			}
			if (sPlant.length > 0)
			{
				aFilters.push(new Filter("Plant", FilterOperator.EQ, sPlant));
				addtoSearchState = true;
			}
			if (sStoreLoc.length > 0)
			{
				aFilters.push(new Filter("StorageLocation", FilterOperator.EQ, sStoreLoc));
				addtoSearchState = true;
			}
			if (sOrderNo.length > 0)
			{
				aFilters.push(new Filter("ManufacturingOrder", FilterOperator.Contains, sOrderNo));
				addtoSearchState = true;
			}
			
			if (addtoSearchState == true)
			{
				aTableSearchState.push(new Filter(aFilters, true));
			}
			
			this._applySearch(aTableSearchState);
		},
		
		onClear: function (oEvent) {
		
			oEvent.getParameter("selectionSet")[0].setValue("Staged");
			oEvent.getParameter("selectionSet")[1].setValue("");
			oEvent.getParameter("selectionSet")[2].setValue("");
			oEvent.getParameter("selectionSet")[3].setValue("");
			oEvent.getParameter("selectionSet")[4].setValue("");
			
			this._oTable = this.byId("idStagedReservationListTable");
			this._oTable.getBinding("items").refresh();
			//this.onRefresh();
				
			var aTableSearchState = [new Filter("OrderCategory", FilterOperator.EQ, null), new Filter("OrderCategory", FilterOperator.NE, "10"), new Filter("StagingStatus", FilterOperator.EQ, "Staged")];
			this._applySearch(aTableSearchState);
		},
		
		/* =========================================================== */
		/* PICKLISTS
		/* =========================================================== */
		
		onHandleValueHelpOrder: function(oEvent) {
			var sInputValue = oEvent.getSource().getValue();
			if (sInputValue.length > 20) {
				sInputValue = sInputValue.substring(0, 20);
			}
			this.savedOrderInputField = oEvent.getSource();
			
			// create value help dialog
			if (!this._valueHelpDialogOrder) {
				this._valueHelpDialogOrder = sap.ui.xmlfragment( "dyflex.mm.s4cloud.warehouse.view.ValueHelpOrder", this );
				this.getView().addDependent(this._valueHelpDialogOrder);
				jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._valueHelpDialogOrder);
			}
			
			// create a filter for the binding
			//var aFilters = this._createFilter(sInputValue);
			//this._valueHelpDialogPlant.getBinding("items").filter(aFilters);
			
			// open value help dialog filtered by the input value
			this._valueHelpDialogOrder.open(sInputValue);
		},
		
		onHandleValueHelpReservation: function(oEvent) {
			var sInputValue = oEvent.getSource().getValue();
			if (sInputValue.length > 20) {
				sInputValue = sInputValue.substring(0, 20);
			}
			this.savedInputField = oEvent.getSource();
			
			// create value help dialog
			if (!this._valueHelpDialogReservation) {
				this._valueHelpDialogReservation = sap.ui.xmlfragment( "dyflex.mm.s4cloud.warehouse.view.ValueHelpReservation", this );
				this.getView().addDependent(this._valueHelpDialogReservation);
				jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._valueHelpDialogReservation);
			}
			
			// create a filter for the binding
			//var aFilters = this._createFilter(sInputValue);
			//this._valueHelpDialogPlant.getBinding("items").filter(aFilters);
			
			// open value help dialog filtered by the input value
			this._valueHelpDialogReservation.open(sInputValue);
		},
		
		onHandleSuggest: function(oEvent) {
			this.savedInputField = oEvent.getSource();
			var sInputValue = oEvent.getSource().getValue();
			var aFilters = this._createFilter("Reservation", sInputValue);
			oEvent.getSource().getBinding("suggestionRows").filter(aFilters);
		},
		
		onHandleValueHelpSearch: function (oEvent) {
			var sValue = oEvent.getParameter("value");
			if (sValue.length > 20) {
				sValue = sValue.substring(0, 20);
			}
			var aFilters = this._createFilter("Reservation", sValue);
			oEvent.getSource().getBinding("items").filter(aFilters);
		},
		
		onHandleValueHelpClose: function (oEvent) {
			var oInputField = this.savedInputField;
			
			var oSelectedRow = oEvent.getParameter("selectedRow");
			if (oSelectedRow) { //suggestions
				oInputField.setValue(oSelectedRow.getCells()[0].getText());
				oInputField.setTooltip(oSelectedRow.getCells()[1].getText());
			} else { // value help dialog
				var oSelectedItem = oEvent.getParameter("selectedItem");
				if (oSelectedItem) {
					var selectedVal = oSelectedItem.getTitle();
					var selectedValTrim = selectedVal.replace(/^0+/, "");
					oInputField.setValue(selectedValTrim);
					oInputField.setTooltip(oSelectedItem.getDescription());
					oEvent.getSource().getBinding("items").filter([]);
				}
			}
		},
		
		_createFilter: function (sField, sValue) {
			var orFilter = [];
			var andFilter = [];
			
			andFilter.push(new Filter(sField, FilterOperator.Contains, sValue));
			orFilter.push(new Filter(andFilter, true));

			return new Filter(orFilter, false);
		},
		
		onLiveChangeOrder: function(oEvent) {
			oEvent.getSource().setTooltip("");
		},
		
	
		
		
		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */
		
		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
		 * @private
		 */
		_applySearch: function(aTableSearchState) {
			this._oTable.getBinding("items").filter(aTableSearchState, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aTableSearchState.length !== 0) {
				this._oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("listNoDataWithSearchText"));
			}
		},
		
		_updateButtonCounts: function() {
			this._oViewModel.setProperty("/buttonCountResv", this._aSelectedResv.length);
		}

	});

});