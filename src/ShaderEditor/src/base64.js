// Editor code update
// base64 encode
// avoid JSON.parse or eval errors
function encodeSource(str) {
    return window.btoa(str);
}

function decodeSource(str) {
    return window.atob(str);
}
export { encodeSource, decodeSource };
