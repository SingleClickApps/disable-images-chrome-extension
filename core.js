/*
 * Image On/Off Chrome Extension
 * www.singleclickapps.com 
 *
 * Distributed under GPL License. 
 * https://github.com/SingleClickApps
 */

var prefs;
var contextMenuId = null;

var chromeContentSettings = chrome.contentSettings;
/* currently (chrome 16), infobars is not implemented (only experimental...) */
var chromeInfobars = chrome.infobars;


init();

if(chromeContentSettings) {
	
	var extractHostname = new RegExp('^(?:f|ht)tp(?:s)?\://([^/]+)', 'im'),
		forbiddenOrigin = /(chrome\:\/\/)/g,
		incognito,
		url,
		setting,
		tabId,
		matchForbiddenOrigin;

	chrome.tabs.onUpdated.addListener(function(tabId, props, tab) {
		// Prevent multiple calls
		if (props.status == "loading" && tab.selected) {
			//console.info("onUpdated");
			getSettings();
		}
	});

	chrome.tabs.onHighlighted.addListener(function() {
		//console.info("onHighlighted");
		getSettings();
	});

	chrome.windows.onFocusChanged.addListener(function() {
		//console.info("onFocusChanged");
		getSettings();
	});

	chrome.windows.getCurrent(function(win) {
		chrome.tabs.query( {'windowId': win.id, 'active': true}, function(){
			//console.info("getCurrent");
			getSettings();
		});
	});

	chrome.browserAction.onClicked.addListener(changeSettings);

} else {
	chrome.browserAction.onClicked.addListener(openImgPanel.call());
}

function updateIcon(setting) {
		chrome.browserAction.setIcon({path:"icon-" + setting + ".png"});
		
		/*
		//if you like useless caption changes...
		if(setting=="allow"){chrome.browserAction.setTitle({title:"Disable Images"});}
		else if(setting=="block"){chrome.browserAction.setTitle({title:"Enable Images"});}
		else {chrome.browserAction.setTitle({title:"Images On/Off"});}
		*/
}

function getSettings() {
	chrome.tabs.getSelected(undefined, function(tab) {
		incognito = tab.incognito;
		url = tab.url;
		tabId = tab.id;
		
		//console.info("Current tab settings : "+url);
		chromeContentSettings.images.get({
			'primaryUrl': url,
			'incognito': incognito
		},
		function(details) {
			//console.info("Current tab settings : "+url);
			url ? matchForbiddenOrigin = url.match(forbiddenOrigin,'') : matchForbiddenOrigin = true;
			matchForbiddenOrigin ? updateIcon("inactive") : updateIcon(details.setting);				
		});
	});
}

function changeSettings() {
	if (!matchForbiddenOrigin) {
		chromeContentSettings.images.get({
			'primaryUrl': url,
			'incognito': incognito
		},
		function(details) {

			setting = details.setting;
			if (setting) {
				var pattern = /^file:/.test(url) ? url : url.match(extractHostname)[0]+'/*';
				
				// old method : url.replace(/\/[^\/]*?$/, '/*')
				var newSetting = (setting == 'allow' ? 'block' : 'allow');
				chromeContentSettings.images.set({
					'primaryPattern': pattern,
					'setting': newSetting,
					'scope': (incognito ? 'incognito_session_only' : 'regular')
				});
				
				updateIcon(newSetting);

/*var millisecondsPerMinute = 1000 * 60 ;
var oneMinuteAgo = (new Date()).getTime() - millisecondsPerMinute;
chrome.browsingData.remove({
  "since": oneMinuteAgo
}, {
  "appcache": false,
  "cache": true,
  "cookies": false,
  "downloads": false,
  "fileSystems": false,
  "formData": false,
  "history": false,
  "indexedDB": false,
  "localStorage": false,
  "pluginData": false,
  "passwords": false,
  "webSQL": false
});*/

				if (prefs.autoRefresh) {
					chrome.tabs.reload(tabId,{"bypassCache":true});
				}

				setLocalStorageRule(pattern, newSetting);

				//console.info("images is now "+newSetting+"ed on "+pattern);
			}
			else {
				//console.error("error, the setting is "+setting);
			}
		});
	}
	else {
		
		if(chromeInfobars) {
			chromeInfobars.show({"tabId": tabId, "path": "infobar.html"});
		}
		else {
			//console.error("You can't disable images on "+url);
		}
		
	}
}


