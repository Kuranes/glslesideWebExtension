// settings, hookdispatcher
function addClientActions(options, utils, hooks, classDecl) {
    // declare utils func here.
    // make another import + eval in the hooks ?
    const downloadFile = function(url, type, name) {
        const dlLink = document.createElement('a');
        dlLink.download = name + '_' + window.performance.now().toString() + '.' + type;
        dlLink.href = url;
        document.body.appendChild(dlLink);
        dlLink.click();
        document.body.removeChild(dlLink);
    };

    const downloadText = function(text, type, mime) {
        const dataURL = URL.createObjectURL(new Blob([text], { type: mime }));
        downloadFile(dataURL, type, 'GLStatesRecord');
    };
    const msgActions = new classDecl.messengerClass(options);
    // @ts-ignore
    window.receiveFromServerEditor = msgActions.receiveFromServerEditor.bind(msgActions);
    const hookedContexts = new classDecl.hookedContextListClass(
        options,
        msgActions,
        classDecl.hookedContextInfoClass
    );
    msgActions.setHookedContexts(msgActions);
    //debugger;
    const hkDisp = utils.hookDispatcher();

    // place holder settings
    let settings;
    if (options) {
        //console.log(s);
        settings = options;
    } else {
        // @ts-ignore
        console.warning('renderbugle settings fail');
    }

    hkDisp.loadHooks(hooks, settings, hookedContexts, msgActions);
    hkDisp.activateHooks();
    ///////////////

    // hook Context
    // intercept canvas creation
    const backupHTMLCanvas = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(ctxtType) {
        const ctxt = backupHTMLCanvas.apply(this, arguments);
        let optOutArg;
        if (arguments.length > 1) {
            optOutArg = arguments[1];
            if (optOutArg.pureNative === true) {
                return ctxt;
            }
        }
        //debugger;
        const idxWebgl = ctxtType.toLowerCase().indexOf('webgl');
        if (idxWebgl !== -1) {
            const version =
                idxWebgl + 5 < ctxtType.length && ctxtType[idxWebgl + 5] === '2' ? 2 : 1;

            if (settings.popup_Disable_Webgl) {
                console.log('renderBugle refused webgl' + version);
                return null;
            }

            // ctxt is a hook dispatcher
            // hook dispatcher is
            // - nativeGL (for all context)
            // - hooks (for all context, do not store inside)
            // - contextInfo (PER Context)
            // - the "this" hook dispatcher is  Per Context

            // only inject bulk code if there is webgl?
            // save few ms of js parse and mem ?
            // need to be sync.
            // need as string and inject as eval
            // eval(enableInjectString)
            hookedContexts.addContextInfo(ctxt, version, optOutArg);
            return ctxt;
        }

        return backupHTMLCanvas.apply(this, arguments);
    };
    ///////////////

    /////////////// HOOKS

    // TIMER HOOKS
    function requestAnimationframeFinished() {
        // TODO: need to know if devtools open.
        // for early out
        const ctxtById = hookedContexts.canvasContextInfoById;
        let lastActiveCanvas;
        for (const i in ctxtById) {
            const contextInfo = ctxtById[i];
            if (!contextInfo) continue;
            if (contextInfo.advanceFrame()) {
                lastActiveCanvas = contextInfo;
            }
        }
        if (lastActiveCanvas) {
            hookedContexts.lastActiveCanvas = lastActiveCanvas;
        }
    }
    // @ts-ignore
    window.requestAnimationframeFinished = requestAnimationframeFinished;

    ////////////////////// Actions

    msgActions.registeredActions['ProgramSelected'] = function(msg) {
        const contextInfo = hookedContexts.getContextInfosById(msg.ctxtId);
        contextInfo.selectProgram(msg.id);
    };

    msgActions.registeredActions['ProgramTimingRequest'] = function(msg) {
        //console.log('new timing Request: ' + id);
        msgActions.log('UIProgramTimingRequest');

        const contextInfo = hookedContexts.getContextInfosById(msg.ctxtId);
        contextInfo.programTiming = msg.id;
    };

    msgActions.registeredActions['ProgramReplaced'] = function(msg) {
        msgActions.log('UIProgramReplaced');

        const contextInfo = hookedContexts.getContextInfosById(msg.ctxtId);
        contextInfo.contextInfo.programTracker = msg.id;
        const p = contextInfo.findProgramInfoProxyById(msg.id);
        const vs = p.vertexShaderSource;

        let fs;
        if (msg.useMain === true) {
            fs = p.fragmentShaderSource;
            if (!/\s*ShaderEditorInternalMain\s*\(/.test(fs)) {
                fs = fs.replace(/\s*main\s*\(/gi, ' ShaderEditorInternalMain(');
                fs += '\n';
                // added new main
                fs += msgActions.decodeSource(msg.sourceCode);
                contextInfo.onUpdateProgram(msg.id, vs, fs);
            }
        } else {
            // added new main
            fs = msgActions.decodeSource(msg.sourceCode);
            contextInfo.onUpdateProgram(msg.id, vs, fs);
        }
    };

    msgActions.registeredActions['ProgramOut'] = function(msg) {
        msgActions.log('UIProgramOut');

        const contextInfo = hookedContexts.getContextInfosById(msg.ctxtId);
        const p = contextInfo.findProgramInfoProxyById(msg.id);
        const vs = p.vertexShaderSource;
        const fs = p.fragmentShaderSource;
        hookedContexts.doUpdateProgram(msg.id, vs, fs, p);
    };

    msgActions.registeredActions['ProgramDisabled'] = function(msg) {
        msgActions.log('UIProgramDisabled');

        const contextInfo = hookedContexts.getContextInfosById(msg.ctxtId);
        const p = contextInfo.findProgramInfoProxyById(msg.id);
        const vs = p.vertexShaderSource;
        let fs = p.fragmentShaderSource;

        if (!/\s*ShaderEditorInternalMain\s*\(/.test(fs)) {
            //		fs = fs.replace( /\s+main\s*\(/, ' ShaderEditorInternalMain(' );
            //		fs += '\n' + 'void main() { discard; }';
            fs = fs.replace(/\s+main\s*\(/gi, ' ShaderEditorInternalMain(');
            fs += '\n' + 'void main() { ShaderEditorInternalMain(); discard; }';

            contextInfo.onUpdateProgram(msg.id, vs, fs);
        }
    };

    msgActions.registeredActions['ProgramEnabled'] = function(msg) {
        msgActions.log('ProgramEnabled');

        const contextInfo = hookedContexts.getContextInfosById(msg.ctxtId);
        const p = contextInfo.findProgramInfoProxyById(msg.id);
        const vs = p.vertexShaderSource;
        const fs = p.fragmentShaderSource;

        contextInfo.onUpdateProgram(msg.id, vs, fs);
    };

    msgActions.registeredActions['UpdateImage'] = function(msg) {
        const contextInfo = hookedContexts.getContextInfosById(msg.ctxtId);
        const t = contextInfo.textures[msg.id];
        if (t) {
            const img = new Image();
            img.src = msg.src;
            const gl = contextInfo.gl;
            const refRdrCtxt = contextInfo.refRdrCtxt;
            refRdrCtxt.bindTexture.apply(gl, [refRdrCtxt.TEXTURE_2D, t.texture]);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = t.texture.width;
            canvas.height = t.texture.height;
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
            msgActions.createUUID(
                'UPDATE TEXTURE ',
                img.width,
                img.height,
                canvas.width,
                canvas.height
            );
            /*var res = refRdrCtxt.texImage2D.apply(gl, [
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                canvas
            ]);*/
            //var res = getWebglReferences().texSubImage2D.apply( gl, [ gl.TEXTURE_2D, 0, 0, 0, img.width, img.height, gl.RGBA, gl.UNSIGNED_BYTE, img ] );

            if (settings.logShaderEditor) {
                const err = t.gl.getError();
                if (err) {
                    msgActions.createUUID(' texImage2D ' + refRdrCtxt.enum_strings[err]);
                    if (settings.debugShaderEditor) debugger;
                }
            }
            gl.generateMipmap(gl.TEXTURE_2D);
            refRdrCtxt.bindTexture.apply(gl, [gl.TEXTURE_2D, null]);
        }
    };

    /*
    msgActions.registeredActions['SettingsChanged']  = function( setting, value ) {

        msgActions.sendToServerEditor( { context: currentContextID, action: 'saveSetting', setting: setting, value: value });

    }
    */

    msgActions.registeredActions['VSEditorUpdate'] = function(msg) {
        // VS UPDATE
        msgActions.log('UPDATE VS');
        const contextInfo = hookedContexts.getContextInfosById(msg.ctxtId);
        contextInfo.onUpdateProgram(msg.id, msgActions.decodeSource(msg.sourceCode));
    };

    msgActions.registeredActions['FSEditorUpdate'] = function(msg) {
        // FS UPDATE
        msgActions.log('UPDATE FS');
        const contextInfo = hookedContexts.getContextInfosById(msg.ctxtId);
        contextInfo.onUpdateProgram(msg.id, undefined, msgActions.decodeSource(msg.sourceCode));
    };

    msgActions.registeredActions['UpdateSettings'] = function(msg) {
        settings = JSON.parse(msg.settings);
    };

    msgActions.registeredActions['UniformRequest'] = function(msg) {
        //uniformTracker = uniformName;
        //programTracker = id;

        const contextInfo = hookedContexts.getContextInfosById(msg.ctxtId);
        const p = contextInfo.findProgramInfoProxyById(msg.id);
        msgActions.log('Uniform Request: ' + p.name + '::' + msg.UniformName);

        if (!p) return;

        for (let k = 0; k < p.uniforms.length; k++) {
            const u = p.uniforms[k];

            if (u.name === msg.UniformName) {
                msgActions.log('Uniform Send: ' + p.name + '::' + msg.UniformName);

                let aaa;
                if (u.value !== undefined && u.value !== null) {
                    aaa = '';
                    if (u.value.length) {
                        const args = u.value;
                        const argL = u.value.length;
                        for (let argsJ = 1; argsJ < argL; argsJ++) {
                            const value = args[argsJ];
                            if (value) {
                                //if (typeof value )
                                aaa += value.toString();
                                if (argsJ < argL - 1) aaa += ', ';
                            }
                        }
                    } else {
                        aaa = u.value.toString();
                    }
                } else {
                    if (u.value === null) aaa = 'null';
                    else aaa = 'undefined';
                }
                // devise some shader uniform sent value cache
                // just preventing resend here means other side
                // doesn't get any value if hover a second time
                /*if (
                    u.valueString === undefined
                    // || u.valueString !== aaa
                ) {*/
                msgActions.sendToServerEditor({
                    ctxtId: contextInfo.id,
                    action: 'uniformValue',
                    value: aaa,
                    version: contextInfo.version
                });

                u.valueString = aaa;
                /*}*/

                return;
            }
        }

        msgActions.sendToServerEditor({
            ctxtId: contextInfo.id,
            action: 'uniformValue',
            value: ' Not used in this Shader',
            version: contextInfo.version
        });
    };

    msgActions.registeredActions['Pick'] = function(msg) {
        const contextInfo = hookedContexts.getContextInfosById(msg.ctxtId, true);
        if (!contextInfo) return;
        contextInfo.enableColorPicking();
    };

    // @ts-ignore
    msgActions.registeredActions['PlayPause'] = window.togglePauseFPS;
    // @ts-ignore
    msgActions.registeredActions['Slow'] = window.toggleDebugFPS;

    msgActions.registeredActions['Screenshot'] = function(msg) {
        const contextInfo = hookedContexts.getContextInfosById(msg.ctxtId, true);
        if (!contextInfo) {
            return;
        }
        // screenshot of the current frame buffer
        contextInfo.enableScreenshotRequest(downloadFile);
    };

    msgActions.registeredActions['downloadStateRecord'] = function(msg) {
        const contextInfo = hookedContexts.getContextInfosById(msg.ctxtId, true);
        if (!contextInfo) return;
        contextInfo.downloadTextRecord(downloadText);
    };

    let recorder;

    msgActions.registeredActions['Record'] = function(msg) {
        const contextInfo = hookedContexts.getContextInfosById(msg.ctxtId, true);
        if (!contextInfo) return;

        if (recorder) {
            recorder.stop();
            recorder = undefined;
        } else {
            const canvas = contextInfo.canvas;
            const elementToShare = canvas;
            // use requestFrame ?
            // => means doing it before "unbind" or before clear of the "framebuffer" we target
            const stream = elementToShare.captureStream(60); // fps

            // use detection code isMimeType supported
            const codecOptions = {
                mimeType: 'video/webm; codecs=vp9'
            };

            // @ts-ignore
            recorder = new window.MediaRecorder(stream, codecOptions);

            const blobs = [];
            const download = function(blob) {
                const url = window.URL.createObjectURL(blob);

                const id =
                    contextInfo.currentProgramSelected !== undefined
                        ? contextInfo.currentProgramSelected
                        : contextInfo.currentProgramID;
                const p = contextInfo.findProgramInfoProxyById(id);
                const pName = p ? p.name : 'Program';

                downloadFile(url, 'webm', pName);
            };

            recorder.ondataavailable = function(e) {
                if (e.data && e.data.size > 0) blobs.push(e.data);
            };

            recorder.onstop = function() {
                download(
                    new Blob(blobs, {
                        type: 'video/webm'
                    })
                );
            };

            recorder.start();
        }
    };

    msgActions.sendToServerEditor({
        action: 'initAfterInjection'
    });

    if (window.parent) {
        window.addEventListener('unload', function() {
            msgActions.sendToServerEditor({
                action: 'unloadIframe',
                url: window.location.href
            });
        });
    }
}

export { addClientActions };
