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
		}

	};

});