//First Author Patricio Gonzalez Vivo https://github.com/patriciogonzalezvivo
//Special thanks to Lou Huang. glslEditor born from learned leassons on TangramPlay. His code and wizdom is all arround this project.
// adaptation tuan.kuranes https://twitter.com/tuan_kuranes
import { currentShaderTempReplace } from '../src/currentShaderCallbacks.js';
import {
    computeShaderContext,
    shaderContext,
    getMainFragColor,
    getMainFragColorFromEditor
} from './shaderInfo.js';

function makeMarker(simbol) {
    const marker = document.createElement('div');
    marker.setAttribute('class', 'ge_assing_marker');
    marker.innerHTML = simbol;
    return marker;
}

function isCommented(cm, nLine, match) {
    const token = cm.getTokenAt({
        line: nLine,
        ch: match ? match.index : 0
    });
    if (token && token.type) {
        return token.type === 'comment';
    }
    return false;
}

function searchOverlay(query, caseInsensitive) {
    if (typeof query === 'string') {
        query = new RegExp(
            query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&'),
            caseInsensitive ? 'gi' : 'g'
        );
    } else if (!query.global) {
        query = new RegExp(query.source, query.ignoreCase ? 'gi' : 'g');
    }

    return {
        token: function(stream) {
            query.lastIndex = stream.pos;
            const match = query.exec(stream.string);
            if (match && match.index === stream.pos) {
                stream.pos += match[0].length || 1;
                return 'searching';
            } else if (match) {
                stream.pos = match.index;
            } else {
                stream.skipToEnd();
            }
        }
    };
}

const clean = function(editor, event, justIllum) {
    if (
        event &&
        event.target &&
        (event.target.className === 'ge_assing_marker' ||
            event.target.className === 'ge_assing_marker_on')
    ) {
        return;
    }
    const cm = editor;

    if (justIllum === undefined) {
        cm.clearGutter('breakpoints');
        editor.mySettings.variable = null;
        editor.mySettings.type = null;

        editor.mySettings.debugging = false;
        if (editor.mySettings.active) {
            editor.mySettings.active.setAttribute('class', 'ge_assing_marker');
        }
        editor.mySettings.active = false;
        editor.mySettings.breakpoints = false;
    }

    if (editor.mySettings.overlay) {
        cm.removeOverlay(editor.mySettings.overlay, true);
    }
};

const voidRE = new RegExp('void main\\s*\\(\\s*[void]*\\)', 'i');

const illuminate = function(editor, value, justIllum) {
    if (editor.mySettings.debugging && editor.mySettings.variable === value) {
        return;
    }

    clean(editor, false, justIllum);

    const cm = editor;

    if (justIllum === undefined) {
        // debug breakpoint set if variable is "acceptable"
        let lineHandle;

        // Show line where the value of the value is been asigned
        // only if var is declared inside main ?
        //var voidIN =  false;
        // try without that rule
        let voidIN = true;

        const constructRE = new RegExp(
            '(?:\\w)*\\s*\\b(float|vec\\d)\\b\\s+(' + value + ')\\s?',
            'g'
        ); // no i

        let constructIN = false;
        const assignRE = new RegExp(
            '\\s?(' + value + ')\\s*[\\.|x|y|z|w|r|g|b|a|s|t|p|q]*[\\*|\\+|\\-|\\/]?\\s*=',
            'g'
        ); // no i

        const nLines = cm.getDoc().size;

        for (let i = 0; i < nLines; i++) {
            const lineString = cm.getLine(i).trim();
            if (lineString.length === 0 || lineString[0] === '/') continue;

            if (!voidIN) {
                // Do not start until being inside the main function
                const voidMatch = voidRE.exec(lineString);
                if (voidMatch) {
                    voidIN = true;
                }
            } else {
                if (!constructIN) {
                    // Search for the constructor
                    const constructMatch = constructRE.exec(lineString);
                    if (
                        constructMatch &&
                        constructMatch[1] &&
                        !isCommented(cm, i, constructMatch)
                    ) {
                        editor.mySettings.type = constructMatch[1];
                        lineHandle = cm.getLineHandle(i);
                        cm.setGutterMarker(lineHandle, 'breakpoints', makeMarker('&#x2605;')); //'+')); //'&#x2605;'));
                        constructIN = true;
                        editor.mySettings.breakpoints = true;
                    }
                } else {
                    // Search for changes on tha value using "="
                    // (miss usage of variable as function parameter... so why not all usage...?)
                    const assignMatch = assignRE.exec(lineString);
                    if (assignMatch && !isCommented(cm, i, assignMatch)) {
                        lineHandle = cm.getLineHandle(i);
                        cm.setGutterMarker(lineHandle, 'breakpoints', makeMarker('&bull;')); // '<span style="padding-left: 3px;">●</span>'));
                        editor.mySettings.breakpoints = true;
                    }
                }
            }
        }
    }
    // Highlight all calls to a variable
    editor.mySettings.overlay = searchOverlay(value, true);

    // this one set editor.display.viewTo viewFrom to 0,
    // preventing any editor update afterwards
    cm.addOverlay(editor.mySettings.overlay);

    if (cm.showMatchesOnScrollbar) {
        if (editor.mySettings.annotate) {
            editor.mySettings.annotate.clear();
            editor.mySettings.annotate = null;
        }
        editor.mySettings.annotate = cm.showMatchesOnScrollbar(value, true);
    }

    editor.mySettings.variable = value;
};

