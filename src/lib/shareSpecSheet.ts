export async function shareSpecSheet(
  cardElement: HTMLElement,
  ballName: string,
): Promise<void> {
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(cardElement, {
    width: 1080,
    height: 2600,
    pixelRatio: 2,
  });

  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const slug = ballName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const file = new File([blob], `spec-sheet-${slug}.png`, {
    type: "image/png",
  });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }
}
