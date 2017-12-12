import { encodeSource } from './base64.js';
import { EditContext } from '../editContext.js';
import { sendCodeToClient } from '../../editorHooks/message_ui.js';

const currentShaderTempReplace = function(callback, shaderReplacment, uid, useMain) {
    let uidShader = uid;
    if (!uidShader) uidShader = EditContext.getCurrentProgram().id;
    sendCodeToClient({
        action: 'ProgramReplaced',
        id: uidShader,
        source: encodeSource(shaderReplacment),
        useMain: useMain,
        ctxtId: EditContext.getCurrentContextID()
    });

    //handle compilation & run frame ack from hooked client then callback call
    EditContext.getCurrentContext().programCompiledCallback = callback;
};

const currentShaderTimingRequest = function(callback, uid) {
    let uidShader = uid;
    if (!uidShader) uidShader = EditContext.getCurrentProgram().id;
    sendCodeToClient({
        action: 'ProgramTimingRequest',
        id: uidShader,
        ctxtId: EditContext.getCurrentContextID()
    });

    //handle compilation & run frame ack from hooked client then callback call
    EditContext.getCurrentContext().programTimingCallback = callback;
};

export { currentShaderTempReplace, currentShaderTimingRequest };
