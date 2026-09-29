import { Page, expect } from "@playwright/test";

/** Unique, collision-free title so specs never fight over the same row. */
export function uniqueTitle(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
}

/** YYYY-MM-DD, `days` from today (local time, matching the date inputs). */
export function datePlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * The task modal root: innermost div containing both the mode header
 * ("New Task" / "Edit Task") and the Save button. React Native Web renders
 * no roles for these views, so text-scoping is the reliable handle.
 */
export function taskModal(page: Page, mode: "New Task" | "Edit Task") {
  return page
    .locator("div")
    .filter({ has: page.getByText(mode, { exact: true }) })
    .filter({ has: page.getByText("Save", { exact: true }) })
    .last();
}

/** The list modal root (same pattern as the task modal). */
export function listModal(page: Page, mode: "New List" | "Edit List") {
  return page
    .locator("div")
    .filter({ has: page.getByText(mode, { exact: true }) })
    .filter({ has: page.getByText("Save", { exact: true }) })
    .last();
}

/** A group card that contains a given task title. */
export function groupCardWithTask(page: Page, groupName: string, taskTitle: string) {
  return page
    .locator("div")
    .filter({ has: page.getByText(groupName, { exact: true }) })
    .filter({ has: page.getByText(taskTitle, { exact: true }) })
    .last();
}

/** A task's row on /tasks, located by its unique title. */
export function taskRow(page: Page, title: string) {
  return page
    .getByTestId("task-row")
    .filter({ has: page.getByText(title, { exact: true }) });
}

export type PriorityName = "Do First" | "Schedule" | "Delegate" | "Eliminate";

export interface CreateTaskOptions {
  title: string;
  notes?: string;
  dueDate?: string; // YYYY-MM-DD
  priority?: PriorityName;
  /** When true, flips the Auto-urgent switch on (days left at default). */
  autoUrgent?: boolean;
  list?: string;
}

/** Create a task through the mobile New Task modal. Assumes we are on /tasks. */
export async function createTask(page: Page, opts: CreateTaskOptions) {
  await page.getByTestId("fab").click();
  await page.getByTestId("fab-new-task").click();
  const modal = taskModal(page, "New Task");
  await expect(modal).toBeVisible();

  await modal.getByPlaceholder("Task title").fill(opts.title);
  if (opts.notes) await modal.getByPlaceholder("Notes (optional)").fill(opts.notes);
  if (opts.dueDate) {
    await modal.getByText("Add due date").click();
    await modal.locator('input[type="date"]').fill(opts.dueDate);
  }
  if (opts.priority) {
    await modal.getByText(opts.priority, { exact: true }).click();
  }
  if (opts.autoUrgent) {
    await modal.getByRole("switch").click();
  }
  if (opts.list) {
    await modal.getByText(opts.list, { exact: true }).click();
  }

  await modal.getByText("Save", { exact: true }).click();
  await expect(taskRow(page, opts.title)).toBeVisible();
}

/** Open the Edit Task modal by tapping a task's row. */
export async function openEditModal(page: Page, title: string) {
  await taskRow(page, title).click();
  const modal = taskModal(page, "Edit Task");
  await expect(modal).toBeVisible();
  return modal;
}

/** Read the auto-urgent window (days) from the modal's sublabel. */
export async function readAutoUrgentDays(modal: ReturnType<typeof taskModal>) {
  const sub = modal.getByText(/Mark urgent \d+ day/);
  await expect(sub).toBeVisible();
  const text = (await sub.textContent()) || "";
  return parseInt(text.match(/(\d+)/)![1], 10);
}

/** Best-effort dismissal of first-run onboarding / merge prompts. */
export async function dismissFirstRunOverlays(page: Page) {
  for (const label of ["Skip", "Continue without account", "Get Started"]) {
    const el = page.getByText(label, { exact: true });
    if ((await el.count()) > 0) {
      await el.first().click();
      break;
    }
  }
  const merge = page.getByText("Add to Account", { exact: true });
  if ((await merge.count()) > 0) await merge.click();
}

/** Sign in through the UI (used by the auth setup project). */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  // Submit is a TouchableOpacity (no accessible role); its label is the
  // last "Sign in" text on the card (the first is the card title).
  await page.getByText("Sign in", { exact: true }).last().click();
  await page.waitForURL("**/tasks", { timeout: 60_000 });
  await dismissFirstRunOverlays(page);
}
