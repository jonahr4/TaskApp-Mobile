import { test, expect } from "@playwright/test";
import {
  uniqueTitle,
  listModal,
  groupCardWithTask,
  createTask,
} from "./helpers";

/**
 * Task lists: create a list via the FAB, assign a task to it through the
 * modal's group chips, and see the task rendered under that list's card.
 *
 * NOTE: list deletion is not covered — it confirms via Alert.alert, which
 * React Native Web does not implement. Lists use unique names per run.
 */
test.describe("groups", () => {
  test("creates a list and assigns a task to it", async ({ page }) => {
    const listName = uniqueTitle("e2e list");
    const title = uniqueTitle("e2e grouped task");
    await page.goto("/tasks");

    await page.getByTestId("fab").click();
    await page.getByTestId("fab-new-list").click();
    const modal = listModal(page, "New List");
    await expect(modal).toBeVisible();
    await modal.getByPlaceholder("e.g. Work, Personal, CS 505").fill(listName);
    await modal.getByText("Save", { exact: true }).click();
    await expect(
      page.getByText(listName, { exact: true }).first()
    ).toBeVisible();

    await createTask(page, { title, list: listName });

    await expect(groupCardWithTask(page, listName, title)).toBeVisible();
  });
});
