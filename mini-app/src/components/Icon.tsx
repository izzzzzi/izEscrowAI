import type { IconType } from "react-icons";
import {
  LuShieldCheck, LuStar, LuTrash2, LuCopy, LuCircleX, LuCircleCheck,
  LuTriangleAlert, LuInfo, LuArrowLeft, LuArrowRight, LuArrowUp,
  LuSearch, LuRefreshCw, LuLogOut, LuTag, LuPhone, LuMic,
  LuLock, LuFilePlus, LuSmile, LuRocket, LuShoppingBag, LuRadar,
  LuCpu, LuPencil, LuGhost, LuWand, LuUser, LuUsers, LuWallet,
  LuMessageCircle, LuMessageSquare, LuChevronDown, LuFileText,
  LuScale, LuCode, LuSettings, LuSiren, LuBadgeDollarSign,
  LuCirclePlus, LuCheckCheck, LuMinus, LuArrowLeftRight,
  LuEye, LuLink, LuMenu, LuUserCheck, LuCircleUser,
  LuShieldAlert, LuBadgeCheck, LuX,
} from "react-icons/lu";
import { SiTelegram, SiTon, SiGithub } from "react-icons/si";

const iconMap: Record<string, IconType> = {
  // Solar → Lucide mapping
  "solar:shield-check-linear": LuShieldCheck,
  "solar:shield-check-bold": LuShieldCheck,
  "solar:shield-user-linear": LuShieldAlert,
  "solar:star-bold": LuStar,
  "solar:trash-bin-minimalistic-linear": LuTrash2,
  "solar:copy-linear": LuCopy,
  "solar:close-circle-linear": LuCircleX,
  "solar:close-linear": LuX,
  "solar:check-circle-linear": LuCircleCheck,
  "solar:check-circle-bold": LuCircleCheck,
  "solar:check-read-linear": LuCheckCheck,
  "solar:danger-triangle-linear": LuTriangleAlert,
  "solar:danger-triangle-bold": LuTriangleAlert,
  "solar:info-circle-linear": LuInfo,
  "solar:arrow-left-linear": LuArrowLeft,
  "solar:arrow-right-linear": LuArrowRight,
  "solar:alt-arrow-left-linear": LuArrowLeft,
  "solar:alt-arrow-right-linear": LuArrowRight,
  "solar:alt-arrow-up-linear": LuArrowUp,
  "solar:alt-arrow-down-linear": LuChevronDown,
  "solar:magnifer-linear": LuSearch,
  "solar:refresh-linear": LuRefreshCw,
  "solar:logout-2-linear": LuLogOut,
  "solar:tag-linear": LuTag,
  "solar:tag-price-linear": LuBadgeDollarSign,
  "solar:phone-linear": LuPhone,
  "solar:microphone-linear": LuMic,
  "solar:lock-keyhole-linear": LuLock,
  "solar:document-add-linear": LuFilePlus,
  "solar:document-text-linear": LuFileText,
  "solar:file-remove-linear": LuFileText,
  "solar:smile-circle-linear": LuSmile,
  "solar:rocket-2-bold": LuRocket,
  "solar:bag-4-linear": LuShoppingBag,
  "solar:radar-2-linear": LuRadar,
  "solar:cpu-linear": LuCpu,
  "solar:cpu-bolt-linear": LuCpu,
  "solar:pen-new-round-linear": LuPencil,
  "solar:ghost-linear": LuGhost,
  "solar:magic-stick-3-linear": LuWand,
  "solar:magic-stick-3-bold": LuWand,
  "solar:user-linear": LuUser,
  "solar:user-check-linear": LuUserCheck,
  "solar:user-circle-linear": LuCircleUser,
  "solar:users-group-rounded-linear": LuUsers,
  "solar:wallet-linear": LuWallet,
  "solar:wallet-2-linear": LuWallet,
  "solar:wallet-2-bold": LuWallet,
  "solar:chat-round-dots-linear": LuMessageCircle,
  "solar:chat-round-dots-bold": LuMessageCircle,
  "solar:chat-square-arrow-linear": LuMessageSquare,
  "solar:scale-linear": LuScale,
  "solar:code-scan-linear": LuCode,
  "solar:settings-linear": LuSettings,
  "solar:add-circle-linear": LuCirclePlus,
  "solar:card-transfer-linear": LuArrowLeftRight,
  "solar:dollar-minimalistic-linear": LuBadgeDollarSign,
  "solar:menu-dots-bold": LuMenu,
  "solar:verified-check-linear": LuBadgeCheck,
  "solar:verified-check-bold": LuBadgeCheck,
  "solar:minus-circle-linear": LuMinus,
  "solar:link-round-linear": LuLink,
  "solar:graph-up-linear": LuSiren,
  "solar:gallery-wide-linear": LuEye,
  "solar:shop-2-linear": LuShoppingBag,
  "solar:clipboard-list-bold": LuFileText,
  "solar:box-bold": LuShoppingBag,
  "solar:document-add-bold": LuFilePlus,

  // Simple Icons (brands)
  "simple-icons:telegram": SiTelegram,
  "simple-icons:ton": SiTon,
  "simple-icons:github": SiGithub,
  "logos:github-icon": SiGithub,

  // Tech stack
  "simple-icons:typescript": SiGithub, // fallback
  "simple-icons:react": SiGithub, // fallback
  "simple-icons:postgresql": SiGithub, // fallback
  "simple-icons:openai": SiGithub, // fallback
};

interface IconProps {
  icon: string;
  width?: number | string;
  height?: number | string;
  size?: number;
  className?: string;
  class?: string; // compat with old iconify-icon usage
}

export default function Icon({ icon, width, size, className, class: cls }: IconProps) {
  const Component = iconMap[icon];
  const s = size ?? (typeof width === "number" ? width : parseInt(String(width ?? "20")));
  const cn = className ?? cls ?? "";

  if (!Component) {
    // Fallback: render a dot for unmapped icons
    return <span className={cn} style={{ width: s, height: s, display: "inline-block" }} />;
  }

  return <Component size={s} className={cn} />;
}
