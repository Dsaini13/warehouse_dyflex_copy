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
					busy: true,
					delay: 0,
					purchaseOrder: "",
					enableSave: false
				});
			this.setModel(this._oViewModel, "viewModel");
			
			this.getRouter().getRoute("goodsReceiptDetail").attachPatternMatched(this._onObjectMatched, this);
			
			// Get Service URL
			this._dataSources = this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").dataSources;
			
			// Set Attachment Control
			this._oAttachmentsControl = this.byId("idUploadCollection");
			this._oAttachmentsControl.setUploadUrl(this.getOwnerComponent().getManifestObject().resolveUri("/S4HANA_CLOUD/sap/opu/odata/sap/API_CV_ATTACHMENT_SRV/AttachmentContentSet"));
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */
		
		onCancel: function() {
			this.getRouter().navTo("goodsReceiptList", {}, true);
		},
		
		onDeleteItem : function (oEvent) {
			var path = oEvent.getSource().getParent().getBindingContextPath(),
				oData = this._oCreateModel.getData();
				
			var iRowIndex = path.match(/\d+/);
			if (iRowIndex) {
				if (oData.to_MaterialDocumentItem.results[iRowIndex[0]].Existing) {
					oData.to_MaterialDocumentItem.results[iRowIndex[0]].Deleted = true;
				} else {
					oData.to_MaterialDocumentItem.results.splice(iRowIndex[0], 1);
				}
				this._oCreateModel.setData(oData);
			}
			
			this._validateSaveEnablement();
		},
		
		onChanged: function() {
			this._validateSaveEnablement();
		},
		
		/* =========================================================== */
		/* POST Methods                                                */
		/* =========================================================== */
		
		onPost: function (oEvent) {
			
			// Test attachment upload with Mat Doc 5000000180 / 2022
			
			this._oViewModel.setProperty("/busy", true);
			var createData = jQuery.extend(true, {}, this._oCreateModel.getData());
			
			// Adjust date values
			createData.DocumentDate = this._getDateObject(this.byId("idDocumentDate"));
			createData.PostingDate  = this._getDateObject(this.byId("idPostingDate"));
			
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
			// Save created work order for attachment
			//this._oAttachmentsControl.upload();
			
			this._oViewModel.setProperty("/busy", false);
			
			var msg = this.getResourceBundle().getText("goodsReceiptSucessMsg", [oData.MaterialDocument, oData.MaterialDocumentYear]);
			MessageToast.show( msg, {
				duration: 5000,
				closeOnBrowserNavigation: false
			});
		},
		
		_saveEntityFailed: function(oData) {
			this._oViewModel.setProperty("/busy", false);
		},
		
		/* =========================================================== */
		/* Attachments Processing                                       */
		/* =========================================================== */
		
		onFileSizeExceeded: function(oEvent) {
			MessageToast.show("File cannot be larger than 10MB.");
		},
		
		onBeforeUploadStarts: function(oEvent) {
			this._oAttachmentsControl.removeAllHeaderFields();
			//this._oAttachmentsControl.setHttpRequestMethod("PUT");
			
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
			
			this._validateSaveEnablement();
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
			this._validateSaveEnablement();
		},
		
		_getOrderDetails: function() {
			this._oViewModel.setProperty("/busy", true);
			this._oViewModel.setProperty("/purchaseOrder", this._sPurchaseOrder);
			
			var that = this;
			var oPurchOrder = new JSONModel(this._dataSources.PurchOrder.uri + "A_PurchaseOrder('" + this._sPurchaseOrder + "')?$expand=to_PurchaseOrderItem&$format=json");
			
			oPurchOrder.attachRequestCompleted({}, function(oEvent) {
				that._handleJSONModelError(oEvent);
				that._setSupplierDescModel(oPurchOrder.getProperty("/d/Supplier"));
				that._createODataModel(oPurchOrder.getData());
				that._oViewModel.setProperty("/busy", false);
			});
		},
		
		_createODataModel: function(purchOrder) {
			
			var matDocData = {
				"GoodsMovementCode"			 : "01",
				"DocumentDate"				 : new Date(),
				"PostingDate"				 : new Date(),
				"ReferenceDocument"			 : "",
				"MaterialDocumentHeaderText" : "",
				"VersionForPrintingSlip"	 : "0",
				"ManualPrintIsTriggered"	 : "",
				"to_MaterialDocumentItem"	 : { "results":[] }
			};
			
			var aItems = purchOrder.d.to_PurchaseOrderItem.results;
			for (var i = 0; i < aItems.length; i++) {
				matDocData.to_MaterialDocumentItem.results.push({
					"Material"				   : aItems[i].Material,
					"Plant"					   : aItems[i].Plant,
					"StorageLocation"		   : aItems[i].StorageLocation,
					"PurchaseOrder"			   : aItems[i].PurchaseOrder,
					"PurchaseOrderItem"		   : aItems[i].PurchaseOrderItem,
					"GoodsMovementType"		   : "101",
					"GoodsMovementRefDocType"  : "B",
					"QuantityInEntryUnit"	   : aItems[i].OrderQuantity,
					"EntryUnit"				   : aItems[i].PurchaseOrderQuantityUnit,
					"MaterialDocumentItemText" : aItems[i].PurchaseOrderItemText
				});
			}
			
			this._oCreateModel = new JSONModel(matDocData);
			this.setModel(this._oCreateModel, "createModel");
		},
		
		/**
		 * Checks if the save button can be enabled
		 * @private
		 */
		_validateSaveEnablement: function () {
			var aInputControls = this._getFormFields(this.byId("idHeaderForm"));
			var oControl;
			for (var m = 0; m < aInputControls.length; m++) {
				oControl = aInputControls[m].control;
				if (aInputControls[m].required) {
					var sValue = oControl.getValue();
					if (!sValue) {
						this._oViewModel.setProperty("/enableSave", false);
						return;
					}
				}
			}
			
			var aItems = this._oCreateModel.getProperty("/to_MaterialDocumentItem/results");
			if (aItems && aItems.length === 0) {
				this._oViewModel.setProperty("/enableSave", false);
				return;
			}
			
			for (var i = 0; i < aItems.length; i++) {
				if (!parseFloat(aItems[i].QuantityInEntryUnit)) {
					this._oViewModel.setProperty("/enableSave", false);
					return;
				}
			}
				
			this._oViewModel.setProperty("/enableSave", true);
		},
		
		/**
		 * Gets the form fields
		 * @param {sap.ui.layout.form} oSimpleForm the form in the view.
		 * @returns {Array} array of controls in the form
		 * @private
		 */
		_getFormFields: function(oSimpleForm) {
			var aControls = [];
			var sControlType;
			var aFormContent = oSimpleForm.getContent();
			for (var i = 0; i < aFormContent.length; i++) {
				sControlType = aFormContent[i].getMetadata().getName();
				if (sControlType === "sap.m.Input" ||
					sControlType === "sap.m.DatePicker" ||
					sControlType === "sap.m.ComboBox") {
					aControls.push({
						control: aFormContent[i],
						required: aFormContent[i].getRequired && aFormContent[i].getRequired()
					});
				}
			}
			return aControls;
		}
		
	});

});