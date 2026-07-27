import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { createRef, useState, type ReactElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  Tabs,
  TabsList,
  TabsPanel,
  TabsRoot,
  TabsTab,
  type TabsActivationMode,
  type TabsOrientation,
  type TabsPanelMount,
  type TabsRootProps,
} from "../src/index.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function flushValidation(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

interface ExampleTabsProps {
  readonly activationMode?: TabsActivationMode;
  readonly defaultValue?: string;
  readonly listProps?: {
    readonly onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
    readonly style?: React.CSSProperties;
  };
  readonly onValueChange?: (value: string) => void;
  readonly orientation?: TabsOrientation;
  readonly panelMount?: TabsPanelMount;
}

function ExampleTabs({
  activationMode = "automatic",
  defaultValue = "first",
  listProps,
  onValueChange,
  orientation = "horizontal",
  panelMount = "all",
}: ExampleTabsProps): ReactElement {
  return (
    <Tabs.Root
      activationMode={activationMode}
      defaultValue={defaultValue}
      orientation={orientation}
      panelMount={panelMount}
      {...(onValueChange ? { onValueChange } : {})}
    >
      <Tabs.List aria-label="Example tabs" {...listProps}>
        <Tabs.Tab value="first">First</Tabs.Tab>
        <Tabs.Tab disabled value="disabled">
          Disabled
        </Tabs.Tab>
        <Tabs.Tab value="third">Third</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="first">First panel</Tabs.Panel>
      <Tabs.Panel value="disabled">Disabled panel</Tabs.Panel>
      <Tabs.Panel value="third">Third panel</Tabs.Panel>
    </Tabs.Root>
  );
}

function StatefulPanel({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount((value) => value + 1)} type="button">
      {children}: {count}
    </button>
  );
}

function ServerTabs(): ReactElement {
  return (
    <Tabs.Root defaultValue="server">
      <Tabs.List aria-label="Server tabs">
        <Tabs.Tab value="server">Server</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="server">Server panel</Tabs.Panel>
    </Tabs.Root>
  );
}

