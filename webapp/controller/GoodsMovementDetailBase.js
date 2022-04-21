sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, MessageToast) {
	"use strict";
	
	return BaseController.extend("dyflex.mm.s4cloud.warehouse.controller.GoodsMovementDetailBase", {
		
		formatter: formatter,
		
		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */
		
		_onInit: function(sRoute) {
			
			this._oViewModel = new JSONModel({
					busy: true,
					delay: 0,
					orderNo: "",
					enableSave: false,
					serialNoTableTitle: ""
				});
			this.setModel(this._oViewModel, "viewModel");
			
			this.getRouter().getRoute(sRoute).attachPatternMatched(this._onObjectMatched, this);
			
			this._dataSources = this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").dataSources;
			
			this._initAttachmentControl();
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
				oData.to_MaterialDocumentItem.results.splice(iRowIndex[0], 1);
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
			
			// Remove temp fields
			for (var i = 0; i < createData.to_MaterialDocumentItem.results.length; i++) {
				delete createData.to_MaterialDocumentItem.results[i].TempOpenQty;
				delete createData.to_MaterialDocumentItem.results[i].TempEnableSerialNo;
				delete createData.to_MaterialDocumentItem.results[i].TempPlantName;
				delete createData.to_MaterialDocumentItem.results[i].TempStorageLocationName;
			}
			
			this.getModel("matDocSrv").create("/A_MaterialDocumentHeader", createData, {
				success: this._saveEntitySuccess.bind(this),
				error: this._saveEntityFailed.bind(this)
			});
		},
		
		_saveEntitySuccess: function(oData, response) {
			// Save created material document for attachment
			this._sMatDocNo = oData.MaterialDocument + oData.MaterialDocumentYear;
			this._oAttachmentsControl.upload();
			
			this._oViewModel.setProperty("/busy", false);
			
			var msg = this.getResourceBundle().getText("goodsReceiptSucessMsg", [oData.MaterialDocument, oData.MaterialDocumentYear]);
			MessageToast.show( msg, {
				duration: 5000,
				closeOnBrowserNavigation: false
			});
			
			this._navToListView();
		},
		
		_saveEntityFailed: function(oData) {
			this._oViewModel.setProperty("/busy", false);
		},
		
		/* =========================================================== */
		/* Attachments Processing                                       */
		/* =========================================================== */
		
		onBeforeUploadStarts: function(oEvent) {
			this._oAttachmentsControl.removeAllHeaderFields();
			
			var oXCSRFToken = new sap.ui.core.Item({ key: "X-CSRF-Token", text: this.getModel("attachmentSrv").getSecurityToken() });
			this._oAttachmentsControl.addHeaderField(oXCSRFToken);
			
			var oSlug = new sap.ui.core.Item({ key: "slug", text: encodeURIComponent(oEvent.getParameters().item.getProperty("fileName")) });
			this._oAttachmentsControl.addHeaderField(oSlug);

			var oObjectType = new sap.ui.core.Item({ key: "BusinessObjectTypeName", text: "BUS2017" });
			this._oAttachmentsControl.addHeaderField(oObjectType);
			
			var oObjectKey = new sap.ui.core.Item({ key: "LinkedSAPObjectKey", text: this._sMatDocNo });
			this._oAttachmentsControl.addHeaderField(oObjectKey);
		},
		
		_initAttachmentControl: function() {
			this._oAttachmentsControl = this.byId("idUploadCollection");
			this._oAttachmentsControl.setUploadUrl(this._dataSources.Attachment.uri + "AttachmentContentSet");
		},
		
		/**
		 * Unbind the Attachment Control, otherwise the model remembers all previous uploads
		 */
		_resetAttachmentControl: function() {
			this._oAttachmentsControl.unbindAggregation("items");
			this._oAttachmentsControl.destroyItems();
			this._oAttachmentsControl.removeAllItems();
			this._oAttachmentsControl.removeAllHeaderFields();
			this._oAttachmentsControl.removeAllIncompleteItems();
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