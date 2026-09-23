/*global QUnit*/
import Controller from "posmanagement/controller/PosList.controller";

QUnit.module("PosList Controller");

QUnit.test("I should test the PosList controller", function (assert: Assert) {
	const oAppController = new Controller("PosList");
	oAppController.onInit();
	assert.ok(oAppController);
});