function addTimersHooks() {
    // on/off trigger:
    // - only on renderbugle visible ?

    //  defaultValue override ALL
    let overrideDuration = undefined;
    // always send frame events
    const rafEventEnabled = true;
    /////////////////////////////////
    /////////////////////////////////
    /////////////////////////////////

    // keep references
    // @ts-ignore
    const nativeSetTimeout = window.setTimeout;
    // @ts-ignore
    const nativeClearTimeout = window.clearTimeout;
    // @ts-ignore
    window.nativeSetTimeout = nativeSetTimeout;
    // @ts-ignore
    window.nativeClearTimeout = nativeClearTimeout;

    // @ts-ignore
    const nativeSetInterval = window.setInterval;
    // @ts-ignore
    const nativeClearInterval = window.clearInterval;
    // @ts-ignore
    window.nativeSetInterval = nativeSetInterval;
    // @ts-ignore
    window.nativeClearInterval = nativeClearInterval;

    const nativeRequestAnimationFrame = window.requestAnimationFrame;
    const nativeCancelAnimationFrame = window.cancelAnimationFrame;
    // @ts-ignore
    window.nativeRequestAnimationFrame = nativeRequestAnimationFrame;
    // @ts-ignore
    window.nativeCancelAnimationFrame = nativeCancelAnimationFrame;
    /////////////////////////////////

    // send one each frame:
    // allow fps count,
    // allow per frame counter resets,
    // etc
    const frameStartEvent = new CustomEvent('frameTickStart', {
        bubbles: true,
        detail: {
            time: 0,
            lastTime: 0,
            delta: 0,
            frameId: 0,
            startTime: 0
        }
    });
    const frameEndEvent = new CustomEvent('frameTickEnd', {
        bubbles: true,
        detail: {
            time: 0,
            lastTime: 0,
            delta: 0,
            frameId: 0,
            endTime: 0,
            frameTime: 0
        }
    });
    let frameId = 0;
    let frameListeningId;
    let lastTime = window.performance.now();
    let startFrameTime = 0;

    const frameTimeStartEvent = function(startTime) {
        const time = startTime;
        const d = frameStartEvent.detail;
        d.time = time;
        d.lastTime = lastTime;
        d.delta = time - lastTime;
        d.frameId = frameId;
        d.startTime = startTime;
        lastTime = time;
        startFrameTime = time;
        window.dispatchEvent(frameStartEvent);
    };

    const frameTimeEndEvent = function(endTime) {
        const time = endTime;
        const d = frameEndEvent.detail;
        d.time = time;
        d.lastTime = lastTime;
        d.delta = time - lastTime;
        d.frameId = frameId++;
        d.endTime = endTime;
        d.frameTime = endTime - startFrameTime;
        lastTime = time;
        window.dispatchEvent(frameEndEvent);
    };

    /*window.addEventListener('frameTickStart', function(e) {
        console.log(e.detail);
    });
    */
    /*
    window.addEventListener('frameTickEnd', function(e) {
        // @ts-ignore
        var d = e.detail;
        if (d.frameTime > 1) console.log(d.frameId + ': ' + d.frameTime);
    });*/
    //////////////////////////////
    //////////////////////////////
    //////////////////////////////
    // Todo: handles multiplier
    function hookedDuration(duration) {
        let maxDuration = duration;
        if (overrideDuration > duration) {
            maxDuration = overrideDuration;
        }
        return maxDuration;
    }

    //////////////
    // TIMEOUT
    //////////////
    const timeouts = [];

    const hookedClearTimeout = function(timeoutId, finished) {
        for (let n = 0; n < timeouts.length; n++) {
            if (timeouts[n].nativeId === timeoutId) {
                const timeout = timeouts[n];
                timeouts.splice(n, 1);
                if (finished) return;
                return nativeClearTimeout.apply(window, [timeout.currentId]);
            }
        }
        // failsafe in case of late hooking
        return nativeClearTimeout.apply(window, arguments);
    };

    const hookedSetTimeout = function(code, duration) {
        const maxDuration = hookedDuration(duration);
        // need to clear the timeout once done.
        //var timeoutId = nativeSetTimeout.apply(window, args);
        var timeoutId = nativeSetTimeout(function() {
            code();
            hookedClearTimeout(timeoutId, true);
        }, maxDuration);

        timeouts.push({
            nativeId: timeoutId,
            currentId: timeoutId,
            code: code,
            duration: duration
        });
        return timeoutId;
    };

    //////////////
    // INTERVAL
    //////////////
    const intervals = [];

    const hookedSetInterval = function(code, duration) {
        const maxDuration = hookedDuration(duration);
        const intervalId = nativeSetInterval.apply(window, maxDuration);
        intervals.push({
            nativeId: intervalId,
            currentId: intervalId,
            code: code,
            duration: duration
        });
        return intervalId;
    };

    const hookedClearInterval = function(intervalId) {
        for (let n = 0; n < intervals.length; n++) {
            if (intervals[n].nativeId === intervalId) {
                const interval = intervals[n];
                intervals.splice(n, 1);
                return nativeClearInterval.apply(window, [interval.currentId]);
            }
        }
        // failsafe in case of late hooking
        return nativeClearInterval.apply(window, arguments);
    };

    //////////////////7
    // REQUESTANIMATIONFRAME
    //////////////////////
    // rafs complexity arise
    let rafs = [];
    let rafsCurrentFrame = [];
    let requestIDRaf = 0;
    // @ts-ignore
    let nextRafIntervalId;
    const timestampArg = [0];
    //  requestAnimationFrame
    const wrappedRaf = function() {
        // @ts-ignore
        rafsCurrentFrame = rafs;
        if (frameListeningId) frameListeningId = undefined;
        // itsatrap: raf usally add next frame raf
        // so avoid endless loop...
        rafs = [];

        const timeStamp = window.performance.now();
        timestampArg[0] = timeStamp;
        frameTimeStartEvent(timeStamp);
        for (let n = 0; n < rafsCurrentFrame.length; n++) {
            rafsCurrentFrame[n].code.apply(window, timestampArg);
        }
        frameTimeEndEvent(window.performance.now());
        // TODO: replace with events
        if (window.requestAnimationframeFinished) window.requestAnimationframeFinished();
    };
    // remember it's called each frame anew
    // perhaps we could handle multiple frame sync ?
    const hookedRequestAnimationFrame = function(callback, id) {
        // we're overriding, which means we either pause
        // or change the rafs timers
        requestIDRaf = id ? id : requestIDRaf + 1;
        const raf = {
            nativeId: undefined,
            hookId: requestIDRaf,
            code: callback
        };
        rafs.push(raf);

        // paused
        if (overrideDuration === 1e9) {
            return requestIDRaf;
        }

        if (overrideDuration === undefined) {
            if (!frameListeningId) {
                // always wrap for start en end event
                frameListeningId = nativeRequestAnimationFrame(wrappedRaf);
            }
            return requestIDRaf;
        }

        // next frame already planned
        if (nextRafIntervalId) return requestIDRaf;
        if (overrideDuration !== 1e9) {
            nextRafIntervalId = nativeSetInterval(wrappedRaf, overrideDuration);
        }
        return requestIDRaf;
    };

    const hookedCancelAnimationFrame = function(requestID) {
        for (let n = 0; n < rafs.length; n++) {
            if (rafs[n].hookId === requestID) {
                const raf = rafs[n];
                rafs.splice(n, 1);
                if (rafs.length === 0 && nextRafIntervalId) nativeClearInterval(nextRafIntervalId);
                if (raf.nativeId) {
                    return nativeCancelAnimationFrame.apply(window, [raf.nativeId]);
                }
                return;
            }
        }
        if (rafs.length === 0 && nextRafIntervalId) nativeClearInterval(nextRafIntervalId);
        // failsafe in case of late hooking
        return nativeCancelAnimationFrame.apply(window, arguments);
    };

    ///////////////
    // the Resulting API Library
    //////////////
    // @ts-ignore
    window.setFPS = function(value) {
        overrideDuration = value;
        console.log('Duration: ' + overrideDuration);

        let maxDuration;

        // Reset all intervals
        let n;
        for (n = 0; n < intervals.length; n++) {
            const interval = intervals[n];
            nativeClearInterval(interval.currentId);
            maxDuration =
                overrideDuration === undefined
                    ? interval.duration
                    : hookedDuration(interval.duration);
            interval.currentId = nativeSetInterval(interval.wrappedCode, maxDuration);
        }

        // Reset all timeouts
        for (n = 0; n < timeouts.length; n++) {
            const timeout = timeouts[n];
            nativeClearTimeout(timeout.nativeId);
            maxDuration =
                overrideDuration === undefined
                    ? timeout.duration
                    : hookedDuration(timeout.duration);
            timeout.currentId = nativeSetTimeout(timeout.wrappedCode, maxDuration);
        }

        //  clear rafs timing
        //if (frameListeningId) nativeCancelAnimationFrame(frameListeningId);
        //frameListeningId = undefined;
        if (nextRafIntervalId) nativeClearInterval(nextRafIntervalId);
        nextRafIntervalId = undefined;

        // now reschedule
        rafsCurrentFrame = rafs;
        rafs = [];
        for (n = 0; n < rafsCurrentFrame.length; n++) {
            const raf = rafsCurrentFrame[n];
            hookedRequestAnimationFrame(raf.code, raf.id);
        }
    };

    // @ts-ignore
    window.togglePauseFPS = function() {
        // @ts-ignore
        window.setFPS(overrideDuration === undefined ? 1e9 : undefined);
    };

    // @ts-ignore
    window.toggleDebugFPS = function() {
        // @ts-ignore
        window.setFPS(overrideDuration === 250 ? undefined : 250);
    };

    /////////////////////////////////:
    // wrappers: wrap in case people keep references
    // and override wrapper on activations
    /////////////////////////////////
    function setTimeoutWrapper() {
        if (overrideDuration === undefined) {
            return nativeSetTimeout.apply(window, arguments);
        }
        hookedSetTimeout.apply(window, arguments);
    }
    function clearTimeoutWrapper() {
        if (overrideDuration === undefined) {
            return nativeClearTimeout.apply(window, arguments);
        }
        hookedClearTimeout.apply(window, arguments);
    }

    function setIntervalWrapper() {
        if (overrideDuration === undefined) {
            return nativeSetInterval.apply(window, arguments);
        }
        hookedSetInterval.apply(window, arguments);
    }
    function clearIntervalWrapper() {
        if (overrideDuration === undefined) {
            return nativeClearInterval.apply(window, arguments);
        }
        hookedClearInterval.apply(window, arguments);
    }

    function requestAnimationFrameWrapper() {
        if (!rafEventEnabled) {
            return nativeRequestAnimationFrame.apply(window, arguments);
        }
        hookedRequestAnimationFrame.apply(window, arguments);
    }

    function cancelAnimationFrameWrapper() {
        if (!rafEventEnabled) {
            return nativeCancelAnimationFrame.apply(window, arguments);
        }
        hookedCancelAnimationFrame.apply(window, arguments);
    }
    ////////
    ////////////////
    ////////////////////

    window.setTimeout = setTimeoutWrapper;
    window.clearTimeout = clearTimeoutWrapper;

    window.setInterval = setIntervalWrapper;
    window.clearInterval = clearIntervalWrapper;

    window.requestAnimationFrame = requestAnimationFrameWrapper;
    window.cancelAnimationFrame = cancelAnimationFrameWrapper;
    ////////////////
    //////////////
    ////////
}
export { addTimersHooks };
