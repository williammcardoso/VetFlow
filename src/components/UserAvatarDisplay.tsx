import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarIconOption } from "@/constants/avatarIcons";
import { cn } from "@/lib/utils";

export interface UserAvatarDisplayProps {
  avatarType?: string; // "photo" | "icon" | "initials"
  avatarUrl?: string;
  avatarIcon?: string;
  avatarInitials?: string;
  /** Usado pra derivar iniciais automáticas quando o modo é "initials" e o usuário não digitou nada personalizado. */
  fallbackName?: string;
  className?: string;
  iconClassName?: string;
}

const autoInitials = (name?: string) => (name?.trim() || "US").slice(0, 2).toUpperCase();

/**
 * Renderiza o avatar do usuário nos 3 modos possíveis: foto enviada (já
 * recortada quadrada, a própria Avatar deixa circular via CSS), ícone
 * vetorial de bichinho pré-definido, ou iniciais (personalizadas ou
 * derivadas do nome). Usado no Header e em UserSettingsPage pra não duplicar
 * essa lógica de "qual dos 3 mostrar" em dois lugares.
 */
const UserAvatarDisplay: React.FC<UserAvatarDisplayProps> = ({
  avatarType,
  avatarUrl,
  avatarIcon,
  avatarInitials,
  fallbackName,
  className,
  iconClassName,
}) => {
  if (avatarType === "photo" && avatarUrl) {
    return (
      <Avatar className={className}>
        <AvatarImage src={avatarUrl} alt="Foto de perfil" className="object-cover" />
        <AvatarFallback className="bg-muted text-foreground">{autoInitials(fallbackName)}</AvatarFallback>
      </Avatar>
    );
  }

  if (avatarType === "icon" && avatarIcon) {
    const opt = getAvatarIconOption(avatarIcon);
    if (opt) {
      const { Icon } = opt;
      return (
        <div className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full", opt.bg, className)}>
          <Icon className={cn("h-1/2 w-1/2", opt.fg, iconClassName)} strokeWidth={1.8} />
        </div>
      );
    }
  }

  const initials = (avatarInitials?.trim() || autoInitials(fallbackName)).slice(0, 3).toUpperCase();
  return (
    <Avatar className={className}>
      <AvatarFallback className="bg-muted text-foreground">{initials}</AvatarFallback>
    </Avatar>
  );
};

export default UserAvatarDisplay;
