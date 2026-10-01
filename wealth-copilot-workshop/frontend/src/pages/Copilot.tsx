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
  'Why did my portfolio change?',
  'Where does my risk come from?',
  'Am I on track for my goal?',
  'Am I diversified?',
  'How much am I saving every month?',
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
      text: `Hi${selectedCustomer ? ` ${selectedCustomer.first_name}` : ''}! I can explain why your portfolio moved, where your risk comes from, and whether you are on track for your goals. Every answer shows which of your data it used.`,
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
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="page">
      <PageHeading eyebrow="Deterministic today, LLM-ready by design" title="Ask Copilot"
        lead="Answers are calculated from your own data with transparent rules - no external AI, and nothing is guessed." />
      <section className="panel chat">
        <div className="chat__messages" ref={listRef} aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`msg msg--${m.role}`}>
              {m.role === 'assistant' && <span className="avatar"><SparkIcon size={14} /></span>}
              <div className="msg__bubble">
                {m.text}
                {m.sources && m.sources.length > 0 && (
                  <div className="msg__sources">
                    Why am I seeing this? Based on:
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
              <div className="msg__bubble"><span className="typing" aria-label="Thinking"><span /><span /><span /></span></div>
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
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your finances..." aria-label="Ask the Wealth Copilot" />
          <button type="submit" className="btn btn--primary row" style={{ gap: 6 }} disabled={sending || !input.trim()}><SendIcon size={16} /> Send</button>
        </form>
      </section>
    </div>
  )
}
