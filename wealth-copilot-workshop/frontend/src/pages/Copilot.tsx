import { useEffect, useRef, useState } from 'react'
import { useCustomerContext } from '../context/CustomerContext'
import { askCopilot } from '../api/client'
import { SendIcon, SparkIcon } from '../components/Icons'
import { PageHeading } from '../components/ui'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  sources?: string[]
  followUps?: string[]
}

const SUGGESTED_QUESTIONS = [
  'Hvorfor endret porteføljen min seg?',
  'Hvor kommer risikoen min fra?',
  'Er jeg i rute til å nå målet mitt?',
  'Er jeg godt nok diversifisert?',
  'Hvor mye sparer jeg hver måned?',
]

export default function Copilot() {
  const { selectedCustomerId, selectedCustomer } = useCustomerContext()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      text: `Hei${selectedCustomer ? ` ${selectedCustomer.first_name}` : ''}! Jeg kan forklare hvorfor porteføljen din har endret seg, hvor risikoen din kommer fra, og om du er i rute til å nå målene dine. Hvert svar viser hvilke av dataene dine det bygger på.`,
    }])
  }, [selectedCustomerId, selectedCustomer])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  async function sendMessage(text: string) {
    if (!selectedCustomerId || !text.trim() || sending) return
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', text }])
    setInput('')
    setSending(true)
    try {
      const reply = await askCopilot(selectedCustomerId, text)
      setMessages((prev) => [...prev, { role: 'assistant', text: reply.answer, sources: reply.sources, followUps: reply.follow_ups }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="page">
      <PageHeading eyebrow="Regelbasert i dag, klar for språkmodell" title="Spør Copilot"
        lead="Svarene beregnes fra dine egne data med åpne regler. Ingen ekstern KI, og ingenting er gjettet." />
      <section className="panel chat">
        <div className="chat__messages" ref={listRef} aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`msg msg--${m.role}`}>
              {m.role === 'assistant' && <span className="avatar"><SparkIcon size={14} /></span>}
              <div className="msg__bubble">
                {m.text}
                {m.sources && m.sources.length > 0 && (
                  <div className="msg__sources">
                    Hvorfor ser jeg dette? Basert på:
                    <ul>{m.sources.map((s) => <li key={s}>{s}</li>)}</ul>
                  </div>
                )}
                {m.followUps && m.followUps.length > 0 && i === messages.length - 1 && (
                  <div className="msg__followups">
                    {m.followUps.map((f) => <button key={f} type="button" className="chip" onClick={() => sendMessage(f)} disabled={sending}>{f}</button>)}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="msg msg--assistant">
              <span className="avatar"><SparkIcon size={14} /></span>
              <div className="msg__bubble"><span className="typing" aria-label="Tenker"><span /><span /><span /></span></div>
            </div>
          )}
        </div>
        {messages.length <= 1 && (
          <div className="chat__suggestions">
            {SUGGESTED_QUESTIONS.map((q) => <button key={q} type="button" className="chip" onClick={() => sendMessage(q)} disabled={sending}>{q}</button>)}
          </div>
        )}
        {error && <p className="state--error small" style={{ padding: '0 24px 8px' }} role="alert">{error}</p>}
        <form className="chat__input" onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Spør om økonomien din …" aria-label="Spør Wealth Copilot" />
          <button type="submit" className="btn btn--primary row" style={{ gap: 6 }} disabled={sending || !input.trim()}><SendIcon size={16} /> Send</button>
        </form>
      </section>
    </div>
  )
}
