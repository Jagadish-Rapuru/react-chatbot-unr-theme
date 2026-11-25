# react-chatbot-unr-theme

A chat UI for the Sponsored Projects Assistant at the University of Nevada, Reno. You ask a question about sponsored projects and the assistant answers from a RAG knowledge base, with its sources.

## What it does

- Chat window with quick topics: pre-award process, budget development, post-award management and subaward setup
- Answers shown as markdown with a typing effect
- Citations under each answer, with title, link and snippet
- Suggested follow-up questions
- Copy an answer or clear the chat
- Sends the chat history with every request, so follow-up questions keep their context
- Shows an error message when the backend can't be reached

## Tech stack

- Next.js 16 and React 19, in TypeScript
- Tailwind CSS
- shadcn/ui components on Radix UI
- lucide-react icons

## Project structure

```
app/                     layout, page and global styles
components/chatbot.tsx   the chat UI and the API call
components/ui/           shadcn/ui components
lib/utils.ts             helpers
```

## How to run

```
pnpm install
pnpm dev
```

Then open http://localhost:3000 in the browser.

## Backend

This repo is only the frontend. The chat API address is set in `API_URL` at the top of `components/chatbot.tsx`, so change it to point to your own backend.

The UI sends a POST request with `message`, `sessionId`, `topK` and `history`. It expects a JSON response with the answer, the citations and the suggested questions.
