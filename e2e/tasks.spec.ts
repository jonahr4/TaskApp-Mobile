import { test, expect } from "@playwright/test";
import {
  uniqueTitle,
  datePlusDays,
  taskModal,
  taskRow,
  createTask,
  openEditModal,
} from "./helpers";

/**
 * Core task lifecycle on /tasks (Expo web build).
 *
 * NOTE: deletion is not covered here — the app's delete flow uses
 * Alert.alert, which React Native Web does not implement, so the confirm
 * never appears on web. Covered again once the app uses a web-safe
 * confirmation. Created tasks use unique titles so runs stay independent.
 */
test.describe("tasks", () => {
  test("creates a task with just a title", async ({ page }) => {
    const title = uniqueTitle("e2e basic");
    await page.goto("/tasks");
    await createTask(page, { title });
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  });

  test("creates a task with all fields", async ({ page }) => {
    const title = uniqueTitle("e2e full");
    await page.goto("/tasks");
    await createTask(page, {
      title,
      notes: "e2e notes",
      dueDate: datePlusDays(7),
      priority: "Schedule",
    });
    await expect(taskRow(page, title)).toBeVisible();
    // The priority badge renders inside the task's row.
    await expect(
      taskRow(page, title).getByText("Schedule", { exact: true })
    ).toBeVisible();
  });

  test("edits a task title", async ({ page }) => {
    const title = uniqueTitle("e2e edit");
    const edited = `${title} edited`;
    await page.goto("/tasks");
    await createTask(page, { title });

    const modal = await openEditModal(page, title);
    await modal.getByPlaceholder("Task title").fill(edited);
    await modal.getByText("Save", { exact: true }).click();

    await expect(page.getByText(edited, { exact: true })).toBeVisible();
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  });

  test("completes and uncompletes a task", async ({ page }) => {
    const title = uniqueTitle("e2e complete");
    await page.goto("/tasks");
    await createTask(page, { title });

    const modal = await openEditModal(page, title);
    await modal.getByText("Mark Done", { exact: true }).click();
    await expect(modal.getByText("Completed", { exact: true })).toBeVisible();
    await modal.getByText("Save", { exact: true }).click();

    const modal2 = await openEditModal(page, title);
    await expect(modal2.getByText("Completed", { exact: true })).toBeVisible();
    await modal2.getByText("Completed", { exact: true }).click();
    await expect(modal2.getByText("Mark Done", { exact: true })).toBeVisible();
    await modal2.getByText("Save", { exact: true }).click();
  });

  test("requires a title before saving", async ({ page }) => {
    await page.goto("/tasks");
    await page.getByTestId("fab").click();
    await page.getByTestId("fab-new-task").click();
    const modal = taskModal(page, "New Task");
    await expect(modal.getByText("Save", { exact: true })).toBeDisabled();
  });

  test.skip("deletes a task", async () => {
    // Blocked on web: deletion confirms via Alert.alert, which React
    // Native Web does not implement, so the dialog never appears.
  });
});
