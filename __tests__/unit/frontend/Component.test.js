/**
 * @jest-environment jsdom
 */

import { Component } from '../../../public/js/components/base/Component.js';

describe('Component Base Class', () => {
  let component;
  let container;

  beforeEach(() => {
    document.body.innerHTML = '<div id="test-container"></div>';
    container = document.getElementById('test-container');

    class TestComponent extends Component {
      render() {
        this.setHTML('<p>Test Content</p>');
      }
    }

    component = new TestComponent('test-container');
  });

  afterEach(() => {
    if (component) {
      component.destroy();
    }
  });

  test('should initialize with container', () => {
    expect(component.container).toBe(container);
  });

  test('should set state', () => {
    component.setState({ test: 'value' });
    expect(component.state.test).toBe('value');
  });

  test('should set HTML content', () => {
    component.render();
    expect(container.innerHTML).toBe('<p>Test Content</p>');
  });

  test('should emit custom events', (done) => {
    document.addEventListener('test-event', (e) => {
      expect(e.detail.data).toBe('test');
      done();
    });

    component.emit('test-event', { data: 'test' });
  });

  test('should listen to events', (done) => {
    component.on('custom-event', (e) => {
      expect(e.detail.value).toBe('test');
      done();
    });

    const event = new CustomEvent('custom-event', { detail: { value: 'test' } });
    document.dispatchEvent(event);
  });

  test('should clean up event listeners on destroy', () => {
    const button = document.createElement('button');
    container.appendChild(button);

    let clicked = false;
    const handler = () => { clicked = true; };

    component.addEventListener(button, 'click', handler);
    component.destroy();

    button.click();
    expect(clicked).toBe(false);
    expect(container.innerHTML).toBe('');
  });
});
