import browserExt from './extensionPolyfill.js';
import { readSettings, writeSettings } from './editorHooks/settingsSync.js';

const browserExtVar = browserExt;
const doBackgroundLog = true;
let globalContextNum = 0;
////////////////////////
// messaging: peers
////////////////////////

// info per tabs
const connections = {};
// get tab where iframe lies
const iframesTab = {};

// store console.logs ?
const bgLog = function() {
    if (!doBackgroundLog) return;
    if (console && console.log) {
        console.log.apply(console, arguments);
    }
};
// onupdated: tabid
// from injected: sender.tab.id
// from extension:

function getConnection(tabId) {
    let connection = connections[tabId];
    if (connection) return connection;
    connection = {
        tabInfoInjected: undefined,
        portDevTools: undefined,
        iframes: {},
        // historyFromPage: [],
        // historyFromDevTool: [],
        numContext: 0
    };
    connections[tabId] = connection;
    return connection;
}

const updateAllBadges = function() {
    browserExt.windows.getAll({ populate: true, windowTypes: ['normal'] }, function(windows) {
        const total = '/' + globalContextNum.toString();
        //var countContexts = 0;
        const numWindows = windows.length;
        for (let i = 0; i < numWindows; i++) {
            const win = windows[i];
            const numTabs = win.tabs.length;
            for (let j = 0; j < numTabs; j++) {
                const tab = win.tabs[j];

                const connection = getConnection(tab.id);
                if (connection) {
                    const badgeText = connection.numContext.toString() + total;
                    browserExtVar.browserAction.setBadgeText({
                        tabId: tab.id,
                        text: badgeText
                    });
                    // countContexts += connection.numContext;
                }
            }
        }
    });
};
////////////////////////////////
// TABS info
////////////////////////////
browserExt.tabs.onUpdated.addListener(function(tabId, changeinfo, tab) {
    if (!tab) return;
    if (tab.url) {
        // don't do anything here
        if (tab.url.startsWith('chrome')) return;
        if (tab.url.indexOf('youtube') !== -1) return;
    }
    if (!changeinfo.status) {
        // favicon changes, etc
        return;
    }

    console.log('onUpdated: ' + tabId, changeinfo, tab);
    const connection = getConnection(tabId);
    const newUrl = changeinfo.url ? changeinfo.url : tab.url;
    //const firstLoad = connection.url === undefined;
    switch (changeinfo.status) {
        case 'loading':
            if (connection.url !== changeinfo.url) {
                // if tab existed before, must reset webGL counts
                //iframes...
                let webglContextNum = connection.numContext;
                for (const iframe in connection.iframes) {
                    webglContextNum += connection.iframes[iframe].numContext;
                    delete connection.iframes[iframe];
                }
                globalContextNum -= webglContextNum;
                updateAllBadges();
                console.log(connection.url + ' => ' + newUrl);
                connection.url = newUrl;
            }
            // reset history
            //console.log('history reseted');
            //connection.historyFromPage = [];
            connection.numContext = 0;
            // if you reload page with devtools
            // already open we can go faster
            // send to devtools
            const portDevTools = connection.portDevTools;
            if (!portDevTools) return;

            // client                 background               devtools
            //                          init             =>
            //                     <=                          inject
            // initAfterInjection                        =>
            //                     <=                          sendHistory
            // "send all history"                        =>
            //       ...                                        ..
            /*
            portDevTools.postMessage({
                action: 'init',
                url: newUrl, //message.url,
                tabId: tabId,
                from: 'background'
            });*/

            if (connection && connection.tabInfoInjected && connection.tabInfoInjected.url) {
                console.log(connection.tabInfoInjected.url);
                console.log(newUrl);
                connection.tabInfoInjected.url = newUrl;
            }

            portDevTools.postMessage({
                action: 'reload',
                url: newUrl,
                tabId: tabId,
                from: 'background'
            });

            break;
        case 'unload':
            portDevTools.postMessage({
                action: 'unload',
                url: newUrl,
                tabId: tabId,
                from: 'background'
            });
            delete connection.portDevTools;
            break;
    }

    return true;
});

