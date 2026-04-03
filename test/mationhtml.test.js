const test = require("node:test");
const assert = require("node:assert");
const MationHTML = require("../dist/mationhtml.node.js");

test("Passes the right values to the render function", async (t) => {
    const rule = [
        {
            selector: "a",
            render: ({ content, attributes, depth, node }) => {
                assert.strictEqual(content, "Link");
                assert.strictEqual(depth, 2);
                assert.strictEqual(attributes.href, "https://google.com");
                assert.ok(node instanceof MationHTML.Node);

                return "";
            }
        },
    ];

    const converter = new MationHTML();
    converter.addRule(rule);
    converter.convert("<div><a href='https://google.com'>Link</a></div>");
});

test("Can use applyRules inside the render function", async (t) => {
    const rule = [
        {
            selector: "p",
            render: ({ applyRules, node }) => {
                const firstNode = node.firstElementChild;
                const x = applyRules(firstNode);

                return `[text]${x}[/text]`;
            }
        },
        {
            selector: "strong",
            render: "[b]{content}[/b]"
        }
    ];

    const converter = new MationHTML();
    converter.addRule(rule);
    const x = converter.convert("<p><strong>Hello</strong></p>");

    assert.strictEqual(x, "[text][b]Hello[/b][/text]");
});

test("Handles the {content} placeholder", async (t) => {
    const rule = [
        {
            selector: ".bold",
            render: "**{content}**"
        },
        {
            selector: ".italic",
            render: "__{content}__"
        }
    ];

    const converter = new MationHTML();
    converter.addRule(rule);
    const x = converter.convert("<span class='bold'>Hello</span> <span class='italic'>there!</span>");

    assert.strictEqual(x, "**Hello** __there!__");
});

test("Handles the {attributes} placeholder", async (t) => {
    const rule = {
        selector: "a",
        render: "[{content}]({attributes.href})"
    };

    const converter = new MationHTML();
    converter.addRule(rule);
    const x = converter.convert("<a href='https://google.com'>Google</a>");

    assert.strictEqual(x, "[Google](https://google.com)");
});

test("Handles the {null} placeholder", async (t) => {
    const rule = {
        selector: "span",
        render: "{null}"
    };

    const converter = new MationHTML();
    converter.addRule(rule);
    const x = converter.convert("<span>Hello!</span>");

    assert.strictEqual(x, "");
});

test("Uses fallbackHandler if no rule matches", async (t) => {
    const converter = new MationHTML();
    converter.fallbackHandler = () => {
        return "HALO!";
    };

    const output = converter.convert('<strong>Hi</strong>');
    assert.strictEqual(output, "HALO!");
});

test("Applies string replacements correctly", async (t) => {
    const converter = new MationHTML();
    converter.addRule({
        selector: "p",
        render: "<span>{content}</span>"
    });

    converter.addStringReplacements([{
        from: "Bonjour!",
        to: "Halo!"
    }]);

    const output = converter.convert('<p>Bonjour!</p>');
    assert.strictEqual(output, "<span>Halo!</span>");
});

test("Skips elements that match ignored selectors", async (t) => {
    const converter = new MationHTML();
    converter.addRule({
        selector: "p",
        render: "<span>{content}</span>"
    });

    converter.addIgnoredSelectors(['.do-not-render']);
    const output = converter.convert('<p>Bonjour!<span class="do-not-render">madame!</span></p>');

    assert.strictEqual(output, "<span>Bonjour!</span>");
});

test("Throws error if fallbackHandler is not a function", async (t) => {
    const converter = new MationHTML();
    assert.throws(
        () => { converter.fallbackHandler = "not a function"; },
        /Fallback handler must be a function\./
    );
});

test("Throws error for invalid ignored selectors input", async (t) => {
    const converter = new MationHTML();

    assert.throws(
        () => { converter.addIgnoredSelectors("not an array"); },
        /Selectors must be an array of strings\./
    );

    assert.throws(
        () => { converter.addIgnoredSelectors([123]); },
        /Selector must be a string\./
    );
});

test("Throws error for invalid string replacements input", async (t) => {
    const converter = new MationHTML();

    assert.throws(
        () => { converter.addStringReplacements([{ from: "A" }]); },
        /Invalid replacement object\. Must contain 'from' and 'to'\./
    );
});

test("Throws error for invalid rule format", async (t) => {
    const converter = new MationHTML();

    assert.throws(
        () => { converter.addRule({ selector: "p" }); },
        /Invalid rule structure\. Requires 'selector' and 'render'\./
    );

    assert.throws(
        () => { converter.addRule({ selector: "p", render: 123 }); },
        /Rule for "p" is invalid\. 'render' must be a string or a function\./
    );
});

test("Throws error if input is not a string", async (t) => {
    const converter = new MationHTML();
    assert.throws(
        () => { converter.convert(12345); },
        /Input must be a string\./
    );
});

test("Throws error if DOMParser is not set", async (t) => {
    const originalParser = MationHTML.DOMParser;
    MationHTML.DOMParser = null;

    const converter = new MationHTML();
    assert.throws(
        () => { converter.convert("<div></div>"); },
        /DOMParser is not initialized\. Check your entry point\./
    );

    MationHTML.DOMParser = originalParser;
});

test("Throws error if applyRules is used wrong", async (t) => {
    const converter = new MationHTML();

    converter.addRule({
        selector: "div",
        render: ({ applyRules, node }) => {

            assert.throws(() => applyRules(), /applyRules requires a targetNode\./);
            assert.throws(() => applyRules(node), /applyRules cannot be called with the current node\./);

            return "";
        }
    });

    converter.convert("<div>Test</div>");
});

test("Throws error if render or fallbackHandler returns undefined", async (t) => {
    const converter = new MationHTML();

    converter.addRule({
        selector: "p",
        render: () => undefined
    });

    assert.throws(
        () => { converter.convert("<p>Test</p>"); },
        /Rule for "p" returned undefined\./
    );

    const converterFallback = new MationHTML();
    converterFallback.fallbackHandler = () => undefined;

    assert.throws(
        () => { converterFallback.convert("<div>Test</div>"); },
        /Fallback handler must return content\./
    );
});