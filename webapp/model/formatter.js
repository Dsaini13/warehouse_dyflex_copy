sap.ui.define([], function () {
	"use strict";

	return {

		/**
		 * Rounds the number unit value to 2 digits
		 * @public
		 * @param {string} sValue the number string to be rounded
		 * @returns {string} sValue with 2 digits rounded
		 */
		numberUnit : function (sValue) {
			if (!sValue) {
				return "";
			}
			return parseFloat(sValue).toFixed(2);
		},
		
		/**
		 * Format date output for text fields
		 * @param {String} sValue value to be formatted
		 * @return {String} formatted date value
		 */
		dateOutput: function (sValue) {
			var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "dd.MM.yyyy"
			});
			var sDateAsString = oDateFormat.format(new Date(sValue));

			return sDateAsString;
		},
		
		openQuantity: function (orderQty, grQty) {
			return grQty ? orderQty - grQty : orderQty;
		},
		
		plantDesc: function(sValue) {
			if (sValue && sap.ui.getCore().getModel("plantGlobal")) {
				var aData = sap.ui.getCore().getModel("plantGlobal").getData().d.results;
				var oData = aData.find(function(obj) {
					return obj.Plant === sValue;
				});
				return oData.PlantName;
			} else {
				return "";
			}
		},
		
		slocDesc: function(sValue) {
			if (sValue && sap.ui.getCore().getModel("slocGlobal")) {
				var aData = sap.ui.getCore().getModel("slocGlobal").getData().d.results;
				var oData = aData.find(function(obj) {
					return obj.StorageLocation === sValue;
				});
			}
			return oData ? oData.StorageLocationName : "";
		},
		
		serialNoBadge: function(aSerialNumbers) {
			return aSerialNumbers ? aSerialNumbers.results.length : "";
		}
		
	};

});