browserExt.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    console.log('onremoved: ' + tabId, removeInfo);
    const connection = connections[tabId];
    if (!connection) return;
    const webglContextNum = connection.numContext;
    globalContextNum -= webglContextNum;
    updateAllBadges();
    delete connections[tabId];
    return true;
});
// listen for requests
if (browserExt.extension.onRequest) {
    browserExt.extension.onRequest.addListener(function(message /*,sender sendResponse*/) {
        console.log('request', message);
        if (message.loaded === false) {
            console.log('extension on request LOADED');
        }
        return true;
    });
}
///////////////////////////////////
// Content_script to  Background
//////////////////////////////////
// flow from the injected script,
// to the content script,
// to the background script,[here]
// and finally to the DevTools page.
browserExt.runtime.onMessage.addListener(function(message, tabInfoInjected /*, sendResponse*/) {
    if (message.source !== 'RenderBugle') return;
    console.log('incoming message from injected script', message);
    // Messages from content scripts should have port.tab set
    if (tabInfoInjected.tab) {
        const tabId = tabInfoInjected.tab.id;

        let connection = connections[tabId];
        if (!connection) {
            // readSettings
            // first time connection: send settings to client asap
            readSettings(function(settings) {
                sendToContent(settings, tabId, function() {
                    console.log('sent settings');
                });
            });
            // create connection info
            connection = getConnection(tabId);
        }

        if (message.action === 'webglContextAdd' && !message.historyResent) {
            // if it's a frame, add to frame not to main (main is frameId === 0).
            if (tabInfoInjected.frameId) {
                const iframe = connection.iframes[tabInfoInjected.frameId];
                iframe.numContext++;
                message.iframe = true;
                //tabInfoInjected.url !==  tabInfoInjected.tab.url
            } else {
                if (connection.numContext === 0) {
                    browserExt.browserAction.enable(tabId);
                    browserExt.browserAction.setPopup({ tabId: tabId, popup: 'popup.html' });
                    connection.numContext++;
                }
            }
            //////
            globalContextNum++;
            updateAllBadges();
            console.log('webglContext ' + tabId + ' num: ' + message.id);
        }
        // sign with url to make sure it's targeted accordingly
        // (iframe inside tab)
        if (!message.url) message.url = tabInfoInjected.url;

        if (!connection.tabInfoInjected) {
            // don't overwrite, you could end with iframe tabInfoInjected
            connection.tabInfoInjected = tabInfoInjected;
        }
        const portDevTools = connection.portDevTools;
        if (portDevTools) {
            const tabSenderId = portDevTools.sender.frameId;
            console.log(
                'incoming message from injected script sent to devtools ' + tabSenderId,
                connection,
                connections,
                message
            );
            if (!message.from) message.from = 'injected';
            portDevTools.postMessage(message);
        }
        // store until we get a devtools (re-)opened
        //connection.historyFromPage.push(message);
        // send to popup ?
        //console.log("Tab not found in connection list.");
    } else {
        console.log('tabInfoInjected.tab not defined.');
    }
    return true;
});
/////////////////////////////////
// send to content script directly
//////////////////////////////////
function sendToContent(msg, tabId, callback) {
    const data = JSON.stringify(msg);
    browserExt.tabs.query({ active: true }, function() {
        browserExt.tabs.sendMessage(tabId, data, callback);
    });
}

