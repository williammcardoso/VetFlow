import React from "react";
import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import Html from "react-pdf-html";
import { mockCompanySettings, mockUserSettings } from "@/mockData/settings";

Font.register({
  family: "Exo",
  fonts: [
    {
      src: "https://github.com/google/fonts/raw/main/ofl/exo2/Exo2-Regular.ttf",
      fontWeight: 400,
    },
    {
      src: "https://github.com/google/fonts/raw/main/ofl/exo2/Exo2-Bold.ttf",
      fontWeight: 700,
    },
    {
      src: "https://github.com/google/fonts/raw/main/ofl/exo2/Exo2-Italic.ttf",
      fontWeight: 400,
      fontStyle: "italic",
    },
    {
      src: "https://github.com/google/fonts/raw/main/ofl/exo2/Exo2-BoldItalic.ttf",
      fontWeight: 700,
      fontStyle: "italic",
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Exo",
    fontSize: 12,
    color: "#333",
  },
  clinicHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  clinicInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  clinicDetails: {
    fontSize: 9,
    color: "#666",
  },
  clinicAddressPhone: {
    textAlign: "right",
    fontSize: 9,
    color: "#666",
  },
  bodyWrapper: {
    marginTop: 10,
  },
});

const htmlStyles: Record<string, any> = {
  body: {
    fontSize: 11,
    color: "#333333",
    lineHeight: 1.4,
    fontFamily: "Helvetica",
  },
  p: {
    marginTop: 0,
    marginBottom: 6,
  },
  span: {
    lineHeight: 1.45,
  },
  strong: {
    fontWeight: 700,
  },
  b: {
    fontWeight: 700,
  },
  em: {
    fontStyle: "italic",
  },
  i: {
    fontStyle: "italic",
  },
  u: {
    textDecoration: "underline",
  },
  s: {
    textDecoration: "line-through",
  },
  strike: {
    textDecoration: "line-through",
  },
  del: {
    textDecoration: "line-through",
  },
  blockquote: {
    borderLeftWidth: 2,
    borderLeftColor: "#d1d5db",
    paddingLeft: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  ul: {
    marginTop: 4,
    marginBottom: 6,
    marginLeft: 14,
    paddingLeft: 8,
  },
  ol: {
    marginTop: 4,
    marginBottom: 6,
    marginLeft: 14,
    paddingLeft: 8,
  },
  li: {
    marginBottom: 2,
  },
  h1: {
    fontWeight: 700,
    fontSize: 18,
    marginBottom: 6,
  },
  h2: {
    fontWeight: 700,
    fontSize: 16,
    marginBottom: 6,
  },
  h3: {
    fontWeight: 700,
    fontSize: 14,
    marginBottom: 6,
  },
  h4: {
    fontWeight: 700,
    fontSize: 12,
    marginBottom: 6,
  },
};

function normalizeHtmlForPdf(html: string): string {
  if (!html) return "";

  const normalizeFontFamilyValue = (raw: string) => {
    const family = raw.replace(/["']/g, "").split(",")[0].trim().toLowerCase();
    
    if (family.includes("courier") || family.includes("mono")) return "Courier";
    if (family.includes("times") || family.includes("serif")) return "Times-Roman";
    if (family.includes("arial") || family.includes("helvetica") || family.includes("sans")) return "Helvetica";
    
    return "Exo";
  };

  // Normalize font-family declarations to built-in react-pdf families.
  // Fix regex to stop at semicolon, quote or brace to avoid consuming next styles.
  let normalized = html.replace(/font-family\s*:\s*([^;"}]+)/gi, (_m, family) => {
    return `font-family: ${normalizeFontFamilyValue(String(family))}`;
  });

  // Convert editor CSS pixels to PDF points with explicit mapping.
  const pxToPtMap: Record<string, number> = {
    "12": 9,
    "13": 10,
    "15": 11,
    "16": 12,
    "19": 14,
    "21": 16,
    "24": 18,
    "27": 20,
    "29": 22,
    "32": 24,
    "37": 28,
  };
  normalized = normalized.replace(/font-size\s*:\s*(\d+(?:\.\d+)?)px/gi, (_m, pxValue) => {
    const px = String(parseInt(String(pxValue), 10));
    const pt = pxToPtMap[px] ?? Math.max(6, Math.round(parseFloat(px) * 0.75 * 100) / 100);
    return `font-size: ${pt}pt`;
  });

  // Convert text-indent into a sequence of non-breaking spaces inserted at paragraph start
  // so only the first line appears indented in renderers that don't support text-indent.
  normalized = normalized.replace(
    /<(p|div)([^>]*)style\s*=\s*["']([^"']*text-indent\s*:\s*([^;"']+)[^"']*)["']([^>]*)>([\s\S]*?)<\/\1>/gi,
    (_m, tag, beforeAttrs, fullStyle, indentValue, afterAttrs, inner) => {
      const style = String(fullStyle || "");
      const val = String(indentValue || "").trim();
      // remove text-indent from style
      const newStyle = style.replace(/(?:^|;)\s*text-indent\s*:\s*[^;]+;?/i, "").trim().replace(/;$/, "");
      // determine number of &nbsp; to insert (approx 8px per &nbsp)
      let count = 4;
      const pxMatch = val.match(/(\d+(?:\.\d+)?)px/);
      if (pxMatch) {
        const px = parseFloat(pxMatch[1]);
        count = Math.max(1, Math.round(px / 8));
      } else {
        const ptMatch = val.match(/(\d+(?:\.\d+)?)pt/);
        if (ptMatch) {
          const pt = parseFloat(ptMatch[1]);
          // convert pt->px roughly (1pt ~ 1.333px)
          const px = pt * 1.333;
          count = Math.max(1, Math.round(px / 8));
        }
      }
      const nbsp = Array(count).fill("&nbsp;").join("");
      const attrsBefore = String(beforeAttrs || "") + (newStyle ? ` style="${newStyle}"` : "") + String(afterAttrs || "");
      return `<${tag}${attrsBefore}>${nbsp}${inner}</${tag}>`;
    }
  );

  // Convert unsupported inline style values that may break renderer.
  normalized = normalized.replace(/line-height\s*:\s*normal/gi, "line-height: 1.4");

  // Flatten list markup to avoid marker/text line-break issues in react-pdf-html.
  const normalizeList = (listInner: string, ordered: boolean) => {
    const liMatches = Array.from(listInner.matchAll(/<li([^>]*)>([\s\S]*?)<\/li>/gi));
    if (!liMatches.length) return "";

    const extractAllowedInlineStyle = (rawAttrs: string, rawHtml: string) => {
      const styleFromLi = (rawAttrs.match(/style\s*=\s*["']([^"']*)["']/i)?.[1] || "").trim();
      const styleFromChild = (rawHtml.match(/style\s*=\s*["']([^"']*)["']/i)?.[1] || "").trim();
      const merged = `${styleFromLi};${styleFromChild}`;
      const allowed = merged
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((decl) =>
          /^(font-family|font-size|color|background-color|font-weight|font-style|text-decoration|text-align|line-height|padding-left|margin-left|text-indent)\s*:/i.test(
            decl
          )
        );
      return allowed.join("; ");
    };

    return liMatches
      .map((m, idx) => {
        const attrs = m[1] || "";
        const raw = m[2] || "";
        const plainText = raw
          .replace(/<\/?(p|div|span)[^>]*>/gi, " ")
          .replace(/<br\s*\/?>/gi, " ")
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/gi, " ")
          .replace(/\s+/g, " ")
          .trim();
        const marker = ordered ? `${idx + 1}.` : "•";
        const keepStyle = extractAllowedInlineStyle(attrs, raw);
        const lineStyle = `margin-left: 14px; margin-bottom: 4px; line-height: 1.4; ${keepStyle}`.trim();
        return `<p style="${lineStyle}">${marker} ${plainText}</p>`;
      })
      .join("");
  };

  normalized = normalized.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_m, inner) => normalizeList(String(inner), false));
  normalized = normalized.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m, inner) => normalizeList(String(inner), true));

  return normalized;
}

