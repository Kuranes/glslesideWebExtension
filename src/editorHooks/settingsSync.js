import browserExt from '../extensionPolyfill.js';

const defaultSettings = {
    highlight: false,
    tmpDisableHighlight: false,
    textures: false,

    theme: 46,
    debugShaderEditor: false,
    logShaderEditor: false,

    popup_Always_Edit: true,
    popup_Disable_Webgl: false,
    popup_Record_Calls: false,
    popup_Empty_Calls: false,
    popup_No_Extension: false,
    popup_Error_Calls: false,
    popup_Draw_Monitor: false,

    button_ScreenShot_Tab: true,

    buttonsDebug: true,
    button_Clear_Settings_Debug: true,
    button_Network_Connect_Debug: true,
    button_Reload_Extension_Debug: true
};

let currentTab;
if (browserExt.tabs) {
    const query = { active: true, currentWindow: true };
    browserExt.tabs.query(query).then(function callback(tabs) {
        currentTab = tabs[0];
    });
}
function forceDebugRead(settings) {
    if (currentTab && currentTab.url && currentTab.url.indexOf('#debugRenderBugle') !== -1) {
        // console.log('force debug');
        settings.buttonsDebug = true;
        settings.doLog = false;
    }
}

function forceDebugWrite(settings) {
    if (currentTab && currentTab.url && currentTab.url.indexOf('#debugRenderBugle') !== -1) {
        //console.log('force debug');
        settings.buttonsDebug = undefined;
        settings.doLog = undefined;
    }
}
function initWithDefaultSettings() {
    const settings = {};
    // add non existing fields;
    for (const setting in defaultSettings) {
        settings[setting] = defaultSettings[setting];
    }
    forceDebugRead(settings);
    return settings;
}

function updateSettings(s) {
    // add non existing fields;
    for (const setting in defaultSettings) {
        if (s[setting] !== undefined) continue;
        s[setting] = defaultSettings[setting];
    }
    forceDebugRead(s);
}

function readSettings(c) {
    let settings = initWithDefaultSettings();

    //c(settings);
    //return;

    // use that by defaut for read
    // because async is too slow on page load
    // webgl context created before it's loaded

    // local storage / indexed DB
    settings = JSON.parse(localStorage.getItem('settings'));
    if (!settings) settings = defaultSettings;
    //console.trace('Settings read');
    updateSettings(settings);
    c(settings);

    // below is asynchronous... too slow.

    // BUT does get data from
    // All browser user logged in
    // os it's the UBER settings

    // think about some separation
    // between local for FAST needed option
    // like webgl hooks
    // and slow like settings for editor

    browserExt.storage.sync
        .get('settings')
        .then(function(set) {
            if (browserExt.runtime.lastError) {
                settings = defaultSettings;
            } else {
                let obj = set;
                if (obj && obj.settings) {
                    obj = obj.settings;

                    if (typeof obj === 'string') {
                        obj = JSON.parse(obj);
                    }
                    settings = obj;
                    updateSettings(settings);
                } else {
                    settings = defaultSettings;
                }
            }
            //console.trace('Settings read');

            forceDebugRead(settings);
            c(settings);
        })
        .catch(function() {
            forceDebugRead(defaultSettings);
            c(defaultSettings);
        });
}

function writeSettings(settings) {
    const s = typeof settings === 'string' ? settings : JSON.stringify(settings);
    console.trace('settings SAVE');
    forceDebugWrite(s);

    // local storage
    // sync store
    settings = localStorage.setItem('settings', s);
    //console.log('Settings saved');

    if (!browserExt) {
        return;
    }

    // async storage, but sync with all tabs
    browserExt.storage.sync
        .set({
            settings: s
        })
        .then(function() {
            //console.log('Settings saved');
        });
}

function listenSettings(c) {
    if (!browserExt) {
        // local storage idb
        window.addEventListener('storage', function(changes) {
            c(changes);
            console.log(changes);
        });
        return;
    }

    browserExt.storage.onChanged.addListener(function(changes, areaName) {
        c(changes);
        console.log(changes, areaName);
    });
}

export { initWithDefaultSettings, readSettings, writeSettings, listenSettings };
