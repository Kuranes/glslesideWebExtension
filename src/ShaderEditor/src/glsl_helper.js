import { queryData } from '../src/dataWatcher.js';

// Smaller Number Printing - @P_Malin
// Creative Commons CC0 1.0 Universal (CC-0)

// Feel free to modify, distribute or use in commercial code, just don't hold me liable for anything bad that happens!
// If you use this code and want to give credit, that would be nice but you don't have to.

// I first made this number printing code in https://www.shadertoy.com/view/4sf3RN
// It started as a silly way of representing digits with rectangles.
// As people started actually using this in a number of places I thought I would try to condense the
// useful function a little so that it can be dropped into other shaders more easily,
// just snip between the perforations below.
// Also, the licence on the previous shader was a bit restrictive for utility code.
//
// Disclaimer: The values printed may not be accurate!
// Accuracy improvement for fractional values taken from TimoKinnunen https://www.shadertoy.com/view/lt3GRj

// ---- 8< ---- GLSL Number Printing - @P_Malin ---- 8< ----
// Creative Commons CC0 1.0 Universal (CC-0)
// https://www.shadertoy.com/view/4sBSWW

// vec3 printValue(vec3)

const glslPrintfShaderCode = `

// ---- 8< -------- 8< -------- 8< -------- 8< ----
uniform vec2 u_resolution;
uniform vec2 u_mouse;

float DigitBin( const int x )
{
    return x==0?480599.0:x==1?139810.0:x==2?476951.0:x==3?476999.0:x==4?350020.0:x==5?464711.0:x==6?464727.0:x==7?476228.0:x==8?481111.0:x==9?481095.0:0.0;
}

float PrintValue( const vec2 vStringCoords, const float fValue, const float fMaxDigits, const float fDecimalPlaces )
{
    if ((vStringCoords.y < 0.0) || (vStringCoords.y >= 1.0)) return 0.0;
    float fLog10Value = log2(abs(fValue)) / log2(10.0);
    float fBiggestIndex = max(floor(fLog10Value), 0.0);
    float fDigitIndex = fMaxDigits - floor(vStringCoords.x);
    float fCharBin = 0.0;
    if(fDigitIndex > (-fDecimalPlaces - 1.01)) {
        if(fDigitIndex > fBiggestIndex) {
            if((fValue < 0.0) && (fDigitIndex < (fBiggestIndex+1.5))) fCharBin = 1792.0;
        } else {        
            if(fDigitIndex == -1.0) {
                if(fDecimalPlaces > 0.0) fCharBin = 2.0;
            } else {
                float fReducedRangeValue = fValue;
                if(fDigitIndex < 0.0) { fReducedRangeValue = fract( fValue ); fDigitIndex += 1.0; }
                float fDigitValue = (abs(fReducedRangeValue / (pow(10.0, fDigitIndex))));
                fCharBin = DigitBin(int(floor(mod(fDigitValue, 10.0))));
            }
        }
    }
    return floor(mod((fCharBin / pow(2.0, floor(fract(vStringCoords.x) * 4.0) + (floor(vStringCoords.y * 5.0) * 4.0))), 2.0));
}



// Original interface
float PrintValue(const in vec2 fragCoord, const in vec2 vPixelCoords, const in vec2 vFontSize, const in float fValue, const in float fMaxDigits, const in float fDecimalPlaces)
{
    vec2 vStringCharCoords = (fragCoord.xy - vPixelCoords) / vFontSize;
    
    return PrintValue( vStringCharCoords, fValue, fMaxDigits, fDecimalPlaces );
}

vec3 printValue(vec4 value, int size, float decimals){
    
    vec3 vColour = vec3(0.0);
    // Multiples of 4x5 work best
    vec2 vFontSize = vec2(8.0, 15.0);

    if(u_mouse.x > 0.0)
    {
        // if (u_mouse.x> 0.5) left text
        // if (u_mouse.x> 0.5) bottom text
        
        float fDecimalPlaces = 2.0;
        float fDigits = 1.0;
        float width = 54.0;
        // Print X
        for (int i = 0; i < 4; i++){       
            
            vec2 vPixelCoord2 = u_mouse.xy + vec2(-54.0 + width*float(i), 6.0);        
            float fIsDigit2 = PrintValue( (gl_FragCoord.xy - vPixelCoord2) / vFontSize, value[i], fDigits, fDecimalPlaces);
            vColour = mix( vColour, vec3(0.0, 1.0, 0.0), fIsDigit2);
            if(i+1 == size) break;
            
        }
    }
    
    return vColour;
}

     // finish shader with
     // values, number of value in the vec4 to print, decimals number
    // vec3 valuePrinted = printValue(valueVec4(valueX, valueY, valueZ, valueW), 3, 3.0);    
    // gl_FragColor = gl_FragColor*0.25 + vec4(valuePrinted.xyz,1.0);
    // or
    // gl_FragColor.xyz =  mix( gl_FragColor.xyz, vec3(0.0, 1.0, 0.0), printValue(vec4(u_mouse.xy, u_resolution.xy), 3, 3.0);        
    
// ---- 8< -------- 8< -------- 8< -------- 8< ----`;

