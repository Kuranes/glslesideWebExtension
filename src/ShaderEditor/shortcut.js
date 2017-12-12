import { EditContext } from './editContext.js';
import { searchBar, splitTreeEditor, splitLowerEditor } from './domBind.js';
import {
    cancelSearch,
    setRigidSearch,
    getSelectedResult,
    openSearchResult
} from './powerSearch.js';

function initShortcuts() {
    document.addEventListener(
        'keydown',
        function(e) {
            //if (e.keyCode === 17) isCtrl = true;
            const isCtrl = e.getModifierState('Control') || e.getModifierState('Meta');
            const isShift = e.getModifierState('Shift');
            if (isCtrl && !isShift) {
                switch (e.keyCode) {
                    case 66:
                        //run code for CTRL+B -- ie, leftpane
                        splitTreeEditor.toggle(0);
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        return false;

                    case 74:
                        //run code for CTRL+j -- ie, lowerpane
                        splitLowerEditor.toggle(1);
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        return false;

                    case 83:
                        //run code for CTRL+S -- ie, save ?
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        return false;

                    case 80:
                        // 80 CTRL+P
                        splitLowerEditor.toggle(1, true);
                        searchBar.focus();
                        setRigidSearch(false);
                        e.stopImmediatePropagation();
                        e.preventDefault();

                        return false;

                    case 70:
                        // 70 CTRL+F
                        splitLowerEditor.toggle(1, true);
                        searchBar.focus();
                        setRigidSearch(true);
                        e.stopImmediatePropagation();
                        e.preventDefault();
                        break;
                }
            } else {
                switch (e.keyCode) {
                    case 13:
                        // enter
                        // go to doceument selected, cancelsearch
                        if (document.activeElement !== searchBar) return false;

                        const results = document.querySelectorAll('.fileSearchResult');
                        if (results.length) {
                            const result = results[getSelectedResult()];
                            openSearchResult(result);
                        }
                        EditContext.shaderEditor.focus();
                        e.stopImmediatePropagation();
                        e.preventDefault();

                        cancelSearch();

                        break;
                    case 27:
                        // escape
                        cancelSearch();
                        break;
                }
            }
            return true;
        },
        true
    );
}
export { initShortcuts };