///////////////////////////
// devtools to background
//////////////////////////
browserExt.runtime.onConnect.addListener(function(portDevTools) {
    {
        try {
            console.log('onConnect ', portDevTools);
            console.log('onConnect sender', portDevTools.sender);
            console.log('onConnect tab', portDevTools.sender.tab);
        } catch (e) {}
    }
    if (portDevTools && portDevTools.sender && portDevTools.sender.url) {
        //chrome-extension://ifkpcaekgcomhgafmpljifnalacpcapm/devtools.html
        console.log('extension url: ' + portDevTools.sender.url);
    }

    // Listen to messages sent from the DevTools page
    const listener = function(message, sender, sendResponse) {
        console.assert(sender === portDevTools); // in scope

        console.log(
            'incoming message from dev tools page',
            message,
            sender,
            sendResponse,
            connections
        );

        // Register initial port
        if (message.name === 'initDevTools') {
            // tabId IS THE CONNECTION INFO WE NEED
            // TO know how to post to devtools
            // from the content_window
            const tabId = message.tabId;
            if (!tabId) {
                if (
                    sender &&
                    sender.sender &&
                    sender.sender.url &&
                    sender.sender.url.startsWith('chrome')
                ) {
                    // chrome ext
                    console.log(' From extension: ', message);

                    return;
                }
                console.log(' From Mobile: ', message);

                //WEBRTc
                //joinString
                return;
            }

            // only if webgl ?
            // only devtool opened...
            // done once per devtool init ?
            console.log('initDevTools', tabId);
            const connection = getConnection(tabId);

            let url;
            if (connection && connection.tabInfoInjected && connection.tabInfoInjected.url) {
                url = connection.tabInfoInjected.url;
                console.log('unload/reload:' + url);
            }

            /*
            updateAllBadges();
            */

            // don't uncomment that it would break sending back msg
            //if (!connection.portDevTools) {
            //console.log('incoming message from devtools script resent to devtools ' + tabSenderId, connection, connections);
            connection.portDevTools = portDevTools;
            //}

            //var tabSenderId = portDevTools.sender.frameId;
            //console.log('incoming message from devtools script resent to devtools ' + tabSenderId, connection, connections);

            // send to devtools
            // which call browserExt.devtools.inspectedWindow.eval(str);
            /*
            portDevTools.postMessage({
                action: 'inject',
                url: message.url,
                tabId: tabId
            });
*/
            portDevTools.postMessage({
                action: 'reload',
                url: undefined, //message.url,
                tabId: tabId
            });

            readSettings(function(settings) {
                portDevTools.postMessage({
                    action: 'settings',
                    settings: settings
                });
                portDevTools.postMessage({
                    action: 'firstload'
                });
            });

            return true;
        }

        if (message.name === 'readSettings') {
            console.log('read settings');

            readSettings(function(settings) {
                portDevTools.postMessage({
                    action: 'settings',
                    settings: settings
                });
            });
            return true;
        }

        if (message.name === 'saveSettings') {
            console.log('save settings');
            writeSettings(message.settings);
            return true;
        }

        return true;
    };

    portDevTools.onMessage.addListener(listener);

    portDevTools.onDisconnect.addListener(function() {
        portDevTools.onMessage.removeListener(listener);

        const connectionsList = Object.keys(connections);
        for (let i = 0, len = connectionsList.length; i < len; i++) {
            if (connections[connectionsList[i]].portDevTools === portDevTools) {
                delete connections[connectionsList[i]].portDevTools;
                break;
            }
        }
    });
});

/////////////////////
// all pages navigations
/////////////////////
browserExt.webNavigation.onCommitted.addListener(function(data) {
    if (!data) return;
    if (data.url) {
        if (data.url.startsWith('chrome')) return;
        if (data.url.indexOf('youtube') !== -1) return;
    }

    //
    console.log(
        'onCommitted: ' + data.url + '. Frame: ' + data.frameId + '. Tab: ' + data.tabId,
        data
    );
    const connection = getConnection(data.tabId);

    if (data.transitionType === 'auto_subframe') {
        console.log('new Iframe on frame: ' + data.frameId + ' tab: ' + data.tabId);
        const existingIframe = connection.iframes[data.frameId];
        if (existingIframe) {
            const webglContextNum = existingIframe.numContext;
            globalContextNum -= webglContextNum;
            // now we can reset
            existingIframe.numContext = 0;
            updateAllBadges();
        }
        connection.iframes[data.frameId] = {
            frameId: data.frameId,
            tabId: data.tabId,
            url: data.url,
            numContext: 0
        };
        iframesTab[data.frameId] = data.tabId;
    } else {
        // only if webgl ?
        browserExtVar.browserAction.setPopup({ tabId: data.tabId, popup: 'popup.html' });
        //browserExt.browserAction.disable(data.tabId);

        // need seperate count by iframes and mainframe
        // (allow iframe reload count)
        let webglContextNum = connection.numContext;
        for (const iframe in connection.iframes) {
            webglContextNum += connection.iframes[iframe].numContext;
            delete connection.iframes[iframe];
        }
        globalContextNum -= webglContextNum;
        // now we can reset
        connection.numContext = 0;
        updateAllBadges();
    }

    return true;
});