function getMatch(cm, line) {
    //var types = ['uniform'];

    // is it an uniform
    const matches = line.match(/uniform\s+\w+\s+\w+((\s)?\[(.*?)\])?/g);

    if (matches !== null) {
        for (let i = 0, l = matches.length; i < l; i++) {
            //var uniform = matches[i].match(/uniform\s+\w+\s+(\w+)/)[1];
            const uniformName = matches[i].match(/uniform\s+\w+\s+(\w+)(\s?\[.*?\])?/)[1];

            return uniformName;
        }
    }

    return;
}

function makeTooltip(x, y, node) {
    node.style.left = x + 'px';
    node.style.top = y + 'px';

    node.style.position = 'absolute';
    node.style.background = 'crimson';
    node.style.opacity = '0.75';
    node.style.color = 'white';
    node.style.zIndex = 10000000;

    document.body.appendChild(node);
    return node;
}

let currentMatchGLSLDEF;
let currentMatchGLSLDEFToolTip;
let timeOUTGLSLDEF;
let currentIllum;
let timeoutClearOldTooltip;

function removeNodeFromDoc(node) {
    //console.log('Remove tooltip');
    const p = node && node.parentNode;
    if (p) p.removeChild(node);
}

function fadeOut(tooltip) {
    //return setTimeout(function () {
    // todo: add a fadeout
    tooltip.style.opacity = '0';
    removeNodeFromDoc(tooltip);
    currentMatchGLSLDEF = undefined;
    currentMatchGLSLDEFToolTip = undefined;

    //}, 1100);
}

function tempTooltip(cm, content, x, y) {
    if (currentMatchGLSLDEFToolTip) {
        removeNodeFromDoc(currentMatchGLSLDEFToolTip);
        currentMatchGLSLDEFToolTip = undefined;

        //should be only if we come from code not setting this
        //currentMatchGLSLDEF = undefined;
    }

    //console.log('tooltip', content);
    const tip = (currentMatchGLSLDEFToolTip = makeTooltip(x + 1, y, content));

    function clear() {
        //console.log('clear');
        if (!tip.parentNode) return;
        cm.off('cursorActivity', clear);
        cm.off('blur', clear);
        cm.off('scroll', clear);
        fadeOut(tip);
    }

    cm.on('cursorActivity', clear);
    cm.on('blur', clear);
    cm.on('scroll', clear);

    return tip;
}

function showContextInfo(cm, html, x, y) {
    const p = document.createElement('div');
    p.innerHTML = html;

    return tempTooltip(cm, p, x, y);
}
function getWindowRelativeOffset(elem) {
    const offset = {
        left: 0,
        top: 0
    };
    // relative to the target field's document
    offset.left = elem.getBoundingClientRect().left;
    offset.top = elem.getBoundingClientRect().top;
    // now we will calculate according to the current document, this current
    // document might be same as the document of target field or it may be
    // parent of the document of the target field
    let childWindow = elem.parentNode;
    while (childWindow) {
        const rect = childWindow.parentNode.getBoundingClientRect();
        offset.left = offset.left + rect.left;
        offset.top = offset.top + rect.top;
        childWindow = childWindow.parent;
    }

    return offset;
}

