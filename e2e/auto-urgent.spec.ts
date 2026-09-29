import { test, expect, Page } from "@playwright/test";
import {
  uniqueTitle,
  datePlusDays,
  taskModal,
  taskRow,
  readAutoUrgentDays,
} from "./helpers";

/**
 * Auto-urgent on the Expo web build: a task whose trigger date has passed
 * must be flipped to urgent by the app (visible as the "Do First" badge).
 * The hook runs on mount and whenever tasks change, so saving the task is
 * enough to trigger it — no waiting on the 5-minute timer.
 *
 * The modal's stepper default is read from the "Mark urgent N day(s)
 * before due" sublabel, and the due date is computed from it, so the tests
 * don't depend on the default value.
 */
test.describe("auto-urgent", () => {
  /** Fill the modal through enabling auto-urgent; returns the window (days). */
  async function setupAutoUrgentTask(page: Page, title: string): Promise<number> {
    await page.getByTestId("fab").click();
    await page.getByTestId("fab-new-task").click();
    const modal = taskModal(page, "New Task");
    await expect(modal).toBeVisible();

    await modal.getByPlaceholder("Task title").fill(title);
    await modal.getByText("Schedule", { exact: true }).click();
    // A due date is required before the auto-urgent window is meaningful.
    await modal.getByText("Add due date").click();
    await modal.locator('input[type="date"]').fill(datePlusDays(10));
    await modal.getByRole("switch").click();
    return readAutoUrgentDays(modal);
  }

  test("marks a task urgent once its trigger date passes", async ({ page }) => {
    const title = uniqueTitle("e2e auto-urgent");
    await page.goto("/tasks");
    const days = await setupAutoUrgentTask(page, title);

    // Trigger date = due - days. Due in (days - 1): trigger is today.
    const modal = taskModal(page, "New Task");
    await modal.locator('input[type="date"]').fill(datePlusDays(days - 1));
    await modal.getByText("Save", { exact: true }).click();

    await expect(taskRow(page, title)).toBeVisible();
    await expect(
      taskRow(page, title).getByText("Do First", { exact: true })
    ).toBeVisible({ timeout: 30_000 });
  });

  test("does not mark a task urgent before its trigger date", async ({ page }) => {
    const title = uniqueTitle("e2e auto-urgent future");
    await page.goto("/tasks");
    const days = await setupAutoUrgentTask(page, title);

    // Due in (days + 5): trigger is 5 days out.
    const modal = taskModal(page, "New Task");
    await modal.locator('input[type="date"]').fill(datePlusDays(days + 5));
    await modal.getByText("Save", { exact: true }).click();

    await expect(taskRow(page, title)).toBeVisible();
    await expect(
      taskRow(page, title).getByText("Do First", { exact: true })
    ).toHaveCount(0, { timeout: 5_000 });
  });
});
