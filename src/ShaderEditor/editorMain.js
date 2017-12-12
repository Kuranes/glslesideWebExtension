import { addHooksString } from '../clientHook.js';
import { addClientMessenger } from '../WebGLHooks/message_ui_client.js';
import { updateShaderEditorCode, updateShaderEditorCount } from './editorCallbacks.js';
import browserExt from '../extensionPolyfill.js';
import { clearLogs, logMsg } from './logs.js';
import {
    clientMessageListener,
    injectCodeToClient,
    sendCodeToClient
} from '../editorHooks/message_ui.js';
import { makeTooltip } from './src/glsl_helper.js';
import { getMainFragColor } from './src/shaderInfo.js';
import {
    assettree,
    inputTheme,
    shaderEditorFooter,
    shaderEditorPanel,
    tabsDoc,
    texturePanel,
    addLowerBar,
    selectCodeMirrorTheme,
    fontawesome
} from './domBind.js';
import { EditContext } from './editContext.js';
import { searchObjects } from './powerSearch.js';
import { createShaderEditorInstance } from './src/ShaderEditor.js';
import { currentShaderTempReplace } from './src/currentShaderCallbacks.js';
import { getQueryDataCallback } from './src/dataWatcher.js';
import VanillaTree from './widget/tree/vanillatree.js';
import { initShortcuts } from './shortcut.js';
import { decodeSource } from './src/base64.js';

let assetTreeView;
let _addingIcons;

if (EditContext.verbose) {
    clearLogs();
}
logMsg('panel starting');

// Code Update/compile handle event
function scheduleUpdate() {
    shaderEditorPanel.classList.remove('compiled');
    shaderEditorPanel.classList.remove('not-compiled');

    if (EditContext.ShaderEditorTimeout) {
        EditContext.ShaderEditorTimeout = clearTimeout(EditContext.ShaderEditorTimeout);
    }
    EditContext.ShaderEditorTimeout = setTimeout(updateShaderEditorCode, EditContext.keyTimeout);
}

/// Editors
EditContext.shaderEditor = createShaderEditorInstance('shadereditor-panel', 'vs', scheduleUpdate);
addLowerBar('bottom', 'buttonbar');
addLowerBar('bottom', 'anythingbar');

function setShaderSelectionPosition(startOffset, matchLength) {
    const anchor = EditContext.shaderEditor.posFromIndex(startOffset);
    const head = EditContext.shaderEditor.posFromIndex(startOffset + matchLength);
    EditContext.shaderEditor.setSelection(anchor, head);
}
function setShaderEditorText(shaderSource, startOffset, matchLength) {
    EditContext.shaderEditor.setValue(shaderSource);
    //EditContext.shaderEditor.refresh();
    EditContext.shaderEditor.setSize('100%', '100%');
    // addon panel kills the size with hardcoded value
    //document.querySelector('.CodeMirror').style.height = '100%';

    if (startOffset) {
        setShaderSelectionPosition(startOffset, matchLength);
    }
    shaderEditorPanel.classList.remove('compiled');
    shaderEditorPanel.classList.remove('not-compiled');
    updateShaderEditorCount();
}

const openShaderTab = function(shader, program, uid) {
    if (!shader.tab) {
        shader.tab = tabsDoc.addTab(
            program.name + '/' + EditContext.getCurrentShaderType(),
            uid + '_' + EditContext.getCurrentShaderType(),
            'tabEdit'
        );
        shader.tab.shaderTarget = shader;
    }
    tabsDoc.tabSelect(shader.tab);
};

