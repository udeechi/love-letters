"use client";

import Book from "@/components/Book";
import { Toaster } from "react-hot-toast";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Book />
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#1a0d12",
            color: "#e8dcc8",
            border: "1px solid rgba(212, 175, 55, 0.2)",
            fontFamily: "var(--font-lora)",
          },
        }}
      />
    </main>
  );
}
