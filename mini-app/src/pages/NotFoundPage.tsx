import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen page-shell pt-28 pb-16 px-6 flex items-center justify-center">
      <div className="text-center space-y-4">
        <iconify-icon icon="solar:ghost-linear" width="64" class="text-slate-600" />
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-sm text-slate-400">The page you're looking for doesn't exist or has been moved.</p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="px-6 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white cursor-pointer hover:bg-white/10 transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
