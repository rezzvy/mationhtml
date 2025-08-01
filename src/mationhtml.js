class MationHTML {
  constructor() {
    /** @type {Array} - Array to hold all registered conversion rules */
    this.rules = [];
  }

  /** @private */
  #noRuleFallback = null;
  #ignoreSelectors = [];
  #placeholders = [];

  /**
   * Sets the fallback callback function for elements with no matching rules.
   * @param {function} callback - The callback function to be executed when no rule matches.
   * @throws {Error} Throws an error if the callback is not a function.
   */
  set noRuleFallback(callback) {
    if (typeof callback !== "function") {
      throw new Error("Given callback should be a function.");
    }
    this.#noRuleFallback = callback;
  }

  /**
   * Sets the tags to be ignored during conversion.
   * @param {Array<string>} selectors - An array of valid selectors (as strings) to be ignored.
   * @throws {Error} Throws an error if the input is not an array of strings.
   */
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

  /**
   * Registers one or more placeholder replacements to be applied after conversion.
   * Placeholders are replaced in the final converted output using string replacement.
   *
   * @param {Object|Array<Object>} rule - A placeholder rule or array of rules.
   * Each rule must be an object with the following properties:
   *   - {string} from - The placeholder string to search for.
   *   - {string} to - The replacement string to replace the placeholder.
   * @throws {Error} Throws an error if a rule is not an object or if 'from' or 'to' are not strings.
   */
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

  /**
   * Registers a new rule or multiple rules for conversion.
   * @param {Object|Array<Object>} rule - A rule or an array of rules to be registered.
   * @throws {Error} Throws an error if the rule is invalid.
   */
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

  /**
   * Converts an HTML string using the registered rules.
   * @param {string} html - The HTML string to be converted.
   * @param {boolean} [body=true] - Whether to convert only the <body> or the whole document.
   * @returns {string} - The converted HTML as a string.
   * @throws {Error} Throws an error if the input is not a string.
   */
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

  /**
   * Recursively converts a node and its children, applying rules and building the result.
   * @param {Node} element - The DOM element to be converted.
   * @returns {string} - The converted content as a string.
   */
  #convertNode(element, depth = 0) {
    let result = "";

    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (this.#ignoreSelectors.some((selector) => node.matches(selector))) {
          continue;
        }

        result += this.#convertElement(node, depth + 1);
      }
    }

    return result;
  }

  /**
   * Converts an individual element based on registered rules or uses the fallback.
   * @param {Element} node - The DOM element to be converted.
   * @returns {string} - The converted content as a string.
   */
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

  /**
   * Validates a rule to ensure it has the required properties.
   * @param {Object} rule - The rule to validate.
   * @throws {Error} Throws an error if the rule is invalid.
   */
  #validateRule(rule) {
    if (typeof rule !== "object" || !rule.selector || !(rule.to || rule.format)) {
      throw new Error('Invalid rule: Must have a "selector" and a "format" or "to".');
    }
  }
}
