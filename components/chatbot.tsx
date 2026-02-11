"use client"

import React from "react"

import { useState, useEffect, useRef } from "react"
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Loader2,
  GraduationCap,
  FileText,
  DollarSign,
  ClipboardCheck,
  BookOpen,
  Lightbulb,
} from "lucide-react"

const API_URL = "https://unrsponsoredprojectschatbot-f3h8adcrhbg7gtdx.canadacentral-01.azurewebsites.net/api/Chat"

interface Citation {
  title: string
  url: string
  snippet: string
  relevanceScore: number
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  fullContent?: string
  isTyping?: boolean
  citations?: Citation[]
  suggestedQuestions?: string[]
  timestamp: Date
}

const TYPING_CONFIG = {
  enableTypingEffect: true,
  wordsPerSecond: 15,
  bottomThreshold: 120,
}

interface ConversationTurn {
  role: string
  content: string
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm the UNR Sponsored Projects Assistant. I can answer questions about grants, proposals, awards, compliance, and anything related to sponsored projects at the University of Nevada, Reno. How can I help you today?",
  suggestedQuestions: [
    "What is a sponsored project?",
    "What is the pre-award process?",
    "How do I develop my budget?",
    "How do I set up a subaward?",
  ],
  timestamp: new Date(),
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function parseMarkdownText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const combinedRegex = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g
  let lastIndex = 0
  let match
  let keyIndex = 0

  while ((match = combinedRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    if (match[1] && match[2]) {
      // Link: [text](url)
      parts.push(
        <a
          key={`link-${keyIndex++}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[#3B82F6] hover:text-[#1E40AF] transition-colors underline underline-offset-2"
        >
          {match[1]}
          <ExternalLink className="w-3 h-3" />
        </a>
      )
    } else if (match[3]) {
      // Bold: **text** — rendered as a sub-heading
      parts.push(
        <strong key={`bold-${keyIndex++}`} className="font-bold text-[#0A1628]">
          {match[3]}
        </strong>
      )
    } else if (match[4]) {
      // Inline code: `code`
      parts.push(
        <code
          key={`code-${keyIndex++}`}
          className="bg-[#F1F5F9] text-[#003366] text-xs px-1.5 py-0.5 rounded font-mono border border-[#E2E8F0]"
        >
          {match[4]}
        </code>
      )
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

function formatMarkdownBlock(text: string): React.ReactNode[] {
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let unorderedListItems: string[] = []
  let orderedListItems: string[] = []
  let inUnorderedList = false
  let inOrderedList = false
  let inCodeBlock = false
  let codeBlockLines: string[] = []

  const flushUnorderedList = () => {
    if (unorderedListItems.length > 0) {
      elements.push(
        <ul
          key={`ul-${elements.length}`}
          className="my-2 list-disc space-y-1.5 pl-5 text-[#1E293B]"
        >
          {unorderedListItems.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {parseMarkdownText(item)}
            </li>
          ))}
        </ul>
      )
      unorderedListItems = []
      inUnorderedList = false
    }
  }

  const flushOrderedList = () => {
    if (orderedListItems.length > 0) {
      elements.push(
        <ol
          key={`ol-${elements.length}`}
          className="my-2 list-decimal space-y-1.5 pl-5 text-[#1E293B]"
        >
          {orderedListItems.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {parseMarkdownText(item)}
            </li>
          ))}
        </ol>
      )
      orderedListItems = []
      inOrderedList = false
    }
  }

  const flushAll = () => {
    flushUnorderedList()
    flushOrderedList()
  }

  for (const line of lines) {
    const trimmed = line.trim()

    // Code block toggle (```)
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        // Close code block
        elements.push(
          <pre
            key={`codeblock-${elements.length}`}
            className="my-2 rounded-lg bg-[#0F172A] p-3 text-xs text-[#E2E8F0] font-mono overflow-x-auto border border-[#1E293B]"
          >
            <code>{codeBlockLines.join("\n")}</code>
          </pre>
        )
        codeBlockLines = []
        inCodeBlock = false
      } else {
        flushAll()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockLines.push(line)
      continue
    }

    // Horizontal rule: --- or ***
    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushAll()
      elements.push(
        <hr key={`hr-${elements.length}`} className="my-3 border-t border-[#E2E8F0]" />
      )
      continue
    }

    // Headings: ### as main heading
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      flushAll()
      const level = headingMatch[1].length
      const headingText = headingMatch[2]
      if (level === 1) {
        elements.push(
          <h2
            key={`h-${elements.length}`}
            className="text-base font-bold text-[#003366] mt-3 mb-1.5 border-b border-[#E2E8F0] pb-1"
          >
            {parseMarkdownText(headingText)}
          </h2>
        )
      } else if (level <= 3) {
        // ### is main heading per user requirement
        elements.push(
          <h3
            key={`h-${elements.length}`}
            className="text-[15px] font-bold text-[#003366] mt-3 mb-1"
          >
            {parseMarkdownText(headingText)}
          </h3>
        )
      } else {
        elements.push(
          <h4
            key={`h-${elements.length}`}
            className="text-sm font-semibold text-[#1E293B] mt-2 mb-1"
          >
            {parseMarkdownText(headingText)}
          </h4>
        )
      }
      continue
    }

    // Ordered list items: 1. item, 2. item, etc.
    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (orderedMatch) {
      if (inUnorderedList) flushUnorderedList()
      inOrderedList = true
      orderedListItems.push(orderedMatch[1])
      continue
    }

    // Unordered list items: - item or * item
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (inOrderedList) flushOrderedList()
      inUnorderedList = true
      unorderedListItems.push(trimmed.slice(2))
      continue
    }

