import CodeMirror from './codemirror_include.js';
//import * as monaco from '@timkendrick/monaco-editor';

import './webgl-glsl-def.js';
import './autoformat.js';

// Debug, bench, etchttps://github.com/patriciogonzalezvivo/glslEditor
import { VisualDebug } from './visualdebugger.js';
import { mouseOutEditor, mouseMoveEditor } from './glsl_helper.js';

// inline edit http://enjalot.github.io/Inlet/
//import './Inlet/src/thistle/thistle.js';
//import Inlet from './Inlet/inlet.js';

//  preprocess code: remove useless preprocessor blocks
import preProcessShader from '../glsl/glsl-preprocessor/preprocessor.js';
//import preProcessShader from 'glslespreprocessor';

//glsl optimize async and "locationed" plugin load
//import optimize_glsl from '../glsl/glsl-optimizer/glsl-optimizer.loader.js';
//import '../glsl/glsl-optimizer/glsl-optimizer.min.js';

const createShaderEditorInstance = function(id, type, scheduleUpdate) {
    /*
    var options = {
        value: '',
        language: 'cpp',

        glyphMargin: true,
        lineNumbers: 'on',
        roundedSelection: true,
        scrollBeyondLastLine: true,
        readOnly: false,
        nativeContextMenu: false,
        theme: 'vs-dark',
        scrollbar: {
            useShadows: true,
            verticalHasArrows: false,
            horizontalHasArrows: false,
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 5,
            horizontalScrollbarSize: 5,
            arrowSize: 5
        }
    };
*/
    const options = {
        lineNumbers: true,
        matchBrackets: true,
        indentWithTabs: false,
        tabSize: 4,
        indentUnit: 4,
        mode: 'text/x-essl',
        viewportMargin: Infinity,
        foldGutter: true,
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter', 'breakpoints'],
        extraKeys: { 'Ctrl-Space': 'autocomplete' },

        highlightSelectionMatches: {
            wordsOnly: false,
            showToken: false,
            delay: 1150,
            annotateScrollbar: true
        },

        showMatchesOnScrollbar: true
    };

    let editorPanel = document.getElementById(id);

    const son = document.createElement('div');
    son.id = 'editor-target';
    editorPanel.appendChild(son);
    //editorPanel.insertBefore(son, document.getElementById(id.split('-')[0] + '-footer'));
    editorPanel = son;

    const editor = CodeMirror(editorPanel, options);
    // @ts-ignore
    son.firstElementChild.style = 'height: 100%;';
    VisualDebug(editor);
    //Inlet(editor);
    // @ts-ignore
    editor.refresh();
    // @ts-ignore
    editor.setSize('100%', '100%');
    // addon panel kills the size with hardcoded value
    //document.querySelector('.CodeMirror').style.height = '100%';
    // @ts-ignore
    editor._errors = [];

    // editor.getWrapperElement().setAttribute('id', 'Editor');
    // @ts-ignore
    editor.on('change', scheduleUpdate);

    function keyEventUpdate(cm, event) {
        scheduleUpdate(cm);

        if (cm.somethingSelected()) {
            return;
        }

        const cursor = cm.getCursor(true);
        const token = cm.getTokenAt(cursor);

        if (token && token.end - token.start > 3) {
            if (
                event &&
                !cm.state.completionActive /*Enables keyboard navigation in autocomplete list*/ &&
                [9, 13, 16, 17, 18, 33, 34, 35, 36, 37, 38, 39, 40].indexOf(event.keyCode) === -1
            ) {
                /*cursor movements excluded*/
                // @ts-ignore
                CodeMirror.commands.autocomplete(cm, null, { completeSingle: false });
            }
        }
    }

    // @ts-ignore
    editor.on('keyup', keyEventUpdate);

    //editor.on('mousemove', mouseMoveEditor);
    // @ts-ignore
    editor.getWrapperElement().addEventListener('mousemove', function(event) {
        mouseMoveEditor(editor, event);
    });
    // @ts-ignore
    editor.getWrapperElement().addEventListener('mouseout', function(event) {
        // @ts-ignore
        mouseOutEditor(editor, event);
    });

    return editor;
};

const regexNewLine = /(;|{|}|\*\/)/g;
const reformatString = function(match, c) {
    if (c !== undefined) {
        // single char
        return c + '\n';
    }
};

const ShaderEditorFormat = function(editor) {
    let source = editor.getValue();

    source = source.replace(regexNewLine, reformatString);
    editor.setValue(source);
    const totalLines = editor.lineCount();

    editor.autoFormatRange(
        {
            line: 0,
            ch: 0
        },
        {
            line: totalLines
        }
    );
    editor.refresh();
    //editor.setSize('100%', '100%');
    // addon panel kills the size with hardcoded value
    //document.querySelector('.CodeMirror').style.height = '100%';
    editor.setSelection({
        line: 0,
        ch: 0
    });
};

const ShaderEditorOptimize = function(editor) {
    const source = editor.getValue();
    //source = optimize_glsl(source, 2, true);
    editor.setValue(source);
};

const ShaderEditorPreProcess = function(editor) {
    const source = editor.getValue();
    const res = preProcessShader(source);
    editor.setValue(res);
};

export {
    ShaderEditorFormat,
    ShaderEditorOptimize,
    ShaderEditorPreProcess,
    createShaderEditorInstance
};
