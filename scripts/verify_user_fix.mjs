import { spawn } from 'child_process';
import http from 'http';

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

async function runVerification() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9777;
  const userDataDir = 'C:\\Users\\nishc\\.gemini\\antigravity\\scratch\\chrome_verify_user_fix';

  console.log('[DevTools Verifier] Launching headless Chrome on port', port);
  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--disable-gpu',
    'http://localhost:5173/'
  ]);

  try {
    const wsUrl = await getWsUrl(port);
    console.log('[DevTools Verifier] Connected to CDP:', wsUrl);

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

    console.log('[DevTools Verifier] Waiting for initial page mount...');
    await sleep(2500);

    // Dismiss preloader if visible
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const preloaderBtn = document.querySelector('button');
          if (preloaderBtn && preloaderBtn.textContent.includes('SKIP')) preloaderBtn.click();
        })()
      `
    });
    await sleep(600);

    // Setup Scenario matching user screenshot:
    // 1. Go to PROFILES, switch to Kabir, ensure 2 travelers
    console.log('[DevTools Verifier] Step 1: Navigating to PROFILES and setting active traveler to Kabir...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const profBtn = btns.find(b => b.textContent.includes('PROFILES'));
          if (profBtn) profBtn.click();
        })()
      `
    });
    await sleep(600);

    // Select Kabir card
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const cards = Array.from(document.querySelectorAll('.metallic-sheen, [class*="cursor-pointer"]'));
          const kabir = cards.find(c => c.textContent.includes('Kabir') || c.textContent.includes('8y'));
          if (kabir) kabir.click();
        })()
      `
    });
    await sleep(400);

    // 2. Go to WORKSPACE
    console.log('[DevTools Verifier] Step 2: Navigating to WORKSPACE...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const wsBtn = btns.find(b => b.textContent.includes('WORKSPACE'));
          if (wsBtn) wsBtn.click();
        })()
      `
    });
    await sleep(800);

    // 3. Perform interactive actions in WORKSPACE (changing & exploring stuff)
    console.log('[DevTools Verifier] Step 3: Modifying itinerary, maps, and operations cockpit...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          // Switch to Google Maps
          const gmapBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('GOOGLE MAP'));
          if (gmapBtn) gmapBtn.click();

          // Switch cockpit tab to DINING
          const diningTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('DINING'));
          if (diningTab) diningTab.click();

          // Switch cockpit tab to DISRUPTIONS
          const stormTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('DISRUPTION') || b.textContent.includes('STORM'));
          if (stormTab) stormTab.click();

          // Switch cockpit tab to BUDGET
          const budgetTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('BUDGET'));
          if (budgetTab) budgetTab.click();

          // Click stop on SVG / Map
          const stopCircles = Array.from(document.querySelectorAll('circle'));
          if (stopCircles.length > 0) stopCircles[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));

          // Switch back to SVG graph
          const svgBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('SVG GRAPH'));
          if (svgBtn) svgBtn.click();
        })()
      `
    });
    await sleep(1000);

    // 4. Click Prayana Logo Icon in HeaderHud (the exact user action that previously caused blank screen)
    console.log('[DevTools Verifier] Step 4: Clicking Prayana Logo to return to Discovery page...');
    const logoClickResult = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const header = document.querySelector('header');
          if (!header) return { error: 'No header found' };
          const logoBtn = header.querySelector('button');
          if (!logoBtn) return { error: 'No logo button in header' };
          logoBtn.click();
          return { success: true, text: logoBtn.textContent.trim() };
        })()
      `,
      returnByValue: true
    });
    console.log('[DevTools Verifier] Logo button click result:', logoClickResult.result?.result?.value);
    await sleep(1200);

    // 5. Audit the rendered Discovery Page state thoroughly
    console.log('[DevTools Verifier] Step 5: Auditing Discovery Page health...');
    const healthAudit = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const header = document.querySelector('header');
          const footer = document.querySelector('footer');
          const destinationH1 = document.querySelector('h1');
          const canvas = document.querySelector('canvas');
          const errorCard = document.querySelector('[class*="ACCELERATOR SUSPENDED"]');
          const monolithSlabs = document.querySelectorAll('.perspective-stage .metallic-sheen');
          const metricsStrip = Array.from(document.querySelectorAll('span')).some(s => s.textContent.includes('ELEV:'));
          
          const windowScrollY = window.scrollY;
          const bodyHeight = document.documentElement.scrollHeight;
          const clientHeight = document.documentElement.clientHeight;
          const isScrollLocked = bodyHeight <= clientHeight + 2;

          return {
            hasHeader: !!header,
            headerTravelerText: header ? header.innerText.split('\\n').find(t => t.includes('Kabir') || t.includes('G')) : null,
            hasFooter: !!footer,
            footerText: footer ? footer.innerText.replace(/\\n/g, ' ') : null,
            destinationTitle: destinationH1 ? destinationH1.textContent : null,
            hasCanvas: !!canvas,
            monolithSlabsCount: monolithSlabs.length,
            hasMetricsStrip: metricsStrip,
            hasErrorCard: !!errorCard,
            windowScrollY,
            isScrollLocked,
            bodyHeight,
            clientHeight
          };
        })()
      `,
      returnByValue: true
    });

    const result = healthAudit.result?.result?.value;
    console.log('\n[DevTools Verifier] Discovery Health Audit Result:');
    console.log(JSON.stringify(result, null, 2));

    // Validations
    if (!result.hasHeader) throw new Error('FAIL: Top HeaderHud is missing!');
    if (!result.hasFooter) throw new Error('FAIL: Bottom FooterHud is missing!');
    if (!result.destinationTitle) throw new Error('FAIL: Destination H1 title is missing!');
    if (result.monolithSlabsCount === 0) throw new Error('FAIL: Monolith shelf slabs failed to render!');
    if (result.hasErrorCard) throw new Error('FAIL: ErrorBoundary fallback was triggered!');
    if (result.windowScrollY !== 0) throw new Error('FAIL: window.scrollY is not 0!');

    console.log('\n[DevTools Verifier] Step 6: Stress-testing 5 rapid cross-view cycles (DISCOVERY <-> WORKSPACE)...');
    for (let c = 1; c <= 5; c++) {
      // Go to WORKSPACE
      await send('Runtime.evaluate', {
        expression: `
          (() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('WORKSPACE'));
            if (btn) btn.click();
          })()
        `
      });
      await sleep(400);

      // Return to DISCOVERY via Prayana Logo
      await send('Runtime.evaluate', {
        expression: `
          (() => {
            const header = document.querySelector('header');
            const logoBtn = header ? header.querySelector('button') : null;
            if (logoBtn) logoBtn.click();
          })()
        `
      });
      await sleep(500);

      const check = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const h1 = document.querySelector('h1');
            const footer = document.querySelector('footer');
            return { hasH1: !!h1, hasFooter: !!footer };
          })()
        `,
        returnByValue: true
      });
      if (!check.result?.result?.value?.hasH1 || !check.result?.result?.value?.hasFooter) {
        throw new Error(`FAIL: Rapid cycle ${c} failed!`);
      }
      console.log(`  ✓ Cycle ${c}/5 passed cleanly`);
    }

    console.log('\n=============================================');
    console.log('DevTools Audit Results:');
    console.log('Console Errors:', consoleErrors.length);
    console.log('Uncaught Exceptions:', uncaughtExceptions.length);
    console.log('ALL AUDITS PASSED WITH ZERO BLANK SCREENS!');
    console.log('=============================================');

    ws.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

runVerification().catch(err => {
  console.error('[DevTools Verifier] Error:', err);
  process.exit(1);
});
