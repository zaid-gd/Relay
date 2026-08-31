"use client";

import Image from "next/image";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  LayoutGrid,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Users,
  Workflow,
} from "lucide-react";
import { useMemo, useState } from "react";

type ProjectStatus = "Delivered" | "Review" | "In progress";

type Project = {
  id: string;
  name: string;
  type: string;
  dueDate: string;
  status: ProjectStatus;
  progress: number;
  value: string;
  priority: "Low" | "Medium";
  client: string;
  order: number;
};

const seedProjects: Project[] = [
  {
    id: "summer-launch",
    name: "Summer launch film",
    type: "Client project",
    dueDate: "Jul 24",
    status: "In progress",
    progress: 72,
    value: "$1,800",
    priority: "Medium",
    client: "Aperture Coffee",
    order: 5,
  },
  {
    id: "founder-story",
    name: "Founder story cutdown",
    type: "Client project",
    dueDate: "Jul 23",
    status: "Review",
    progress: 86,
    value: "$950",
    priority: "Medium",
    client: "Orbit Labs",
    order: 4,
  },
  {
    id: "field-notes",
    name: "Field Notes episode 12",
    type: "Client project",
    dueDate: "Jul 11",
    status: "Delivered",
    progress: 100,
    value: "$1,200",
    priority: "Low",
    client: "Field Notes",
    order: 3,
  },
  {
    id: "campaign-cutdowns",
    name: "Campaign cutdowns",
    type: "Client project",
    dueDate: "Jul 29",
    status: "In progress",
    progress: 48,
    value: "$760",
    priority: "Low",
    client: "Aperture Coffee",
    order: 2,
  },
  {
    id: "product-teaser",
    name: "Product teaser",
    type: "Client project",
    dueDate: "Aug 2",
    status: "Review",
    progress: 91,
    value: "$1,050",
    priority: "Medium",
    client: "Orbit Labs",
    order: 1,
  },
];

const recentActivity = [
  "Field Notes episode 12 was delivered",
  "Founder story cutdown entered review",
  "Summer launch film was updated",
  "Product teaser entered review",
];

const teamActivity = [
  "Maya moved Founder story cutdown to review",
  "Jordan updated Summer launch film",
  "Maya delivered Field Notes episode 12",
];

const sidebarItems = [
  { label: "Dashboard", icon: LayoutGrid },
  { label: "Calendar", icon: CalendarDays },
  { label: "Workflow", icon: Workflow },
  { label: "Projects", icon: FolderKanban },
  { label: "Team", icon: Users },
  { label: "Messages", icon: MessageSquare },
];

