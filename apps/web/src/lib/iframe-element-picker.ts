/**
 * iframe-element-picker.ts
 * Provides utilities for selecting and communicating element information
 * between parent window and iframe content using postMessage API
 */

export interface SerializedElement {
  selector: string;
  tagName: string;
  textSnippet: string;
  html?: string;
}

export interface ElementPickerMessage {
  type: "agelum:pick-request" | "agelum:pick-response" | "agelum:pick-cancel";
  id?: string;
  element?: SerializedElement;
  error?: string;
}

/**
 * Serializes an element into a format that can be transmitted via postMessage
 */
export function serializeElement(element: Element): SerializedElement {
  const selector = getElementSelector(element);
  const tagName = element.tagName.toLowerCase();
  const textContent = element.textContent || "";
  const textSnippet = textContent.slice(0, 50).trim().replace(/\s+/g, " ");
  
  return {
    selector,
    tagName,
    textSnippet,
    html: element.outerHTML.slice(0, 200),
  };
}

/**
 * Generates a CSS selector for an element
 * Prioritizes data attributes, IDs, and classes
 */
function getElementSelector(element: Element): string {
  // Check for test/qa attributes first
  const testId =
    element.getAttribute("data-testid") ||
    element.getAttribute("data-test") ||
    element.getAttribute("data-qa");
  if (testId) return `[data-testid="${testId}"]`;

  if (element.id) return `#${element.id}`;

  const classList = Array.from(element.classList || []);
  if (classList.length > 0) {
    return `.${classList
      .slice(0, 2)
      .map((name) => name.trim())
      .filter(Boolean)
      .join(".")}`;
  }

  const tag = element.tagName.toLowerCase();
  const parent = element.parentElement;
  if (!parent) return tag;

  const siblings = Array.from(parent.children).filter(
    (child) => child.tagName === element.tagName
  );
  if (siblings.length <= 1) return tag;

  const index = siblings.indexOf(element) + 1;
  return `${tag}:nth-of-type(${index})`;
}

/**
 * Sets up a click-to-select listener in an iframe
 * This is injected into the iframe to enable element picking
 */
export function setupIframeElementPicker() {
  if (typeof window === "undefined") {
    return;
  }

  let isPickingMode = false;
  const originalCursor = document.body.style.cursor;

  const handlePickRequest = (event: MessageEvent) => {
    const { data } = event;

    if (!data || data.type !== "agelum:pick-request") {
      return;
    }

    isPickingMode = true;
    document.body.style.cursor = "crosshair";

    const handleElementClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const element = e.target as Element;
      if (!element) return;

      const serialized = serializeElement(element);

      // Send back to parent
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: "agelum:pick-response",
            id: data.id,
            element: serialized,
          },
          "*"
        );
      }

      // Clean up
      isPickingMode = false;
      document.body.style.cursor = originalCursor;
      document.removeEventListener("click", handleElementClick, true);
    };

    const handleCancel = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        isPickingMode = false;
        document.body.style.cursor = originalCursor;
        document.removeEventListener("click", handleElementClick, true);
        document.removeEventListener("keydown", handleCancel, true);

        if (window.parent && window.parent !== window) {
          window.parent.postMessage(
            {
              type: "agelum:pick-cancel",
              id: data.id,
            },
            "*"
          );
        }
      }
    };

    document.addEventListener("click", handleElementClick, true);
    document.addEventListener("keydown", handleCancel, true);
  };

  window.addEventListener("message", handlePickRequest);
}

/**
 * Serializes element for sending via postMessage
 */
export function serializeElementForPost(element: Element | null): SerializedElement | null {
  if (!element) return null;
  return serializeElement(element);
}
