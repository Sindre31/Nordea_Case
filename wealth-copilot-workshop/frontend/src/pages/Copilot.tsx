import { useEffect, useRef, useState } from 'react'
import { useCustomerContext } from '../context/CustomerContext'
import { askCopilot } from '../api/client'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

const SUGGESTED_QUESTIONS = [
  'How has my portfolio performed?',
  'Why has my risk increased?',
  'Am I diversified?',
  'How much am I saving every month?',
  'What are the largest risks in my portfolio?',
]

export default function Copilot() {
  const { selectedCustomerId, selectedCustomer } = useCustomerContext()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        text: `Hi${selectedCustomer ? ` ${selectedCustomer.first_name}` : ''}! I'm your Wealth Copilot. Ask me about your portfolio performance, risk, diversification or savings.`,
      },
    ])
  }, [selectedCustomerId, selectedCustomer])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    if (!selectedCustomerId || !text.trim() || sending) return
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', text }])
    setInput('')
    setSending(true)
    try {
      const reply = await askCopilot(selectedCustomerId, text)
      setMessages((prev) => [...prev, { role: 'assistant', text: reply.answer }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="page">
      <div className="page-heading">
        <p className="eyebrow">Deterministic today, LLM-ready by design</p>
        <h2>Wealth Copilot</h2>
      </div>

      <div className="copilot-suggestions">
        {SUGGESTED_QUESTIONS.map((question) => (
          <button key={question} onClick={() => sendMessage(question)} disabled={sending}>
            {question}
          </button>
        ))}
      </div>

      <div className="copilot-chat">
        <div className="copilot-chat__messages" ref={listRef}>
          {messages.map((message, index) => (
            <div key={index} className={`copilot-message copilot-message--${message.role}`}>
              {message.text}
            </div>
          ))}
          {sending && <div className="copilot-message copilot-message--assistant copilot-message--pending">Thinking...</div>}
        </div>
        {error && <p className="error-state">{error}</p>}
        <form
          className="copilot-chat__input"
          onSubmit={(event) => {
            event.preventDefault()
            sendMessage(input)
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about your finances..."
            aria-label="Ask the Wealth Copilot"
          />
          <button type="submit" disabled={sending || !input.trim()}>Send</button>
        </form>
      </div>
    </div>
  )
}
