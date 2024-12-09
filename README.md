# MationHTML

## Overview

JavaScript library for converting HTML to custom formats.

- You have the flexibility to decide how the conversion should behave.
- There is a fallback for HTML tags with no rules and the option for tag exclusions.
- and more to explore

## How it Works

This library takes an HTML string, parses it, and recursively applies conversion rules to each element.

## Installation and Usage

1. Include the source file in your project, either manually or by using our CDN:

```html
<script src="https://cdn.jsdelivr.net/gh/rezzvy/mationhtml@latest/dist/mationhtml.min.js"></script>
```

2. Create an instance and register a rule:

```javascript
// Create an instance
const mationHTML = new MationHTML();

// Register a rule
mationHTML.register([
  {
    tag: "b",
    to: "**{content}**",
  },
]);
```

3. Start the conversion:

```javascript
mationHTML.convert("<b>Hello World</b>");

// Expected output: **Hello World**
```

## Documentation

### Available Methods

| Name         | Description                                                         | Parameters                                                                                                                                                                          |
| ------------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `register()` | Registers a new rule or multiple rules for conversion.              | `rule: Object `<br>` Array<Object>` — A single rule object or an array of rule objects. Each rule must have a `tag` property and either a `to` or `format` property.                |
| `convert()`  | Takes an HTML string and converts it based on the registered rules. | `html: string` The HTML string to be converted. <br> `body: boolean` (optional) — Whether to convert only the `<body>` content (`true` by default) or the whole document (`false`). |

### Available Properties

| Name             | Description                                                                                                        | Type            | Value Explanation                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `noRuleFallback` | A function to be executed when no matching rule is found for a tag. If defined, it overrides the default behavior. | `function`      | - Should return a string to replace content when no rules match. <br> - Example: `(api) => api.content.toUpperCase();` |
| `ignoreTags`     | An array of tag names that should be ignored during conversion.                                                    | `Array<string>` | - Specifies tags to skip during conversion. <br> - Example: `["i", "u"]` ignores `<i>` and `<u>` tags entirely.        |

### Rule Object

The `register()` method accepts rule objects with the following structure:

| Property            | Value                                                                                                                                                                                                                                      | Example                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| `tag`               | The HTML tag to match in the input string.                                                                                                                                                                                                 | `"b"`                                |
| `to`                | The string format to convert the entire tag into. Use `{content}` to reference the content inside the tag. To access an attribute, use `{dataset.attributeName}` (replace `attributeName` with the actual attribute name).                 | `"[a='{dataset.src}']{content}[/a]"` |
| `format` _optional_ | A function that receives an object with `content` (text inside the tag), `dataset` (attributes of the tag), and `node` (the node itself). This function should return the formatted string and will override the `to` property if defined. | `(api) => [b]${api.content}[/b]`    |

## Default Behaviour

- If you define `format` property in your rule, the `to` property will be ignored, and the conversion will be fully determined by the function provided in the `format` property.

- If no rules are defined for an element, the default behavior is to extract the text content and remove the tags. You can customize this by setting your own fallback. See the documentation section for details.

## Contributing

There's always room for improvement. Feel free to contribute!

## Licensing

The library is licensed under MIT License. Check the license file for more details.
