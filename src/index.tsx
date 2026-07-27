import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  type KeyboardEvent,
  type MouseEvent,
  type FocusEvent,
  type PropsWithoutRef,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
} from "react";

export type TabsActivationMode = "automatic" | "manual";
export type TabsOrientation = "horizontal" | "vertical";
export type TabsPanelMount = "active" | "all";

interface ListRegistration {
  readonly hasAccessibleName: boolean;
}

interface TabRegistration {
  readonly disabled: boolean;
  readonly element: HTMLButtonElement | null;
  readonly value: string;
}

interface PanelRegistration {
  readonly value: string;
}

interface TabsRegistry {
  active: boolean;
  lastError: string | undefined;
  readonly lists: Map<string, ListRegistration>;
  readonly panels: Map<string, PanelRegistration>;
  selectedValue: string;
  readonly tabs: Map<string, TabRegistration>;
  version: number;
}

interface TabsContextValue {
  readonly activationMode: TabsActivationMode;
  readonly orientation: TabsOrientation;
  readonly panelMount: TabsPanelMount;
  readonly registry: TabsRegistry;
  readonly rootId: string;
  readonly selectedValue: string;
  registerList(instanceId: string, registration: ListRegistration): () => void;
  registerPanel(
    instanceId: string,
    registration: PanelRegistration,
  ): () => void;
  registerTab(instanceId: string, registration: TabRegistration): () => void;
  select(value: string): void;
}

const tabsContext = createContext<TabsContextValue | undefined>(undefined);
const tabsListContext = createContext(false);

function createRegistry(selectedValue: string): TabsRegistry {
  return {
    active: false,
    lastError: undefined,
    lists: new Map(),
    panels: new Map(),
    selectedValue,
    tabs: new Map(),
    version: 0,
  };
}

function countValues<TRegistration extends { readonly value: string }>(
  registrations: ReadonlyMap<string, TRegistration>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const registration of registrations.values()) {
    counts.set(registration.value, (counts.get(registration.value) ?? 0) + 1);
  }
  return counts;
}

function describeValue(value: string): string {
  return JSON.stringify(value);
}

function validateRegistry(registry: TabsRegistry): void {
  if (!registry.active) {
    return;
  }

  const errors: string[] = [];
  if (registry.lists.size === 0) {
    errors.push("Tabs.List is required.");
  } else if (registry.lists.size > 1) {
    errors.push("Tabs.List must only be used once.");
  }
  if (
    registry.lists.size > 0 &&
    [...registry.lists.values()].some(
      (registration) => !registration.hasAccessibleName,
    )
  ) {
    errors.push("Tabs.List requires aria-label or aria-labelledby.");
  }
  if (registry.tabs.size === 0) {
    errors.push("At least one Tabs.Tab is required.");
  }
  if (registry.panels.size === 0) {
    errors.push("At least one Tabs.Panel is required.");
  }

  const tabCounts = countValues(registry.tabs);
  const panelCounts = countValues(registry.panels);
  for (const [value, count] of tabCounts) {
    if (count > 1) {
      errors.push(`Tabs.Tab value ${describeValue(value)} must be unique.`);
    }
    if (!panelCounts.has(value)) {
      errors.push(`Tabs.Panel value ${describeValue(value)} is required.`);
    }
  }
  for (const [value, count] of panelCounts) {
    if (count > 1) {
      errors.push(`Tabs.Panel value ${describeValue(value)} must be unique.`);
    }
    if (!tabCounts.has(value)) {
      errors.push(`Tabs.Tab value ${describeValue(value)} is required.`);
    }
  }

  const selectedTabs = [...registry.tabs.values()].filter(
    (registration) => registration.value === registry.selectedValue,
  );
  if (registry.tabs.size > 0 && selectedTabs.length === 0) {
    errors.push(
      `Selected value ${describeValue(registry.selectedValue)} does not match a Tabs.Tab.`,
    );
  } else if (selectedTabs.some((registration) => registration.disabled)) {
    errors.push(
      `Selected Tabs.Tab value ${describeValue(registry.selectedValue)} must not be disabled.`,
    );
  }
  if (registry.panels.size > 0 && !panelCounts.has(registry.selectedValue)) {
    errors.push(
      `Selected value ${describeValue(registry.selectedValue)} does not match a Tabs.Panel.`,
    );
  }

  const error =
    errors.length === 0
      ? undefined
      : `Invalid Tabs composition: ${errors.join(" ")}`;
  if (error === registry.lastError) {
    return;
  }

  registry.lastError = error;
  if (error !== undefined) {
    // eslint-disable-next-line no-console -- Invalid composition is a developer-facing error.
    console.error(error);
  }
}

