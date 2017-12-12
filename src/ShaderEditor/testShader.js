import { logMsg } from './logs.js';

import { EditContext } from './editContext.js';

const iframe = document.getElementById('shaderTest');

function sendShaderTest(msg) {
    // @ts-ignore
    iframe.contentWindow.postMessage(msg, '*');
}

const taskQueue = {};

let checkShaderCompilationResults;

function getResults(event) {
    if (!event.data) return;
    const msg = event.data;
    if (!msg || msg.source !== 'shaderIframeTester') return;

    const results = checkShaderCompilationResults(event.data);
    if (results.success) taskQueue[0].promisesResolve(results);
    else taskQueue[0].promisesReject(results);
}
window.addEventListener('message', getResults);
// TODO: one set of context per enabled extension configuration
//TODO: queue ?
function testExtensionEnable(msgParam) {
    // @ts-ignore
    const p = new Promise(function(resolve, reject) {
        taskQueue[0] = {};
        taskQueue[0].promisesReject = reject;
        taskQueue[0].promisesResolve = resolve;

        if (msgParam.extension === '') {
            logMsg('NO extension TO TEST');
            reject({ success: false, err: 'empty shader' });
            return false;
        }

        const msg = {};
        msg.test = 'extension';
        msg.extension = msgParam.extension;
        msg.dest = 'shaderIframeTester';
        msg.version = msg.webGLVersion;
        sendShaderTest(msg);
    });
    return p;
}
function testShader(type, source, code) {
    // @ts-ignore
    const p = new Promise(function(resolve, reject) {
        taskQueue[0] = {};
        taskQueue[0].promisesReject = reject;
        taskQueue[0].promisesResolve = resolve;
        taskQueue[0].code = code;

        if (source === '') {
            logMsg('NO SOURCE TO TEST');
            reject({ success: false, err: 'empty shader' });
            return false;
        }

        while (code._errors.length > 0) {
            const mark = code._errors.pop();
            code.removeLineWidget(mark);
        }

        const msg = {};
        msg.test = 'shader';
        msg.dest = 'shaderIframeTester';
        msg.version = EditContext.getCurrentVersion();
        msg.shaderType = type;
        msg.shaderSource = source;
        sendShaderTest(msg);
    });
    return p;
}

checkShaderCompilationResults = function(results) {
    // show warning ?
    if (results.error) logMsg('ERR editor ShaderInfoLog:[' + results.error + ']');

    if (results.success) return results;

    if (results.error && results.error !== '') {
        let msg;
        let mark;
        const code = taskQueue[0].code;
        let j;
        const lineOffset = 0;
        const err = results.error.replace(/(\r\n|\n|\r)/gm, '');

        const lines = [];
        const re = /(error|warning):/gi;
        const matches = [];
        let match;
        while ((match = re.exec(err)) != null) {
            matches.push(match.index);
        }
        matches.push(err.length);
        for (j = 0; j < matches.length - 1; j++) {
            const p = matches[j];
            lines.push(err.substr(p, matches[j + 1] - p));
        }

        for (j = 0; j < lines.length; j++) {
            logMsg('[[' + lines[j] + ']]');
        }

        for (let i = 0; i < lines.length; i++) {
            const parts = lines[i].split(':');

            const isWarning = parts[0].toUpperCase() === 'WARNING';

            if (parts.length === 5 || parts.length === 6) {
                let lineNumber = parseInt(parts[2]) - lineOffset;
                if (isNaN(lineNumber)) lineNumber = 1;

                msg = document.createElement('div');
                msg.appendChild(document.createTextNode(parts[3] + ': ' + parts[4]));
                msg.className = isWarning ? 'warningMessage' : 'errorMessage';
                mark = code.addLineWidget(lineNumber - 1, msg, {
                    coverGutter: false,
                    noHScroll: true
                });

                code._errors.push(mark);
            } else if (
                lines[i] !== null &&
                lines[i] !== '' &&
                lines[i].length > 1 &&
                parts[0].toUpperCase() !== 'WARNING'
            ) {
                logMsg(parts[0]);

                let txt = 'Unknown error';
                if (parts.length === 4) txt = parts[2] + ' : ' + parts[3];

                msg = document.createElement('div');
                msg.appendChild(document.createTextNode(txt));
                msg.className = isWarning ? 'warningMessage' : 'errorMessage';
                mark = code.addLineWidget(0, msg, {
                    coverGutter: false,
                    noHScroll: true,
                    above: true
                });

                code._errors.push(mark);
            }
        }
    }
    return results;
};

export { testShader, testExtensionEnable };
