/* NurtureSafe service worker — minimal. The analysis runs client-side in the content script.
   Kept for lifecycle hooks and future Q2 features (trimester profile sync, telemetry opt-in). */
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["installedAt"], (r) => {
    if (!r.installedAt) chrome.storage.local.set({ installedAt: Date.now(), checks: 0 });
  });
});
