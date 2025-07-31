class MationHTML {
  constructor() {
    this.rules = [];
  }

  #noRuleFallback = null;
  #ignoreSelectors = [];
  #placeholders = [];

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

  registerPlaceholder(rule) {
    const rules = Array.isArray(rule) ? rule : [rule];

    for (const item of rules) {
      if (!item || typeof item !== "object" || typeof item.from !== "string" || typeof item.to !== "string") {
        throw new Error("Each placeholder must be an object with 'from' and 'to' as strings.");
      }

      this.#placeholders.push({
        from: item.from,
        to: item.to,
      });
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

    const target = body ? htmlContent.body : htmlContent.documentElement;
    let result = this.#convertNode(target);

    for (const item of this.#placeholders) {
      result = result.replaceAll(item.from, item.to);
    }

    return result;
  }

  #convertNode(element, depth = 0) {
    let result = "";

    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent.trim();
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (this.#ignoreSelectors.some((selector) => node.matches(selector))) {
          continue;
        }

        result += this.#convertElement(node, depth + 1).trim();
      }
    }

    return result.trim();
  }

  #convertElement(node, depth) {
    const matchingRules = this.rules.filter((rule) => node.matches(rule.selector));
    let content = this.#convertNode(node, depth);
    let dataset = {};

    for (const attr of node.attributes) {
      dataset[attr.name] = attr.value;
    }

    if (matchingRules.length > 0) {
      let tempContent = content;

      for (const rule of matchingRules) {
        if (rule.format) {
          const ruleFormat = rule.format({ node, content: tempContent, dataset, depth });

          if (ruleFormat !== undefined) {
            tempContent = ruleFormat;
          } else {
            throw new Error(`The format handler for the selector "${rule.selector}" must return content.`);
          }
        } else {
          tempContent = rule.to
            .replace(/{dataset\.([\w-]+)}/g, (_, key) => dataset[key] || "")
            .replace(/{content}/g, tempContent)
            .replace(/{spacing}/g, "");
        }
      }

      return tempContent;
    }

    if (this.#noRuleFallback && typeof this.#noRuleFallback === "function") {
      const noRuleFallback = this.#noRuleFallback({ node, content, dataset, depth });

      if (noRuleFallback !== undefined) {
        return noRuleFallback;
      }

      throw new Error(`The noRuleFallback function must return content`);
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