function selectProgram(id, startOffset, matchLength, shaderTypeParam) {
    let uid = id;
    if (uid.indexOf('_') !== -1) uid = id.split('_')[0];
    const program = EditContext.programs[uid];
    if (!program) {
        debugger;
        return;
    }
    const ctxtId = program.ctxtId;
    EditContext.setCurrentContext(ctxtId);
    let shaderType = shaderTypeParam ? shaderTypeParam : EditContext.getCurrentShaderType();
    if (shaderType === undefined) {
        shaderType = 'FS';
        debugger;
    }
    if (!program.vertexShader || !program.fragmentShader) {
        debugger;
        return;
    }
    if (startOffset !== undefined) program.startOffset = startOffset;
    if (matchLength !== undefined) program.matchLength = matchLength;
    // no code yet, request some
    if (program.vertexShader.text === undefined || program.fragmentShader.text === undefined) {
        // request source code only if missing
        sendCodeToClient({
            action: 'ProgramSelected',
            id: uid,
            ctxtId: ctxtId
        });

        return;
    }
    if (
        EditContext.getCurrentProgram() !== program ||
        EditContext.getCurrentShaderType() !== shaderType
    ) {
        /*
        if (EditContext.getCurrentProgram() !== program) {
            sendCodeToClient({
                action: 'ProgramSelected',
                id: uid,
                ctxtId: ctxtId
            });
        }*/
        EditContext.setCurrentProgram(ctxtId, program);

        EditContext.setCurrentShaderType(shaderType);

        let shader;
        let shaderSource;
        //let shaderTypePostFix;
        if (shaderType === 'VS') {
            EditContext.setCurrentShaderTypeGL(true);
            shaderSource = program.vertexShader.text;
            shader = program.vertexShader;
            //shaderTypePostFix = '_vertex';
        } else {
            EditContext.setCurrentShaderTypeGL(false);
            shaderSource = program.fragmentShader.text;
            shader = program.fragmentShader;
            //shaderTypePostFix = '_fragment';
        }

        // TODO: version shader on edit History
        // TODO: nowut ?
        shader.dirty = true;
        // preprocess again
        // find main again
        // search prepare again
        // keep history ?
        // IF shaderVersion changes

        setShaderEditorText(shaderSource, startOffset, matchLength);
        openShaderTab(shader, program, uid);
        //assetTreeView.select(program.uid + shaderTypePostFix, undefined, shaderType);
        assetTreeView.select(program.uid, undefined, shaderType);
    } else if (startOffset) {
        // already opened but not correct selection
        setShaderSelectionPosition(startOffset, matchLength);
    }
}

tabsDoc.setCloseCallback(function(closedTab) {
    const tabLink = closedTab.firstElementChild;
    if (!tabLink.classList.contains('tabEdit')) {
        //not editor Tab
        return true;
    }
    // switch document, in codemirror editor, but do not create new doc pane
    //const tabName = tabLink.id;
    //const nameSplit = tabName.split('_');
    //const shaderType = nameSplit[nameSplit.length - 1];
    //const shaderUID = nameSplit.slice(0, -1).join('_');
    closedTab.shaderTarget.tab = undefined;
    // console.log(shaderUID + ' closed');
    return false;
});

tabsDoc.setSelectCallback(function(selectedTab) {
    if (selectedTab === undefined) {
        setShaderEditorText('');
        return;
    }
    if (!selectedTab.classList.contains('active')) return;

    const tabLink = selectedTab; //selectedTab.firstElementChild;
    if (!tabLink.classList.contains('tabEdit')) {
        //not editor Tab
        return true;
    }
    // switch document, in codemirror editor, but do not create new doc pane
    const tabName = tabLink.id;
    const nameSplit = tabName.split('_');
    const shaderType = nameSplit[nameSplit.length - 1];
    const shaderUID = nameSplit.slice(0, -1).join('_');

    // uid
    // set Shader Type
    selectProgram(shaderUID, undefined, undefined, shaderType);

    return false;
});

