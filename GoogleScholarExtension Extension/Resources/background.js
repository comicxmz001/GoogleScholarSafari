browser.runtime.onMessage.addListener((request, sender) => {
    if (request.action === 'fetchScholar') {
        return fetch(`https://scholar.google.com/scholar?q=${encodeURIComponent(request.query)}&hl=en`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15'
            }
        })
        .then(response => response.text())
        .then(html => {
            return { success: true, html: html };
        })
        .catch(error => {
            return { success: false, error: error.message };
        });
    }
    
    if (request.action === 'fetchCitations') {
        return fetch(request.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15'
            }
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
