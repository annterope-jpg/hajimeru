import { Share } from "react-native";

/** Opens the OS share surface with the exact previewed text and records nothing. */
export async function openSummaryShareSheet(previewedText: string): Promise<void> {
  if (!previewedText.trim()) return;
  await Share.share({ message: previewedText, title: "面談に持っていくメモ" });
}
