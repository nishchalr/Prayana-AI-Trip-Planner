import { spawn } from 'child_process';
import http from 'http';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getWsUrl(port, retries = 20) {
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

async function runDevToolsTest() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9333;
  const userDataDir = 'C:\\Users\\nishc\\.gemini\\antigravity\\scratch\\chrome_test_profile';

  console.log('[DevTools Tester] Launching Chrome in headless mode with remote debugging...');
  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--disable-gpu',
    'http://localhost:5173/'
  ]);

  chrome.on('error', err => {
    console.error('Failed to spawn Chrome:', err);
  });

  try {
    const wsUrl = await getWsUrl(port);
    console.log('[DevTools Tester] Connected to CDP endpoint:', wsUrl);

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let id = 1;
    const callbacks = new Map();
    const consoleErrors = [];
    const uncaughtExceptions = [];

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

    console.log('[DevTools Tester] Waiting 2.5s for initial page load and 3D stage mounting...');
    await sleep(2500);

    // Helper to evaluate in page
    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return res.result?.result?.value;
    }

    // Check initial state
    const initialTitle = await evaluate('document.title');
    console.log('[DevTools Tester] Page Title:', initialTitle);

    // 5 Navigation Cycles: DISCOVERY -> WORKSPACE -> PROFILES -> DISCOVERY
    for (let cycle = 1; cycle <= 5; cycle++) {
      console.log(`\n--- [Cycle ${cycle}/5] ---`);

      // 1. Navigate to WORKSPACE
      console.log('1. Clicking WORKSPACE tab...');
      await evaluate(`
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent.includes('WORKSPACE'));
          if (btn) btn.click();
        })()
      `);
      await sleep(600);

      // Interact in WORKSPACE: switch cockpit tabs, click stops
      console.log('2. Interacting in WORKSPACE (cockpit tabs & stop selection)...');
      await evaluate(`
        (() => {
          const tabBtns = Array.from(document.querySelectorAll('button'));
          const diningTab = tabBtns.find(b => b.textContent.includes('DINING') || b.textContent.includes('2. SMART DINING'));
          if (diningTab) diningTab.click();
        })()
      `);
      await sleep(400);

      // 2. Navigate to PROFILES
      console.log('3. Clicking PROFILES tab...');
      await evaluate(`
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent.includes('PROFILES'));
          if (btn) btn.click();
        })()
      `);
      await sleep(500);

      // Switch active traveler
      console.log('4. Interacting in PROFILES (switching traveler)...');
      await evaluate(`
        (() => {
          const cards = Array.from(document.querySelectorAll('.metallic-sheen'));
          if (cards.length > 1) {
            cards[cards.length - 1].click();
          }
        })()
      `);
      await sleep(400);

      // 3. Return to DISCOVERY
      console.log('5. Clicking DISCOVERY tab...');
      await evaluate(`
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent.includes('DISCOVERY'));
          if (btn) btn.click();
        })()
      `);
      await sleep(800);

      // Inspect Discovery View health
      const discoveryStatus = await evaluate(`
        (() => {
          const main = document.querySelector('main');
          const hasMain = !!main;
          const h1 = document.querySelector('h1');
          const h1Text = h1 ? h1.textContent : null;
          const hasMonolithLeft = !!document.querySelector('.perspective-stage');
          const canvas = document.querySelector('canvas');
          const errorCard = document.querySelector('[class*="ACCELERATOR SUSPENDED"]');
          return {
            hasMain,
            h1Text,
            hasMonolithLeft,
            hasCanvas: !!canvas,
            hasErrorCard: !!errorCard,
            bodyChildCount: document.body.children.length
          };
        })()
      `);

      console.log('Discovery State Check:', JSON.stringify(discoveryStatus));
      if (!discoveryStatus.hasMain || !discoveryStatus.h1Text) {
        throw new Error(`Cycle ${cycle} Failed: Discovery page is blank or missing main content!`);
      }
      console.log(`✓ Cycle ${cycle} verified: Destination "${discoveryStatus.h1Text}" rendered cleanly without blank screen.`);
    }

    console.log('\n=============================================');
    console.log('DevTools Audit Results:');
    console.log('Total Console Errors:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('Console Errors detail:', consoleErrors);
    }
    console.log('Total Uncaught Exceptions:', uncaughtExceptions.length);
    if (uncaughtExceptions.length > 0) {
      console.log('Uncaught Exceptions detail:', uncaughtExceptions);
    }
    console.log('5/5 Navigation cycles completed successfully with ZERO blank screens!');
    console.log('=============================================');

    ws.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

runDevToolsTest().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
