const path = require('path');
//const webpack = require('webpack');
//https://github.com/webpack-contrib/mini-css-extract-plugin
//const ExtractTextPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
//const WebpackAutoInject = require('webpack-auto-inject-version');
//const WebextensionPlugin = require('webpack-webextension-plugin');
//const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

const fs = require('fs');
const dirs = [
    './webextension',
    './webextension/icons',
    './webextension/css',
    './webextension/css/inlet',
    './webextension/css/icons',
    './webextension/css/widget',
    './webextension/css/widget/tree',
    './webextension/css/codemirror',
    './webextension/css/codemirror/theme',
    './webextension/css/codemirror/addon'
];
for (let k = 0; k < dirs.length; k++) {
    const dir = dirs[k];

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

const cssloaders = [
    //{loader: 'to-string-loader' },
    {
        loader: 'style-loader',
        options: {
            transform: './webpackstyleexport.js',
            singleton: true
            //sourceMap: true
        }
    },
    {
        loader: 'css-loader',
        options: {
            // sourceMap: true
        }
    },
    { loader: 'svg-loader' }
];

const config = {
    mode: 'development',
    target: 'web',
    //devtool: 'eval-source-map',
    //devtool: 'cheap-module-eval-source-map',
    devtool: 'inline-cheap-module-source-map',
    context: path.resolve(__dirname, 'src'),
    entry: './main.js',
    output: {
        path: path.resolve(__dirname, 'webextension'),
        filename: './main_pack.js'
    },
    module: {
        rules: [
            {
                test: /\.css$/,

                use: cssloaders

                // use: [
                //   {
                //     loader: MiniCssExtractPlugin.loader,
                //     options: {
                //       // you can specify a publicPath here
                //       // by default it use publicPath in webpackOptions.output
                //       publicPath: '../'
                //     }
                //   },
                //   "css-loader"
                // ]
            },
            {
                test: /\.(png|jpg|gif)$/,
                use: ['file-loader']
            }
        ]
    },
    plugins: [
        // , new WebpackAutoInject({
        //     components: {
        //         SILENT: false,
        //         AutoIncreaseVersion: true
        //     },
        //     componentsOptions: {
        //         AutoIncreaseVersion: {
        //             runInWatchMode: true
        //         }
        //     }
        // })
        //new WebextensionPlugin({
        //    vendor: 'chrome'
        //})
        //, new webpack.optimize.OccurrenceOrderPlugin(true),
        // new MiniCssExtractPlugin({
        //     // Options similar to the same options in webpackOptions.output
        //     // both options are optional
        //     filename: "[name].css",
        //     chunkFilename: "[id].css"
        //   })
    ]
};

const bundles = [
    'background',
    'content_script',
    'content_hook',
    'devtools',
    'popup',
    'testShaderIframe',
    'shaderEditor'
];
const bundleObjs = [];
for (let i = 0; i < bundles.length; i++) {
    const bundleJSFileName = bundles[i] + '.js';

    let entryPointFile = bundleJSFileName;
    if (bundleJSFileName === 'shaderEditor.js' || bundleJSFileName === 'testShaderIframe.js') {
        entryPointFile = 'ShaderEditor/' + bundleJSFileName;
    }
    // @ts-ignore
    const bundle = Object.assign({}, config, {
        entry: './' + entryPointFile
    });

    // @ts-ignore
    bundle.output = Object.assign({}, config.output, {
        filename: './' + bundleJSFileName
    });
    // special case yes.
    if (bundleJSFileName === 'shaderEditor.js') {
        //bundle.plugins.push(new ExtractTextPlugin('./ShaderEditor/editor.css'));

        // TODO copy html files.
        bundle.plugins.push(
            new CopyWebpackPlugin(
                [
                    { from: './ShaderEditor/editor.css', to: '../webextension/css/' },
                    { from: './manifest.json', to: '../webextension/manifest.json' },
                    { from: './*.html', to: '../webextension/' },
                    {
                        from: './ShaderEditor/*.html',
                        to: '../webextension/',
                        flatten: true
                    },
                    {
                        from: './ShaderEditor/widget/split/grips/*',
                        to: '../webextension/css/grips/',
                        flatten: true
                    },
                    {
                        from: '../node_modules/codemirror/lib/codemirror.css',
                        to: '../webextension/css/codemirror/codemirror.css'
                    },
                    {
                        from: '../node_modules/codemirror/theme/*',
                        to: '../webextension/css/codemirror/theme/',
                        flatten: true
                    },
                    {
                        from: '../node_modules/codemirror/addon/*/*.css',
                        to: '../webextension/css/codemirror/addon/',
                        flatten: true
                    },
                    {
                        from: './ShaderEditor/codemirror/Inlet/*.css',
                        to: '../webextension/css/inlet/',
                        flatten: true
                    },
                    {
                        from: './ShaderEditor/widget/tree/*.css',
                        to: '../webextension/css/widget/tree/',
                        flatten: true
                    },
                    {
                        from: './ShaderEditor/icons/*',
                        to: '../webextension/css/icons/',
                        flatten: true
                    },
                    { from: '../icons/*', to: '../webextension/icons/' },
                    { from: '../docs/*', to: '../webextension/docs/' }
                ],
                {
                    debug: 'warning'
                }
            )
        );
    }
    bundleObjs.push(bundle);
}

module.exports = bundleObjs;
