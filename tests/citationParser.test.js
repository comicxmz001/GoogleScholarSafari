const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { parseCitationHtml } = require('./utils/citationParser');

test('parses citation information and export formats', () => {
    const htmlPath = path.join(__dirname, 'fixtures', 'citation.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const { citations, exports } = parseCitationHtml(html);

    // Ensure citation styles parsed
    const apaCitation = citations.find(c => c.style === 'APA');
    assert.ok(apaCitation, 'APA citation should exist');
    assert.ok(
        apaCitation.text.includes('Future Agriculture Farm Management using Augmented Reality'),
        'APA citation should contain article title'
    );

    // Ensure export formats parsed
    const formats = exports.map(e => e.format);
    assert.ok(formats.includes('BibTeX'), 'BibTeX export should exist');
    assert.ok(formats.includes('EndNote'), 'EndNote export should exist');
});
