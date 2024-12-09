class MationHTML {
  constructor() {
    this.rules = [];
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

  convert(html) {
    if (typeof html !== "string") {
      throw new Error("Input must be a string.");
    }

    const parser = new DOMParser();
    const htmlContent = parser.parseFromString(html, "text/html").body;

    return this.#convertNode(htmlContent);
  }

  #convertNode(element) {
    let result = "";

    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
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
        .replace(/{dataset\.(\w+)}/g, (_, key) => dataset[key] || "")
        .replace(/{content}/g, content);
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