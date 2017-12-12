const shaderContext = {
    version: 1,
    mainLine: 0,
    fragColor: 'gl_FragColor',
    uniforms: {},
    struct: {},
    functions: {},
    variables: {},
    instructions: {}
};

const colorRE = new RegExp(/col/, 'i');
const fragColorRE = new RegExp(/(?:out)\s+(?:vec4)\s+\b(.*(?:[C,c]ol){1}.*)\b\s*;/);
const versionRE = new RegExp(/(?:#version)\s+\b([1,3]00)\b\s+/, 'i');

// listAllVariables regexp:
/*
 match[
uniform|in|out|attribute,
variable/function type (including struct)
variable/function name,
function if === '(', assignement decl if === '=')
]
*/
const listAllVariablesRE = new RegExp(
    /(uniform|in|out|attribute)?\s*(void|struct|float|[i|b]?vec\d|mat\d|int|sampler\dD]?)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(\(|\=)?;?/,
    'i'
);
// very basic attempt at distinguishing noop lines inside main
// doesn't handle func with inout or out parameters for instance
// var name is group2 of regexp
const opInstructionRE = new RegExp(
    /([a-zA-Z_][a-zA-Z0-9_]*.)?([a-zA-Z_][a-zA-Z0-9_]*)\s*[\=]\s*/,
    'i'
);

// get all info on shader,
// then start bench just after the "Main"
const benchTypes = ['float', 'vec2', 'vec3', 'vec4'];

// reset shader parse info
function reset() {
    shaderContext.uniforms = {};
    shaderContext.struct = {};
    shaderContext.functions = {};
    shaderContext.variables = {};
    shaderContext.instructions = {};

    shaderContext.mainAtStart = 0;
    shaderContext.version = 1;
    shaderContext.fragColor = 'gl_FragColor';
}

function computeShaderContext(cm) {
    const nLines = cm.getDoc().size;
    reset();

    let beforeMain = true;
    // version must be first thing ever. soo
    let beforeVersion = true;
    let name, lineString, match, qualifier, type, declType;
    for (let i = 0; i < nLines; i++) {
        lineString = cm.getLine(i).trim();
        // early out on non interesting lines
        if (lineString.length === 0 || lineString[0] === '/') continue;

        if (beforeVersion) {
            match = versionRE.exec(lineString);
            if (match) {
                if (match[1] === '300') {
                    shaderContext.version = 2;
                    shaderContext.fragColor = undefined;
                } else if (match[1] === '100') {
                    shaderContext.fragColor = 'gl_FragColor';
                }
                beforeVersion = false;
            }
        }
        match = listAllVariablesRE.exec(lineString);
        if (match) {
            beforeVersion = false;
            qualifier = match[1];
            type = match[2];
            name = match[3];
            declType = match[4];
            if (beforeMain) {
                // only takes uniforms, struct decl, function
                if (qualifier === 'out') {
                    // detect out fragcolor if any
                    if (shaderContext.fragColor === undefined) {
                        shaderContext.fragColor = name;
                    } else {
                        // shifoumi fight...
                        // guessing games
                        // you have "col" you win
                        match = colorRE.exec(name);
                        if (match) {
                            shaderContext.fragColor = name;
                        }
                    }
                }
                if (name === 'main') {
                    shaderContext.mainLine = i;
                    beforeMain = false;
                    continue;
                }
                if (qualifier === 'uniform') {
                    shaderContext.uniforms[name] = { line: i, type: type };
                    continue;
                }
                if (type === 'struct') {
                    shaderContext.struct[name] = { line: i };
                    continue;
                }
                if (declType === '(') {
                    shaderContext.functions[name] = { line: i, type: type };
                    continue;
                } else {
                    shaderContext.variables[name] = { line: i, type: type };
                }
            } else {
                // inside/after Main, it's a variable \o/
                // and it's not a uniform/in/out/attr
                if (declType !== '(' && qualifier === undefined) {
                    shaderContext.variables[name] = { line: i, type: type };
                }
            }
        }
        if (!beforeMain) {
            // inside/after Main
            const opInstructionsMatch = opInstructionRE.exec(lineString);
            if (opInstructionsMatch) {
                // && !cm.mySettings.isCommented(cm, i, constructMatch)) {
                const structName = opInstructionsMatch[1];
                name = opInstructionsMatch[2];
                const varData = shaderContext.variables[name];
                // sadly only accept scalar/vector float
                if (varData && benchTypes.indexOf(varData.type) !== -1) {
                    shaderContext.instructions[i] = {
                        name: name,
                        type: varData.type,
                        struct: structName
                    };
                }
                continue;
            }
        }
    }
    return shaderContext;
}

function getMainFragColor(fsShader, version) {
    //var constructIN = false;
    const lines = fsShader.split('\n');
    const nLines = lines.length;

    let versionIN = version === 2;
    for (let i = 0; i < nLines; i++) {
        const lineString = lines[i].trim();
        if (lineString.length === 0 || lineString[0] === '/') continue;

        if (!versionIN) {
            const versionMatch = versionRE.exec(lineString);
            if (versionMatch) {
                if (versionMatch[1] === '300') {
                    //shaderVersion = 2;
                    versionIN = true;
                } else if (versionMatch[1] === '100') {
                    return 'gl_FragColor';
                }
            }
        } else {
            const fragColor = fragColorRE.exec(lineString);
            if (fragColor) {
                return fragColor[1];
            }
        }
    }

    return 'gl_FragColor';
}

function getMainFragColorFromEditor(cm /*, version*/) {
    //var constructIN = false;
    const nLines = cm.getDoc().size;

    let versionIN = false;
    for (let i = 0; i < nLines; i++) {
        const lineString = cm.getLine(i).trim();
        if (lineString.length === 0 || lineString[0] === '/') continue;

        if (!versionIN) {
            const versionMatch = versionRE.exec(lineString);
            if (versionMatch) {
                if (versionMatch[1] === '300') {
                    //shaderVersion = 2;
                    versionIN = true;
                } else if (versionMatch[1] === '100') {
                    return 'gl_FragColor';
                }
            }
        } else {
            const fragColor = fragColorRE.exec(lineString);
            if (fragColor) {
                return fragColor[1];
            }
        }
    }

    return 'gl_FragColor';
}

export { computeShaderContext, shaderContext, getMainFragColor, getMainFragColorFromEditor };
