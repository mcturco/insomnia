import { type FormEvent, useState } from 'react';

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function PasscodeGate({ expectedHash, onAuthed }: { expectedHash: string; onAuthed: () => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(false);
    const hash = await sha256(value);
    if (hash === expectedHash) {
      onAuthed();
    } else {
      setError(true);
      setValue('');
      setChecking(false);
    }
  }

  return (
    <div style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif' }} className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-white text-xl font-semibold tracking-wide mb-1">Insomnia</div>
          <div className="text-neutral-500 text-sm">Research Preview · Access Required</div>
        </div>
        <form onSubmit={handleSubmit} className="bg-[#252525] border border-neutral-700 rounded-xl p-8 space-y-5">
          <div>
            <label className="block text-neutral-300 text-sm font-medium mb-2">Passcode</label>
            <input
              type="password"
              value={value}
              onChange={e => { setValue(e.target.value); setError(false); }}
              className={[
                'w-full bg-[#1a1a1a] text-white rounded-lg px-3 py-2.5 text-sm border',
                'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent',
                error ? 'border-red-500' : 'border-neutral-600',
              ].join(' ')}
              placeholder="Enter passcode"
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
            {error && (
              <p className="text-red-400 text-xs mt-1.5">Incorrect passcode — try again.</p>
            )}
          </div>
          <button
            type="submit"
            disabled={!value || checking}
            className="w-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
          >
            {checking ? 'Checking…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
