class MationHTML {
  constructor() {
    this.rules = [];
  }

  #noRuleFallback = null;
  #ignoreSelectors = [];

  set noRuleFallback(callback) {
    if (typeof callback !== "function") {
      throw new Error("Given callback should be a function.");
    }
    this.#noRuleFallback = callback;
  }

  set ignoreSelectors(selectors) {
    if (!Array.isArray(selectors)) {
      throw new Error("Given tags should be an array of strings.");
    }

    for (const item of selectors) {
      if (typeof item !== "string") {
        throw new Error("Each selector should be a string.");
      }

      if (!this.#ignoreSelectors.includes(item)) {
        this.#ignoreSelectors.push(item);
      }
    }
  }

  register(rule) {
    if (Array.isArray(rule)) {
      for (const item of rule) {
        this.#validateRule(item);
      }
      this.rules.push(...rule);
    } else {
      this.#validateRule(rule);
      this.rules.push(rule);
    }
  }

  convert(html, body = true) {
    if (typeof html !== "string") {
      throw new Error("Input must be a string.");
    }

    const parser = new DOMParser();
    const htmlContent = parser.parseFromString(html, "text/html");

    if (body) {
      return this.#convertNode(htmlContent.body);
    }
    return this.#convertNode(htmlContent.documentElement);
  }

  #convertNode(element) {
    let result = "";

    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent.trim();
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (this.#ignoreSelectors.some((selector) => node.matches(selector))) {
          continue;
        }

        result += this.#convertElement(node).trim();
      }
    }

    return result.trim();
  }

  #convertElement(node) {
    const rule = this.rules.find((rule) => node.matches(rule.selector));

    let content = this.#convertNode(node);
    let dataset = {};

    for (const attr of node.attributes) {
      dataset[attr.name] = attr.value;
    }

    if (rule) {
      if (rule.format) {
        const ruleFormat = rule.format({ node, content, dataset });

        if (ruleFormat !== undefined) {
          return ruleFormat;
        }

        throw new Error(`The format handler for the selector "${rule.selector}" must return a content.`);
      }

      return rule.to
        .replace(/{dataset\.([\w-]+)}/g, (_, key) => dataset[key] || "")
        .replace(/{content}/g, content)
        .replace(/{spacing}/g, "");
    }

    if (this.#noRuleFallback && typeof this.#noRuleFallback === "function") {
      const noRuleFallback = this.#noRuleFallback({ node, content, dataset });

      if (noRuleFallback !== undefined) {
        return noRuleFallback;
      }

      throw new Error(`The noRuleFallback function must return a content`);
    }

    console.warn(`No rule found for element: <${node.tagName}>`);
    return content;
  }

  #validateRule(rule) {
    if (typeof rule !== "object" || !rule.selector || !(rule.to || rule.format)) {
      throw new Error('Invalid rule: Must have a "selector" and a "format" or "to".');
    }
  }
}