/////////////////////////////////
const getDebugShader = function(cm, nLine, type, variableName, keep) {
    let frag = '';
    let i;
    for (i = 0; i < nLine; i++) {
        frag += cm.getLine(i) + '\n';
    }
    // store the var
    frag += cm.getLine(i++);
    frag += ' \n shaderEditorVariableGlobal = ' + variableName + ';\n';

    if (keep) {
        const nLines = cm.getDoc().size;
        for (; i < nLines; i++) {
            frag += cm.getLine(i) + '\n';
        }
    } else {
        frag += '}';
    }

    const newVar = type + ' shaderEditorVariableGlobal;';

    //  TODO: if webgl2 out to detect shader nto using gl_FragColor like those using
    // "out color"

    const fragColor = getMainFragColorFromEditor(cm /*, currentVersion*/);
    let newFragColor = '\n' + fragColor + ' = ' + (keep ? fragColor + ' * 0.001 + ' : '');

    if (type === 'float') {
        newFragColor += 'vec4(vec3(shaderEditorVariableGlobal),1.)';
    } else if (type === 'vec2') {
        newFragColor += 'vec4(vec3(shaderEditorVariableGlobal,0.),1.)';
    } else if (type === 'vec3') {
        newFragColor += 'vec4(shaderEditorVariableGlobal,1.)';
    } else if (type === 'vec4') {
        newFragColor += 'shaderEditorVariableGlobal';
    } else {
        // need UI with 1/scale value for int...
        const scale = '1.0 / 65535.0';
        if (type === 'int') {
            newFragColor += 'vec4(vec3(shaderEditorVariableGlobal*' + scale + '),1.)';
        } else if (type === 'ivec2') {
            newFragColor += 'vec4(vec3(shaderEditorVariableGlobal*' + scale + ',0.),1.)';
        } else if (type === 'ivec3') {
            newFragColor += 'vec4(shaderEditorVariableGlobal*' + scale + ',1.)';
        } else if (type === 'ivec4') {
            newFragColor += 'vec4(shaderEditorVariableGlobal*' + scale + ')';
        }
    }
    newFragColor += ';';

    let shaderFrag = frag.replace(
        /(\s*void\s*main\s*\()|(\s*main\s*\()/gi,
        '\n' + newVar + '\n void ShaderEditorInternalMain('
    );
    shaderFrag += '\n void main() { \n ShaderEditorInternalMain(); ';
    shaderFrag += newFragColor;
    shaderFrag += '}';

    return shaderFrag;
};

const debugLine = function(cm, nLine) {
    if (cm.mySettings.type && cm.mySettings.variable) {
        currentShaderTempReplace(
            undefined,
            getDebugShader(cm, nLine, cm.mySettings.type, cm.mySettings.variable, true)
        );

        cm.mySettings.debugging = true;
    }
};

// convert to webpack
const VisualDebug = function(cm) {
    if (!cm.mySettings) cm.mySettings = {};
    cm.mySettings.debugging = false;
    cm.mySettings.active = null;
    cm.mySettings.illuminate = illuminate;
    cm.mySettings.getDebugShader = getDebugShader;
    cm.mySettings.isCommented = isCommented;
    cm.mySettings.makeMarker = makeMarker;

    cm.on('gutterClick', function(cmEdit, n) {
        const info = cm.lineInfo(n);

        if (info) {
            let gutterMarkers = info.gutterMarkers;
            if (!gutterMarkers) gutterMarkers = info.handle && info.handle.gutterMarkers;
            if (gutterMarkers && gutterMarkers.breakpoints) {
                if (cm.mySettings.active) {
                    cm.mySettings.active.setAttribute('class', 'ge_assing_marker');
                }

                gutterMarkers.breakpoints.setAttribute('class', 'ge_assing_marker_on');
                debugLine(cm, n);
                cm.mySettings.active = gutterMarkers.breakpoints;
            } else {
                let variableDebug;
                const tokens = cm.getLineTokens(info.line);
                for (let i = 0, l = tokens.length; i < l; i++) {
                    const data = tokens[i];

                    if (data.type !== 'variable') continue;

                    variableDebug = data.string.trim();
                    if (variableDebug.length === 0) {
                        variableDebug = undefined;
                    } else {
                        // break at first variable we find...
                        break;
                    }
                }
                if (variableDebug) {
                    illuminate(cm, variableDebug);
                }
            }
        }
    });
};

export { VisualDebug };