function getLocalStorageRules() {
	return window.localStorage.imgTF_rules;
}

function setLocalStorageRule(pattern, newSetting) {

	if (!incognito) {

		var keyExist = false;

		if (rules.length) {
			for(i = 0; i < rules.length; i++) {
				if(pattern == rules[i].primaryPattern) {
					rules[i].setting = newSetting;
					keyExist = true;
					break;
				}
			}
		}

		if (!keyExist) {
			rules.push({
				'primaryPattern': pattern,
				'setting': newSetting,
				'scope': (incognito ? 'incognito_session_only' : 'regular')
			});
		}

		window.localStorage.setItem('imgTF_rules',JSON.stringify(rules));

	}

}

function importRules(localStorageRules) {

	var rules = localStorageRules;

	if (rules.length) {
		for(i = 0; i < rules.length; i++) {

			chrome.contentSettings.images.set({
				'primaryPattern': rules[i].primaryPattern,
				'setting': rules[i].setting,
				'scope': rules[i].scope
			});
		}
	}

	window.localStorage.setItem('imgTF_rules',JSON.stringify(rules));

}

function clearRules(arg) {
	
	if (arg == "contentSettings" || arg === undefined) {
		chromeContentSettings.images.clear({'scope': (incognito ? 'incognito_session_only' : 'regular')});
	}
	if (arg == "localStorage" || arg === undefined) {
		rules = [];
		window.localStorage.setItem('imgTF_rules',[]);
	}
}

function getLocalStoragePrefs() {
	
	// img_on_off_prefs
	if (!window.localStorage.img_on_off_prefs) {
		window.localStorage.img_on_off_prefs = JSON.stringify({ "showContextMenu": false, "autoRefresh": true });
	}
	prefs = JSON.parse(window.localStorage.img_on_off_prefs);

	// imgTF_rules
	if (!window.localStorage.imgTF_rules) {
		clearRules("localStorage");
	} else {
		rules = JSON.parse(window.localStorage.imgTF_rules);
	}

	// imgTF_version
	var currentVersion = getVersion();
	var previousVersion = window.localStorage.imgTF_version;
	if (currentVersion != previousVersion) {
		if (typeof previousVersion == 'undefined') {
			onInstall();
		} else {
			onUpdate();
		}
		window.localStorage.imgTF_version = currentVersion;
	}

}

// Check if the version has changed.
function onInstall() {
	if (rules.length) {	importRules(rules);	}
//  console.log("Extension Installed");
	if (navigator.onLine) {
		chrome.tabs.create({url: 'http://singleclickapps.com/images-on-off/instructions.html'});
	}
}
function onUpdate() {
	if (rules.length) {	importRules(rules);	}
//  console.log("Extension Updated");
	if (navigator.onLine) {
		chrome.tabs.create({url: 'http://singleclickapps.com/images-on-off/whatsnew.html'});
	}
}
function getVersion() {
	var details = chrome.app.getDetails();
	return details.version;
}

function toggleContextMenu() {

	if (prefs.showContextMenu && !contextMenuId) {
		
		contextMenuId = chrome.contextMenus.create({
			"title" : "Settings -> Image exceptions",
			"type" : "normal",
			"contexts" : ["all"],
			"onclick" : openImgPanel()
		});
		
	}

	if (!prefs.showContextMenu && contextMenuId) {
		
		chrome.contextMenus.remove(contextMenuId);
		contextMenuId = null;
		
	}

}

function openImgPanel() {
	return function(info, tab) {
		chrome.tabs.create({"url":"chrome://settings/content/images", "selected":true});
	};
}

function init() {
	
	getLocalStoragePrefs();
	toggleContextMenu();
	
}