function estimatePagesFromText(html: string, fontSizePt = 11): number {
  if (!html) return 0;
  const stripped = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const totalChars = Math.max(1, stripped.length);

  const pageHeightPt = 842;
  const verticalPadding = 30 * 2;
  const headerApprox = 160;
  const usableHeight = Math.max(100, pageHeightPt - verticalPadding - headerApprox);

  const lineHeightFactor = 1.5;
  const lineHeightPt = fontSizePt * lineHeightFactor;
  const linesPerPage = Math.floor(usableHeight / lineHeightPt) || 1;

  const baseCharsPerLineAt12 = 60;
  const charsPerLine = Math.max(40, Math.round(baseCharsPerLineAt12 * (12 / fontSizePt)));

  const charsPerPage = charsPerLine * linesPerPage;
  return Math.max(1, Math.ceil(totalChars / charsPerPage));
}

// Export helpers so callers can estimate pages before rendering/probing.
export { normalizeHtmlForPdf, estimatePagesFromText };

interface DocumentPdfContentProps {
  documentName: string;
  content: string;
  // optional external override used by caller to force a probe font size
  forceFontSize?: number;
  // when true, apply a much more aggressive compact rendering (smaller paddings, tighter line-height)
  forceCompact?: boolean;
}
const DocumentPdfContent: React.FC<DocumentPdfContentProps> = ({ documentName, content, forceFontSize, forceCompact }) => {
  const normalizedHtml = normalizeHtmlForPdf(content || "");
  const baseFontSize = Number(htmlStyles.body?.fontSize) || 11;

  // We only apply compact rendering when explicitly requested via forceCompact
  // (the probe in PatientRecordPage triggers forceCompact when initial probes show >1 pages).
  const pagesDefault = estimatePagesFromText(normalizedHtml, baseFontSize);
  const AGGRESSIVE_COMPACT_SCALE = 0.6; // aggressive compact scale applied to body only

  // Determine final font size taking into account external probes/forced compact
  let finalFontSize = baseFontSize;
  if (typeof forceFontSize === "number" && forceFontSize > 0) {
    finalFontSize = Math.max(6, forceFontSize);
  } else if (forceCompact) {
    finalFontSize = Math.max(6, Math.round(baseFontSize * AGGRESSIVE_COMPACT_SCALE * 100) / 100);
  } else {
    finalFontSize = baseFontSize;
  }

  // Apply proportional scaling to header sizes and page padding so the whole
  // document visually shrinks (not only body text) when we reduced font.
  const scale = finalFontSize / baseFontSize;
  const basePadding = (styles.page as any).padding ?? 30;
  // Compact mode is active only when explicitly forced by the probe
  const compactActive = Boolean(forceCompact);
  // Keep page padding (margins) unchanged — user requested not to modify margins.
  const pagePadding = basePadding;
  const pageStyle = { ...styles.page, fontSize: finalFontSize, padding: pagePadding };

  const clinicNameBase = (styles.clinicName as any).fontSize || 16;
  const clinicDetailsBase = (styles.clinicDetails as any).fontSize || 9;
  const clinicAddressBase = (styles.clinicAddressPhone as any).fontSize || 9;

  // Do not reduce header sizes aggressively — keep clinic/header fonts close to originals.
  const scaledClinicNameStyle = {
    ...styles.clinicName,
    fontSize: Math.max(12, Math.round(clinicNameBase)), // keep original-ish size
  };
  const scaledClinicDetailsStyle = {
    ...styles.clinicDetails,
    fontSize: Math.max(9, Math.round(clinicDetailsBase)),
  };
  const scaledClinicAddressPhoneStyle = {
    ...styles.clinicAddressPhone,
    fontSize: Math.max(9, Math.round(clinicAddressBase)),
  };

  // Build HTML stylesheet used by react-pdf-html. When compact mode is active,
  // tighten margins, reduce heading sizes and line-heights to increase density
  // similar to how prescriptions are rendered.
  const compactOverrides: Record<string, any> = compactActive
    ? {
        // body font-size and line-height will be set below using a computed value
        body: {
          fontSize: finalFontSize,
        },
        p: { marginTop: 0, marginBottom: 4 },
        span: { lineHeight: 1.25 },
        li: { marginBottom: 3 },
        ul: { marginTop: 4, marginBottom: 6, marginLeft: 10, paddingLeft: 6 },
        ol: { marginTop: 4, marginBottom: 6, marginLeft: 10, paddingLeft: 6 },
        h1: { fontWeight: 700, fontSize: Math.max(10, Math.round((htmlStyles.h1.fontSize || 18) * 0.55)), marginBottom: 6 },
        h2: { fontWeight: 700, fontSize: Math.max(9, Math.round((htmlStyles.h2.fontSize || 16) * 0.60)), marginBottom: 5 },
        h3: { fontWeight: 700, fontSize: Math.max(9, Math.round((htmlStyles.h3.fontSize || 14) * 0.65)), marginBottom: 4 },
        h4: { fontWeight: 700, fontSize: Math.max(8, Math.round((htmlStyles.h4.fontSize || 12) * 0.75)), marginBottom: 3 },
        blockquote: { borderLeftWidth: 1, paddingLeft: 6, marginTop: 1, marginBottom: 3 },
      }
    : {};

  // compute a sensible line-height: keep it proportional to font-size but not too small
  const baseLineHeight = (htmlStyles.body && htmlStyles.body.lineHeight) || 1.4;
  const computedLineHeight = compactActive
    ? Math.max(1.2, Math.round((finalFontSize / baseFontSize) * baseLineHeight * 100) / 100)
    : finalFontSize <= 9
    ? 1.25
    : baseLineHeight;

  const htmlSheet = {
    ...htmlStyles,
    ...compactOverrides,
    body: {
      ...htmlStyles.body,
      ...(compactOverrides.body || { fontSize: finalFontSize }),
      fontSize: finalFontSize,
      lineHeight: computedLineHeight,
    },
  };
  // Debugging info to help tune sizing at runtime
  try {
    // eslint-disable-next-line no-console
    console.debug("[DocumentPdfContent] baseFontSize:", baseFontSize, "pagesDefault:", pagesDefault, "finalFontSize:", finalFontSize, "scale:", scale, "normalizedLen:", normalizedHtml.length);
  } catch {}
  // If we are forcing a different font size (probe/compact), scale inline font-size declarations
  // in the normalized HTML so the body actually shrinks (inline styles otherwise override body).
  let contentHtml = normalizedHtml;
  if (Math.abs(scale - 1) > 0.001) {
    try {
      // scale 'pt' values
      contentHtml = contentHtml.replace(/font-size\s*:\s*(\d+(?:\.\d+)?)pt/gi, (_m, ptVal) => {
        const pt = parseFloat(ptVal);
        const next = Math.max(6, Math.round(pt * scale * 100) / 100);
        return `font-size: ${next}pt`;
      });
      // scale 'px' values just in case (convert px->pt ~ *0.75 then scale)
      contentHtml = contentHtml.replace(/font-size\s*:\s*(\d+(?:\.\d+)?)px/gi, (_m, pxVal) => {
        const px = parseFloat(pxVal);
        const pt = Math.round(px * 0.75 * 100) / 100;
        const next = Math.max(6, Math.round(pt * scale * 100) / 100);
        return `font-size: ${next}pt`;
      });
      // eslint-disable-next-line no-console
      console.debug("[DocumentPdfContent] applied inline font-size scaling, newLen:", contentHtml.length);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug("[DocumentPdfContent] scale inline error:", e);
    }
  }
  return (
    <Document title={documentName}>
      <Page size="A4" style={pageStyle}>
        <View style={styles.clinicHeader} fixed>
          <View style={styles.clinicInfoLeft}>
            <View>
              <Text style={scaledClinicNameStyle}>{mockCompanySettings.companyName}</Text>
              <Text style={scaledClinicDetailsStyle}>CRMV {mockCompanySettings.crmv}</Text>
              <Text style={scaledClinicDetailsStyle}>
                Registro no MAPA {mockCompanySettings.mapaRegistration}
              </Text>
            </View>
          </View>
          <View style={scaledClinicAddressPhoneStyle as any}>
            <Text>{mockCompanySettings.address}</Text>
            <Text>
              {mockCompanySettings.city} - CEP: {mockCompanySettings.zipCode}
            </Text>
            <Text>Telefone: {mockCompanySettings.phone}</Text>
          </View>
        </View>

        {/* removed practitioner line (do not display user name/crmv above title) */}

        <View style={styles.bodyWrapper}>
          <Html resetStyles stylesheet={htmlSheet}>
            {`<div>${contentHtml}</div>`}
          </Html>
        </View>
      </Page>
    </Document>
  );
};

export default DocumentPdfContent;
