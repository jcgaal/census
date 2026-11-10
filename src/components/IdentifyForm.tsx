import { useRef, useState, type FormEvent } from 'react';
import { useT } from '../i18n/lang';
import { site } from '../site.config';
import { useStoreApi } from '../tracking/store';

// The identify form asks for an email and an optional name and
// company, then calls onIdentified once the store has merged the
// anonymous history, so the section can print what happened next.
export function IdentifyForm({ onIdentified }: { onIdentified: () => void }) {
  const store = useStoreApi();
  const t = useT().s06;
  const started = useRef(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [busy, setBusy] = useState(false);

  // Form Started fires once, on the first focus, the way form analytics
  // tools report it. It records that the form was touched, never
  // what the visitor typed into any one of the fields inside it.
  const onFocus = () => {
    if (started.current) return;
    started.current = true;
    store.track('Form Started', { form: 'identify' });
  };

  // Submitting hands the email to the store, which hashes it and merges
  // the anonymous history into a profile. The address stays in this
  // browser and is never sent to the server that hosts this page.
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    await store.identify(email, name, company);
    setBusy(false);
    onIdentified();
  };

  return (
    <div className="card">
      <form className="form" onSubmit={submit} onFocus={onFocus} noValidate={false} autoComplete="off">
        <label>
          <span className="label">{t.email}</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} />
        </label>
        <label>
          <span className="label">{t.name}</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.optional} />
        </label>
        <label>
          <span className="label">{t.company}</span>
          <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t.optional} />
        </label>
        <div className="form__actions">
          <button className="pill pill--black" type="submit" disabled={busy}>
            {t.submit}
          </button>
          <span className="form__note">{site.outputs.length ? t.noteOutputs(site.outputs.map((o) => o.name)) : t.note}</span>
        </div>
      </form>
    </div>
  );
}
