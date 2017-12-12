<p align="center">
  <img width="100" src="icons/renderbugle_icon.svg">
</p>

## NOW:

-   uuid id context iframe
-   preprocess
-   upadte popup button: record + time change + stats (fps, frametime)
-   ctrl+f: Favors current file, open tabs and scrollbar current hightlight
-   debug outside main
-   replay / accumulate

*   shader usage per frame "highlighting" (strike/depreacate)
*   deleted createshader
*   icon for shader type (tabs)
*   tree fold/unfold
*   hlsl
*   Per Document cursor position save
*   Session save: cursor position, tab opened, tree fold state, search/tree pos
*   Session save: "reload draft" dialog
*   buton for fold/unfold tree/search

-   menu on variable: "add Slider" or use synthclipse

*   SET CURRENT VERSION PER SHADER: versionning shader changes
*   versionning settings versions.
*   versionning release (allow user to choose version of renderbugle.)
*   HLSL
*   webgl hooks plugins
*   shader editor register messaging
*   shader editor into its repo
*   shader editor with huge complex shader demo page, shadertoy like page
*   electron app : only solution for mobile an other browsers (vorlonjs websocket like)

## Bugs:

-   query already in use when use uses queries... (no op for queries?)
-   Uniforms Blocks on webgl2
-   mobile webrtc fallback strenghtens
-   iframe and multiple iframe
-   editwhen only one shader not "resused": http://learningwebgl.com/lessons/lesson16/index.html

## **Core Code**

-   graph value watcher: uniform, pixel from framebuffer at x,y
-   store framebuffer ID per program, glreadspixel of program framebuffer when user Picks
-   capture and zoom on pixel from framebuffers
    (zoom + under mouse value trick)
-   ‎opt out system (allow website that doesn't want to be edited to prevent user to view it.) ?

    -   frame timeline (prepass (special framebuff), pass color framebuffe, postproc (quad or single tri render))
    -   stop at frame number X
    -   stop at uniform value X

-   Async search using tokenized glsl from glespreprocessor (worker https://github.com/bvaughn/js-worker-search)
-   Color Search / Logs
-   Search Anywhere
-   "Anything" lower tab (important notif and code context info: errors, lint, perf compil, etc)

## _Plugins_ (webgl wrapper)

-   user plugins
-   gl state record (all frame, incremental (only store change from last frame)) with search, filter, diff visualizer:
    -   linear order of gl calls
    -   tree with where root nodes are:
        -   draw calls
        -   shader
        -   blend change
        -   framebuffer change
        -   etc.
-   ‎webgl capabilities emulator (change max texture unit etc, with profile like iOS, gpus, etc), include getcontext option
-   debug gl error (each webgl call followed with a glError, gl validate shaderprogram, validate framebuffers)
-   ‎all call speed (using gpu timer on each gl call)
-   ‎draw call speed (time only drawArray/drawElement)
-   "state diff" detect (stop when diff with "states record" loaded)
-   state record on particular call frame (listen allframe but record/stop on the one with 'pattern')
-   ‎webgl render replay/mirror (record all state, all resources, and be able to replay it without the user js app and/or mirror it no a separate computer (websocket...))
-   ‎real time framebuffer display as thumbnail/pip on user side main canvas (like debug deferred without user having to do it, with user able to select it (show shadowmap FB, show ssao FB, etc)
-   frame buffer zoom (hover pixel on canvas, and get a thumbnail of pixel around the mouse pos zoomed on top right as thumbnail/pip)
-   ‎lose webgl context with a button
-   resources switch with 'basic' resources ( switch all/one texture with 2x2 pixel image, and or with 2-triangle mesh, or/and a basic shader, or/and rtt size changer): allow for state change cost, and fragment/vertex fill rate limit detection. Allow for user provided ( images, mesh, etc) like say you debug a webgl blur shader, you can change the framebuffer input with a user texture
-   Render analysis ( graph that split states by framebuffer and show framebuffer dependency to final framebuffer ). Tag "state group" as preprocess/ post process / forward as blocks .(useful for plugins), pause/edit blocks (can start with user hooks with name like "ssao", "earlyz", etc).

## ShaderEditor:

-   " session reload": save shader selected, cursor position, shader view (vs collapsed or not),
-   force shader replace on load / shader edit history on reload
-   code snippets + "include" them in glsl: custom vizualizer (each engine its own), see shadertoy printf, noise as histogram, etc
-   code helpers in bottom line overlay: lint, man, etc
-   watcher for values (mostly uniforms but could be a pixel from framebuffer) (with visualiser: graph (float, vec2, vec3), matrix (view/proj) a la http://www.realtimerendering.com/blog/improved-graphics-transforms-demo/, matrix compute, etc.). graph time is frame number and each frame states are inspectable
-   watcher for framebuffers (depth (1/z), normal (\*2-0.5), etc.) and same visualiser for "code breakpoint" (normal, depth, 1/x, etc) when click on value, defaulting on using regexp (normal|nrm|norm)
-   ‎show hlsl (on windows using shader_debug extension)
-   ‎webasm glsl reference compiler (allow to catch bad/non standard shader code) https://github.com/AlexAltea/glslang.js
-   ‎precision changer by all shader or by variable (varying too)
-   code block comment/uncomment
-   ‎real time define switch (def/undef) and shader debug/ release switch (the #pragma Problem)
-   ‎perf hint (madd, "uniform flow block" coloring, texture fetch line color, unused uniform in red)
-   glsl webgl & webgl "quickcard" hotkey display

## In consideration

-   migrate from codemirror to monaco (once monaco has proper touch support and real easy build)

Ref
----:
Snippets
https://github.com/silexlabs/unifile
https://github.com/jjNford/chrome-ex-oauth2
https://github.com/netresearch/assetpicker
uppy for upload ?

watch
http://smoothiecharts.org/builder/

token regex
https://nickdrane.com/build-your-own-regex/

shadertoy:
https://www.shadertoy.com/api
https://github.com/patuwwy/ShaderToy-Chrome-Plugin
https://github.com/mattdesl/shadertoy-export
https://github.com/halvves/shaderpen

Functionnalities on GLSL / export / shader toy
http://synthclipse.sourceforge.net/user_guide/shadertoy.html

https://github.com/evanw/webgl-recorder
// shadertoy api
https://www.shadertoy.com/api
https://www.shadertoy.com/api/v1/shaders?key=NtHtww

Bookmarks
https://fontawesome.com/icons?d=gallery
https://stackoverflow.com/questions/12272372/how-to-style-icon-color-size-and-shadow-of-font-awesome-icons
http://unixpapa.com/js/testkey.html
https://kripken.github.io/emscripten-site/docs/compiling/Building-Projects.html#building-projects
https://codemirror.net/doc/manual.html#api
https://github.com/vuejs/vue-devtools/blob/master/shells/electron/app.js
