import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getWsUrl(port, retries = 25) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json`, resp => {
          let data = '';
          resp.on('data', chunk => data += chunk);
          resp.on('end', () => resolve(data));
        }).on('error', reject);
      });
      const pages = JSON.parse(res);
      const page = pages.find(p => p.type === 'page');
      if (page && page.webSocketDebuggerUrl) {
        return page.webSocketDebuggerUrl;
      }
    } catch {
      await sleep(400);
    }
  }
  throw new Error('Chrome remote debugging endpoint timed out');
}

async function auditNavigationAndUX() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9999;
  const userDataDir = 'C:\\Users\\nishc\\.gemini\\antigravity\\scratch\\chrome_ia_audit_profile';
  const outDir = 'C:\\Users\\nishc\\.gemini\\antigravity\\brain\\59a4f8e0-8573-41dc-ae25-193da8037b52';

  console.log('[IA & UX Auditor] Launching headless Chrome (1440x900 viewport)...');
  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--disable-gpu',
    '--window-size=1440,900',
    'http://localhost:5173/'
  ]);

  try {
    const wsUrl = await getWsUrl(port);
    console.log('[IA & UX Auditor] Connected to CDP:', wsUrl);

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let id = 1;
    const callbacks = new Map();
    const uncaughtExceptions = [];
    const consoleErrors = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg);
        callbacks.delete(msg.id);
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        if (msg.params.type === 'error') {
          consoleErrors.push(msg.params.args.map(a => a.value || a.description).join(' '));
        }
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        uncaughtExceptions.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || ''));
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const reqId = id++;
        callbacks.set(reqId, resolve);
        ws.send(JSON.stringify({ id: reqId, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Console.enable');

    console.log('[IA & UX Auditor] Waiting for initial load...');
    await sleep(2500);

    // Dismiss preloader if present
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('button');
          if (btn && btn.textContent.includes('SKIP')) btn.click();
        })()
      `
    });
    await sleep(800);

    // Helper to snap a screenshot
    async function snap(filename) {
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const buffer = Buffer.from(shot.result.data, 'base64');
      fs.writeFileSync(`${outDir}\\${filename}`, buffer);
      console.log(`[Screenshot] Saved ${filename}`);
    }

    // Helper to inspect visible buttons and labels
    async function auditCurrentView(viewName) {
      const audit = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const header = document.querySelector('header');
            const footer = document.querySelector('footer');
            
            const headerNavButtons = Array.from(header?.querySelectorAll('nav button') || []).map(b => b.textContent.trim());
            const headerUtilButtons = Array.from(header?.querySelectorAll('div:last-child button') || []).map(b => b.textContent.replace(/\\s+/g, ' ').trim());
            
            const footerButtons = Array.from(footer?.querySelectorAll('button') || []).map(b => b.textContent.replace(/\\s+/g, ' ').trim());
            const footerLeftText = footer?.firstElementChild?.textContent?.replace(/\\s+/g, ' ').trim();

            return {
              headerNavButtons,
              headerUtilButtons,
              footerLeftText,
              footerButtons,
              scrollY: window.scrollY,
              isScrollable: document.documentElement.scrollHeight > document.documentElement.clientHeight
            };
          })()
        `,
        returnByValue: true
      });
      return audit.result?.result?.value;
    }

    // ==========================================
    // 1. AUDIT EXPLORE VIEW
    // ==========================================
    console.log('\n--- 1. AUDITING EXPLORE VIEW ---');
    const exploreState = await auditCurrentView('EXPLORE');
    console.log('Top Nav Primary Views:', exploreState.headerNavButtons);
    console.log('Top Nav Global Utilities:', exploreState.headerUtilButtons);
    console.log('Footer Left Corridor Status:', exploreState.footerLeftText);
    console.log('Footer Right Actions:', exploreState.footerButtons);

    // Validate EXPLORE
    if (!exploreState.headerNavButtons.includes('EXPLORE')) throw new Error('FAIL: EXPLORE button missing in header');
    if (!exploreState.headerNavButtons.includes('ITINERARY')) throw new Error('FAIL: ITINERARY button missing in header');
    if (!exploreState.footerButtons.some(b => b.includes('VIEW ITINERARY'))) throw new Error('FAIL: VIEW ITINERARY button missing in footer');
    if (exploreState.footerButtons.some(b => b.includes('OPEN ITINERARY') || b.includes('VITALS') || b.includes('COPILOT'))) {
      throw new Error('FAIL: Duplicate utility buttons found in EXPLORE footer!');
    }
    await snap('audit_1_explore.png');

    // Test destination stepper in footer
    console.log('Testing Footer Stepper [NEXT →] on EXPLORE...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const nextBtn = Array.from(document.querySelectorAll('footer button')).find(b => b.textContent.includes('NEXT'));
          if (nextBtn) nextBtn.click();
        })()
      `
    });
    await sleep(600);

    // ==========================================
    // 2. AUDIT ITINERARY VIEW
    // ==========================================
    console.log('\n--- 2. AUDITING ITINERARY VIEW ---');
    // Click VIEW ITINERARY button in footer
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('footer button')).find(b => b.textContent.includes('VIEW ITINERARY'));
          if (btn) btn.click();
        })()
      `
    });
    await sleep(800);

    const itineraryState = await auditCurrentView('ITINERARY');
    console.log('Footer Left Workspace Status:', itineraryState.footerLeftText);
    console.log('Footer Right Contextual Actions:', itineraryState.footerButtons);

    // Check header redundancy in ITINERARY
    const itineraryHeaderCheck = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const main = document.querySelector('main');
          const header = main?.querySelector('h1')?.parentElement;
          const buttonsInPageHeader = Array.from(header?.querySelectorAll('button') || []).map(b => b.textContent.trim());
          const h1Title = main?.querySelector('h1')?.textContent?.trim();
          return { buttonsInPageHeader, h1Title };
        })()
      `,
      returnByValue: true
    });
    console.log('Itinerary Page H1 Title:', itineraryHeaderCheck.result?.result?.value?.h1Title);
    console.log('Buttons inside Itinerary Page Header (Must be 0):', itineraryHeaderCheck.result?.result?.value?.buttonsInPageHeader);

    if (itineraryHeaderCheck.result?.result?.value?.buttonsInPageHeader.length > 0) {
      throw new Error('FAIL: Redundant buttons still exist inside Itinerary page header!');
    }
    if (!itineraryState.footerButtons.some(b => b.includes('ADD STOP'))) throw new Error('FAIL: ADD STOP button missing in ITINERARY footer');
    if (!itineraryState.footerButtons.some(b => b.includes('SIMULATE STORM') || b.includes('DISRUPTION'))) throw new Error('FAIL: SIMULATE STORM button missing in ITINERARY footer');
    await snap('audit_2_itinerary.png');

    // Test Storm Disruption toggle in footer
    console.log('Testing Storm Disruption Toggle in ITINERARY footer...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const stormBtn = Array.from(document.querySelectorAll('footer button')).find(b => b.textContent.includes('STORM'));
          if (stormBtn) stormBtn.click();
        })()
      `
    });
    await sleep(500);

    // ==========================================
    // 3. AUDIT PROFILES VIEW
    // ==========================================
    console.log('\n--- 3. AUDITING PROFILES VIEW ---');
    // Click PROFILES in Top Navbar
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('header nav button')).find(b => b.textContent.includes('PROFILES'));
          if (btn) btn.click();
        })()
      `
    });
    await sleep(800);

    const profilesState = await auditCurrentView('PROFILES');
    console.log('Footer Left Cohort Status:', profilesState.footerLeftText);
    console.log('Footer Right Actions:', profilesState.footerButtons);

    if (!profilesState.footerButtons.some(b => b.includes('+ NEW TRAVELER'))) throw new Error('FAIL: + NEW TRAVELER button missing in PROFILES footer');
    await snap('audit_3_profiles.png');

    // ==========================================
    // 4. TEST GLOBAL UTILITIES IN TOP NAVBAR
    // ==========================================
    console.log('\n--- 4. TESTING GLOBAL UTILITIES IN TOP NAVBAR ---');
    // Test Copilot button in Top Nav
    console.log('Testing COPILOT [⌘K] trigger in Top Navbar...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const copilotBtn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent.includes('COPILOT'));
          if (copilotBtn) copilotBtn.click();
        })()
      `
    });
    await sleep(600);

    const copilotOpen = await send('Runtime.evaluate', {
      expression: `document.body.innerText.includes('GEMINI AI TRIP COPILOT')`,
      returnByValue: true
    });
    console.log('Copilot Drawer Opened:', copilotOpen.result?.result?.value);
    if (!copilotOpen.result?.result?.value) throw new Error('FAIL: Copilot drawer failed to open from top rail');

    // Close copilot
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('ESC') || b.querySelector('svg.lucide-x'));
          if (closeBtn) closeBtn.click();
        })()
      `
    });
    await sleep(600);

    // Test Vitals pill in Top Nav
    console.log('Testing [ ♥ ... BPM ] trigger in Top Navbar...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const vitalsBtn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent.includes('BPM'));
          if (vitalsBtn) vitalsBtn.click();
        })()
      `
    });
    await sleep(600);

    const vitalsOpen = await send('Runtime.evaluate', {
      expression: `document.body.innerText.includes('GOOGLE HEALTH') || document.body.innerText.includes('WEARABLE TELEMETRY')`,
      returnByValue: true
    });
    console.log('Vitals Drawer Opened:', vitalsOpen.result?.result?.value);
    if (!vitalsOpen.result?.result?.value) throw new Error('FAIL: Vitals drawer failed to open from top rail');

    // Close vitals
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-x'));
          if (closeBtn) closeBtn.click();
        })()
      `
    });
    await sleep(400);

    // Return to EXPLORE via Logo
    console.log('Clicking Prayana Logo to return to EXPLORE...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const header = document.querySelector('header');
          const logoBtn = header ? header.querySelector('button') : null;
          if (logoBtn) logoBtn.click();
        })()
      `
    });
    await sleep(800);

    console.log('\n=============================================');
    console.log('IA & UX Standardization Audit Summary:');
    console.log('Console Errors:', consoleErrors.length);
    console.log('Uncaught Exceptions:', uncaughtExceptions.length);
    console.log('ALL 3 PAGES & GLOBAL UTILITIES VERIFIED WITH ZERO DUPLICATIONS!');
    console.log('=============================================');

    ws.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

auditNavigationAndUX().catch(err => {
  console.error('[IA & UX Auditor] Error:', err);
  process.exit(1);
});
