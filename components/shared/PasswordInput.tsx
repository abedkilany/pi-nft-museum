'use client';

import { useId, useState, type InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function PasswordInput({ label, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <label className="full-width">
      <span>{label}</span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
        <input id={id} {...props} type={visible ? 'text' : 'password'} />
        <button
          className="button secondary"
          type="button"
          onClick={() => setVisible((value) => !value)}
          style={{ minWidth: '86px' }}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </label>
  );
}
