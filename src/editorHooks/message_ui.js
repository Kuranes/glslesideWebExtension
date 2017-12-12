import browserExtWebpack from '../extensionPolyfill.js';
import { addHooksString } from '../clientHook.js';
import { addClientMessenger } from '../WebGLHooks/message_ui_client.js';
import { EditContext } from '../ShaderEditor/editContext.js';

const browserExt = browserExtWebpack;

let sendCodeToClient, saveSettings, readSettings, injectCodeToClient, clientMessageListener;

const isExtension = browserExt;
// TODO: wut ? investigate strange inverted condition
if (!isExtension) {
    // Normal Editor
    let target = window.parent;
    if (!target) target = window;

    // postmessage
    sendCodeToClient = function(msg) {
        msg.source = 'RenderBugle';
        msg.from = 'devtools';
        const context = EditContext.getCurrentContext();
        if (context) {
            if (!msg.ctxtId) msg.ctxtId = context.ctxtId;
            if (!msg.url) msg.url = context.url;
            //if (!msg.id && context.selectedProgram) msg.id = context.selectedProgram.id;
        } else {
            target.postMessage(msg, msg.url);
        }
    };
    injectCodeToClient = function(msg) {
        msg.from = 'devtools';
        target.postMessage(msg, '*');
    };
    clientMessageListener = function(callback) {
        target.addEventListener(
            'message',
            function(e) {
                // Do we trust the sender of this message?
                //if (e.origin !== 'http://example.com:8080')
                //    return;
                if (e.data && e.data.source === 'RenderBugle') return;
                callback(e.data);
            },
            false
        );

        sendCodeToClient({ action: 'init' });
    };

    // local storage, indexdb
    saveSettings = function() {};
    readSettings = function() {};
}

