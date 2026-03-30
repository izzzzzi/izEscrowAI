import { useNavigate } from "react-router-dom";
import { useT } from "../i18n/context";
import Icon from "../components/Icon";

export default function NotFoundPage() {
  const navigate = useNavigate();
  const t = useT();
  return (
    <div className="min-h-screen page-shell pt-28 pb-16 px-6 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Icon icon="solar:ghost-linear" size={64} className="text-slate-600" />
        <h1 className="text-2xl font-semibold">{t("notFound.title")}</h1>
        <p className="text-sm text-slate-400">{t("notFound.subtitle")}</p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="px-6 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white cursor-pointer hover:bg-white/10 transition-colors"
        >
          {t("notFound.button")}
        </button>
      </div>
    </div>
  );
}
