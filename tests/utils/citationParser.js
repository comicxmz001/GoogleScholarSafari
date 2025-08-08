// Test-only citation parser that mimics the citation extraction in popup.js.
// It operates on raw HTML snippets returned by Google Scholar's citation dialog
// so that unit tests can verify citation and export links without a DOM.

function stripTags(str) {
    return str.replace(/<[^>]*>/g, '');
}

function parseCitationHtml(html) {
    const citations = [];
    const citationTableMatch = html.match(/<table id="gs_citt">([\s\S]*?)<\/table>/i);
    if (citationTableMatch) {
        const rowsHtml = citationTableMatch[1];
        const rowRegex = /<tr>\s*<th[^>]*>(.*?)<\/th>\s*<td[^>]*>(.*?)<\/td>\s*<\/tr>/gi;
        let rowMatch;
        while ((rowMatch = rowRegex.exec(rowsHtml)) !== null) {
            const style = stripTags(rowMatch[1]).trim();
            const text = stripTags(rowMatch[2]).trim();
            if (style && text) {
                citations.push({ style, text });
            }
        }
    }

    const exports = [];
    const exportDivMatch = html.match(/<div id="gs_citi">([\s\S]*?)<\/div>/i);
    if (exportDivMatch) {
        const linksHtml = exportDivMatch[1];
        const linkRegex = /<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
        let linkMatch;
        while ((linkMatch = linkRegex.exec(linksHtml)) !== null) {
            const url = linkMatch[1];
            const format = stripTags(linkMatch[2]).trim();
            if (format) {
                exports.push({ format, url });
            }
        }
    }

    return { citations, exports };
}

module.exports = { parseCitationHtml };