if (isExtension) {
    // Browser Extension
    browserExt.storage.sync.get('settings').then(function(obj) {
        if (obj && obj.settings) {
            //console.log('SETTINGS from devtools: ', obj);
            EditContext.settingsConfiguration = obj.settings;
        }
    });

    console.log('inspecting: ' + browserExt.devtools.inspectedWindow.frameURL);

    /////////////////////////////////
    /////////////////////////////////
    /////////////////////////////////
    // REMOTE (webRTC)
    /////////////////////////////////
    const isRemoteDebugging = browserExt.devtools.inspectedWindow.tabId === null;

    /// Network serve
    // sendNetworkMsg('test');
    // window.
    // compose something ? with browserExt.devtools.inspectedWindow.frameURL
    const URLMSGFAKE = 'https://qdfmqlkdfgjmqlkjgmqlsdkghqmlkgh.com';
    let startServerNetwork;
    const RTCPeerConnection =
        // @ts-ignore
        window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

    let startWithClientSDP;
    let peerCon;
    let createOfferServer;
    let idDataChannel = 0;
    let devToolsMsgReceiveCallback;
    let addMSG;
    let initClientPage;
    const createServer = function(callbackJoin, callbackSend) {
        //console.log("Creating webrtcserver...");

        //const sdpConstraints = { optional: [{ RtpDataChannels: true }] };
        const pc = new RTCPeerConnection(null);
        peerCon = pc;
        let dc;
        let state;
        pc.oniceconnectionstatechange = function(e) {
            state = pc.iceConnectionState;
            console.log(state);
            if (state === 'connected' || state === 'completed') {
                devToolsMsgReceiveCallback({ action: 'reload' });
            }
        };
        pc.onicecandidate = function(e) {
            // Firing this callback with a null candidate indicates that
            // trickle ICE gathering has finished, and all the candidates
            // are now present in pc.localDescription.  Waiting until now
            // to create the answer saves us from having to send offer +
            // answer + iceCandidates separately.
            if (e.candidate) return;
            callbackJoin(pc.localDescription);
        };
        function createOfferSDP() {
            // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createDataChannel
            const dataChannelOptions = {
                ordered: true,
                reliable: true,
                negotiated: false // false: browser makes the datachannel on receiver side
                // id: 1111
            };
            dc = pc.createDataChannel('shdreditor_' + idDataChannel, dataChannelOptions);
            idDataChannel++;
            console.log('DATA CHANNEL CREATED');
            const sdpOption = {
                offerToReceiveAudio: false,
                offerToReceiveVideo: false
            };
            pc.createOffer(sdpOption).then(function(e) {
                pc.setLocalDescription(e);
                //localServerDescription = pc.localDescription;
                //callbackJoin(pc.localDescription);
            });
            dc.onopen = function() {
                addMSG('CONNECTED!', 'info');
            };
            dc.onmessage = function(e) {
                if (e.data) {
                    callbackSend(e.data);
                    addMSG(e.data, 'other');
                }
            };

            dc.onclose = function() {
                addMSG('CLOSED!', 'server DATA CHANNEL');
                createOfferSDP();
            };
        }
        createOfferServer = createOfferSDP;
        function start(answerSDP) {
            const answerDesc = new RTCSessionDescription(JSON.parse(answerSDP));
            pc.setRemoteDescription(answerDesc);
        }
        startWithClientSDP = start;

        const sendMSG = function(value) {
            if (value && dc) {
                dc.send(value);
                addMSG(value, 'meServer');
            }
        };
        window.sendNetworkMsg = sendMSG;

        addMSG = function(msg, who) {
            console.log(msg, who);
        };
        createOfferSDP();
        return startWithClientSDP;
    };

    const joinAsClient = function(serverSentSDP, fakeURLMSG) {
        //console.log("Joining ...");

        const sdpConstraints = {
            optional: [{ RtpDataChannels: true }]
        };
        const pc = new RTCPeerConnection(null);
        let dc;
        let state;
        let clientSDP;
        pc.ondatachannel = function(e) {
            dc = e.channel;
            console.log('DATACHANNEL');
            dcInit(dc);
        };
        pc.onicecandidate = function(e) {
            // Firing this callback with a null candidate indicates that
            // trickle ICE gathering has finished, and all the candidates
            // are now present in pc.localDescription.  Waiting until now
            // to create the answer saves us from having to send offer +
            // answer + iceCandidates separately.
            if (e.candidate) return;
            clientSDP = JSON.stringify(pc.localDescription);

            const xhr = new XMLHttpRequest();
            xhr.open(
                'POST',
                fakeURLMSG ? fakeURLMSG : 'https://qdfmqlkdfgjmqlkjgmqlsdkghqmlkgh.com',
                true
            );
            xhr.send('&aa=' + encodeURI(JSON.stringify(clientSDP)));
        };
        pc.oniceconnectionstatechange = function(e) {
            state = pc.iceConnectionState;
            console.log(state);
        };
        function dcInit(dc) {
            dc.onopen = function() {
                addMSG('CONNECTED!', 'info');
            };
            dc.onmessage = function(e) {
                if (e.data) addMSG(e.data, 'other');
            };
        }
        function createAnswerSDP() {
            const offerDesc = new RTCSessionDescription(serverSentSDP);
            pc.setRemoteDescription(offerDesc);
            pc.createAnswer(
                function(answerDesc) {
                    pc.setLocalDescription(answerDesc);
                },
                function() {
                    console.warn('Couldn\'t create offer');
                },
                sdpConstraints
            );
        }

        const sendMSG = function(value) {
            if (value && dc) {
                dc.send(value);
                addMSG(value, 'meClient');
            }
        };
        window.sendNetworkMsg = sendMSG;

        addMSG = function(msg, who) {
            console.log(msg, who);
        };
        createAnswerSDP();
        return clientSDP;
    };

    /////////////////////////////////
    /////////////////////////////////
    /////////////////////////////////
    /////////////////////////////////
    let backgroundPageConnection;

    readSettings = function() {
        backgroundPageConnection.postMessage({
            name: 'readSettings',
            tabId: browserExt.devtools.inspectedWindow.tabId
        });
    };

    saveSettings = function() {
        sendCodeToClient({
            action: 'UpdateSettings',
            settings: JSON.stringify(EditContext.settingsConfiguration)
        });

        backgroundPageConnection.postMessage({
            name: 'saveSettings',
            settings: JSON.stringify(EditContext.settingsConfiguration),
            tabId: browserExt.devtools.inspectedWindow.tabId
        });
    };

    // version compatible with different kind of debug injection
    // chrome, websocket, vorlonjs
    injectCodeToClient = function(func, param0) {
        const str = '(' + func + ')(' + param0 + ')';
        browserExt.devtools.inspectedWindow.eval(str);
        //browserExt.devtools.inspectedWindow.eval(str, {
        //useContentScriptContext: true
        //frameURL: browserExt.devtools.inspectedWindow.location.href
        //,contextSecurityOrigin
        //    });
    };

    // version compatible with different kind of debug injection
    // chrome, websocket, vorlonjs
    sendCodeToClient = function(msg) {

        msg.source = 'RenderBugle';
        msg.from = 'devtools';
        const context = EditContext.getCurrentContext();
        if (context) {
            if (!msg.ctxtId) msg.ctxtId = context.ctxtId;
            if (!msg.url) msg.url = context.url;
            //if (!msg.id && context.selectedProgram) msg.id = context.selectedProgram.id;
        }

        const str = 'receiveFromServerEditor( JSON.parse( \'' + JSON.stringify(msg) + '\'));';
        try {
            browserExt.devtools.inspectedWindow.eval(str);
        }
        catch (e) {
            console.error(e);
        }
        //browserExt.devtools.inspectedWindow.eval(str, {
        //useContentScriptContext: true
        //frameURL: browserExt.devtools.inspectedWindow.location.href
        //,contextSecurityOrigin
        //  });
    };
    /*
    var ws = new WebSocket("wss://127.0.0.1:13529");
    ws.onopen = function () {
        console.log('listening');
    */
    // flow from the injected script,
    // to the content script,
    // to the background script
    // and finally to the DevTools page.[here]

    clientMessageListener = function(callback) {
        /*   ws.onmessage = function (e) {
               console.log(wut);
               //callback(e);
           }
           */
        devToolsMsgReceiveCallback = callback;
        if (backgroundPageConnection) {
            backgroundPageConnection.onMessage.addListener(callback);
        }
    };

    // devtools connect to background
    //if (!isRemoteDebugging) {
    backgroundPageConnection = browserExt.runtime.connect({
        name: 'panel'
    });
    readSettings();
    //}

    let initDistant = false;
    let receivedClientSDP = false;
    let localServerDescription;

    const logNetworkEventNav = function(e) {
        console.log('onNavigated', e);
        initDistant = false;

        // var jsonSettings = JSON.stringify(EditContext.settingsConfiguration);
        // starts by registering on the background

        if (!isRemoteDebugging) {
            console.log('init on network: ' + browserExt.devtools.inspectedWindow.frameURL);
            backgroundPageConnection.postMessage({
                name: 'init',
                tabId: browserExt.devtools.inspectedWindow.tabId,
                url: browserExt.devtools.inspectedWindow.frameURL,
                initType: 'onNavigated'
            });
            initDistant = true;
            return true;
        }

        if (!isRemoteDebugging) return true;
        receivedClientSDP = false;
        startServerNetwork();
        if (localServerDescription) {
            initClientPage();
        }
    };

    const handleURLrequestCheck = function(e) {
        //var fTracePanel = function () { console.log('panel event') }
        //var fTracePanelStr = '(' + fTracePanel.toString() + ')()';
        //browserExt.devtools.inspectedWindow.eval(fTracePanelStr); // this gets appended AFTER the page
        //browserExt.devtools.inspectedWindow.reload({
        //    ignoreCache: true,
        //    injectedScript: fTracePanelStr
        //});
        /*
        if (!initDistant) {
            if (!isRemoteDebugging) {
                console.log('onRequest initDistant', arguments);
                //var jsonSettings = JSON.stringify(EditContext.settingsConfiguration);
                // starts by registering on the background
                backgroundPageConnection.postMessage({
                    name: 'init',
                    tabId: browserExt.devtools.inspectedWindow.tabId,
                    url: browserExt.devtools.inspectedWindow.frameURL,
                    initType: 'onRequested'
                });
                initDistant = true;
                return true;
            }
        }
        */

        // URLMSGFAKE
        // POST
        //
        if (!isRemoteDebugging) return true;
        if (!receivedClientSDP && e.request) {
            if (e.request.url !== URLMSGFAKE) return true;

            if (e.request.method === 'POST' && e.request.postData) {
                console.log('onRequest receiveClient', arguments);

                const data = e.request.postData;
                const query = decodeURI(data.text.substring(4));
                const clientSDP = JSON.parse(query);
                startWithClientSDP(clientSDP);
                receivedClientSDP = true;
                return false;
            }

            return false;
        }

        return true;
    };

    const logNetworkEventReq = function(e) {
        return handleURLrequestCheck(e);
    };

    browserExt.devtools.network.onNavigated.addListener(logNetworkEventNav);
    if (browserExt.devtools.network.onRequestFinished) {
        browserExt.devtools.network.onRequestFinished.addListener(logNetworkEventReq);
    } else if (browserExt.devtools.network.onRequest) {
        browserExt.devtools.network.onRequestFinished.addListener(logNetworkEventReq);
    }

    const requestFilter = {
        urls: ['<all_urls>']
    };
    const extraInfoSpec = ['blocking'];
    browserExt.webRequest.onBeforeRequest.addListener(
        function(req) {
            //console.log('a', arguments);
            const blockingResponse = { cancel: false };
            if (req.url === URLMSGFAKE) {
                //
                if (req.method === 'POST') {
                    // TODO network handle that.
                    debugger;
                    console.log(JSON.stringify(req.details));

                    // cancel our network message
                    //blockingResponse.cancel = true;
                }
            }
            //else {
            //    var headers = req.requestHeaders;
            //    blockingResponse.requestHeaders = headers;
            //}

            return blockingResponse;
        },
        requestFilter,
        extraInfoSpec
    );

    /*
    // Relay the tab ID to the background page
    // do this at each reload ?
    browserExt.runtime.sendMessage({
        name: inject,
        tabId: browserExt.devtools.inspectedWindow.tabId,
        scriptToInject: "content_script.js"
    });
    */
    // TODO: Add it to joins AS client ON CONNECT
    const rtcDoPostMessageClient = function(msg, src) {
        let data = msg;
        if (!data) data = {};
        data.source = 'RenderBugle';
        // src ?
        data.src = data.source;

        try {
            data.url = window.location.href;
        } catch (e) {}

        return window.sendNetworkMsg(JSON.stringify(data));
    };
    let strMessageRTC = '';
    //strMessageRTC += 'console.log("registering new Send");\n';
    strMessageRTC +=
        'window.doPostMessageClientShaderEditor = ' + rtcDoPostMessageClient.toString() + ';\n';
    //strMessageRTC += 'console.log("registerednew Send");\n';
    //console.log(strMessageRTC);

    initClientPage = function() {
        const serverSDP = JSON.stringify(localServerDescription);
        let joinString = '(function(){\n\nvar serverSDPObj = eval(' + serverSDP + ');\n';
        joinString += joinAsClient.toString();
        joinString += ';\n var clientOffer = joinAsClient(serverSDPObj, "' + URLMSGFAKE + '");})()';
        // console.log(joinAsClient.toString());

        browserExt.devtools.inspectedWindow.eval(joinString);
        //console.log(joinString);

        //injectCodeToClient(addClientMessenger.toString(), jsonSettings);
        browserExt.devtools.inspectedWindow.eval(strMessageRTC);

        injectCodeToClient(addHooksString, JSON.stringify(EditContext.settingsConfiguration));
    };

    const serverReady = function(localDes) {
        console.log('server Offer with localDesc');
        localServerDescription = localDes;
        initClientPage();
    };

    const serverReceive = function(msg) {
        const data = JSON.parse(msg);
        devToolsMsgReceiveCallback(data);
    };

    // at load creattion and connect
    startServerNetwork = function() {
        if (peerCon) {
            createOfferServer();
        } else {
            console.log('create server');
            createServer(serverReady, serverReceive);
        }
    };

    const jsonSettings = JSON.stringify(EditContext.settingsConfiguration);
    injectCodeToClient(addClientMessenger.toString(), jsonSettings);
    injectCodeToClient(addHooksString, jsonSettings);

    if (!isRemoteDebugging) {
        // starts by registering on the background
        backgroundPageConnection.postMessage({
            name: 'initDevTools',
            tabId: browserExt.devtools.inspectedWindow.tabId,
            url: browserExt.devtools.inspectedWindow.frameURL,
            initType: 'atParse'
        });
    } else {
        // no tabID, it's remote debug (mobile)
        startServerNetwork();
    }
}

export { sendCodeToClient, saveSettings, readSettings, injectCodeToClient, clientMessageListener };
