module.exports = function (css) {
    if (css.indexOf('module.exports =') !== -1) {
        // Here we can change the original css
        eval('var module = {}; ' + css);
        return module.exports.content;
    }

    return css;

};
