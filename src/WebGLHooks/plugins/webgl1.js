function memcpy(src, srcOffset, dst, dstOffset, length) {
    let i;

    src = src.subarray || src.slice ? src : src.buffer;
    dst = dst.subarray || dst.slice ? dst : dst.buffer;

    src = srcOffset
        ? src.subarray
            ? src.subarray(srcOffset, length && srcOffset + length)
            : src.slice(srcOffset, length && srcOffset + length)
        : src;

    if (dst.set) {
        dst.set(src, dstOffset);
    } else {
        for (i = 0; i < src.length; i++) {
            dst[i + dstOffset] = src[i];
        }
    }

    return dst;
}

function webgl1Hook(HookDispatcher, hookedContext, msgActions, options) {
    // access to native original function
    const refRdrCtxt = HookDispatcher.referencesWebGL1;

    // the Hook Listener object
    const RdrCtxt = function() {
        this.hookVersion = 1;
        this.refRdrCtxt = refRdrCtxt;
    };
    //RdrCtxt.prototype.hookVersion = 1;
    //RdrCtxt.prototype.refRdrCtxt = refRdrCtxt;

    RdrCtxt.prototype.drawElements = function(gl, args, hookedInfo) {
        if (hookedInfo.currentQuery) {
            hookedInfo.getQueryResult(gl, hookedInfo.currentQuery);
        }

        if (!hookedInfo.programTiming || hookedInfo.programTiming !== hookedInfo.currentProgramID) {
            return gl.drawElementsNative.apply(gl, args);
        }

        const ext =
            hookedInfo.currentQueryExt ||
            gl.getExtensionNative.call(gl, 'EXT_disjoint_timer_query');
        hookedInfo.currentQueryExt = ext;

        const query = ext.createQueryEXT();
        hookedInfo.currentQuery = query;

        ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, query);
        const res = gl.drawElementsNative.apply(gl, args);
        ext.endQueryEXT(ext.TIME_ELAPSED_EXT);

        return res;
    };
    RdrCtxt.prototype.drawArrays = function(gl, args, hookedInfo) {
        if (hookedInfo.currentQuery) hookedInfo.getQueryResult(gl, hookedInfo.currentQuery);

        if (!hookedInfo.programTiming || hookedInfo.programTiming !== hookedInfo.currentProgramID) {
            return gl.drawArraysNative.apply(gl, args);
        }

        const ext =
            hookedInfo.currentQueryExt || hookedInfo.getExtensionNative('EXT_disjoint_timer_query');
        hookedInfo.currentQueryExt = ext;

        const query = ext.createQueryEXT();
        hookedInfo.currentQuery = query;

        ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, query);
        const res = gl.drawArraysNative.apply(gl, args);
        ext.endQueryEXT(ext.TIME_ELAPSED_EXT);

        return res;
    };

    RdrCtxt.prototype.createProgram = function(gl, args, hookedInfo) {
        const res = gl.createProgramNative.apply(gl, args);
        // return a false resource ?
        //return hookedInfo.addProgram(res);
        hookedInfo.addProgram(res);
        return res;
    };

    RdrCtxt.prototype.createShader = function(gl, args, hookedInfo) {
        const res = gl.createShaderNative.apply(gl, args);
        res.__uuid = msgActions.createUUID();
        const type = args[0];
        hookedInfo.addShader(res, type);
        return res;
    };

    RdrCtxt.prototype.shaderSource = function(gl, args, hookedInfo) {
        let shaderInfo = args[0].__shaderInfo;
        if (!shaderInfo) {
            shaderInfo = hookedInfo.findShader(args[0]);
        }
        shaderInfo.sourceCode = args[1];
        shaderInfo.name = hookedInfo.extractShaderName(shaderInfo.sourceCode);

        if (shaderInfo.pAttachedWithoutSource) {
            const p = shaderInfo.pAttachedWithoutSource;

            if (shaderInfo.type === gl.VERTEX_SHADER) {
                p.vertexShaderSource = shaderInfo.sourceCode;
                hookedInfo.setShaderName(p.original.__uuid, shaderInfo.type, shaderInfo.name);
                p.name = shaderInfo.name;
            }

            if (shaderInfo.type === gl.FRAGMENT_SHADER) {
                p.fragmentShaderSource = shaderInfo.sourceCode;
                hookedInfo.setShaderName(p.original.__uuid, shaderInfo.type, shaderInfo.name);
                p.name = shaderInfo.name;
            }

            shaderInfo.pAttachedWithoutSource = undefined;
        }
        return gl.shaderSourceNative.apply(gl, args);
        //msgActions.logMsg( 'shaderSource', s.source );
    };

    RdrCtxt.prototype.attachShader = function(gl, args, hookedInfo) {
        const origProgram = args[0];
        const origShader = args[1];

        const programInfo = origProgram.__programInfo;
        if (!programInfo) {
            hookedInfo.findProgramInfoProxyById(origProgram.__uuid);
        }
        let shaderInfo = origShader.__shaderInfo;
        if (!shaderInfo) {
            shaderInfo = hookedInfo.findShader(args[0]);
        }
        if (shaderInfo.type === gl.VERTEX_SHADER) {
            programInfo.vertexShader = shaderInfo;
            if (shaderInfo.sourceCode) {
                programInfo.vertexShaderSource = shaderInfo.sourceCode;
                hookedInfo.setShaderName(
                    programInfo.original.__uuid,
                    shaderInfo.type,
                    shaderInfo.name
                );
                programInfo.name = shaderInfo.name;
            } else {
                shaderInfo.pAttachedWithoutSource = programInfo;
            }
        }
        if (shaderInfo.type === gl.FRAGMENT_SHADER) {
            programInfo.fragmentShader = shaderInfo;
            if (shaderInfo.sourceCode) {
                programInfo.fragmentShaderSource = shaderInfo.sourceCode;
                hookedInfo.setShaderName(
                    programInfo.original.__uuid,
                    shaderInfo.type,
                    shaderInfo.name
                );
                programInfo.name = shaderInfo.name;
            } else {
                shaderInfo.pAttachedWithoutSource = programInfo;
            }
        }
        return gl.attachShaderNative.apply(gl, args);
    };

    RdrCtxt.prototype.useProgram = function(gl, args, hookedInfo) {
        const p = args[0];
        let res;
        if (p && p.__uuid) {
            // keep count of active programs
            hookedInfo.activePrograms[p.__uuid] = p;
            // get metadata
            let programInfo = p.__programInfo;
            if (!programInfo) {
                programInfo = hookedInfo.findProgramInfoProxyById(p.__uuid);
            }

            if (programInfo.scheduledUpdate) {
                hookedInfo.scheduledUpdateProgram(
                    programInfo.scheduledUpdateID,
                    programInfo.scheduledVSource,
                    programInfo.scheduledFSource
                );
                programInfo.scheduledUpdate = false;
                programInfo.scheduledUpdateID = undefined;
                programInfo.scheduledVSource = undefined;
                programInfo.scheduledFSource = undefined;
            }

            programInfo.frameBuffer = hookedInfo.currentFrameBufferInfo;

            hookedInfo.setCurrentProgram(p);

            //msgActions.logMsg( '>>> useProgram', p.__uuid )
            res = gl.useProgramNative.apply(gl, [programInfo.programReal]);

            if (options.logShaderEditor) {
                const err = gl.getError();
                if (err) {
                    msgActions.logMsg(
                        'Shader' + programInfo.name + ' Err: ' + gl[err] //enum_strings[err]
                    );
                    if (options.debugShaderEditor) debugger;
                }
            }
        } else {
            //if (:this.__nullArray)this.__nullArray = [null]
            // res = gl.useProgramNative.apply(gl, this.__nullArray );
            res = gl.useProgramNative.apply(gl, args);
            hookedInfo.setCurrentProgram(undefined);
        }
        return res;
    };

    RdrCtxt.prototype.getUniformLocation = function(gl, args, hookedInfo) {
        const program = args[0];
        const uName = args[1];

        const programInfo = program.__programInfo;
        if (!programInfo) {
            hookedInfo.findProgramInfoProxyById(program.__uuid);
        }
        let uniformInfo = programInfo.uniformsByName[uName];
        if (uniformInfo) {
            return uniformInfo.locationProxy;
        }

        const res = gl.getUniformLocationNative.apply(gl, [programInfo.programReal, uName]);
        if (res) {
            res.__uuid = msgActions.createUUID();

            res.__program__uuid = program.__uuid;
            res.__p__uuid = programInfo.programReal.__uuid;
            res.__programInfo = programInfo;
            uniformInfo = {
                name: uName,
                value: null,
                type: null,
                location: res,
                locationProxy: res,

                // program pointer client side
                __program__uuid: program.__uuid,
                // actual WebglProgram
                __p__uuid: programInfo.programReal.__uuid,
                programInfo: programInfo
            };
            programInfo.uniforms.push(uniformInfo);
            programInfo.uniformsByName[uName] = uniformInfo;
            res.__uniformInfo = uniformInfo;
            //msgActions.logMsg('Added uniform location ' + name + ' ' + res.__uuid);
        }
        return res;
    };

    // UNIFORM Hooks
    HookDispatcher.methodsUniforms.forEach(function(f) {
        RdrCtxt.prototype[f] = function(gl, args, hookedInfo) {
            if (args[0] === null || args[0] === undefined) return;

            hookedInfo.detectGlCall();

            const uniform = args[0];

            let uniformInfo = uniform.__uniformInfo;
            if (!uniform.__uniformInfo) {
                uniformInfo = hookedInfo.findProgramInfoProxyByIdByLocationProxy(args[0]);
            }

            if (uniformInfo) {
                const l = uniformInfo.location;

                if (uniformInfo.programInfo.programReal !== hookedInfo.currentProgram) {
                    msgActions.logMsg('ShaderEditorClient: uniform on wrong Program ');
                    //console.log(currentProgram);
                    //console.log(res.p.programReal);
                    return;
                }

                // not used in this shader
                if (l === null || l.unbindable) return;

                const argL = args.length;
                let lastArgs = uniformInfo.value;
                let buildArray = true;
                if (lastArgs) {
                    if (argL === lastArgs.length) {
                        let argIdx = 1;
                        for (; argIdx < argL; argIdx++) {
                            if (args[argIdx] !== lastArgs[argIdx]) {
                                break;
                            }
                        }
                        // exact same unifom value set
                        if (argIdx === argL) {
                            buildArray = false;
                        }
                    }
                }

                let a;
                if (buildArray) {
                    a = new Array(argL);
                    a[0] = l;
                    for (let j = 1; j < argL; j++) {
                        a[j] = args[j];
                    }
                    lastArgs = a;
                } else {
                    a = lastArgs;
                }
                gl[f + 'Native'].apply(gl, a);

                if (options.logShaderEditor) {
                    const err = gl.getError();
                    if (err) {
                        // @ts-ignore
                        debugger;
                        msgActions.logMsg(
                            'Shader' +
                                uniformInfo.programInfo.name +
                                ' ORIG: ' +
                                args[0].__uuid +
                                ' ' +
                                uniformInfo.name +
                                ' MAPS TO ' +
                                uniformInfo.location.__uuid +
                                ' VAL: ' +
                                args[1] +
                                ' : ' +
                                gl[err] //gl.enum_strings[err]
                        );
                        if (options.debugShaderEditor) debugger;
                    }
                }

                uniformInfo.value = a;
                uniformInfo.type = f;
            } else {
                msgActions.logMsg('Program by location ' + args[0].__uuid + ' not found');
            }
            return uniform;
        };
    });

    // VERTEX ATTRIB HOOKS
    RdrCtxt.prototype.bindBuffer = function(gl, args, hookedInfo) {
        const target = args[0];
        const buffer = args[1];
        //msgActions.logMsg( 'bindBuffer', target, buffer );
        hookedInfo.lastBufferBinded = buffer;
        hookedInfo.lastBufferBindedTarget = target;
        return gl.bindBufferNative.apply(gl, args);
    };

    RdrCtxt.prototype.getAttribLocation = function(gl, args, hookedInfo) {
        const program = args[0];
        const aName = args[1];
        let programInfo = program.__programInfo;
        if (!programInfo) {
            programInfo = hookedInfo.findProgramInfoProxyById(program.__uuid);
        }

        let vertexShaderAttributeInfo = programInfo.attributesByName[aName];
        if (vertexShaderAttributeInfo) {
            return vertexShaderAttributeInfo;
        }

        const index = gl.getAttribLocationNative.apply(gl, [programInfo.programReal, aName]);
        if (index !== -1) {
            //TODO: addVertexShaderAttribute
            //TODO: or addShaderAttribute
            vertexShaderAttributeInfo = {
                index: index,
                originalIndex: index,
                name: aName,

                programInfo: programInfo
            };

            programInfo.attributes.push(vertexShaderAttributeInfo);
            programInfo.attributesByName[aName] = vertexShaderAttributeInfo;
            programInfo.attributesByIndex[index] = vertexShaderAttributeInfo;

            //msgActions.logMsg( 'Added attribute location ' + aName + ': ' + index + ' to ' + program.__uuid );
        }
        return index;
    };
    /*
    RdrCtxt.prototype.clear = function(gl, arg) {
        // in case we don't clear...
        // hookedInfo.pickColor();
        return gl.clearNative.apply(gl, args);
    };
*/
    RdrCtxt.prototype.createRenderbuffer = function(gl, args, hookedInfo) {
        const res = gl.createRenderbufferNative.apply(gl, args);
        hookedInfo.addRenderBuffer(res);
        return res;
    };
    RdrCtxt.prototype.deleteRenderbuffer = function(gl, args, hookedInfo) {
        const res = gl.deleteRenderbufferNative.apply(gl, args);
        const renderbuffer = args[0];
        hookedInfo.removeRenderBuffer(renderbuffer);
        return res;
    };

    RdrCtxt.prototype.bindRenderbuffer = function(gl, args, hookedInfo) {
        //var target = args[0];
        const renderbuffer = args[1];
        hookedInfo.setCurrentRenderBuffer(renderbuffer);
        return gl.bindRenderbufferNative.apply(gl, args);
    };

    RdrCtxt.prototype.createFramebuffer = function(gl, args, hookedInfo) {
        const res = gl.createFramebufferNative.apply(gl, args);
        hookedInfo.addFrameBuffer(res);
        return res;
    };

    RdrCtxt.prototype.deleteFramebuffer = function(gl, args, hookedInfo) {
        const res = gl.deleteFramebufferNative.apply(gl, args);
        const frameBuffer = args[0];
        hookedInfo.removeFrameBuffer(frameBuffer);
        return res;
    };
    RdrCtxt.prototype.bindFramebuffer = function(gl, args, hookedInfo) {
        // before changing framebuffers...
        // TODO: should count only active frame buffer though
        if (hookedInfo.framebuffersCount > 0) hookedInfo.pickColorOrScreenShot();

        //var target = args[0];
        const frameBuffer = args[1];
        hookedInfo.setCurrentFrameBuffer(frameBuffer);
        return gl.bindFramebufferNative.apply(gl, args);
    };

    RdrCtxt.prototype.framebufferTexture2D = function(gl, args, hookedInfo) {
        // detect texture if first bind wihtout null
        const frameBufferInfo = hookedInfo.currentFrameBufferInfo;
        if (frameBufferInfo) {
            const attachmentInfo = {
                target: args[0],
                attachment: args[1], // if attachment is gl.COLOR_ATTACHMENT0, etc ?
                textarget: args[2],
                texture: args[3],
                textureInfo: args[3] ? args[3].__textureInfo : undefined,
                level: args[4]
            };

            // TODO: handle cubemaps as a single attachment ?
            if (attachmentInfo.texture && attachmentInfo.texture.__textureInfo) {
                const textureInfo = attachmentInfo.texture.__textureInfo;
                attachmentInfo.textureInfo = textureInfo;
                frameBufferInfo.texture = textureInfo;
                textureInfo.frameBufferInfo = frameBufferInfo;
            }
            frameBufferInfo.attachments.push(attachmentInfo);
        }
        return gl.framebufferTexture2DNative.apply(gl, args);
    };

    RdrCtxt.prototype.postHookgetExtension = function(gl, args, hookedInfo, res) {
        //msgActions.logMsg('Get Extension  ' + args[0]);
        msgActions.sendToServerEditor({
            ctxtId: hookedInfo.id,
            action: 'getExtension',
            extension: args[0],
            version: hookedInfo.version
        });

        // no extension
        if (!res) return;

        // store only once the references
        // TODO: mve into hook dispatcher...
        // direct bind of extension= > queries, vao see ogsjs
        if (args[0] === 'OES_vertex_array_object') {
            const methodsExt = [
                'bindVertexArrayOES',
                'createVertexArrayOES',
                'deleteVertexArrayOES'
            ];

            //
            // TODO: mve into hook dispatcher... direct bind ?
            methodsExt.forEach(
                function(f) {
                    if (!res[f + 'Native']) {
                        res[f + 'Native'] = res[f];
                        gl[f + 'Native'] = res[f];
                    }
                }.bind(window)
            );

            // TODO: mve into hook dispatcher... direct bind ?
            res.bindVertexArrayOES = function() {
                //gl, args2, hookedInfo2) {
                const program = hookedInfo.currentProgram;
                //var program = hookedInfo.getParameter(hookedInfo.CURRENT_PROGRAM);
                if (program) {
                    // @ts-ignore
                    let programInfo = program.__programInfo;
                    if (!programInfo) {
                        programInfo = hookedInfo.findProgramProxyByRealProgramId(program.__uuid);
                    }
                    if (programInfo) {
                        //var a = programInfo.attributesByIndex[index];//findAttributeByIndex(p, index);
                        //if (a) {
                        //    index = a.index;
                        //}
                        //debugger;
                        programInfo.vao = arguments[0];

                        // should now cache bindBuffer /index or vertexAttribPointer
                        // calls until next bindVertexArrayOES
                        // gl.ARRAY_BUFFER: Buffer containing vertex attributes, such as vertex coordinates, texture coordinate data, or vertex color data.
                        // gl.ELEMENT_ARRAY_BUFFER: Buffer used for element indices.
                    }
                }

                return res.bindVertexArrayOESNative.apply(res, arguments);
            };

            // TODO: mve into hook dispatcher... direct bind ?
            res.createVertexArrayOES = function() {
                //gl, args, hookedInfo) {
                return res.createVertexArrayOESNative.apply(res, arguments);
            };

            // TODO: mve into hook dispatcher... direct bind ?
            res.deleteVertexArrayOES = function() {
                //, args, hookedInfo) {
                return res.deleteVertexArrayOESNative.apply(res, arguments);
            };
        }
    };

    RdrCtxt.prototype.bindAttribLocation = function(gl, args, hookedInfo) {
        const program = args[0];
        const index = args[1];
        const aName = args[2];

        let res;
        if (typeof program === 'boolean') {
            res = gl.bindAttribLocationNative.apply(gl, args);
            // ?
            debugger;
            return res;
        }

        const programInfo = program.__programInfo;
        if (!programInfo) {
            hookedInfo.findProgramInfoProxyById(program.__uuid);
        }
        // TODO: clean mess between .__attribs and .attributes
        if (!programInfo.__attribs) programInfo.__attribs = {};
        let pAttrArgs = programInfo.__attribs[index];
        if (!programInfo.__attribs[index]) {
            pAttrArgs = [programInfo.programReal, index, aName];
            programInfo.__attribs[index] = pAttrArgs;
        } else {
            pAttrArgs[0] = programInfo.programReal;
            pAttrArgs[1] = index;
            pAttrArgs[2] = aName;
        }
        res = gl.bindAttribLocationNative.apply(gl, pAttrArgs);

        ////////////////
        const attributeInfo = {
            index: index,
            originalIndex: index,
            name: aName
        };
        ////////////////////
        programInfo.attributes.push(attributeInfo);
        ///////////////////////

        //msgActions.logMsg( 'Bind attribute location ' + aName + ': ' + index );
        return res;
    };

    RdrCtxt.prototype.enableVertexAttribArray = function(gl, args, hookedInfo) {
        let index = args[0];
        const program = hookedInfo.currentProgram;
        let res;
        if (program) {
            // TODO: only if ovveride
            const programInfo = program.__programInfo;
            if (!programInfo) {
                hookedInfo.findProgramInfoProxyById(program.__uuid);
            }
            if (programInfo) {
                const a = programInfo.attributesByIndex[index];
                if (a) {
                    index = a.index;
                    const pAttrVertAttrArr = programInfo.vertexAttribArrayArgs;
                    pAttrVertAttrArr[0] = index;
                    res = gl.enableVertexAttribArrayNative.apply(gl, pAttrVertAttrArr);
                    return res;
                }
            }
        }

        //msgActions.logMsg( 'enableVertexAttribArray ', p.programReal.__uuid, a.index, ' (' + a.name + ')' )
        res = gl.enableVertexAttribArrayNative.apply(gl, args);
        return res;
    };

    RdrCtxt.prototype.vertexAttribPointer = function(gl, args, hookedInfo) {
        let index = args[0];
        const size = args[1];
        const type = args[2];
        const normalized = args[3];
        const stride = args[4];
        const offset = args[5];

        // TODO: check bindprogram/vertexAttribPointer order usage
        // store VertexAttribPointer program list usage ?
        // store Program vertexAttribPointer list usage ?
        const program = hookedInfo.currentProgram;

        //var program = hookedInfo.getParameter(hookedInfo.CURRENT_PROGRAM);
        // TODO: store as directly usable
        if (program) {
            const programInfo = program.__programInfo;
            if (!programInfo) {
                hookedInfo.findProgramInfoProxyById(program.__uuid);
            }
            if (programInfo) {
                const a = programInfo.attributesByIndex[index];
                //hookedInfo.findAttributeByIndex(programInfo, index);
                if (a) {
                    a.size = size;
                    a.type = type;
                    a.normalized = normalized;
                    a.stride = stride;
                    a.offset = offset;
                    index = a.index;
                }
            }
        }

        //msgActions.logMsg( 'vertexAttribPointer ', p.programReal.__uuid, a.index, ' (' + a.name + ')' )

        const res = gl.vertexAttribPointerNative.apply(gl, args);
        return res;
    };

    /// TEXTURE HOOKS
    RdrCtxt.prototype.createTexture = function(gl, args, hookedInfo) {
        const res = gl.createTextureNative.apply(gl, args);

        res.__uuid = msgActions.createUUID();
        res.version = hookedInfo.version;
        //addProgram( this, res );
        msgActions.logMsg('TEXTURE CREATED: ' + res);

        const textureInfo = {
            texture: res,
            targets: {}
        };

        textureInfo.targets[hookedInfo.TEXTURE_2D] = {
            parametersi: {},
            parametersf: {}
        };
        textureInfo.targets[hookedInfo.TEXTURE_CUBE_MAP] = {
            parametersi: {},
            parametersf: {}
        };
        //hookedInfo.addTexture
        hookedInfo.textures[res.__uuid] = textureInfo;
        res.__textureInfo = textureInfo;
        msgActions.sendToServerEditor({
            ctxtId: hookedInfo.id,
            action: 'createTexture',
            uid: res.__uuid,
            version: hookedInfo.version
        });

        return res;
    };

    RdrCtxt.prototype.bindTexture = function(gl, args, hookedInfo) {
        const res = gl.bindTextureNative.apply(gl, args);

        //var target = args[0];
        const texture = args[1];

        //msgActions.logMsg('TEXTURE bindTexture ' + texture + ' ' + target);

        if (texture !== undefined && texture !== null) {
            //			msgActions.logMsg( 'TEXTURE bindTexture: ' + args[ 0 ].__uuid );
            hookedInfo.currentBoundTexture = texture;
        } else {
            //msgActions.logMsg( 'TEXTURE bindTexture: null' );
            hookedInfo.currentBoundTexture = null;
        }
        //	sendToServerEditor( { ctxtId: hookedInfo.id, action: 'bindTexture', uid: res.__uuid } );

        return res;
    };

    /*

        void texImage2D(GLenum target, GLint level, GLenum internalformat,
                        GLsizei width, GLsizei height, GLint border, GLenum format,
                        GLenum type, ArrayBufferView? pixels);
        void texImage2D(GLenum target, GLint level, GLenum internalformat,
                        GLenum format, GLenum type, TexImageSource? source); // May throw DOMException

    */

    // https://gist.github.com/jussi-kalliokoski/3138956
    RdrCtxt.prototype.texImage2D = function(gl, args, hookedInfo) {
        const res = gl.texImage2DNative.apply(gl, args);

        if (!options.monitorTextures) {
            return res;
        }

        // ImageData array, ArrayBufferView, HTMLCanvasElement, HTMLImageElement
        //msgActions.logMsg('TEXTURE texImage2D level' + args[1]);

        let image = args[8];
        if (image !== null) {
            if (!image) image = args[5];
            const texture = hookedInfo.currentBoundTexture;
            if (texture) {
                /////////////////////////
                // TODO: msg.sendImage(image|data|canvas|video|etc) ?
                // or on demand only ?
                // store or not ?
                ///////////////////////

                // msgActions.logMsg('Current bound texture: ' + currentBoundTexture.__uuid);
                if (image instanceof Image || image instanceof HTMLImageElement) {
                    const c = document.createElement('canvas');
                    const ctx = c.getContext('2d');
                    c.width = image.width;
                    c.height = image.height;
                    ctx.drawImage(image, 0, 0);

                    // TODO: ?
                    //texture.width = c.width;
                    //texture.height = c.height;

                    msgActions.sendToServerEditor({
                        ctxtId: hookedInfo.id,
                        action: 'uploadTexture',
                        uid: texture.__uuid,
                        image: c.toDataURL(),
                        version: hookedInfo.version
                    });

                    msgActions.logMsg('TEXTURE texImage2D Image/HTMLImageElement');
                } else if (image instanceof ImageData) {
                    //debug();
                    msgActions.logMsg('TEXTURE texImage2D ImageData');
                } else if (image instanceof ArrayBuffer) {
                    //debug();
                    msgActions.logMsg('TEXTURE texImage2D ArrayBuffer');
                } else if (image instanceof Uint8Array) {
                    //debug();
                    const canvasDebTex = document.createElement('canvas');
                    const ctxtDebText = canvasDebTex.getContext('2d');
                    canvasDebTex.width = args[3];
                    canvasDebTex.height = args[4];
                    const d = ctxtDebText.createImageData(canvasDebTex.width, canvasDebTex.height);
                    memcpy(image, 0, d.data, 0, d.data.length);
                    ctxtDebText.putImageData(d, 0, 0);
                    hookedInfo.currentBoundTexture.width = canvasDebTex.width;
                    hookedInfo.currentBoundTexture.height = canvasDebTex.height;
                    msgActions.sendToServerEditor({
                        ctxtId: hookedInfo.id,
                        action: 'uploadTexture',
                        uid: hookedInfo.currentBoundTexture.__uuid,
                        image: canvasDebTex.toDataURL(),
                        version: hookedInfo.version
                    });
                    msgActions.logMsg('TEXTURE texImage2D Uint8Array');
                } else if (image instanceof HTMLCanvasElement) {
                    hookedInfo.currentBoundTexture.width = args[3];
                    hookedInfo.currentBoundTexture.height = args[4];
                    msgActions.sendToServerEditor({
                        ctxtId: hookedInfo.id,
                        action: 'uploadTexture',
                        uid: hookedInfo.currentBoundTexture.__uuid,
                        image: image.toDataURL(),
                        version: hookedInfo.version
                    });
                    msgActions.logMsg('TEXTURE texImage2D HTMLCanvasElement');
                } else if (image instanceof Float32Array) {
                    msgActions.logMsg('TEXTURE textImage2D Float32Array');
                } else if (image instanceof HTMLVideoElement) {
                    msgActions.logMsg('TEXTURE textImage2D HTMLVideoElement');
                } else {
                    //debug();
                    msgActions.logMsg('TEXTURE texImage2D Unknown format');
                }
            } else {
                msgActions.logMsg('TEXTURE texImage2D NO BOUND TEXTURE');
            }
        } else {
            msgActions.logMsg('TEXTURE set to null');
        }

        return res;
    };

    RdrCtxt.prototype.texParameteri = function(gl, args, hookedInfo) {
        if (options.monitorTextures) {
            const t = hookedInfo.textures[hookedInfo.currentBoundTexture.__uuid];
            t.targets[args[0]].parametersi[args[1]] = args[2];
        }

        return gl.texParameteriNative.apply(gl, args);
    };

    RdrCtxt.prototype.texParameterf = function(gl, args, hookedInfo) {
        if (options.monitorTextures) {
            const t = hookedInfo.textures[hookedInfo.currentBoundTexture.__uuid];
            t.targets[args[0]].parametersf[args[1]] = args[2];
        }
        return gl.texParameterfNative.apply(gl, args);
    };
    /*
    RdrCtxt.prototype.texSubImage2D = function(gl, args , hookedInfo) {
        //msgActions.logMsg('TEXTURE texSubImage2D');
        return gl.texSubImage2DNative.apply(gl, args);
    };
    */
    HookDispatcher.addListener(RdrCtxt, 1);
    return RdrCtxt;
}
export { webgl1Hook };
