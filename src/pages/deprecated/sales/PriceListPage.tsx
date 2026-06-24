import React from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaTags } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCatalog, updateCatalogItem } from "@/lib/catalogApi";
import type { CatalogItem } from "@/mockData/catalog";
import { toast } from "sonner";
import CurrencyInput from "@/components/CurrencyInput";

const PriceListPage = () => {
  const [items, setItems] = React.useState<CatalogItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<"product"|"service">("product");

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const data = await getCatalog();
    setItems(data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleUpdate = async (item: CatalogItem, field: keyof CatalogItem, value: any) => {
    const updated: CatalogItem = { ...item, [field]: field === 'price' ? Number(value) || 0 : value };
    const ok = await updateCatalogItem(updated);
    if (ok) {
      toast.success("Lista de preços atualizada.");
      refresh();
    } else {
      toast.error("Falha ao atualizar preço.");
    }
  };

  const filtered = items.filter(i => i.type === tab);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-gradient-to-r from-background via-card to-background p-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground group">
                <FaTags className="h-5 w-5 text-muted-foreground" /> Lista de Preços
              </h1>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Gerencie a lista de preços de produtos e serviços.
              </p>
            </div>
          </div>
          <Link to="/sales/my-sales">
            <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground transition-colors duration-200">
              <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Vendas
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Painel &gt; Vendas &gt; Lista de Preços
        </p>
      </div>

      <div className="flex-1 p-6">
        <Card className="shadow-sm border border-border rounded-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Tabela de Preços</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Carregando...
              </p>
            )}
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid grid-cols-2 w-full mb-3">
                <TabsTrigger value="product">Produtos</TabsTrigger>
                <TabsTrigger value="service">Serviços</TabsTrigger>
              </TabsList>
              <TabsContent value="product">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Ativo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.sku || "-"}</TableCell>
                        <TableCell>
                          <CurrencyInput
                            value={item.price}
                            onValueChange={(val) => handleUpdate(item, 'price', val)}
                            className="h-8 text-sm w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <select
                            value={item.active ? 'true' : 'false'}
                            onChange={(e) => handleUpdate(item, 'active', e.target.value === 'true')}
                            className="h-8 text-sm bg-input rounded-md border-border"
                          >
                            <option value="true">Ativo</option>
                            <option value="false">Inativo</option>
                          </select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="service">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Custo Lab.</TableHead>
                      <TableHead>Lucro</TableHead>
                      <TableHead>Ativo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.unit || "-"}</TableCell>
                        <TableCell>
                          <CurrencyInput
                            value={item.price}
                            onValueChange={(val) => handleUpdate(item, 'price', val)}
                            className="h-8 text-sm w-24"
                          />
                        </TableCell>
                        <TableCell>
                          {item.category === 'exame_externo' ? 'Exame Externo' :
                           item.category === 'exame_interno' ? 'Exame Interno' :
                           item.category === 'vacina' ? 'Vacina' :
                           item.category === 'cirurgia' ? 'Cirurgia' :
                           item.category === 'servico' ? 'Serviço' : '-'}
                        </TableCell>
                        <TableCell>
                          {item.cost != null
                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.cost)
                            : '-'}
                        </TableCell>
                        <TableCell className={
                          (item.price - (item.cost ?? 0)) > 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'
                        }>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            item.price - (item.cost ?? 0)
                          )}
                        </TableCell>
                        <TableCell>
                          <select
                            value={item.active ? 'true' : 'false'}
                            onChange={(e) => handleUpdate(item, 'active', e.target.value === 'true')}
                            className="h-8 text-sm bg-input rounded-md border-border"
                          >
                            <option value="true">Ativo</option>
                            <option value="false">Inativo</option>
                          </select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PriceListPage;