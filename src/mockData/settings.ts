import { CompanySettings, UserSettings } from "@/types/settings";

export let mockCompanySettings: CompanySettings = {
  companyName: "Clínica Moraes Cardoso",
  razaoSocial: "",
  cnpj: "",
  crmv: "56895 SP",
  mapaRegistration: "MV0052750203",
  address: "Rua Campos Salles, 175, Centro",
  city: "Itapira",
  zipCode: "13970-170",
  phone: "(19) 99363-1981",
  email: "contato@clinicamoraescardoso.com.br",
  logoUrl: "/placeholder.svg", // Placeholder para o logo
};

export let mockUserSettings: UserSettings = {
  userName: "Dr. William Cardoso",
  userEmail: "william@example.com",
  userCrmv: "56895/SP",
  userMapaRegistration: "MV0052750203",
  signatureText: "Dr. William Cardoso",
};

// Função para atualizar as configurações da empresa (para uso no mock)
export const updateMockCompanySettings = (newSettings: Partial<CompanySettings>) => {
  mockCompanySettings = { ...mockCompanySettings, ...newSettings };
};

// Função para atualizar as configurações do usuário (para uso no mock)
export const updateMockUserSettings = (newSettings: Partial<UserSettings>) => {
  mockUserSettings = { ...mockUserSettings, ...newSettings };
};