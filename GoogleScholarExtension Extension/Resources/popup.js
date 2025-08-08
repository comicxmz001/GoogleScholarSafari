/**
 * Main extension functionality for Google Scholar search
 * Handles search operations, result display, and citation management
 */

document.addEventListener('DOMContentLoaded', async () => {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsDiv = document.getElementById('results');

    // Get current tab's title when popup opens
    const tab = await browser.tabs.query({ active: true, currentWindow: true });
    searchInput.value = tab[0].title;

    /**
     * Cleans text content by removing special characters and extra whitespace
     * @param {string} text - The text to clean
     * @returns {string} Cleaned text
     */
    function cleanText(text) {
        return text.replace(/\u00A0/g, ' ').replace(/\u0082/g, '').trim();
    }

    /**
     * Extracts the first number from a text string
     * Used for parsing citation and version counts
     * @param {string} text - Text containing a number
     * @returns {string|null} Extracted number or null if not found
     */
    function extractNumber(text) {
        const match = text.match(/\d+/);
        return match ? match[0] : null;
    }

    /**
     * Fetches and displays citation information in a modal dialog
     * @param {string} citationUrl - URL to fetch citations from
     */
    async function fetchCitations(citationUrl) {
        try {
            const response = await browser.runtime.sendMessage({
                action: 'fetchCitations',
                url: citationUrl
            });

            if (!response.success) throw new Error(response.error);

            const parser = new DOMParser();
            const doc = parser.parseFromString(response.html, 'text/html');
            
            // Remove any existing citation dialog
            const existingDialog = document.querySelector('.citation-dialog');
            if (existingDialog) {
                existingDialog.remove();
            }

            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'citation-overlay';
            
            // Create citation dialog
            const dialog = document.createElement('div');
            dialog.className = 'citation-dialog';
            
            // Add title
            const title = document.createElement('div');
            title.className = 'citation-title';
            title.textContent = 'Citation Formats';
            dialog.appendChild(title);
            
            // Add close button
            const closeButton = document.createElement('button');
            closeButton.className = 'close-button';
            closeButton.innerHTML = '×';
            dialog.appendChild(closeButton);

            // Create citation table
            const table = document.createElement('table');
            table.className = 'citation-table';

            // Try to find citation table in the response
            const citationTable = doc.querySelector('#gs_citt');
            if (citationTable) {
                const rows = citationTable.querySelectorAll('tr');
                rows.forEach(row => {
                    const tr = document.createElement('tr');
                    
                    // Style (MLA, APA, etc.)
                    const style = document.createElement('td');
                    style.className = 'citation-style';
                    style.textContent = row.querySelector('th')?.textContent || '';
                    tr.appendChild(style);
                    
                    // Citation text - now clickable
                    const text = document.createElement('td');
                    text.className = 'citation-text clickable';
                    const citationText = row.querySelector('td')?.textContent || '';
                    text.textContent = citationText;
                    text.onclick = () => {
                        navigator.clipboard.writeText(citationText);
                        
                        // Show temporary "Copied!" feedback
                        const originalText = text.textContent;
                        text.textContent = 'Copied!';
                        setTimeout(() => text.textContent = originalText, 1000);
                    };
                    
                    tr.appendChild(text);
                    table.appendChild(tr);
                });
                table.appendChild(document.createElement('tr'))
            } else {
                table.innerHTML = '<tr><td colspan="2">No citations available</td></tr>';
            }
                        
            // Added Exports @dkillough Jul 24 2025
            const citationExports = doc.querySelector('#gs_citi');
            
            if (citationExports) {
                // Export options (BibTex, EndNote, RefMan, RefWorks)
                const exportLinks = citationExports.querySelectorAll('a');
                const exportRow = document.createElement('tr');
                const exportCell = document.createElement('td');
                exportCell.colSpan = 2; // span both columns of prior rows
                
                exportLinks.forEach((link, index) => {
                    const exportOption = document.createElement('a');
                    exportOption.href = link.href;
                    exportOption.textContent = link.textContent;
                    if(exportOption.href) {
                        exportOption.className = 'clickable';  // since it's an anchor tag
                        exportOption.target = '_blank';
                    }
                    exportCell.appendChild(exportOption);
                    
                    // insert a tab so the links aren't bunched up next to each other & clear styling
                    if (index < exportLinks.length - 1) {
                        exportCell.appendChild(document.createTextNode('\t'));
                    }
                })
                exportRow.appendChild(exportCell);
                table.appendChild(exportRow);
            }
            // (End changes Jul 24 2025)
            
            dialog.appendChild(table);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            // Close handlers
            const closeDialog = () => {
                overlay.remove();
            };

            closeButton.onclick = closeDialog;
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    closeDialog();
                }
            };

        } catch (error) {
            console.error('Error fetching citations:', error);
            alert(`Error fetching citations: ${error.message}`);
        }
    }

    /**
     * Performs a Google Scholar search and displays results
     * @param {string} query - Search query
     */
    async function performSearch(query) {
        resultsDiv.innerHTML = '<div class="loading">Searching...</div>';
        
        try {
            const response = await browser.runtime.sendMessage({
                action: 'fetchScholar',
                query: query
            });

            if (!response.success) throw new Error(response.error);
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(response.html, 'text/html');
            const articles = doc.querySelectorAll('.gs_r');
            
            if (articles.length === 0) {
                resultsDiv.innerHTML = '<div class="result-item">No results found</div>';
                return;
            }

            resultsDiv.innerHTML = '';
            articles.forEach(article => {
                // Skip user profile results
                if (article.classList.contains('gs_or_svg')) {
                    return;
                }

                const titleElement = article.querySelector('.gs_rt a');
                const authorsElement = article.querySelector('.gs_a');
                const snippetElement = article.querySelector('.gs_rs');
                const linksElement = article.querySelector('.gs_fl');

                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                
                // Title
                if (titleElement) {
                    const title = document.createElement('a');
                    const href = titleElement.getAttribute('href');
                    title.href = href.startsWith('http') ? 
                        href : 
                        `https://scholar.google.com${href}`;
                    title.className = 'result-title';
                    title.textContent = cleanText(titleElement.textContent);
                    title.target = '_blank';
                    resultItem.appendChild(title);
                }

                // Authors and publication info
                if (authorsElement) {
                    const authors = document.createElement('div');
                    authors.className = 'result-authors';
                    authors.textContent = cleanText(authorsElement.textContent);
                    resultItem.appendChild(authors);
                }

                // Abstract/snippet
                if (snippetElement) {
                    const snippet = document.createElement('div');
                    snippet.className = 'result-snippet';
                    snippet.textContent = cleanText(snippetElement.textContent);
                    resultItem.appendChild(snippet);
                }

                // Additional links (cite, cited by, related articles, versions)
                if (linksElement) {
                    const links = document.createElement('div');
                    links.className = 'result-links';
                    
                    const linkElements = [];

                    // Updated Cite link selector and URL construction
                    const citeButton = article.querySelector('.gs_or_cit');
                    if (citeButton) {
                        const dataId = article.getAttribute('data-cid') || 
                                     article.querySelector('[id^="gs_cit"]')?.getAttribute('data-cid');
                        if (dataId) {
                            const cite = document.createElement('a');
                            cite.href = '#';
                            cite.textContent = 'Cite';
                            cite.onclick = (e) => {
                                e.preventDefault();
                                const citationUrl = `https://scholar.google.com/scholar?q=info:${dataId}:scholar.google.com/&output=cite&scirp=0&hl=en`;
                                fetchCitations(citationUrl);
                            };
                            linkElements.push(cite);
                        }
                    }

                    // Cited by
                    const citedByLink = article.querySelector('a[href*="cites="]');
                    if (citedByLink) {
                        const citedBy = document.createElement('a');
                        citedBy.href = `https://scholar.google.com${citedByLink.getAttribute('href')}`;
                        const citationCount = extractNumber(citedByLink.textContent);
                        citedBy.textContent = citationCount ? `Cited by ${citationCount}` : 'Cited by';
                        citedBy.target = '_blank';
                        linkElements.push(citedBy);
                    }

                    // Related articles - updated selector
                    const relatedLink = article.querySelector('a[href*="q=related:"]');
                    if (relatedLink) {
                        const related = document.createElement('a');
                        related.href = `https://scholar.google.com${relatedLink.getAttribute('href')}`;
                        related.textContent = 'Related articles';
                        related.target = '_blank';
                        linkElements.push(related);
                    }

                    // All versions
                    const versionsLink = article.querySelector('a[href*="cluster="]');
                    if (versionsLink) {
                        const versions = document.createElement('a');
                        versions.href = `https://scholar.google.com${versionsLink.getAttribute('href')}`;
                        const versionCount = extractNumber(versionsLink.textContent);
                        versions.textContent = versionCount ? `All ${versionCount} versions` : 'All versions';
                        versions.target = '_blank';
                        linkElements.push(versions);
                    }

                    // Add links with separators - using HTML entity for middot
                    linkElements.forEach((link, index) => {
                        links.appendChild(link);
                        if (index < linkElements.length - 1) {
                            const separator = document.createElement('span');
                            separator.innerHTML = ' &middot; ';
                            separator.className = 'separator';
                            links.appendChild(separator);
                        }
                    });
                    
                    resultItem.appendChild(links);
                }

                resultsDiv.appendChild(resultItem);
            });
        } catch (error) {
            resultsDiv.innerHTML = '';
            const errorDiv = document.createElement('div');
            errorDiv.className = 'result-item';
            errorDiv.textContent = `Unable to fetch results directly: ${error.message}. `;
            const link = document.createElement('a');
            link.href = `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;
            link.target = '_blank';
            link.textContent = 'Click here to search on Google Scholar';
            errorDiv.appendChild(link);
            resultsDiv.appendChild(errorDiv);
        }
    }

    // Perform initial search with tab title
    performSearch(tab[0].title);

    // Event Listeners
    searchButton.addEventListener('click', () => {
        performSearch(searchInput.value);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch(searchInput.value);
        }
    });
});
