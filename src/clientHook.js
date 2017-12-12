import { addTimersHooks } from './WebGLHooks/client_timers.js';

import { hookDispatcher } from './WebGLHooks/webgl_hookDispatcher.js';
// list
import { hookedContextList } from './WebGLHooks/webgl_hookedContextList.js';
// one hooked info
import { hookedContextInfo } from './WebGLHooks/webgl_hookedContextInfo.js';
import { noOpwebglHook } from './WebGLHooks/plugins/noOp.js';
import { webglErrorLogHook } from './WebGLHooks/plugins/glError.js';
import { webglRecordStateHook } from './WebGLHooks/plugins/stateRecord.js';
import { webgl1Hook } from './WebGLHooks/plugins/webgl1.js';
import { webgl2Hook } from './WebGLHooks/plugins/webgl2.js';
import { addClientActions } from './WebGLHooks/client_actions.js';
import { msgActions } from './WebGLHooks/msgActions.js';

let addHooksString = 'function(setttings){';

addHooksString += `
    // You Only Live Once
    if (window.renderbugle ) {
        // already injected ?
        // means  devtools "reload" 
        return;
    }
    // TODO: investigate file://
    if(window.location.protocol.indexOf('http') === -1){
        console.warn('renderBugle support only http and https, no file://');
        return;
    }
    // But once will be enough
    window.renderbugle = true;
    // TODO: find a way using gl extension faking
    // instead of hacky to get shader rebuild...
    window.spector = true;
    
`;

addHooksString += '(' + addTimersHooks.toString() + ')();';

// func declarations
addHooksString += msgActions.toString() + '\n';
addHooksString += hookDispatcher.toString() + '\n';
addHooksString += hookedContextList.toString() + '\n';
addHooksString += hookedContextInfo.toString() + '\n';
addHooksString += noOpwebglHook.toString() + '\n';
addHooksString += webglErrorLogHook.toString() + '\n';
addHooksString += webglRecordStateHook.toString() + '\n';
addHooksString += webgl1Hook.toString() + '\n';
addHooksString += webgl2Hook.toString() + '\n';
addHooksString += addClientActions.toString() + '\n';

// for i in plugins, create code, hookit, then pass as aparam of addwebglHooks

// hooks and plugins
addHooksString += 'var hooks = {};';
addHooksString += 'hooks.noOpwebglHook = noOpwebglHook;\n';
addHooksString += 'hooks.webglErrorLogHook = webglErrorLogHook;\n';
addHooksString += 'hooks.webglRecordStateHook = webglRecordStateHook;\n';
addHooksString += 'hooks.webgl1 = webgl1Hook;\n';
addHooksString += 'hooks.webgl2 = webgl2Hook;\n';
// classes
addHooksString += 'var classDecl = {}\n';
addHooksString += 'classDecl.messengerClass = msgActions();\n';
addHooksString += 'classDecl.hookedContextListClass = hookedContextList()\n';
addHooksString += 'classDecl.hookedContextInfoClass = hookedContextInfo();\n';
// utils singleton
addHooksString += 'var utils = {}\n';
addHooksString += 'utils.hookDispatcher = hookDispatcher;\n';

// errorlog
// capture
// replay
// no-op
// duplicate
// ...
addHooksString += 'addClientActions(setttings, utils, hooks, classDecl);\n';

addHooksString += '}';

export { addHooksString };