export default function InteractiveDashboard() {
  const [projects, setProjects] = useState(seedProjects);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("Newest");
  const [activityScope, setActivityScope] = useState<"Recent" | "Team">(
    "Recent"
  );
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [selectedId, setSelectedId] = useState(seedProjects[0].id);
  const [notice, setNotice] = useState("");

  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return projects
      .filter((project) => status === "All" || project.status === status)
      .filter((project) => project.name.toLowerCase().includes(normalizedQuery))
      .toSorted((left, right) =>
        sort === "Newest"
          ? right.order - left.order
          : left.name.localeCompare(right.name)
      );
  }, [projects, query, sort, status]);

  const selectedProject =
    projects.find((project) => project.id === selectedId) ?? projects[0];
  const activity = activityScope === "Recent" ? recentActivity : teamActivity;

  const createProject = () => {
    const project: Project = {
      id: `untitled-${projects.length + 1}`,
      name: "Untitled edit",
      type: "Client project",
      dueDate: "No date",
      status: "In progress",
      progress: 0,
      value: "Pending",
      priority: "Medium",
      client: "No client",
      order: projects.length + 1,
    };
    setProjects((current) => [project, ...current]);
    setSelectedId(project.id);
    setNotice("Draft project created");
  };

  return (
    <div className="demo-dashboard">
      <aside className="demo-sidebar" aria-label="Workspace sections">
        <span className="demo-app-mark" aria-hidden="true">
          <Image
            src="/brand/relay/mark-accent.svg"
            width={20}
            height={20}
            alt=""
          />
        </span>
        <nav>
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activeSection === item.label ? "is-active" : ""}
                type="button"
                key={item.label}
                aria-label={item.label}
                onClick={() => {
                  setActiveSection(item.label);
                  setNotice(`${item.label} selected`);
                }}
              >
                <Icon size={15} strokeWidth={1.7} />
              </button>
            );
          })}
        </nav>
        <button
          className="demo-settings"
          type="button"
          aria-label="Settings"
          onClick={() => setNotice("Settings selected")}
        >
          <Settings size={15} strokeWidth={1.7} />
        </button>
      </aside>

      <div className="demo-workspace">
        <header className="demo-topbar">
          <div className="demo-breadcrumb">
            <span>Relay</span>
            <b>/</b>
            <strong>Dashboard</strong>
          </div>
          <label className="demo-quick-search">
            <Search size={14} strokeWidth={1.7} />
            <span className="sr-only">Quick search</span>
            <input
              aria-label="Quick search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Quick Search"
            />
            <kbd>Ctrl K</kbd>
          </label>
          <div className="demo-top-actions">
            <button type="button" onClick={createProject}>
              <Plus size={14} />
              Quick create
            </button>
            <button
              className="demo-icon-button"
              type="button"
              aria-label="Notifications"
              onClick={() => setNotice("No new notifications")}
            >
              <Bell size={15} />
            </button>
          </div>
        </header>

        <div className="demo-main">
          <section className="demo-dashboard-heading">
            <div>
              <span>Production desk</span>
              <h3>Good to see you, Maya.</h3>
              <p>
                Scan commitments, deadlines, handoffs, and earnings from one
                focused production ledger.
              </p>
            </div>
            <div className="demo-ledger-tools">
              <label>
                <Search size={14} />
                <span className="sr-only">Search the project ledger</span>
                <input
                  aria-label="Search the project ledger"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search the project ledger"
                />
              </label>
              <label className="demo-select">
                <SlidersHorizontal size={14} />
                <span className="sr-only">Filter projects</span>
                <select
                  aria-label="Filter projects"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option>All</option>
                  <option>Delivered</option>
                  <option>Review</option>
                  <option>In progress</option>
                </select>
              </label>
              <label className="demo-select">
                <span className="sr-only">Sort projects</span>
                <select
                  aria-label="Sort projects"
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option>Newest</option>
                  <option>Name</option>
                </select>
              </label>
            </div>
          </section>

          <section className="demo-overview-grid">
            <div className="demo-attention">
              <strong>Attention queue</strong>
              <p>No deadlines, blockers, or reviews need attention.</p>
            </div>
            <div className="demo-activity">
              <div className="demo-panel-title">
                <strong>Activity</strong>
                <div>
                  <button
                    className={activityScope === "Recent" ? "is-active" : ""}
                    onClick={() => setActivityScope("Recent")}
                    type="button"
                  >
                    Recent
                  </button>
                  <button
                    className={activityScope === "Team" ? "is-active" : ""}
                    onClick={() => setActivityScope("Team")}
                    type="button"
                  >
                    Team
                  </button>
                </div>
              </div>
              {activity.map((item) => (
                <div className="demo-activity-row" key={item}>
                  <CheckCircle2 size={14} />
                  <span>
                    <b>{item}</b>
                    <small>Workspace · 4d ago</small>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="demo-metrics" aria-label="Production metrics">
            <div>
              <span>In motion</span>
              <b>
                {
                  projects.filter((project) => project.status === "In progress")
                    .length
                }
              </b>
              <small>of {projects.length} projects</small>
            </div>
            <div>
              <span>Due this week</span>
              <b>0</b>
              <small>upcoming handoffs</small>
            </div>
            <div>
              <span>Waiting reviews</span>
              <b>
                {
                  projects.filter((project) => project.status === "Review")
                    .length
                }
              </b>
              <small>awaiting action</small>
            </div>
            <div>
              <span>Collected</span>
              <b>$2.1k</b>
              <small>$2.8k due</small>
            </div>
            <div>
              <span>Delivered</span>
              <b>18</b>
              <small>client edits</small>
            </div>
          </section>

          <section className="demo-ledger" aria-label="Project ledger">
            <div className="demo-ledger-header">
              <strong>Project ledger</strong>
              <span>{visibleProjects.length}</span>
            </div>
            <div className="demo-project-head">
              <span>Project</span>
              <span>Type</span>
              <span>Due date</span>
              <span>Status</span>
              <span>Progress</span>
              <span>Value</span>
              <span />
            </div>
            <div className="demo-project-list">
              {visibleProjects.length > 0 ? (
                visibleProjects.map((project) => (
                  <button
                    className={`demo-project-row${project.id === selectedProject.id ? " is-selected" : ""}`}
                    type="button"
                    key={project.id}
                    onClick={() => setSelectedId(project.id)}
                  >
                    <span className="demo-project-name">
                      <i>
                        <FolderKanban size={13} />
                      </i>
                      <span>
                        <b>{project.name}</b>
                        <small>No notes</small>
                      </span>
                    </span>
                    <span>{project.type}</span>
                    <span>{project.dueDate}</span>
                    <span>
                      <em data-status={project.status}>{project.status}</em>
                    </span>
                    <span className="demo-progress">
                      <small>{project.progress}%</small>
                      <i>
                        <b style={{ width: `${project.progress}%` }} />
                      </i>
                    </span>
                    <span>{project.value}</span>
                    <span>
                      <MoreHorizontal size={15} />
                    </span>
                  </button>
                ))
              ) : (
                <p className="demo-empty">No projects match this view.</p>
              )}
            </div>
          </section>

          <aside className="demo-project-detail" aria-label="Selected project">
            <div className="demo-detail-title">
              <span>
                <i />
                {selectedProject.name}
              </span>
              <MoreHorizontal size={15} />
            </div>
            <em data-status={selectedProject.status}>
              {selectedProject.status}
            </em>
            <dl>
              <div>
                <dt>Client</dt>
                <dd>{selectedProject.client}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{selectedProject.type}</dd>
              </div>
              <div>
                <dt>Due date</dt>
                <dd>{selectedProject.dueDate}</dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>{selectedProject.priority}</dd>
              </div>
            </dl>
            <div className="demo-detail-progress">
              <span>
                Progress <b>{selectedProject.progress}%</b>
              </span>
              <i>
                <b style={{ width: `${selectedProject.progress}%` }} />
              </i>
            </div>
            <div className="demo-detail-action">
              <span>
                <small>Value</small>
                <b>{selectedProject.value} tracked</b>
              </span>
              <button
                type="button"
                onClick={() => setNotice(`${selectedProject.name} opened`)}
              >
                Open <ArrowRight size={14} />
              </button>
            </div>
          </aside>
        </div>
      </div>
      {notice ? (
        <div className="demo-notice" role="status">
          {notice}
        </div>
      ) : null}
    </div>
  );
}
