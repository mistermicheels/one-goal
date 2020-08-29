const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const markdownTocDoneRight = require("markdown-it-toc-done-right");

module.exports = function (eleventyConfig) {
    eleventyConfig.addPassthroughCopy("css");
    eleventyConfig.addPassthroughCopy("img");

    const markdownLib = markdownIt({ html: true, typographer: true })
        .use(markdownItAnchor, { permalink: false })
        .use(markdownTocDoneRight, {
            placeholder: "TOC_PLACEHOLDER",
            listType: "ul",
            level: [1, 2],
        });

    eleventyConfig.setLibrary("md", markdownLib);
};
