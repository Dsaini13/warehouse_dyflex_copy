sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, MessageToast) {
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
		
		/* =========================================================== */
		/* Barcode Scanner Handler                                     */
		/* =========================================================== */
		
		onScanSuccess: function(oEvent) {
			var oSearchField = this.byId("idSearchField");
			if (oEvent.getParameter("cancelled")) {
				MessageToast.show("Scan cancelled", { duration:1000 });
			} else {
				if (oEvent.getParameter("text")) {
					oSearchField.setValue(oEvent.getParameter("text"));
					oSearchField.fireSearch({ query: oEvent.getParameter("text") });
				} else {
					oSearchField.setValue("");
				}
			}
		},
		
		onScanError: function(oEvent) {
			MessageToast.show("Scan failed: " + oEvent, { duration:1000 });
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