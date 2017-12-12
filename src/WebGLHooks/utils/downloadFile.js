const downloadFile = function(url, type, name) {
    const dlLink = document.createElement('a');
    dlLink.download = name + '_' + window.performance.now().toString() + '.' + type;
    dlLink.href = url;
    document.body.appendChild(dlLink);
    dlLink.click();
    document.body.removeChild(dlLink);
};

export default downloadFile;
