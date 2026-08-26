'use client';

/**
 * @fileOverview A client-safe event emitter for Aura error synchronization.
 * Replaces Node.js 'events' to prevent polyfill-related ReferenceErrors.
 */

type Listener = (data: any) => void;

class AuraErrorEmitter {
  private listeners: Record<string, Listener[]> = {};

  on(event: string, listener: Listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(listener);
  }

  off(event: string, listener: Listener) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== listener);
  }

  emit(event: string, data: any) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(l => l(data));
  }
}

export const errorEmitter = new AuraErrorEmitter();