function scheduleValidation(registry: TabsRegistry): void {
  registry.version += 1;
  const version = registry.version;

  queueMicrotask(() => {
    if (registry.version === version) {
      validateRegistry(registry);
    }
  });
}

function useTabsContext(name: string): TabsContextValue {
  const context = useContext(tabsContext);
  if (!context) {
    throw new Error(`${name} must be used within Tabs.Root.`);
  }
  return context;
}

function encodeValue(value: string): string {
  return (
    Array.from(value, (character) =>
      character.codePointAt(0)?.toString(36),
    ).join("-") || "empty"
  );
}

function getTabId(rootId: string, value: string): string {
  return `${rootId}-tab-${encodeValue(value)}`;
}

function getPanelId(rootId: string, value: string): string {
  return `${rootId}-panel-${encodeValue(value)}`;
}

function registerMapValue<TValue>(
  registry: TabsRegistry,
  map: Map<string, TValue>,
  instanceId: string,
  value: TValue,
): () => void {
  map.set(instanceId, value);
  scheduleValidation(registry);

  return () => {
    map.delete(instanceId);
    scheduleValidation(registry);
  };
}

interface TabsRootBaseProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children" | "defaultValue"
> {
  readonly activationMode?: TabsActivationMode;
  readonly children: ReactNode;
  readonly onValueChange?: (value: string) => void;
  readonly orientation?: TabsOrientation;
  readonly panelMount?: TabsPanelMount;
}

type ControlledTabsRootProps = {
  readonly defaultValue?: never;
  readonly value: string;
};

type UncontrolledTabsRootProps = {
  readonly defaultValue: string;
  readonly value?: never;
};

export type TabsRootProps = TabsRootBaseProps &
  (ControlledTabsRootProps | UncontrolledTabsRootProps);

export const TabsRoot: ForwardRefExoticComponent<
  PropsWithoutRef<TabsRootProps> & RefAttributes<HTMLDivElement>
