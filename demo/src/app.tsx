import { Tabs, type TabsPanelMount } from "@lucid-softworks/tabs";
import { useId, useState, type ReactElement } from "react";

const tabOptions = [
  { label: "Overview", value: "overview" },
  { label: "Activity", value: "activity" },
  { label: "Members", value: "members" },
] as const;

function Overview(): ReactElement {
  return (
    <div className="overview-grid">
      <article className="metric metric-acid">
        <span>Active projects</span>
        <strong>14</strong>
        <small>↑ 3 this month</small>
      </article>
      <article className="metric">
        <span>Storage used</span>
        <strong>68%</strong>
        <small>102 GB of 150 GB</small>
      </article>
      <article className="metric">
        <span>Team members</span>
        <strong>08</strong>
        <small>2 seats remaining</small>
      </article>
    </div>
  );
}

function Activity(): ReactElement {
  const noteId = useId();
  const noteHelpId = useId();
  const [note, setNote] = useState("");

  return (
    <div className="activity-layout">
      <div className="timeline">
        <article>
          <span className="timeline-mark">LM</span>
          <p>
            <strong>Luna</strong> published the Horizon release.
            <small>12 minutes ago</small>
          </p>
        </article>
        <article>
          <span className="timeline-mark timeline-mark-coral">AK</span>
          <p>
            <strong>Alex</strong> invited two collaborators.
            <small>Yesterday</small>
          </p>
        </article>
      </div>
      <div className="note-field">
        <label htmlFor={noteId}>Private note</label>
        <textarea
          aria-describedby={noteHelpId}
          id={noteId}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Try switching tabs after typing…"
          value={note}
        />
        <small id={noteHelpId}>
          This field makes the selected mounting strategy visible.
        </small>
      </div>
    </div>
  );
}

function Members(): ReactElement {
  return (
    <div className="member-list">
      {[
        ["LM", "Luna Morgan", "Owner"],
        ["AK", "Alex Kim", "Editor"],
        ["MS", "Morgan Shah", "Viewer"],
      ].map(([initials, name, role], index) => (
        <article key={name}>
          <span className={`avatar avatar-${index + 1}`}>{initials}</span>
          <p>
            <strong>{name}</strong>
            <small>{role}</small>
          </p>
          <button aria-label={`Open actions for ${name}`} type="button">
            ···
          </button>
        </article>
      ))}
    </div>
  );
}

export function App(): ReactElement {
  const [mount, setMount] = useState<TabsPanelMount>("all");
  const [selectedTab, setSelectedTab] = useState("overview");

  return (
    <main className="demo-shell">
      <div className="demo-heading">
        <div>
          <span className="eyebrow">Accessible tabs · unstyled</span>
          <h1>Workspace pulse</h1>
        </div>
        <fieldset className="mount-control">
          <legend>Panel mounting</legend>
          <label>
            <input
              checked={mount === "all"}
              name="mount"
              onChange={() => setMount("all")}
              type="radio"
            />
            Preserve all
          </label>
          <label>
            <input
              checked={mount === "active"}
              name="mount"
              onChange={() => setMount("active")}
              type="radio"
            />
            Active only
          </label>
        </fieldset>
      </div>

      <Tabs.Root
        className="tabs"
        onValueChange={setSelectedTab}
        panelMount={mount}
        value={selectedTab}
      >
        <Tabs.List aria-label="Workspace sections" className="tabs-list">
          {tabOptions.map((option, index) => (
            <Tabs.Tab
              className="tabs-tab"
              key={option.value}
              value={option.value}
            >
              <span aria-hidden="true">0{index + 1}</span>
              {option.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        <div className="panel-frame">
          <Tabs.Panel className="tabs-panel" value="overview">
            <Overview />
          </Tabs.Panel>
          <Tabs.Panel className="tabs-panel" value="activity">
            <Activity />
          </Tabs.Panel>
          <Tabs.Panel className="tabs-panel" value="members">
            <Members />
          </Tabs.Panel>
        </div>
      </Tabs.Root>

      <p aria-live="polite" className="status">
        {mount === "all"
          ? "Hidden panels stay mounted, preserving local state."
          : "Only the active panel is mounted; inactive state is discarded."}
      </p>
    </main>
  );
}
