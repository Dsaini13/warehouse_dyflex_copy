sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, MessageToast) {
	"use strict";

	return BaseController.extend("dyflex.mm.s4cloud.warehouse.controller.GoodsReceiptDetail", {

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
					delay : 0
				});
			this.setModel(this._oViewModel, "detailView");
			
			this.getRouter().getRoute("goodsReceiptDetail").attachPatternMatched(this._onObjectMatched, this);
			
			// Get Service URL
			this._dataSources = this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").dataSources;
			
			// Set Attachment Control
			this._oAttachmentsControl = this.byId("idUploadCollection");
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */
		
		onPost: function() {
			this._oAttachmentsControl.upload();
		},
		
		onCancel: function() {
			this.getRouter().navTo("goodsReceiptList", {}, true);
		},
		
		onDeleteItem : function (oEvent) {
			var path = oEvent.getSource().getParent().getBindingContextPath(),
				orderData = this._oPurchaseOrder.getData();
				
			var iRowIndex = path.match(/\d+/);
			if (iRowIndex) {
				if (orderData.d.to_PurchaseOrderItem.results[iRowIndex[0]].Existing) {
					orderData.d.to_PurchaseOrderItem.results[iRowIndex[0]].Deleted = true;
				} else {
					orderData.d.to_PurchaseOrderItem.results.splice(iRowIndex[0], 1);
				}
				this._oPurchaseOrder.setData(orderData);
			}
			
			//this.onValueChanged();
		},
		
		/* =========================================================== */
		/* Attachments Processing                                       */
		/* =========================================================== */
		
		onFileSizeExceeded: function(oEvent) {
			MessageToast.show("File cannot be larger than 10MB.");
		},
		
		onBeforeUploadStarts: function(oEvent) {
			this._oAttachmentsControl.removeAllHeaderFields();
			this._oAttachmentsControl.setHttpRequestMethod("PUT");
			
			var oXCSRFToken = new sap.ui.core.Item({ key: "X-CSRF-Token", text: this.getOwnerComponent().getModel("attachmentSrv").getSecurityToken() });
			this._oAttachmentsControl.addHeaderField(oXCSRFToken);
			
			var oSlug = new sap.ui.core.Item({ key: "slug", text: encodeURIComponent(oEvent.getParameters().item.getProperty("fileName")) });
			this._oAttachmentsControl.addHeaderField(oSlug);

			var oObjectType = new sap.ui.core.Item({ key: "BusinessObjectTypeName", text: "BUS2012" });
			this._oAttachmentsControl.addHeaderField(oObjectType);
			
			var oObjectKey = new sap.ui.core.Item({ key: "LinkedSAPObjectKey", text: this._sPurchaseOrder });
			this._oAttachmentsControl.addHeaderField(oObjectKey);
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
			andFilter.push(new Filter("StorageLocation", FilterOperator.Contains, sValue));
			orFilter.push(new Filter(andFilter, true));
			
			andFilter = [];
			andFilter.push(new Filter("Product", FilterOperator.EQ, this.savedStoreLocInputField.data("Material")));
			andFilter.push(new Filter("Plant", FilterOperator.EQ, this.savedStoreLocInputField.data("Plant")));
			andFilter.push(new Filter("StorageLocationName", FilterOperator.Contains, sValue));
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
			this._sPurchaseOrder = oEvent.getParameter("arguments").purchaseOrder;
			this._getOrderDetails();
		},
		
		_getOrderDetails: function() {
			this._oViewModel.setProperty("/busy", true);
			
			var that = this;
			this._oPurchaseOrder = new JSONModel(this._dataSources.PurchOrder.uri + "A_PurchaseOrder('" + this._sPurchaseOrder + "')?$expand=to_PurchaseOrderItem&$format=json");
			
			this._oPurchaseOrder.attachRequestCompleted({}, function(oEvent) {
				that._handleJSONModelError(oEvent);
				that._setSupplierDescModel(that._oPurchaseOrder.getProperty("/d/Supplier"));
				that.setModel(that._oPurchaseOrder, "orderModel");
				that._oViewModel.setProperty("/busy", false);
			});
		}
		
	});

});