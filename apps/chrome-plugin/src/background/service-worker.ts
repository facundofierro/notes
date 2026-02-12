import { ExtensionMessage } from "../shared/messages";

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type === "CAPTURE_TAB") {
    chrome.tabs.captureVisibleTab({ format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab?.id) {
          chrome.tabs.sendMessage(activeTab.id, {
            type: "INJECT_OVERLAY",
            screenshotDataUrl: dataUrl,
          });
          
          // Open side panel
          chrome.sidePanel.open({ tabId: activeTab.id });
        }
      });
    });
  }
  
  // Forward messages from content script to SidePanel
  if (message.type === "ANNOTATIONS_COMPLETE" || message.type === "OVERLAY_DISMISSED") {
    chrome.runtime.sendMessage(message);
  }
});

// Set side panel behavior
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
