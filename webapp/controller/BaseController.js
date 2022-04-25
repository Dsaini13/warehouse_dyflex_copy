sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/UIComponent",
	"sap/m/library",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/m/MessageToast"
], function (Controller, UIComponent, mobileLibrary, JSONModel, MessageBox, MessageToast) {
	"use strict";

	// shortcut for sap.m.URLHelper
	var URLHelper = mobileLibrary.URLHelper;

	return Controller.extend("dyflex.mm.s4cloud.warehouse.controller.BaseController", {
		/**
		 * Convenience method for accessing the router.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter : function () {
			return UIComponent.getRouterFor(this);
		},

		/**
		 * Convenience method for getting the view model by name.
		 * @public
		 * @param {string} [sName] the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel : function (sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel : function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Getter for the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle : function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onShareEmailPress : function () {
			var oViewModel = (this.getModel("detailView") || this.getModel("listView"));
			URLHelper.triggerEmail(
				null,
				oViewModel.getProperty("/shareSendEmailSubject"),
				oViewModel.getProperty("/shareSendEmailMessage")
			);
		},
		
		_handleJSONModelError: function(oEvent) {
			var sDetails = oEvent.getParameters().errorobject;
			if (sDetails) {
				
				// Add friendly error messages
				var e = null, xml = null, sErrorString = "", sErrorMessage = "";
				try {
					e = JSON.parse(sDetails.responseText);
				} catch (ex) {
					jQuery.sap.log.info(ex.message);
					// OPA tests will send 'serverError' when mocking a server-side response error!
					if (sDetails.responseText !== "serverError") {
						xml = jQuery.parseXML(sDetails.responseText);
						sErrorString = xml.getElementsByTagName("message")[0].childNodes[0].data;
					}
				}
			
				if (sErrorString) {
					sErrorMessage = "An error occured:\n\n" + sErrorString;
					MessageBox.error(sErrorMessage);
				} else if (e && e.error.message.value) {
					sErrorMessage = this.getResourceBundle().getText("errorBAPITitle") + "\n\n" + e.error.message.value;
					MessageBox.error(sErrorMessage);
				} else {
					MessageBox.error(this._sErrorText);
				}
			
			}
		},
		
		_checkIfBatchRequestSucceeded: function(oEvent) {
			var oParams = oEvent.getParameters();
			var aRequests = oEvent.getParameters().requests;
			var oRequest;
			if (oParams.success) {
				if (aRequests) {
					for (var i = 0; i < aRequests.length; i++) {
						oRequest = oEvent.getParameters().requests[i];
						if (!oRequest.success) {
							return false;
						}
					}
				}
				return true;
			} else {
				return false;
			}
		},
		
		onPressMenu: function() {
			this.getRouter().navTo("mainList", {}, true);
		},
		
		/**
		 * Get the date object from DateTimePicker needed for 
		 * Edm.DateTime OData property
		 * 
		 * @returns {object} date format 
		 */
		_getDateObject: function (oDateTime) {
			var oFormatDate = sap.ui.core.format.DateFormat.getDateTimeInstance({
				pattern: "yyyy-MM-ddTKK:mm:ss"
			});
			
			if (oDateTime.getDateValue() === null || oDateTime.getDateValue() === "") {
				return null;
			}
			
			var oDate = oFormatDate.format(oDateTime.getDateValue());
			oDate = oDate.split("T");
			var oDateActual = oDate[0];
			return new Date(oDateActual);
		},
		
		/**
		 * Pad a number with leading zeros.
		 * @param {number} num The number to format 
		 * @param {number} size The size required to pad to
		 * @returns {string} zero-padded number
		 */
		_pad: function(num, size) {
			var s = num + "";
			while (s.length < size) {
				s = "0" + s;
			}
			return s;
		},
		
		/**
		 * Add commas to a number for thousands separators
		 */
		addCommas: function(nStr) {
			// Remove commas
			nStr = nStr.toString().replace(/,/gi, "");
			nStr = parseFloat(nStr);
			// Add commas
			nStr += "";
			var x = nStr.split(".");
			var x1 = x[0];
			var x2 = x.length > 1 ? "." + x[1] : "";
			var rgx = /(\d+)(\d{3})/;
			while (rgx.test(x1)) {
				x1 = x1.replace(rgx, "$1" + "," + "$2");
			}
			return x1 + x2;
		},
		
		/**
		* Adds a history entry in the FLP page history
		* @public
		* @param {object} oEntry An entry object to add to the hierachy array as expected from the ShellUIService.setHierarchy method
		* @param {boolean} bReset If true resets the history before the new entry is added
		*/
		addHistoryEntry: (function() {
			var aHistoryEntries = [];

			return function(oEntry, bReset) {
				if (bReset) {
					aHistoryEntries = [];
				}

				var bInHistory = aHistoryEntries.some(function(oHistoryEntry) {
					return oHistoryEntry.intent === oEntry.intent;
				});

				if (!bInHistory) {
					aHistoryEntries.push(oEntry);
					this.getOwnerComponent().getService("ShellUIService").then(function(oService) {
						oService.setHierarchy(aHistoryEntries);
					});
				}
			};
		})(),
		
		/* =========================================================== */
		/* Barcode Scanner Handler                                     */
		/* =========================================================== */
		
		onScanSuccess: function(oEvent) {
			var oSearchField = oEvent.getSource().getParent().getControlsByFieldGroupId("idSearchFieldGrp")[0];
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
		/* Cross App Navigations                                       */
		/* =========================================================== */
		
		onMaterialLinkPress: function(materialNo) {
			this._navigateExternalApp("Material", "manage", { Product: materialNo });
		},
		
		onPurchaseOrderLinkPress: function(purOrderNo) {
			this._navigateExternalApp("PurchaseOrder", "displayFactSheet", { PurchaseOrder: purOrderNo });
		},
		
		onProdOrderLinkPress: function(prodOrderNo) {
			this._navigateExternalApp("ProductionOrder", "displayFactSheet", { ProductionOrder: prodOrderNo });
		},
		
		onPhysInvDocLinkPress: function(documentNo, fiscalYear) {
			this._navigateExternalApp("PhysicalInventoryDocument", "displayFactSheet", { PhysicalInventoryDocument: documentNo, FiscalYear: fiscalYear });
		},
		
		_navigateExternalApp: function(semanticObject, action, oParams) {
			var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
			oCrossAppNavigator.toExternal({
				target: {
					semanticObject: semanticObject,
					action: action
				},
				params: oParams
			});
		},
		
		/* =========================================================== */
		/* Serial No Dialog                                            */
		/* =========================================================== */
		
		onSerialNoShow: function(oEvent) {
			this._oItemPath = oEvent.getSource().getParent().getParent().getBindingContextPath();
			var itemData = jQuery.extend(true, {}, this._oCreateModel.getProperty(this._oItemPath));
			
			this._oItemModel = new JSONModel(itemData);
			this.setModel(this._oItemModel, "itemModel");
			
			if (!this._serialNoDialog) {
				this._serialNoDialog = sap.ui.xmlfragment("dyflex.mm.s4cloud.warehouse.view.SerialNoDialog",this);
				this.getView().addDependent(this._serialNoDialog);
				jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._serialNoDialog);
			}
			this._serialNoDialog.open();
		},
		
		onSerialNoApply: function() {
			var itemData = this._oItemModel.getData();
			this._oCreateModel.setProperty(this._oItemPath, itemData);
			this._serialNoDialog.close();
		},
		
		onSerialNoCancel: function() {
			this._serialNoDialog.close();
		},
		
		onSerialNoScan: function(oEvent) {
			if (!oEvent.getParameters().refreshButtonPressed) {
				var sQuery = oEvent.getParameter("query");
				if (sQuery && sQuery.length > 0) {
					
					var itemData = this._oItemModel.getData();
					if (!itemData.to_SerialNumbers) {
						itemData.to_SerialNumbers = { "results" : [] };
					}
					
					itemData.to_SerialNumbers.results.push({
						"SerialNumber": sQuery
					});
					this._oItemModel.setData(itemData);
					oEvent.getSource().setValue("");
				}
			}
		},
		
		onSerialNoDelete: function(oEvent) {
			var path = oEvent.getSource().getParent().getBindingContextPath();
			var index = path.match(/\d+/);
			if (index) {
				var itemData = this._oItemModel.getData();
				itemData.to_SerialNumbers.results.splice(index[0], 1);
				this._oItemModel.setData(itemData);
			}
		},
		
		onSerialNoTableUpdate: function(oEvent) {
			var sTitle = "Items",
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
				
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = sTitle + " (" + iTotalItems + ")";
			}
			this._oViewModel.setProperty("/serialNoTableTitle", sTitle);
		},
		
		/* =========================================================== */
		/* Description Models                                          */
		/* =========================================================== */
		
		_setMatlDescModel: function(material) {
			if (material) {
				 var requestUrl = this._dataSources.Product.uri + "A_ProductDescription(Product='" + material + "',Language='EN')?$format=json";
			}
			var oMatlDescModel = new JSONModel(requestUrl);
			this.setModel(oMatlDescModel, "matlDescModel");
		},
		
		_setSupplierDescModel: function(supplier) {
			if (supplier) {
				 var requestUrl = this._dataSources.BusinessPartner.uri + "A_Supplier('" + supplier + "')?$format=json";
			}
			var oModel = new JSONModel(requestUrl);
			this.setModel(oModel, "supplierModel");
		},
		
		_setPlantGlobalModel: function() {
			if (!sap.ui.getCore().getModel("plantGlobal")) {
				var oModel = new JSONModel(this._dataSources.CustomPlant.uri + "YY1_Warehouse_Plant?$format=json");
				sap.ui.getCore().setModel(oModel, "plantGlobal");
			}
		},
		
		_setSLocGlobalModel: function() {
			if (!sap.ui.getCore().getModel("slocGlobal")) {
				var oModel = new JSONModel(this._dataSources.CustomSLoc.uri + "YY1_Warehouse_StoreLoc?$format=json");
				sap.ui.getCore().setModel(oModel, "slocGlobal");
			}
		}

	});

});