

## Plan: Voice Conversation Layout — Fullscreen Mobile, Chat-Panel-Only Desktop

### Problem
Currently `VoiceConversation` uses `fixed inset-0 z-50` which covers the entire screen on all devices. The user wants:
- **Mobile**: Full screen (current behavior is fine)
- **Desktop**: Only cover the chat panel area, not the sidebar or top bar

### Approach

The `VoiceConversation` is rendered inside `ChatInput`, which is inside the chat panel of `ChatContainer`. Instead of `fixed inset-0`, it should use `absolute inset-0` on desktop so it only covers its parent container (the chat panel), while remaining `fixed inset-0` on mobile for full-screen coverage.

### Changes

**1. `src/components/chat/VoiceConversation.tsx`** (line 326)
- Change the root container from `fixed inset-0` to responsive: `fixed inset-0 md:absolute md:inset-0`
- This makes it fullscreen on mobile (fixed) but contained within the chat panel on desktop (absolute)

**2. `src/components/chat/ChatContainer.tsx`**
- Ensure the chat panel wrapper div has `relative` positioning so the absolute-positioned voice overlay is contained within it
- Add `relative` to the `chatPanel` wrapper (line 180): `<div className="flex flex-col h-full relative">`

**3. `src/components/chat/ChatInput.tsx`**
- The VoiceConversation is rendered as a sibling inside ChatInput. We need to ensure it renders at the chat panel level. Move the VoiceConversation render up or keep it but ensure the parent chain has `relative` + `overflow-hidden` on the chat panel.

Actually, since ChatInput is inside the chatPanel div, and we add `relative` to chatPanel, the `absolute inset-0` on desktop will correctly fill just the chat panel area. On mobile with `fixed inset-0` it will cover the whole screen.

### Files Modified
| File | Change |
|------|--------|
| `src/components/chat/VoiceConversation.tsx` | Change `fixed inset-0` to `fixed inset-0 md:absolute md:inset-0` on root div |
| `src/components/chat/ChatContainer.tsx` | Add `relative` class to chatPanel wrapper div |

