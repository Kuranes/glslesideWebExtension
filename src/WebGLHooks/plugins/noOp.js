function noOpwebglHook(HookDispatcher /*, hookedContext*/) {
    const noOp = function() {
        return 1;
    };

    const noOpwebgl = function() {};

    // don't even need a webgl1 and webgl2 version
    HookDispatcher.allMethods.forEach(function(f) {
        noOpwebgl.prototype[f] = noOp;
    });
    HookDispatcher.addListener(noOpwebgl, 1);
    HookDispatcher.addListener(noOpwebgl, 2);
    return noOpwebgl;
}

export { noOpwebglHook };
