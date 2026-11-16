document.getElementById("rescan").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) chrome.tabs.reload(tab.id);
  window.close();
});

chrome.storage.local.get(["checks"], (r) => {
  const n = r.checks || 0;
  const s = document.getElementById("stat");
  if (n > 0) s.textContent = `💛 ${n} products checked so far`;
});
