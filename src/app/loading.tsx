"use client";

import React from "react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090b]">
      <div className="w-5 h-5 border border-zinc-800 border-t-zinc-300 rounded-full animate-spin" />
    </div>
  );
}

