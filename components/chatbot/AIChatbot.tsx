'use client'

import { useState, useEffect, useRef } from 'react'

interface Message {
    text: string
    isBot: boolean
    timestamp: Date
}

export function AIChatbot() {
    const [messages, setMessages] = useState<Message[]>([
        {
            text: "Hi! I'm here to help you across the platform. Ask me anything!",
            isBot: true,
            timestamp: new Date(),
        },
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const chatContentRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (chatContentRef.current) {
            chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight
        }
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || loading) return

        const userMessage: Message = {
            text: input,
            isBot: false,
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])
        setInput('')
        setLoading(true)

        // Add typing indicator
        const typingMessage: Message = {
            text: 'Bot is typing...',
            isBot: true,
            timestamp: new Date(),
        }
        setMessages((prev) => [...prev, typingMessage])

        try {
            const response = await fetch('/api/chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: input }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get response')
            }

            // Remove typing indicator and add real response
            setMessages((prev) => {
                const withoutTyping = prev.slice(0, -1)
                return [
                    ...withoutTyping,
                    {
                        text: data.response,
                        isBot: true,
                        timestamp: new Date(),
                    },
                ]
            })
        } catch (error) {
            setMessages((prev) => {
                const withoutTyping = prev.slice(0, -1)
                return [
                    ...withoutTyping,
                    {
                        text: "I'm having trouble right now. Try asking about registration, NGO verification, or coverage areas.",
                        isBot: true,
                        timestamp: new Date(),
                    },
                ]
            })
        } finally {
            setLoading(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 bg-gradient-to-r from-[#00d1b2] to-[#009781] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-50"
                aria-label="Open chatbot"
            >
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                </svg>
            </button>
        )
    }

    return (
        <div className="ai-widget z-50">
            <div className="flex justify-between items-center mb-4">
                <p className="font-bold text-lg">🤖 Karachi Food Bot</p>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Close chatbot"
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            <div
                ref={chatContentRef}
                className="h-64 overflow-y-auto mb-4 space-y-3 text-sm"
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'var(--primary-glow) transparent',
                }}
            >
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`${msg.isBot ? 'text-left' : 'text-right'
                            } animate-fade-in`}
                    >
                        <div
                            className={`inline-block px-4 py-2 rounded-lg max-w-[85%] ${msg.isBot
                                ? 'bg-[#00d1b2]/20 text-[#00d1b2]'
                                : 'bg-[#ffdd57]/20 text-[#ffdd57]'
                                }`}
                        >
                            {msg.isBot && <strong className="block mb-1">Bot:</strong>}
                            {msg.text}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type here..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 outline-none focus:border-[#ffdd57] transition-all"
                    disabled={loading}
                />
                <button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="bg-gradient-to-r from-[#00d1b2] to-[#009781] text-white px-4 py-2 rounded-lg font-semibold hover:from-[#ffdd57] hover:to-[#ffb900] hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Go
                </button>
            </div>
        </div>
    )
}
