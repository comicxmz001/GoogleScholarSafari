document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
//    const scholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(tab.url)}`;
    const scholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(tab.title)}`;
    // Redirect the popup window itself to Google Scholar
    window.location.href = scholarUrl;
    
    // Automatically close the popup after a short delay
    setTimeout(() => window.close(), 100);
});
