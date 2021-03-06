const preProcessShader = (function() {
    'use strict';

    //
    // TODO: One Regex run per line
    // or once per file ?
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Use_an_inline_function_with_a_regular_expression_to_avoid_for_loops
    //

    // Regex once and for all
    // to avoid multiple compilation
    // of the same regex

    // multiple Conditions: defined(_MYDEF) && 5 == MY_DEF && !defined(_ALL_DEF_H)
    const exprReg = /((!defined|defined)\s?\({1}\s?(\w+)\s?\){1})|((!=)|(==)|(&&)|(\|\|))|(\w+)+/gi;
    //var ifReg = /#if defined(.+)/gi;
    //var elifReg = /#elif defined(.+)/gi;

    // change of context
    const defineReg = /#define\s(\w+)$|#define\s(\w+)\s(\S+)|#define\s(\w+)\(\w+\)(.+)/i;
    const undefReg = /#undef (.+)/i;

    // clean ears;
    const ccComent = /\/\/(.+)/i;
    //
    const extensionReg = /#extension\s(\w+)\s:\s(\w+)/i;

    // regex to extract error message and line from webgl compiler reporting
    // one condition
    const ifdefReg = /#ifdef\s(.+)/i;
    const elseReg = /#else/i;
    const endifReg = /#endif/i;
    const ifndefReg = /#ifndef\s(.+)/i;

    const sortByLength = function(a, b) {
        // ASC  -> a.length - b.length
        // DESC -> b.length - a.length
        return b.length - a.length;
    };

    //  defined (_FLOATTEX) && defined(_PCF)
    //  defined(_NONE) ||  defined(_PCF)
    //  _NONE === 'aha'
    // doesn't order of operation nor parhentisis
    // need a real expr evaluatro
    // a parser on its own... https://github.com/silentmatt/js-expression-eval/
    const evalExpr = function(regex, variables, variablesValues, line) {
        let operator = '&&';
        let test = '==';
        let result = true;

        let exprGroup, indexOfDefine, indexOfDefineNewVar;
        let lastVar, newVar;
        let testVar;
        while ((exprGroup = regex.exec(line)) !== null) {
            if (exprGroup.length > 2) {
                if (exprGroup[9] !== undefined) {
                    if (!lastVar) {
                        lastVar = exprGroup[0].trim();
                    } else {
                        indexOfDefine = variables.indexOf(lastVar);
                        newVar = exprGroup[0].trim();
                        indexOfDefineNewVar = variables.indexOf(newVar);

                        // either it's a previously defined VAR or a math expression
                        if (indexOfDefine !== -1) lastVar = variablesValues[lastVar];
                        if (indexOfDefineNewVar !== -1) newVar = variablesValues[newVar];

                        if (test === '==') testVar = lastVar === newVar;
                        else if (test === '!=') testVar = lastVar !== newVar;
                        else if (test === '<') testVar = lastVar < newVar;
                        else if (test === '>') testVar = lastVar > newVar;
                        else if (test === '<=') testVar = lastVar <= newVar;
                        else if (test === '>=') testVar = lastVar >= newVar;

                        test = lastVar = newVar = undefined;

                        if (operator === '&&') result = result && testVar;
                        else result = result || testVar;
                    }
                } else if (exprGroup[4] !== undefined) {
                    if (exprGroup[8] !== undefined || exprGroup[7] !== undefined)
                        operator = exprGroup[0].trim();
                    else if (exprGroup[6] !== undefined || exprGroup[5] !== undefined)
                        test = exprGroup[0].trim();
                } else if (exprGroup[2] !== undefined && exprGroup[3] !== undefined) {
                    if (exprGroup[2].trim()[0] === '!') {
                        indexOfDefine = variables.indexOf(exprGroup[3]);

                        // !defined(dfsdf)
                        if (operator === '&&') result = result && indexOfDefine === -1;
                        else result = result || indexOfDefine === -1;
                    } else {
                        indexOfDefine = variables.indexOf(exprGroup[3]);

                        // defined(dfsdf)
                        if (operator === '&&') result = result && indexOfDefine !== -1;
                        else result = result || indexOfDefine !== -1;
                    }
                }
            }
        }
        return result;
    };

    const ignoredDefines = ['GL_FRAGMENT_PRECISION_HIGH', 'DEBUG'];

    // remove unProcessed Code.
    const preProcessor = function(source, doReplaceDefine, doPruneComment) {
        const inputsDefines = [];
        // GL_ES
        // __PREPROCESSOR_: allow special debug preprocessor operation
        // like string comparison (shader_name === )
        // add __VERSION_ __LINE_ ?
        inputsDefines.push('__PREPROCESSOR_', 'GL_ES');

        // what we'll do
        const pruneComment = doPruneComment !== undefined ? doPruneComment : true;
        const pruneDefines = true;
        const addNewLines = true;
        const replaceDefine = doReplaceDefine !== undefined ? doReplaceDefine : true;

        // code
        let strippedContent = '';

        // split sources in indexable per line array
        const lines = source.split('\n');
        const linesLength = lines.length;
        if (linesLength === 0) return source;

        // state var
        let foundIfDef, index, results;

        let droppingComment = false;
        let preProcessorCmd = false;
        // do we drop or include current code
        const droppingDefineStack = [false];
        // do we ignore as not preprocess that
        const ignoreDefineStack = [false];
        // did we already include code from this branching struct
        const didIncludeDefineStack = [false];
        // where are we in branching struct stack deepness
        let droppingDefineStackIndex = 0;

        const definesReplaceMap = {};
        let definesReplaceKeys;
        // get if one of the branch above is dropping code we're in
        const parentDroppingStack = [false];

        // prevent complex things when keeping comments
        let isComment = false;

        let definesKeysDirty = false;

        // Let'start, get A move on !
        for (let i = 0; i < linesLength; i++) {
            let line = lines[i].trim();
            if (line.length === 0) continue;

            isComment = droppingComment;

            if (droppingComment) {
                if (line.length >= 2 && line[0] === '/' && line[1] === '*') {
                    droppingComment = false;
                }

                if (pruneComment) continue;
            }

            if (line.length >= 2) {
                if (line[0] === '/' && line[1] === '/') {
                    if (pruneComment) continue;
                    isComment = true;
                }

                if (line[0] === '/' && line[1] === '*') {
                    droppingComment = true;
                    if (pruneComment) continue;
                    isComment = true;
                }
            }

            if (isComment) {
                strippedContent += lines[i] + '\n';
                continue;
            }

            const ignoreAndKeep = ignoreDefineStack[droppingDefineStackIndex];
            preProcessorCmd = line[0] === '#';
            if (pruneDefines) {
                if (preProcessorCmd) {
                    // remove comments
                    // elif defined(FSDF) //&& defined(NOSF)
                    results = line.search(ccComent);
                    if (results !== -1) {
                        line = line.substr(0, results).trim();
                    }

                    // important: if dropping,
                    // only semi-parse dropping string for out of current branch
                    // but semi-parse can only be done by "parsing completely"
                    // to get tthe correct else/elif/endif deepness...
                    // so do as normal, just prevent any code changing things
                    // (like undef/defines....)

                    if (ignoreAndKeep || !parentDroppingStack[droppingDefineStackIndex]) {
                        //////////
                        // #extensionReg
                        //https://www.opengl.org/wiki/Core_Language_(GLSL)#Extensions
                        results = line.match(extensionReg);
                        if (results !== null && results.length > 2) {
                            const extension = results[1].trim();
                            const activation = results[2].trim();

                            if (inputsDefines.indexOf(extension) === -1) {
                                switch (activation) {
                                    case 'enable':
                                    case 'require':
                                    case 'warn':
                                        // TODO: handle neable using webglCAPS
                                        inputsDefines.push(extension);
                                        // keep it in source otw breaks shader
                                        // continue
                                        break;

                                    //case 'disable':
                                    default:
                                        //   warn,  disable ...
                                        continue;
                                }
                            }
                        }

                        results = line.match(defineReg);
                        if (results !== null && results.length > 1) {
                            let defineRes;
                            let defineVal;
                            if (results[1] !== undefined) {
                                //standard define
                                defineRes = results[1].trim();
                            } else if (results[2] !== undefined) {
                                defineRes = results[2].trim();
                                defineVal = results[3].trim();

                                definesReplaceMap[defineRes] = defineVal;
                                definesKeysDirty = true;
                            } else if (results[3] !== undefined) {
                                // it's a macro
                                // better we ignore it for now ?
                                defineRes = results[4].trim();
                                //defineVal = results[ 5 ].trim();
                            }
                            //replace( /\s+/g, ' ' ).split( ' ' )[ 1 ];
                            if (inputsDefines.indexOf(defineRes) === -1) {
                                inputsDefines.push(defineRes);
                            }

                            // keep them in source always
                            // macros/values etc
                            strippedContent += (pruneComment ? line : lines[i]) + '\n';
                            continue;
                        }

                        results = line.match(undefReg);
                        if (results !== null && results.length > 1) {
                            const defineToUndef = results[1].trim();
                            const indexOfDefine = inputsDefines.indexOf(defineToUndef);
                            if (indexOfDefine !== -1) {
                                inputsDefines.splice(index, 1);
                            }

                            if (definesReplaceMap[defineToUndef] !== undefined) {
                                definesReplaceMap[defineToUndef] = undefined;
                                definesKeysDirty = true;
                            }
                            // keep them in source always
                            // macros/values etc
                            strippedContent += (pruneComment ? line : lines[i]) + '\n';
                            continue;
                        }
                    }

                    //////////
                    // #else
                    results = line.search(elseReg);
                    if (results !== -1) {
                        // was keeping, it's early out
                        if (didIncludeDefineStack[droppingDefineStackIndex]) {
                            droppingDefineStack[droppingDefineStackIndex] = true;
                            parentDroppingStack[droppingDefineStackIndex] = true;
                            continue;
                        }

                        // no previous include
                        droppingDefineStack[droppingDefineStackIndex] = false;
                        // didIncludeDefineStack[ droppingDefineStackIndex ] no need we're going out next
                        parentDroppingStack[droppingDefineStackIndex] =
                            parentDroppingStack[droppingDefineStackIndex - 1];
                        if (ignoreAndKeep)
                            strippedContent += (pruneComment ? line : lines[i]) + '\n';
                        continue;
                    }

                    //////////
                    // #ifdef _EVSM
                    results = line.match(ifdefReg);
                    if (results !== null && results.length >= 2) {
                        foundIfDef = results[1];

                        const indexIgnore = ignoreAndKeep ? 0 : ignoredDefines.indexOf(foundIfDef);
                        //we don't want to erase/preprocess that
                        ignoreDefineStack.push(indexIgnore !== -1);

                        index = inputsDefines.indexOf(foundIfDef);
                        droppingDefineStackIndex++;
                        if (index !== -1) {
                            droppingDefineStack.push(false);
                            didIncludeDefineStack.push(true);
                            parentDroppingStack.push(
                                parentDroppingStack[droppingDefineStackIndex - 1]
                            );
                        } else {
                            droppingDefineStack.push(true);
                            didIncludeDefineStack.push(false);
                            parentDroppingStack.push(true);
                        }

                        if (ignoreDefineStack[droppingDefineStackIndex])
                            strippedContent += (pruneComment ? line : lines[i]) + '\n';
                        continue;
                    }

                    //////////
                    // #ifndef _dfd
                    results = line.match(ifndefReg);
                    if (results !== null && results.length >= 2) {
                        foundIfDef = results[1];
                        index = inputsDefines.indexOf(foundIfDef);

                        ignoreDefineStack.push(ignoreAndKeep);
                        droppingDefineStackIndex++;

                        if (index !== -1) {
                            droppingDefineStack.push(true);
                            didIncludeDefineStack.push(false);
                            parentDroppingStack.push(true);
                        } else {
                            droppingDefineStack.push(false);
                            didIncludeDefineStack.push(true);
                            parentDroppingStack.push(
                                parentDroppingStack[droppingDefineStackIndex - 1]
                            );
                        }
                        if (ignoreDefineStack[droppingDefineStackIndex])
                            strippedContent += (pruneComment ? line : lines[i]) + '\n';
                        continue;
                    }

                    //////////
                    // check for endif
                    results = line.search(endifReg);
                    if (results !== -1) {
                        ignoreDefineStack.pop();
                        droppingDefineStack.pop();
                        didIncludeDefineStack.pop();
                        parentDroppingStack.pop();
                        droppingDefineStackIndex--;

                        if (ignoreAndKeep)
                            strippedContent += (pruneComment ? line : lines[i]) + '\n';
                        continue; // remove endif
                    }

                    /// complexity arise: multiple condition possible
                    let result;

                    // check of elif
                    if (line.substr(1, 5) === 'elif') {
                        // was keeping before, it's a early out
                        if (didIncludeDefineStack[droppingDefineStackIndex]) {
                            droppingDefineStack[droppingDefineStackIndex] = true;
                            parentDroppingStack[droppingDefineStackIndex] = true;
                            continue;
                        }

                        result = evalExpr(
                            exprReg,
                            inputsDefines,
                            definesReplaceMap,
                            line.substr(4)
                        );
                        if (result) {
                            droppingDefineStack[droppingDefineStackIndex] = false;
                            didIncludeDefineStack[droppingDefineStackIndex] = true;
                            parentDroppingStack[droppingDefineStackIndex] =
                                parentDroppingStack[droppingDefineStackIndex - 1];
                        }

                        if (ignoreAndKeep)
                            strippedContent += (pruneComment ? line : lines[i]) + '\n';
                        continue;
                    }

                    if (line.substr(1, 2) === 'if') {
                        result = evalExpr(
                            exprReg,
                            inputsDefines,
                            definesReplaceMap,
                            line.substr(3)
                        );

                        droppingDefineStackIndex++;
                        ignoreDefineStack.push(ignoreAndKeep);
                        droppingDefineStack.push(!result);
                        didIncludeDefineStack.push(result);
                        if (!result) {
                            parentDroppingStack.push(true);
                        } else {
                            parentDroppingStack.push(
                                parentDroppingStack[droppingDefineStackIndex - 1]
                            );
                        }
                        if (ignoreDefineStack[droppingDefineStackIndex])
                            strippedContent += (pruneComment ? line : lines[i]) + '\n';
                        continue;
                    }
                } // #
            } //prunedef

            if (
                ignoreAndKeep ||
                (!droppingDefineStack[droppingDefineStackIndex] &&
                    !parentDroppingStack[droppingDefineStackIndex])
            ) {
                //we  "keep comment" means we keep syntax format
                let toAdd = pruneComment ? line : lines[i];

                if (replaceDefine && definesReplaceKeys) {
                    if (definesKeysDirty) {
                        definesReplaceKeys = window.Object.keys(definesReplaceMap);
                        definesReplaceKeys.sort(sortByLength);
                        definesKeysDirty = false;
                    }

                    for (
                        let defIdx = 0, lDefIdx = definesReplaceKeys.length;
                        defIdx < lDefIdx;
                        defIdx++
                    ) {
                        const key = definesReplaceKeys[defIdx];
                        //if ( toAdd.indexOf( key ) !== -1 ) {
                        toAdd = toAdd.replace(key, definesReplaceMap[key]);
                        //}
                    }
                }

                if (preProcessorCmd) strippedContent += '\n';
                strippedContent += toAdd;
                if (addNewLines || preProcessorCmd) strippedContent += '\n';
            }
        }

        return strippedContent;
    };

    return preProcessor;
})();

export default preProcessShader;
