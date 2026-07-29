import { TabsList, TabsPanel, TabsRoot, TabsTab } from "./tabs.js";

export { TabsList, TabsPanel, TabsRoot, TabsTab } from "./tabs.js";
export type {
  TabsActivationMode,
  TabsListProps,
  TabsOrientation,
  TabsPanelMount,
  TabsPanelProps,
  TabsRootProps,
  TabsTabProps,
} from "./tabs.js";

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
