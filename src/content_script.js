// no content script on file://
// no content script on remote devtools mobile

import browserExt from './extensionPolyfill.js';
import { readSettings } from './editorHooks/settingsSync.js';
import { addHooksString } from './clientHook';
import { addClientMessenger } from './WebGLHooks/message_ui_client.js';

// flow from the injected script,
// to the content script, [here]
// to the background script,
// and finally to the DevTools page.
const transmitToBG = function(event) {
    /*
		if (event.source !== window) {
			return;
		}
	*/
    const message = event.data;
    if (!message || typeof message !== 'object') return false;
    //if (message.source !== 'RenderBugle') return;
    browserExt.runtime.sendMessage(message);
};

window.addEventListener('message', transmitToBG);
/*
var w = window.parent;
while (w) {
	w.addEventListener('message', transmitToBG);
	if (w === w.parent) break;
	w = window.parent;
}
*/
const idScript = 'renderbugle-intermediary';
const numScripts = 0;
function insertTextScript(text) {
    const script = document.createElement('script');

    script.id = idScript + numScripts;
    script.type = 'text/javascript';
    script.text = text;
    const targets = [document.head, document.body, document.documentElement];
    let target;
    for (let n = 0, l = targets.length; n < l; n++) {
        if (!targets[n]) continue;
        target = targets[n];
        break;
    }
    if (!target) return script;
    if (target.firstElementChild) {
        target.insertBefore(script, target.firstElementChild);
        return script;
    }
    target.appendChild(script);
    // TODO: cleanup html after script exec
    target.removeChild(script);
    //document.getElementById(idScript + numScripts).parentNode.removeChild(idScript + numScripts)
    return script;
}

const forbiddenList = ['youtube'];
function isInjectablePage() {
    if (document.domain) {
        if (forbiddenList.indexOf(document.domain) !== -1) {
            return false;
        }
    }

    if (document.location) {
        if (document.location.protocol && document.location.protocol.indexOf('http') === -1) {
            return false;
        }

        if (document.location.hostname && document.location.hostname.indexOf('youtube') !== -1) {
            return false;
        }
    }
    if (!document.body) return true; //cannot say...

    if (document.body.childElementCount !== 1) return true; //looks like real doc

    const el = document.body.firstElementChild;
    if (el.tagName === 'PRE') {
        // json: breaks jsonformatter otw
        return false;
    }
    if (el.tagName === 'IMG') {
        // just image preview inside browser
        return false;
    }

    if (el.tagName === 'EMBED') {
        if (el.getAttribute('type') === 'application/pdf') {
            // not sure perhaps we'd like to debug pdf webgl ?
            return false;
        }
    }

    return true;
}

// TODO: multi steps injection
// - Hook only canvas.getContext
// - inject only if settings:alwaysInject
// - on first call to getContext webgl
//    - ask for injection from client code
//    - inject asap (have to check if it works)
//    - log the "hooked" msg
//    - save new canvas/tabid, etc
function getSettingsAndThenInjectCodeIntoPage() {
    if (!isInjectablePage()) return;

    readSettings(function(settings) {
        if (!settings.popup_Always_Edit) return;

        let strCode = '';
        strCode += '(' + addClientMessenger.toString() + ')(' + JSON.stringify(settings) + ');';
        // @ts-ignore
        if (!window.renderbugle) {
            strCode += '(' + addHooksString + ')(' + JSON.stringify(settings) + ');';
        }
        insertTextScript(strCode);
        //console.log(strCode);
    });
}
getSettingsAndThenInjectCodeIntoPage();
