// import CodeMirror from './src/codemirror_include.js';
import Split from './widget/split/split.js';
import Tabs from './widget/tab/tab.js';
//import VanillaTree from './widget/tree/vanillatree.js';
import { EditContext } from './editContext.js';
import fontawesome from '@fortawesome/fontawesome';
import { saveSettings } from '../editorHooks/message_ui.js';
import {
    faIndent,
    faEye,
    faEyeDropper,
    faVideo,
    faCameraRetro,
    faArrowsAlt,
    faAngleDoubleDown,
    faAngleDoubleRight,
    faStopwatch,
    faCube,
    faMapPin
} from '@fortawesome/fontawesome-free-solid';

import {
    faPlayCircle,
    faPauseCircle,
    faCircle,
    faImage
} from '@fortawesome/fontawesome-free-regular';

//import faFacebook from '@fortawesome/fontawesome-free-brands/faFacebook';
// @ts-ignore
fontawesome.config = {
    observeMutations: false
};
fontawesome.library.add(faIndent);
fontawesome.library.add(faEye);
fontawesome.library.add(faEyeDropper);
fontawesome.library.add(faVideo);
fontawesome.library.add(faCameraRetro);
fontawesome.library.add(faArrowsAlt);
fontawesome.library.add(faAngleDoubleDown);
fontawesome.library.add(faAngleDoubleRight);
fontawesome.library.add(faStopwatch);
fontawesome.library.add(faCube);
fontawesome.library.add(faImage);
fontawesome.library.add(faPlayCircle);
fontawesome.library.add(faCircle);
fontawesome.library.add(faPauseCircle);
fontawesome.library.add(faMapPin);

const container = document.getElementById('container');
const info = document.getElementById('info');
const waiting = document.getElementById('waiting');
const assettree = document.getElementById('assettree');
const log = document.getElementById('log');
const texturePanel = document.getElementById('textures');
const shaderEditorPanel = document.getElementById('shadereditor-panel');
const editorContainer = document.getElementById('editorContainer');
const links = document.querySelectorAll('a[rel=external]');
const inputTheme = document.getElementById('selectCodeMirrorTheme');

const searchEl = document.getElementById('search');
const shaderEditorFooter = document.getElementById('shadereditor-footer');

// UI binds
for (let j = 0; j < links.length; j++) {
    const a = links[j];
    a.addEventListener(
        'click',
        function(e) {
            window.open(this.href, '_blank');
            e.preventDefault();
        },
        false
    );
}

// ui TABS
const tabButtons = document.querySelectorAll('#rbgl-tabs li');
const tabs = document.querySelectorAll('.rbgl-tab');
[].forEach.call(tabButtons, function(button) {
    const id = button.getAttribute('data-rbgl-tab');
    button.addEventListener('click', function() {
        [].forEach.call(tabs, function(tab) {
            tab.classList.toggle('active', tab.id === id + '-rbgl-tab');
        });

        [].forEach.call(tabButtons, function(b) {
            b.classList.toggle('active', button === b);
        });
    });
});

// resize
window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    editorContainer.classList.toggle(
        'vertical',
        editorContainer.clientWidth < editorContainer.clientHeight
    );
    /*if (EditContext.shaderEditor) {
        EditContext.shaderEditor.refresh();
        EditContext.shaderEditor.setSize('100%', '100%');
        // addon panel kills the size with hardcoded value
        document.querySelector('.CodeMirror').style.height = '100%';
    }*/
}
onWindowResize();
// panes
let sizesStored = localStorage.getItem('split-sizes-treepane');
let sizes = sizesStored ? JSON.parse(sizesStored) : [15, 85]; // default sizes

const splitTreeEditor = Split(['#assettree', '#doccontainer'], {
    direction: 'horizontal',
    sizes: sizes,
    gutterSize: 4,
    gutter: function(i, gutterDirection) {
        const gut = document.createElement('div');
        gut.innerHTML = ' <a class="pin" id="pintree"><i class="fa fa-map-pin"></i></a>';
        gut.className = `gutter gutter-${gutterDirection}`;
        return gut;
    },
    cursor: 'col-resize',
    onDragEnd: function() {
        /*if (EditContext.shaderEditor) {
            EditContext.shaderEditor.refresh();
            EditContext.shaderEditor.setSize('100%', '100%');
            // addon panel kills the size with hardcoded value
            document.querySelector('.CodeMirror').style.height = '100%';
        }*/
        localStorage.setItem('split-sizes-treepane', JSON.stringify(splitTreeEditor.getSizes()));
    }
});
document.querySelector('#pintree').addEventListener(
    'click',
    function() {
        splitTreeEditor.toggle(0);
    },
    true
);
sizesStored = localStorage.getItem('split-sizes-lowerPane');
sizes = sizes ? JSON.parse(sizesStored) : [80, 20]; // default sizes

