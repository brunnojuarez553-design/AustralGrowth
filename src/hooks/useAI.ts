import { useState, useCallback } from 'react'
import type { AIMessage } from '@/types'

export function useDirectorAI() {
  const [messages, setMessages] = useState<AIMessage[]>([{
    role: 'assistant',
    content: 'Hola, soy tu Director Comercial IA. Revisé tu pipeline y tengo insights clave para esta semana. ¿Por dónde querés empezar?',
  }])
  const [isStreaming, setIsStreaming] = useState(false)

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: AIMessage = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setIsStreaming(true)

    const assistantMsg: AIMessage = { role: 'assistant', content: '' }
    setMessages([...newMessages, assistantMsg])

    try {
      const res = await fetch('/api/ai/director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok) throw new Error('AI request failed')

      const reader = res.body?.getReader()
      if (!reader) return

      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content ?? ''
            fullContent += delta
            setMessages(prev => [
              ...prev.slice(0, -1),
              { role: 'assistant', content: fullContent },
            ])
          } catch {}
        }
      }
    } catch (error) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Error al procesar la respuesta. Intentá de nuevo.' },
      ])
    } finally {
      setIsStreaming(false)
    }
  }, [messages])

  return { messages, sendMessage, isStreaming }
}

export function useGenerateMessage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedMessage, setGeneratedMessage] = useState('')

  const generate = useCallback(async (leadId: string, channel: 'whatsapp' | 'email' | 'call_script', context?: string) => {
    setIsGenerating(true)
    setGeneratedMessage('')
    try {
      const res = await fetch('/api/ai/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, channel, context }),
      })
      const { data } = await res.json()
      setGeneratedMessage(data.message)
      return data.message
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return { generate, isGenerating, generatedMessage }
}
