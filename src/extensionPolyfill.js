let browserExt;

//  polyfilling the webext standard
// Edge "extension bridge" https://docs.microsoft.com/en-us/microsoft-edge/extensions/guides/porting-chrome-extensions
// Mozilla "webextension polyfill promise based" https://github.com/mozilla/webextension-polyfill
// Nice, but no.
// (huge, not "working here", things)
// so it's hackish way for now

function initBrowserExt() {
    // @ts-ignore
    if (!window.browser) {
        // @ts-ignore
        browserExt = window.msBrowser || window.browser || window.chrome || browser;
        // @ts-ignore
        window.browser = browserExt;
    } else {
        // @ts-ignore
        browserExt = window.browser;
    }

    if (!browserExt || !browserExt.storage) {
        browserExt = undefined;
        return;
    }

    if (!browserExt.storage.sync) {
        browserExt.storage.sync = browserExt.storage.local;
    }

    // @ts-ignore
    const chromeExt = window.chrome;
    if (chromeExt) {
        /*
        for (var i in chrome) {
            browserExt[i] = chrome[i];
        }*/

        const promisifyChromeAPIOneArg = function(data, fn, context) {
            // @ts-ignore
            return new Promise(function(resolve, reject) {
                fn.apply(context, [
                    data,
                    function(res) {
                        if (chromeExt.runtime.lastError) {
                            return reject(chromeExt.runtime.lastError);
                        }
                        return resolve(res);
                    }
                ]);
            });
        };

        const getNative = chromeExt.storage.sync.get;
        chromeExt.storage.sync.get = function(data) {
            return promisifyChromeAPIOneArg(data, getNative, chromeExt.storage.sync);
        };

        const setNative = chromeExt.storage.sync.set;
        chromeExt.storage.sync.set = function(data) {
            return promisifyChromeAPIOneArg(data, setNative, chromeExt.storage.sync);
        };

        if (chromeExt.tabs) {
            const queryNative = chromeExt.tabs.query;
            chromeExt.tabs.query = function(tab) {
                return promisifyChromeAPIOneArg(tab, queryNative, chromeExt.tabs);
            };
        }

        const promisifyChromeAPITwoArg = function(winID, optionsP, fn, context) {
            // @ts-ignore
            return new Promise(function(resolve, reject) {
                fn.apply(context, [
                    winID,
                    optionsP,
                    function(res) {
                        if (chromeExt.runtime.lastError) {
                            return reject(chromeExt.runtime.lastError);
                        }
                        return resolve(res);
                    }
                ]);
            });
        };
        if (chromeExt.tabs) {
            const captureVisibleTab = chromeExt.tabs.captureVisibleTab;
            chromeExt.tabs.captureVisibleTab = function(winID, optionsP) {
                return promisifyChromeAPITwoArg(
                    winID,
                    optionsP,
                    captureVisibleTab,
                    chromeExt.tabs.captureVisibleTab
                );
            };
        }
    }

    // expect more additions "life always find a way".
}

try {
    initBrowserExt();
} catch (e) {
    console.warn('webext polyfill fail, please investigate', e);
}

export default browserExt;
