const loadBase64 = () => {
    if (typeof btoa === 'undefined') {
        global.btoa = function (str) {
            return new Buffer(str, 'binary').toString('base64');
        };
    }

    if (typeof atob === 'undefined') {
        global.atob = function (b64Encoded) {
            return new Buffer(b64Encoded, 'base64').toString('binary');
        };
    }
}

export const loadGlobals = () => {
    loadBase64();
}
