# Relay

Relay is a video workflow workspace for freelance video editors and small editing teams.

## Product

**Relay**:
The video workflow workspace and app name. Relay is designed first for freelance video editors, then for small editing teams.
_Avoid_: Frame Desk, CutLab

**Workspace**:
One work area owned by an account. It starts solo and becomes a Team workspace when the Owner invites another person.

**Client**:
A durable record for the person or company that commissions work. A Client is separate from Team membership.

**Project Group**:
An optional group of related Projects for one Client, such as a retainer, campaign, or production run. It is not a unit of delivery or salary progress.

**Project**:
One tracked video job. A Project is the unit of workflow, delivery, earnings, reporting, and Salary Plan progress.

**Project Output**:
One promised result inside a Project, such as a main video, short cut, thumbnail, captions, or document.
_Avoid_: Deliverable target, task

**Media Version**:
One linked or uploaded version of a Project Output. A Project Output has one current Media Version and may retain older versions.

**Review**:
A feedback cycle for a Media Version. A Comment is one note within a Review.

**Workflow Template**:
A reusable Project setup containing workflow stages, starter Project Outputs, relative deadlines, roles, and Client Portal defaults. Relay copies it into a new Project.
_Avoid_: Template

**Salary Plan**:
A Client-specific contract that defines how many delivered Projects complete a batch and the amount due for that batch.

**Salary Batch**:
An immutable record of a completed Salary Plan batch, including the copied terms and Projects that completed it.

**Team Member**:
A person with Owner, Editor, or Viewer access inside a Workspace.

**Client Portal**:
A token-based, Project-specific page for client review and delivery. It exposes only content selected for that portal.

**Client Contact**:
A person associated with a Client who can sign in to Relay. A Client Contact is not a Team Member and does not consume an internal seat.

**Client Hub**:
An authenticated, Client-specific area that shows the Projects explicitly published for that Client across the Workspace.

**External Video Embed**:
A reference to video hosted outside Relay. It lets a Project use video without consuming Relay file storage.

**Subscription Plan**:
A commercial access level assigned to a Workspace. It defines the Workspace's paid capabilities and Storage Quota.

**Creator Plan**:
The Subscription Plan for a solo editor who works in a personal Workspace and may share work with Clients.

**Team Plan**:
The Subscription Plan for a Workspace with multiple internal Editors and Viewers.

**Editor Seat**:
Paid capacity for one internal Editor in a Team Workspace. Only additional Editor Seats beyond the three included Team seats increase the Workspace's shared Storage Quota, by 2 GB each. Included seats do not add quota.

**Storage Quota**:
The maximum amount of Relay-hosted media a Workspace may store. Reaching the quota blocks new uploads but keeps existing files available.

**Storage Add-on**:
An extra Storage Quota purchased separately from a Subscription Plan.

**Public Profile**:
A public page containing only the identity, work, links, and stats its owner chose to publish.

**Resource**:
A saved external link or reference used by the Team. It is not a Project Output, Media Version, or Project file.

## Interface

**App Shell**:
The shared sidebar, top bar, mobile navigation, and content frame around internal routes.

**Authenticated Workspace UI**:
The internal routes rendered within the App Shell and built from the Page System. It excludes public profiles, the client portal, access, contact, and legal routes.

**Page System**:
The shared page headers, toolbars, sections, metric strips, tables, empty states, and pane layouts used inside the App Shell.

**Density**:
The spacing and control size of repeated workspace surfaces. The workspace uses one balanced global density; purpose-built controls such as data tables may keep local compact variants.

**UI Component Boundary**:
Feature screens use owned shadcn components from `components/ui`. Radix and selected Animate UI behavior stay behind that component layer rather than being imported into feature screens.
