// Prepares pasted HTML for conversion: drops what never becomes Markdown,
// and turns what Google Docs and Word express with styles into the
// elements Markdown has (bold spans → <strong>, Word's list paragraphs →
// real lists).

const DROP = "script, style, meta, link, title, head, noscript, template, iframe, object";

function unwrap(element: Element) {
  element.replaceWith(...Array.from(element.childNodes));
}

function wrap(element: Element, tag: string) {
  const wrapper = element.ownerDocument.createElement(tag);
  wrapper.append(...Array.from(element.childNodes));
  element.append(wrapper);
}

function removeComments(root: Element) {
  const walker = root.ownerDocument.createTreeWalker(root, 128 /* NodeFilter.SHOW_COMMENT */);
  const comments: Node[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) comments.push(node);
  comments.forEach((comment) => comment.parentNode?.removeChild(comment));
}

// Styled spans (Google Docs, many web editors) to semantic elements; not
// inside headings or header cells, which are bold already.
function styledSpansToElements(root: Element) {
  for (const span of Array.from(root.querySelectorAll<HTMLElement>("span[style]"))) {
    if (span.closest("h1, h2, h3, h4, h5, h6, th, pre, code")) continue;
    if (!span.textContent?.trim()) continue;
    const style = span.style;
    const weight = style.fontWeight;
    if (weight === "bold" || weight === "bolder" || Number(weight) >= 600) wrap(span, "strong");
    if (style.fontStyle === "italic") wrap(span, "em");
    if (/line-through/.test(span.getAttribute("style") ?? "")) wrap(span, "del");
  }
}

// Word's lists are paragraphs styled `mso-list: l0 level2 lfo1`, each led
// by a span (mso-list: Ignore) holding the bullet or number. Consecutive
// ones become nested <ul>/<ol>.
function wordListsToLists(root: Element) {
  const doc = root.ownerDocument;
  const paragraphs = Array.from(root.querySelectorAll<HTMLElement>("p")).filter((p) =>
    /mso-list:\s*l\d+\s+level\d+/i.test(p.getAttribute("style") ?? ""),
  );
  let stack: { level: number; list: HTMLElement }[] = [];
  let previous: Element | null = null;
  for (const p of paragraphs) {
    const level = Number(/level(\d+)/i.exec(p.getAttribute("style") ?? "")?.[1] ?? 1);
    const marker = Array.from(p.querySelectorAll("span")).find((span) =>
      /mso-list:\s*ignore/i.test(span.getAttribute("style") ?? ""),
    );
    const ordered = /^\s*(\d+|[a-z]|[ivxlc]+)[.)]/i.test(marker?.textContent ?? "");
    marker?.remove();
    // A list run ends when another element sits between its paragraphs.
    if (previous && p.previousElementSibling !== previous) stack = [];
    while (stack.length && stack[stack.length - 1].level > level) stack.pop();
    if (!stack.length || stack[stack.length - 1].level < level) {
      const list = doc.createElement(ordered ? "ol" : "ul");
      const parentItem = stack[stack.length - 1]?.list.lastElementChild;
      if (parentItem) parentItem.append(list);
      else p.before(list);
      stack.push({ level, list });
    }
    const item = doc.createElement("li");
    item.append(...Array.from(p.childNodes));
    stack[stack.length - 1].list.append(item);
    // Keep the paragraph as an empty placeholder until the run ends, so the
    // next paragraph's sibling check still works.
    p.replaceChildren();
    p.setAttribute("data-list-placeholder", "");
    previous = p;
  }
  root.querySelectorAll("[data-list-placeholder]").forEach((p) => p.remove());
}

export function tidyPastedHtml(root: Element) {
  root.querySelectorAll(DROP).forEach((element) => element.remove());
  removeComments(root);
  // Office's namespaced tags (<o:p>, <w:…>).
  for (const element of Array.from(root.querySelectorAll("*"))) {
    if (element.tagName.includes(":")) element.remove();
  }
  // Google Docs wraps the whole paste in <b style="font-weight:normal">.
  root.querySelectorAll('b[id^="docs-internal-guid"]').forEach(unwrap);
  wordListsToLists(root);
  styledSpansToElements(root);
}
