import { apiRequest } from "./queryClient";

export async function writeToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to write to clipboard:", error);
    return false;
  }
}

export async function readFromClipboard() {
  try {
    return await navigator.clipboard.readText();
  } catch (error) {
    console.error("Failed to read from clipboard:", error);
    return null;
  }
}

export async function saveClipboardEntry(content: string, userId: string) {
  try {
    await apiRequest("POST", "/api/clipboard", { content, userId });
    return true;
  } catch (error) {
    console.error("Failed to save clipboard entry:", error);
    return false;
  }
}
