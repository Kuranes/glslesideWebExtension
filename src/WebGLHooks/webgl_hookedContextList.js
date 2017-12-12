function hookedContextList() {
    class contextInfoList {
        constructor(options, msgActions, contextInfoClass) {
            this.options = options;
            this.msgActions = msgActions;
            this.contextInfoClass = contextInfoClass;
            // @ts-ignore
            this.canvasContextInfoList = new Map(); // by gl pointer reference
            this.canvasContextInfoById = {}; // by Id
            // Edition request
            this.currentContextSelected = undefined;
            this.currentUniformSelected = undefined;
            this.currentProgramSelected = undefined;
            this.requestContextGL = undefined;
            this.screenshotRequest = false;
            this.pixelRequest = false;
            this.ignoreProgram = false;
            // execution flow
            this.currentContextInfo = undefined;
            this.currentContextInfoGL = undefined;
            this.currentContextInfoID = undefined;
            // last canvas with a gl command
            this.lastActiveCanvas = undefined;
        }
        getContextInfos(gl, version) {
            let contextInfo = this.canvasContextInfoList.get(gl);
            if (!contextInfo) {
                // when whole browser loads
                // extension can be loaded too late
                // need store somehow the context.
                contextInfo = this.addContextInfo(gl, version);
            }
            this.setCurrentContextInfo(contextInfo);
            return contextInfo;
        }
        setCurrentContextInfo(contextInfo) {
            this.currentContextInfo = contextInfo;
            this.currentContextInfoGL = contextInfo.gl;
            this.currentContextInfoID = contextInfo.uuid;
        }
        addContextInfo(gl, version, contextArguments) {
            // create new context with option and version number here.
            const contextInfo = new this.contextInfoClass(
                gl,
                version,
                this,
                this.msgActions,
                contextArguments
            );
            this.canvasContextInfoList.set(gl, contextInfo);
            this.canvasContextInfoById[contextInfo.id] = contextInfo;
            // store contextInfo on our hook dispatcher
            gl.__contextInfo = contextInfo;
            // console.log(contextInfo);
            // console.log(context.toString());
            this.msgActions.sendToServerEditor({
                action: 'webglContextAdd',
                id: contextInfo.id,
                version: version,
                url: window.location.href,
                isMainWebTab: !!window.parent
            });
            this.setCurrentContextInfo(contextInfo);
            this.msgActions.logMsg('context', this.canvasContextInfoList.size);
            this.msgActions.hookedLog(version, contextArguments);
            return contextInfo;
        }
        getContextInfosById(ctxtId, getLast) {
            const contextInfo = this.canvasContextInfoById[ctxtId];
            if (contextInfo && !getLast) return contextInfo;
            return this.lastActiveCanvas;
        }
    }

    return contextInfoList;
}
export { hookedContextList };
