import QRCode from "qrcode";

/** PNG em data URI, pronto pra virar <Image src={...}> no PDF (@react-pdf/renderer). */
export async function generateQrCodeDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    margin: 1,
    width: 240,
    color: { dark: "#111827", light: "#FFFFFF" },
  });
}