const splitLowerEditor = Split(['#doc', '#lowerpane'], {
    gutterSize: 4,
    direction: 'vertical',
    cursor: 'row-resize',
    sizes: sizes,
    gutter: function(i, gutterDirection) {
        const gut = document.createElement('div');
        gut.innerHTML = ' <a class="pin" id="pinlower"><i class="fa fa-map-pin"></i></a>';
        gut.className = `gutter gutter-${gutterDirection}`;
        return gut;
    },
    onDragEnd: function() {
        /*if (EditContext.shaderEditor) {
            EditContext.shaderEditor.refresh();
            EditContext.shaderEditor.setSize('100%', '100%');
            // addon panel kills the size with hardcoded value
            document.querySelector('.CodeMirror').style.height = '100%';
        }*/
        localStorage.setItem('split-sizes-lowerPane', JSON.stringify(splitLowerEditor.getSizes()));
    }
});

document.querySelector('#pinlower').addEventListener(
    'click',
    function() {
        splitLowerEditor.toggle(1);
    },
    true
);

// tabs & panels
const tabsDoc = Tabs('#doccontainer');

const tabsLowerPane = Tabs('#lowerpane');

// var isCtrl = false;
// document.onkeyup = function(e) {
//     if (e.keyCode === 17) isCtrl = false;
// };

const searchBar = document.getElementById('actionAllFuzzy');

//info.style.display = 'none';
//waiting.style.display = 'none';
//container.style.display = 'block';
const LowerBars = {};

function makeEditorLowerBar(where, id) {
    const node = document.createElement('div');

    node.id = 'LowerBar-' + id;
    node.className = 'LowerBar ' + where;
    /*
    var close, label;
    close = node.appendChild(document.createElement('a'));
    close.setAttribute('title', 'Remove me!');
    close.setAttribute('class', 'remove-LowerBar');
    close.textContent = '✖';
    CodeMirror.on(close, 'click', function() {
        LowerBars[node.id].clear();
    });
    //    label = node.appendChild(document.createElement('span'));
    //    label.textContent = ' LowerBar n°' + id;
    */
    return node;
}
function addLowerBar(where, barName) {
    const node = makeEditorLowerBar(where, barName);
    const bar = EditContext.shaderEditor.addPanel(node, {
        position: where,
        stable: true
    });
    LowerBars[node.id] = bar;
    LowerBars[barName] = bar;
    let nodeChild;
    switch (barName) {
        case 'buttonbar':
            nodeChild = shaderEditorFooter;
            if (nodeChild.parentNode) {
                nodeChild.parentNode.removeChild(nodeChild);
            }
            bar.node.appendChild(nodeChild);
            break;
        case 'anythingbar':
            nodeChild = searchBar;
            if (nodeChild.parentNode) {
                nodeChild.parentNode.removeChild(nodeChild);
            }
            bar.node.appendChild(nodeChild);
            break;
    }
}

// code mirror theme user choice
function getSelectedCodeMirrorTheme() {
    // @ts-ignore
    return inputTheme.options[inputTheme.selectedIndex].textContent;
}
function getSelectedCodeMirrorThemeIndex() {
    // @ts-ignore
    return inputTheme.selectedIndex;
}
function setSelectCodeMirrorThemeCallback(cb) {
    inputTheme.addEventListener('change', cb, false);
}

function selectCodeMirrorTheme() {
    const previousTheme = EditContext.shaderEditor.getOption('theme');

    document.body.classList.remove('cm-s-' + previousTheme.replace(' ', '-'));
    document.body.classList.add('cm-s-' + getSelectedCodeMirrorTheme().replace(' ', '-'));

    const theme = getSelectedCodeMirrorTheme();
    EditContext.shaderEditor.setOption('theme', theme);
    EditContext.settingsConfiguration.theme = getSelectedCodeMirrorThemeIndex();

    saveSettings();
}

setSelectCodeMirrorThemeCallback(selectCodeMirrorTheme);

export {
    inputTheme,
    container,
    info,
    waiting,
    assettree,
    shaderEditorFooter,
    log,
    texturePanel,
    shaderEditorPanel,
    editorContainer,
    tabsDoc,
    tabsLowerPane,
    splitTreeEditor,
    splitLowerEditor,
    searchBar,
    searchEl,
    addLowerBar,
    getSelectedCodeMirrorTheme,
    selectCodeMirrorTheme,
    fontawesome
};
