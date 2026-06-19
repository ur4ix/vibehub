// Tiny event bus so any component can open the floating chat widget
// (optionally to a specific user) without prop-drilling or a global store.

export const OPEN_CHAT_EVENT = 'vydex:open-chat'

export function openChat(username?: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT, { detail: { username } }))
}
