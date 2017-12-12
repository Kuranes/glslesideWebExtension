import CodeMirror from './src/codemirror_include.js';
import { EditContext } from './editContext.js';
import { searchBar, searchEl, tabsDoc, tabsLowerPane } from './domBind.js';
import { selectProgram } from './editorMain.js';
import fuzzysort from 'fuzzysort';
import { splitLowerEditor } from './domBind.js';

// https://github.com/farzher/fuzzysort#how-to-go-fast--performance-tips

// TODO: versionning the shader change => prepare on change
// on focus PREPARE
// on input type search

let preSearchDocTabEl;
let previewTabEl;
let selectedResult = 0;
let searchPower;
let isRigid = false;

let previousValSearch, prevRigidSearchHTML, prevFuzzySearchHTML;

const searchObjects = [
    //{ name: 'shaderName', file: 'shader text content' },
    //{ name: 'shaderName2', file: 'shader text content 2' }
];

let searchTargets;
const searchPrepare = function() {
    const targets = searchObjects;
    searchTargets = [];
    let entry;
    for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        const p = t.program;
        if (p) {
            if (p.vertexShader.text) {
                entry = {};
                // @ts-ignore
                entry.program = p;
                // @ts-ignore
                entry.vertex = true;
                // @ts-ignore
                entry.uid = p.uid;
                // @ts-ignore
                entry.name = p.vertexShader.name || p.name;
                // @ts-ignore
                entry.file = p.vertexShader.text;

                // @ts-ignore
                entry.numLines = entry.file.match(/\n/g).length + 1;

                //entry.filePrepared = fuzzysort.prepareSlow(entry.file);
                // @ts-ignore
                entry.fileLowerCase = entry.file.toLowerCase();
                // @ts-ignore
                entry.namePrepared = fuzzysort.prepareSlow(entry.name);

                searchTargets.push(entry);
            }
            if (p.fragmentShader.text) {
                entry = {};
                // @ts-ignore
                entry.program = p;
                // @ts-ignore
                entry.vertex = false;
                // @ts-ignore
                entry.uid = p.uid;
                // @ts-ignore
                entry.name = p.fragmentShader.name || p.name;
                // @ts-ignore
                entry.file = p.fragmentShader.text;

                // @ts-ignore
                entry.numLines = entry.file.match(/\n/g).length + 1;
                //entry.filePrepared = fuzzysort.prepareSlow(entry.file);

                // @ts-ignore
                entry.fileLowerCase = entry.file.toLowerCase();
                // @ts-ignore
                entry.namePrepared = fuzzysort.prepareSlow(entry.name);

                searchTargets.push(entry);
            }
        }
    }
};

const highlightResult = function(index, doHighlight, highligthEl) {
    let elTarget = highligthEl;
    if (!elTarget) {
        const results = document.querySelectorAll('.fileSearchResult');
        if (results.length === 0 || index >= results.length) return false;
        elTarget = results[index];
    }
    if (doHighlight) elTarget.classList.add('cm-matchhighlight');
    else elTarget.classList.remove('cm-matchhighlight');
    //elTarget.style.backgroundColor =  ? 'lightcoral' : '';
    elTarget.scrollIntoView();
};

const findLineAndOffsetInFile = function(entry, startOffset) {
    const file = entry.file;

    let numLineCount = 0;
    let offset = startOffset;
    const fileLength = file.length;
    while (offset !== -1 && offset < fileLength && numLineCount < entry.numLines) {
        offset = file.indexOf('\n', offset + 1);
        numLineCount++;
    }
    return entry.numLines + 1 - numLineCount;
};

