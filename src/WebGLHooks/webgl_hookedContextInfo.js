function hookedContextInfo() {
    class ContextInfo {
        // todO: canvas option at creation
        constructor(gl, version, handler, msgActions, contextArguments) {
            this.gl = gl;
            this.contextArguments = contextArguments;
            this.contextInfoHandler = handler;
            this.msgActions = msgActions;
            this.uuid = this.msgActions.createUUID();
            this.id = this.uuid;
            this.index = handler.canvasContextInfoList.size;
            this.canvas = gl.canvas;
            this.gl = gl;
            this.version = version;
            // todo: remove
            this.programsAndUniformByLocationProxies = {};
            // ressources
            this.programs = {};
            this.programsCount = 0;
            this.activeShaders = {};
            this.activePrograms = {};
            this.activeUniforms = {};
            this.uniforms = {};
            this.shaders = {};
            // allow not creating program when updating them
            this.ignoreProgram = undefined;
            this.activeTextures = {};
            this.textures = {};
            this.framebuffers = {};
            this.framebuffersCount = 0;
            this.activeFramebuffers = {};
            this.renderbuffers = {};
            this.renderbuffersCount = 0;
            this.vertexBuffers = {};
            this.indexBuffers = {};
            this.activeVertexBuffers = {};
            this.activeIndexBuffers = {};
            // execution flow
            this.commandList = {};
            this.currentProgram = false;
            this.currentProgramID = undefined;
            this.currentProgramInfo = undefined;
            // program under user edition
            this.selectedProgram = undefined;
            this.currentBoundTexture = null;
            this.currentFrameBuffer = -1;
            this.currentFrameBufferInfo = undefined;
            this.currentFrameBufferId = -1;
            // queries
            this.programTiming = undefined;
            this.currentQuery = undefined;
            this.currentQueryExt = undefined;
            // addlistener on demand only
            this.mouseMoveBinded = this.mouseMove.bind(this);
            this.canvasX = 0;
            this.canvasY = 0;
            this.canvasXNDC = 0;
            this.canvasYNDC = 0;
            this.canvasWidth = this.canvas.width;
            this.canvasHeight = this.canvas.height;
            this.pixelRequest = undefined;
            this.colorPixel = new Uint8Array(4);
            // in order to check frame count
            this.frameNum = 0;
            // check if ther was render calls
            // todo: do that in hook dispatcher time once for all hooks ?
            this.lastGLCallFrameNum = -1;
            // @ts-ignore
            if (window.ResizeObserver) {
                // @ts-ignore
                const myObserver = new ResizeObserver(() => {
                    // iterate over the entries, do something.
                    this.canvasWidth = this.canvas.width;
                    this.canvasHeight = this.canvas.height;
                });
                myObserver.observe(this.canvas);
            }
            // resources as stored variables
            this.glVars = {};
            this.glImageDataURL = [];
            // records of frames indexed by frame num
            this.record = [];
            this.frames = [this.record];
            // TODO: use button to on/Off ?
            // use frame num and frame countas a start/end
            this.recording = true;
        }
        getCanvasWidth() {
            // @ts-ignore
            return window.ResizeObserver ? this.canvasWidth : this.canvas.width;
        }

        getCanvasHeight() {
            // @ts-ignore
            return window.ResizeObserver ? this.canvasHeight : this.canvas.height;
        }

        // hackish way to detect a canvas was updated this frame
        // if a uniform is updated, means there was a gl call this  frame
        // maybe add also on all the synchronous calls
        // for when uploading resource during loading without drawing
        detectGlCall() {
            this.lastGLCallFrameNum = this.frameNum;
        }
        getWebglReferences() {
            return this.gl.refRdrCtxt;
        }
        advanceFrame() {
            if (this.lastGLCallFrameNum < this.frameNum && this.record.length === 0) {
                // no gl calls during this frame
                // only uniform  makes for a lastGLCall for now
                return false;
            }
            if (this.frameNum !== this.oldFrameCount) {
                this.oldFrameCount = this.frameNum;
                this.record = [];
                this.frames.push(this.record);
            }
            // count active ressources
            // TODO: count framebuffer and textures too
            // like programs still used last frame.
            if (this.lastActivePrograms) {
                //not used this frame
                for (const activeProgram in this.lastActivePrograms) {
                    if (!this.activePrograms[activeProgram]) {
                        const program = this.lastActivePrograms[activeProgram];
                        this.msgActions.sendToServerEditor({
                            ctxtId: this.id,
                            action: 'inactiveProgram',
                            uid: program.__uuid,
                            version: this.version
                        });
                    }
                }
                // not used last frame
                for (const activeProgram in this.activePrograms) {
                    if (!this.lastActivePrograms[activeProgram]) {
                        const program = this.activePrograms[activeProgram];
                        this.msgActions.sendToServerEditor({
                            ctxtId: this.id,
                            action: 'activeProgram',
                            uid: program.__uuid,
                            version: this.version
                        });
                    }
                }
            }
            this.lastActivePrograms = this.activePrograms;
            this.activePrograms = {};
            // if no framebuffer, might be no clear nor bindframebuffer
            // per frame, so pick here
            if (this.framebuffersCount === 0) {
                this.pickColorOrScreenShot();
            }
            // new frame
            this.frameNum++;
            return true;
        }
        // color or value picking
        // TODO: "program select by clicking on framebuffer" (not easy...)
        mouseMove(e) {
            const bRect = this.gl.canvas.getBoundingClientRect();
            const canvasX = e.clientX - bRect.left;
            const canvasY = e.clientY - bRect.top;
            this.canvasX = Math.floor(canvasX);
            this.canvasY = Math.floor(this.gl.canvas.clientHeight - canvasY);
            // normalized on 0,1
            this.canvasXNDC = canvasX / this.gl.canvas.clientWidth;
            this.canvasYNDC = (this.gl.canvas.clientHeight - canvasY) / this.gl.canvas.clientHeight;
        }
        enableColorPicking() {
            if (this.pixelRequest) {
                this.pixelRequest = false;
                this.gl.canvas.removeEventListener('mousemove', this.mouseMoveBinded);
                return;
            }
            this.pixelRequest = true;
            this.gl.canvas.addEventListener('mousemove', this.mouseMoveBinded, false);
        }
        screenShot(downloadFile) {
            // framebuffer without rendertexturespecial case
            if (!this.screenshotRequest) return;
            if (this.currentFrameBuffer === null) {
                // need preserverawbuffer===true
                this.screenshotRequest = undefined;
                const canvas = this.canvas;
                canvas.toBlob(
                    function(blob) {
                        //var newImg = document.createElement('img'),
                        const url = URL.createObjectURL(blob);
                        downloadFile(url, 'jpg');
                    },
                    'image/jpeg',
                    0.95
                );
                return;
            }
            const gl = this.gl;
            // now read a framebuffer
            // need framebuffer width,height, format, etc
            // much more complex stuff
            gl.readPixelsNative.call(
                gl,
                0,
                0,
                gl.drawingBufferWidth,
                gl.drawingBufferHeight,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                this.colorPixel
            );
        }
        pickColor() {
            if (!this.pixelRequest) return;
            if (this.currentFrameBuffer !== 0 && this.currentFrameBuffer !== null) {
                const gl = this.gl;
                // glReadPixel Value
                // glreadpixels do all this
                // while (
                //     // @ts-ignore
                //     gl.checkFramebufferStatusNative(gl.FRAMEBUFFER, this.currentFrameBuffer) !==
                //     gl.FRAMEBUFFER_COMPLETE
                // ) {}
                // gl.flushNative.apply(gl);
                // gl.finishNative.apply(gl);
                // pixel store, flipY, etc ?
                gl.readPixelsNative.call(
                    gl,
                    this.canvasX,
                    this.canvasY,
                    1,
                    1,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    this.colorPixel
                );
                if (this.msgActions.options.logShaderEditor) {
                    const err = gl.getErrorNative.apply(gl);
                    if (err) {
                        this.msgActions.logMsg('cannot pick framebuffer Err');
                        console.log(gl[err]); //gl.enum_strings[err]);
                        if (this.msgActions.options.debugShaderEditor) debugger;
                    }
                }
                this.msgActions.sendToServerEditor({
                    ctxtId: this.id,
                    action: 'pixelValue',
                    value: this.colorPixel.toString(),
                    version: this.version
                });
                //pixelRequest = undefined;
            }
        }
        pickColorOrScreenShot() {
            this.screenShot();
            this.pickColor();
        }
        enableScreenshotRequest() {
            this.screenshotRequest = true;
            this.screenshotRequestFrameBuffer = null;
            if (this.selectedProgram) {
                this.screenshotRequestFrameBuffer = this.selectedProgram.frameBuffer;
            }
        }
        findAttributeByIndex(program, index) {
            for (let j = 0; j < program.attributes.length; j++) {
                const a = program.attributes[j];
                if (a.originalIndex === index) {
                    return a;
                }
            }
            return null;
        }
        findProgramInfoProxyById(id) {
            if (this.programs[id]) {
                return this.programs[id];
            }
            return null;
        }
        findProgramProxyByRealProgramId(id) {
            if (this.programs[id]) {
                return this.programs[id];
            }
            /*
            for (var j in programsProxies) {
                if (programsProxies[j].programReal.__uuid === id) {
                    return programsProxies[j];
                }
            }
    */
            return null;
        }
        findProgramInfoProxyByIdByLocationProxy(locationProxy) {
            if (locationProxy === null || locationProxy === undefined) return null;
            let programsAndUniform = this.programsAndUniformByLocationProxies[locationProxy.__uuid];
            if (programsAndUniform) {
                return programsAndUniform;
            }
            for (const j in this.programs) {
                const p = this.programs[j];
                for (let k = 0; k < p.uniforms.length; k++) {
                    const u = p.uniforms[k];
                    if (u.locationProxy.__uuid === locationProxy.__uuid) {
                        programsAndUniform = {
                            p: p,
                            u: u
                        };
                        u.programUniformOriginal = programsAndUniform;
                        this.programsAndUniformByLocationProxies[
                            locationProxy.__uuid
                        ] = programsAndUniform;
                        return programsAndUniform;
                    }
                }
            }
            return null;
        }
        findShader(shaderToFind) {
            if (this.shaders[shaderToFind.__uuid]) {
                return this.shaders[shaderToFind.__uuid];
            }
            return null;
        }
        removeRenderBuffer(renderBuffer) {
            delete this.renderbuffers[renderBuffer.__uuid];
            this.renderbuffersCount--;
        }
        addRenderBuffer(renderBuffer) {
            const renderBufferInfo = {
                renderBuffer: renderBuffer,
                uid: undefined,
                target: undefined,
                // single text and program
                // postprocessing
                texture: undefined,
                program: undefined,
                // multiple program
                // not postprocessing ?
                programs: [],
                attachments: [],
                textures: [],
                // auto detect
                postprocessing: false,
                renderbufferName: ''
            };
            this.renderbuffers[renderBuffer.__uuid] = renderBufferInfo;
            renderBuffer.__renderBufferInfo = renderBufferInfo;
            this.renderbuffersCount++;
            //this.msgActions.logMsg( 'addrenderBuffer', renderBuffer.__uuid );
            this.setCurrentRenderBuffer(renderBuffer);
            return renderBufferInfo;
        }
        setCurrentRenderBuffer(renderBuffer) {
            if (!renderBuffer) {
                this.currentrenderBuffer = undefined;
                this.currentrenderBufferInfo = undefined;
                this.currentrenderBufferId = -1;
                return;
            }
            const renderBufferInfo = renderBuffer.__renderBufferInfo
                ? renderBuffer.__renderBufferInfo
                : this.renderbuffers[renderBuffer.__uuid];
            this.currentrenderBuffer = renderBuffer;
            this.currentrenderBufferInfo = renderBufferInfo;
            this.currentrenderBufferId = renderBuffer.__uuid;
            return renderBufferInfo;
        }
        removeFrameBuffer(frameBuffer) {
            delete this.framebuffers[frameBuffer.__uuid];
            this.framebuffersCount--;
        }
        addFrameBuffer(frameBuffer) {
            const frameBufferInfo = {
                frameBuffer: frameBuffer,
                uid: undefined,
                target: undefined,
                // single text and program
                // postprocessing
                texture: undefined,
                program: undefined,
                // multiple program
                // not postprocessing ?
                programs: [],
                attachments: [],
                textures: [],
                // auto detect
                postprocessing: false,
                framebufferName: ''
            };
            this.framebuffers[frameBuffer.__uuid] = frameBufferInfo;
            frameBuffer.__frameBufferInfo = frameBufferInfo;
            this.framebuffersCount++;
            //this.msgActions.logMsg( 'addFrameBuffer', frameBuffer.__uuid );
            this.setCurrentFrameBuffer(frameBuffer);
            return frameBufferInfo;
        }
        setCurrentFrameBuffer(frameBuffer) {
            if (!frameBuffer) {
                this.currentFrameBuffer = undefined;
                this.currentFrameBufferInfo = undefined;
                this.currentFrameBufferId = -1;
                return;
            }
            const frameBufferInfo = frameBuffer.__frameBufferInfo
                ? frameBuffer.__frameBufferInfo
                : this.framebuffers[frameBuffer.__uuid];
            this.currentFrameBuffer = frameBuffer;
            this.currentFrameBufferInfo = frameBufferInfo;
            this.currentFrameBufferId = frameBuffer.__uuid;
            return frameBufferInfo;
        }
        addShader(shader, type) {
            const shaderInfo = {
                shader: shader,
                type: type
            };
            this.shaders[shader.__uuid] = shaderInfo;
            shader.__shaderInfo = shaderInfo;
            //this.msgActions.logMsg( 'addShader', shader.__uuid, type );
            return shaderInfo;
        }
        // So for now,
        // if we don't reference it, it doesn't exists
        // so we don't send to server, thus ineditable
        // and old program with its binding//callback "compile"
        // thus "its works" to no do anything
        // which is in reality
        // that the use change "the reference"
        // which also the new programReal
        // so the new "Program"
        // should keep:
        //  -- the old uuid
        // which is this.ignoreProgram
        //  -- edit history ?
        recompileProgramFromUser(program) {
            const uid = this.ignoreProgram;
            program.__uuid = uid;
            // reuse oldProgramInfo
            const oldUID = this.ignoreProgram;
            const programInfo = this.programs[oldUID];
            programInfo.programReal = program;
            programInfo.original = program;
            // user rebinds them
            // resets them on server side ?
            ///
            programInfo.uniforms = [];
            programInfo.uniformsByName = [];
            programInfo.attributes = [];
            programInfo.attributesByName = [];
            programInfo.attributesByIndex = [];
            programInfo.vertexAttribArrayArgs = [];
            ///
            this.programs[program.__uuid] = programInfo;
            program.__programInfo = programInfo;
            // server must also reset
            // its uniforms/attributes/ info
            // tied to the program
            this.msgActions.sendToServerEditor({
                ctxtId: this.id,
                action: 'replaceProgram',
                uid: program.__uuid,
                version: this.version
            });
            //this.msgActions.logMsg('addProgram', uid);
            this.setCurrentProgram(program);
            //this.msgActions.logMsg('recompileProgram', uid);
            return programInfo;
        }
        addProgram(program) {
            if (this.ignoreProgram) {
                // special case
                // ignoreProgram means
                // that the new "Program" replaces the old
                this.recompileProgramFromUser(program);
                return;
            }
            const uid = this.msgActions.createUUID();
            // program is the program reference
            // that the webgl user manipulate
            // programReal is when we override it
            // original == programm referce
            const programInfo = {
                programReal: program,
                original: program,
                uniforms: [],
                uniformsByName: [],
                attributes: [],
                attributesByName: [],
                attributesByIndex: [],
                vertexAttribArrayArgs: [],
                vertexShader: undefined,
                fragmentShader: undefined,
                framebuffer: undefined,
                __uuid: uid
            };
            program.__programInfo = programInfo;
            program.__uuid = uid;
            this.programs[uid] = programInfo;
            this.programsCount++;
            this.msgActions.sendToServerEditor({
                ctxtId: this.id,
                action: 'addProgram',
                uid: program.__uuid,
                version: this.version
            });
            //this.msgActions.logMsg('addProgram', p.__uuid);
            this.setCurrentProgram(program);
            return programInfo;
        }
        setCurrentProgram(program) {
            if (!program) {
                this.currentProgram = undefined;
                this.currentProgramID = undefined;
                this.currentProgramInfo = undefined;
                return;
            }
            const programInfo = program.__programInfo
                ? program.__programInfo
                : this.programs[program.__uuid];
            this.currentProgram = programInfo ? programInfo.programReal : program;
            this.currentProgramID = program.__uuid;
            this.currentProgramInfo = programInfo;
            return programInfo;
        }
        setShaderName(id, type, name) {
            this.msgActions.sendToServerEditor({
                ctxtId: this.id,
                action: 'setShaderName',
                uid: id,
                type: type,
                name: name,
                version: this.version
            });
        }
        extractShaderName(source) {
            let name = '';
            let m;
            const re = /#define[\s]+SHADER_NAME[\s]+([\S]+)(\n|$)/gi;
            if ((m = re.exec(source)) !== null) {
                if (m.index === re.lastIndex) {
                    re.lastIndex++;
                }
                name = m[1];
            }
            // detect shader kind and create shader kind name
            // - if normal or tagnet and no vertex color == postproc)
            // - vertex buffer very small
            // - single draw command over single program binded
            // auto create names "Program 1, 2, etc"
            //if (name === '') {
            //    name = this.msgActions.createUUID().toString().slice(0,6);
            //}
            return name;
        }
        updateLocation(id, programOriginal) {
            const programReal = programOriginal.programReal;
            const name = programOriginal.name; // program nane
            const gl = this.gl;
            // get again all uniform location
            // use this.getWebglReferences().getActiveUniform() ?
            for (let j = 0; j < programOriginal.uniforms.length; j++) {
                const uniformInfo = programOriginal.uniforms[j];
                const proxyID = uniformInfo.locationProxy.__uuid;
                //var locationOld = this.getWebglReferences().getUniformLocation.apply(u.gl, [previousRealProgram, u.name]);
                //if (locationOld === null) continue;
                uniformInfo.location = gl.getUniformLocationNative.apply(gl, [
                    programReal,
                    uniformInfo.name
                ]);
                if (uniformInfo.location === null) {
                    uniformInfo.location = { unbindable: true };
                }
                uniformInfo.location.__proxy__uuid = proxyID;
                uniformInfo.location.__uuid = this.msgActions.createUUID();
                uniformInfo.location.__program__uuid = id;
                uniformInfo.location.__p__uuid = programReal.__uuid;
                uniformInfo.location.programUniformOriginal = {
                    p: programOriginal,
                    u: uniformInfo
                };
                if (uniformInfo.value !== null && !uniformInfo.location.unbindable) {
                    uniformInfo.value[0] = uniformInfo.location;
                    gl[uniformInfo.type + 'Native'].apply(gl, uniformInfo.value);
                    const err = gl.getErrorNative();
                    if (err) {
                        this.sendCompilationResult(id, false, name, gl[err]);
                        if (this.msgActions.options.logShaderEditor)
                            this.msgActions.logMsg(
                                'Shader' +
                                    name +
                                    ' ORIG: ' +
                                    proxyID +
                                    ' ' +
                                    uniformInfo.name +
                                    ' MAPS TO ' +
                                    uniformInfo.location.__uuid +
                                    ' : ' +
                                    this.getWebglReferences().enum_strings[err]
                            );
                        if (this.contextInfoHandler.options.debugShaderEditor) debugger;
                        return;
                    }
                }
                //this.msgActions.logMsg('updated uniform location "' + u.name + '"" to ' + u.location.__uuid + ' (was ' + proxyID + ')');
            }
        }
        // update no question asked
        doUpdateProgram(id, vSource, fSource, program) {
            if (program.programReal.__SPECTOR_rebuildProgram) {
                this.ignoreProgram = id; //program.__uuid.
                // PROGRAM CHANGE
                program.programReal.__SPECTOR_rebuildProgram(
                    vSource,
                    fSource,
                    function(/*programCompiled*/) {
                        // we so we get a new progam
                        /*
                        var newVersion = program.programReal.version + 1;
                        program.programReal = programCompiled;
                        programCompiled.version = newVersion;
                        program.version = programCompiled.version;
                        this.currentProgram = programCompiled;
                        program.name = programCompiled.name;
                        updateLocation(id, program);
                    */
                        this.sendCompilationResult(id, true, name);
                        this.ignoreProgram = false;
                    }.bind(this),
                    function(errorCompil) {
                        console.log(errorCompil);
                        this.sendCompilationResult(id, false, name);
                        this.ignoreProgram = false;
                    }.bind(this)
                );
            } else {
                program.scheduledUpdate = true;
                program.scheduledUpdateID = id;
                program.scheduledVSource = vSource;
                program.scheduledFSource = fSource;
            }
        }
        // update only if change
        onUpdateProgram(id, vSource, fSource) {
            const program = this.findProgramInfoProxyById(id);
            let diff = false;
            if (!vSource) vSource = program.vertexShaderSource;
            else diff = diff || vSource !== program.vertexShaderSource;
            if (!fSource) fSource = program.fragmentShaderSource;
            else diff = diff || fSource !== program.fragmentShaderSource;
            if (!diff) return;
            this.doUpdateProgram(id, vSource, fSource, program);
        }
        sendCompilationResult(id, result, name, logCompil) {
            if (id === this.programTracker) {
                //this.msgActions.logMsg("sendCompilationResult" + " " +  id + " tracked: " + this.programTracker + " results: " + (result ? "true" : "false"));
                this.msgActions.sendToServerEditor({
                    ctxtId: this.id,
                    action: 'programUsed',
                    name: name,
                    id: id,
                    result: result ? true : false,
                    log: logCompil
                });
                this.programTracker = undefined;
            }
        }
        getQueryResult(glCtx /*, query*/) {
            if (!glCtx.getQueryParameter) {
                glCtx.getQueryParameter = this.currentQueryExt.getQueryObjectEXT.bind(
                    this.currentQueryExt
                );
                glCtx.QUERY_RESULT_AVAILABLE = this.currentQueryExt.QUERY_RESULT_AVAILABLE_EXT;
                glCtx.QUERY_RESULT = this.currentQueryExt.QUERY_RESULT_EXT;
            }
            const timeElapsedMs =
                glCtx.getQueryParameter(this.currentQuery, glCtx.QUERY_RESULT) / 1000000.0;
            const programInfo = this.findProgramInfoProxyById(this.programTiming);
            //console.log('------------ timed: ' + timeElapsedMs + ' for ' +  this.programTiming);
            this.msgActions.sendToServerEditor({
                ctxtId: this.id,
                action: 'programTiming',
                name: programInfo.name,
                result: timeElapsedMs
            });
            this.programTiming = undefined;
            this.currentQuery = undefined;
        }
        scheduledUpdateProgram(id, vSource, fSource) {
            //var validCompilation = true;
            const programOriginal = this.findProgramInfoProxyById(id);
            this.msgActions.logMsg('update ' + programOriginal.name, id);
            const gl = this.gl;
            const p = this.getWebglReferences().createProgram.apply(gl);
            p.__uuid = this.msgActions.createUUID();
            // create New Program and uniform and attribute
            const previousRealProgram = programOriginal.programReal;
            let source, name, err, logCompil;
            const vs = this.getWebglReferences().createShader.apply(gl, [gl.VERTEX_SHADER]);
            source = vSource !== undefined ? vSource : programOriginal.vertexShaderSource;
            this.getWebglReferences().shaderSource.apply(gl, [vs, source]);
            this.getWebglReferences().compileShader.apply(gl, [vs]);
            name = this.extractShaderName(source);
            if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
                logCompil = gl.getShaderInfoLog(vs);
                this.sendCompilationResult(id, false, name, logCompil);
                this.msgActions.logMsg();
                if (this.contextInfoHandler.options.debugShaderEditor) debugger;
                return;
            }
            this.setShaderName(programOriginal.original.__uuid, gl.VERTEX_SHADER, name);
            p.name = name;
            this.getWebglReferences().attachShader.apply(gl, [p, vs]);
            const fs = this.getWebglReferences().createShader.apply(gl, [gl.FRAGMENT_SHADER]);
            source = fSource !== undefined ? fSource : programOriginal.fragmentShaderSource;
            this.getWebglReferences().shaderSource.apply(gl, [fs, source]);
            this.getWebglReferences().compileShader.apply(gl, [fs]);
            if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
                logCompil = gl.getShaderInfoLog(fs);
                this.sendCompilationResult(id, false, name, logCompil);
                this.msgActions.logMsg(gl.getShaderInfoLog(fs));
                if (this.contextInfoHandler.options.debugShaderEditor) debugger;
                return;
            }
            name = this.extractShaderName(source);
            this.setShaderName(programOriginal.original.__uuid, gl.FRAGMENT_SHADER, name);
            p.name = name;
            this.getWebglReferences().attachShader.apply(gl, [p, fs]);
            this.getWebglReferences().linkProgram.apply(gl, [p]);
            /// keep trace of previously binded
            let previousBindedProgram = this.currentProgram;
            if (previousBindedProgram === previousRealProgram) {
                previousBindedProgram = false;
            }
            let useProgramFail = false;
            this.getWebglReferences().useProgram.apply(gl, [p]);
            err = gl.getError();
            if (err) {
                console.log(this.getWebglReferences().enum_strings[err]);
                logCompil = gl.getProgramInfoLog(p);
                useProgramFail = true;
                this.sendCompilationResult(id, false, name, logCompil);
                if (this.contextInfoHandler.options.logShaderEditor)
                    this.msgActions.logMsg('Shader' + p.name + ' doesnt compile on client');
                if (this.contextInfoHandler.options.debugShaderEditor) debugger;
            }
            let uniformInfo;
            // get again all uniform location
            // use this.getWebglReferences().getActiveUniform() ?
            for (let j = 0; j < programOriginal.uniforms.length; j++) {
                uniformInfo = programOriginal.uniforms[j];
                const proxyID = uniformInfo.locationProxy.__uuid;
                //var locationOld = this.getWebglReferences().getUniformLocation.apply(u.gl, [previousRealProgram, u.name]);
                //if (locationOld === null) continue;
                uniformInfo.location = this.getWebglReferences().getUniformLocation.apply(gl, [
                    p,
                    uniformInfo.name
                ]);
                if (uniformInfo.location === null) uniformInfo.location = { unbindable: true };
                uniformInfo.location.__proxy__uuid = proxyID;
                uniformInfo.location.__uuid = this.msgActions.createUUID();
                uniformInfo.location.__program__uuid = id;
                uniformInfo.location.__p__uuid = p.__uuid;
                uniformInfo.location.programUniformOriginal = {
                    p: programOriginal,
                    u: uniformInfo
                };
                if (uniformInfo.value !== null && !uniformInfo.location.unbindable) {
                    uniformInfo.value[0] = uniformInfo.location;
                    this.getWebglReferences()[uniformInfo.type].apply(gl, uniformInfo.value);
                    err = gl.getError();
                    if (err) {
                        this.sendCompilationResult(
                            id,
                            false,
                            name,
                            this.getWebglReferences().enum_strings[err]
                        );
                        if (this.contextInfoHandler.options.logShaderEditor)
                            this.msgActions.logMsg(
                                'Shader' +
                                    p.name +
                                    ' ORIG: ' +
                                    proxyID +
                                    ' ' +
                                    uniformInfo.name +
                                    ' MAPS TO ' +
                                    uniformInfo.location.__uuid +
                                    ' : ' +
                                    this.getWebglReferences().enum_strings[err]
                            );
                        if (this.contextInfoHandler.options.debugShaderEditor) debugger;
                        return;
                    }
                }
                //this.msgActions.logMsg('updated uniform location "' + u.name + '"" to ' + u.location.__uuid + ' (was ' + proxyID + ')');
            }
            /*
            All vertex attribute locations have to be the same in the re-linked program. In order to guarantee this, it's
            necessary to call getActiveAttrib on the original program from 0..getProgramParameter(program, ACTIVE_ATTRIBUTES),
            record the locations of those attributes, and then call bindAttribLocation on the program object for each of them,
            to re-assign them before re-linking. Otherwise you're leaving it to chance that the OpenGL implementation
            will assign the vertex attributes to the same locations.
            */
            const lAttrib = gl.getProgramParameter(previousRealProgram, gl.ACTIVE_ATTRIBUTES);
            const attribMap = [];
            for (let r = 0; r < lAttrib; r++) {
                const attribInfo = gl.getActiveAttrib(previousRealProgram, r);
                // {name, size, type }
                attribMap.push(attribInfo);
            }
            if (programOriginal.vao) {
                const ctx = this;
                if (ctx.version === 1) {
                    // WebGL: INVALID_OPERATION: drawElements: no buffer is bound to enabled attribute
                    // to force it again, but doesn't seem to fix it
                    const ext = gl.getExtension('OES_vertex_array_object');
                    gl.bindVertexArrayOESNative.apply(ext, [programOriginal.vao]);
                } else {
                    gl.bindVertexArrayNative.apply(gl, [programOriginal.vao]);
                }
            }
            for (let m = 0; m < programOriginal.attributes.length; m++) {
                const a = programOriginal.attributes[m];
                a.index = this.getWebglReferences().getAttribLocation.apply(gl, [
                    previousRealProgram,
                    uniformInfo.name
                ]);
                this.getWebglReferences().bindAttribLocation.apply(gl, [
                    p,
                    uniformInfo.index,
                    uniformInfo.name
                ]);
                if (uniformInfo.size) {
                    this.getWebglReferences().vertexAttribPointer.apply(gl, [
                        uniformInfo.index,
                        uniformInfo.size,
                        uniformInfo.type,
                        uniformInfo.normalized,
                        uniformInfo.stride,
                        uniformInfo.offset
                    ]);
                    err = gl.getError();
                    if (err) {
                        this.sendCompilationResult(
                            id,
                            false,
                            name,
                            this.getWebglReferences().enum_strings[err]
                        );
                        if (this.contextInfoHandler.options.logShaderEditor)
                            this.msgActions.logMsg('Shader' + p.name + ' vertexAttribPointer ');
                        if (this.contextInfoHandler.options.debugShaderEditor) debugger;
                        return;
                    }
                }
                this.getWebglReferences().enableVertexAttribArray.apply(gl, [uniformInfo.index]);
                err = gl.getError();
                if (err) {
                    this.sendCompilationResult(
                        id,
                        false,
                        name,
                        this.getWebglReferences().enum_strings[err]
                    );
                    if (this.contextInfoHandler.options.logShaderEditor)
                        this.msgActions.logMsg('Shader' + p.name + ' enableVertexAttribArray ');
                    if (this.contextInfoHandler.options.debugShaderEditor) debugger;
                    return;
                }
                //this.msgActions.logMsg('updated attribute location ' + u.name);
            }
            if (useProgramFail) {
                this.getWebglReferences().useProgram.apply(gl, [p]);
                err = gl.getError();
                if (err) {
                    logCompil = gl.getProgramInfoLog(p);
                    this.sendCompilationResult(id, false, name, logCompil);
                    if (this.contextInfoHandler.options.logShaderEditor)
                        this.msgActions.logMsg(
                            'Shader' +
                                p.name +
                                ' doesnt compile on client' +
                                logCompil +
                                ' err: ' +
                                this.getWebglReferences().enum_strings[err]
                        );
                    if (this.contextInfoHandler.options.debugShaderEditor) debugger;
                    return;
                }
            }
            this.msgActions.logMsg('updated Program ' + p.name + ' : ' + id);
            // PROGRAM CHANGE
            programOriginal.programReal = p;
            p.version = previousRealProgram.version + 1;
            programOriginal.version = p.version;
            this.currentProgram = p;
            programOriginal.name = p.name;
            this.sendCompilationResult(id, true, name);
            if (previousBindedProgram) {
                //this.getWebglReferences().useProgram.apply(gl, [previousBindedProgram]);
                // @ts-ignore
                this.msgActions.logMsg(
                    // @ts-ignore
                    'not restored previous binded Program ' + previousBindedProgram.name
                );
            }
        }
        selectProgram(prgId) {
            let programInfo = this.programs[prgId];
            if (!programInfo) programInfo = this.findProgramInfoProxyById(prgId);
            this.msgActions.logMsg('Shader ' + programInfo.name + ' selected ' + prgId);
            this.selectedProgram = this.programs[prgId];
            this.msgActions.sendToServerEditor({
                ctxtId: this.id,
                action: 'setVSSource',
                sourceCode: this.msgActions.encodeSource(programInfo.vertexShaderSource),
                uid: prgId
            });
            this.msgActions.sendToServerEditor({
                ctxtId: this.id,
                action: 'setFSSource',
                sourceCode: this.msgActions.encodeSource(programInfo.fragmentShaderSource),
                uid: prgId
            });
        }

        downloadTextRecord(downloadText) {
            let text = `<html><body><canvas id="recordPlayer"></body>';
                <script>
             `;
            for (const key in this.glVars) {
                text += '  var ' + key + 's = [];\n';
            }
            if (this.glImageDataURL.length) {
                text += '  var images  = [];\n';

                for (let glImageData = 0; glImageData < this.glImageDataURL.length; glImageData++) {
                    const glImage = this.glImageDataURL[glImageData];

                    text += '  images.push(new Image());\n';
                    text += '  images[' + glImageData + '].src = "' + glImage + '"\n';
                }
            }
            text += `function renderRecords(gl, frameNum) {
                 switch(frameNum){`;
            for (let frame = 0; frame < this.frames.length; frame++) {
                const record = this.frames[frame];
                text += `case ${frame}:`;
                text += record.join('\n');
                text += 'break;';
            }
            text += '}\n';
            text += `}
            let frameNum = 0;
            function raf() {
                renderRecords(gl, frameNum++);
                requestAnimationFrame(raf);
            }
            const canvas = document.getElementById('recordPlayer');            
            const gl = canvas.getContext('webgl${this.version}');
            requestAnimationFrame(raf);
            </script></html>`;

            downloadText(text, 'html', 'text/html');

            //TODO: version where the downloadText instead send to server
            // const msg = {
            //     ctxtId: this.id,
            //     action: 'RecordState',
            //     Record: text
            // };
            // //console.log('GL Record', msg);
            // this.msgActions.sendToServerEditor(msg);
        }
        //////////////////////////

        /////////////////////////
    }

    return ContextInfo;
}
export { hookedContextInfo };
