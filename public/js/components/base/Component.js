// Base Component Class
export class Component {
  constructor(containerId = null) {
    this.container = containerId ? document.getElementById(containerId) : null;
    this.state = {};
    this.listeners = [];
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.render();
  }

  render() {
    throw new Error('Component must implement render() method');
  }

  mount(container) {
    if (typeof container === 'string') {
      this.container = document.getElementById(container);
    } else {
      this.container = container;
    }
    this.render();
  }

  setHTML(html) {
    if (this.container) {
      this.container.innerHTML = html;
    }
  }

  addEventListener(element, event, handler) {
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

  destroy() {
    this.removeAllEventListeners();
    if (this.container) {
      this.container.innerHTML = '';
    }
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
