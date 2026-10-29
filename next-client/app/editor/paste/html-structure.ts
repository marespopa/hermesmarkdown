// Elements that carry Markdown structure. HTML without any (a code editor's
// coloured <div>/<span> copy) isn't worth converting. Its own module, with no
// converter attached, so the editor can check a paste without loading turndown.
const STRUCTURE = /<(p|h[1-6]|ul|ol|li|table|a|strong|b|em|i|img|blockquote|pre|code|del|s)[\s>]/i;

export const hasMarkdownStructure = (html: string) => STRUCTURE.test(html);
