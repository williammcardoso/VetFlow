import React from "react";

const SystemVetLogo: React.FC = () => {
  const [companyLogo, setCompanyLogo] = React.useState<string>("");

  React.useEffect(() => {
    const loadCompanyLogo = () => {
      try {
        const raw = localStorage.getItem("settings:company_cache");
        const parsed = raw ? (JSON.parse(raw) as { logoUrl?: string }) : null;
        setCompanyLogo(parsed?.logoUrl?.trim() || "");
      } catch {
        setCompanyLogo("");
      }
    };

    loadCompanyLogo();
    window.addEventListener("vf-company-settings-updated", loadCompanyLogo as EventListener);
    return () => window.removeEventListener("vf-company-settings-updated", loadCompanyLogo as EventListener);
  }, []);

  return (
    <div className="flex items-center gap-3">
      {companyLogo ? (
        <img
          src={companyLogo}
          alt="Logo da empresa"
          className="h-9 w-9 rounded-xl object-cover ring-1 ring-border"
          onError={() => setCompanyLogo("")}
        />
      ) : (
        <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center ring-1 ring-border p-1">
          <img src="/vetflow-icon.png" alt="VetFlow" className="h-full w-full object-contain" />
        </div>
      )}
      <div className="leading-tight">
        <div className="text-[14px] font-medium text-foreground/85">VetFlow</div>
        <div className="text-xs text-muted-foreground">Gestão veterinária</div>
      </div>
    </div>
  );
};

export default SystemVetLogo;