describe("Tabs", () => {
  it("composes, styles, labels, and references every public part", async () => {
    const onValueChange = vi.fn<(value: string) => void>();
    const rootReference = createRef<HTMLDivElement>();
    const listReference = createRef<HTMLDivElement>();
    const firstTabReference = createRef<HTMLButtonElement>();
    const firstPanelReference = createRef<HTMLDivElement>();

    render(
      <Tabs.Root
        className="tabs"
        defaultValue="first"
        onValueChange={onValueChange}
        ref={rootReference}
      >
        <Tabs.List
          aria-label="Account settings"
          className="tabs-list"
          ref={listReference}
        >
          <Tabs.Tab className="tabs-tab" ref={firstTabReference} value="first">
            First
          </Tabs.Tab>
          <Tabs.Tab value="second">Second</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel
          className="tabs-panel"
          ref={firstPanelReference}
          style={{ color: "red" }}
          value="first"
        >
          First panel
        </Tabs.Panel>
        <Tabs.Panel value="second">Second panel</Tabs.Panel>
      </Tabs.Root>,
    );
    await flushValidation();

    const first = screen.getByRole("tab", { name: "First" });
    const second = screen.getByRole("tab", { name: "Second" });
    const firstPanel = screen.getByRole("tabpanel", { name: "First" });
    const secondPanel = document.getElementById(
      second.getAttribute("aria-controls") ?? "",
    ) as HTMLDivElement;

    expect(rootReference.current?.className).toBe("tabs");
    expect(listReference.current?.getAttribute("aria-orientation")).toBe(
      "horizontal",
    );
    expect(firstTabReference.current).toBe(first);
    expect(firstPanelReference.current).toBe(firstPanel);
    expect(first.getAttribute("aria-selected")).toBe("true");
    expect(first.getAttribute("tabindex")).toBe("0");
    expect(second.getAttribute("aria-selected")).toBe("false");
    expect(second.getAttribute("tabindex")).toBe("-1");
    expect(first.getAttribute("aria-controls")).toBe(firstPanel.id);
    expect(firstPanel.getAttribute("aria-labelledby")).toBe(first.id);
    expect(firstPanel.style.color).toBe("red");
    expect(firstPanel.hidden).toBe(false);
    expect(secondPanel.hidden).toBe(true);

    fireEvent.click(second);
    expect(onValueChange).toHaveBeenCalledWith("second");
    expect(second.getAttribute("aria-selected")).toBe("true");
    expect(firstPanel.hidden).toBe(true);
    expect(secondPanel.hidden).toBe(false);
  });

  it("keeps all panels mounted and preserves state by default", () => {
    render(
      <Tabs.Root defaultValue="first">
        <Tabs.List aria-label="Stateful tabs">
          <Tabs.Tab value="first">First</Tabs.Tab>
          <Tabs.Tab value="second">Second</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="first">
          <StatefulPanel>Counter</StatefulPanel>
        </Tabs.Panel>
        <Tabs.Panel value="second">Second panel</Tabs.Panel>
      </Tabs.Root>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Counter: 0" }));
    fireEvent.click(screen.getByRole("tab", { name: "Second" }));
    fireEvent.click(screen.getByRole("tab", { name: "First" }));

    expect(screen.getByRole("button", { name: "Counter: 1" })).toBeDefined();
  });

  it("mounts only the active panel when requested", () => {
    render(
      <Tabs.Root defaultValue="first" panelMount="active">
        <Tabs.List aria-label="Lazy tabs">
          <Tabs.Tab value="first">First</Tabs.Tab>
          <Tabs.Tab value="second">Second</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="first">
          <StatefulPanel>Counter</StatefulPanel>
        </Tabs.Panel>
        <Tabs.Panel value="second">Second panel</Tabs.Panel>
      </Tabs.Root>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Counter: 0" }));
    fireEvent.click(screen.getByRole("tab", { name: "Second" }));
    expect(screen.queryByText(/Counter:/u)).toBeNull();
    expect(screen.getByText("Second panel")).toBeDefined();

    fireEvent.click(screen.getByRole("tab", { name: "First" }));
    expect(screen.getByRole("button", { name: "Counter: 0" })).toBeDefined();
  });

  it("supports controlled selection", () => {
    const onValueChange = vi.fn<(value: string) => void>();
    const view = render(
      <Tabs.Root onValueChange={onValueChange} value="first">
        <Tabs.List aria-label="Controlled tabs">
          <Tabs.Tab value="first">First</Tabs.Tab>
          <Tabs.Tab value="second">Second</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="first">First panel</Tabs.Panel>
        <Tabs.Panel value="second">Second panel</Tabs.Panel>
      </Tabs.Root>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Second" }));
    expect(onValueChange).toHaveBeenCalledWith("second");
    expect(
      screen.getByRole("tab", { name: "First" }).getAttribute("aria-selected"),
    ).toBe("true");

    view.rerender(
      <Tabs.Root onValueChange={onValueChange} value="second">
        <Tabs.List aria-label="Controlled tabs">
          <Tabs.Tab value="first">First</Tabs.Tab>
          <Tabs.Tab value="second">Second</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="first">First panel</Tabs.Panel>
        <Tabs.Panel value="second">Second panel</Tabs.Panel>
      </Tabs.Root>,
    );

    expect(
      screen.getByRole("tab", { name: "Second" }).getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("automatically activates focused tabs and skips disabled tabs", () => {
    const onValueChange = vi.fn<(value: string) => void>();
    render(<ExampleTabs onValueChange={onValueChange} />);
    const first = screen.getByRole("tab", { name: "First" });
    const third = screen.getByRole("tab", { name: "Third" });

    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });

    expect(document.activeElement).toBe(third);
    expect(third.getAttribute("aria-selected")).toBe("true");
    expect(onValueChange).toHaveBeenLastCalledWith("third");

    fireEvent.keyDown(third, { key: "ArrowRight" });
    expect(document.activeElement).toBe(first);
    expect(first.getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(third);
  });

  it("does nothing when a list has no enabled tabs", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Tabs.Root defaultValue="disabled">
        <Tabs.List aria-label="Unavailable tabs">
          <Tabs.Tab disabled value="disabled">
            Disabled
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="disabled">Disabled panel</Tabs.Panel>
      </Tabs.Root>,
    );

    const list = screen.getByRole("tablist");
    fireEvent.keyDown(list, { key: "Home" });

    expect(document.activeElement).toBe(document.body);
  });

  it("uses rendered tab order after keyed tabs move", () => {
    const view = render(
      <Tabs.Root defaultValue="first">
        <Tabs.List aria-label="Reordered tabs">
          <Tabs.Tab key="first" value="first">
            First
          </Tabs.Tab>
          <Tabs.Tab key="second" value="second">
            Second
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="first">First panel</Tabs.Panel>
        <Tabs.Panel value="second">Second panel</Tabs.Panel>
      </Tabs.Root>,
    );

    view.rerender(
      <Tabs.Root defaultValue="first">
        <Tabs.List aria-label="Reordered tabs">
          <Tabs.Tab key="second" value="second">
            Second
          </Tabs.Tab>
          <Tabs.Tab key="first" value="first">
            First
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="first">First panel</Tabs.Panel>
        <Tabs.Panel value="second">Second panel</Tabs.Panel>
      </Tabs.Root>,
    );

    const first = screen.getByRole("tab", { name: "First" });
    const second = screen.getByRole("tab", { name: "Second" });
    second.focus();
    fireEvent.keyDown(second, { key: "ArrowRight" });

    expect(document.activeElement).toBe(first);
  });

  it("supports Home, End, and manual activation", () => {
    const onValueChange = vi.fn<(value: string) => void>();
    render(
      <ExampleTabs activationMode="manual" onValueChange={onValueChange} />,
    );
    const first = screen.getByRole("tab", { name: "First" });
    const third = screen.getByRole("tab", { name: "Third" });

    first.focus();
    fireEvent.keyDown(first, { key: "End" });
    expect(document.activeElement).toBe(third);
    expect(first.getAttribute("aria-selected")).toBe("true");
    expect(onValueChange).not.toHaveBeenCalled();

    fireEvent.keyDown(third, { key: "Home" });
    expect(document.activeElement).toBe(first);

    third.focus();
    fireEvent.click(third);
    expect(third.getAttribute("aria-selected")).toBe("true");
    expect(onValueChange).toHaveBeenCalledWith("third");
  });

  it("uses vertical arrow navigation and ignores horizontal arrows", () => {
    render(<ExampleTabs orientation="vertical" />);
    const first = screen.getByRole("tab", { name: "First" });
    const third = screen.getByRole("tab", { name: "Third" });
    const list = screen.getByRole("tablist");

    expect(list.getAttribute("aria-orientation")).toBe("vertical");
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(document.activeElement).toBe(third);
    fireEvent.keyDown(third, { key: "ArrowUp" });
    expect(document.activeElement).toBe(first);
  });

  it("reverses horizontal arrows in right-to-left layouts", () => {
    render(<ExampleTabs listProps={{ style: { direction: "rtl" } }} />);
    const first = screen.getByRole("tab", { name: "First" });
    const third = screen.getByRole("tab", { name: "Third" });

    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement).toBe(third);
    fireEvent.keyDown(third, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(first);
  });

  it("allows consumer events to prevent selection and navigation", () => {
    const onKeyDown = vi.fn<
      (event: React.KeyboardEvent<HTMLDivElement>) => void
    >((event) => {
      event.preventDefault();
    });
    const onClick = vi.fn<(event: React.MouseEvent<HTMLButtonElement>) => void>(
      (event) => {
        event.preventDefault();
      },
    );
    const onFocus = vi.fn<(event: React.FocusEvent<HTMLButtonElement>) => void>(
      (event) => {
        event.preventDefault();
      },
    );

    render(
      <Tabs.Root defaultValue="first">
        <Tabs.List aria-label="Prevented tabs" onKeyDown={onKeyDown}>
          <Tabs.Tab value="first">First</Tabs.Tab>
          <Tabs.Tab onClick={onClick} onFocus={onFocus} value="second">
            Second
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="first">First panel</Tabs.Panel>
        <Tabs.Panel value="second">Second panel</Tabs.Panel>
      </Tabs.Root>,
    );

    const first = screen.getByRole("tab", { name: "First" });
    const second = screen.getByRole("tab", { name: "Second" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(onKeyDown).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(first);

    second.focus();
    fireEvent.click(second);
    expect(onFocus).toHaveBeenCalledOnce();
    expect(onClick).toHaveBeenCalledOnce();
    expect(first.getAttribute("aria-selected")).toBe("true");
  });

  it("does not emit a change when selecting the active tab", () => {
    const onValueChange = vi.fn<(value: string) => void>();
    render(<ExampleTabs onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole("tab", { name: "First" }));

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("supports empty and Unicode values with deterministic relationships", () => {
    render(
      <Tabs.Root defaultValue="">
        <Tabs.List aria-label="Unusual values">
          <Tabs.Tab value="">Empty</Tabs.Tab>
          <Tabs.Tab value="😀">Emoji</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="">Empty panel</Tabs.Panel>
        <Tabs.Panel value="😀">Emoji panel</Tabs.Panel>
      </Tabs.Root>,
    );

    const empty = screen.getByRole("tab", { name: "Empty" });
    const emptyPanel = screen.getByRole("tabpanel", { name: "Empty" });
    const emoji = screen.getByRole("tab", { name: "Emoji" });
    const emojiPanel = document.getElementById(
      emoji.getAttribute("aria-controls") ?? "",
    ) as HTMLDivElement;

    expect(empty.getAttribute("aria-controls")).toBe(emptyPanel.id);
    expect(emoji.getAttribute("aria-controls")).toBe(emojiPanel.id);
    expect(empty.id).not.toBe(emoji.id);
  });

  it("reports missing composition without repeating the same error", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const view = render(<Tabs.Root defaultValue="missing">Empty</Tabs.Root>);
    await flushValidation();

    expect(error).toHaveBeenCalledWith(
      "Invalid Tabs composition: Tabs.List is required. At least one Tabs.Tab is required. At least one Tabs.Panel is required.",
    );

    view.rerender(<Tabs.Root defaultValue="missing">Still empty</Tabs.Root>);
    await flushValidation();
    expect(error).toHaveBeenCalledOnce();
  });

  it("reports labels, duplicates, and unmatched values", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <Tabs.Root defaultValue="one">
        <Tabs.List>
          <Tabs.Tab value="one">First one</Tabs.Tab>
          <Tabs.Tab value="one">Second one</Tabs.Tab>
          <Tabs.Tab value="missing-panel">Missing panel</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one">First panel</Tabs.Panel>
        <Tabs.Panel value="one">Second panel</Tabs.Panel>
        <Tabs.Panel value="missing-tab">Missing tab</Tabs.Panel>
      </Tabs.Root>,
    );
    await flushValidation();

    expect(error).toHaveBeenCalledWith(
      'Invalid Tabs composition: Tabs.List requires aria-label or aria-labelledby. Tabs.Tab value "one" must be unique. Tabs.Panel value "missing-panel" is required. Tabs.Panel value "one" must be unique. Tabs.Tab value "missing-tab" is required.',
    );
  });

  it("reports multiple lists and clears the error when composition is fixed", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const view = render(
      <Tabs.Root defaultValue="one">
        <Tabs.List aria-label="Primary tabs">
          <Tabs.Tab value="one">One</Tabs.Tab>
        </Tabs.List>
        <Tabs.List aria-label="Secondary tabs">Extra list</Tabs.List>
        <Tabs.Panel value="one">One panel</Tabs.Panel>
      </Tabs.Root>,
    );
    await flushValidation();

    expect(error).toHaveBeenCalledWith(
      "Invalid Tabs composition: Tabs.List must only be used once.",
    );

    view.rerender(
      <Tabs.Root defaultValue="one">
        <Tabs.List aria-label="Primary tabs">
          <Tabs.Tab value="one">One</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one">One panel</Tabs.Panel>
      </Tabs.Root>,
    );
    await flushValidation();

    expect(error).toHaveBeenCalledOnce();
  });

  it("reports invalid and disabled selected values", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const view = render(
      <Tabs.Root defaultValue="missing">
        <Tabs.List aria-label="Selection">
          <Tabs.Tab value="one">One</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one">One panel</Tabs.Panel>
      </Tabs.Root>,
    );
    await flushValidation();

    expect(error).toHaveBeenLastCalledWith(
      'Invalid Tabs composition: Selected value "missing" does not match a Tabs.Tab. Selected value "missing" does not match a Tabs.Panel.',
    );

    view.rerender(
      <Tabs.Root defaultValue="one" key="disabled-selection">
        <Tabs.List aria-label="Selection">
          <Tabs.Tab disabled value="one">
            One
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one">One panel</Tabs.Panel>
      </Tabs.Root>,
    );
    await flushValidation();

    expect(error).toHaveBeenLastCalledWith(
      'Invalid Tabs composition: Selected Tabs.Tab value "one" must not be disabled.',
    );
  });

  it.each([
    ["Tabs.List", <TabsList aria-label="Tabs">List</TabsList>],
    ["Tabs.Tab", <TabsTab value="tab">Tab</TabsTab>],
    ["Tabs.Panel", <TabsPanel value="panel">Panel</TabsPanel>],
  ])("requires %s to be within Tabs.Root", (name, part) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(part)).toThrow(
      `${name} must be used within Tabs.Root.`,
    );
  });

  it("requires Tabs.Tab to be within Tabs.List", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <TabsRoot defaultValue="tab">
          <TabsTab value="tab">Tab</TabsTab>
          <TabsPanel value="tab">Panel</TabsPanel>
        </TabsRoot>,
      ),
    ).toThrow("Tabs.Tab must be used within Tabs.List.");
  });

  it("does not allow Tabs.Panel within Tabs.List", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <TabsRoot defaultValue="tab">
          <TabsList aria-label="Tabs">
            <TabsTab value="tab">Tab</TabsTab>
            <TabsPanel value="tab">Panel</TabsPanel>
          </TabsList>
        </TabsRoot>,
      ),
    ).toThrow("Tabs.Panel must not be used within Tabs.List.");
  });

  it("requires exactly one selection source", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(<TabsRoot {...({} as TabsRootProps)}>Empty</TabsRoot>),
    ).toThrow("Tabs.Root requires value or defaultValue.");
    expect(() =>
      render(
        <TabsRoot
          {...({
            defaultValue: "one",
            value: "one",
          } as unknown as TabsRootProps)}
        >
          Empty
        </TabsRoot>,
      ),
    ).toThrow("Tabs.Root cannot use value and defaultValue together.");
  });

  it("supports aria-labelledby and a custom panel tab index", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <>
        <h2 id="settings-heading">Settings</h2>
        <Tabs.Root defaultValue="one">
          <Tabs.List aria-labelledby="settings-heading">
            <Tabs.Tab value="one">One</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel tabIndex={-1} value="one">
            One panel
          </Tabs.Panel>
        </Tabs.Root>
      </>,
    );
    await flushValidation();

    expect(screen.getByRole("tablist", { name: "Settings" })).toBeDefined();
    expect(screen.getByRole("tabpanel").getAttribute("tabindex")).toBe("-1");
    expect(error).not.toHaveBeenCalled();
  });

  it("supports server rendering and named component exports", () => {
    const markup = renderToString(<ServerTabs />);

    expect(markup).toContain("Server panel");
    expect(Tabs.Root).toBe(TabsRoot);
    expect(Tabs.List).toBe(TabsList);
    expect(Tabs.Tab).toBe(TabsTab);
    expect(Tabs.Panel).toBe(TabsPanel);
  });
});
