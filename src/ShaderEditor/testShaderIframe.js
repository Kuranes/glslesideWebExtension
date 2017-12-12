const onIframeLoad = function() {
    let canvas1, gl1, debugShader1, glExtSupported1;
    let canvas2, gl2, debugShader2, glExtSupported2;
    const shaderCache = {};

    function sendResult(msg) {
        msg.source = 'shaderIframeTester';
        window.parent.postMessage(msg, '*');
    }

    // TODO only "init" if received by client
    function initExtension(gl) {
        const supported = gl.getSupportedExtensions();

        const extList = new Array(supported.length);

        for (let i = 0, len = supported.length; i < len; ++i) {
            const sup = supported[i];
            extList[sup] = gl.getExtension(sup);
        }

        return extList;
    }
    function testExtension(extension, gl, glExtSupported) {
        const results = {
            success: glExtSupported[extension] !== undefined,
            test: 'extension'
        };
        return results;
    }
    function initGL(canvas, version) {
        let gl;
        try {
            gl = canvas.getContext('webgl' + (version !== 1 ? version.toString() : ''), {
                pureNative: true
            });
            gl.viewportWidth = canvas.width;
            gl.viewportHeight = canvas.height;
            return gl;
        } catch (e) {}
        if (!gl) {
            console.log('Could not initialise WebGL, sorry :-(');
        }
    }

    function getDebugShader(shader, debugShaderExt) {
        const Hlsl = debugShaderExt.getTranslatedShaderSource(shader);
        return Hlsl;
    }

    function testShader(gl, debugShader, type, source, results) {
        const s = gl.createShader(type);
        gl.shaderSource(s, source);

        const start = window.performance.now();
        gl.compileShader(s);

        results.debugShader = getDebugShader(s, debugShader);
        results.success = gl.getShaderParameter(s, gl.COMPILE_STATUS);
        results.compilationTime = (window.performance.now() - start).toFixed(0);

        const err = gl.getShaderInfoLog(s);
        if (err && err !== '') {
            results.error = err;
        } else {
            shaderCache[source] = s;
        }
        results.test = 'shader';
        return results;
    }

    function getShader(gl, shaderType, shaderText) {
        const s = shaderCache[shaderText];
        if (s) return s;
        const results = testShader(gl, undefined, shaderType, shaderText, {});
        if (!results.errror) return s;
        return undefined;
    }

    function testProgram(gl, VS, FS, results) {
        const shaderProgram = gl.createProgram();
        const vertexShader = getShader(gl, 'x-shader/x-vertex', VS);
        if (vertexShader === null) return false;
        gl.attachShader(shaderProgram, vertexShader);

        const fragShader = getShader(gl, 'x-shader/x-vertex', FS);
        if (fragShader === null) return false;
        gl.attachShader(shaderProgram, fragShader);

        const start = window.performance.now();
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            return false;
        }
        results.timing = start - window.performance.now();
        results.test = 'program';
        return true;
    }

    canvas1 = document.createElement('canvas');
    gl1 = initGL(canvas1, 1);
    debugShader1 = initExtension(gl1);
    glExtSupported1 = initExtension(gl1);
    debugShader1 = glExtSupported1['WEBGL_debug_shaders'];

    canvas2 = document.createElement('canvas');
    gl2 = initGL(canvas2, 2);
    glExtSupported2 = initExtension(gl2);
    debugShader2 = glExtSupported2['WEBGL_debug_shaders'];

    function receiveTask(event) {
        const msg = event.data;
        if (!msg || msg.dest !== 'shaderIframeTester') {
            return;
        }
        let results;
        switch (msg.test) {
            case 'shader':
                results = testShader(
                    msg.version === 2 ? gl2 : gl1,
                    msg.version === 2 ? debugShader2 : debugShader1,
                    msg.shaderType,
                    msg.shaderSource,
                    {
                        errLog: '',
                        success: false,
                        debugShader: ''
                    }
                );
                sendResult(results);
                break;
            case 'program':
                results = testProgram(
                    msg.shaderType,
                    msg.shaderSource,
                    msg.version === 2 ? gl2 : gl1
                );
                sendResult(results);
                break;
            case 'extension':
                results = testExtension(
                    msg.extension,
                    msg.webGLVersion === 2 ? gl2 : gl1,
                    msg.webGLVersion === 2 ? glExtSupported2 : glExtSupported1
                );
                sendResult(results);
                break;
        }
    }
    window.addEventListener('message', receiveTask, false);

    // console.log('iframe loaded');
};
onIframeLoad();

export { onIframeLoad };
