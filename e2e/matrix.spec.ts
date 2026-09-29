import { test, expect } from "@playwright/test";
import {
  uniqueTitle,
  taskRow,
  createTask,
  openEditModal,
} from "./helpers";

/**
 * Eisenhower matrix on the Expo web build.
 *
 * Quadrant membership is asserted through the task row's priority badge:
 * React Native Web gives us no stable quadrant-container handle, so we
 * verify the badge follows the priority on /matrix after an edit. (The web
 * suite asserts the same behavior against the real droppable containers.)
 */
test.describe("matrix", () => {
  test("shows a task with its priority badge and updates it on edit", async ({
    page,
  }) => {
    const title = uniqueTitle("e2e matrix");
    await page.goto("/tasks");
    await createTask(page, { title, priority: "Schedule" });

    await page.goto("/matrix");
    const row = taskRow(page, title);
    await expect(row).toBeVisible();
    await expect(
      row.getByText("Schedule", { exact: true })
    ).toBeVisible();

    const modal = await openEditModal(page, title);
    await modal.getByText("Do First", { exact: true }).click();
    await modal.getByText("Save", { exact: true }).click();

    await page.goto("/matrix");
    const moved = taskRow(page, title);
    await expect(moved).toBeVisible();
    await expect(
      moved.getByText("Do First", { exact: true })
    ).toBeVisible();
    await expect(
      moved.getByText("Schedule", { exact: true })
    ).toHaveCount(0);
  });
});
