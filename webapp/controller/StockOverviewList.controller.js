sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator) {
	"use strict";

	return BaseController.extend("dyflex.mm.s4cloud.warehouse.controller.StockOverviewList", {
		
		formatter: formatter,
		
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf dyflex.mm.s4cloud.warehouse.view.StockOverviewList
		 */
		onInit: function () {
			
			var that = this;
			this._oTable = this.byId("idStockOverviewListTable");
			
			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			var iOriginalBusyDelay = this._oTable.getBusyIndicatorDelay();
			// keeps the search state
			this._aTableSearchState = [];

			// Model used to manipulate control states
			this._oViewModel = new JSONModel({
				listTableTitle : this.getResourceBundle().getText("stockOverviewListTableTitle"),
				saveAsTileTitle: this.getResourceBundle().getText("saveAsTileTitle", this.getResourceBundle().getText("stockOverviewListTitle")),
				shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailListSubject"),
				shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailListMessage", [location.href]),
				tableNoDataText : this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay : 0
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
				sTitle = this.getResourceBundle().getText("stockOverviewListTableTitleCount", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("stockOverviewListTableTitle");
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
				var aTableSearchState = [];
				var sQuery = oEvent.getParameter("query");

				if (sQuery && sQuery.length > 0) {
					aTableSearchState = [new Filter("Material", FilterOperator.EQ, sQuery)];
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
		
		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onPress : function (oEvent) {
			var oObject = this.getModel("customStockSrv").getProperty(oEvent.getSource().getBindingContextPath());
			this.getRouter().navTo("stockOverviewDetail", {
				objectId: oObject.ID
			});
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
		
			var aTableSearchState = [];
			
			var sMaterial = oEvent.getParameter("selectionSet")[0].getProperty("value");
			var sPlant =  oEvent.getParameter("selectionSet")[1].getProperty("selectedKey");
			var sStoreLoc = oEvent.getParameter("selectionSet")[2].getProperty("selectedKey");
			var sStorageBin = oEvent.getParameter("selectionSet")[3].getProperty("value");

			var aFilters = [];
			var addtoSearchState = false;
			if (sMaterial.length > 0)
			{
		 		aFilters.push(new Filter("Material", FilterOperator.EQ, sMaterial));
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
			if (sStorageBin.length > 0)
			{
				aFilters.push(new Filter("WarehouseStorageBin", FilterOperator.Contains, sStorageBin));
				addtoSearchState = true;
			}
			
			if (addtoSearchState == true)
			{
				aTableSearchState.push(new Filter(aFilters, true));
			}
			
			this._applySearch(aTableSearchState);
		},
		
		onClear: function (oEvent) {
		
			oEvent.getParameter("selectionSet")[0].setValue("");
			oEvent.getParameter("selectionSet")[1].setValue("");
			oEvent.getParameter("selectionSet")[1].setSelectedKey("");
			oEvent.getParameter("selectionSet")[2].setSelectedKey("");
			oEvent.getParameter("selectionSet")[2].setValue("");
			oEvent.getParameter("selectionSet")[3].setValue("");

			var plantFilter = [];
			var aFilters = new Filter(plantFilter, false);
			var _oSelectSL = this.getView().byId("sStorageLoc");
			var listBinding = _oSelectSL.getBinding("items");
			listBinding.filter(aFilters);
			
			this._oTable = this.byId("idStockOverviewListTable");
			this._oTable.getBinding("items").aFilters = null;
			this._oTable.getBinding("items").aApplicationFilters = null;
			this._oTable.getBinding("items").refresh();
			//this.onRefresh();
				
			var aTableSearchState = [];
			this._applySearch(aTableSearchState);
		},
		
		/* =========================================================== */
		/* PICKLISTS
		/* =========================================================== */
		
		onHandleValueHelpMaterial: function(oEvent) {
			var sInputValue = oEvent.getSource().getValue();
			if (sInputValue.length > 20) {
				sInputValue = sInputValue.substring(0, 20);
			}
			this.savedOrderInputField = oEvent.getSource();
			
			// create value help dialog
			if (!this._valueHelpDialogMaterial) {
				this._valueHelpDialogMaterial = sap.ui.xmlfragment( "dyflex.mm.s4cloud.warehouse.view.ValueHelpMaterial", this );
				this.getView().addDependent(this._valueHelpDialogMaterial);
				jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._valueHelpDialogMaterial);
			}
			
			// create a filter for the binding
			//var aFilters = this._createFilter(sInputValue);
			//this._valueHelpDialogMaterial.getBinding("items").filter(aFilters);
			
			// open value help dialog filtered by the input value
			this._valueHelpDialogMaterial.open(sInputValue);
		},
		
		onHandleSuggest: function(oEvent) {
			this.savedInputField = oEvent.getSource();
			var sInputValue = oEvent.getSource().getValue();
			var aFilters = this._createFilter("Product", sInputValue);
			oEvent.getSource().getBinding("suggestionRows").filter(aFilters);
		},
		
		onHandleValueHelpSearch: function (oEvent) {
			var sValue = oEvent.getParameter("value");
			if (sValue.length > 20) {
				sValue = sValue.substring(0, 20);
			}
			var aFilters = this._createFilter("Product", sValue);
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
		}
		
	});

});