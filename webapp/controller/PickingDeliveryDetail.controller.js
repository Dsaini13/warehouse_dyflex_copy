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
		
		/* =========================================================== */
		/* POST Methods                                                */
		/* =========================================================== */
		
		/*
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
		*/
		
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
			//this._oDocETag = new JSONModel(this._dataSources.PhysInvDoc.uri + "A_PhysInventoryDocItem?$filter=" + sFilter + "&$format=json");
			
			this._oCreateModel = new JSONModel(this._dataSources.CustomDlvItem.uri + "YY1_Warehouse_DlvItem?$filter=" + sFilter + "&$format=json");
			this.setModel(this._oCreateModel, "createModel");
			
			this._oCreateModel.attachRequestCompleted({}, function() {
				that._handleJSONModelError(oEvent);
				that._oViewModel.setProperty("/busy", false);
			});
		},
		
		/*
		_findDocItemETag: function(oItem) {
			var that = this;
			var aItems = this._oDocETag.getData().d.results;
			var oData = aItems.find(function(obj) {
				return that._pad(obj.PhysicalInventoryDocumentItem, 3) === oItem.PhysicalInventoryDocumentItem;
			});
			return oData.__metadata ? oData.__metadata.etag : "";
		},
		*/
		
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