const searchHighLightLine = function(
    searchType,
    program,
    shaderType,
    startOffset,
    wordLength,
    lineStart,
    word,
    lineEnd,
    isOnlyTitle
) {
    const uid = program.uid;
    const fileName = program.name + ':' + (program.vertex ? 'VS' : 'FS');

    const lines = isOnlyTitle ? 0 : findLineAndOffsetInFile(program, startOffset + lineEnd.length);

    const type = 'shader';
    let fileNamePointer;
    const fileNameLined = fileName + ':' + lines + ':' + lineStart.length;
    //    fileNamePointer  = `${fileNameLined} => ${lineStart}<b>${word}</b>${lineEnd}`;
    fileNamePointer = `${fileNameLined}: ${lineStart}${word}${lineEnd}`;
    const div = document.createElement('DIV');
    // @ts-ignore
    CodeMirror.runMode(fileNamePointer, 'text/x-essl', div);
    fileNamePointer = div.innerHTML.replace(word, `<b>${word}</b>`);
    return `<li class="${searchType}" data-startOffset="${startOffset}" data-matchLength="${wordLength}" 
        data-uid="${uid}" data-shader="${shaderType}" data-type="${type}"> 
        ${fileNamePointer}</li>`;
};

const searchHighLight = function(result, target, resultObj) {
    let highlighted = '';
    let matchesIndex = 0;
    let opened = false;
    const targetLen = target.length;
    const matchesBest = result.indexes;
    const shaderType = resultObj.obj.vertex ? 'VS' : 'FS';

    let tempChar = '';
    let word, lineStart, lineEnd, startOffset, matchLength;
    for (let i = 0; i < targetLen; ++i) {
        const char = target[i];
        if (char === '\n') {
            if (opened) {
                opened = false;
                lineEnd = tempChar;
                highlighted += searchHighLightLine(
                    'fileSearchResult',
                    resultObj.obj,
                    shaderType,
                    startOffset,
                    matchLength,
                    lineStart,
                    word,
                    lineEnd
                );
                tempChar = '';
                continue;
            } else {
                tempChar = '';
                continue;
            }
        }
        if (matchesBest[matchesIndex] === i) {
            ++matchesIndex;
            if (!opened) {
                opened = true;
                startOffset = i;
                matchLength = matchesBest.length;
                lineStart = tempChar;
                tempChar = '';

                word = '';
                lineEnd = '';
            }

            word += char;
        } else {
            tempChar += char;
        }
    }
    if (opened) {
        lineEnd = tempChar;
        highlighted += searchHighLightLine(
            'fileSearchResult',
            resultObj.obj,
            shaderType,
            startOffset,
            matchLength,
            lineStart,
            word,
            lineEnd,
            true
        );
    }
    return highlighted;
};

const openSearchResult = function(entry) {
    const attributes = entry.attributes;
    const uid = attributes['data-uid'].value;

    // command or file or name
    let type;
    if (attributes['data-type']) {
        type = attributes['data-type'].value;
    }
    if (type === 'shader') {
        let startOffset;
        let matchLength;
        if (attributes['data-startOffset']) {
            startOffset = parseInt(attributes['data-startOffset'].value, 10);
            if (attributes['data-matchLength']) {
                matchLength = parseInt(attributes['data-matchLength'].value, 10);
            }
        }
        // vertex or fragment
        let shaderType;
        if (attributes['data-shader']) {
            shaderType = attributes['data-shader'].value;
        } else {
            // fragment by default
            shaderType = 'FS';
        }

        selectProgram(uid, startOffset, matchLength, shaderType);
    }

    //tabsDoc.tabSelect(shader.tab);
};

const searchResultClick = function(e) {
    openSearchResult(e.currentTarget);
};
function showHTMLResults(html) {
    searchEl.innerHTML = html;
    highlightResult(0, true);
}
function searchFuzzyResultsToHTML(results) {
    if (!results.length) {
        searchEl.innerHTML = '';
        prevFuzzySearchHTML = '';
        return false;
    }
    let html = '<ul>';
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        for (let k = 0; k < result.length; k++) {
            const target = result[k];
            if (!target) continue;
            const highlighted = searchHighLight(target, target.target, result);
            html += highlighted;
        }
    }
    html += '</ul>';

    showHTMLResults(html);
    prevFuzzySearchHTML = html;
    return true;
}

