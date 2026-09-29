import { test, expect } from "@playwright/test";
import {
  uniqueTitle,
  datePlusDays,
  taskModal,
  createTask,
} from "./helpers";

/**
 * Calendar on the Expo web build: a task due today renders on the
 * calendar's default (today) view, and tapping it opens the editor.
 * (Tapping a future date cell is gesture-driven and not automated —
 * the web suite covers a future-dated event on the FullCalendar view.)
 */
test.describe("calendar", () => {
  test("shows a task due today and opens it for editing", async ({ page }) => {
    const title = uniqueTitle("e2e calendar");
    await page.goto("/tasks");
    await createTask(page, { title, dueDate: datePlusDays(0) });

    await page.goto("/calendar");
    const event = page.getByText(title, { exact: true });
    await expect(event.first()).toBeVisible({ timeout: 30_000 });

    await event.first().click();
    await expect(taskModal(page, "Edit Task")).toBeVisible();
  });
});