function updateProgramName(programInfo, type, name) {
    if (programInfo === undefined) return;

    //logMsg( ' >>>>>> ' + i.id + ' ' + type + ' ' + name );
    if (type && name) {
        if (
            type === WebGLRenderingContext.VERTEX_SHADER ||
            // @ts-ignore
            type === WebGL2RenderingContext.VERTEX_SHADER
        ) {
            programInfo.vertexShader.name = name;
        }
        if (
            type === WebGLRenderingContext.FRAGMENT_SHADER ||
            // @ts-ignore
            type === WebGL2RenderingContext.FRAGMENT_SHADER
        ) {
            programInfo.fragmentShader.name = name;
        }

        const aVertexHasNoName =
            programInfo.vertexShader.name === undefined || programInfo.vertexShader.name === '';
        const aFragmentHasNoName =
            programInfo.fragmentShader.name === undefined || programInfo.fragmentShader.name === '';

        if (aVertexHasNoName && aFragmentHasNoName) {
            programInfo.name = 'Program ' + programInfo.number;
        } else if (!aVertexHasNoName && !aFragmentHasNoName) {
            if (programInfo.vertexShader.name === programInfo.fragmentShader.name) {
                programInfo.name = programInfo.vertexShader.name;
            } else {
                programInfo.name =
                    programInfo.vertexShader.name + ' / ' + programInfo.fragmentShader.name;
            }
        } else if (aVertexHasNoName && !aFragmentHasNoName) {
            programInfo.name = programInfo.fragmentShader.name;
        } else if (!aVertexHasNoName && aFragmentHasNoName) {
            programInfo.name = programInfo.vertexShader.name;
        }
    } else if (programInfo.name) {
        name = programInfo.name;
    }

    let shaderName = programInfo.name;
    // update programs Names
    // TODO: check if should update tabs ?
    EditContext.programsByName[shaderName] = programInfo.id;
    programInfo.context.programsByName[shaderName] = programInfo.id;
    const folderPath = programInfo.name.split('_');

    const opt = {
        label: shaderName,
        id: programInfo.id,
        parent: undefined,
        opened: true,
        selected: false
    };
    if (folderPath.length > 1) {
        let parentID = '';

        for (let k = 0; k < folderPath.length - 1; k++) {
            const folderName = folderPath[k];
            const folderID = parentID + folderName;
            const exist = assetTreeView.getLeaf(folderID, true);
            if (!exist) {
                opt.id = folderID;
                opt.label = folderName;
                opt.parent = parentID;
                assetTreeView.add(opt);
            }
            parentID = folderID;
        }
        shaderName = folderPath[folderPath.length - 1];
        assetTreeView.move(programInfo.id, parentID);
    }

    assetTreeView.rename(programInfo.id, shaderName);
}

function tearDown(url) {
    //console.trace('teardown');
    //EditContext.removeUrl(url)
    const isMainWebTab = EditContext.getMainTabUrl() === url;
    // remove context and unselect for this URL
    EditContext.removeWebPage(url, assetTreeView, tabsDoc);
    // if main tab, remove everything
    if (isMainWebTab) {
        EditContext.reset();

        shaderEditorPanel.classList.remove('not-compiled');
        shaderEditorPanel.classList.remove('compiled');
        const sEd = shaderEditorFooter.querySelector('#info-text-shader');
        sEd.textContent = '';
        tabsDoc.removeAllTabs();

        /*
     while (list.firstChild) list.removeChild(list.firstChild);
 */
        assettree.innerHTML = '';
        assetTreeView = new VanillaTree(assettree);

        assettree.addEventListener('vtree-select', evt => {
            // @ts-ignore
            let uid = evt.detail.id;
            // @ts-ignore
            let shaderType = evt.detail.shaderType;

            //info.innerHTML = evt.detail.id + ' is selected';
            console.log(uid + ' is selected');
            if (!shaderType) {
                shaderType = 'FS';
                const shaderTypeUID = uid.split('_');
                if (shaderTypeUID.length > 1) {
                    uid = shaderTypeUID[0];
                    if (shaderTypeUID[1] === 'vertex') shaderType = 'VS';
                }
            }

            selectProgram(uid, undefined, undefined, shaderType);
        });

        while (texturePanel.firstChild) texturePanel.removeChild(texturePanel.firstChild);
        if (EditContext.settingsConfiguration) {
            //document.getElementById('highlightButton').style.opacity = EditContext.settingsConfiguration.tmpDisableHighlight ? '.5' : '1';
            //document.getElementById('textures-disabled').style.display = EditContext.settingsConfiguration.textures ? 'none' : 'block';
            //document.getElementById('textures').style.display = EditContext.settingsConfiguration.textures ? 'block' : 'none';
            // @ts-ignore
            document.getElementById('monitorTextures').checked =
                EditContext.settingsConfiguration.textures;
            // @ts-ignore
            document.getElementById('highlightShaders').checked =
                EditContext.settingsConfiguration.highlight;
            // @ts-ignore
            document.getElementById('debugShaderEditor').checked =
                EditContext.settingsConfiguration.debugShaderEditor;
            // @ts-ignore
            document.getElementById('logShaderEditor').checked =
                EditContext.settingsConfiguration.logShaderEditor;
            // @ts-ignore
            document.getElementById('selectCodeMirrorTheme').selectedIndex =
                EditContext.settingsConfiguration.theme;

            // @ts-ignore
            if (inputTheme.options[EditContext.settingsConfiguration.theme]) {
                // @ts-ignore
                const theme =
                    // @ts-ignore
                    inputTheme.options[EditContext.settingsConfiguration.theme].textContent;
                selectCodeMirrorTheme();
                /*
            if (searchEl.classList.contains('cm-s-default')) {
                searchEl.classList.remove('cm-s-default');
            }

            searchEl.classList.add('cm-s-' + getSelectedCodeMirrorTheme());
*/
                if (EditContext.shaderEditor) {
                    EditContext.shaderEditor.setValue('');
                    EditContext.shaderEditor.setOption('theme', theme);
                }
            }
        }
        clearLogs();
        initShortcuts();
    }
}

