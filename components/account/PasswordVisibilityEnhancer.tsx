'use client';

import { useEffect } from 'react';

export function PasswordVisibilityEnhancer() {
  useEffect(() => {
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-password-toggle]'));

    function attach(button: HTMLButtonElement) {
      const handler = () => {
        const wrapper = button.closest('.password-field');
        const input = wrapper?.querySelector<HTMLInputElement>('[data-password-input]');
        if (!input) return;
        const nextType = input.type === 'password' ? 'text' : 'password';
        input.type = nextType;
        button.textContent = nextType === 'password' ? 'Show' : 'Hide';
      };

      button.addEventListener('click', handler);
      return () => button.removeEventListener('click', handler);
    }

    const cleanups = buttons.map(attach);
    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return null;
}
