# Launchpad Todo List

## 1. Group Reordering in Sidebar
**Description**: Allow users to drag and drop groups in the sidebar to reorder them. Groups already have a `sortOrder` field in the database, but there's no UI to change it.

**Implementation Plan**:
- Add drag-and-drop functionality to the Sidebar component using `@dnd-kit`
- Create a `SortableGroupItem` component similar to `SortableItemCard`
- Add `reorderGroups` IPC handler and database method
- Update groups' `sortOrder` when reordered
- Disable group reordering when in selection mode (to avoid conflicts)

---

## 2. Password Manager Item Type
**Description**: Add a new item type called "password" to store password entries (like a password manager). This will be a fourth item type alongside bookmarks, SSH, and apps.

**Implementation Plan**:
- **Types & Database**:
  - Add `'password'` to `ItemType` union in `types.ts`
  - Create `PasswordItem` interface with fields: `service`, `username`, `password`, `url` (optional), `notes` (optional)
  - Add database migration to support password items
  - Update `rowToItem` and `itemToRow` methods in `database.ts`

- **UI Components**:
  - Add "Password" option to `AddItemModal` type selector
  - Create form fields for password entry (service name, username, password, URL, notes)
  - Update `ItemCard` to display password items with appropriate icon
  - Add edit modal support for password items
  - Implement password visibility toggle (show/hide)
  - Add copy-to-clipboard functionality for password field

- **Launch Behavior**:
  - When clicking a password item, copy password to clipboard (or show password details)
  - Optionally open URL if provided

- **Security**:
  - Ensure passwords are encrypted using existing encryption service
  - Store passwords in `EncryptedCredentials` format

---

## 3. Fix Theme Switching (Light/System Mode)
**Description**: Currently only dark mode works. Light mode and system mode need to be properly implemented.

**Implementation Plan**:
- **Theme Application**:
  - Add `useEffect` in `App.tsx` to watch theme changes and apply/remove `dark` class on `<html>` element
  - Listen to system theme changes when theme is set to "system"
  - Use Electron's `nativeTheme` API to detect system theme changes
  - Update `index.html` to not hardcode `class="dark"`

- **Light Mode Styling**:
  - Review all components to ensure they work with light mode
  - Add light mode color variants if needed (or use Tailwind's dark mode classes properly)
  - Test all UI components in both themes

- **System Theme Integration**:
  - Add IPC handler to listen for system theme changes
  - Update theme when system theme changes (if user selected "system")
  - Ensure smooth transitions between themes

---

## 4. Compact View of Cards
**Description**: Add a compact view option for item cards that displays them in a smaller, more condensed format to show more items on screen at once.

**Implementation Plan**:
- Add a view mode toggle in the Dashboard (compact/normal)
- Create compact card variant with reduced padding and smaller text
- Adjust card dimensions and spacing for compact mode
- Store view preference in settings/localStorage
- Update `ItemCard` component to support compact mode prop
- Ensure drag-and-drop still works in compact mode

---

## 5. List View
**Description**: Add a list view option that displays items in a vertical list format instead of cards, showing more information in a table-like layout.

**Implementation Plan**:
- Add list view option to view mode toggle (cards/compact/list)
- Create `ListItem` component for list view display
- Design list view layout with columns for: icon, title, type, group, actions
- Implement sorting functionality for list view columns
- Add hover states and selection support for list items
- Ensure drag-and-drop works in list view
- Store view preference in settings/localStorage
- Update Dashboard to switch between card and list views

---

## Implementation Priority
1. **Theme Fix** (Quick win, improves UX immediately)
2. **Group Reordering** (Enhances organization)
3. **Password Manager** (New feature, requires more work)
4. **Compact View** (UI enhancement)
5. **List View** (UI enhancement)
