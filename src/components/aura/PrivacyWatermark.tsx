"use client";

import React from 'react';

/**
 * @fileOverview Aura Privacy Watermark.
 * A subtle, semi-transparent overlay to deter screenshots of sensitive media.
 */

export function PrivacyWatermark() {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden flex items-center justify-center opacity-[0.08] select-none">
      <div className="grid grid-cols-2 gap-12 rotate-[-45deg] scale-150">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="text-[10px] font-black uppercase tracking-[0.3em] whitespace-nowrap text-white">
            Aura Protected
          </span>
        ))}
      </div>
    </div>
  );
}
