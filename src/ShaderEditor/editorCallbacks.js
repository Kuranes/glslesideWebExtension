import { benchmarkShader } from './src/benchmarker.js';
import {
    shaderEditorFooter,
    shaderEditorPanel,
    splitLowerEditor,
    //editorContainer,
    splitTreeEditor
} from './domBind.js';
import { EditContext } from './editContext.js';
import {
    ShaderEditorFormat,
    ShaderEditorOptimize,
    ShaderEditorPreProcess
} from './src/ShaderEditor.js';
import { encodeSource } from './src/base64.js';
import { logMsg } from './logs.js';
import { saveSettings, sendCodeToClient } from '../editorHooks/message_ui.js';
import { testShader } from './testShader.js';

/// Editor Callbacks Toolbar

function updateShaderEditorCode() {
    const program = EditContext.getCurrentProgram();
    if (program === null || program === undefined) return;

    const sourceCode = EditContext.shaderEditor.getValue();
    let shader;
    const shaderType = EditContext.getCurrentShaderType();
    if (shaderType === 'VS') {
        if (program.vertexShader.text === sourceCode) {
            //no changes
            return;
        }
        program.vertexShader.text = sourceCode;
        shader = program.vertexShader;
    } else {
        if (program.fragmentShader.text === sourceCode) {
            //no changes
            return;
        }
        program.fragmentShader.text = sourceCode;
        shader = program.fragmentShader;
    }

    updateShaderEditorCount();

    testShader(EditContext.getCurrentShaderTypeGL(), sourceCode, EditContext.shaderEditor)
        .then(function(results) {
            logMsg(results);

            if (results.debugShader) {
                EditContext.getCurrentProgram().hlsl = results.debugShader;
            }
            updateShaderEditorCount(results);

            shaderEditorPanel.classList.add('compiled');
            shaderEditorPanel.classList.remove('not-compiled');
            // sendCodeToClient({
            //     action: 'ShaderEditorUpdate',
            //     id: program.id,
            //     source: encodeSource(sourceCode),
            // ctxtId: program.ctxtId
            // });
            //shaderType 'FS' 'VS';

            //console.log(EditContext.getCurrentShaderType() + 'EditorUpdate');

            sendCodeToClient({
                action: shaderType + 'EditorUpdate',
                id: program.id,
                sourceCode: encodeSource(sourceCode),
                ctxtId: program.ctxtId
            });

            shader.dirty = true;
            // preprocess again
            // find main again
        })
        .catch(function(/*results*/) {
            shaderEditorPanel.classList.add('not-compiled');
            shaderEditorPanel.classList.remove('compiled');
        });
}

function updateShaderEditorCount(results) {
    let txt = EditContext.shaderEditor.getValue().length + ' chars ';
    txt += '| ' + EditContext.shaderEditor.lineCount() + ' lines';
    if (results) {
        txt += '| ' + results.compilationTime + 'ms ';
    }

    //shaderEditorFooter.textContent = txt;
    const sEd = shaderEditorFooter.querySelector('#info-text-shader');
    sEd.textContent = txt;
}

/// FORMAT
document.getElementById('shadereditor-format').addEventListener('click', function(e) {
    ShaderEditorFormat(EditContext.shaderEditor);
    updateShaderEditorCode();
    e.preventDefault();
});

// take whole space
let splitCollapsed = false;
document.getElementById('shadereditor-fullscreen').addEventListener('click', function(e) {
    //shaderEditorPanel.classList.toggle('fullscreen');
    //shaderEditorPanel.classList.toggle('hide');
    if (splitCollapsed) {
        splitTreeEditor.reset();
        splitLowerEditor.reset();
        splitCollapsed = false;
    } else {
        splitTreeEditor.collapse(0);
        splitLowerEditor.collapse(1);
        splitCollapsed = true;
    }
    e.preventDefault();
});

// glsl - optimizer
document.getElementById('shadereditor-optimise').addEventListener('click', function(e) {
    logMsg('ShaderEditor optimise');
    ShaderEditorOptimize(EditContext.shaderEditor);
    updateShaderEditorCode();
    e.preventDefault();
});

// preprocessor
document.getElementById('shadereditor-preprocess').addEventListener('click', function(e) {
    logMsg('ShaderEditor preprocess');
    ShaderEditorPreProcess(EditContext.shaderEditor);
    updateShaderEditorCode();
    e.preventDefault();
});

document.getElementById('shadereditor-benchmark').addEventListener('click', function(e) {
    logMsg('fs benchmark');
    benchmarkShader(EditContext.shaderEditor);
    e.preventDefault();
});

document.getElementById('shadereditor-pick').addEventListener('click', function(e) {
    logMsg('fs pick');
    pickValue();
    e.preventDefault();
});

document.getElementById('shadereditor-watch').addEventListener('click', function(e) {
    logMsg('fs watch');
    watchValue();
    e.preventDefault();
});

document.getElementById('shadereditor-screenshot').addEventListener('click', function(e) {
    logMsg('fs screenshot');
    screenshot();
    e.preventDefault();
});

document.getElementById('shadereditor-startrecord').addEventListener('click', function(e) {
    logMsg('fs startrecord');
    startrecord();
    e.preventDefault();
});

