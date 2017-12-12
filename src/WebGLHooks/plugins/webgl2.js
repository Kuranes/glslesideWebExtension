function webgl2Hook(HookDispatcher, hookedContext, msgActions, options, webgl1Hook) {
    const refRdrCtxt = HookDispatcher.referencesWebGL2;

    // var RdrCtxt is already "augmented", reuse
    const RdrCtxt = function() {
        this.hookVersion = 2;
        this.refRdrCtxt = refRdrCtxt;
    };

    let i;
    for (i in webgl1Hook) {
        RdrCtxt[i] = webgl1Hook[i];
    }
    for (i in webgl1Hook.prototype) {
        RdrCtxt.prototype[i] = webgl1Hook.prototype[i];
    }
    //RdrCtxt.prototype.hookVersion = 2;
    //RdrCtxt.prototype.refRdrCtxt = refRdrCtxt;

    // @ts-ignore
    RdrCtxt.prototype.drawElements = function(gl, args, hookedInfo) {
        if (hookedInfo.currentQuery) hookedInfo.getQueryResult(gl, hookedInfo.currentQuery);

        if (!hookedInfo.programTiming || hookedInfo.programTiming !== hookedInfo.currentProgramID) {
            return gl.drawElementsNative.apply(gl, args);
        }

        let ext = hookedInfo.currentQueryExt;
        if (!ext) {
            ext = gl.getExtensionNative.call(gl, 'EXT_disjoint_timer_query_webgl2');
            hookedInfo.currentQueryExt = ext;
        }

        const query = gl.createQueryNative.call(gl);
        hookedInfo.currentQuery = query;
        gl.beginQueryNative.call(gl, ext.TIME_ELAPSED_EXT, query);
        ///////////////
        const res = gl.drawElementsNative.apply(gl, args);
        //////////////
        gl.endQueryNative.call(gl, ext.TIME_ELAPSED_EXT);

        //hookedInfo.getQueryResult(gl, query);

        return res;
    };

    // @ts-ignore
    RdrCtxt.prototype.drawArrays = function(gl, args, hookedInfo) {
        if (hookedInfo.currentQuery) hookedInfo.getQueryResult(gl, hookedInfo.currentQuery);

        if (!hookedInfo.programTiming || hookedInfo.programTiming !== hookedInfo.currentProgramID) {
            return gl.drawArraysNative.apply(gl, args);
        }

        let ext = hookedInfo.currentQueryExt;
        if (!ext) {
            ext = gl.getExtensionNative.call(gl, 'EXT_disjoint_timer_query_webgl2');
            hookedInfo.currentQueryExt = ext;
        }

        const query = gl.createQueryNative();
        hookedInfo.currentQuery = query;

        gl.beginQueryNative(ext.TIME_ELAPSED_EXT, query);
        /////////////
        const res = gl.drawArraysNative.apply(gl, args);
        /////////////////
        gl.endQueryNative(ext.TIME_ELAPSED_EXT);

        //hookedInfo.getQueryResult(gl, query);

        return res;
    };

    HookDispatcher.addListener(RdrCtxt, 2);
    return RdrCtxt;
}
export { webgl2Hook };
