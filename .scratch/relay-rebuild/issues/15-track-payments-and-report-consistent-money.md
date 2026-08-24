# 15 — Track payments and report consistent money

**What to build:** Let authorized users track simple Project payment state and read one consistent account of work and money across Projects, Clients, Dashboard, and Reports. Daily work needing attention must lead the Dashboard before broad totals. Commit this slice to the shared rebuild branch; do not open a separate pull request or deploy it.

**Blocked by:** 14 — Track Salary Plans and immutable Salary Batches.

**Status:** resolved

- [x] A normal client Project stores one agreed amount, Paid or Unpaid state, and payment timestamp, and only authorized Owners or Editors can mark payment.
- [x] Earned always means delivered value, Collected means delivered and paid value, and Outstanding means delivered and unpaid value in the single Workspace currency.
- [x] Dashboard shows attention items first, followed by active stages, due-soon work, Salary Plan progress, work and money summaries, and recent Activity.
- [x] Reports cover completed Projects, output counts, turnaround, stage delays, money, Client totals, Salary Plans, and month, quarter, year, or custom periods with prior-period comparison and permission-safe views.
