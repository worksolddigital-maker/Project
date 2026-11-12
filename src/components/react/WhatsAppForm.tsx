import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { EASE } from './events';
import './whatsapp-form.css';

interface Props {
  phone: string;
  procedures: string[];
}

/**
 * Pré-agendamento: monta uma mensagem e abre o WhatsApp.
 * Nada é enviado a servidores nem armazenado no site (LGPD).
 */
export default function WhatsAppForm({ phone, procedures }: Props) {
  const id = useId();
  const [name, setName] = useState('');
  const [interest, setInterest] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sentUrl, setSentUrl] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Informe seu nome para continuar.');
      document.getElementById(`${id}-name`)?.focus();
      return;
    }
    setError('');
    const parts = [
      `Olá, Letícia! Meu nome é ${name.trim()}.`,
      interest
        ? `Gostaria de agendar uma avaliação — tenho interesse em ${interest.toLowerCase()}.`
        : 'Gostaria de agendar uma avaliação.',
      message.trim(),
    ].filter(Boolean);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(parts.join('\n\n'))}`;
    window.open(url, '_blank', 'noopener');
    setSentUrl(url);
  };

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.6, ease: EASE }}>
      <div className="waf">
        <AnimatePresence mode="wait" initial={false}>
          {sentUrl ? (
            <motion.div
              key="done"
              className="waf__done"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              role="status"
            >
              <span className="waf__done-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <motion.path
                    d="M5 12.5 10 17.5 19.5 7"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
                  />
                </svg>
              </span>
              <p className="waf__done-title">Sua mensagem está pronta no WhatsApp.</p>
              <p className="waf__done-text">
                Se a conversa não abriu automaticamente,{' '}
                <a href={sentUrl} target="_blank" rel="noopener">
                  toque aqui para abrir
                </a>
                .
              </p>
              <button type="button" className="waf__again" onClick={() => setSentUrl(null)}>
                Escrever outra mensagem
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              className="waf__form"
              onSubmit={submit}
              noValidate
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <p className="waf__title">Pré-agendamento</p>
              <p className="waf__intro">Preencha e continue a conversa direto no WhatsApp.</p>

              <div className={`waf__field${error ? ' has-error' : ''}`}>
                <input
                  id={`${id}-name`}
                  name="nome"
                  type="text"
                  autoComplete="name"
                  placeholder=" "
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${id}-error` : undefined}
                  required
                />
                <label htmlFor={`${id}-name`}>Seu nome</label>
              </div>
              <AnimatePresence>
                {error && (
                  <motion.p
                    id={`${id}-error`}
                    className="waf__error"
                    role="alert"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="waf__field waf__field--select">
                <select
                  id={`${id}-interest`}
                  name="interesse"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  data-filled={interest ? 'true' : 'false'}
                >
                  <option value="">Ainda não sei — quero uma avaliação</option>
                  {procedures.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <label htmlFor={`${id}-interest`}>Interesse</label>
                <svg className="waf__chevron" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>

              <div className="waf__field">
                <textarea
                  id={`${id}-message`}
                  name="mensagem"
                  rows={3}
                  placeholder=" "
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <label htmlFor={`${id}-message`}>Mensagem (opcional)</label>
              </div>

              <motion.button type="submit" className="waf__submit" whileTap={{ scale: 0.98 }}>
                <span>Continuar no WhatsApp</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 12h15.5M13.5 5.5 20 12l-6.5 6.5" />
                </svg>
              </motion.button>
              <p className="waf__privacy">
                O WhatsApp abrirá com sua mensagem pronta. Nenhum dado é armazenado neste site.
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
