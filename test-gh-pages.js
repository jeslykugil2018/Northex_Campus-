import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('response', response => {
        if (!response.ok()) {
            console.log('NETWORK ERROR:', response.url(), response.status());
        }
    });

    console.log('Navigating to live URL...');
    try {
        await page.goto('https://jeslykugil2018.github.io/Northex_Campus-/', { waitUntil: 'networkidle0', timeout: 30000 });
        const content = await page.content();
        console.log('Page loaded successfully. Checking body content length:', content.length);
    } catch (err) {
        console.error('Navigation error:', err.message);
    }

    await browser.close();
})();
