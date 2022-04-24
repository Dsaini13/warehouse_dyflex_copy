sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, MessageToast) {
	"use strict";

	return BaseController.extend("dyflex.mm.s4cloud.warehouse.controller.StocktakeDetail", {
		
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
					fiscalYear: "",
					enableSave: false,
					serialNoTableTitle: ""
				});
			this.setModel(this._oViewModel, "viewModel");
			
			this.getRouter().getRoute("stocktakeDetail").attachPatternMatched(this._onObjectMatched, this);
			
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
				oData.d.results.splice(iRowIndex[0], 1);
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
			var that = this;
			var oDataModel = this.getModel("physInvDocSrv");
			
			this._oViewModel.setProperty("/busy", true);
			var createData = jQuery.extend(true, {}, this._oCreateModel.getData());
			var aItems = createData.d.results;
			
			// attach to the request completed event of the batch
			oDataModel.attachEventOnce("batchRequestCompleted", function(oEvt) {
				that._oViewModel.setProperty("/busy", false);
				if (that._checkIfBatchRequestSucceeded(oEvt)) {
					that._oAttachmentsControl.upload();
					that._showSuccessMessage();
					that._updateListModel();
					that._navToListView();
				}
			});
			
			for (var i = 0; i < aItems.length; i++) {
				
				var eTagParam = {
					headers: { 
						"If-Match": this._findDocItemETag(aItems[i])
					}
				};
				
				var docItemPath = "/A_PhysInventoryDocItem(FiscalYear='" + aItems[i].FiscalYear + 
									"',PhysicalInventoryDocument='" + aItems[i].PhysicalInventoryDocument + 
									"',PhysicalInventoryDocumentItem='" + aItems[i].PhysicalInventoryDocumentItem + "')";
				
				var oDocItem = { "d": {
					"Material": aItems[i].Material,
					"Batch": aItems[i].Batch,
					"QuantityInUnitOfEntry": aItems[i].TempCountQty,
					"UnitOfEntry": aItems[i].MaterialBaseUnit,
					"PhysicalInventoryItemIsZero": parseFloat(aItems[i].TempCountQty) === 0 ? true : false
				}};
				
				oDataModel.update(docItemPath, oDocItem, eTagParam);
				
				
				if (aItems[i].to_SerialNumbers) {
					var aSerialNumbers = aItems[i].to_SerialNumbers.results;
					for (var j = 0; j < aSerialNumbers.length; j++) {
						
						var serialNoPath = "/A_SerialNumberPhysInventoryDoc(FiscalYear='" + aItems[i].FiscalYear + 
											"',PhysicalInventoryDocument='" + aItems[i].PhysicalInventoryDocument + 
											"',PhysicalInventoryDocumentItem='" + aItems[i].PhysicalInventoryDocumentItem + 
											"',Equipment='',SerialNumberPhysicalInvtryType='2')";
						
						var oSerialNo = { "d": {
							"SerialNumber": aSerialNumbers[j].SerialNumber
						}};
						
						oDataModel.update(serialNoPath, oSerialNo, eTagParam);
					}
				}
			}
			oDataModel.submitChanges();
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

			var oObjectType = new sap.ui.core.Item({ key: "BusinessObjectTypeName", text: "BUS2028" });
			this._oAttachmentsControl.addHeaderField(oObjectType);
			
			var oObjectKey = new sap.ui.core.Item({ key: "LinkedSAPObjectKey", text: this._pad(this._sDocumentNo, 10) + this._sFiscalYear });
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
			this._sFiscalYear = oEvent.getParameter("arguments").fiscalYear;
			
			this._oViewModel.setProperty("/busy", true);
			this._oViewModel.setProperty("/documentNo", this._sDocumentNo);
			this._oViewModel.setProperty("/fiscalYear", this._sFiscalYear);
			
			var that = this;
			var sFilter = "PhysicalInventoryDocument eq '" + this._sDocumentNo + "' and FiscalYear eq '" + this._sFiscalYear + "'";
			this._oDocETag = new JSONModel(this._dataSources.PhysInvDoc.uri + "A_PhysInventoryDocItem?$filter=" + sFilter + "&$format=json");
			
			this._oCreateModel = new JSONModel(this._dataSources.CustomPhysInv.uri + "YY1_Warehouse_PhysInvItem?$filter=" + sFilter + "&$expand=to_SerialNumbers&$format=json");
			this.setModel(this._oCreateModel, "createModel");
			
			this._oCreateModel.attachRequestCompleted({}, function() {
				that._handleJSONModelError(oEvent);
				that._oViewModel.setProperty("/busy", false);
			});
			
			this._resetAttachmentControl();
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
			
			for (var i = 0; i < aItems.length; i++) {
				if (!aItems[i].TempCountQty) {
					this._oViewModel.setProperty("/enableSave", false);
					return;
				}
			}
			this._oViewModel.setProperty("/enableSave", true);
		},
		
		_findDocItemETag: function(oItem) {
			var that = this;
			var aItems = this._oDocETag.getData().d.results;
			var oData = aItems.find(function(obj) {
				return that._pad(obj.PhysicalInventoryDocumentItem, 3) === oItem.PhysicalInventoryDocumentItem;
			});
			return oData.__metadata ? oData.__metadata.etag : "";
		},
		
		_showSuccessMessage: function() {
			var msg = this.getResourceBundle().getText("stocktakeSuccessMsg", [this._sDocumentNo]);
			MessageToast.show( msg, { closeOnBrowserNavigation: false });
		},
		
		_updateListModel: function() {
			this.getModel("customPhysInvSrv").refresh(true /*force update*/, false /*remove data*/);
			this.getModel("customPhysInvSrv").resetChanges();
		},
		
		_navToListView: function() {
			this.getRouter().navTo("stocktakeList", {}, true);
		}
		
	});

});