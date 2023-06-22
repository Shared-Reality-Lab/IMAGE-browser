setInterval(() => {
  chrome.runtime.sendMessage({ keepAlive: true });
}, 30000);