import { domToCanvas } from "modern-screenshot";
import jsPDF from "jspdf";

/**
 * Render the infographic element to a multi-page A4 PDF.
 *
 * We use `modern-screenshot` instead of html2canvas because it relies on the
 * browser's native SVG <foreignObject> rendering, which understands modern CSS
 * (including Tailwind v4 `oklch()` colors). Logos are embedded as data URIs
 * (see logoData.ts) so the snapshot needs no cross-origin fetches.
 */
export async function generatePdf(
  el: HTMLElement
): Promise<{ blob: Blob; dataUrl: string }> {
  try {
    // @ts-ignore
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  } catch {}

  const canvas = await domToCanvas(el, {
    scale: 2,
    backgroundColor: "#f7f2e7",
    style: { transform: "none" },
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const blob = pdf.output("blob");
  const dataUrl = pdf.output("datauristring");
  return { blob, dataUrl };
}

/**
 * Render the infographic element to a single high-resolution PNG image,
 * ideal for sharing directly on social media / WhatsApp.
 */
export async function generatePng(
  el: HTMLElement
): Promise<{ blob: Blob; dataUrl: string }> {
  try {
    // @ts-ignore
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  } catch {}

  const canvas = await domToCanvas(el, {
    scale: 2.5,
    backgroundColor: "#f7f2e7",
    style: { transform: "none" },
  });

  const dataUrl = canvas.toDataURL("image/png");
  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b as Blob), "image/png")
  );
  return { blob, dataUrl };
}
