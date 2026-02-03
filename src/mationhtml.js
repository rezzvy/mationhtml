class MationHTML {
  constructor() {
    this.rules = [];
  }

  #noRuleFallback = null;
  #ignoreSelectors = [];
  #placeholders = [];

  set noRuleFallback(callback) {
    if (typeof callback !== "function") throw new Error("Callback must be a function.");
    this.#noRuleFallback = callback;
  }

  set ignoreSelectors(selectors) {
    if (!Array.isArray(selectors)) throw new Error("Selectors must be an array of strings.");
    for (const item of selectors) {
      if (typeof item !== "string") throw new Error("Selector must be a string.");
      if (!this.#ignoreSelectors.includes(item)) this.#ignoreSelectors.push(item);
    }
  }

  registerPlaceholder(rule) {
    const rules = Array.isArray(rule) ? rule : [rule];
    for (const item of rules) {
      if (!item?.from || !item?.to) throw new Error("Invalid placeholder object.");
      this.#placeholders.push({ from: item.from, to: item.to });
    }
  }

  register(rule) {
    const rules = Array.isArray(rule) ? rule : [rule];
    rules.forEach((r) => {
      this.#validateRule(r);
      this.rules.push(r);
    });
  }

  convert(html, body = true, normalizeWhitespace = true) {
    if (typeof html !== "string") throw new Error("Input must be a string.");

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const target = body ? doc.body : doc.documentElement;
    let result = this.#processNode(target, 0, normalizeWhitespace);

    for (const item of this.#placeholders) {
      result = result.replaceAll(item.from, item.to);
    }

    return result.trim();
  }

  #processNode(node, depth = 0, normalizeWhitespace = true) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.parentElement?.tagName === "PRE") return node.textContent;

      if (normalizeWhitespace) {
        return node.textContent.replace(/\s+/g, " ");
      } else {
        return node.textContent;
      }
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      if (this.#ignoreSelectors.some((sel) => node.matches(sel))) return "";
      return this.#processElement(node, depth, normalizeWhitespace);
    }

    return "";
  }

  #processChildren(element, depth, normalizeWhitespace) {
    let result = "";
    const childrenSnapshot = Array.from(element.childNodes);

    for (const node of childrenSnapshot) {
      result += this.#processNode(node, depth + 1, normalizeWhitespace);
    }
    return result;
  }

  #processElement(node, depth, normalizeWhitespace) {
    const matchingRules = this.rules.filter((rule) => node.matches(rule.selector));

    const dataset = {};
    for (const attr of node.attributes) {
      dataset[attr.name] = attr.value;
    }

    const convertFunc = (targetNode) => this.#processNode(targetNode || node, depth, normalizeWhitespace);
    const processChildrenFunc = () => this.#processChildren(node, depth, normalizeWhitespace);

    if (matchingRules.length > 0) {
      let currentResult = null;

      for (const rule of matchingRules) {
        if (rule.format) {
          const api = {
            node,
            dataset,
            depth,
            convert: convertFunc,
            get content() {
              return currentResult !== null ? currentResult : processChildrenFunc();
            },
          };

          const formatted = rule.format(api);
          if (formatted === undefined) {
            throw new Error(`Rule for "${rule.selector}" returned undefined.`);
          }
          currentResult = formatted;
        } else if (rule.to) {
          const contentStr = currentResult !== null ? currentResult : processChildrenFunc();
          currentResult = rule.to
            .replace(/{dataset\.([\w-]+)}/g, (_, key) => dataset[key] || "")
            .replace(/{content}/g, contentStr)
            .replace(/{spacing}/g, "");
        }
      }
      return currentResult;
    }

    if (this.#noRuleFallback) {
      const fallbackApi = {
        node,
        dataset,
        depth,
        convert: convertFunc,
        get content() {
          return processChildrenFunc();
        },
      };

      const res = this.#noRuleFallback(fallbackApi);
      if (res !== undefined) return res;
      throw new Error("Fallback must return content.");
    }

    return processChildrenFunc();
  }

  #validateRule(rule) {
    if (typeof rule !== "object" || !rule.selector || !(rule.to || rule.format)) {
      throw new Error("Invalid rule structure.");
    }
  }
}