/////////////////////////////////////
const registerActions = {};

// flow from the EditContext.injected script,
// to the content script,
// to the background script
// and finally to the DevTools page. [here]
clientMessageListener(function(msg) {
    const action = registerActions[msg.action];
    if (!action) return;
    action(msg);
});

/////////////////////////////////////
// Start INIT
/////////////////////////////////////

registerActions['onCommitted'] = function(/*msg*/) {
    //injectCodeToClient(  f.toString()  ); // this gets appended AFTER the page
    //             browserExt.devtools.inspectedWindow.reload( {
    //             ignoreCache: true,
    //     injectedScript: '(' + f.toString() + ')()'
    // } );
    //console.log( 'onCommitted', Date.now() );
};

registerActions['onUpdated'] = function(/*msg*/) {
    //injectCodeToClient(  f.toString()  ); // this gets appended AFTER the page
    //             browserExt.devtools.inspectedWindow.reload( {
    //             ignoreCache: true, ''
    //     injectedScript: '(' + f.toString() + ')()'
    // } );
    //console.log( 'onCommitted', Date.now() );
};

registerActions['sendCode'] = function(msg) {
    console.log('Connection Devtools: sendCode');
    if (EditContext.sentClientCode) return;
    console.log(msg.data);
    browserExt.devtools.inspectedWindow.eval(msg.data);
    console.log(browserExt.devtools.inspectedWindow);
    console.log(browserExt.devtools);
    EditContext.sentClientCode = true;
};

registerActions['first'] = function(/*msg*/) {
    console.log('Connection DevTools: ready (received by server from client)');
};

registerActions['settings'] = function(msg) {
    console.log('Connection DevTools: settings');
    if (!msg.settings) return;
    EditContext.settingsConfiguration = msg.settings;
    logMsg(JSON.stringify(EditContext.settingsConfiguration));
};

registerActions['inject'] = function(/*msg*/) {
    console.log('Connection DevTools: inject');
    //if (EditContext.injected) return;
    //EditContext.injected = true;

    //info.style.display = 'none';
    //waiting.style.display = 'flex';

    // retry for mobile
    // As desktop is injected by "content script mechanism"
    const jsonSettings = JSON.stringify(EditContext.settingsConfiguration);
    injectCodeToClient(addClientMessenger.toString(), jsonSettings);
    injectCodeToClient(addHooksString, jsonSettings);
};
// from Background Service Worker
// on Tab Updated
registerActions['init'] = function() {
    console.log('Connection DevTools: init');

    // retry for mobile
    // As desktop is injected by "content script mechanism"
    //var jsonSettings = JSON.stringify(EditContext.settingsConfiguration);
    //injectCodeToClient(addClientMessenger.toString(), jsonSettings);
    //(addHooksString, jsonSettings);
};

registerActions['unloadIframe'] = function(msg) {
    debugger;
    // remove context and unselect for this URL
    EditContext.removeWebPage(msg.url, assetTreeView, tabsDoc);
};

registerActions['unload'] = function(msg) {
    debugger;
    // remove context and unselect for this URL
    EditContext.removeWebPage(msg.url, assetTreeView, tabsDoc);
};

registerActions['reload'] = function(msg) {
    console.log('Connection DevTools: reload');
    // page reloaded, clean state
    // save current
    // shader name
    // scroll pos

    // shader code ?
    // overwrite shader at load
    tearDown(msg.url);
    sendCodeToClient({ action: 'sendHistory' });
    EditContext.injected = false;
};

registerActions['initAfterInjection'] = function(msg) {
    console.log('Connection DevTools: initAfterInjection');

    //if (EditContext.injected) return;
    EditContext.injected = true;

    tearDown(msg.url);
    sendCodeToClient({ action: 'sendHistory' });
};

/////////////////////////////////////
// End Init
/////////////////////////////////////
/////////////////////////////////////

