import { AnnotationOverlay } from "./overlay/AnnotationOverlay";
import { ExtensionMessage } from "../shared/messages";

let overlay: AnnotationOverlay | null = null;

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  switch (message.type) {
    case "INJECT_OVERLAY":
      if (overlay) overlay.destroy();
      overlay = new AnnotationOverlay(
        message.screenshotDataUrl,
        (annotations, width, height) => {
          chrome.runtime.sendMessage({
            type: "ANNOTATIONS_COMPLETE",
            annotations,
            displayWidth: width,
            displayHeight: height,
          });
        },
        () => {
          chrome.runtime.sendMessage({ type: "OVERLAY_DISMISSED" });
        }
      );
      break;

    case "SET_TOOL":
      if (overlay) {
        overlay.setTool(message.tool);
      }
      break;

    case "OVERLAY_DISMISSED":
      if (overlay) {
        overlay.destroy();
        overlay = null;
      }
      break;
  }
});