> = forwardRef<HTMLDivElement, TabsRootProps>(function TabsRoot(
  {
    activationMode = "automatic",
    children,
    defaultValue,
    onValueChange,
    orientation = "horizontal",
    panelMount = "all",
    value,
    ...props
  },
  ref,
): ReactElement {
  if (value === undefined && defaultValue === undefined) {
    throw new Error("Tabs.Root requires value or defaultValue.");
  }
  if (value !== undefined && defaultValue !== undefined) {
    throw new Error("Tabs.Root cannot use value and defaultValue together.");
  }

  const controlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState<string>(
    defaultValue ?? value!,
  );
  const selectedValue = controlled ? value : uncontrolledValue;
  const rootId = useId();
  const registryReference = useRef<TabsRegistry | undefined>(undefined);
  registryReference.current ??= createRegistry(selectedValue);
  const registry = registryReference.current;

  const select = useCallback(
    (nextValue: string) => {
      if (nextValue === selectedValue) {
        return;
      }
      if (!controlled) {
        setUncontrolledValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [controlled, onValueChange, selectedValue],
  );

  const registerList = useCallback(
    (instanceId: string, registration: ListRegistration) =>
      registerMapValue(registry, registry.lists, instanceId, registration),
    [registry],
  );
  const registerTab = useCallback(
    (instanceId: string, registration: TabRegistration) =>
      registerMapValue(registry, registry.tabs, instanceId, registration),
    [registry],
  );
  const registerPanel = useCallback(
    (instanceId: string, registration: PanelRegistration) =>
      registerMapValue(registry, registry.panels, instanceId, registration),
    [registry],
  );

  const context = useMemo<TabsContextValue>(
    () => ({
      activationMode,
      orientation,
      panelMount,
      registerList,
      registerPanel,
      registerTab,
      registry,
      rootId,
      select,
      selectedValue,
    }),
    [
      activationMode,
      orientation,
      panelMount,
      registerList,
      registerPanel,
      registerTab,
      registry,
      rootId,
      select,
      selectedValue,
    ],
  );

  useEffect(() => {
    registry.active = true;
    scheduleValidation(registry);

    return () => {
      registry.active = false;
      registry.version += 1;
    };
  }, [registry]);

  useEffect(() => {
    registry.selectedValue = selectedValue;
    scheduleValidation(registry);
  }, [registry, selectedValue]);

  return (
    <tabsContext.Provider value={context}>
      <div {...props} ref={ref}>
        {children}
      </div>
    </tabsContext.Provider>
  );
});

type MountedTabRegistration = TabRegistration & {
  readonly element: HTMLButtonElement;
};

function orderedEnabledTabs(
  registry: TabsRegistry,
  list: HTMLDivElement,
): MountedTabRegistration[] {
  const mounted = [...registry.tabs.values()].filter(
    (registration): registration is MountedTabRegistration =>
      !registration.disabled &&
      registration.element !== null &&
      list.contains(registration.element),
  );
  let ordered: MountedTabRegistration[] = [];

  for (const registration of mounted) {
    const index = ordered.findIndex(
      (current) =>
        (registration.element.compareDocumentPosition(current.element) & 4) !==
        0,
    );
    ordered =
      index === -1
        ? [...ordered, registration]
        : [...ordered.slice(0, index), registration, ...ordered.slice(index)];
  }

  return ordered;
}

export interface TabsListProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children" | "role"
> {
  readonly children: ReactNode;
}

export const TabsList: ForwardRefExoticComponent<
  PropsWithoutRef<TabsListProps> & RefAttributes<HTMLDivElement>
> = forwardRef<HTMLDivElement, TabsListProps>(function TabsList(
  {
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    children,
    onKeyDown,
    ...props
  },
  ref,
): ReactElement {
  const context = useTabsContext("Tabs.List");
  const instanceId = useId();
  const hasAccessibleName = Boolean(
    ariaLabel?.trim() || ariaLabelledBy?.trim(),
  );

  useEffect(
    () => context.registerList(instanceId, { hasAccessibleName }),
    [context.registerList, hasAccessibleName, instanceId],
  );

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }

    const tabs = orderedEnabledTabs(context.registry, event.currentTarget);
    if (tabs.length === 0) {
      return;
    }

    const activeElement = event.currentTarget.ownerDocument.activeElement;
    const currentIndex = tabs.findIndex(
      (registration) =>
        registration.element === activeElement ||
        registration.element?.contains(activeElement),
    );
    const window = event.currentTarget.ownerDocument.defaultView;
    const rightToLeft =
      window?.getComputedStyle(event.currentTarget).direction === "rtl";
    let targetIndex: number | undefined;

    if (event.key === "Home") {
      targetIndex = 0;
    } else if (event.key === "End") {
      targetIndex = tabs.length - 1;
    } else if (
      context.orientation === "horizontal" &&
      event.key === "ArrowRight"
    ) {
      targetIndex =
        (currentIndex + (rightToLeft ? -1 : 1) + tabs.length) % tabs.length;
    } else if (
      context.orientation === "horizontal" &&
      event.key === "ArrowLeft"
    ) {
      targetIndex =
        (currentIndex + (rightToLeft ? 1 : -1) + tabs.length) % tabs.length;
    } else if (
      context.orientation === "vertical" &&
      event.key === "ArrowDown"
    ) {
      targetIndex = (currentIndex + 1 + tabs.length) % tabs.length;
    } else if (context.orientation === "vertical" && event.key === "ArrowUp") {
      targetIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    }

    if (targetIndex === undefined) {
      return;
    }

    event.preventDefault();
    tabs[targetIndex]?.element?.focus();
  }

  return (
    <tabsListContext.Provider value={true}>
      <div
        {...props}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-orientation={context.orientation}
        onKeyDown={handleKeyDown}
        ref={ref}
        role="tablist"
      >
        {children}
      </div>
    </tabsListContext.Provider>
  );
});