    // Non-list, non-heading line
    flushAll()
    if (trimmed === "") {
      elements.push(<div key={`spacer-${elements.length}`} className="h-2" />)
    } else {
      elements.push(
        <span key={`p-${elements.length}`} className="leading-relaxed block">
          {parseMarkdownText(trimmed)}
        </span>
      )
    }
  }
  flushAll()

  return elements
}

const quickTopics = [
  { icon: FileText, label: "Pre-award process", question: "What is the pre-award process?" },
  { icon: DollarSign, label: "Budget development", question: "How do I develop my budget?" },
  { icon: ClipboardCheck, label: "Post-award management", question: "How does post-award management work?" },
  { icon: BookOpen, label: "Subaward setup", question: "How do I set up a subaward?" },
]

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [sessionId] = useState(generateSessionId)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [mounted, setMounted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingSessionRef = useRef<number>(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasInteracted) {
        setIsOpen(true)
      }
    }, 3000)
    return () => clearTimeout(timer)
  }, [hasInteracted])

  const isNearBottom = (): boolean => {
    const container = messagesContainerRef.current
    if (!container) return true
    const { scrollTop, scrollHeight, clientHeight } = container
    return scrollHeight - scrollTop - clientHeight < TYPING_CONFIG.bottomThreshold
  }

  const scrollToBottom = (force: boolean = false) => {
    if (force || isNearBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }

  const startTypingEffect = (messageId: string, fullText: string) => {
    if (!TYPING_CONFIG.enableTypingEffect) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: fullText, fullContent: fullText, isTyping: false }
            : msg
        )
      )
      return
    }

    const words = fullText.split(/(\s+)/)
    const delayMs = 1000 / TYPING_CONFIG.wordsPerSecond
    const currentSession = ++typingSessionRef.current
    let wordIndex = 0

    const typeNextWord = () => {
      if (typingSessionRef.current !== currentSession) return

      if (wordIndex < words.length) {
        const currentText = words.slice(0, wordIndex + 1).join("")
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, content: currentText, isTyping: true } : msg
          )
        )
        wordIndex++
        scrollToBottom()
        setTimeout(typeNextWord, delayMs)
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, isTyping: false } : msg
          )
        )
      }
    }

    typeNextWord()
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages.length])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const getConversationHistory = (): ConversationTurn[] => {
    return messages
      .filter((m) => m.id !== "welcome")
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.fullContent || m.content }))
  }

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return

    typingSessionRef.current++

    setHasInteracted(true)
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: messageText.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    setTimeout(() => scrollToBottom(true), 50)

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText.trim(),
          sessionId,
          topK: 5,
          history: getConversationHistory(),
        }),
      })

      if (!response.ok) throw new Error("API request failed")

      const data = await response.json()

      const fullContent =
        data.answer || "I apologize, but I couldn't process your request."
      const botMessageId = `bot_${Date.now()}`

      const botMessage: Message = {
        id: botMessageId,
        role: "assistant",
        content: "",
        fullContent: fullContent,
        isTyping: true,
        citations: data.citations,
        suggestedQuestions: data.suggestedQuestions,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, botMessage])
      setTimeout(() => startTypingEffect(botMessageId, fullContent), 50)
    } catch {
      const errorContent =
        "I'm sorry, I encountered an error processing your request. Please try again or visit [unr.edu/sponsored-projects](https://www.unr.edu/sponsored-projects) for direct assistance."
      const errorMessageId = `error_${Date.now()}`

      const errorMessage: Message = {
        id: errorMessageId,
        role: "assistant",
        content: "",
        fullContent: errorContent,
        isTyping: true,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      setTimeout(() => startTypingEffect(errorMessageId, errorContent), 50)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    typingSessionRef.current++
    setMessages([
      { ...WELCOME_MESSAGE, id: `welcome_${Date.now()}`, timestamp: new Date() },
    ])
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textArea = document.createElement("textarea")
        textArea.value = text
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        textArea.style.top = "-999999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
      }

      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (err) {
      console.error("Failed to copy text:", err)
    }
  }

  const hasOnlyWelcome = messages.length === 1 && messages[0].id.startsWith("welcome")

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      <div
        className={`absolute bottom-16 right-0 transition-all duration-300 ${
          isFullscreen
            ? "w-[480px] max-w-[calc(100vw-3rem)]"
            : "w-[400px] max-w-[calc(100vw-3rem)]"
        } ${
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-[#003366]/30 bg-white">
          {/* Header */}
          <div className="bg-[#003366] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[#003366]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">
                    Sponsored Projects Assistant
                  </h3>
                  <p className="text-white/70 text-xs">
                    University of Nevada, Reno
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  title={isFullscreen ? "Minimize" : "Expand"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4 text-white" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-white" />
                  )}
                </button>

                <button
                  onClick={handleReset}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  title="Reset conversation"
                >
                  <RefreshCw className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            className={`overflow-y-auto p-4 space-y-4 bg-[#F1F5F9] scrollbar-thin ${
              isFullscreen ? "h-[520px]" : "h-[400px]"
            }`}
          >
            {/* Welcome Screen with Quick Topics */}
            {hasOnlyWelcome && (
              <div className="animate-fade-in-up">
                {/* Welcome message bubble */}
                <div className="flex gap-2 flex-row">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#003366]">
                    <Sparkles className="w-4 h-4 text-[#60A5FA]" />
                  </div>
                  <div className="max-w-[80%] text-left">
                    <div className="p-3 text-sm leading-relaxed bg-white text-[#1E293B] rounded-2xl rounded-tl-sm shadow-sm border border-[#E2E8F0]">
                      {WELCOME_MESSAGE.content}
                    </div>
                    <p className="text-[10px] text-[#94A3B8] mt-1 px-1">
                      {mounted ? formatTime(WELCOME_MESSAGE.timestamp) : "\u00A0"}
                    </p>
                  </div>
                </div>

                {/* Quick topic cards */}
                <div className="mt-4 grid grid-cols-2 gap-2 px-10">
                  {quickTopics.map((topic) => (
                    <button
                      key={topic.label}
                      onClick={() => sendMessage(topic.question)}
                      className="group flex flex-col items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white p-3 text-center shadow-sm transition-all hover:border-[#3B82F6] hover:shadow-md"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#003366]/10 transition-colors group-hover:bg-[#3B82F6]/10">
                        <topic.icon className="h-4 w-4 text-[#003366] transition-colors group-hover:text-[#3B82F6]" />
                      </div>
                      <span className="text-[11px] font-medium text-[#1E293B]">
                        {topic.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Suggested questions */}
                {WELCOME_MESSAGE.suggestedQuestions && (
                  <div className="mt-3 flex flex-wrap gap-2 px-10">
                    {WELCOME_MESSAGE.suggestedQuestions.map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(question)}
                        className="text-xs px-3 py-1.5 rounded-full border border-[#003366]/20 bg-[#003366]/5 text-[#003366] hover:bg-[#003366]/10 hover:scale-105 transition-all"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conversation Messages */}
            {!hasOnlyWelcome &&
              messages.map((message) => (
                <div key={message.id} className="animate-fade-in-up">
                  <div
                    className={`flex gap-2 ${
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        message.role === "user"
                          ? "bg-[#003366]"
                          : "bg-[#003366]"
                      }`}
                    >
                      {message.role === "user" ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-[#60A5FA]" />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[80%] min-w-0 ${
                        message.role === "user" ? "text-right" : "text-left"
                      }`}
                    >
                      <div className="relative group">
                        <div
                          className={`p-3 text-sm leading-relaxed ${
                            message.role === "user"
                              ? "bg-[#003366] text-white rounded-2xl rounded-tr-sm"
                              : "bg-white text-[#1E293B] rounded-2xl rounded-tl-sm shadow-sm border border-[#E2E8F0]"
                          }`}
                        >
                          <div className="whitespace-pre-wrap break-words">
                            {message.role === "user" ? (
                              message.content
                            ) : (
                              <div className="space-y-1">
                                {formatMarkdownBlock(message.content)}
                              </div>
                            )}
                            {message.isTyping && message.role === "assistant" && (
                              <span className="inline-block w-0.5 h-4 bg-[#3B82F6] ml-0.5 animate-pulse" />
                            )}
                          </div>
                        </div>

                        {/* Copy Button */}
                        {message.role === "assistant" &&
                          !message.isTyping &&
                          message.content && (
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  message.fullContent || message.content,
                                  message.id
                                )
                              }
                              className={`absolute bottom-2 right-2 p-1.5 rounded-md border transition-all duration-200 ${
                                copiedMessageId === message.id
                                  ? "bg-green-500/20 text-green-600 border-green-300 opacity-100"
                                  : "bg-white/80 backdrop-blur-sm text-[#94A3B8] border-[#E2E8F0] hover:bg-white hover:text-[#1E293B] opacity-0 group-hover:opacity-100"
                              }`}
                              title={
                                copiedMessageId === message.id
                                  ? "Copied!"
                                  : "Copy message"
                              }
                            >
                              {copiedMessageId === message.id ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                      </div>

                      {/* Timestamp */}
                      <p className="text-[10px] text-[#94A3B8] mt-1 px-1">
                        {mounted ? formatTime(message.timestamp) : "\u00A0"}
                      </p>

                      {/* Citations */}
                      {message.citations &&
                        message.citations.length > 0 &&
                        !message.isTyping && (
                          <div className="mt-2 space-y-1.5 px-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8] flex items-center gap-1">
                              <Lightbulb className="h-3 w-3" />
                              Sources
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {message.citations.map((citation, i) => (
                                <a
                                  key={i}
                                  href={citation.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group/cite flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-[10px] text-[#1E293B] shadow-sm transition-colors hover:border-[#3B82F6] hover:bg-[#EFF6FF]"
                                >
                                  <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-[#003366] text-[8px] font-bold text-white">
                                    {i + 1}
                                  </span>
                                  <span className="max-w-[150px] truncate">
                                    {citation.title.replace(
                                      " | Sponsored Projects | University of Nevada, Reno",
                                      ""
                                    )}
                                  </span>
                                  <ExternalLink className="h-2.5 w-2.5 text-[#94A3B8] transition-colors group-hover/cite:text-[#3B82F6]" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Suggested Questions */}
                      {message.suggestedQuestions &&
                        message.suggestedQuestions.length > 0 &&
                        !message.isTyping && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {[...new Set(message.suggestedQuestions)].map(
                              (question, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => sendMessage(question)}
                                  className="text-xs px-3 py-1.5 rounded-full border border-[#003366]/20 bg-[#003366]/5 text-[#003366] hover:bg-[#003366]/10 hover:scale-105 transition-all"
                                >
                                  {question}
                                </button>
                              )
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ))}

            {/* Loading State */}
            {isLoading && (
              <div className="flex gap-2 animate-fade-in-up">
                <div className="w-8 h-8 rounded-full bg-[#003366] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#60A5FA]" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm py-3 px-5 flex items-center gap-1.5 shadow-sm border border-[#E2E8F0]">
                  <span
                    className="w-2 h-2 rounded-full bg-[#003366] animate-bounce"
                    style={{ animationDuration: "1.4s", animationDelay: "0s" }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-[#003366] animate-bounce"
                    style={{ animationDuration: "1.4s", animationDelay: "0.2s" }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-[#003366] animate-bounce"
                    style={{ animationDuration: "1.4s", animationDelay: "0.4s" }}
                  />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-[#E2E8F0] bg-white">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && sendMessage(inputValue)
                }
                placeholder="Ask about sponsored projects..."
                disabled={isLoading}
                className="flex-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-full px-4 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 transition-all disabled:opacity-50"
                aria-label="Chat message input"
              />
              <button
                onClick={() => sendMessage(inputValue)}
                disabled={!inputValue.trim() || isLoading}
                className="w-10 h-10 rounded-full bg-[#003366] flex items-center justify-center hover:bg-[#003366]/90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-[#94A3B8] text-center mt-2">
              Powered by RAG - UNR Sponsored Projects Knowledge Base
            </p>
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          setHasInteracted(true)
        }}
        className={`flex items-center gap-2 transition-all duration-300 hover:scale-105 shadow-lg ${
          isOpen
            ? "w-12 h-12 rounded-full bg-[#1E293B] hover:bg-[#334155] justify-center"
            : "px-5 py-3 rounded-full bg-[#003366] hover:shadow-[0_0_30px_rgba(0,51,102,0.4)]"
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <>
            <MessageCircle className="w-5 h-5 text-white" />
            <span className="text-white font-bold text-sm">Ask SP Assistant</span>
            {!hasInteracted && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            )}
          </>
        )}
      </button>
    </div>
  )
}
