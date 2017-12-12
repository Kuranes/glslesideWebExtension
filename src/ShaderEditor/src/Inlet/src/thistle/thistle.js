let HSLCircle,
    Picker,
    cssColorToRGB,
    fmod,
    hslToCSS,
    hslToRGB,
    hueToRGB,
    isValidCSSColor,
    map,
    normalizeColor,
    rgbToHSL,
    style,
    slice = [].slice;

hueToRGB = function(m1, m2, h) {
    h = h < 0 ? h + 1 : h > 1 ? h - 1 : h;
    if (h * 6 < 1) {
        return m1 + (m2 - m1) * h * 6;
    }
    if (h * 2 < 1) {
        return m2;
    }
    if (h * 3 < 2) {
        return m1 + (m2 - m1) * (0.66666 - h) * 6;
    }
    return m1;
};

hslToRGB = function(h, s, l) {
    let m1, m2;
    m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
    m1 = l * 2 - m2;
    return {
        r: hueToRGB(m1, m2, h + 0.33333),
        g: hueToRGB(m1, m2, h),
        b: hueToRGB(m1, m2, h - 0.33333)
    };
};

rgbToHSL = function(r, g, b) {
    let diff, h, l, max, min, s, sum;
    max = Math.max(r, g, b);
    min = Math.min(r, g, b);
    diff = max - min;
    sum = max + min;
    h =
        min === max
            ? 0
            : r === max
                ? ((60 * (g - b)) / diff + 360) % 360
                : g === max
                    ? (60 * (b - r)) / diff + 120
                    : (60 * (r - g)) / diff + 240;
    l = sum / 2;
    s = l === 0 ? 0 : l === 1 ? 1 : l <= 0.5 ? diff / sum : diff / (2 - sum);
    return {
        h: h,
        s: s,
        l: l
    };
};

hslToCSS = function(h, s, l, a) {
    if (a != null) {
        return (
            'hsla(' +
            fmod(Math.round((h * 180) / Math.PI), 360) +
            ',' +
            Math.round(s * 100) +
            '%,' +
            Math.round(l * 100) +
            '%,' +
            a +
            ')'
        );
    } else {
        return (
            'hsl(' +
            fmod(Math.round((h * 180) / Math.PI), 360) +
            ',' +
            Math.round(s * 100) +
            '%,' +
            Math.round(l * 100) +
            '%)'
        );
    }
};

cssColorToRGB = function(cssColor) {
    let b, g, m, r, rgb, s;
    s = document.createElement('span');
    document.body.appendChild(s);
    s.style.backgroundColor = cssColor;
    rgb = getComputedStyle(s).backgroundColor;
    document.body.removeChild(s);
    m = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(rgb);
    if (!m) {
        m = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(rgb);
    }
    r = parseInt(m[1]);
    g = parseInt(m[2]);
    b = parseInt(m[3]);
    if (m[4]) {
        return {
            r: r / 255,
            g: g / 255,
            b: b / 255,
            a: parseFloat(m[4])
        };
    }
    return {
        r: r / 255,
        g: g / 255,
        b: b / 255
    };
};

isValidCSSColor = function(cssColor) {
    let ret, s;
    s = document.createElement('span');
    document.body.appendChild(s);
    s.style.backgroundColor = cssColor;
    ret = s.style.backgroundColor.length > 0;
    s.remove();
    return ret;
};

style = function(tag, styles) {
    let n, v;
    for (n in styles) {
        v = styles[n];
        tag.style[n] = v;
    }
    return tag;
};

fmod = function(x, m) {
    x = x % m;
    if (x < 0) {
        x += m;
    }
    return x;
};

map = function(v, min, max) {
    return min + (max - min) * Math.min(1, Math.max(0, v));
};