registerActions['webglContextAdd'] = function(msg) {
    console.log('Connection DevTools: webglContextAdd');
    EditContext.addContext(msg.id, msg.version, msg.url, msg.isMainWebTab);
    console.log('> Created welbgContext ' + msg.version + ' (' + msg.id + ', ' + msg.url + ')');
    logMsg('>> Created welbgContext ' + msg.version + ' (' + msg.id + ', ' + msg.url + ')');
};

registerActions['getExtension'] = function(/*msg*/) {
    //logMsg('addExtension server side', msg.extension);
    // testExtensionEnable(msg).then(function(results) {
    //     logMsg('addExtension' + msg.extension + ' ' + results);
    //     if (EditContext.settingsConfiguration.debugShaderEditor) debugger;
    // });
};

registerActions['addProgram'] = function(msg) {
    //logMsg( 'addProgram' );

    const contextId = msg.ctxtId;
    const context = EditContext.getOrCreateContext(contextId, msg.version, msg.url);
    if (!context) {
        console.log('no Context ? ' + contextId);
    }
    const textContextId = 'ctxt' + contextId;
    console.log('addProgram ', msg.uid, textContextId);
    const leaf = assetTreeView.add({
        label: msg.uid,
        id: msg.uid,
        //parent: textContextId,
        opened: false,
        selected: false,
        links:
            '<a class="vs vtree-leaf-icon "><i class="fas fa-cube"></i></a><a class="fs vtree-leaf-icon"><i class="far fa-image"></i></a>'
    });
    /*
    var vs_leaf = assetTreeView.add({
        label: 'vs',
        id: msg.uid + '_vertex',
        parent: msg.uid,
        opened: false,
        selected: false
    });

    var fs_leaf = assetTreeView.add({
        label: 'fs',
        id: msg.uid + '_fragment',
        parent: msg.uid,
        opened: false,
        selected: false
    });
    */

    const program = EditContext.addProgram(contextId, msg.uid, leaf);
    searchObjects.push({ uid: msg.uid, program: program });
    updateProgramName(program);
    /*
    sendCodeToClient({
        action: 'ProgramSelected',
        id: msg.uid,
        ctxtId: msg.ctxtId
    });
    */
    if (!_addingIcons) {
        _addingIcons = window.setTimeout(
            function() {
                //fontawesome.searchPseudoElements(assettree);
                //fontawesome.dom.i2svg();
                // @ts-ignore
                fontawesome.dom.i2svg({
                    node: assettree,
                    callback: function iconDoneRendering() {
                        console.log('done adding icons');
                    }
                });
                _addingIcons = undefined;
            }.bind(this),
            100
        );
    }
};

registerActions['createTexture'] = function(msg) {
    if (!EditContext.settingsConfiguration.textures) return;
    //var context = getOrCreateContext(msg.ctxtId);
    const li = document.createElement('div');
    li.className = 'textureElement';
    const img = document.createElement('img');
    const drZ = {
        id: msg.uid,
        li: li,
        img: img
    };
    EditContext.textures[msg.uid] = drZ;
    //li.appendChild(img);
    // const dZ = createDropZone(function(i) {
    //     sendCodeToClient({
    //         action: 'UpdateImage',
    //         id: msg.uid,
    //         i: i,
    //         ctxtId: msg.ctxtId
    //     });
    // });
    //li.appendChild(dZ);
    texturePanel.appendChild(li);
    logMsg('>> Created texture ' + msg.uid);
};

registerActions['uploadTexture'] = function(msg) {
    EditContext.textures[msg.uid].img.src = msg.image;
    logMsg('>> Updated texture ' + msg.uid);
};

registerActions['setShaderName'] = function(msg) {
    //logMsg( msg.uid, msg.type, msg.name );
    updateProgramName(EditContext.programs[msg.uid], msg.type, msg.name);
};

registerActions['setVSSource'] = function(msg) {
    //console.log(`${msg.uid} has code`);
    //console.log(EditContext.programs[msg.uid]);
    const program = EditContext.programs[msg.uid];
    program.vertexShader.text = decodeSource(msg.sourceCode);
    selectProgram(msg.uid, program.startOffset, program.matchLength, 'VS');
};
registerActions['setFSSource'] = function(msg) {
    //console.log(`${msg.uid} has code`);
    //console.log(EditContext.programs[msg.uid]);
    const program = EditContext.programs[msg.uid];
    program.fragmentShader.text = decodeSource(msg.sourceCode);
    selectProgram(msg.uid, program.startOffset, program.matchLength, 'FS');
};
registerActions['log'] = function(msg) {
    logMsg(msg.arguments);
};

