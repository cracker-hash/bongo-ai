
The dots show `opacity-60` in code but user says they're invisible. Looking at the screenshot — the chat items have no visible dots at all, even on the active "You Whatsapp" item.

Likely cause: The `ChatMenu` component isn't being rendered in the Sidebar, OR the button color (`text-muted-foreground`) blends into the dark background making 60% opacity effectively invisible.

I need to inspect `Sidebar.tsx` to confirm ChatMenu is actually rendered next to each chat item.

## Plan

1. **Verify ChatMenu is rendered** in `src/components/layout/Sidebar.tsx` for each chat history row. If missing, wire it in.

2. **Fix visibility** in `src/components/chat/ChatMenu.tsx`:
   - Change `opacity-60` → `opacity-100` (always fully visible)
   - Change `text-muted-foreground` → `text-sidebar-foreground/70` so dots have proper contrast against the dark sidebar
   - Keep `hover:bg-sidebar-accent` for hover feedback

3. **Ensure layout** — the chat row must use `flex items-center justify-between` so the dots sit on the right side of each item (as in the original screenshot reference).

### Result
Three dots clearly visible in light gray on every chat history item at all times, brightening on hover, opening the existing dropdown on click.
