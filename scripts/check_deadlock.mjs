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

async function checkDeadlock() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9666;
  const userDataDir = 'C:\\Users\\nishc\\.gemini\\antigravity\\scratch\\chrome_deadlock_profile';

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

    // 1. Go to WORKSPACE
    console.log('1. Going to WORKSPACE...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('WORKSPACE'));
          if (btn) btn.click();
        })()
      `
    });
    await sleep(1000);

    // 2. Click a bunch of things in WORKSPACE
    console.log('2. Modifying things in WORKSPACE...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const stopNodes = Array.from(document.querySelectorAll('circle'));
          if (stopNodes.length > 2) stopNodes[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        })()
      `
    });
    await sleep(500);

    // 3. Click Prayana Logo
    console.log('3. Clicking Prayana logo...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const header = document.querySelector('header');
          const logoBtn = header.querySelector('button');
          if (logoBtn) logoBtn.click();
        })()
      `
    });

    // Wait 3 full seconds for any transition to finish
    await sleep(3000);

    // 4. Check DOM
    const check = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const rootChildren = Array.from(document.getElementById('root').firstElementChild.children);
          const report = rootChildren.map(c => ({
            tag: c.tagName,
            class: c.className.slice(0, 50),
            style: c.getAttribute('style') || '',
            text: c.innerText ? c.innerText.slice(0, 40).replace(/\\n/g, ' ') : ''
          }));
          return report;
        })()
      `,
      returnByValue: true
    });

    console.log('Root children report:');
    console.log(JSON.stringify(check.result?.result?.value, null, 2));

    ws.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

checkDeadlock().catch(console.error);
