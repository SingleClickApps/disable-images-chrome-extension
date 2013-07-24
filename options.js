

document.addEventListener("webkitvisibilitychange", showRules, false);

function save() {
	var prefs = JSON.parse(window.localStorage.img_on_off_prefs);
	prefs.showContextMenu = document.getElementById("contextMenu").checked;
	prefs.autoRefresh = document.getElementById("autoRefresh").checked;
	window.localStorage.img_on_off_prefs = JSON.stringify(prefs);
	
	chrome.extension.getBackgroundPage().init();
}
function showRules() {
	document.getElementById("imgTF_rules").value = chrome.extension.getBackgroundPage().getLocalStorageRules();
}

window.onload = function() {

	var prefs = JSON.parse(window.localStorage.img_on_off_prefs);

	showRules();

	document.getElementById("contextMenu").checked = prefs.showContextMenu;
	document.getElementById("autoRefresh").checked = prefs.autoRefresh;
	
	document.getElementById("contextMenu").onclick = function() { save(); };
	document.getElementById("autoRefresh").onclick = function() { save(); };
	
	document.getElementById("openImageSettings").onclick = chrome.extension.getBackgroundPage().openImgPanel();

	document.getElementById("clearImageSettings").onclick = function() {
		chrome.extension.getBackgroundPage().clearRules("contentSettings");
		chrome.extension.getBackgroundPage().openImgPanel().call();
	};

	document.getElementById("importRules").onclick = function() {
		if (document.getElementById("imgTF_rules").value !== "") {
			chrome.extension.getBackgroundPage().importRules(JSON.parse(document.getElementById("imgTF_rules").value));
			chrome.extension.getBackgroundPage().openImgPanel().call();
		}
	};

	document.getElementById("clearLocalStorageRules").onclick = function() {
		chrome.extension.getBackgroundPage().clearRules("localStorage");
		showRules();
	};

}

