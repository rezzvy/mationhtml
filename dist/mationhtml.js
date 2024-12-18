class MationHTML {
  constructor() {
    this.rules = [];
  }

  #noRuleFallback = null;
  #ignoreTags = [];

  set noRuleFallback(callback) {
    if (typeof callback !== "function") {
      throw new Error("Given callback should be a function.");
    }
    this.#noRuleFallback = callback;
  }

  set ignoreTags(tags) {
    if (!Array.isArray(tags)) {
      throw new Error("Given tags should be an array of strings.");
    }

    for (const item of tags) {
      if (typeof item !== "string") {
        throw new Error("Each tag should be a string.");
      }

      const itemLowerCase = item.toLowerCase();
      if (!this.#ignoreTags.includes(itemLowerCase)) {
        this.#ignoreTags.push(itemLowerCase);
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
        result += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (this.#ignoreTags.includes(node.tagName.toLowerCase())) {
          continue;
        }
        result += this.#convertElement(node);
      }
    }

    return result;
  }

  #convertElement(node) {
    const tagName = node.tagName.toLowerCase();
    const rule = this.rules.find((rule) => rule.tag === tagName);

    let content = this.#convertNode(node);
    let dataset = {};

    for (const attr of node.attributes) {
      dataset[attr.name] = attr.value;
    }

    if (rule) {
      if (rule.format) {
        return rule.format({ node, content, dataset });
      }

      return rule.to
        .replace(/{dataset\.([\w-]+)}/g, (_, key) => dataset[key] || "")
        .replace(/{content}/g, content);
    }

    if (this.#noRuleFallback && typeof this.#noRuleFallback === "function") {
      return this.#noRuleFallback({ node, content, dataset });
    }

    console.warn(`No rule found for tag: <${tagName}>`);
    return content;
  }

  #validateRule(rule) {
    if (typeof rule !== "object" || !rule.tag || !(rule.to || rule.format)) {
      throw new Error(
        'Invalid rule: Must have a "tag" and a "format" or "to".'
      );
    }
  }
}
