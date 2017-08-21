/**
 * @file generate skeleton
 * @author panyuqi <panyuqi@baidu.com>
 */

/* eslint-disable no-console, fecs-no-require */

const ssr = require('./ssr');
const {insertAt, isObject} = require('./util');

const DEFAULT_PLUGIN_OPTIONS = {
    webpackConfig: {},
    insertAfter: '<div id="app">'
};

const DEFAULT_ENTRY_NAME = 'main';

class SkeletonPlugin {

    constructor(options = {}) {
        this.options = Object.assign({}, DEFAULT_PLUGIN_OPTIONS, options);
    }

    apply(compiler) {

        let {webpackConfig, insertAfter} = this.options;
        let entry = webpackConfig.entry;
        // cache entries
        let skeletonEntries;

        if (isObject(entry)) {
            skeletonEntries = Object.assign({}, entry);
        }
        else {
            let entryName = DEFAULT_ENTRY_NAME;
            let parentEntry = compiler.options.entry;

            if (isObject(parentEntry)) {
                entryName = Object.keys(parentEntry)[0];
            }
            skeletonEntries = {
                [entryName]: entry
            };
        }

        compiler.plugin('compilation', compilation => {

            // add listener for html-webpack-plugin
            compilation.plugin('html-webpack-plugin-before-html-processing', (htmlPluginData, callback) => {

                let usedChunks = Object.keys(htmlPluginData.assets.chunks);
                let entryKey;

                // find current processing entry
                if (Array.isArray(usedChunks)) {
                    entryKey = Object.keys(skeletonEntries).find(v => usedChunks.indexOf(v) > -1);
                }
                else {
                    entryKey = DEFAULT_ENTRY_NAME;
                }

                // set current entry & output in webpack config
                webpackConfig.entry = skeletonEntries[entryKey];
                webpackConfig.output.filename = `skeleton-${entryKey}.js`;

                ssr(webpackConfig).then(({skeletonHtml, skeletonCss}) => {
                    // insert inlined styles into html
                    let headTagEndPos = htmlPluginData.html.lastIndexOf('</head>');
                    htmlPluginData.html = insertAt(htmlPluginData.html, `<style>${skeletonCss}</style>`, headTagEndPos);

                    // replace mounted point with ssr result in html
                    let appPos = htmlPluginData.html.lastIndexOf(insertAfter) + insertAfter.length;
                    htmlPluginData.html = insertAt(htmlPluginData.html, skeletonHtml, appPos);
                    callback(null, htmlPluginData);
                });
            });
        });
    }

    static loader(ruleOptions = {}) {
        return Object.assign(ruleOptions, {
            loader: require.resolve('./loader'),
            options: Object.assign({}, ruleOptions.options)
        });
    }
}

module.exports = SkeletonPlugin;
