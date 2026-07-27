# `@lucid-softworks/tabs`

Build accessible, unstyled tab interfaces from composable React components.

```tsx
import { useState, type ReactElement } from "react";

import { Tabs } from "@lucid-softworks/tabs";

function ProfileSettings(): ReactElement {
  return <p>Update your public profile.</p>;
}

function SecuritySettings(): ReactElement {
  return <p>Review your sign-in methods.</p>;
}

export function AccountSettings(): ReactElement {
  const [selectedTab, setSelectedTab] = useState("profile");

  return (
    <Tabs.Root
      className="tabs"
      onValueChange={setSelectedTab}
      value={selectedTab}
    >
      <Tabs.List aria-label="Account settings" className="tabs-list">
        <Tabs.Tab className="tabs-tab" value="profile">
          Profile
        </Tabs.Tab>
        <Tabs.Tab className="tabs-tab" value="security">
          Security
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel className="tabs-panel" value="profile">
        <ProfileSettings />
      </Tabs.Panel>
      <Tabs.Panel className="tabs-panel" value="security">
        <SecuritySettings />
      </Tabs.Panel>
    </Tabs.Root>
  );
}
```

`Tabs.Root` supports controlled state with `value` or uncontrolled state with
`defaultValue`. `activationMode` can be `"automatic"` or `"manual"`, and
`orientation` can be `"horizontal"` or `"vertical"`.

## Panel mounting

Panels remain mounted by default, preserving their component state and effects.
Inactive panels receive the native `hidden` attribute:

```tsx
<Tabs.Root defaultValue="summary" panelMount="all">
  {/* list and panels */}
</Tabs.Root>
```

Use `panelMount="active"` when only the selected panel should be mounted.
Switching tabs then unmounts the previous panel:

```tsx
<Tabs.Root defaultValue="summary" panelMount="active">
  {/* list and panels */}
</Tabs.Root>
```

## Composition and styling

`Tabs.Root`, `Tabs.List`, `Tabs.Tab`, and `Tabs.Panel` each render one semantic
HTML element and accept its standard styling and event props. Consumers can use
plain CSS, CSS modules, Tailwind, inline styles, or StyleX directly.

The active tab is exposed through `aria-selected="true"`. Orientation,
disabled state, and inactive panels use `aria-orientation`, `disabled`, and
`hidden`, so styling does not depend on private implementation attributes.

Exactly one labelled `Tabs.List`, at least one `Tabs.Tab`, and at least one
matching `Tabs.Panel` are required. Duplicate values, missing counterparts,
invalid nesting, and an invalid selected value are reported with clear errors.
