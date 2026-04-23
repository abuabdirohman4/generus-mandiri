# Plan: Sidebar Right-Click Context Menu (Open in New Tab)

**Date**: 2026-04-15  
**Feature**: Custom context menu on sidebar nav items that shows "Open in New Tab"  
**Scope**: 1 file modified (`AppSidebar.tsx`), ~80 lines added

---

## Problem Statement

The sidebar nav items use Next.js `<Link>` with a custom `onClick` that calls `e.preventDefault()` for regular left-clicks (to manage a loading state). While native browser right-click → "Open in new tab" works (because `href` is still present on the `<a>` tag), users expect a **polished custom context menu** similar to desktop apps — showing "Open in New Tab" as an explicit option. This is a UX enhancement.

---

## Goals

- Right-click on any sidebar nav item → show context menu with "Open in New Tab"
- Context menu appears at cursor position
- Clicking "Open in New Tab" opens the link in a new browser tab
- Clicking anywhere else closes the context menu
- Works for both expanded and collapsed sidebar states
- No new dependencies (vanilla React/DOM only)

---

## Out of Scope

- Submenu items (they already use plain `<Link>` and are less frequently used)
- Bottom "Dokumentasi" item (already opens in new tab via `target="_blank"`)
- Mobile sidebar (context menu less relevant on touch devices)

---

## Architecture

Single self-contained component `SidebarContextMenu` added to `AppSidebar.tsx`. No new files needed — the component is tightly coupled to the sidebar and has no reuse elsewhere.

State lives in `MenuItem` component:
- `contextMenu: { x: number; y: number; path: string } | null`
- Shown on `onContextMenu` event, dismissed on global click/Escape

---

## Implementation Plan

### Task 1 — Add `SidebarContextMenu` component (above `MenuItem`)

Add a new component in `AppSidebar.tsx` before the `MenuItem` function definition (around line 209):

```tsx
// Context Menu Component
function SidebarContextMenu({
  x,
  y,
  path,
  onClose,
}: {
  x: number;
  y: number;
  path: string;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, window.innerWidth - 180);
  const adjustedY = Math.min(y, window.innerHeight - 80);

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <a
        href={path}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer w-full"
        onClick={onClose}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        Buka di tab baru
      </a>
    </div>
  );
}
```

**Note**: Uses inline SVG (external-link icon) to avoid adding a new icon dependency. Tailwind classes consistent with the rest of the sidebar.

---

### Task 2 — Update `MenuItem` to use context menu state

Replace the `MenuItem` function (lines 210–322) with a version that:
1. Adds local `contextMenu` state
2. Adds `onContextMenu` handler on the `<Link>` element
3. Renders `<SidebarContextMenu>` via `createPortal` when state is set

**Key change in the `nav.path` branch of `MenuItem`:**

```tsx
function MenuItem({ ... }) {
  // NEW: context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // ... existing code ...

  if (nav.path) {
    const isRouteLoading = isLoading(nav.path);
    const isRouteActive = isActive(nav.path);

    return (
      <li key={nav.name || index}>
        <Link
          href={nav.path}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY });
          }}
          onClick={(e) => {
            // Close context menu on regular click
            setContextMenu(null);
            if (e.metaKey || e.ctrlKey) return;
            e.preventDefault();
            if (!isRouteLoading) {
              onNavigate(nav.path!);
            }
          }}
          className={...}  // unchanged
        >
          {/* ... existing icon and text ... */}
        </Link>
        {contextMenu && nav.path &&
          createPortal(
            <SidebarContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              path={nav.path}
              onClose={() => setContextMenu(null)}
            />,
            document.body
          )
        }
      </li>
    );
  }
  // ...
}
```

**Import `createPortal`** at top of file:
```tsx
import { createPortal } from 'react-dom';
```

---

### Task 3 — Verify no regression on existing behavior

Manual test checklist:
- [ ] Left-click nav item → navigates normally with loading spinner
- [ ] Ctrl/Cmd + click → opens in new tab (native browser behavior)
- [ ] Right-click → context menu appears at cursor
- [ ] Click "Buka di tab baru" → opens page in new tab, menu closes
- [ ] Click anywhere outside menu → menu closes
- [ ] Press Escape → menu closes
- [ ] Right-click in collapsed sidebar (icon-only mode) → menu still appears
- [ ] Dark mode → menu has correct dark styling

---

## File Changes

| File | Change |
|------|--------|
| `src/components/layouts/AppSidebar.tsx` | Add `SidebarContextMenu` component, add `contextMenu` state + handler to `MenuItem`, add `createPortal` import |

**Estimated diff**: ~80 lines added, 10 lines modified.

---

## No TDD Required

This is a pure presentational UI feature (a context menu popup). Per CLAUDE.md:
> **SKIP for**: Pure presentational UI, trivial getters/setters, config files, type definitions.

Manual verification is sufficient (test checklist in Task 3).

---

## Suggested Commit Message

```
feat(sidebar): add right-click context menu with "open in new tab" option

Adds custom context menu on sidebar nav items triggered by right-click.
Shows "Buka di tab baru" option that opens the nav target in a new browser tab.
Uses createPortal to render menu at body level, preventing clipping by sidebar overflow.
Dismisses on outside click, Escape key, or after selecting the option.

fixes #XX

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
