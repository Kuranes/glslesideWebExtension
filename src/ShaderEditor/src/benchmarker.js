import CodeMirror from 'codemirror/lib/codemirror.js';
import {
    currentShaderTempReplace,
    currentShaderTimingRequest
} from '../src/currentShaderCallbacks.js';

import { computeShaderContext, shaderContext } from './shaderInfo.js';

function getResultRange(test_results) {
    let min_ms = '10000000.0';
    let min_line = 0;
    let max_ms = '0.0';
    let max_line = 0;
    for (const i in test_results) {
        if (test_results[i].ms < min_ms) {
            min_ms = test_results[i].ms;
            min_line = test_results[i].line;
        }
        if (test_results[i].ms > max_ms) {
            max_ms = test_results[i].ms;
            max_line = test_results[i].line;
        }
    }
    return { min: { line: min_line, ms: min_ms }, max: { line: max_line, ms: max_ms } };
}

function getMedian(values) {
    values.sort(function(a, b) {
        return a - b;
    });

    const half = Math.floor(values.length / 2);

    if (values.length % 2) return values[half];
    else return (values[half - 1] + values[half]) / 2.0;
}

function getDeltaSum(test_results) {
    let total = 0.0;
    for (const i in test_results) {
        if (test_results[i].delta > 0) {
            total += test_results[i].delta;
        }
    }
    return total;
}

function getHits(test_results) {
    let total = 0;
    for (const i in test_results) {
        if (test_results[i].delta > 0) {
            total++;
        }
    }
    return total;
}

function widget_on_right(cm, lineNumber, element, startColumn, endColumn) {
    if (typeof startColumn !== 'undefined') {
        if (typeof endColumn === 'undefined') endColumn = Infinity;

        const base = cm.cursorCoords(new CodeMirror.Pos(lineNumber, 0), 'page');
        const start = cm.cursorCoords(new CodeMirror.Pos(lineNumber, startColumn), 'page');
        const end = cm.charCoords(new CodeMirror.Pos(lineNumber, endColumn), 'page');
        element.style.width = end.right - start.left + 'px';
        element.style.left = start.left - base.left + 'px';
    }
}

function benchmarkLine(cm, nLine) {
    const settings = cm.mySettings;
    const docSize = cm.getDoc().size;
    let type;
    let name;
    // until a meaningfull line
    while (nLine < docSize) {
        const lineInfo = shaderContext.instructions[nLine];
        if (!lineInfo) {
            nLine++;
            continue;
        }
        name = lineInfo.name;
        if (lineInfo.struct) {
            name = lineInfo.struct + name;
        }
        type = lineInfo.type;
        // not an empty line, with an active variable
        // and we know the type
        // we'll bench then
        break;
    }

    if (nLine < docSize) {
        settings.benchmarkingLine = nLine;
        console.log('benchmark ' + nLine + '/' + docSize);

        // Prepare
        settings.benchmarking = true;
        settings.benchmarkingLine = nLine;
        settings.benchmarkingFrag = settings.getDebugShader(cm, nLine, type, name, false);
        settings.benchmarkingSamples = [];

        //unfocusAll(cm);
        //focusLine(cm, nLine);
        settings.debugging = true;

        currentShaderTempReplace(onBenchmark, settings.benchmarkingFrag);
        currentShaderTimingRequest(onBenchmark);
        return;
    }

    // If is done benchmarking...
    //assert (nLine >= docSize)
    settings.benchmarkingLine = 0;
    settings.benchmarking = false;

    const results = settings.benchmarkingResults;

    const range = getResultRange(results);
    const sum = getDeltaSum(results);
    const hits = getHits(results);

    console.log('Test: ', range.max.ms + 'ms', results);
    cm.clearGutter('breakpoints');

    for (const i in results) {
        const result = results[i];
        const pct = (result.delta / sum) * 100;
        const size = (result.delta / sum) * 30;
        const timing = result.ms.toFixed(2);
        let marker_html = '<div>' + timing;
        if (timing > 0) {
            marker_html += '<span class="ge_assing_marker_pct ';
            if (pct > 100.0 / hits) {
                marker_html += 'ge_assing_marker_slower';
            }
            marker_html +=
                '" style="width: ' +
                size.toFixed(0) +
                'px;" data="' +
                pct.toFixed(0) +
                '%"></span>';
        }

        //cm.addLineWidget(result.line, marker_html + '</div>');
        //widget_on_right(cm, result.line, el)
        cm.setGutterMarker(
            results[i].line,
            'breakpoints',
            settings.makeMarker(marker_html + '</div>')
        );
    }

    console.log('eof on: ' + nLine);
}

const N_SAMPLES = 30;

function onBenchmark(cm, wasValid) {
    const settings = cm.mySettings;

    // If the test shader compiled...
    if (wasValid === 'true') {
        console.log('compiled');
        return;
    }

    // If the test shader failed to compile...
    if (wasValid === 'false') {
        console.log('ignored');
        // ignore and Test next line
        benchmarkLine(cm, settings.benchmarkingLine + 1);
    }

    // get data, process and store.
    let elapsedMs = wasValid;

    //console.log('timed' + elapsedMs);
    settings.benchmarkingSamples.push(elapsedMs);

    if (settings.benchmarkingSamples.length < N_SAMPLES - 1) {
        // TODO not work because same shader ?
        //currentShaderTempReplace(onBenchmark, settings.benchmarkingFrag);
        //console.log('new timing Request' );
        currentShaderTimingRequest(onBenchmark);
    } else {
        //focusAll(cm);

        settings.debugging = false;
        elapsedMs = getMedian(settings.benchmarkingSamples);

        console.log('timing sampling done: ' + elapsedMs);

        const range = getResultRange(settings.benchmarkingResults);
        let delta = elapsedMs - range.max.ms;
        if (settings.benchmarkingResults.length === 0) {
            delta = 0.0;
        }

        settings.benchmarkingResults.push({
            line: settings.benchmarkingLine,
            ms: elapsedMs,
            delta: delta
        });

        // console.log('benchmarking line:', settings.benchmarkingLine, elapsedMs, delta, range);

        // Create gutter marker
        cm.setGutterMarker(
            settings.benchmarkingLine,
            'breakpoints',
            settings.makeMarker(elapsedMs.toFixed(2))
        );

        // Test next line
        console.log('Test next line');
        benchmarkLine(cm, settings.benchmarkingLine + 1);
    }
}

function benchmarkShader(cm) {
    // Clean previous records
    cm.mySettings.benchmarkingResults = [];
    // compute for whole bench the shader info
    computeShaderContext(cm);
    benchmarkLine(cm, shaderContext.mainLine + 1);
}

export { benchmarkShader };
