// http://enjalot.github.io/Inlet/
// https://twitter.com/enjalot
import { Picker } from './src/thistle/thistle.js';

function Inlet(ed, options) {
    const editor = ed;
    var slider;
    let picker;
    var clicker;

    if (!options) options = {};
    if (!options.picker) options.picker = {};
    if (!options.slider) options.slider = {};
    if (!options.clicker) options.clicker = {};
    const container = options.container || document.body;

    // TODO: document/consider renaming
    const topOffset = options.picker.topOffset || 220;
    const bottomOffset = options.picker.bottomOffset || 16;
    const topBoundary = options.picker.topBoundary || 250;
    const leftOffset = options.picker.leftOffset || 75;

    const yOffset = options.slider.yOffset || 15;
    const xOffset = options.slider.xOffset || 0;
    const sliderWidth = options.slider.width;
    const horizontalMode = options.horizontalMode || 'page'; // other options include local and window
    const fixedContainer = options.fixedContainer; // used if the CM is inside a position:fixed container

    // we can trigger a callback when a slider/picker is activated/deactivated
    const sliderCB = options.slider.callback || function(active) {};
    const pickerCB = options.picker.callback || function(active) {};
    const clickerCB = options.clicker.callback || function(active) {};

    const wrapper = editor.getWrapperElement();
    wrapper.addEventListener('mouseup', onClick);
    document.body.addEventListener('mouseup', windowOnClick);
    editor.setOption('onKeyEvent', onKeyDown);

    //make the clicker
    const clickerDiv = document.createElement('div');
    clickerDiv.className = 'inlet_clicker';
    clickerDiv.style.visibility = 'hidden';
    clickerDiv.style.position = 'absolute';
    container.appendChild(clickerDiv);
    var clicker = document.createElement('input');
    clicker.className = 'checkbox';
    clicker.setAttribute('type', 'checkbox');
    clicker.addEventListener('change', onClicker);
    clickerDiv.appendChild(clicker);

    //what to do when the clicker is clicked
    function onClicker(event) {
        const value = String(clicker.checked);
        const cursor = editor.getCursor(true);
        const boolean = getMatch(cursor, 'boolean');
        if (!boolean) return;
        const start = {
            line: cursor.line,
            ch: boolean.start
        };
        const end = {
            line: cursor.line,
            ch: boolean.end
        };
        editor.replaceRange(value, start, end);
    }

    //make the slider
    const sliderDiv = document.createElement('div');
    sliderDiv.className = 'inlet_slider';
    //some styles are necessary for behavior
    sliderDiv.style.visibility = 'hidden';
    if (sliderWidth) {
        sliderDiv.style.width = sliderWidth;
    }
    if (fixedContainer) {
        sliderDiv.style.position = 'fixed';
    } else {
        sliderDiv.style.position = 'absolute';
    }
    sliderDiv.style.top = 0;
    container.appendChild(sliderDiv);
    //TODO: figure out how to capture key events when slider has focus
    //sliderDiv.addEventListener("keydown", onKeyDown);

    var slider = document.createElement('input');
    slider.className = 'range';
    slider.setAttribute('type', 'range');
    slider.addEventListener('input', onSlide);
    slider.addEventListener('change', onSlide); // for Firefox
    // we don't enable this behavior in FF because it's slider is buggy
    const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    if (!isFirefox) slider.addEventListener('mouseup', onSlideMouseUp);
    sliderDiv.appendChild(slider);

    function onSlide(event) {
        const value = String(slider.value);
        const cursor = editor.getCursor(true);
        const number = getMatch(cursor, 'number');
        if (!number) return;
        const start = {
            line: cursor.line,
            ch: number.start
        };
        const end = {
            line: cursor.line,
            ch: number.end
        };
        editor.dragging = true;
        editor.replaceRange(value, start, end);
    }

    function onSlideMouseUp(event) {
        slider.value = 0;
        const cursor = editor.getCursor(true);
        const number = getMatch(cursor, 'number');
        if (!number) return;
        const value = parseFloat(number.string);
        const sliderRange = getSliderRange(value);
        slider.setAttribute('value', value);
        slider.setAttribute('step', sliderRange.step);
        slider.setAttribute('min', sliderRange.min);
        slider.setAttribute('max', sliderRange.max);
        slider.value = value;
        editor.dragging = false;
    }

    let clickTarget;

    function windowOnClick(evt) {
        if (
            evt.target === clickTarget ||
            evt.target === sliderDiv ||
            evt.target === slider ||
            evt.target === clickerDiv ||
            evt.target === clicker
        )
            return;
        // TODO: we should really probably clean up the slider/colorpicker
        sliderDiv.style.visibility = 'hidden';
        clickerDiv.style.visibility = 'hidden';
    }

    const LEFT = 37;
    const UP = 38;
    const RIGHT = 39;
    const DOWN = 40;

    function onKeyDown() {
        if (arguments.length == 1) {
            event = arguments[0];
        } else {
            event = arguments[1];
        }
        //if left or right arrows, we can step through the slider
        //disable the slider + picker on key event
        if (event.keyCode == LEFT || event.keyCode == DOWN) {
            //LEFT
            if (sliderDiv.style.visibility === 'visible') {
                slider.stepDown(1);
                onSlide();
                return true;
            } else if (event.altKey) {
                onClick();
            } else {
            }
        } else if (event.keyCode == RIGHT || event.keyCode == UP) {
            //RIGHT
            if (sliderDiv.style.visibility === 'visible') {
                slider.stepUp(1);
                onSlide();
                return true;
            } else if (event.altKey) {
                onClick();
            } else {
            }
        } else {
            sliderDiv.style.visibility = 'hidden';
        }
    }

    const pickerCallback = function(color, type) {
        //set the cursor to desired location
        const cursor = editor.getCursor();
        // we need to re-match in case the size of the string changes
        if (!type) return;
        const match = getMatch(cursor, type);
        const start = {
            line: cursor.line,
            ch: match.start
        };
        const end = {
            line: cursor.line,
            ch: match.end
        };
        editor.picking = true;
        editor.replaceRange(color, start, end);
        setTimeout(function() {
            editor.picking = false;
        }, 100);
    };
    // this will be overwritten if hslMatch hits
    // so that the "old color view" will initilize correctly
    picker = new Picker('#ffffff');
    // setup colorpicker position

    //Handle clicks
    function onClick(ev) {
        // bail out if we were doing a selection and not a click
        if (editor.somethingSelected()) {
            return;
        }
        // we track when we've clicked on a potential number/color for use in the windowOnClick function
        clickTarget = ev.target;
        // we get the cursor and its coordinates for when we need to place the slider/color picker
        const cursor = editor.getCursor(true);
        const token = editor.getTokenAt(cursor);
        const cursorOffset = editor.cursorCoords(true, 'page');
        const leftBase = editor.cursorCoords(true, horizontalMode).left;

        // see if there is a match on the cursor click
        const numberMatch = getMatch(cursor, 'number');
        const hslMatch = getMatch(cursor, 'hsl');
        const hexMatch = getMatch(cursor, 'hex');
        const rgbMatch = getMatch(cursor, 'rgb');
        const booleanMatch = getMatch(cursor, 'boolean');

        let pickerTop = cursorOffset.top - topOffset;
        if (cursorOffset.top < topBoundary) {
            pickerTop = cursorOffset.top + bottomOffset;
        }

        const pickerLeft = leftBase - leftOffset;

        sliderDiv.style.visibility = 'hidden';
        clickerDiv.style.visibility = 'hidden';

        if (hexMatch) {
            var color = hexMatch.string;
            // reconstructing the picker so that the previous color
            // element shows the color clicked
            picker = new Picker(color);
            picker.setCSS(color); // current color selection
            picker.presentModal(pickerLeft, pickerTop);
            picker.on('changed', function() {
                picked = picker.getCSS();
                //translate hsl return to hex
                picked = Color.Space(picked, 'W3>HSL>RGB>HEX24>W3');
                pickerCallback(picked, 'hex');
            });
        } else if (hslMatch) {
            var color = hslMatch.string;
            picker = new Picker(color);
            picker.setCSS(color);
            picker.presentModal(pickerLeft, pickerTop);
            picker.on('changed', function() {
                picked = picker.getCSS();
                pickerCallback(picked, 'hsl');
            });
        } else if (rgbMatch) {
            var color = rgbMatch.string;
            picker = new Picker(color);
            picker.setCSS(color); // current color selection
            picker.presentModal(pickerLeft, pickerTop);
            picker.on('changed', function() {
                picked = picker.getCSS();
                //translate hsl return to rgb
                picked = Color.Space(picked, 'W3>HSL>RGB>W3');
                pickerCallback(picked, 'rgb');
            });
        } else if (numberMatch) {
            slider.value = 0;
            var value = parseFloat(numberMatch.string);
            const sliderRange = getSliderRange(value);
            slider.setAttribute('value', value);
            slider.setAttribute('step', sliderRange.step);
            slider.setAttribute('min', sliderRange.min);
            slider.setAttribute('max', sliderRange.max);
            slider.value = value;

            // setup slider position
            // position slider centered above the cursor
            const sliderTop = cursorOffset.top - yOffset;
            const sliderStyle = window.getComputedStyle(sliderDiv);
            const sliderWidth = getPixels(sliderStyle.width);
            const sliderLeft = leftBase - sliderWidth / 2 + xOffset;
            /*
            var sliderLeft;
            if(fixedContainer) {
              sliderLeft = fixedContainer - leftBase - sliderWidth/2 + xOffset;
            } else {
              sliderLeft = leftBase - sliderWidth/2 + xOffset;
            }
            */
            sliderDiv.style.top = sliderTop - 10 + 'px';
            sliderDiv.style.left = sliderLeft + 'px';

            sliderDiv.style.visibility = 'visible';
        } else if (booleanMatch) {
            const clickerTop = cursorOffset.top - yOffset;
            const clickerStyle = window.getComputedStyle(clickerDiv);
            const clickerWidth = getPixels(clickerStyle.width);
            const clickerLeft = leftBase - clickerWidth / 2 + xOffset;
            var value = JSON.parse(booleanMatch.string);

            if (value) {
                // sometimes adding the attribute checked is not enough
                clickerDiv.removeChild(clicker);
                clicker = document.createElement('input');
                clicker.className = 'checkbox';
                clicker.setAttribute('type', 'checkbox');
                clicker.setAttribute('checked', 'checked');
                clicker.addEventListener('change', onClicker);
                clickerDiv.appendChild(clicker);
            } else {
                // sometimes removing the attribute checked is not enough
                clickerDiv.removeChild(clicker);
                clicker = document.createElement('input');
                clicker.className = 'checkbox';
                clicker.setAttribute('type', 'checkbox');
                clicker.addEventListener('change', onClicker);
                clickerDiv.appendChild(clicker);
            }

            clickerDiv.style.top = clickerTop - 3 + 'px';
            clickerDiv.style.left = clickerLeft + 'px';

            clickerDiv.style.visibility = 'visible';
        } else {
        }
    }

    function getSliderRange(value) {
        //this could be substituted out for other heuristics
        let range, step, sliderMin, sliderMax;
        //these values were chosen by Gabriel Florit for his livecoding project, they work really well!
        if (value === 0) {
            range = [-100, 100];
        } else {
            range = [-value * 3, value * 5];
        }
        if (range[0] < range[1]) {
            sliderMin = range[0];
            sliderMax = range[1];
        } else {
            sliderMin = range[1];
            sliderMax = range[0];
        }
        // slider range needs to be evenly divisible by the step
        if (sliderMax - sliderMin > 20) {
            step = 1;
        } else {
            step = (sliderMax - sliderMin) / 200;
        }
        return {
            min: sliderMin,
            max: sliderMax,
            step: step
        };
    }

    function getMatch(cursor, type) {
        if (!type) return;
        let re;
        switch (type.toLowerCase()) {
            case 'boolean':
                re = /true|false/g;
                break;

            case 'hsl':
                re = /hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3}\%)\s*,\s*(\d{1,3}\%)\s*(?:\s*,\s*(\d+(?:\.\d+)?)\s*)?\)/g;
                break;

            case 'rgb':
                re = /rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)/g;
                break;

            case 'hex':
                re = /#[a-fA-F0-9]{3,6}/g;
                break;

            case 'number':
                re = /[-]?\.?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
                break;

            default:
                throw new Error('invalid match selection');
                return;
        }
        const line = editor.getLine(cursor.line);

        let match = re.exec(line);
        while (match) {
            const val = match[0];
            const len = val.length;
            const start = match.index;
            const end = match.index + len;
            if (cursor.ch >= start && cursor.ch <= end) {
                match = null;
                return {
                    start: start,
                    end: end,
                    string: val
                };
            }
            match = re.exec(line);
        }
        return;
    }
}

function getPixels(style) {
    let pix = 0;
    if (style.length > 2) {
        pix = parseFloat(style.slice(0, style.length - 2));
    }
    if (!pix) pix = 0;
    return pix;
}

function getOffset(el) {
    let _x = 0;
    let _y = 0;
    while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return {
        top: _y,
        left: _x
    };
}

export default Inlet;
