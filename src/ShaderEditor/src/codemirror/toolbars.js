import CodeMirror from 'codemirror/lib/codemirror.js';

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE
CodeMirror.defineExtension('addPanel', function(node, options) {
    options = options || {};

    if (!this.state.panels) initPanels(this);

    const info = this.state.panels;
    const wrapper = info.wrapper;
    const cmWrapper = this.getWrapperElement();

    if (options.after instanceof Panel && !options.after.cleared) {
        wrapper.insertBefore(node, options.before.node.nextSibling);
    } else if (options.before instanceof Panel && !options.before.cleared) {
        wrapper.insertBefore(node, options.before.node);
    } else if (options.replace instanceof Panel && !options.replace.cleared) {
        wrapper.insertBefore(node, options.replace.node);
        options.replace.clear();
    } else if (options.position === 'bottom') {
        wrapper.appendChild(node);
    } else if (options.position === 'before-bottom') {
        wrapper.insertBefore(node, cmWrapper.nextSibling);
    } else if (options.position === 'after-top') {
        wrapper.insertBefore(node, cmWrapper);
    } else {
        wrapper.insertBefore(node, wrapper.firstChild);
    }

    const height = (options && options.height) || node.offsetHeight;
    //this._setSize(null, (info.heightLeft -= height));
    info.panels++;
    if (options.stable && isAtTop(this, node))
        this.scrollTo(null, this.getScrollInfo().top + height);

    return new Panel(this, node, options, height);
});

function Panel(cm, node, options, height) {
    this.cm = cm;
    this.node = node;
    this.options = options;
    this.height = height;
    this.cleared = false;
}

Panel.prototype.clear = function() {
    if (this.cleared) return;
    this.cleared = true;
    const info = this.cm.state.panels;
    this.cm._setSize(null, (info.heightLeft += this.height));
    if (this.options.stable && isAtTop(this.cm, this.node))
        this.cm.scrollTo(null, this.cm.getScrollInfo().top - this.height);
    info.wrapper.removeChild(this.node);
    if (--info.panels === 0) removePanels(this.cm);
};

Panel.prototype.changed = function(height) {
    const newHeight = height == null ? this.node.offsetHeight : height;
    const info = this.cm.state.panels;
    this.cm._setSize(null, (info.heightLeft -= newHeight - this.height));
    this.height = newHeight;
};

function initPanels(cm) {
    const wrap = cm.getWrapperElement();
    const style = window.getComputedStyle ? window.getComputedStyle(wrap) : wrap.currentStyle;
    const height = parseInt(style.height);
    const info = (cm.state.panels = {
        setHeight: wrap.style.height,
        heightLeft: height,
        panels: 0,
        wrapper: document.createElement('div')
    });
    wrap.parentNode.insertBefore(info.wrapper, wrap);
    const hasFocus = cm.hasFocus();
    info.wrapper.appendChild(wrap);
    if (hasFocus) cm.focus();

    cm._setSize = cm.setSize;

    cm.setSize = function() {
        // tab bar = 28.8
        const heightToolbars = '28.8px';
        cm._setSize('100%', 'calc(100% - ' + heightToolbars + ')');
    };
}

function removePanels(cm) {
    const info = cm.state.panels;
    cm.state.panels = null;

    const wrap = cm.getWrapperElement();
    info.wrapper.parentNode.replaceChild(wrap, info.wrapper);
    wrap.style.height = info.setHeight;
    cm.setSize = cm._setSize;
    cm.setSize();
}

function isAtTop(cm, dom) {
    for (let sibling = dom.nextSibling; sibling; sibling = sibling.nextSibling)
        if (sibling === cm.getWrapperElement()) return true;
    return false;
}