export interface TabsTabProps extends Omit<
  ComponentPropsWithoutRef<"button">,
  | "aria-controls"
  | "aria-selected"
  | "children"
  | "id"
  | "role"
  | "tabIndex"
  | "type"
  | "value"
> {
  readonly children: ReactNode;
  readonly value: string;
}

export const TabsTab: ForwardRefExoticComponent<
  PropsWithoutRef<TabsTabProps> & RefAttributes<HTMLButtonElement>
> = forwardRef<HTMLButtonElement, TabsTabProps>(function TabsTab(
  { children, disabled = false, onClick, onFocus, value, ...props },
  ref,
): ReactElement {
  const context = useTabsContext("Tabs.Tab");
  const insideList = useContext(tabsListContext);
  if (!insideList) {
    throw new Error("Tabs.Tab must be used within Tabs.List.");
  }

  const instanceId = useId();
  const elementReference = useRef<HTMLButtonElement>(null);
  useImperativeHandle(ref, () => elementReference.current as HTMLButtonElement);
  const selected = context.selectedValue === value;
  const id = getTabId(context.rootId, value);
  const panelId = getPanelId(context.rootId, value);

  useEffect(
    () =>
      context.registerTab(instanceId, {
        disabled,
        element: elementReference.current,
        value,
      }),
    [context.registerTab, disabled, instanceId, value],
  );

  function handleClick(event: MouseEvent<HTMLButtonElement>): void {
    onClick?.(event);
    if (!event.defaultPrevented) {
      context.select(value);
    }
  }

  function handleFocus(event: FocusEvent<HTMLButtonElement>): void {
    onFocus?.(event);
    if (
      !event.defaultPrevented &&
      !disabled &&
      context.activationMode === "automatic"
    ) {
      context.select(value);
    }
  }

  return (
    <button
      {...props}
      aria-controls={panelId}
      aria-selected={selected}
      disabled={disabled}
      id={id}
      onClick={handleClick}
      onFocus={handleFocus}
      ref={elementReference}
      role="tab"
      tabIndex={selected ? 0 : -1}
      type="button"
    >
      {children}
    </button>
  );
});

export interface TabsPanelProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "aria-labelledby" | "children" | "hidden" | "id" | "role" | "value"
> {
  readonly children: ReactNode;
  readonly value: string;
}

export const TabsPanel: ForwardRefExoticComponent<
  PropsWithoutRef<TabsPanelProps> & RefAttributes<HTMLDivElement>
> = forwardRef<HTMLDivElement, TabsPanelProps>(function TabsPanel(
  { children, tabIndex, value, ...props },
  ref,
): ReactElement | null {
  const context = useTabsContext("Tabs.Panel");
  if (useContext(tabsListContext)) {
    throw new Error("Tabs.Panel must not be used within Tabs.List.");
  }

  const instanceId = useId();
  const selected = context.selectedValue === value;
  const id = getPanelId(context.rootId, value);
  const tabId = getTabId(context.rootId, value);

  useEffect(
    () => context.registerPanel(instanceId, { value }),
    [context.registerPanel, instanceId, value],
  );

  if (context.panelMount === "active" && !selected) {
    return null;
  }

  return (
    <div
      {...props}
      aria-labelledby={tabId}
      hidden={!selected}
      id={id}
      ref={ref}
      role="tabpanel"
      tabIndex={tabIndex ?? 0}
    >
      {children}
    </div>
  );
});

export interface TabsComponents {
  readonly List: typeof TabsList;
  readonly Panel: typeof TabsPanel;
  readonly Root: typeof TabsRoot;
  readonly Tab: typeof TabsTab;
}

export const Tabs: TabsComponents = {
  List: TabsList,
  Panel: TabsPanel,
  Root: TabsRoot,
  Tab: TabsTab,
};
