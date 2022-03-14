sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/UIComponent",
	"sap/m/library",
	"sap/m/MessageBox"
], function (Controller, UIComponent, mobileLibrary, MessageBox) {
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
		})()

	});

});