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
		/* Description Models                                          */
		/* =========================================================== */
		
		_setMatlDescModel: function() {
			if (this._sMaterial) {
				 var requestUrl = this._dataSources.Product.uri + "A_ProductDescription(Product='" + this._sMaterial + "',Language='EN')?$format=json";
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
		
		_setPlantDescModel: function() {
			var that = this;
			if (!sap.ui.getCore().getModel("plantGlobal")) {
				var oModel = new JSONModel(this._dataSources.CustomPlant.uri + "YY1_Warehouse_Plant?$format=json");
				sap.ui.getCore().setModel(oModel, "plantGlobal");
				oModel.attachRequestCompleted({}, function(oEvent) {
					that._setPlantDescModelValue();
				});
			} else {
				this._setPlantDescModelValue();
			}
		},
		
		_setPlantDescModelValue: function() {
			var that = this;
			var aData = sap.ui.getCore().getModel("plantGlobal").getData().d.results;
			var oData = aData.find(function(obj) {
				return obj.Plant === that._sPlant;
			});
			this.setModel(new JSONModel(oData), "plantDesc");	
		},
		
		_setSLocDescModel: function() {
			var that = this;
			if (!sap.ui.getCore().getModel("slocGlobal")) {
				var oModel = new JSONModel(this._dataSources.CustomSLoc.uri + "YY1_Warehouse_StoreLoc?$format=json");
				sap.ui.getCore().setModel(oModel, "slocGlobal");
				oModel.attachRequestCompleted({}, function(oEvent) {
					that._setSLocDescModelValue();
				});
			} else {
				this._setSLocDescModelValue();
			}
		},
		
		_setSLocDescModelValue: function() {
			var that = this;
			var aData = sap.ui.getCore().getModel("slocGlobal").getData().d.results;
			var oData = aData.find(function(obj) {
				return obj.Plant === that._sPlant && obj.StorageLocation === that._sStoreLoc;
			});
			this.setModel(new JSONModel(oData), "slocDesc");
		}

	});

});