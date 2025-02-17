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
    const response = await apiRequest("POST", "/api/clipboard", { content, userId });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to save clipboard entry:", error);
    throw error; // Re-throw to handle in the mutation
  }
}