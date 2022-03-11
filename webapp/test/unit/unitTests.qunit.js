/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"dyflex/mm/s4cloud/warehouse/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});