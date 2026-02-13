import { ElementSelectionInfo } from "./types";

export const joinFsPath = (...parts: string[]) =>
  parts.filter(Boolean).join("/").replace(/\\/g, "/").replace(/\/+/g, "/");

export const rgbToHex = (value: string) => {
  const match = value.replace(/\s+/g, "").match(/^rgba?\((\d+),(\d+),(\d+)/i);
  if (!match) return null;
  const toHex = (num: number) =>
    Math.max(0, Math.min(255, num)).toString(16).padStart(2, "0");
  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const getElementSelector = (element: Element) => {
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
    (child) => child.tagName === element.tagName,
  );
  if (siblings.length <= 1) return tag;

  const index = siblings.indexOf(element) + 1;
  return `${tag}:nth-of-type(${index})`;
};

export const asHTMLElement = (element: Element | null) => {
  if (!element) return null;
  const view = element.ownerDocument?.defaultView;
  if (view?.HTMLElement && element instanceof view.HTMLElement) {
    return element as HTMLElement;
  }
  if (element instanceof HTMLElement) {
    return element;
  }
  return null;
};
