
"use client";
import React, { useState } from "react";

export default function WhitepaperPage() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim()) {
      setError("Please enter your name and email.");
      return;
    }
    // Here you would send the data to your backend or a service like Hubspot
    setSubmitted(true);
  };

  return (
    <section className="min-h-[80vh] bg-bg-base py-24 px-4 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-bg-surface border border-bg-border rounded-2xl p-10 shadow-lg">
        <h1 className="font-display text-[36px] md:text-[48px] text-text-primary mb-6">Provd Whitepaper</h1>
        <p className="font-sans text-[16px] text-text-secondary mb-8">
          Download the full Provd whitepaper to learn about our fraud-intelligence architecture, counterparty scoring models, and compliance design for African P2P crypto markets.
        </p>
        {submitted ? (
          <div className="text-center">
            <div className="font-sans text-[16px] text-accent mb-4">Thank you! Your download is starting...</div>
            <a
              href="/assets/home/provd-whitepaper.pdf"
              className="font-mono text-[15px] text-accent underline hover:text-accent-blue"
              download
            >
              Click here if your download does not start automatically
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <label className="block font-sans text-[14px] text-text-primary mb-1">Name</label>
              <input
                type="text"
                className="w-full bg-bg-base border border-bg-border rounded px-4 py-3 text-text-primary font-sans text-[15px] focus-visible:ring-2 focus-visible:ring-accent outline-none"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block font-sans text-[14px] text-text-primary mb-1">Email</label>
              <input
                type="email"
                className="w-full bg-bg-base border border-bg-border rounded px-4 py-3 text-text-primary font-sans text-[15px] focus-visible:ring-2 focus-visible:ring-accent outline-none"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            {error && <div className="text-risk-red font-sans text-[14px]">{error}</div>}
            <button
              type="submit"
              className="bg-accent text-[#07090E] font-sans font-medium text-[15px] px-7 py-3 rounded-[4px] transition hover:brightness-110 hover:-translate-y-[1px] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              Download Whitepaper
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
