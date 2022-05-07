sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, MessageToast) {
	"use strict";

	return BaseController.extend("dyflex.mm.s4cloud.warehouse.controller.PickingDeliveryDetail", {
		
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
					busy: true,
					delay: 0,
					documentNo: "",
					enableSave: true,
					serialNoTableTitle: ""
				});
			this.setModel(this._oViewModel, "viewModel");
			
			this.getRouter().getRoute("pickingDeliveryDetail").attachPatternMatched(this._onObjectMatched, this);
			
			this._dataSources = this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").dataSources;
		},
		
		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */
		
		onCancel: function() {
			this._navToListView();
		},
		
		onDeleteItem : function (oEvent) {
			var path = oEvent.getSource().getParent().getParent().getBindingContextPath(),
				oData = this._oCreateModel.getData();
				
			var iRowIndex = path.match(/\d+/);
			if (iRowIndex) {
				oData.d.results.splice(iRowIndex[0], 1);
				this._oCreateModel.setData(oData);
			}
			this._validateSaveEnablement();
		},
		
		/* =========================================================== */
		/* Serial No Dialog                                            */
		/* =========================================================== */
		
		onSerialNoDelete: function(oEvent) {
			// Redefined this from BaseController so we can save the deleted
			// serial number as this is needed for posting later
			var path = oEvent.getSource().getParent().getBindingContextPath();
			var index = path.match(/\d+/);
			if (index) {
				var itemData = this._oItemModel.getData();
				var aDeleted = itemData.to_SerialNumbers.results.splice(index[0], 1);
				
				if (!itemData.DeletedSerialNo) {
					itemData.DeletedSerialNo = [];
				}
				itemData.DeletedSerialNo.push(aDeleted[0]);
				
				this._oItemModel.setData(itemData);
			}
		},
		
		/* =========================================================== */
		/* POST Methods                                                */
		/* =========================================================== */
		
		onPost: function (oEvent) {
			var that = this;
			var oDataModel = this.getModel("outbDeliverySrv");
			
			this._oViewModel.setProperty("/busy", true);
			var createData = jQuery.extend(true, {}, this._oCreateModel.getData());
			var aItems = createData.d.results;
			
			// attach to the request completed event of the batch
			oDataModel.attachEventOnce("batchRequestCompleted", function(oEvt) {
				that._oViewModel.setProperty("/busy", false);
				if (that._checkIfBatchRequestSucceeded(oEvt)) {
					that._showSuccessMessage();
					that._updateListModel();
					that._navToListView();
				}
			});
			
			for (var i = 0; i < aItems.length; i++) {
				
				var itemETag = "W/\"'" + aItems[i].DeliveryVersion + "'\"";
				
				var oParams = {
					"DeliveryDocument": aItems[i].DeliveryDocument,
					"DeliveryDocumentItem": aItems[i].DeliveryDocumentItem,
					"ActualDeliveryQuantity": aItems[i].PickedQtyInSalesUnit,
					"DeliveryQuantityUnit": aItems[i].DeliveryQuantityUnit
				};
				
				oDataModel.callFunction("/PickOneItemWithSalesQuantity", {
					method: "POST",
					urlParameters: oParams,
					headers: { 
						"If-Match": itemETag
					}
				});
				
				// Add the new Serial Numbers
				// Newly added serial numbers doesn't have Delivery Document 
				if (aItems[i].to_SerialNumbers) {
					var aSerialNumbers = aItems[i].to_SerialNumbers.results;
					for (var j = 0; j < aSerialNumbers.length; j++) {
						if (!aSerialNumbers[j].DeliveryDocument) {
							oDataModel.callFunction("/AddSerialNumberToDeliveryItem", {
								method: "POST",
								urlParameters: {
									"DeliveryDocument": aItems[i].DeliveryDocument,
									"DeliveryDocumentItem": aItems[i].DeliveryDocumentItem,
									"SerialNumber": aSerialNumbers[j].SerialNumber
								},
								headers: { 
									"If-Match": itemETag
								}
							});	
						}
					}
				}
				
				// Remove deleted Serial Numbers
				// Existing serial numbers have Delivery Document 
				if (aItems[i].DeletedSerialNo) {
					var aDeletedSerialNo = aItems[i].DeletedSerialNo;
					for (var k = 0; k < aDeletedSerialNo.length; k++) {
						if (aDeletedSerialNo[k].DeliveryDocument) {
							oDataModel.callFunction("/DeleteSerialNumberFromDeliveryItem", {
								method: "POST",
								urlParameters: {
									"DeliveryDocument": aDeletedSerialNo[k].DeliveryDocument,
									"DeliveryDocumentItem": aDeletedSerialNo[k].DeliveryDocumentItem,
									"SerialNumber": aDeletedSerialNo[k].SerialNumber
								},
								headers: { 
									"If-Match": itemETag
								}
							});	
						}
					}
				}
				
			}
			oDataModel.submitChanges();
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
			this._sDocumentNo = oEvent.getParameter("arguments").documentNo;
			
			this._oViewModel.setProperty("/busy", true);
			this._oViewModel.setProperty("/documentNo", this._sDocumentNo);
			
			var that = this;
			var sFilter = "DeliveryDocument eq '" + this._sDocumentNo + "'";
			
			this._oCreateModel = new JSONModel(this._dataSources.CustomDlvItem.uri + "YY1_Warehouse_DlvItem?$filter=" + sFilter + "&$expand=to_SerialNumbers&$format=json");
			this.setModel(this._oCreateModel, "createModel");
			
			this._oCreateModel.attachRequestCompleted({}, function() {
				that._handleJSONModelError(oEvent);
				that._setCustomerDescModel(that._oCreateModel.getProperty("/d/results/0/SoldToParty"));
				that._oViewModel.setProperty("/busy", false);
			});
		},
		
		/**
		 * Checks if the save button can be enabled
		 * @private
		 */
		_validateSaveEnablement: function () {
			var aItems = this._oCreateModel.getProperty("/d/results");
			if (aItems && aItems.length === 0) {
				this._oViewModel.setProperty("/enableSave", false);
				return;
			}
			this._oViewModel.setProperty("/enableSave", true);
		},
		
		_showSuccessMessage: function() {
			var msg = this.getResourceBundle().getText("pickingDeliverySuccessMsg", [this._sDocumentNo]);
			MessageToast.show( msg, { closeOnBrowserNavigation: false });
		},
		
		_updateListModel: function() {
			this.getModel("customDlvItemSrv").refresh(true /*force update*/, false /*remove data*/);
			this.getModel("customDlvItemSrv").resetChanges();
		},
		
		_navToListView: function() {
			this.getRouter().navTo("pickingDeliveryList", {}, true);
		}
		
	});

});