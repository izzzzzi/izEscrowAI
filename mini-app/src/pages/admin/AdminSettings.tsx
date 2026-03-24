import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import { fetchAdminSettings, updateAdminSettings } from "../../lib/api";
import { useT } from "../../i18n/context";
import type { TranslationKey } from "../../i18n/en";

interface SettingsGroup {
  titleKey: TranslationKey;
  icon: string;
  fields: SettingsField[];
}

interface SettingsField {
  key: string;
  labelKey: TranslationKey;
  type: "number" | "text" | "boolean" | "json";
  descriptionKey?: TranslationKey;
}

const GROUPS: SettingsGroup[] = [
  {
    titleKey: "admin.settings.finance",
    icon: "solar:wallet-money-linear",
    fields: [
      { key: "commission_rate", labelKey: "admin.settings.commissionRate", type: "number", descriptionKey: "admin.settings.commissionDesc" },
      { key: "max_deal_amount", labelKey: "admin.settings.maxDeal", type: "number", descriptionKey: "admin.settings.maxDealDesc" },
      { key: "min_deal_amount", labelKey: "admin.settings.minDeal", type: "number", descriptionKey: "admin.settings.minDealDesc" },
    ],
  },
  {
    titleKey: "admin.settings.limits",
    icon: "solar:tuning-square-2-linear",
    fields: [
      { key: "notification_limits", labelKey: "admin.settings.notificationLimits", type: "json", descriptionKey: "admin.settings.notificationLimitsDesc" },
    ],
  },
  {
    titleKey: "admin.settings.features",
    icon: "solar:settings-linear",
    fields: [
      { key: "feature_flags", labelKey: "admin.settings.featureFlags", type: "json", descriptionKey: "admin.settings.featureFlagsDesc" },
      { key: "maintenance_mode", labelKey: "admin.settings.maintenanceMode", type: "boolean", descriptionKey: "admin.settings.maintenanceModeDesc" },
    ],
  },
];

export default function AdminSettings() {
  const t = useT();
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchAdminSettings()
      .then(setSettings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateAdminSettings(settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: SettingsField) => {
    const value = settings[field.key];

    if (field.type === "boolean") {
      const checked = value === true || value === "true";
      return (
        <button
          type="button"
          onClick={() => handleChange(field.key, !checked)}
          className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer border-none ${
            checked ? "bg-blue-500" : "bg-white/10"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              checked ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      );
    }

    if (field.type === "json") {
      const strValue =
        typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2);
      return (
        <textarea
          value={strValue}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              handleChange(field.key, parsed);
            } catch {
              // Keep raw string while user is editing
              handleChange(field.key, e.target.value);
            }
          }}
          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40 transition-colors resize-none h-24 font-mono"
        />
      );
    }

    return (
      <input
        type={field.type === "number" ? "number" : "text"}
        value={value != null ? String(value) : ""}
        onChange={(e) =>
          handleChange(
            field.key,
            field.type === "number"
              ? e.target.value === ""
                ? ""
                : Number(e.target.value)
              : e.target.value,
          )
        }
        className="w-full sm:w-64 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/40 transition-colors"
      />
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">{t("admin.settings.title")}</h1>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 text-sm font-medium hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {saving ? t("admin.settings.saving") : t("admin.settings.save")}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-400">
            {t("admin.settings.savedSuccess")}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
            {t("admin.common.loading")}
          </div>
        ) : (
          <div className="space-y-8">
            {GROUPS.map((group) => (
              <div key={group.titleKey} className="space-y-4">
                {/* Group header */}
                <div className="flex items-center gap-2 text-slate-300">
                  <iconify-icon icon={group.icon} width="20" height="20" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider">
                    {t(group.titleKey)}
                  </h2>
                </div>

                {/* Fields */}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/5">
                  {group.fields.map((field) => (
                    <div
                      key={field.key}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4"
                    >
                      <div className="flex flex-col gap-0.5">
                        <label className="text-sm font-medium text-slate-200">
                          {t(field.labelKey)}
                        </label>
                        {field.descriptionKey && (
                          <span className="text-xs text-slate-500">
                            {t(field.descriptionKey)}
                          </span>
                        )}
                      </div>
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
