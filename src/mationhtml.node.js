const { JSDOM } = require("jsdom");
const MationHTML = require("./core.js");

const dom = new JSDOM();

MationHTML.DOMParser = dom.window.DOMParser;
MationHTML.Node = dom.window.Node;

module.exports = MationHTML;