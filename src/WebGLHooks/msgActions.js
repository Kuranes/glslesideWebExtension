function msgActions() {
    const uuidList = {};
    const uuidFiller = new Uint8Array(1);

    class messenger {
        constructor(options) {
            this.options = options;
            this.registeredActions = [];
            this.historySinceLoad = [];
            this.registeredActions['sendHistory'] = this.sendHistory.bind(this);
        }
        setHookedContexts(hkCtxts) {
            this.hookedContexts = hkCtxts;
        }
        // pre-send message
        sendToServerEditor(msg) {
            let data = msg;
            if (!data) data = {};
            data.source = 'RenderBugle';
            data.url = window.location.href;
            // @ts-ignore
            if (window.doPostMessageClientShaderEditor) {
                // @ts-ignore
                window.doPostMessageClientShaderEditor(data);
                // only repeat message for devtools
                // not those for background
                data.historyResent = true;
            }
            // store for next editor server reload/reconnect
            this.historySinceLoad.push(data);
        }
        receiveFromServerEditor(msg) {
            //console.log(msg);
            // store received ?
            // need option "reload edition"
            if (this.registeredActions[msg.action]) {
                this.registeredActions[msg.action](msg);
            }
        }
        // send history
        sendHistory() {
            console.log('Conection Injected: sendHistory start');
            // @ts-ignore
            if (!window.doPostMessageClientShaderEditor) {
                return;
            }
            //console.log('Conection Injected: sendHistory size: ' + this.historySinceLoad.length);
            const historyFromPage = this.historySinceLoad;
            for (let i = 0, l = historyFromPage.length; i < l; i++) {
                const msg = historyFromPage[i];
                if (msg.action !== 'log') {
                    console.log('Conection Injected: sendHistory msg: ' + msg.action, msg);
                }
                // prevent looping...
                if (msg.action === 'initAfterInjection') continue;
                // @ts-ignore
                // eslint-disable-next-line no-undef
                window.doPostMessageClientShaderEditor(msg);
                if (msg.action === 'log') continue;
                //console.log('Conection Injected: sendHistory sent');
            }
            console.log('Conection Injected: sendHistory finished');
        }
        hookedLog(version, options) {
            // TODO: make it optional using settings.
            // tODO: list logs the current hooks
            console.log('renderbugle  webgl' + version + ' hooked', options);
        }
        error(msg) {
            this.logMsg('ERROR: ' + msg);
        }
        log(l) {
            // TODO: make it optional using settings.
            // or urloptions
            console.log(l);
        }
        logMsg() {
            const args = [];
            for (let j = 0; j < arguments.length; j++) {
                args.push(arguments[j]);
            }
            this.sendToServerEditor({
                ctxtId: this.hookedContexts.currentContextInfoID,
                action: 'log',
                arguments: args
            });
        }
        //https://codingrepo.com/regular-expression/2015/11/23/javascript-generate-uuidguid-for-rfc-4122-version-4-compliant-with-regular-expression/
        createUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = crypto.getRandomValues(uuidFiller)[0] % 16 | 0;
                const v = c === 'x' ? r : (r & 0x3) | 0x8;
                const uuid = v.toString(16);
                uuidList[uuid] = true;
                return uuid;
            });
        }
        //window.atob
        encodeSource(str) {
            return window.btoa(str);
        }
        decodeSource(str) {
            return window.atob(str);
        }
        b64EncodeUnicode(str) {
            return btoa(unescape(encodeURIComponent(str)));
        }
        b64DecodeUnicode(str) {
            return decodeURIComponent(escape(atob(str)));
        }
    }

    return messenger;
}
export { msgActions };
