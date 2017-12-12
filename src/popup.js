import browserExt from './extensionPolyfill.js';
import {
    initWithDefaultSettings,
    readSettings,
    writeSettings,
    listenSettings
} from './editorHooks/settingsSync.js';

let settingsPopup;

function addCheckBox(id, checked, callback) {
    const checkedValue = checked ? 'checked' : '';
    const template = `
    <div id="container-${id}" class="onoffWidget">
        <div class="onoffswitchText">${id}</div>
        <div  class="onoffswitch">
            <input id="${id}" type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="myonoffswitch" ${checkedValue}>
            <label class="onoffswitch-label" for="myonoffswitch">
                <span class="onoffswitch-inner"></span>
                <span class="onoffswitch-switch"></span>
            </label>
        </div>
    </div>`;

    const div = document.createElement('div');
    div.innerHTML = template;
    document.body.appendChild(div);

    const checkbox = document.getElementById(`${id}`);
    document.getElementById(`container-${id}`).addEventListener('click', function() {
        // @ts-ignore
        const value = !checkbox.checked;
        // @ts-ignore
        checkbox.checked = value;
        if (callback) {
            const settingsName = 'popup_' + checkbox.id.replace(' ', '_');
            callback(settingsName, value);
        }
    });
}

function addButton(id, callback) {
    const template = `<a class="btn" id="${id}" href="#">${id}</a>`;
    const div = document.createElement('div');
    // @ts-ignore
    div.style.float = 'right';
    div.innerHTML = template;
    document.body.appendChild(div);

    const button = document.getElementById(`${id}`);
    button.addEventListener('click', function() {
        if (callback) {
            const settingsName = 'button_' + button.id.replace(' ', '_');
            callback(settingsName);
        }
    });
}

function actionUI(event) {
    switch (event) {
        case 'button_ScreenShot_Tab':
            //https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs/captureVisibleTab
            // png / jpeg
            var capturing = browserExt.tabs.captureVisibleTab(undefined, {
                format: 'jpeg',
                quality: 95
            });

            capturing.then(function(dataURI) {
                browserExt.tabs.create({ url: dataURI });
                return;
                // below doesn't work
                /*
                var a = document.createElement('a');
                document.body.appendChild(a);
                a.style.display = 'none';
                a.href = dataURI;
                var d = new Date();
                var filename = d.getMilliseconds() + '_' + d.getSeconds() + '_' + d.getMinutes() + '_' + d.getHours() + '_' + d.getDay() + '_' + d.getMonth() + '_' + d.getFullYear() + '.jpeg';
                a.download = filename;
                var e;
                if (document.createEvent) {
                    e = document.createEvent('MouseEvents');
                    e.initMouseEvent('click', true, true, window,
                        0, 0, 0, 0, 0, false, false, false,
                        false, 0, null);

                    a.dispatchEvent(e);
                } else if (a.fireEvent) {
                    a.fireEvent('onclick');
                } else {
                    a.click();
                }
                console.log('shots fired');
                */
            });

            //https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs/saveAsPDF
            /*
            var saving = browser.tabs.saveAsPDF(
                pageSettings   // object
            )
            */
            break;
        case 'button_Clear_Settings':
            console.log('clear');
            browserExt.storage.local.clear(function() {
                const error = browserExt.runtime.lastError;
                if (error) {
                    console.error(error);
                }
                settingsPopup = initWithDefaultSettings();
                writeSettings(settingsPopup);
                console.log('cleared');
            });

            break;
        case 'button_Network_Connect':
            console.log('network Connect ?');
            break;

        case 'button_Reload_Extension':
            console.log('button_Reload_Extension');
            browserExt.runtime.reload();
            break;
    }
}

// from settings (editor, etc.)
// Update the options UI with the settings values retrieved from storage,
// or the default settings if the stored settings are empty.
function updateUI(restoredSettings) {
    debugger;
    console.log(restoredSettings);
}

// from user
function UIUpdated(settingsName, value) {
    debugger;
    settingsPopup[settingsName] = value;
    writeSettings(settingsPopup);
    // send message or not.. that is the question
}

// from settings init
function readAllSettings(settings) {
    console.log(settings);

    settingsPopup = settings;
    for (const k in settingsPopup) {
        // only "Popup" settings
        const keyword = k.split('_');
        if (keyword.length < 3) continue;

        const label = keyword[1] + ' ' + keyword[2];
        const value = settingsPopup[k];
        if (keyword[0] === 'button') {
            if (keyword.length > 2 && keyword[3] === 'Debug' && !settingsPopup.buttonsDebug) {
                continue;
            }
            addButton(label, actionUI);
            continue;
        }

        if (keyword[0] !== 'popup') continue;
        switch (typeof value) {
            case 'boolean':
                addCheckBox(label, value, UIUpdated);
                break;
            case 'string':
                //TODO: add combobox
                break;
            case 'number':
                //TODO: add Slider
                break;
            default:
                console.log('unhandled settings type ' + typeof value);
                break;
        }
    }

    if (settings.buttons) {
        // debug record canvas ?
        // debug screenshot canvas ?
        // Debug extension
        // Reset cache ?
        // Reload extension ?
        // Connect network ?
    }
}

readSettings(readAllSettings);
listenSettings(updateUI);
