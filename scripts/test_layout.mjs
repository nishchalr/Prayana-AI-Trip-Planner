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

async function testLayout() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9555;
  const userDataDir = 'C:\\Users\\nishc\\.gemini\\antigravity\\scratch\\chrome_layout_profile';

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

    // Navigate to WORKSPACE
    console.log('Navigating to WORKSPACE...');
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

    // Click Prayana Logo to go back to GALLERY_HOME
    console.log('Clicking Prayana Logo...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const header = document.querySelector('header');
          const logoBtn = header.querySelector('button');
          if (logoBtn) logoBtn.click();
        })()
      `
    });
    await sleep(500);

    // Inspect layout and elements
    const layout = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const body = document.body;
          const root = document.getElementById('root');
          const mainDiv = root ? root.firstElementChild : null;
          const scrollHeight = document.documentElement.scrollHeight;
          const clientHeight = document.documentElement.clientHeight;
          const scrollY = window.scrollY;

          // Find all view divs inside the main area
          const viewContainers = Array.from(document.querySelectorAll('.flex-1.flex.flex-col.w-full'));
          const containerDetails = viewContainers.map(v => ({
            className: v.className,
            styleOpacity: v.style.opacity,
            computedOpacity: window.getComputedStyle(v).opacity,
            clientHeight: v.clientHeight,
            offsetHeight: v.offsetHeight,
            offsetTop: v.offsetTop,
            childrenCount: v.children.length,
            childTag: v.firstElementChild ? v.firstElementChild.tagName : null,
            childClass: v.firstElementChild ? v.firstElementChild.className : null
          }));

          // Footer position
          const footer = document.querySelector('footer');
          const footerTop = footer ? footer.offsetTop : null;

          return {
            scrollHeight,
            clientHeight,
            scrollY,
            viewContainersCount: viewContainers.length,
            containerDetails,
            footerTop
          };
        })()
      `,
      returnByValue: true
    });

    console.log('Layout Analysis:');
    console.log(JSON.stringify(layout.result?.result?.value, null, 2));

    ws.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

testLayout().catch(console.error);
