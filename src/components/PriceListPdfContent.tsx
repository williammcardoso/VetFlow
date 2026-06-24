import React from "react";
import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import { mockCompanySettings, mockUserSettings } from "@/mockData/settings";
import type { CatalogItem } from "@/mockData/catalog";

Font.register({
  family: "Exo",
  fonts: [
    { src: "https://github.com/google/fonts/raw/main/ofl/exo2/Exo2-Regular.ttf", fontWeight: 400 },
    { src: "https://github.com/google/fonts/raw/main/ofl/exo2/Exo2-Bold.ttf", fontWeight: 700 },
  ],
});

Font.registerHyphenationCallback((word) => [word]);

const TEAL = "#0F766E";
const DARK = "#111827";
const GRAY = "#6B7280";
const LIGHT = "#F1F5F9";
const WHITE = "#FFFFFF";
const AMBER = "#B45309";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    paddingBottom: 50,
    fontFamily: "Exo",
    fontSize: 10,
    color: DARK,
    backgroundColor: WHITE,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  headerLeft: { flex: 1 },
  doctorName: { fontSize: 16, fontWeight: 700, color: TEAL },
  doctorTitle: { fontSize: 9, color: GRAY, marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  contactText: { fontSize: 8.5, color: GRAY, marginTop: 1, textAlign: "right" },
  divider: { height: 2, backgroundColor: TEAL, marginBottom: 10, marginTop: 6 },
  tableTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: WHITE,
    backgroundColor: TEAL,
    textAlign: "center",
    paddingVertical: 5,
    letterSpacing: 1,
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 8.5,
    color: GRAY,
    textAlign: "center",
    marginBottom: 10,
  },
  sectionHeader: {
    backgroundColor: TEAL,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  sectionHeaderText: {
    fontSize: 9,
    fontWeight: 700,
    color: WHITE,
    letterSpacing: 0.5,
  },
  tableHead: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: "#E5E7EB",
  },
  tableHeadText: {
    fontSize: 8,
    fontWeight: 700,
    color: GRAY,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tableRowAlt: { backgroundColor: LIGHT },
  itemName: { flex: 1, fontSize: 9.5, color: DARK },
  itemPrice: {
    width: 80,
    textAlign: "right",
    fontSize: 9.5,
    fontWeight: 700,
    color: TEAL,
  },
  itemCost: {
    width: 80,
    textAlign: "right",
    fontSize: 8.5,
    color: AMBER,
  },
  itemMargin: {
    width: 60,
    textAlign: "right",
    fontSize: 8.5,
    color: GRAY,
  },
  obsBox: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 8,
  },
  obsTitle: { fontSize: 8.5, fontWeight: 700, color: GRAY, marginBottom: 4 },
  obsText: { fontSize: 8, color: GRAY, marginBottom: 2 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: TEAL,
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 8, color: GRAY },
});

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const CATEGORY_LABELS: Record<string, string> = {
  cirurgia: "Cirurgias",
  exame_externo: "Exames Externos (Laboratorio)",
  exame_interno: "Exames Internos",
  vacina: "Vacinas",
  servico: "Servicos Gerais",
  produto: "Produtos",
  medicamento: "Medicamentos",
  racao: "Racoes",
  acessorio: "Acessorios",
};

const getCategoryLabel = (cat?: string) =>
  cat ? (CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)) : "Outros";

interface PriceListPdfContentProps {
  items: CatalogItem[];
  showCosts?: boolean;
}

