// Background script
const LAUNCHIT_SERVER = 'http://localhost:5174';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-to-launchit",
    title: "Add Link to LaunchIt",
    contexts: ["link"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "add-to-launchit" && info.linkUrl) {
    try {
      // Create bookmark
      const response = await fetch(`${LAUNCHIT_SERVER}/api/bookmarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: info.linkUrl,
          name: info.linkText || info.linkUrl, // Fallback to URL if no text
        })
      });

      const result = await response.json();

      if (result.success) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'LaunchIt',
          message: 'Link added successfully!'
        });
      } else {
        throw new Error(result.error || 'Server error');
      }
    } catch (error) {
      console.error('Add failed:', error);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'LaunchIt Error',
        message: 'Could not add link. Is LaunchIt running?'
      });
    }
  }
});
