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

async function reproduce() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9444;
  const userDataDir = 'C:\\Users\\nishc\\.gemini\\antigravity\\scratch\\chrome_reproduce_profile';

  console.log('[Tester] Launching Chrome...');
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
    console.log('[Tester] Connected to CDP:', wsUrl);

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let id = 1;
    const callbacks = new Map();
    const consoleLogs = [];
    const uncaughtExceptions = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg);
        callbacks.delete(msg.id);
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
        consoleLogs.push(`[Console ${msg.params.type}] ${text}`);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const text = msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || '');
        uncaughtExceptions.push(text);
        console.error('[UNCAUGHT EXCEPTION]:', text);
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

    console.log('[Tester] Waiting for initial load...');
    await sleep(3000);

    // Skip preloader if present
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const preloader = document.querySelector('button');
          if (preloader) preloader.click();
        })()
      `
    });
    await sleep(1000);

    // Step 1: Click WORKSPACE
    console.log('[Tester] Step 1: Navigating to WORKSPACE...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent.includes('WORKSPACE'));
          if (btn) btn.click();
        })()
      `
    });
    await sleep(1000);

    // Step 2: In Workspace, "change stuff and explore stuff"
    console.log('[Tester] Step 2: Exploring and changing stuff in itinerary...');
    // Click some stops on the timeline / map
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          // Click a stop in timeline
          const stops = Array.from(document.querySelectorAll('.cursor-grab, [class*="cursor-grab"]'));
          if (stops.length > 0) stops[0].click();
          
          // Click pin button if present
          const pinBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('PIN') || b.textContent.includes('PINNED'));
          if (pinBtns.length > 0) pinBtns[0].click();

          // Switch cockpit tab to DINING
          const diningTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('DINING') || b.textContent.includes('SMART DINING'));
          if (diningTab) diningTab.click();

          // Switch cockpit tab to DISRUPTIONS
          const disruptTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('DISRUPT') || b.textContent.includes('STORM'));
          if (disruptTab) disruptTab.click();

          // Select another stop
          const stopNodes = Array.from(document.querySelectorAll('circle, [class*="cursor-pointer"]'));
          if (stopNodes.length > 10) stopNodes[10].click();
        })()
      `
    });
    await sleep(1500);

    // Step 3: Click Prayana Logo icon in HeaderHud (the exact action user described)
    console.log('[Tester] Step 3: Clicking Prayana icon / logo in HeaderHud to go back to explore page...');
    const clickResult = await send('Runtime.evaluate', {
      expression: `
        (() => {
          // HeaderHud's Prayana logo button
          const header = document.querySelector('header');
          if (!header) return 'No header found';
          const logoBtn = header.querySelector('button');
          if (!logoBtn) return 'No logo button in header';
          logoBtn.click();
          return 'Clicked logo button: ' + logoBtn.textContent;
        })()
      `,
      returnByValue: true
    });
    console.log('[Tester] Click result:', clickResult.result?.result?.value);
    await sleep(2000);

    // Step 4: Inspect what is in the DOM
    const domCheck = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const bodyHtml = document.body.innerHTML;
          const main = document.querySelector('main');
          const header = document.querySelector('header');
          const footer = document.querySelector('footer');
          const canvas = document.querySelector('canvas');
          const h1 = document.querySelector('h1');
          const allText = document.body.innerText;
          const bodyChildren = Array.from(document.body.children).map(c => ({
            tag: c.tagName,
            id: c.id,
            className: c.className,
            childrenCount: c.children.length
          }));
          return {
            hasMain: !!main,
            hasHeader: !!header,
            hasFooter: !!footer,
            hasCanvas: !!canvas,
            h1Text: h1 ? h1.textContent : null,
            bodyChildren,
            textSnippet: allText.slice(0, 300)
          };
        })()
      `,
      returnByValue: true
    });

    console.log('[Tester] DOM Check after returning to DISCOVERY:');
    console.log(JSON.stringify(domCheck.result?.result?.value, null, 2));

    console.log('\n[Tester] Console Logs Count:', consoleLogs.length);
    if (consoleLogs.length > 0) {
      console.log('--- Recent Console Logs ---');
      consoleLogs.slice(-20).forEach(l => console.log(l));
    }

    console.log('\n[Tester] Uncaught Exceptions Count:', uncaughtExceptions.length);
    if (uncaughtExceptions.length > 0) {
      console.log('--- Uncaught Exceptions ---');
      uncaughtExceptions.forEach(e => console.log(e));
    }

    ws.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

reproduce().catch(console.error);
