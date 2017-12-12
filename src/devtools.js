import browserExt from './extensionPolyfill.js';

const browserExtOr = browserExt;

function activate() {
    const onPanelCreation = function(panel) {
        console.log('onPanelCreation', panel);

        // code invoked on panel creation
        if (panel.onSearch) {
            panel.onSearch.addListener(function(action, searchWords) {
                switch (action) {
                    case 'performSearch':
                        console.log('searching word: ' + searchWords);
                        break;
                    case 'cancelSearch':
                        console.log('cancel search ');
                        break;
                    default:
                        console.log('search', arguments);
                }
            });
        }
    };

    const promise = browserExtOr.devtools.panels.create(
        'RenderbuGLe',
        'extension/renderbugle_icon_64.png',
        'editor.html',
        onPanelCreation
    );
    if (promise) promise.then(onPanelCreation);

    console.log('initPanel');
    // Create a connection to the background page
    const backgroundPageConnection = browserExtOr.runtime.connect({
        name: 'panel'
    });

    backgroundPageConnection.postMessage({
        name: 'initDevTools',
        tabId: browserExtOr.devtools.inspectedWindow.tabId
    });
    /*
  backgroundPageConnection.onMessage.addListener(function(msg) {
    //console.log( 'devtools.js', msg );
  });
  */
}

// TODO: find how to filter on only the Real devtools page (not devtools of devtools)

// if (browserExtOr && browserExtOr.devtools && browserExtOr.devtools.inspectedWindow) {
//     console.log(browserExtOr.devtools.inspectedWindow);
// }
// if (
//     browserExtOr &&
//     browserExtOr.devtools &&
//     browserExtOr.devtools.inspectedWindow &&
//     browserExtOr.devtools.inspectedWindow.frameURL &&
//     browserExtOr.devtools.inspectedWindow.frameURL.indexOf('http') !== -1
// ) {
activate();
// }
