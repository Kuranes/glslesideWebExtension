import { log } from './domBind.js';

function clearLogs() {
    log.addEventListener('click', function(e) {
        this.innerHTML = '';
        e.preventDefault();
    });
}

// TODO:
// only append if visible, otw just queue
// Levels: debug, warning, message
// etc
function logMsg() {
    const args = [];
    for (let k = 0; k < arguments.length; k++) {
        args.push(arguments[k]);
    }
    const p = document.createElement('p');
    p.textContent = args.join(' ');
    log.appendChild(p);
}

export { clearLogs, logMsg };
