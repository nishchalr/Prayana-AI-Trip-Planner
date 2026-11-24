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

async function capture() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9888;
  const userDataDir = 'C:\\Users\\nishc\\.gemini\\antigravity\\scratch\\chrome_snap_profile';

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
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let id = 1;
    const callbacks = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg);
        callbacks.delete(msg.id);
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
    await sleep(2500);

    // Skip preloader
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('button');
          if (btn && btn.textContent.includes('SKIP')) btn.click();
        })()
      `
    });
    await sleep(600);

    // Navigate to WORKSPACE
    console.log('Navigating to WORKSPACE...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('WORKSPACE'));
          if (btn) btn.click();
        })()
      `
    });
    await sleep(1000);

    // Click things in WORKSPACE
    console.log('Interacting in WORKSPACE...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          // Switch cockpit tabs
          const dining = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('DINING'));
          if (dining) dining.click();
          const budget = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('BUDGET'));
          if (budget) budget.click();
        })()
      `
    });
    await sleep(800);

    // Click Prayana Logo
    console.log('Clicking Prayana Logo...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const header = document.querySelector('header');
          const logoBtn = header ? header.querySelector('button') : null;
          if (logoBtn) logoBtn.click();
        })()
      `
    });
    await sleep(1500);

    // Capture screenshot
    console.log('Capturing screenshot of Discovery view...');
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shot.result.data, 'base64');
    const outPath = 'C:\\Users\\nishc\\.gemini\\antigravity\\brain\\59a4f8e0-8573-41dc-ae25-193da8037b52\\discovery_verified.png';
    fs.writeFileSync(outPath, buffer);
    console.log('Saved screenshot to:', outPath);

    ws.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

capture().catch(console.error);
