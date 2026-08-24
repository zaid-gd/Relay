# 09 — Move Projects through the workflow

**What to build:** Let users understand Projects by workflow stage and move them with pointer drag or an equal normal stage menu. Entering Delivered must show its money or Salary Plan effect and record the real delivery time; reopening must restore current progress without rewriting settled history. Commit this slice to the shared rebuild branch; do not open a separate pull request or deploy it.

**Blocked by:** 08 — Manage Projects through the table.

**Status:** resolved

- [x] The board groups Projects by their copied workflow stages and supports dnd-kit pointer and keyboard behavior with useful announcements.
- [x] Every board action has an equal keyboard-accessible stage menu that works without drag-and-drop.
- [x] Moving to Delivered requires confirmation, records `completedAt`, and reports the earnings or Salary Plan effect in one transaction.
- [x] Reopening clears current delivery-based progress where required but never changes a completed Salary Batch automatically.

## Answer

The Projects board now uses each Project's copied workflow, supports pointer and keyboard drag with announcements, and exposes the same moves through a normal stage menu. Delivery runs through one semantic transition: Local Mode updates its Project and salary state together, while cloud mode uses one Convex mutation to update the Project and create a completed Salary Batch when needed. Reopening clears current completion progress without deleting settled batches.
