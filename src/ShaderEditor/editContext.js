//default settingsConfiguration.
const defaultSettingsConfiguration = {
    highlight: false,
    tmpDisableHighlight: false,
    textures: false,
    theme: 46,
    logShaderEditor: false,
    debugShaderEditor: false
};

// Shared global variables :(
// one step more and it's redux :'
class EditContextClass {
    constructor() {
        this.settingsConfiguration = defaultSettingsConfiguration;
        //
        this.shaderEditor = undefined;

        //
        this.verbose = false;
        this.keyTimeout = 250;
        this.pColorTip = undefined;
        this.tipTimerFade = undefined;
        this.ShaderEditorTimeout = undefined;

        this.reset();
    }
    getCurrentContext() {
        return this.currentContextID;
    }
    getCurrentContextID() {
        return this.currentContextID;
    }
    // get Event from background js when iframe unload, etc
    removeContext(ctxtId, tree, tabs) {
        const context = this.contexts[ctxtId];
        // TODO: remove programs from editor ?
        // or just mark them as off ?
        delete this.contexts[ctxtId];
        // remove tabs
        for (const program in context.programs) {
            // @ts-ignore
            let shaderTab = program.vertexShader && program.vertexShader.tab;
            if (shaderTab) {
                tabs.remove(shaderTab);
            }
            // @ts-ignore
            shaderTab = program.fragmentShader && program.fragmentShader.tab;
            if (shaderTab) {
                tabs.remove(shaderTab);
            }
        }
        // unselect current
        if (context.ctxtId === this.currentContextID) {
            if (this.selectedProgram && this.selectedProgram.ctxtId === this.currentContextID) {
                tree.unselect();
                this.selectedProgram = undefined;
            }
            this.currentContextID = undefined;
            this.currentContext = undefined;
        }
    }
    removeWebPage(url, tree, tabs) {
        for (const i in this.contexts) {
            const context = this.contexts[i];
            if (context.url !== url) continue;
            this.removeContext(context.ctxtId, tree, tabs);
        }
    }
    reset() {
        //
        this.currentContext = undefined;
        this.currentContextID = undefined;
        this.contexts = {};
        //
        this.programs = {};
        this.programsByName = {};
        this.selectedProgram = undefined;
        this.programNumber = 0;
        // if selected ?
        this.textures = {};
        this.selectedTexture = undefined;
        //
        this.sentClientCode = false;
        this.injected = false;
        //
        this.mainTabUrl = undefined;
    }

    // no context means context createion
    // was before hooking ?
    // (like when starting chrome and extension starts after)
    getOrCreateContext(ctxtId, version, url, isMainWebTabParam) {
        if (!ctxtId) debugger;
        const context = this.contexts[ctxtId];
        if (context) return context;
        const isMainWebTab =
            isMainWebTabParam !== undefined ? isMainWebTabParam : this.getMainTabUrl() === url;
        return this.addContext(ctxtId, version, url, isMainWebTab);
    }

    getMainTabUrl() {
        return this.mainTabUrl;
    }

    addContext(ctxtId, version, url, isMainWebTab) {
        if (isMainWebTab) this.mainTabUrl = url;
        const context = {
            ctxtId: ctxtId,
            url: url,
            gl: undefined,
            supported: undefined,
            extList: undefined,
            vertexShaders: {},
            fragmentShaders: {},
            programs: {},
            programsByName: {},
            textures: {},
            programNumber: 0,
            programCompiledCallback: undefined,
            programTimingCallback: undefined,
            sentClientCode: false,
            // program selection and type
            selectedProgram: null,
            selectedShaderType: undefined,
            selectedShaderTypeGL: undefined,
            // webgl VERSION
            currentVersion: version
        };
        this.contexts[ctxtId] = context;
        return context;
    }

    addProgram(ctxtId, uid, leaf) {
        const context = this.contexts[ctxtId];
        const program = {
            id: uid,
            leaf: leaf,
            fragmentShader: {
                name: undefined,
                text: undefined,
                main: undefined,
                dirty: true,
                //treeLeaf: fs_leaf,
                version: 0,
                tab: undefined
            },

            vertexShader: {
                name: undefined,
                text: undefined,
                main: undefined,
                dirty: true,
                //treeLeaf: vs_leaf,
                version: 0,
                tab: undefined
            },

            number: this.programNumber,
            name: 'Program ' + this.programNumber,
            uid: uid,
            ctxtId: ctxtId,
            context: context,
            version: context.version,
            programVersion: 0
        };

        this.programNumber++;
        this.programs[uid] = program;
        this.programsByName[program.name] = uid;

        context.programNumber++;
        context.programs[uid] = program;
        context.programsByName[program.name] = uid;

        return program;
    }
    setCurrentContext(ctxtId) {
        this.currentContextID = ctxtId;
        this.currentContext = this.contexts[ctxtId];
    }

    getCurrentVersion() {
        return this.currentContext.currentVersion;
    }

    setCurrentProgram(ctxtId, program) {
        if (this.currentContextID !== ctxtId) this.setCurrentContext(ctxtId);
        this.selectedProgram = program;
        this.currentContext.selectedProgram = program;
    }

    setCurrentShaderType(shaderType) {
        this.currentContext.selectedShaderType = shaderType;
        this.setCurrentShaderTypeGL(shaderType === 'VS');
    }

    getCurrentProgram() {
        return this.currentContext.selectedProgram;
    }

    getCurrentShaderType() {
        return this.currentContext.selectedShaderType;
    }

    getCurrentShaderTypeGL() {
        return this.currentContext.selectedShaderTypeGL;
    }

    setCurrentShaderTypeGL(isVertexShader) {
        let shaderTypeGL;
        const context = this.currentContext;
        if (isVertexShader) {
            shaderTypeGL = context.currentVersion
                ? WebGLRenderingContext.VERTEX_SHADER
                : // @ts-ignore
                  // @ts-ignore
                  WebGL2RenderingContext.VERTEX_SHADER;
        } else {
            shaderTypeGL = context.currentVersion
                ? WebGLRenderingContext.FRAGMENT_SHADER
                : // @ts-ignore
                  // @ts-ignore
                  WebGL2RenderingContext.FRAGMENT_SHADER;
        }
        context.selectedShaderTypeGL = shaderTypeGL;
    }
}

const EditContext = new EditContextClass();
console.log('EditContext >>>>>>>>>>>>>', EditContext);

export { EditContext };
