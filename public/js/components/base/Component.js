// Base Component Class
import { LitElement } from 'lit';

export class Component extends LitElement {
  constructor() {
    super();
    this.listeners = [];
  }

  // Override createRenderRoot to render in light DOM instead of shadow DOM
  // This allows us to keep existing CSS and selectors working
  createRenderRoot() {
    return this;
  }

  addManagedListener(element, event, handler) {
    if (element) {
      element.addEventListener(event, handler);
      this.listeners.push({ element, event, handler });
    }
  }

  removeAllEventListeners() {
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeAllEventListeners();
  }

  emit(eventName, data) {
    const event = new CustomEvent(eventName, { detail: data });
    document.dispatchEvent(event);
  }

  on(eventName, handler) {
    document.addEventListener(eventName, handler);
    this.listeners.push({ element: document, event: eventName, handler });
  }
}
