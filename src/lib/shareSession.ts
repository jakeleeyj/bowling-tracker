import { toPng } from "html-to-image";

export async function shareSession(cardElement: HTMLElement): Promise<void> {
  const dataUrl = await toPng(cardElement, {
    width: 1080,
    height: 1920,
    pixelRatio: 2,
  });

  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], "spare-me-session.png", { type: "image/png" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spare-me-session.png";
    a.click();
    URL.revokeObjectURL(url);
  }
}
