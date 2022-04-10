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
		
		onChanged: function() {
			this._validateSaveEnablement();
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
			var oDocument = new JSONModel(this._dataSources.CustomPhysInv.uri + "YY1_Warehouse_PhysInvItem?$filter=" + sFilter + "&$expand=to_SerialNumbers&$format=json");
			
			oDocument.attachRequestCompleted({}, function() {
				that._handleJSONModelError(oEvent);
				that._createODataModel(oDocument.getData());
				that._oViewModel.setProperty("/busy", false);
			});
			
			this._resetAttachmentControl();
			this._validateSaveEnablement();
		},
		
		_createODataModel: function(document) {
			
				/*
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
			
			var aItems = purchOrder.d.results;
			for (var i = 0; i < aItems.length; i++) {
				if (!aItems[i].IsCompletelyDelivered && aItems[i].OrderQuantity > 0) {
					
					var openQty = aItems[i].OrderQuantity;
					if (aItems[i].to_POHist) {
						openQty = aItems[i].OrderQuantity - aItems[i].to_POHist.GoodsRcptQty;
					}
					if (openQty > 0) {
						matDocData.to_MaterialDocumentItem.results.push({
							"Material"				   : aItems[i].Material,
							"Plant"					   : aItems[i].Plant,
							"StorageLocation"		   : aItems[i].StorageLocation,
							"PurchaseOrder"			   : aItems[i].PurchaseOrder,
							"PurchaseOrderItem"		   : aItems[i].PurchaseOrderItem,
							"GoodsMovementType"		   : "101",
							"GoodsMovementRefDocType"  : "B",
							"InventoryUsabilityCode"   : aItems[i].StockType ? aItems[i].StockType : " ",
							"MaterialDocumentItemText" : aItems[i].PurchaseOrderItemText,
							"EntryUnit"				   : aItems[i].PurchaseOrderQuantityUnit,
							"QuantityInEntryUnit"	   : openQty.toString(),
							
							"TempOpenQty"			   : openQty.toString(),
							"TempEnableSerialNo"	   : aItems[i].SerialNumberProfile ? true : false,
							"TempPlantName"			   : aItems[i].PlantName,
							"TempStorageLocationName"  : aItems[i].StorageLocationName
						});		
					}
				}
			}
			*/
			this._oCreateModel = new JSONModel(document);
			this.setModel(this._oCreateModel, "createModel");
		},
		
		_navToListView: function() {
			this.getRouter().navTo("stocktakeList", {}, true);
		}
		
	});

});