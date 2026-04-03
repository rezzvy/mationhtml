# MationHTML

Transform HTML into absolutely any format imaginable.

## Overview

MationHTML lets you transform HTML into specific formats based on rules you define.

- Works in both the browser and Node.js.
- Define transformations using simple strings or logic-based functions.
- Gain full control over how specific elements are processed.
- Apply global string replacements for post-conversion cleanup.

## Installation & Usage

### Installation

#### Browser

Include the library via script tag:

```html
<script src="https://cdn.jsdelivr.net/gh/rezzvy/mationhtml@933d9de/dist/mationhtml.min.js"></script>
```

```javascript
const converter = new MationHTML();
```

#### Node

Install via npm:

```bash
npm install mationhtml
```

```javascript
const converter = require("mationhtml");
```

### Usage

```javascript
converter.addRule([
  {
    selector: "p",
    render: "[text]{content}[/text]",
  },
  {
    selector: "strong",
    render: "[b]{content}[/b]",
  },
  {
    selector: "a",
    render: "[url={attributes.href}]{content}[/url]",
  },
]);

const output = converter.convert(`<p><strong>Hello</strong> there! <a href="https://google.com">Click me!</a></p>`);
console.log(output);
// [text][b]Hello[/b] there! [url=https://google.com]Click me![/url][/text]
```

## Examples

### String Replacement

```javascript
const converter = new MationHTML();
converter.addStringReplacements({ from: "Hello!", to: "Bonjour!" });
converter.addRule({
  selector: "strong",
  render: "[b]{content}[/b]",
});

const output = converter.convert(`<strong>Hello!</strong>`);
console.log(output);
// [b]Bonjour![/b]
```

### Fallback Handler

```javascript
const converter = new MationHTML();
converter.fallbackHandler = ({ content, node }) => {
  return `[unknown tag=${node.tagName}]${content}[/unknown]`;
};

converter.addRule({
  selector: "body",
  render: "{content}",
});

const output = converter.convert(`<strong>Hello!</strong>`);
console.log(output);
// [unknown tag=STRONG]Hello![/unknown]
```

### Function-Based Render

```javascript
const converter = new MationHTML();

converter.addRule({
  selector: "img",
  render: ({ attributes }) => {
    return attributes.alt ? `Image: ${attributes.alt}` : `Source: ${attributes.src}`;
  },
});

const output = converter.convert(`<img src="sample.jpg" alt="Example">`);
console.log(output);
// Image: Example
```

### Hide Specific Selectors

```javascript
const converter = new MationHTML();
converter.addIgnoredSelectors(["strong"]);
converter.addRule({
  selector: "p",
  render: "{content}",
});

const output = converter.convert(`<p>Hello <strong>there!</strong></p>`);
console.log(output);
// Hello
```

## Documentation

### API Reference

#### `convert(htmlString, normalizeWhitespace)`

The primary method to transform your HTML string.

| Parameter             | Type      | Default    | Description                                             |
| :-------------------- | :-------- | :--------- | :------------------------------------------------------ |
| `htmlString`          | `string`  | _Required_ | The HTML content to transform.                          |
| `normalizeWhitespace` | `boolean` | `true`     | Collapses multiple spaces/newlines (except in `<pre>`). |

#### `addRule(rule)`

Adds one or more transformation rules.

| Parameter | Type           | Description                                               |
| :-------- | :------------- | --------------------------------------------------------- |
| `rule`    | `Object/Array` | A rule object `{ selector, render }` or an array of them. |

#### `fallbackHandler` (Setter)

Sets a global handler for elements that don't match any rules.

| Parameter  | Type       | Description                                                           |
| :--------- | :--------- | :-------------------------------------------------------------------- |
| `callback` | `function` | A function receiving the API object. Must return a string of content. |

#### `addIgnoredSelectors(selectors)`

Prevents specific elements and their children from being processed.

| Parameter   | Type       | Description                                          |
| :---------- | :--------- | :--------------------------------------------------- |
| `selectors` | `string[]` | Array of CSS selectors (e.g., `['script', '.ads']`). |

#### `addStringReplacements(replacements)`

Post-processing string swaps performed on the final result.

| Parameter      | Type           | Description                               |
| :------------- | :------------- | :---------------------------------------- |
| `replacements` | `Object/Array` | Object(s) with `{ from, to }` properties. |

### API

When `render` is a function or when using the `fallbackHandler`, you receive an object with these properties:

| Property           | Type              | Description                                          |
| :----------------- | :---------------- | :--------------------------------------------------- |
| `node`             | `Node`            | The current DOM node being processed.                |
| `attributes`       | `Object`          | A key-value map of the element's attributes.         |
| `depth`            | `number`          | The current nesting level.                           |
| `content`          | `string` (getter) | The processed string of all child nodes.             |
| `applyRules(node)` | `function`        | Manually trigger rule processing on a specific node. |

### Template Placeholders

Shortcuts for defining `render` strings:

| Placeholder      | Description                                | Example                |
| :--------------- | :----------------------------------------- | :--------------------- |
| `{content}`      | Inserts processed child text/tags.         | `[tag]{content}[/tag]` |
| `{attributes.x}` | Inserts the value of attribute `x`.        | `{attributes.href}`    |
| `{null}`         | Returns an empty string (removes the tag). | `render: "{null}"`     |

### Behavior

#### Top-Down Processing

By default, MationHTML processes from the parent down to the children. If a parent rule doesn't include the `{content}` placeholder, the children are simply ignored.

For example, these li elements won't show up because the ul rule returns a static string:

```javascript
converter.addRule([
  { selector: "ul", render: "List Placeholder" },
  { selector: "li", render: "[*] {content}" },
]);
```

If you want to build the parent structure manually without just dumping `{content}` in, you can process child nodes yourself using `applyRules()`

```javascript
const converter = new MationHTML();

converter.addRule([
  {
    selector: "ul",
    render: (api) => {
      let items = Array.from(api.node.children);
      let processedChildren = "";
      items.forEach((el) => {
        processedChildren += api.applyRules(el);
      });

      return `[list]${processedChildren}[/list]`;
    },
  },
  {
    selector: "li",
    render: "[*] {content}",
  },
]);
```

#### Cascading Rules

MationHTML supports cascading. If an element matches multiple rules, they are applied in the order they were added. The output of the first rule becomes the `{content}` for the subsequent rule.

```javascript
const converter = new MationHTML();

converter.addRule([
  {
    selector: ".text",
    render: "@{content}",
  },
  {
    selector: "p",
    render: "{content}@",
  },
]);

const output = converter.convert(`<p class="text">Hi!</p>`);
console.log(output);
// @Hi!@
```

#### Rules Must Return a Value

When defining a rule, the `render` property (whether it's a string or a function) cannot be `undefined` or an empty string (if it isn't a function-based).

```javascript
// This will throw an error!
converter.addRule({ selector: "p", render: "" });
```

If you intentionally want to output nothing for a specific rule, use the `{null}` placeholder in strings:

```javascript
converter.addRule({ selector: "p", render: "{null}" });
```

If you are using a function-based render, you can simply return an empty string:

```javascript
converter.addRule({ selector: "p", render: () => "" });
```

## Contributing

There's always room for improvement. Feel free to contribute!

## Licensing

The project is licensed under MIT License. Check the license file for more details.
