function webglRecordStateHook(HookDispatcher, hookedContext, msgActions) {
    const isWebglObject = function(objectInstance) {
        return (
            objectInstance instanceof WebGLActiveInfo ||
            objectInstance instanceof WebGLBuffer ||
            objectInstance instanceof WebGLFramebuffer ||
            objectInstance instanceof WebGLProgram ||
            objectInstance instanceof WebGLRenderbuffer ||
            objectInstance instanceof WebGLShader ||
            objectInstance instanceof WebGLShaderPrecisionFormat ||
            objectInstance instanceof WebGLTexture ||
            objectInstance instanceof WebGLUniformLocation ||
            // @ts-ignore
            objectInstance instanceof WebGLVertexArrayObject
        );
    };
    const isStringifyable = function(arg) {
        const theType = typeof arg;
        return (
            theType === 'number' ||
            theType === 'boolean' ||
            theType === 'string' ||
            arg instanceof Array ||
            arg === null
        );
    };
    const isImage = function(arg) {
        if (
            arg instanceof HTMLImageElement ||
            arg instanceof SVGImageElement ||
            arg instanceof HTMLVideoElement ||
            arg instanceof HTMLCanvasElement ||
            arg instanceof Blob ||
            arg instanceof ImageData ||
            // @ts-ignore
            arg instanceof ImageBitmap ||
            // @ts-ignore
            arg instanceof OffscreenCanvas
        ) {
            return true;
        }
        return false;
    };
    /////////////////////

    const getGLVar = function(val, glVars) {
        if (!isWebglObject(val)) return null;
        // @ts-ignore
        const name = val.constructor.name;
        const list = glVars[name] || (glVars[name] = []);
        let index = list.indexOf(val);

        if (index === -1) {
            index = list.length;
            list.push(val);
        }

        return name + 's[' + index + ']';
    };

    const getGLImages = function(val, glImages) {
        // TODO: use something like Map/Set to "cache" images ?
        const index = glImages.length;

        // TODO: robust would be webgl to gl read pixel...
        //       (for compressed texture)
        // TODO: option to replace with placeholder for faster recording
        //       and smaller output
        const canvasImg = document.createElement('canvas');
        if (val.width && val.height) {
            canvasImg.width = val.width;
            canvasImg.height = val.height;
        } else {
            debugger;
        }

        canvasImg.getContext('2d').drawImage(val, 0, 0);
        const dataURL = canvasImg.toDataURL('image/png');
        glImages.push(dataURL);

        return 'images[' + index + ']';
    };
    const webglRecordState = function() {
        this.oldFrameCount = -1;
        this.oldWidth = 0;
        this.oldHeight = 0;
    };

    HookDispatcher.allMethods.forEach(function(f) {
        const postHookName = 'postHook' + f;
        webglRecordState.prototype[postHookName] = function(gl, args, hookedInfo, res) {
            const record = hookedInfo.record;
            const glVars = hookedInfo.glVars;
            const glImages = hookedInfo.glImageDataURL;
            if (!hookedInfo.recording) {
                return;
            }
            // size changes
            const newWidth = hookedInfo.getCanvasWidth();
            const newHeight = hookedInfo.getCanvasHeight();
            if (newWidth !== this.oldWidth || newHeight !== this.oldHeight) {
                this.oldWidth = newWidth;
                this.oldHeight = newHeight;
                record.push('  gl.canvas.width = ' + newWidth + ';');
                record.push('  gl.canvas.height = ' + newHeight + ';');
            }
            // arguments to strings
            // TODO: investigate how to do it robustly
            // at "sendRecord" time instead of runtime ?
            // or even better, at Playback time ?
            const argsAsStrings = [];
            for (let i = 0; i < args.length; i++) {
                const arg = args[i];

                // simple variable
                if (isStringifyable(arg)) {
                    argsAsStrings.push(JSON.stringify(arg));
                    continue;
                }
                // data
                if (ArrayBuffer.isView(arg)) {
                    argsAsStrings.push(
                        'new ' +
                            // @ts-ignore
                            arg.constructor.name +
                            '([' +
                            Array.prototype.slice.call(arg) +
                            '])'
                    );
                    continue;
                }
                if (isImage(arg)) {
                    const glImage = getGLImages(arg, glImages);
                    argsAsStrings.push(glImage);
                    continue;
                }
                // variable  declared with webgl
                // so we search by names
                const glVar = getGLVar(arg, glVars);
                if (glVar !== null) {
                    argsAsStrings.push(glVar);
                    continue;
                }

                argsAsStrings.push('null');
                console.warn('Error on GL var recording:', arg);
            }
            let text = 'gl.' + f + '(' + argsAsStrings.join(', ') + ');';
            const glVar = getGLVar(res, glVars);
            // no value, not storing the gl call resulting returned variable
            if (glVar !== null) text = glVar + ' = ' + text;
            record.push('  ' + text);
        };
    });

    HookDispatcher.addListener(webglRecordState, 1);
    HookDispatcher.addListener(webglRecordState, 2);
    return webglRecordState;
}

export { webglRecordStateHook };
