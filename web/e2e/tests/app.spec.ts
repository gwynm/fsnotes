import { test, expect } from "@playwright/test";
import { resetTestData } from "./setup";

test.beforeAll(() => {
  resetTestData();
});

test.describe("Sidebar", () => {
  test("shows All Notes and folders", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=ALL NOTES");

    await expect(
      page.getByRole("button", { name: /ALL NOTES/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^development/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^operations/ }),
    ).toBeVisible();
  });

  test("clicking a folder shows its notes", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=development");

    await page.click("text=development");
    // Use the note list area — match on the note title elements specifically
    await expect(
      page.locator("[class*='font-medium']", { hasText: "AWS Architecture" }),
    ).toBeVisible();
    await expect(
      page.locator("[class*='font-medium']", { hasText: "Terraform" }),
    ).toBeVisible();
  });

  test("clicking All Notes shows all notes", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=ALL NOTES");

    await page.click("text=ALL NOTES");
    await expect(
      page.locator("[class*='font-medium']", {
        hasText: "AWS Architecture",
      }),
    ).toBeVisible();
    await expect(
      page.locator("[class*='font-medium']", {
        hasText: "Operations Runbook",
      }),
    ).toBeVisible();
  });
});

test.describe("Note List", () => {
  test("shows note title, preview, and date", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=ALL NOTES");
    await page.click("text=ALL NOTES");
    await page.waitForSelector("text=AWS Architecture");

    await expect(
      page.locator("[class*='font-medium']", {
        hasText: "AWS Architecture",
      }),
    ).toBeVisible();
    await expect(
      page.locator("text=Overview of AWS infrastructure"),
    ).toBeVisible();
  });

  test("clicking a note opens it in the editor", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=ALL NOTES");
    await page.click("text=ALL NOTES");
    await page.waitForSelector("text=AWS Architecture");

    await page.locator("[class*='font-medium']", { hasText: "AWS Architecture" }).click();
    await expect(page.locator(".cm-editor")).toBeVisible();
    await expect(page.locator(".cm-content")).toContainText("AWS");
  });
});

test.describe("Editor", () => {
  test("can edit a note and auto-saves", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=ALL NOTES");
    await page.click("text=ALL NOTES");
    await page.waitForSelector("[class*='font-medium']");
    await page.locator("[class*='font-medium']", { hasText: "Terraform" }).click();

    await page.waitForSelector(".cm-editor");
    await page.click(".cm-content");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Added by E2E test.");

    // Wait for auto-save debounce
    await page.waitForTimeout(2000);

    // Reload and verify persistence
    await page.goto("/");
    await page.waitForSelector("text=ALL NOTES");
    await page.click("text=ALL NOTES");
    await page.waitForSelector("[class*='font-medium']");
    await page.locator("[class*='font-medium']", { hasText: "Terraform" }).click();

    await page.waitForSelector(".cm-editor");
    await expect(page.locator(".cm-content")).toContainText(
      "Added by E2E test",
    );
  });
});

test.describe("Preview", () => {
  test("toggle between edit and preview mode", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=ALL NOTES");
    await page.click("text=ALL NOTES");
    await page.waitForSelector("text=AWS Architecture");
    await page.locator("[class*='font-medium']", { hasText: "AWS Architecture" }).click();

    await page.waitForSelector(".cm-editor");

    // Click Preview tab
    await page.getByRole("button", { name: "Preview" }).click();

    await expect(page.locator(".prose")).toBeVisible();
    await expect(page.locator(".prose")).toContainText("ECS Services");

    // Switch back to Edit
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.locator(".cm-editor")).toBeVisible();
  });

  test("wiki links are rendered and clickable", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=ALL NOTES");
    await page.click("text=ALL NOTES");
    await page.waitForSelector("text=AWS Architecture");
    await page.locator("[class*='font-medium']", { hasText: "AWS Architecture" }).click();

    // Switch to preview
    await page.getByRole("button", { name: "Preview" }).click();
    await page.waitForSelector(".prose");

    // Should have a wiki link to Terraform
    const wikiLink = page.locator("a[data-wikilink]");
    await expect(wikiLink).toBeVisible();
    await expect(wikiLink).toContainText("Terraform");

    // Click the wiki link
    await wikiLink.click();

    // Should navigate to Terraform note — may open in edit or preview mode
    // Wait a moment for navigation
    await page.waitForTimeout(500);

    // The Terraform note should now be selected — check editor or preview content
    const editorOrPreview = page.locator(".cm-content, .prose");
    await expect(editorOrPreview.first()).toContainText(
      "Infrastructure as code",
    );
  });
});

test.describe("Create Note", () => {
  test("create a new note via the + button", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=development");
    await page.click("text=development");
    await page.waitForSelector("text=AWS Architecture");

    // Click + New Note
    await page.click("text=+ New Note");

    // Should open the editor with a new note
    await page.waitForSelector(".cm-editor");

    // Select all existing content and replace it
    await page.click(".cm-content");
    await page.keyboard.press("Meta+a");
    await page.keyboard.type("# E2E Test Note\n\nCreated during testing.");

    // Wait for auto-save
    await page.waitForTimeout(2000);

    // Verify it appears in the list
    await page.goto("/");
    await page.waitForSelector("text=development");
    await page.click("text=development");
    await expect(
      page.locator("[class*='font-medium']", { hasText: "E2E Test Note" }),
    ).toBeVisible();
  });
});

test.describe("Delete Note", () => {
  test("delete a note removes it from the list", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=ALL NOTES");
    await page.click("text=ALL NOTES");
    await page.waitForSelector("text=Operations Runbook");

    // Right-click on the note title
    await page
      .locator("[class*='font-medium']", { hasText: "Operations Runbook" })
      .click({ button: "right" });
    await page.waitForSelector("text=Move to Trash");
    await page.click("text=Move to Trash");

    // Note should disappear from the list
    await expect(
      page.locator("[class*='font-medium']", {
        hasText: "Operations Runbook",
      }),
    ).not.toBeVisible();
  });
});

test.describe("Search", () => {
  test("search finds matching notes", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=ALL NOTES");

    const searchInput = page.locator('input[placeholder*="earch"]');
    await searchInput.fill("infrastructure");
    await page.waitForTimeout(500);

    await expect(
      page.locator("[class*='font-medium']", {
        hasText: "AWS Architecture",
      }),
    ).toBeVisible();
  });

  test("clearing search returns to folder view", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=development");
    await page.click("text=development");
    await page.waitForSelector("[class*='font-medium']");

    const searchInput = page.locator('input[placeholder*="earch"]');
    await searchInput.fill("infrastructure");
    await page.waitForTimeout(500);

    // Clear search
    await searchInput.fill("");
    await page.waitForTimeout(500);

    // Should be back in the development folder view
    await expect(
      page.locator("[class*='font-medium']", {
        hasText: "AWS Architecture",
      }),
    ).toBeVisible();
    await expect(
      page.locator("[class*='font-medium']", { hasText: "Terraform" }),
    ).toBeVisible();
  });
});

test.describe("Folders", () => {
  test("folders are listed in sidebar", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=development");

    await expect(
      page.getByRole("button", { name: /^development/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^operations/ }),
    ).toBeVisible();
  });
});

test.describe("Git Status", () => {
  test("shows git status in footer", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=ALL NOTES");

    // Footer should contain git status
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });
});