document.getElementById('shadereditor-play').addEventListener('click', function(e) {
    logMsg('fs play');
    playPause();
    e.preventDefault();
});

document.getElementById('shadereditor-slow').addEventListener('click', function(e) {
    logMsg('fs slow');
    slowDown();
    e.preventDefault();
});

document.getElementById('shadereditor-downloadStateRecord').addEventListener('click', function(e) {
    logMsg('fs staterecord');
    downloadStateRecord();
    e.preventDefault();
});

/// Panel Callbacks Toolbar
// Highlight shader
/*
document.getElementById('highlightButton').addEventListener('click', function (e) {
    EditContext.settingsConfiguration.tmpDisableHighlight = !EditContext.settingsConfiguration.tmpDisableHighlight;
    this.style.opacity = EditContext.settingsConfiguration.tmpDisableHighlight ? .5 : 1;
    saveSettings();
    e.preventDefault();
});
*/

document.getElementById('highlightShaders').addEventListener('change', function(e) {
    // @ts-ignore
    EditContext.settingsConfiguration.highlight = this.checked;
    // @ts-ignore
    logMsg(this.checked);
    saveSettings();
    // @ts-ignore
    document.getElementById('highlightButton').style.opacity = EditContext.settingsConfiguration
        .highlight
        ? 1
        : 0.5;
    e.preventDefault();
});
// texture spy
document.getElementById('monitorTextures').addEventListener('change', function(e) {
    // @ts-ignore
    EditContext.settingsConfiguration.textures = this.checked;
    saveSettings();
    e.preventDefault();
});
//logs
document.getElementById('logShaderEditor').addEventListener('change', function(e) {
    // @ts-ignore
    EditContext.settingsConfiguration.logShaderEditor = this.checked;
    saveSettings();
    e.preventDefault();
});
//debug
document.getElementById('debugShaderEditor').addEventListener('change', function(e) {
    // @ts-ignore
    EditContext.settingsConfiguration.debugShaderEditor = this.checked;
    saveSettings();
    e.preventDefault();
});

/// image drop
function createDropZone(imgCallback) {
    const dropzone = document.createElement('div');
    dropzone.className = 'dropzone';

    dropzone.addEventListener(
        'dragenter',
        function() {
            this.style.backgroundColor = 'rgba( 255,255,255,.2 )';
        },
        true
    );

    dropzone.addEventListener(
        'dragleave',
        function() {
            this.style.backgroundColor = 'transparent';
        },
        true
    );

    dropzone.addEventListener(
        'dragover',
        function(event) {
            this.style.backgroundColor = 'rgba( 255,255,255,.2 )';
            event.preventDefault();
        },
        true
    );

    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.style.opacity = '0';

    dropzone.appendChild(input);

    function handleFileSelect(e) {
        const files = e.target.files; // FileList object
        loadFiles(files);
    }

    input.addEventListener('change', handleFileSelect, false);

    function loadFiles(files) {
        const reader = new FileReader();
        reader.onload = function(/*e*/) {
            try {
                const img = new Image();
                img.onload = function() {
                    const c = document.createElement('canvas');
                    const ctx = c.getContext('2d');
                    c.width = img.width;
                    c.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    imgCallback(c.toDataURL());
                };
                //img.src = e.currentTarget.result;
            } catch (err) {
                alert('unreadable file');
            }
        };
        reader.readAsDataURL(files[0]);
    }

    dropzone.addEventListener(
        'drop',
        function(event) {
            //showLoader( true );

            this.style.backgroundColor = 'transparent';
            event.preventDefault();
            loadFiles(event.dataTransfer.files);
        },
        true
    );

    return dropzone;
}
function pickValue() {
    sendCodeToClient({
        action: 'Pick',
        ctxtId: EditContext.getCurrentContextID()
    });
}

function watchValue() {
    sendCodeToClient({
        action: 'SlowDown',
        ctxtId: EditContext.getCurrentContextID()
    });
}

function screenshot() {
    sendCodeToClient({
        action: 'Screenshot',
        ctxtId: EditContext.getCurrentContextID()
    });
}
function startrecord() {
    sendCodeToClient({
        action: 'Record',
        ctxtId: EditContext.getCurrentContextID()
    });
}
function playPause() {
    sendCodeToClient({
        action: 'PlayPause',
        ctxtId: EditContext.getCurrentContextID()
    });
}
function slowDown() {
    sendCodeToClient({
        action: 'Slow',
        ctxtId: EditContext.getCurrentContextID()
    });
}

function downloadStateRecord() {
    sendCodeToClient({
        action: 'downloadStateRecord',
        ctxtId: EditContext.getCurrentContextID()
    });
}

////

function addAndButton(title, id, icon) {
    // TODO: append to ...
    const element = document.getElementById(id);
    element.title = title;
    // add Icon

    return element;
}

function addAndConnectButton(title, id, actionMessage, icon) {
    const element = addAndButton(title, id, icon);
    element.addEventListener('click', function(e) {
        logMsg(actionMessage);
        // add button, add title, add icon
        sendCodeToClient({
            action: actionMessage,
            ctxtId: EditContext.getCurrentContextID()
        });
        e.preventDefault();
    });
    return element;
}

export { updateShaderEditorCode, updateShaderEditorCount, createDropZone };
