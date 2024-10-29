/**
 * Background script for handling Google Scholar API requests
 * Manages cross-origin requests with appropriate headers
 */

browser.runtime.onMessage.addListener((request, sender) => {
    // Common headers for Google Scholar requests
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15'
    };

    /**
     * Handles search requests to Google Scholar
     * @param {Object} request - Request object containing search query
     * @returns {Promise<Object>} Response with search results HTML
     */
    if (request.action === 'fetchScholar') {
        return fetch(`https://scholar.google.com/scholar?q=${encodeURIComponent(request.query)}&hl=en`, {
            headers: headers
        })
        .then(response => response.text())
        .then(html => {
            return { success: true, html: html };
        })
        .catch(error => {
            return { success: false, error: error.message };
        });
    }
    
    /**
     * Handles citation fetch requests
     * @param {Object} request - Request object containing citation URL
     * @returns {Promise<Object>} Response with citation HTML
     */
    if (request.action === 'fetchCitations') {
        return fetch(request.url, {
            headers: headers
        })
        .then(response => response.text())
        .then(html => {
            return { success: true, html: html };
        })
        .catch(error => {
            return { success: false, error: error.message };
        });
    }
});
