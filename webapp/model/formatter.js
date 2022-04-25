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
			return this.addCommas(sValue);
		},
		
		/**
		 * Format date output for text fields
		 * @param {String} sValue value to be formatted
		 * @return {String} formatted date value
		 */
		dateOutput: function (sValue) {
			var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd/MM/yyyy" });
			var sDateAsString = oDateFormat.format(new Date(sValue));
			return sDateAsString;
		},
		
		/**
		 * Remove the leading zeros in a number.
		 * @param {number} num The number to format 
		 * @returns {string} unpadded number
		 */
		removeLeadingZeroes: function(num) {
			var s = "";
			if (num) {
				s = num.replace(/^0+/, "");
			} 
			return s;
		},
		
		openQuantity: function (orderQty, grQty) {
			var openQty = grQty ? orderQty - grQty : orderQty;
			return this.addCommas(openQty);
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
		
		materialDesc: function(sValue) {
			if (sValue) {
				var requestUrl = this._dataSources.Product.uri + "A_ProductDescription(Product='" + sValue + "',Language='EN')?$format=json";
				var oMatlDescModel = new sap.ui.model.json.JSONModel(requestUrl);
				oMatlDescModel.attachRequestCompleted({}, function() {
					return oMatlDescModel.getProperty("/d/ProductDescription");
				});
			} else {
				return "";
			}
		},
		
		serialNoBadge: function(aSerialNumbers) {
			return aSerialNumbers ? aSerialNumbers.results.length : "";
		},
		
		stockTypeValueState: function(stockType) {
			return stockType === " " ? "None" : "Warning";
		},
		
		goodsReceiptItemNo: function(purOrdItem, prdOrdItem) {
			var itemNo = purOrdItem ? purOrdItem : prdOrdItem;
			return this.formatter.removeLeadingZeroes(itemNo);
		},
		
		resvKeysDisplay: function(oData) {
			if (oData && oData.Reservation && oData.ReservationItem) {
				return this.formatter.removeLeadingZeroes(oData.Reservation) + " / " + this.formatter.removeLeadingZeroes(oData.ReservationItem);	
			} else {
				return "";
			}
		},
		
		resvAccAssignObject: function(oData) {
			if (oData.ManufacturingOrder) {
				return oData.ManufacturingOrder;
			} else if (oData.CostCenter) {
				return oData.CostCenter;
			} else if (oData.WBSElement) {
				return oData.WBSElement;
			} else {
				return "";
			}
		},
		
		resvAccAssignDesc: function(oData) {
			if (oData.ManufacturingOrder) {
				return oData.OrderDescription;
			} else if (oData.CostCenter) {
				return oData.CostCenterDescription;
			} else if (oData.WBSElement) {
				return oData.WBSDescription;
			} else {
				return "";
			}
		},
		
		resvStockValue: function(stockOhHand, orderQty, withdrawnQty, debitCredit) {
			var oDisplay = this.formatter.resvStockDisplay(stockOhHand, orderQty, withdrawnQty, debitCredit);
			return oDisplay.Icon + "  " + oDisplay.StockOnHand;
		},
		
		resvStockStatus: function(stockOhHand, orderQty, withdrawnQty, debitCredit) {
			var oDisplay = this.formatter.resvStockDisplay(stockOhHand, orderQty, withdrawnQty, debitCredit);
			return oDisplay.Status;
		},
		
		resvStockDisplay: function(stockOhHand, orderQty, withdrawnQty, debitCredit) {
			var oData = {
				StockOnHand: stockOhHand ? stockOhHand : 0,
				Status: "",
				Icon: ""
			};
			var pickQty = withdrawnQty ? orderQty - withdrawnQty : orderQty;
			
			if ( debitCredit === "S" ) {
				oData.Status = "None";
				oData.Icon   = "↻";
			} else if ( Number(oData.StockOnHand) >= Number(pickQty) && Number(pickQty) > 0 ) {
				oData.Status = "Success";
				oData.Icon   = "✓";
			} else if ( Number(oData.StockOnHand) < Number(pickQty) && Number(oData.StockOnHand) > 0 ) {
				oData.Status = "Warning";
				oData.Icon   = "<";
			} else if ( Number(oData.StockOnHand) === 0 ) {
				oData.Status = "Error";
				oData.Icon   = "✕";
			}
			
			return oData;
		}
	};

});