registerActions['uniformValue'] = function(msg) {
    //console.log(msg.value);
    const uniformValueCallback = getQueryDataCallback('Uniform');
    if (uniformValueCallback) uniformValueCallback(msg.value);
};

registerActions['programUsed'] = function(msg) {
    const callback = EditContext.getCurrentContext().programCompiledCallback;
    EditContext.getCurrentContext().programCompiledCallback = undefined;
    // now callback can set up a new EditContext.getCurrentContext().programCompiledCallback if need be
    if (callback) callback(EditContext.shaderEditor, msg.result, msg.log);
    if (msg.log) {
        console.log(msg.log);
        //logMsg(msg.arguments);
    }
};

registerActions['inactiveProgram'] = function(msg) {
    const program = EditContext.programs[msg.uid];
    assetTreeView.setActive(program.uid, false);
};

registerActions['activeProgram'] = function(msg) {
    const program = EditContext.programs[msg.uid];
    assetTreeView.setActive(program.uid, true);
};

registerActions['programTiming'] = function(msg) {
    const callback = EditContext.getCurrentContext().programTimingCallback;
    EditContext.getCurrentContext().programTimingCallback = undefined;
    // now callback can set up a new EditContext.getCurrentContext().programTimingCallback if need be
    if (callback) {
        callback(EditContext.shaderEditor, msg.result);
    }
};

registerActions['pixelValue'] = function(msg) {
    //console.log('pixelValue ' + msg.value);

    if (EditContext.pColorTip) {
        EditContext.pColorTip.innerHTML = 'value: ' + msg.value;

        clearTimeout(EditContext.tipTimerFade);
        EditContext.tipTimerFade = setTimeout(function() {
            EditContext.pColorTip.style.opacity = '0';
            //removeNodeFromDoc(EditContext.pColorTip);

            const p = EditContext.pColorTip && EditContext.pColorTip.parentNode;
            if (p) p.removeChild(EditContext.pColorTip);

            EditContext.pColorTip = undefined;
            EditContext.tipTimerFade = undefined;
        }, 1100);
    } else {
        EditContext.pColorTip = document.createElement('div');
        EditContext.pColorTip.innerHTML = 'value: ' + msg.value;
        makeTooltip(0.0, 0.0, EditContext.pColorTip);

        EditContext.tipTimerFade = setTimeout(function() {
            EditContext.pColorTip.style.opacity = '0';
            //removeNodeFromDoc(EditContext.pColorTip);
            const p = EditContext.pColorTip && EditContext.pColorTip.parentNode;
            if (p) p.removeChild(EditContext.pColorTip);

            EditContext.tipTimerFade = undefined;
            EditContext.pColorTip = undefined;
        }, 1100);
    }
};

registerActions['canvasSize'] = function(msg) {
    console.log('canvasSize' + msg.w + ' ' + msg.h);
};

registerActions['mousePosition'] = function(/*msg*/) {
    //console.log('mousePosition' + msg.x + ' ' + msg.y);
};

registerActions['highlightProgram'] = function(msg) {
    let uid = msg.uid;
    if (!uid) {
        const name = msg.name;
        if (!name) return;
        uid = EditContext.programsByName[name];
        if (!uid) return;
    }
    const doHighlight = msg.doHighlight;
    if (
        !EditContext.settingsConfiguration.highlight &&
        EditContext.settingsConfiguration.tmpDisableHighlight
    ) {
        return;
    }
    // mouseover
    const program = EditContext.programs[uid];
    if (doHighlight) {
        const fsShader = program.fragmentShader.text;
        if (!fsShader) return;
        let fragColor = program.fragmentShader.main;
        if (!fragColor) {
            fragColor = getMainFragColor(fsShader, EditContext.getCurrentVersion());
            program.fragmentShader.main = getMainFragColor(
                fsShader,
                EditContext.getCurrentVersion()
            );
        }
        const shaderFrag =
            'void main() {ShaderEditorInternalMain(); ' + fragColor + '.rgb *= vec3(1.,0.,1.); }';
        currentShaderTempReplace(false, shaderFrag, uid, true);
    } else {
        //mouse out
        sendCodeToClient({
            action: 'ProgramOut',
            id: uid,
            ctxtId: program.ctxtId
        });
    }
};
export { tearDown, selectProgram };
