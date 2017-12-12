import { EditContext } from '../editContext.js';
import { sendCodeToClient } from '../../editorHooks/message_ui.js';

const queryDataCallback = {};

const setQueryDataCallback = function(callback, type) {
    queryDataCallback[type] = callback;
};

const getQueryDataCallback = function(type) {
    return queryDataCallback[type];
};

const queryData = function(name, callback, type) {
    const msg = {
        id: EditContext.getCurrentProgram().id,
        ctxtId: EditContext.getCurrentContextID()
    };
    msg.action = type + 'Request';
    msg[type + 'Name'] = name;

    sendCodeToClient(msg);
    if (callback) {
        setQueryDataCallback(callback, type);
    }
};

export { queryData, setQueryDataCallback, getQueryDataCallback };