HSLCircle = (function() {
    function HSLCircle(radius1, width1, lightness) {
        let b,
            canvas,
            ctx,
            d,
            data,
            dx,
            dy,
            g,
            h,
            i,
            imgdata,
            j,
            r,
            radius,
            ref,
            ref1,
            ref2,
            s,
            width,
            x,
            y;
        this.radius = radius1;
        this.width = width1;
        this.lightness = lightness;
        radius = this.radius;
        width = this.width;
        canvas = this.canvas = document.createElement('canvas');
        canvas.width = canvas.height = radius * 2;
        ctx = canvas.getContext('2d');
        imgdata = ctx.createImageData(canvas.width, canvas.height);
        data = imgdata.data;
        for (
            y = i = 0, ref = canvas.height;
            0 <= ref ? i < ref : i > ref;
            y = 0 <= ref ? ++i : --i
        ) {
            for (
                x = j = 0, ref1 = canvas.width;
                0 <= ref1 ? j < ref1 : j > ref1;
                x = 0 <= ref1 ? ++j : --j
            ) {
                dy = y - radius;
                dx = x - radius;
                d = Math.sqrt(dy * dy + dx * dx);
                if (d > radius + 1.5) {
                    continue;
                }
                d -= 10;
                s = Math.max(0, Math.min(1, d / (radius - width / 2 - 10)));
                h = Math.atan2(dy, dx) / (Math.PI * 2);
                (ref2 = hslToRGB(h, s, this.lightness)), (r = ref2.r), (g = ref2.g), (b = ref2.b);
                data[(y * canvas.width + x) * 4 + 0] = r * 255;
                data[(y * canvas.width + x) * 4 + 1] = g * 255;
                data[(y * canvas.width + x) * 4 + 2] = b * 255;
                data[(y * canvas.width + x) * 4 + 3] = 255;
            }
        }
        ctx.putImageData(imgdata, 0, 0);
    }

    HSLCircle.prototype.drawHSLCircle = function(canvas, saturation) {
        let ctx, highlighted_r, radius, width;
        canvas.width = canvas.height = 2 * this.radius;
        ctx = canvas.getContext('2d');
        width = this.width;
        radius = this.radius;
        highlighted_r = map(saturation, width, radius);
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(radius, radius, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(radius, radius, highlighted_r, 0, Math.PI * 2);
        ctx.arc(radius, radius, highlighted_r - width, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-in';
        ctx.drawImage(this.canvas, 0, 0);
        return ctx.restore();
    };

    return HSLCircle;
})();

normalizeColor = function(color) {
    if (typeof color === 'string') {
        color = cssColorToRGB(color);
    }
    if (color.r != null && color.g != null && color.b != null) {
        color = rgbToHSL(color.r, color.g, color.b);
        color.h = (color.h * Math.PI) / 180;
    } else if (color.h != null && color.s != null && color.l != null) {
        color.h = (color.h * Math.PI) / 180;
    }
    return color;
};

Picker = (function() {
    let attachEvents,
        makeCircle,
        makeColorPreview,
        makeKnob,
        makeLightnessSlider,
        makeRoot,
        radius,
        width;

    radius = 80;

    width = 25;

    function Picker(color) {
        this.color = normalizeColor(color);
        this.refColor = this.color;
        this.el = makeRoot();
        this.circleContainer = this.el.appendChild(makeCircle.call(this));
        this.lSlider = this.el.appendChild(makeLightnessSlider.call(this));
        this.colorPreview = this.el.appendChild(makeColorPreview.call(this));
        attachEvents.call(this);
        this.setLightness(this.color.l);
    }

    Picker.prototype.setHue = function(h) {
        let b, oR, r;
        this.color.h = h;
        r = map(this.color.s, width, radius) - width / 2;
        oR = radius - width / 2;
        style(this.hueKnob, {
            left: Math.round(oR + Math.cos(h) * r + 6 - 1) + 'px',
            top: Math.round(oR + Math.sin(h) * r + 6 - 1) + 'px'
        });
        this.colorPreview.style.backgroundColor = this.lKnob.style.backgroundColor = this.hueKnob.style.backgroundColor = hslToCSS(
            this.color.h,
            this.color.s,
            this.color.l
        );
        b = hslToCSS(this.color.h, this.color.s, 0.5);
        this.lSlider.style.backgroundImage =
            '-webkit-linear-gradient(bottom, black, ' + b + ' 50%, white)';
        this.lSlider.style.backgroundImage =
            '-moz-linear-gradient(bottom, black, ' + b + ' 50%, white)';
        return this.emit('changed');
    };

    Picker.prototype.setSaturation = function(s) {
        this.color.s = s;
        this.circle.drawHSLCircle(this.circleCanvas, s);
        return this.setHue(this.color.h);
    };

    Picker.prototype.setLightness = function(l) {
        this.color.l = l;
        this.circle = new HSLCircle(radius, width, l);
        this.lKnob.style.top = (1 - l) * this.lSlider._height - 11 + 'px';
        return this.setSaturation(this.color.s);
    };

    Picker.prototype.setHSL = function(h, s, l) {
        this.color.h = (fmod(h, 360) * Math.PI) / 180;
        this.color.s = Math.max(0, Math.min(1, s));
        l = Math.max(0, Math.min(1, l));
        return this.setLightness(l);
    };

    Picker.prototype.getHSL = function() {
        return {
            h: fmod((this.color.h * 180) / Math.PI, 360),
            s: this.color.s,
            l: this.color.l
        };
    };

    Picker.prototype.setRGB = function(r, g, b) {
        let h, l, ref, s;
        (ref = rgbToHSL(r, g, b)), (h = ref.h), (s = ref.s), (l = ref.l);
        return this.setHSL(h, s, l);
    };

    Picker.prototype.getRGB = function() {
        return hslToRGB(this.color.h / (Math.PI * 2), this.color.s, this.color.l);
    };

    Picker.prototype.getCSS = function() {
        return hslToCSS(this.color.h, this.color.s, this.color.l);
    };

    Picker.prototype.setCSS = function(css) {
        let b, g, r, ref;
        (ref = cssColorToRGB(css)), (r = ref.r), (g = ref.g), (b = ref.b);
        return this.setRGB(r, g, b);
    };

    Picker.prototype.on = function(e, l) {
        let base;
        if (this._listeners == null) {
            this._listeners = {};
        }
        return ((base = this._listeners)[e] != null ? base[e] : (base[e] = [])).push(l);
    };

    Picker.prototype.emit = function() {
        let args, e, i, l, len, ref, ref1, results;
        (e = arguments[0]), (args = 2 <= arguments.length ? slice.call(arguments, 1) : []);
        if (this._listeners) {
            ref1 = (ref = this._listeners[e]) != null ? ref : [];
            results = [];
            for (i = 0, len = ref1.length; i < len; i++) {
                l = ref1[i];
                results.push(l.call.apply(l, [this].concat(slice.call(args))));
            }
            return results;
        }
    };

    Picker.prototype.removeListener = function(e, l) {
        let k;
        if (this._listeners[e]) {
            return (this._listeners[e] = function() {
                let i, len, ref, results;
                ref = this._listeners[e];
                results = [];
                for (i = 0, len = ref.length; i < len; i++) {
                    k = ref[i];
                    if (k !== l) {
                        results.push(k);
                    }
                }
                return results;
            }.call(this));
        }
    };

    attachEvents = function() {
        let c, updateCursor;
        this.lKnob.onmousedown = (function(_this) {
            return function(e) {
                let move, up;
                document.documentElement.style.cursor = 'pointer';
                window.addEventListener(
                    'mousemove',
                    (move = function(e) {
                        let r, y;
                        r = _this.lSlider.getBoundingClientRect();
                        y = e.clientY - r.top;
                        return _this.setLightness(
                            Math.max(0, Math.min(1, 1 - y / _this.lSlider._height))
                        );
                    })
                );
                window.addEventListener(
                    'mouseup',
                    (up = function(e) {
                        window.removeEventListener('mousemove', move);
                        window.removeEventListener('mouseup', up);
                        window.removeEventListener('blur', up);
                        return (document.documentElement.style.cursor = '');
                    })
                );
                window.addEventListener('blur', up);
                e.preventDefault();
                return e.stopPropagation();
            };
        })(this);
        c = this.circleContainer;
        updateCursor = (function(_this) {
            return function(e) {
                let d, dx, dy, r, t, x, y;
                x = e.layerX;
                y = e.layerY;
                dx = x - radius;
                dy = y - radius;
                d = Math.sqrt(dx * dx + dy * dy);
                t = Math.atan2(dy, dx);
                r = map(_this.color.s, width, radius);
                if (r - width < d && d < r) {
                    if (
                        (-Math.PI / 8 < t && t < Math.PI / 8) ||
                        t >= (7 * Math.PI) / 8 ||
                        t <= (-7 * Math.PI) / 8
                    ) {
                        return (c.style.cursor = 'ew-resize');
                    } else if (
                        (Math.PI / 8 <= t && t < (3 * Math.PI) / 8) ||
                        ((-7 * Math.PI) / 8 < t && t <= (-5 * Math.PI) / 8)
                    ) {
                        return (c.style.cursor = 'nwse-resize');
                    } else if (
                        ((3 * Math.PI) / 8 <= t && t < (5 * Math.PI) / 8) ||
                        ((-5 * Math.PI) / 8 < t && t <= (-3 * Math.PI) / 8)
                    ) {
                        return (c.style.cursor = 'ns-resize');
                    } else if (
                        ((5 * Math.PI) / 8 <= t && t < (7 * Math.PI) / 8) ||
                        ((-3 * Math.PI) / 8 < t && t <= -Math.PI / 8)
                    ) {
                        return (c.style.cursor = 'nesw-resize');
                    }
                } else {
                    return (c.style.cursor = '');
                }
            };
        })(this);
        c.addEventListener('mouseover', function(e) {
            let move, out;
            updateCursor(e);
            c.addEventListener(
                'mousemove',
                (move = function(e) {
                    return updateCursor(e);
                })
            );
            c.addEventListener(
                'mouseout',
                (out = function(e) {
                    c.style.cursor = '';
                    c.removeEventListener('mousemove', move);
                    c.removeEventListener('mouseout', out);
                    return window.removeEventListener('blur', out);
                })
            );
            return window.addEventListener('blur', out);
        });
        c.addEventListener(
            'mousedown',
            (function(_this) {
                return function(e) {
                    let d, dx, dy, move, r, t, up, x, y;
                    e.preventDefault();
                    x = e.layerX;
                    y = e.layerY;
                    dx = x - radius;
                    dy = y - radius;
                    d = Math.sqrt(dx * dx + dy * dy);
                    t = Math.atan2(dy, dx);
                    r = map(_this.color.s, width, radius);
                    if (!(r - width < d && d < r)) {
                        return;
                    }
                    document.documentElement.style.cursor = c.style.cursor;
                    window.addEventListener(
                        'mousemove',
                        (move = function(e) {
                            let cx, cy, s;
                            r = _this.circleCanvas.getBoundingClientRect();
                            cx = r.left + r.width / 2;
                            cy = r.top + r.height / 2;
                            dx = e.clientX - cx;
                            dy = e.clientY - cy;
                            d = Math.sqrt(dx * dx + dy * dy);
                            d -= 10;
                            s = Math.max(0, Math.min(1, d / (radius - width / 2 - 10)));
                            return _this.setSaturation(s);
                        })
                    );
                    window.addEventListener(
                        'mouseup',
                        (up = function(e) {
                            window.removeEventListener('mousemove', move);
                            window.removeEventListener('mouseup', up);
                            window.removeEventListener('blur', up);
                            return (document.documentElement.style.cursor = '');
                        })
                    );
                    return window.addEventListener('blur', up);
                };
            })(this)
        );
        return (this.hueKnob.onmousedown = (function(_this) {
            return function(e) {
                let move, up;
                document.documentElement.style.cursor = 'pointer';
                window.addEventListener(
                    'mousemove',
                    (move = function(e) {
                        let cx, cy, r;
                        r = _this.circleCanvas.getBoundingClientRect();
                        cx = r.left + r.width / 2;
                        cy = r.top + r.height / 2;
                        return _this.setHue(Math.atan2(e.clientY - cy, e.clientX - cx));
                    })
                );
                window.addEventListener(
                    'mouseup',
                    (up = function(e) {
                        window.removeEventListener('mousemove', move);
                        window.removeEventListener('mouseup', up);
                        window.removeEventListener('blur', up);
                        return (document.documentElement.style.cursor = '');
                    })
                );
                window.addEventListener('blur', up);
                e.preventDefault();
                return e.stopPropagation();
            };
        })(this));
    };

    makeRoot = function() {
        let div;
        div = document.createElement('div');
        div.className = 'picker';
        style(div, {
            display: 'inline-block',
            background: 'hsl(0, 0%, 97%)',
            padding: '6px',
            borderRadius: '6px',
            boxShadow:
                '1px 1px 5px hsla(0, 0%, 39%, 0.2), hsla(0, 0%, 100%, 0.9) 0px 0px 1em 0.3em inset',
            border: '1px solid hsla(0, 0%, 59%, 0.2)',
            position: 'absolute',
            backgroundImage:
                '-webkit-linear-gradient(left top, hsla(0, 0%, 0%, 0.05) 25%, transparent 25%, transparent 50%, hsla(0, 0%, 0%, 0.05) 50%, hsla(0, 0%, 0%, 0.05) 75%, transparent 75%, transparent)',
            backgroundSize: '40px 40px'
        });
        style(div, {
            backgroundImage:
                '-moz-linear-gradient(left top, hsla(0, 0%, 0%, 0.05) 25%, transparent 25%, transparent 50%, hsla(0, 0%, 0%, 0.05) 50%, hsla(0, 0%, 0%, 0.05) 75%, transparent 75%, transparent)',
            zIndex: '1000'
        });
        return div;
    };

    makeCircle = function() {
        let circleContainer, k;
        circleContainer = document.createElement('div');
        style(circleContainer, {
            display: 'inline-block',
            width: radius * 2 + 'px',
            height: radius * 2 + 'px',
            borderRadius: radius + 'px',
            boxShadow: '0px 0px 7px rgba(0,0,0,0.3)'
        });
        circleContainer.appendChild((this.circleCanvas = document.createElement('canvas')));
        this.hueKnob = k = makeKnob(27);
        circleContainer.appendChild(k);
        return circleContainer;
    };

    makeLightnessSlider = function() {
        let k, lSlider;
        lSlider = document.createElement('div');
        style(lSlider, {
            display: 'inline-block',
            width: '20px',
            height: radius * 2 - 22 + 'px',
            marginLeft: '6px',
            borderRadius: '10px',
            boxShadow:
                'hsla(0, 100%, 100%, 0.1) 0 1px 2px 1px inset, hsla(0, 100%, 100%, 0.2) 0 1px inset, hsla(0, 0%, 0%, 0.4) 0 -1px 1px inset, hsla(0, 0%, 0%, 0.4) 0 1px 1px',
            position: 'relative',
            top: '-11px'
        });
        lSlider._height = radius * 2 - 22;
        this.lKnob = k = makeKnob(22);
        style(k, {
            left: '-1px'
        });
        lSlider.appendChild(k);
        return lSlider;
    };

    makeColorPreview = function() {
        let colorPreview, originalColor, originalColorTransparent;
        colorPreview = document.createElement('div');
        originalColor = hslToCSS(this.refColor.h, this.refColor.s, this.refColor.l);
        originalColorTransparent = hslToCSS(this.refColor.h, this.refColor.s, this.refColor.l, 0);
        style(colorPreview, {
            boxShadow:
                'hsla(0, 0%, 0%, 0.5) 0 1px 5px, hsla(0, 100%, 100%, 0.4) 0 1px 1px inset, hsla(0, 0%, 0%, 0.3) 0 -1px 1px inset',
            height: '25px',
            marginTop: '6px',
            borderRadius: '3px',
            backgroundImage:
                '-webkit-linear-gradient(-20deg, ' +
                originalColorTransparent +
                ', ' +
                originalColorTransparent +
                ' 69%, ' +
                originalColor +
                ' 70%, ' +
                originalColor +
                ')'
        });
        style(colorPreview, {
            backgroundImage:
                '-moz-linear-gradient(-20deg, ' +
                originalColorTransparent +
                ', ' +
                originalColorTransparent +
                ' 69%, ' +
                originalColor +
                ' 70%, ' +
                originalColor +
                ')'
        });
        return colorPreview;
    };

    makeKnob = function(size) {
        let el;
        el = document.createElement('div');
        el.className = 'knob';
        style(el, {
            position: 'absolute',
            width: size + 'px',
            height: size + 'px',
            backgroundColor: 'red',
            borderRadius: Math.floor(size / 2) + 'px',
            cursor: 'pointer',
            backgroundImage:
                '-webkit-gradient(radial, 50% 0%, 0, 50% 0%, 15, color-stop(0%, rgba(255, 255, 255, 0.8)), color-stop(100%, rgba(255, 255, 255, 0.2)))',
            boxShadow:
                'white 0px 1px 1px inset, rgba(0, 0, 0, 0.4) 0px -1px 1px inset, rgba(0, 0, 0, 0.4) 0px 1px 4px 0px, rgba(0, 0, 0, 0.6) 0 0 2px'
        });
        style(el, {
            backgroundImage:
                'radial-gradient(circle at center top, rgba(255,255,255,0.8), rgba(255, 255, 255, 0.2) 15px'
        });
        return el;
    };

    Picker.prototype.presentModal = function(x, y) {
        let modalFrame;
        style(this.el, {
            left: x + 'px',
            top: y - 10 + 'px',
            opacity: '0',
            webkitTransition: '0.15s',
            MozTransition: '0.15s'
        });
        modalFrame = document.createElement('div');
        modalFrame.style.position = 'fixed';
        modalFrame.style.top = modalFrame.style.left = modalFrame.style.bottom = modalFrame.style.right =
            '0';
        modalFrame.style.zIndex = '999';
        modalFrame.onclick = (function(_this) {
            return function() {
                let end;
                document.body.removeChild(modalFrame);
                _this.el.style.top = y + 10 + 'px';
                _this.el.style.opacity = 0;
                end = function() {
                    document.body.removeChild(_this.el);
                    _this.el.removeEventListener('webkitTransitionEnd', end);
                    return _this.el.removeEventListener('transitionend', end);
                };
                _this.el.addEventListener('webkitTransitionEnd', end);
                _this.el.addEventListener('transitionend', end);
                return _this.emit('closed');
            };
        })(this);
        document.body.appendChild(modalFrame);
        document.body.appendChild(this.el);
        this.el.offsetHeight;
        this.el.style.opacity = '1';
        this.el.style.top = y + 'px';
        return this;
    };

    Picker.prototype.presentModalBeneath = function(el) {
        let elPos, x, y;
        elPos = el.getBoundingClientRect();
        x = elPos.left + window.scrollX;
        y = elPos.bottom + window.scrollY + 4;
        return this.presentModal(x, y);
    };

    return Picker;
})();

export { Picker, isValidCSSColor };
