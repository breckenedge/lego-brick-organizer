// Base Modal Component
import { Component } from './Component.js';

export class Modal extends Component {
  constructor(modalId) {
    super(modalId);
    this.modalElement = document.getElementById(modalId);
    this.setupBaseListeners();
  }

  setupBaseListeners() {
    if (!this.modalElement) return;

    // Close on close button
    const closeBtns = this.modalElement.querySelectorAll('.close-btn, .cancel-btn');
    closeBtns.forEach(btn => {
      this.addEventListener(btn, 'click', () => this.close());
    });

    // Close on outside click
    this.addEventListener(this.modalElement, 'click', (e) => {
      if (e.target === this.modalElement) {
        this.close();
      }
    });
  }

  open() {
    if (this.modalElement) {
      this.modalElement.classList.add('active');
      this.onOpen();
    }
  }

  close() {
    if (this.modalElement) {
      this.modalElement.classList.remove('active');
      this.onClose();
    }
  }

  onOpen() {
    // Override in child classes
  }

  onClose() {
    // Override in child classes
  }

  getFormData(formFields) {
    const data = {};
    formFields.forEach(field => {
      const element = document.getElementById(field.id);
      if (element) {
        data[field.name] = field.type === 'number'
          ? parseInt(element.value)
          : element.value.trim();
      }
    });
    return data;
  }

  clearForm(fieldIds) {
    fieldIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.value = '';
      }
    });
  }
}
