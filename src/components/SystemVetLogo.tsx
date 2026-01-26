import React from "react";
import { Stethoscope } from "lucide-react";

const SystemVetLogo: React.FC = () => {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm ring-1 ring-black/5">
        <Stethoscope className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold">SystemVet</div>
        <div className="text-xs text-muted-foreground">Gestão veterinária</div>
      </div>
    </div>
  );
};

export default SystemVetLogo;