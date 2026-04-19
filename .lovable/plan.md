

The user wants the 3-dot menu on chat history items to:
1. Always be visible (not just on hover)
2. Show a dropdown matching the uploaded screenshot: Share, Start a group chat, Rename, Move to project (with submenu arrow), Pin chat, Archive, Delete (red)

Looking at the existing `ChatMenu.tsx` — the dropdown content already matches the screenshot perfectly (same items, same order, same icons, Delete in red). The only issue is the trigger button visibility.

Current trigger classes:
```
opacity-0 group-hover/chat:opacity-100
```

This hides dots until hover. Need to make them always visible.

I need to find where ChatMenu is used in the Sidebar to confirm the `group/chat` wrapper exists and check styling consistency.

## Plan

### Single change in `src/components/chat/ChatMenu.tsx`

Update the `DropdownMenuTrigger` Button className:
- Remove `opacity-0 group-hover/chat:opacity-100`
- Replace with `opacity-60 hover:opacity-100` so dots are always visible but subtle, brightening on hover

### Result
- Three dots permanently visible on every chat history item
- Clicking opens the existing dropdown (already matches screenshot exactly: Share, Start a group chat, Rename, Move to project ▸, Pin chat, Archive, Delete)
- No other files need changes — the dropdown content is already implemented correctly