function searchRigidResultsToHTML(results, matchLength, matchWord) {
    if (!results.length) {
        searchEl.innerHTML = '';
        prevRigidSearchHTML = '';
        return false;
    }
    console.time('search: highlight');

    // TODO: first file must be the current file?
    // TODO: first file must be the opened Tab file?
    // Todo: paging limit to visible results ?
    let html = '<ul>';
    //var maxRes = Math.max(100, results.length);
    const maxRes = results.length;
    console.log('search: ' + maxRes);
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        for (let k = 0; k < result.indexes.length; k++) {
            const startOffset = result.indexes[k];
            const shaderType = result.obj.vertex ? 'VS' : 'FS';
            const stringSearchTarget = result.obj.file;
            const word = matchWord; //stringSearchTarget.substr(startOffset, matchLength);

            let lastIdx = startOffset;
            if (lastIdx !== 0) {
                while (stringSearchTarget[lastIdx] !== '\n') {
                    if (lastIdx === 0) {
                        break;
                    }
                    lastIdx--;
                }
                lastIdx++;
            }
            const lineStart = stringSearchTarget.substr(lastIdx, startOffset - lastIdx);

            lastIdx = startOffset + matchLength;

            lastIdx = stringSearchTarget.indexOf('\n', lastIdx);

            // // TODO: use indexOf and substract to get it.
            // var searchTargetLength = stringSearchTarget.length;
            // if (lastIdx < searchTargetLength && stringSearchTarget[lastIdx] !== '\n') {
            //     while (stringSearchTarget[lastIdx] !== '\n') {
            //         if (lastIdx === searchTargetLength) {
            //             break;
            //         }
            //         lastIdx++;
            //     }
            // }
            const lineEnd = stringSearchTarget.substr(
                startOffset + matchLength,
                lastIdx - (startOffset + matchLength)
            );

            html += searchHighLightLine(
                'fileSearchResult',
                result.obj,
                shaderType,
                startOffset,
                matchLength,
                lineStart,
                word,
                lineEnd,
                false
            );
        }
    }
    html += '</ul>';

    console.timeEnd('search: highlight');
    console.time('search: html');
    showHTMLResults(html);
    console.timeEnd('search: html');
    prevRigidSearchHTML = html;
    return true;
}
const searchClickResultMonitor = function() {
    let p;
    let nodes = document.querySelectorAll('.fileSearchResult');
    if (nodes.length) {
        for (p = 0; p < nodes.length; p++) {
            nodes[p].addEventListener('click', searchResultClick, false);
        }
    }
    nodes = document.querySelectorAll('.textSearchResult');
    if (nodes.length) {
        for (p = 0; p < nodes.length; p++) {
            nodes[p].addEventListener('click', searchResultClick, false);
        }
    }
};
const searchRigid = function(val) {
    if (!searchTargets) {
        console.time('search: prepare');
        searchPrepare();
        console.timeEnd('search: prepare');
    }

    console.time('search: indexOf');
    const results = [];
    const searchLowerCase = val.toLowerCase();
    for (let t = 0; t < searchTargets.length; t++) {
        const target = searchTargets[t];
        let idx = target.fileLowerCase.indexOf(searchLowerCase, 0);
        if (idx === -1) continue;

        const resultTarget = { indexes: [], obj: target };
        while (idx !== -1) {
            resultTarget.indexes.push(idx);
            idx = target.fileLowerCase.indexOf(searchLowerCase, idx + 1);
        }
        results.push(resultTarget);
    }
    console.timeEnd('search: indexOf');

    if (searchRigidResultsToHTML(results, val.length, val)) {
        searchClickResultMonitor();
    }
};

searchPower = function(val) {
    if (!searchTargets) {
        console.time('search: prepare');
        searchPrepare();
        console.timeEnd('search: prepare');
    }
    fuzzysort
        .goAsync(val, searchTargets, {
            keys: ['namePrepared'],
            //keys: ['namePrepared', 'filePrepared'],
            allowTypo: true,
            limit: 50, // don't return more results than you need!
            threshold: -50000 // don't return bad results
        })
        .then(function(results) {
            if (searchFuzzyResultsToHTML(results)) {
                searchClickResultMonitor();
            }
        })
        .catch(function(e) {
            searchEl.innerHTML = '';
            console.log('search error' + e);
        });
};