const PriceListPdfContent: React.FC<PriceListPdfContentProps> = ({
  items,
  showCosts = false,
}) => {
  const company = mockCompanySettings;
  const user = mockUserSettings;
  const today = new Date().toLocaleDateString("pt-BR");

  const services = items.filter((i) => i.type === "service" && i.active);
  const products = items.filter((i) => i.type === "product" && i.active);

  const groupByCategory = (list: CatalogItem[]) => {
    const groups: Record<string, CatalogItem[]> = {};
    list.forEach((item) => {
      const key = item.category || (item.type === "service" ? "servico" : "produto");
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  };

  const serviceGroups = groupByCategory(services);
  const productGroups = groupByCategory(products);

  const renderGroup = (
    groupKey: string,
    groupItems: CatalogItem[],
    isInternal: boolean
  ) => (
    <View key={groupKey}>
      {/* Header do grupo — fica junto com a primeira linha */}
      <View style={styles.sectionHeader} minPresenceAhead={40}>
        <Text style={styles.sectionHeaderText}>
          {getCategoryLabel(groupKey).toUpperCase()}
        </Text>
      </View>
      {isInternal && (
        <View style={styles.tableHead}>
          <Text style={[styles.tableHeadText, { flex: 1 }]}>Procedimento</Text>
          <Text style={[styles.tableHeadText, { width: 80, textAlign: "right" }]}>Preco</Text>
          <Text style={[styles.tableHeadText, { width: 80, textAlign: "right" }]}>Custo</Text>
          <Text style={[styles.tableHeadText, { width: 60, textAlign: "right" }]}>Margem</Text>
        </View>
      )}
      {groupItems.map((item, idx) => {
        const lucro = item.price - (item.cost ?? 0);
        const margem = item.price > 0 ? Math.round((lucro / item.price) * 100) : 100;
        return (
          <View
            key={item.id}
            style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
            wrap={false}
          >
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemPrice}>{fmt(item.price)}</Text>
            {isInternal && (
              <>
                <Text style={styles.itemCost}>
                  {item.cost ? fmt(item.cost) : "-"}
                </Text>
                <Text style={styles.itemMargin}>{margem}%</Text>
              </>
            )}
          </View>
        );
      })}
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Cabecalho */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Text style={styles.doctorName}>{user.userName || company.companyName}</Text>
            <Text style={styles.doctorTitle}>
              Medico(a) Veterinario(a) - CRMV-SP {company.crmv}
            </Text>
            {company.mapaRegistration && (
              <Text style={styles.doctorTitle}>
                Registro MAPA: {company.mapaRegistration}
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.contactText}>{company.phone}</Text>
            <Text style={styles.contactText}>{company.email}</Text>
            <Text style={styles.contactText}>
              {company.address} - {company.city}
            </Text>
          </View>
        </View>

        <View style={styles.divider} fixed />

        <Text style={styles.tableTitle}>
          {showCosts ? "TABELA DE PRECOS - USO INTERNO" : "TABELA DE PRECOS"}
        </Text>
        <Text style={styles.subTitle}>
          {user.userName} - CRMV-SP {company.crmv}
        </Text>

        {/* Servicos */}
        {Object.entries(serviceGroups).map(([key, groupItems]) =>
          renderGroup(key, groupItems, showCosts)
        )}

        {/* Produtos */}
        {Object.keys(productGroups).length > 0 &&
          Object.entries(productGroups).map(([key, groupItems]) =>
            renderGroup(key, groupItems, showCosts)
          )}

        {/* Observacoes */}
        {!showCosts && (
          <View style={styles.obsBox}>
            <Text style={styles.obsTitle}>OBSERVACOES</Text>
            <Text style={styles.obsText}>
              - Valores referem-se exclusivamente ao ato cirurgico/procedimento.
            </Text>
            <Text style={styles.obsText}>
              - Anestesia, materiais e internacao cobrados a parte quando nao especificado.
            </Text>
            <Text style={styles.obsText}>
              - Valores sujeitos a reajuste sem aviso previo.
            </Text>
          </View>
        )}

        {/* Footer fixo em todas as paginas */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {showCosts ? "DOCUMENTO INTERNO - NAO COMPARTILHAR" : company.companyName}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Pagina ${pageNumber} de ${totalPages} - Gerado em ${today}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};

export default PriceListPdfContent;
