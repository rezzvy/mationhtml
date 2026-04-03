class MationHTML {
    static DOMParser = null;
    static Node = null;

    constructor() {
        this.rules = [];
    }

    #fallbackHandler = null;
    #ignoredSelectors = [];
    #stringReplacements = [];

    set fallbackHandler(callback) {
        if (typeof callback !== "function") {
            throw new Error("Fallback handler must be a function.");
        }
        this.#fallbackHandler = callback;
    }

    addIgnoredSelectors(selectors) {
        if (!Array.isArray(selectors)) {
            throw new Error("Selectors must be an array of strings.");
        }

        for (const selector of selectors) {
            if (typeof selector !== "string") {
                throw new Error("Selector must be a string.");
            }

            if (!this.#ignoredSelectors.includes(selector)) {
                this.#ignoredSelectors.push(selector);
            }
        }
    }

    addStringReplacements(replacements) {
        const items = Array.isArray(replacements) ? replacements : [replacements];

        for (const item of items) {
            if (!item?.from || !item?.to) {
                throw new Error("Invalid replacement object. Must contain 'from' and 'to'.");
            }
            this.#stringReplacements.push({ from: item.from, to: item.to });
        }
    }

    addRule(rule) {
        const rules = Array.isArray(rule) ? rule : [rule];

        for (const r of rules) {
            this.#validateRule(r);
            this.rules.push(r);
        }
    }

    convert(htmlString, normalizeWhitespace = true) {
        if (typeof htmlString !== "string") {
            throw new Error("Input must be a string.");
        }

        if (!MationHTML.DOMParser) {
            throw new Error("DOMParser is not initialized. Check your entry point.");
        }

        const parser = new MationHTML.DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");
        const target = doc.body;

        let result = this.#processNode(target, 0, normalizeWhitespace);

        for (const replacement of this.#stringReplacements) {
            result = result.replaceAll(replacement.from, replacement.to);
        }

        return result.trim()
    }

    #processNode(node, depth = 0, normalizeWhitespace = true) {
        if (node.nodeType === MationHTML.Node.TEXT_NODE) {
            if (node.parentElement?.tagName === "PRE") {
                return node.textContent;
            }

            return normalizeWhitespace ? node.textContent.replace(/\s+/g, " ") : node.textContent;
        }

        if (node.nodeType === MationHTML.Node.ELEMENT_NODE) {
            if (this.#ignoredSelectors.some((sel) => node.matches(sel))) {
                return "";
            }

            return this.#processElement(node, depth, normalizeWhitespace);
        }

        return "";
    }

    #processChildren(element, depth, normalizeWhitespace) {
        let result = "";

        for (const childNode of Array.from(element.childNodes)) {
            result += this.#processNode(childNode, depth + 1, normalizeWhitespace);
        }
        return result;
    }

    #processElement(node, depth, normalizeWhitespace) {
        const matchingRules = this.rules.filter((rule) =>
            node.matches(rule.selector)
        );

        const attributes = Array.from(node.attributes).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
        }, {});

        const applyRules = (targetNode) => {
            if (!targetNode) throw new Error("applyRules requires a targetNode.");
            if (targetNode === node) throw new Error("applyRules cannot be called with the current node.");

            return this.#processNode(targetNode, depth, normalizeWhitespace);
        };

        const getChildrenContent = () =>
            this.#processChildren(node, depth, normalizeWhitespace);

        const createApi = (contentResolver) => ({
            node,
            attributes,
            depth,
            applyRules,
            get content() { return contentResolver(); },
        });

        if (matchingRules.length > 0) {
            let currentResult = null;

            for (const rule of matchingRules) {
                const contentStr = currentResult !== null ? currentResult : getChildrenContent();

                if (typeof rule.render === "function") {
                    const api = createApi(() => contentStr);
                    const renderedContent = rule.render(api);

                    if (renderedContent === undefined) {
                        throw new Error(`Rule for "${rule.selector}" returned undefined.`);
                    }

                    currentResult = renderedContent;
                } else if (typeof rule.render === "string") {
                    currentResult = rule.render
                        .replace(/{attributes\.([\w-]+)}/g, (_, key) => attributes[key] || "")
                        .replace(/{content}/g, contentStr)
                        .replace(/{null}/g, "");
                }
            }

            return currentResult;
        }

        if (this.#fallbackHandler) {
            const fallbackApi = createApi(getChildrenContent);
            const res = this.#fallbackHandler(fallbackApi);

            if (res !== undefined) return res;

            throw new Error("Fallback handler must return content.");
        }

        return getChildrenContent();
    }

    #validateRule(rule) {
        if (typeof rule !== "object" || !rule.selector || !rule.render) {
            throw new Error("Invalid rule structure. Requires 'selector' and 'render'.");
        }

        if (typeof rule.render !== "string" && typeof rule.render !== "function") {
            throw new Error(`Rule for "${rule.selector}" is invalid. 'render' must be a string or a function.`);
        }
    }
}

module.exports = MationHTML;