const search = function(val) {
    if (!val || !val.length || !searchObjects.length) {
        searchEl.innerHTML = '';
        return;
    }
    if (val === previousValSearch) {
        searchEl.innerHTML = isRigid ? prevRigidSearchHTML : prevFuzzySearchHTML;
        searchClickResultMonitor();
        return;
    }
    previousValSearch = val;
    return isRigid && val.length > 3 ? searchRigid(val) : searchPower(val);
};

///////////////////////////////////////
const moveSearchHilight = function(direction) {
    const results = document.querySelectorAll('.fileSearchResult');
    if (!results.length) return false;

    const previousSelectIndex = selectedResult;
    selectedResult = Math.min(Math.max(selectedResult + direction, 0), results.length);
    if (previousSelectIndex === selectedResult) return;

    // unselect previous
    highlightResult(previousSelectIndex, false, results[previousSelectIndex]);

    // move current selection, select Doc
    const result = results[selectedResult];
    highlightResult(selectedResult, true, result);

    const getPreviousOpenedTabList = tabsDoc.getOpenedTabs().slice(0);
    openSearchResult(result);

    // TODO: FILE tree selection change

    const newTabSelection = tabsDoc.getSelectedTab();
    // wasn't already opened we will close it if we move
    if (getPreviousOpenedTabList.indexOf(newTabSelection) === -1) {
        if (previewTabEl) {
            tabsDoc.removeTab(previewTabEl);
        }
        previewTabEl = newTabSelection;
    }
    return true;
};

const startSearch = function() {
    preSearchDocTabEl = tabsDoc.getSelectedTab();
    tabsLowerPane.tabSelectByName('Search');
    console.time('search: prepare');
    searchPrepare();
    console.timeEnd('search: prepare');
};
const cancelSearch = function() {
    splitLowerEditor.toggle(1, false);

    searchTargets = undefined;
    if (previewTabEl) tabsDoc.removeTab(previewTabEl);
    if (preSearchDocTabEl) tabsDoc.tabSelect(preSearchDocTabEl);
    previewTabEl = undefined;
    preSearchDocTabEl = undefined;
    selectedResult = 0;
    searchEl.innerHTML = '';
};
//////////////////////////////://////////

// keypress, keydown, keyup ?
// http://unixpapa.com/js/testkey.html
searchBar.addEventListener('keyup', function(e) {
    let isInputChar = false;
    if (typeof e.which === 'number' && e.which > 0) {
        // In other browsers except old versions of WebKit, evt.which is
        // only greater than zero if the keypress is a printable key.
        // We need to filter out backspace and ctrl/alt/meta key combinations
        isInputChar = !e.metaKey && !e.altKey;
        // !e.ctrlKey &&  && e.which != 8; // <= keep delete and ctrl+v
    }
    if (e.which === 40) {
        // down
        moveSearchHilight(1);
        return false;
    } else if (e.which === 38) {
        // up
        moveSearchHilight(-1);
        return false;
    }
    if (isInputChar) {
        //search(e.key.length === 1 ? e.target.value + e.key : e.target.value);
        // @ts-ignore
        search(e.target.value);
        return false;
    }

    return false;
});

searchBar.addEventListener('blur', function(/*e*/) {
    cancelSearch();
    // need more clever
});
searchBar.addEventListener('focus', function(/*e*/) {
    startSearch();
    // need more clever
});

function isRigidSearch() {
    return isRigid;
}

function setRigidSearch(val) {
    isRigid = val;
}
function getSelectedResult() {
    return selectedResult;
}
export {
    searchObjects,
    cancelSearch,
    openSearchResult,
    isRigidSearch,
    setRigidSearch,
    getSelectedResult
};
