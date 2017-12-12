function addClientMessenger() {
    // flow from the injected script [here]
    // to the content script,
    // to the background script
    // and finally to the DevTools page.
    if (!window.doPostMessageClientShaderEditor) {
        window.doPostMessageClientShaderEditor = function(msg) {
            msg.from = 'injected';
            //console.log('Connection Injected: ' + msg.action);
            return window.postMessage(msg, '*');
        };
    }
}

export { addClientMessenger };
