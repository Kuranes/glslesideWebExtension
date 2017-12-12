function hookDispatcher() {
    // HookDispatch has 3 Power
    // - Hook (replace)
    // - preHook(listen to arguments)
    // - postHook (listen to results)
    //
    const methodsUniforms = [];

    const methods1 = [];
    const methods1ByName = {};
    const enums1 = {};
    const invertedEnums1 = {};

    let fNativeName, fNativeObj;
    const illegalInvocation = { canvas: true, drawingBufferWidth: true, drawingBufferHeight: true };
    for (fNativeName in WebGLRenderingContext.prototype) {
        if (illegalInvocation[fNativeName]) continue;
        fNativeObj = WebGLRenderingContext.prototype[fNativeName];
        const theType = typeof fNativeObj;
        switch (theType) {
            case 'function':
                // @ts-ignore
                if (fNativeName.startsWith('uniform')) {
                    methodsUniforms.push(fNativeName);
                } else {
                    methods1.push(fNativeName);
                }
                methods1ByName[fNativeName] = fNativeObj;
                break;
            case 'number':
            case 'string':
                enums1[fNativeName] = fNativeObj;
                invertedEnums1[fNativeObj] = fNativeName;
                break;
        }
    }

    const methods2 = [];
    const methods2ByName = {};
    const enums2 = {};
    const invertedEnums2 = {};
    // @ts-ignore
    if (typeof WebGL2RenderingContext !== 'undefined') {
        // @ts-ignore
        for (fNativeName in WebGL2RenderingContext.prototype) {
            if (illegalInvocation[fNativeName]) continue;
            // @ts-ignore
            fNativeObj = WebGL2RenderingContext.prototype[fNativeName];
            const theType = typeof fNativeObj;
            switch (theType) {
                case 'function':
                    if (!methods1ByName[fNativeName] && !methods2ByName[fNativeName]) {
                        // @ts-ignore
                        if (fNativeName.startsWith('uniform')) {
                            methodsUniforms.push(fNativeName);
                        } else {
                            methods2.push(fNativeName);
                        }
                    }
                    methods2ByName[fNativeName] = fNativeObj;
                    break;
                case 'number':
                case 'string':
                    enums2[fNativeName] = fNativeObj;
                    invertedEnums2[fNativeObj] = fNativeName;
                    break;
            }
        }
    }
    let allMethods = [];
    allMethods = allMethods.concat(methods1);
    allMethods = allMethods.concat(methods2);
    allMethods = allMethods.concat(methodsUniforms);

    // global Class: one dispatcher for many webgl instances
    const dispatcher = {
        methods: methods1,
        methods2: methods2,
        methodsUniforms: methodsUniforms,
        allMethods: allMethods,
        enums: enums1,
        invertedEnums: invertedEnums1,
        enums2: enums2,
        invertedEnums2: invertedEnums2
    };

    // where we keep :
    // - the natives original functions
    // - the hooks (pre/hook/post)
    // - the enums
    const referencesWebGL = [];
    // the ones we'll override
    const renderingContexts = [];
    // webgl1
    const referencesWebGL1 = { hooks: {}, enum_strings: {} };
    referencesWebGL.push(referencesWebGL1);
    renderingContexts.push(WebGLRenderingContext);
    dispatcher.referencesWebGL1 = referencesWebGL1;
    dispatcher.WebGLRenderingContext = WebGLRenderingContext;
    // @ts-ignore
    WebGLRenderingContext.refRdrCtxt = referencesWebGL1;

    // webgl2
    let referencesWebGL2;
    // @ts-ignore
    if (typeof WebGL2RenderingContext !== 'undefined') {
        referencesWebGL2 = { hooks: {}, enum_strings: {} };
        referencesWebGL.push(referencesWebGL2);
        dispatcher.referencesWebGL2 = referencesWebGL2;
        // @ts-ignore
        renderingContexts.push(WebGL2RenderingContext);
        // @ts-ignore
        dispatcher.WebGL2RenderingContext = WebGL2RenderingContext;
        // @ts-ignore
        WebGL2RenderingContext.refRdrCtxt = referencesWebGL2;
    }

    // TODO: dynamic switch
    // TODO: filter using settings
    // TODO: support user snippets/plugins
    dispatcher.loadHooks = function(hooks, settings, hookedContexts, msgActions) {
        hooks.webglRecordStateHook(this, hookedContexts, msgActions, settings);
        return;

        // if (settings.popup_Empty_Calls) {
        //     hooks.noOpwebglHook(this, hookedContexts, msgActions, settings);
        // } else if (settings.popup_Error_Calls) {
        //     hooks.webglErrorLogHook(this, hookedContexts, msgActions, settings);
        // } else if (settings.popup_Record_Calls) {
        //     hooks.webglRecordStateHook(this, hookedContexts, msgActions, settings);
        // } else {
        //     const webgl1HookClass = hooks.webgl1(this, hookedContexts, msgActions, settings);
        //     hooks.webgl2(this, hookedContexts, msgActions, settings, webgl1HookClass);
        // }
    };
    dispatcher.activateHooks = function() {
        for (let k = 0; k < referencesWebGL.length; k++) {
            const refRenderingCtxt = referencesWebGL[k];
            const ntvRenderingCtx = renderingContexts[k];

            ////////////
            // THE
            // HOOKING
            ////////////////
            // for each rendering context,
            // store references and override prototypes
            // and get enums
            allMethods.forEach(function(nativeFuncName) {
                const nativeFunc = ntvRenderingCtx.prototype[nativeFuncName];
                if (!nativeFunc) return; // methods missing on native, no hooking
                refRenderingCtxt[nativeFuncName] = nativeFunc;

                ntvRenderingCtx.prototype[nativeFuncName + 'Native'] = nativeFunc;

                // optimised Options Choices:
                // The All Flexing: pres + hooks + posts
                // the Optimised A: no hook
                // the Optimised B: One main hook
                // the Optimised C: One Post
                // the Optimised D: One Pre
                // the Optimised E: One Hook, One Post
                // ADDs upon new things that happens
                let nbPre = 0;
                let nbHook = 0;
                let nbPost = 0;

                const hooksFromListeners = refRenderingCtxt.hooks[nativeFuncName];
                if (!hooksFromListeners) return;

                let funcHooks = hooksFromListeners.pre;
                if (funcHooks && funcHooks.length) {
                    nbPre = funcHooks.length;
                }

                funcHooks = hooksFromListeners.hook;
                if (funcHooks && funcHooks.length) {
                    nbHook = funcHooks.length;
                }
                funcHooks = hooksFromListeners.post;
                if (funcHooks && funcHooks.length) {
                    nbPost = funcHooks.length;
                }
                const howMuchHooking = nbHook + nbPost + nbPre;
                // No hook
                if (howMuchHooking === 0) return;

                if (howMuchHooking === 1) {
                    if (nbHook === 1) {
                        ntvRenderingCtx.prototype[nativeFuncName] = (function() {
                            const hook = refRenderingCtxt.hooks[nativeFuncName].hook[0];
                            return function() {
                                return hook(this, arguments, this.__contextInfo);
                            };
                        })();
                    } else if (nbPost === 1) {
                        ntvRenderingCtx.prototype[nativeFuncName] = (function() {
                            const hook = refRenderingCtxt.hooks[nativeFuncName].post[0];
                            return function() {
                                const res = nativeFunc.apply(this, arguments);
                                hook(this, arguments, this.__contextInfo, res);
                                return res;
                            };
                        })();
                    } else {
                        // if(nbPre ===1){
                        ntvRenderingCtx.prototype[nativeFuncName] = (function() {
                            const hook = refRenderingCtxt.hooks[nativeFuncName].pre[0];
                            return function() {
                                hook(this, arguments, this.__contextInfo);
                                const res = nativeFunc.apply(this, arguments);
                                return res;
                            };
                        })();
                    }
                } else {
                    // "slower":  all hook,pre,post
                    ntvRenderingCtx.prototype[nativeFuncName] = function() {
                        const hooks = refRenderingCtxt.hooks[nativeFuncName];
                        if (!hooks) {
                            return nativeFunc.apply(this, arguments);
                        }

                        const contextInfo = this.__contextInfo;
                        let preResult;
                        let postResult;
                        let result;
                        let i;
                        let l;
                        let previousResult;
                        // pre-hooks: arguments changes
                        funcHooks = hooks.pre;
                        if (funcHooks && funcHooks.length) {
                            for (i = 0, l = funcHooks.length; i < l; i++) {
                                preResult = funcHooks[i](this, arguments, contextInfo, preResult);

                                if (preResult === undefined) preResult = previousResult;
                                else previousResult = preResult;
                            }
                        }
                        previousResult = undefined;
                        // one of those might to a real gl call
                        // multiple  is "undefined behaviour"
                        funcHooks = hooks.hook;
                        if (funcHooks && funcHooks.length) {
                            for (i = 0, l = funcHooks.length; i < l; i++) {
                                result = funcHooks[i](this, arguments, contextInfo);
                                if (result === undefined) result = previousResult;
                                else previousResult = result;
                            }
                        }

                        // post-hooks: arguments changes
                        previousResult = undefined;
                        funcHooks = hooks.post;
                        if (funcHooks && funcHooks.length) {
                            for (i = 0, l = funcHooks.length; i < l; i++) {
                                postResult = funcHooks[i](this, arguments, contextInfo, result);
                                if (postResult === undefined) postResult = previousResult;
                                else previousResult = postResult;
                            }
                        }

                        return result;
                    };
                }
            });

            for (const propertyName in ntvRenderingCtx) {
                if (typeof ntvRenderingCtx[propertyName] === 'number') {
                    refRenderingCtxt.enum_strings[ntvRenderingCtx[propertyName]] = propertyName;
                }
            }
            ntvRenderingCtx.enum_strings = refRenderingCtxt.enum_strings;
        }
    };
    dispatcher.referencesWebGL1 = referencesWebGL1;
    dispatcher.referencesWebGL2 = referencesWebGL2;
    dispatcher.referencesWebGL = referencesWebGL;
    dispatcher.listeners = [];

    dispatcher.addListener = function(listenerClass, version) {
        const listener = new listenerClass();
        this.listeners.push(listener);

        const ref = referencesWebGL[version - 1];
        for (const funcName in listenerClass.prototype) {
            let hook;
            let preHook;
            let postHook;
            let nativeFuncName;
            switch (funcName.substr(0, 7)) {
                case 'preHook':
                    preHook = listener[funcName].bind(listener);
                    nativeFuncName = funcName.substr(7);
                    break;
                case 'postHoo':
                    postHook = listener[funcName].bind(listener);
                    nativeFuncName = funcName.substr(8);
                    break;
                default:
                    hook = listener[funcName].bind(listener);
                    nativeFuncName = funcName;
            }
            if (!hook && !preHook && !postHook) continue;

            let hooks = ref.hooks[nativeFuncName];

            if (!hooks) {
                hooks = [];
                ref.hooks[nativeFuncName] = hooks;
            }

            if (hook) {
                if (!hooks.hook) hooks.hook = [];
                hooks.hook.push(hook);
            }
            if (preHook) {
                if (!hooks.pre) hooks.pre = [];
                hooks.pre.push(preHook);
            }
            if (postHook) {
                if (!hooks.post) hooks.post = [];
                hooks.post.push(postHook);
            }
        }
    };

    dispatcher.removeListener = function(listener, version) {
        let idx = this.listeners.indexOf(listener);
        if (idx === -1) return;
        this.listeners.splice(idx, 1);

        // remove  hooks.
        const ref = referencesWebGL[version];
        for (const funcName in ref) {
            const hook = listener[funcName];
            const preHook = listener['preHook' + funcName];
            const postHook = listener['postHook' + funcName];
            if (!hook && !preHook && !postHook) continue;

            const hooks = ref.hooks[funcName];

            if (!hooks) {
                console.log('suspicious. removing an not registered listener ?');
                continue;
            }

            if (hook) {
                idx = hooks.hook && hooks.hook.indexOf(listener);
                if (idx !== undefined && idx !== -1) {
                    hooks.hook.splice(idx, 1);
                }
            }
            if (preHook) {
                idx = hooks.pre && hooks.pre.indexOf(listener);
                if (idx !== undefined && idx !== -1) {
                    hooks.pre.splice(idx, 1);
                }
            }
            if (postHook) {
                idx = hooks.post && hooks.post.indexOf(listener);
                if (idx !== undefined && idx !== -1) {
                    hooks.post.splice(idx, 1);
                }
            }
        }
    };

    return dispatcher;
}

export { hookDispatcher };
