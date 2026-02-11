import { ChatBot } from "@/components/chatbot";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F1F5F9] p-8">
      <div className="text-center max-w-2xl">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#003366] shadow-lg mx-auto">
          <svg
            className="h-10 w-10 text-white"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
            <path d="M22 10v6" />
            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
          </svg>
        </div>
        <h1 className="mt-6 text-3xl font-bold text-[#0A1628] text-balance">
          UNR Sponsored Projects
        </h1>
        <p className="mt-3 text-[#475569] leading-relaxed max-w-lg mx-auto">
          Partnering with faculty and staff to provide the highest level of
          service and stewardship in support of the research enterprise at the
          University of Nevada, Reno.
        </p>
        <p className="mt-6 text-sm text-[#94A3B8]">
          Click the chat button in the bottom-right corner to get started.
        </p>
      </div>

      <ChatBot />
    </main>
  );
}
