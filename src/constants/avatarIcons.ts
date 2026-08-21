import { Cat, Dog, Bird, Fish, Rabbit, Turtle, PawPrint, Squirrel, Bone, Snail, type LucideIcon } from "lucide-react";

export interface AvatarIconOption {
  key: string;
  label: string;
  Icon: LucideIcon;
  /** Cor de fundo/ícone fixa por bicho — não é configurável, só pra dar variedade visual entre as opções. */
  bg: string;
  fg: string;
}

export const AVATAR_ICON_OPTIONS: AvatarIconOption[] = [
  { key: "cat", label: "Gato", Icon: Cat, bg: "bg-orange-100", fg: "text-orange-700" },
  { key: "dog", label: "Cachorro", Icon: Dog, bg: "bg-amber-100", fg: "text-amber-700" },
  { key: "bird", label: "Pássaro", Icon: Bird, bg: "bg-sky-100", fg: "text-sky-700" },
  { key: "rabbit", label: "Coelho", Icon: Rabbit, bg: "bg-pink-100", fg: "text-pink-700" },
  { key: "fish", label: "Peixe", Icon: Fish, bg: "bg-cyan-100", fg: "text-cyan-700" },
  { key: "turtle", label: "Tartaruga", Icon: Turtle, bg: "bg-emerald-100", fg: "text-emerald-700" },
  { key: "squirrel", label: "Esquilo", Icon: Squirrel, bg: "bg-yellow-100", fg: "text-yellow-700" },
  { key: "snail", label: "Caracol", Icon: Snail, bg: "bg-lime-100", fg: "text-lime-700" },
  { key: "paw", label: "Patinha", Icon: PawPrint, bg: "bg-violet-100", fg: "text-violet-700" },
  { key: "bone", label: "Ossinho", Icon: Bone, bg: "bg-stone-100", fg: "text-stone-700" },
];

export function getAvatarIconOption(key?: string): AvatarIconOption | undefined {
  return AVATAR_ICON_OPTIONS.find((o) => o.key === key);
}
