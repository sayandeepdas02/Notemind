const { chromium } = require('playwright');
const selectors = require('./utils/selectors');

async function joinMeeting(meetUrl, botName = "Notemind AI") {
    console.log(`[Bot] Starting Chrome to join: ${meetUrl}`);

    // Launch Chromium. We set headless: false for debugging/POC
    const browser = await chromium.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--use-fake-ui-for-media-stream', // Auto-accept camera/mic permissions
            '--use-fake-device-for-media-stream' // Feed fake video/audio instead of real hardware
        ]
    });

    const context = await browser.newContext({
        permissions: ['camera', 'microphone'] // Grant permissions automatically
    });

    const page = await context.newPage();

    try {
        console.log(`[Bot] Navigating to ${meetUrl}...`);
        await page.goto(meetUrl, { waitUntil: 'networkidle', timeout: 60000 });

        console.log('[Bot] Waiting for media controls to load...');
        // Wait for either the mic button or the name input to appear
        await page.waitForSelector(selectors.micButton, { timeout: 30000 }).catch(() => null);

        // Turn off Mic
        console.log('[Bot] Disabling microphone...');
        const mic = await page.locator(selectors.micButton);
        if (await mic.isVisible()) {
            const micAria = await mic.getAttribute('aria-label') || '';
            if (!micAria.includes('Turn on')) {
                await mic.click();
            }
        }

        // Turn off Camera
        console.log('[Bot] Disabling camera...');
        const cam = await page.locator(selectors.cameraButton);
        if (await cam.isVisible()) {
            const camAria = await cam.getAttribute('aria-label') || '';
            if (!camAria.includes('Turn on')) {
                await cam.click();
            }
        }

        // Enter Name (if required for guests)
        console.log(`[Bot] Entering name: ${botName}...`);
        const nameInput = await page.locator(selectors.nameInput).first();
        if (await nameInput.isVisible()) {
            await nameInput.fill(botName);
        } else {
            console.log('[Bot] No name input found, might be auto-logged in or different UI state.');
        }

        // Click Join / Ask to join
        console.log('[Bot] Looking for join buttons...');
        const askToJoin = page.locator(selectors.askToJoinButton);
        const joinNow = page.locator(selectors.joinNowButton);

        if (await joinNow.isVisible()) {
            console.log('[Bot] Clicking "Join now"...');
            await joinNow.click();
        } else if (await askToJoin.isVisible()) {
            console.log('[Bot] Clicking "Ask to join"...');
            await askToJoin.click();
        } else {
            console.log('[Bot] Warning: Could not find join button.');
        }

        // Wait to determine state
        console.log('[Bot] Waiting to confirm join state...');
        
        // Race between in-call, waiting room, or error
        const result = await Promise.race([
            page.waitForSelector(selectors.inCallIndicator, { timeout: 30000 }).then(() => 'joined'),
            page.waitForSelector(selectors.askingToJoinText, { timeout: 15000 }).then(() => 'waiting'),
            page.waitForSelector(selectors.errorBanner, { timeout: 15000 }).then(() => 'error')
        ]).catch(() => 'timeout');

        if (result === 'joined') {
            console.log('✅ [Bot] Successfully joined the meeting!');
        } else if (result === 'waiting') {
            console.log('⏳ [Bot] In waiting room. Waiting for host to admit...');
            // Wait for admission
            await page.waitForSelector(selectors.inCallIndicator, { timeout: 120000 });
            console.log('✅ [Bot] Admitted! Successfully joined the meeting!');
        } else if (result === 'error') {
            console.log('❌ [Bot] Failed to join: Blocked or error banner shown.');
        } else {
            console.log('⚠️ [Bot] Timed out waiting for join confirmation. Check browser window.');
        }

        // Keep it open for 10 seconds to observe, then close.
        console.log('[Bot] Keeping connection open for observation (10s)...');
        await page.waitForTimeout(10000);

    } catch (error) {
        console.error('❌ [Bot] An error occurred during the automation:', error);
    } finally {
        console.log('[Bot] Closing browser...');
        await browser.close();
    }
}

module.exports = { joinMeeting };