const mouseMoveEditor = function(cm, e) {
    // bail out if we were doing a selection and not a click
    if (cm.somethingSelected()) {
        return;
    }

    //var offset = getWindowRelativeOffset(cm.getWrapperElement());
    // var X = e.pageX - offset.left;
    // var Y = e.pageY - offset.top;
    //var X = e.pageX - cm.getWrapperElement().offsetLeft;
    //var Y = e.pageY - cm.getWrapperElement().offsetTop;

    const X = e.pageX;
    const Y = e.pageY;

    const pos = cm.coordsChar({ left: X, top: Y });
    const token = cm.getTokenAt(pos);

    //console.log(e.pageX, e.pageY);
    //console.log(X, Y);

    //console.log('mouse move ');

    if (token.type === 'builtin' || token.type === 'atom') {
        if (currentMatchGLSLDEF !== token.string) {
            if (timeoutClearOldTooltip) clearTimeout(timeoutClearOldTooltip);
            removeNodeFromDoc(currentMatchGLSLDEFToolTip);
            currentMatchGLSLDEF = token.string;

            //X = e.pageX;
            //Y = e.pageX;
            //clearTimeout(timeOUTGLSLDEF);
            //timeOUTGLSLDEF = setTimeout(function () {

            let html = 'Learn more about: <a href="';
            if (token.type === 'builtin') {
                html += 'https://thebookofshaders.com/glossary/?search=';
            } else {
                html += 'http://docs.gl/el3/';
            }

            //console.log('mouse move new def ');

            html += token.string + '" target="_blank">' + token.string + '</a>';
            showContextInfo(cm, html, X, Y);

            //}, 750);
        }

        return;
    }
    if (token.type === 'variable') {
        const line = cm.getLine(pos.line);
        // see if there is a match on the cursor click

        // should use the shaderInfo...
        const match = getMatch(cm, line);
        if (match) {
            if (currentMatchGLSLDEF !== match) {
                if (timeoutClearOldTooltip) clearTimeout(timeoutClearOldTooltip);

                if (currentMatchGLSLDEFToolTip) {
                    removeNodeFromDoc(currentMatchGLSLDEFToolTip);
                    currentMatchGLSLDEFToolTip = undefined;
                }

                currentMatchGLSLDEF = match;
                //X = e.pageX;
                //Y = e.pageX;

                //clearTimeout(timeOUTGLSLDEF);
                //timeOUTGLSLDEF = setTimeout(function () {

                queryData(
                    match,
                    function(val) {
                        //console.log('mouse move new unif ');
                        const htmltxt = match + '  = ' + val;
                        showContextInfo(cm, htmltxt, X, Y);
                    },
                    'Uniform'
                );

                //}, 750);
            }

            // return;
        }
    }
    /*
    if (token.type === 'variable' && token.string && token.string.length > 0) {
        if (
            cm.mySettings &&
            cm.mySettings.illuminate &&
            !cm.mySettings.debugging &&
            !cm.mySettings.breakpoints
        ) {
            if (currentIllum !== token.string) {
                cm.mySettings.illuminate(cm, token.string, true);
                currentIllum = token.string;
            }
        }

        return;
    }
*/

    /*
        if (currentMatchGLSLDEFToolTip) removeNodeFromDoc(currentMatchGLSLDEFToolTip);
        currentMatchGLSLDEF = undefined;
        currentMatchGLSLDEFToolTip = undefined;
        if (timeOUTGLSLDEF) clearTimeout(timeOUTGLSLDEF);
        */
    if (currentMatchGLSLDEF && !timeoutClearOldTooltip) {
        timeoutClearOldTooltip = setTimeout(function() {
            // console.log('mouse move old clear ');
            if (currentMatchGLSLDEFToolTip) removeNodeFromDoc(currentMatchGLSLDEFToolTip);
            currentMatchGLSLDEF = undefined;
            currentMatchGLSLDEFToolTip = undefined;
            //if (timeOUTGLSLDEF) clearTimeout(timeOUTGLSLDEF);
            //timeOUTGLSLDEF = undefined;
            timeoutClearOldTooltip = undefined;
        }, 1500);
    }
};

const mouseOutEditor = function(/*cm , e*/) {
    //console.log('mouseout');
    if (currentMatchGLSLDEFToolTip) removeNodeFromDoc(currentMatchGLSLDEFToolTip);
    currentMatchGLSLDEF = undefined;
    currentMatchGLSLDEFToolTip = undefined;
    if (timeOUTGLSLDEF) clearTimeout(timeOUTGLSLDEF);
};

export { mouseOutEditor, mouseMoveEditor, makeTooltip, removeNodeFromDoc };
