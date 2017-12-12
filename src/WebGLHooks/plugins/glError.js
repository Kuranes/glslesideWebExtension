function webglErrorLogHook(HookDispatcher, hookedContext, msgActions) {
    /**
     * Which arguments are enums based on the number of arguments to the function.
     * So
     *    'texImage2D': {
     *       9: { 0:true, 2:true, 6:true, 7:true },
     *       6: { 0:true, 2:true, 3:true, 4:true },
     *    },
     *
     * means if there are 9 arguments then 6 and 7 are enums, if there are 6
     * arguments 3 and 4 are enums
     *
     * @type {!Object.<number, !Object.<number, string>}
     */
    const glValidEnumContexts = {
        // Generic setters and getters

        // @ts-ignore
        enable: { 1: { 0: true } },
        disable: { 1: { 0: true } },
        getParameter: { 1: { 0: true } },

        // Rendering

        drawArrays: { 3: { 0: true } },
        drawElements: { 4: { 0: true, 2: true } },

        // Shaders

        createShader: { 1: { 0: true } },
        getShaderParameter: { 2: { 1: true } },
        getProgramParameter: { 2: { 1: true } },
        getShaderPrecisionFormat: { 2: { 0: true, 1: true } },

        // Vertex attributes

        getVertexAttrib: { 2: { 1: true } },
        vertexAttribPointer: { 6: { 2: true } },

        // Textures

        bindTexture: { 2: { 0: true } },
        activeTexture: { 1: { 0: true } },
        getTexParameter: { 2: { 0: true, 1: true } },
        texParameterf: { 3: { 0: true, 1: true } },
        texParameteri: { 3: { 0: true, 1: true, 2: true } },
        // texImage2D and texSubImage2D are defined below with WebGL 2 entrypoints
        copyTexImage2D: { 8: { 0: true, 2: true } },
        copyTexSubImage2D: { 8: { 0: true } },
        generateMipmap: { 1: { 0: true } },
        // compressedTexImage2D and compressedTexSubImage2D are defined below with WebGL 2 entrypoints

        // Buffer objects

        bindBuffer: { 2: { 0: true } },
        // bufferData and bufferSubData are defined below with WebGL 2 entrypoints
        getBufferParameter: { 2: { 0: true, 1: true } },

        // Renderbuffers and framebuffers

        pixelStorei: { 2: { 0: true, 1: true } },
        // readPixels is defined below with WebGL 2 entrypoints
        bindRenderbuffer: { 2: { 0: true } },
        bindFramebuffer: { 2: { 0: true } },
        checkFramebufferStatus: { 1: { 0: true } },
        framebufferRenderbuffer: { 4: { 0: true, 1: true, 2: true } },
        framebufferTexture2D: { 5: { 0: true, 1: true, 2: true } },
        getFramebufferAttachmentParameter: { 3: { 0: true, 1: true, 2: true } },
        getRenderbufferParameter: { 2: { 0: true, 1: true } },
        renderbufferStorage: { 4: { 0: true, 1: true } },

        // Frame buffer operations (clear, blend, depth test, stencil)

        clear: {
            1: {
                0: { enumBitwiseOr: ['COLOR_BUFFER_BIT', 'DEPTH_BUFFER_BIT', 'STENCIL_BUFFER_BIT'] }
            }
        },
        depthFunc: { 1: { 0: true } },
        blendFunc: { 2: { 0: true, 1: true } },
        blendFuncSeparate: { 4: { 0: true, 1: true, 2: true, 3: true } },
        blendEquation: { 1: { 0: true } },
        blendEquationSeparate: { 2: { 0: true, 1: true } },
        stencilFunc: { 3: { 0: true } },
        stencilFuncSeparate: { 4: { 0: true, 1: true } },
        stencilMaskSeparate: { 2: { 0: true } },
        stencilOp: { 3: { 0: true, 1: true, 2: true } },
        stencilOpSeparate: { 4: { 0: true, 1: true, 2: true, 3: true } },

        // Culling

        cullFace: { 1: { 0: true } },
        frontFace: { 1: { 0: true } },

        // ANGLE_instanced_arrays extension

        drawArraysInstancedANGLE: { 4: { 0: true } },
        drawElementsInstancedANGLE: { 5: { 0: true, 2: true } },

        // EXT_blend_minmax extension

        blendEquationEXT: { 1: { 0: true } },

        // WebGL 2 Buffer objects

        bufferData: {
            3: { 0: true, 2: true }, // WebGL 1
            4: { 0: true, 2: true }, // WebGL 2
            5: { 0: true, 2: true } // WebGL 2
        },
        bufferSubData: {
            3: { 0: true }, // WebGL 1
            4: { 0: true }, // WebGL 2
            5: { 0: true } // WebGL 2
        },
        copyBufferSubData: { 5: { 0: true, 1: true } },
        getBufferSubData: { 3: { 0: true }, 4: { 0: true }, 5: { 0: true } },

        // WebGL 2 Framebuffer objects
        blitFramebuffer: {
            10: {
                8: {
                    enumBitwiseOr: ['COLOR_BUFFER_BIT', 'DEPTH_BUFFER_BIT', 'STENCIL_BUFFER_BIT']
                },
                9: true
            }
        },
        framebufferTextureLayer: { 5: { 0: true, 1: true } },
        invalidateFramebuffer: { 2: { 0: true } },
        invalidateSubFramebuffer: { 6: { 0: true } },
        readBuffer: { 1: { 0: true } },

        // WebGL 2 Renderbuffer objects

        getInternalformatParameter: { 3: { 0: true, 1: true, 2: true } },
        renderbufferStorageMultisample: { 5: { 0: true, 2: true } },

        // WebGL 2 Texture objects

        texStorage2D: { 5: { 0: true, 2: true } },
        texStorage3D: { 6: { 0: true, 2: true } },
        texImage2D: {
            9: { 0: true, 2: true, 6: true, 7: true }, // WebGL 1 & 2
            6: { 0: true, 2: true, 3: true, 4: true }, // WebGL 1
            10: { 0: true, 2: true, 6: true, 7: true } // WebGL 2
        },
        texImage3D: {
            10: { 0: true, 2: true, 7: true, 8: true },
            11: { 0: true, 2: true, 7: true, 8: true }
        },
        texSubImage2D: {
            9: { 0: true, 6: true, 7: true }, // WebGL 1 & 2
            7: { 0: true, 4: true, 5: true }, // WebGL 1
            10: { 0: true, 6: true, 7: true } // WebGL 2
        },
        texSubImage3D: {
            11: { 0: true, 8: true, 9: true },
            12: { 0: true, 8: true, 9: true }
        },
        copyTexSubImage3D: { 9: { 0: true } },
        compressedTexImage2D: {
            7: { 0: true, 2: true }, // WebGL 1 & 2
            8: { 0: true, 2: true }, // WebGL 2
            9: { 0: true, 2: true } // WebGL 2
        },
        compressedTexImage3D: {
            8: { 0: true, 2: true },
            9: { 0: true, 2: true },
            10: { 0: true, 2: true }
        },
        compressedTexSubImage2D: {
            8: { 0: true, 6: true }, // WebGL 1 & 2
            9: { 0: true, 6: true }, // WebGL 2
            10: { 0: true, 6: true } // WebGL 2
        },
        compressedTexSubImage3D: {
            10: { 0: true, 8: true },
            11: { 0: true, 8: true },
            12: { 0: true, 8: true }
        },

        // WebGL 2 Vertex attribs

        vertexAttribIPointer: { 5: { 2: true } },

        // WebGL 2 Writing to the drawing buffer

        drawArraysInstanced: { 4: { 0: true } },
        drawElementsInstanced: { 5: { 0: true, 2: true } },
        drawRangeElements: { 6: { 0: true, 4: true } },

        // WebGL 2 Reading back pixels

        readPixels: {
            7: { 4: true, 5: true }, // WebGL 1 & 2
            8: { 4: true, 5: true } // WebGL 2
        },

        // WebGL 2 Multiple Render Targets

        clearBufferfv: { 3: { 0: true }, 4: { 0: true } },
        clearBufferiv: { 3: { 0: true }, 4: { 0: true } },
        clearBufferuiv: { 3: { 0: true }, 4: { 0: true } },
        clearBufferfi: { 4: { 0: true } },

        // WebGL 2 Query objects

        beginQuery: { 2: { 0: true } },
        endQuery: { 1: { 0: true } },
        getQuery: { 2: { 0: true, 1: true } },
        getQueryParameter: { 2: { 1: true } },

        // WebGL 2 Sampler objects

        samplerParameteri: { 3: { 1: true, 2: true } },
        samplerParameterf: { 3: { 1: true } },
        getSamplerParameter: { 2: { 1: true } },

        // WebGL 2 Sync objects

        fenceSync: { 2: { 0: true, 1: { enumBitwiseOr: [] } } },
        clientWaitSync: { 3: { 1: { enumBitwiseOr: ['SYNC_FLUSH_COMMANDS_BIT'] } } },
        waitSync: { 3: { 1: { enumBitwiseOr: [] } } },
        getSyncParameter: { 2: { 1: true } },

        // WebGL 2 Transform Feedback

        bindTransformFeedback: { 2: { 0: true } },
        beginTransformFeedback: { 1: { 0: true } },
        transformFeedbackVaryings: { 3: { 2: true } },

        // WebGL2 Uniform Buffer Objects and Transform Feedback Buffers

        bindBufferBase: { 3: { 0: true } },
        bindBufferRange: { 5: { 0: true } },
        getIndexedParameter: { 2: { 0: true } },
        getActiveUniforms: { 3: { 2: true } },
        getActiveUniformBlockParameter: { 3: { 2: true } }
    };

    /**
     * Returns the string version of a WebGL argument.
     * Attempts to convert enum arguments to strings.
     * @param {string} f the name of the WebGL function.
     * @param {number} numArgs the number of arguments passed to the function.
     * @param {number} argIndex the index of the argument.
     * @param {*} val The value of the argument.
     * @return {string} The value as a string.
     */
    function glFunctionArgToString(f, numArgs, argIndex, val, invertedEnums) {
        const funcInfo = glValidEnumContexts[f];
        if (!funcInfo || !funcInfo[argIndex]) {
            if (val === null) {
                return 'null';
            } else if (val === undefined) {
                return 'undefined';
            } else {
                return val.toString();
            }
        }
        if (
            typeof funcInfo[argIndex] === 'object' &&
            funcInfo[argIndex]['enumBitwiseOr'] !== undefined
        ) {
            const enums = funcInfo[argIndex]['enumBitwiseOr'];
            let orResult = 0;
            const orEnums = [];
            for (let i = 0; i < enums.length; ++i) {
                const enumValue = invertedEnums[enums[i]];
                if ((val & enumValue) !== 0) {
                    orResult |= enumValue;
                    orEnums.push(invertedEnums[val] || val);
                }
            }
            if (orResult === val) {
                return orEnums.join(' | ');
            } else {
                return invertedEnums[val] || val;
            }
        } else {
            return invertedEnums[val] || val;
        }
    }

    /**
     * Converts the arguments of a WebGL function to a string.
     * Attempts to convert enum arguments to strings.
     *
     * @param {string} f the name of the WebGL function.
     * @param {array} args The arguments.
     * @return {string} The arguments as a string.
     */
    function glArgsStringify(f, args, invertedEnums) {
        // apparently we can't do args.join(",");
        let argStr = '';
        const numArgs = args.length;
        for (let ii = 0; ii < numArgs; ++ii) {
            argStr +=
                (ii === 0 ? '' : ', ') +
                glFunctionArgToString(f, numArgs, ii, args[ii], invertedEnums);
        }
        return argStr;
    }

    // access to native original function
    const refRdrCtxt1 = HookDispatcher.referencesWebGL1;
    const refRdrCtxt2 = HookDispatcher.referencesWebGL2;

    const webgl1ErrorHook = function() {
        this.hookVersion = 1;
        this.refRdrCtxt = refRdrCtxt1;
        this.enums = HookDispatcher.enums1;
        this.invertedEnums = HookDispatcher.invertedEnums1;
        this.errorHit = {};
    };

    const webgl2ErrorHook = function() {
        this.hookVersion = 2;
        this.refRdrCtxt = refRdrCtxt2;
        this.enums = HookDispatcher.enums2;
        this.invertedEnums = HookDispatcher.invertedEnums2;
        this.errorHit = {};
    };

    HookDispatcher.allMethods.forEach(function(f) {
        const isGetExtension = f === 'getExtension';
        // getExtension returns null if no extension... so we'll ignore it
        if (isGetExtension) return;
        const postHookName = 'postHook' + f;
        const postHook = function(gl, args, hookedInfo, res) {
            const err = gl.getErrorNative();
            if (err === 0) return;
            this.errorHit[err] = true;

            const msg = {
                ctxtId: hookedInfo.id,
                action: 'errorLog',
                glError: this.invertedEnums(err),
                function: f,
                res: JSON.stringify(res),
                args: glArgsStringify(f, args, this.invertedEnums),
                version: hookedInfo.version
            };
            console.error('GL ERROR!', msg);
            msgActions.sendToServerEditor(msg);
        };
        webgl1ErrorHook.prototype[postHookName] = postHook;
        webgl2ErrorHook.prototype[postHookName] = postHook;
    });

    HookDispatcher.addListener(webgl1ErrorHook, 1);
    HookDispatcher.addListener(webgl2ErrorHook, 2);
    return { webgl1ErrorHook: webgl1ErrorHook, webgl2ErrorHook: webgl2ErrorHook };
}

export { webglErrorLogHook };
