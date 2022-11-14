sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/export/library",
	"sap/ui/export/Spreadsheet",
	"sap/m/MessageToast"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, exportLibrary, Spreadsheet, MessageToast) {
	"use strict";
	
	var EdmType = exportLibrary.EdmType;
		
	return BaseController.extend("dyflex.mm.s4cloud.warehouse.controller.GoodsIssueResvList", {
		
		formatter: formatter,
		
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf dyflex.mm.s4cloud.warehouse.view.GoodsIssueResvList
		 */
		onInit: function () {
			
			var that = this;
			this._oTable = this.byId("idGoodsIssueListTable");
			this._aSelectedResv = [];
			
			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			var iOriginalBusyDelay = this._oTable.getBusyIndicatorDelay();
			
			// Model used to manipulate control states
			this._oViewModel = new JSONModel({
				listTableTitle : this.getResourceBundle().getText("goodsIssueListTableTitle"),
				saveAsTileTitle: this.getResourceBundle().getText("saveAsTileTitle", this.getResourceBundle().getText("goodsIssueListTitle")),
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
				var aTableSearchState = [new Filter("OrderCategory", FilterOperator.EQ, null), new Filter("OrderCategory", FilterOperator.NE, "10")];
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
		
		onPickIssue: function() {
			this.getRouter().getTargets().display("goodsIssueResvDetail", {
				selectedResv: this._aSelectedResv
			});
		},
		
		onSelectionChange: function(oEvent) {
			var aItems = oEvent.getParameter("listItems");
			var oSelected;
			
			function isMatched(oValue) {
				return oValue === oSelected;
			}
			
			for (var i = 0; i < aItems.length; i++) {
				var oBindingContext = aItems[i].getBindingContext("customResvItemSrv");
				oSelected = oBindingContext.getObject();
				oSelected.to_Stock = oBindingContext.getModel().getProperty(oBindingContext.sPath + "/to_Stock");
				
				if (oEvent.getParameter("selected")) {
					this._aSelectedResv.push(oSelected);
				} else {
					this._aSelectedResv.splice(this._aSelectedResv.findIndex(isMatched), 1);
				}
			}
			this._updateButtonCounts();
		},
		
		onExportExtract: function(event) {
			var aCols, oRowBinding, oSettings, oSheet, oTable;

			aCols = this._createColumnConfig();
			if (!this._oTable) {
				this._oTable = this.byId("idGoodsIssueListTable");
			}

			oTable = this._oTable;
			oRowBinding = oTable.getBinding("items");

			oSettings = {
				workbook: { columns: aCols },
				dataSource: oRowBinding,
				fileName: "GI for Reservations.xlsx"
			};

			oSheet = new Spreadsheet(oSettings);
			oSheet.build()
				.then( function() {
					MessageToast.show("Spreadsheet export has finished");
				})
				.finally(oSheet.destroy);
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
		},
		
		_createColumnConfig: function() {
			return [
				{
					label: "Reservation",
					property: "Reservation",
					type: EdmType.Number,
					scale: 0
				},
				{
					label: "Reservation Item",
					property: "ReservationItem",
					type: EdmType.Number,
					scale: 0
				},
				{
					label: "Material",
					property: "Product",
					type: EdmType.Number,
					scale: 0
				},
				{
					label: "Material Description",
					property: "ProductName"
				},
				{
					label: "Requirement Date",
					property: "MatlCompRequirementDate",
					type: EdmType.Date
				},
				{
					label: "Recipient",
					property: "GoodsRecipientName",
					type: EdmType.Date
				},
				{
					label: "Work Order",
					property: "ManufacturingOrder",
					type: EdmType.Number,
					scale: 0
				},
				{
					label: "Work Order Description",
					property: "OrderDescription"
				},
				{
					label: "Cost Center",
					property: "CostCenter",
					type: EdmType.Number,
					scale: 0
				},
				{
					label: "Cost Center Description",
					property: "CostCenterDescription"
				},
				{
					label: "WBSElement",
					property: "WBSElement",
					type: EdmType.Number,
					scale: 0
				},
				{
					label: "WBS Description",
					property: "WBSDescription"
				},
				{
					label: "Storage Bin",
					property: "WarehouseStorageBin"
				},
				{
					label: "Unrestricted Stock",
					property: "to_Stock/StockOnHand",
					type: EdmType.Number,
                	unitProperty: "BaseUnit",
                	scale: 3
				},
				{
					label: "Open Qty",
					type: EdmType.Number,
					property: "OpenQuantity",
					unitProperty: "BaseUnit",
					scale: 3
				}];
		}
	});
});