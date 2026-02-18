"use client";

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  startTransition,
  useRef,
} from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Link2,
  RefreshCw,
  Shuffle,
  Globe,
  Tag,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Play,
  Copy,
  Check,
  ChevronDown,
  Percent,
  GripVertical,
  Loader2,
  CheckCircle2,
  Save,
} from "lucide-react";
import type { Link, RotationRule, SimulationResult } from "@/lib/types";
import { simulateClicks } from "@/lib/rotation";
import SimulationResults from "./SimulationResults";
import { saveLinkAction } from "@/app/actions";

interface LinkEditorFormProps {
  initialLink: Link;
  /** Parent project ID — used for scoping and navigation */
  projectId?: string;
}

/**
 * Controlled numeric input for weight percentages (0–100).
 *
 * Manages its own display string so the user can fully clear the
 * field without a persistent "0" blocking new input. `onFocus`
 * auto-selects the text for quick replacement.
 */
function WeightInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [display, setDisplay] = useState(String(value));

  // Sync display when external value changes (e.g. distribute evenly)
  useEffect(() => {
    setDisplay(String(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={display}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9]/g, "");
        setDisplay(raw); // allow empty string visually
        const parsed = raw === "" ? 0 : Math.min(100, parseInt(raw, 10));
        onChange(parsed);
      }}
      onBlur={() => {
        // On blur, normalise display back to the numeric value
        setDisplay(String(value));
      }}
      className="w-full px-3 py-2.5 sm:py-2 pr-7 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-800 text-center font-semibold focus:outline-none focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan focus:bg-white transition-all"
    />
  );
}

export default function LinkEditorForm({ initialLink }: LinkEditorFormProps) {
  const [link, setLink] = useState<Link>(initialLink);
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulationResults, setSimulationResults] = useState<
    SimulationResult[] | null
  >(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [origin, setOrigin] = useState("");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  // Set origin on client mount to avoid hydration mismatch
  useEffect(() => {
    startTransition(() => {
      setOrigin(window.location.origin);
    });
  }, []);

  // Track unsaved changes (debounced auto-save)
  useEffect(() => {
    // Skip the first render (initial load)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Mark as having unsaved changes
    setHasUnsavedChanges(true);

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce auto-save by 1500ms
    saveTimeoutRef.current = setTimeout(async () => {
      await performSave(true);
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);

  // Perform save (shared between auto-save and manual save)
  const performSave = useCallback(
    async (isAutoSave = false) => {
      // Clear any pending auto-save to avoid duplicate saves
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Skip auto-save if main URL is empty (guaranteed validation failure)
      if (isAutoSave && !link.main_destination_url.trim()) {
        return;
      }

      setSaveStatus("saving");
      setSaveError("");
      const result = await saveLinkAction(link);
      if (result.success) {
        setSaveStatus("saved");
        setHasUnsavedChanges(false);
        setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setSaveStatus("error");
        setSaveError(result.error);
        console.warn("[RouteGenius] Save:", result.error);
      }
    },
    [link],
  );

  // Manual save handler
  const handleManualSave = useCallback(() => {
    performSave(false);
  }, [performSave]);

  // Computed values
  const totalSecondaryWeight = useMemo(
    () => link.rotation_rules.reduce((s, r) => s + r.weight_percentage, 0),
    [link.rotation_rules],
  );

  const remainingForMain = useMemo(
    () => Math.max(0, 100 - totalSecondaryWeight),
    [totalSecondaryWeight],
  );

  const isOverWeight = totalSecondaryWeight > 100;
  const hasValidMainUrl = link.main_destination_url.trim() !== "";

  const trackingUrl = useMemo(
    () =>
      origin ? `${origin}/api/redirect/${link.id}` : `/api/redirect/${link.id}`,
    [link.id, origin],
  );

  // Handlers
  const updateField = useCallback(
    <K extends keyof Link>(field: K, value: Link[K]) => {
      setLink((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const addRule = useCallback(() => {
    const newRule: RotationRule = {
      id: crypto.randomUUID(),
      destination_url: "",
      weight_percentage: 0,
      order_index: link.rotation_rules.length,
    };
    setLink((prev) => ({
      ...prev,
      rotation_rules: [...prev.rotation_rules, newRule],
    }));
  }, [link.rotation_rules.length]);

  const removeRule = useCallback((ruleId: string) => {
    setLink((prev) => ({
      ...prev,
      rotation_rules: prev.rotation_rules
        .filter((r) => r.id !== ruleId)
        .map((r, i) => ({ ...r, order_index: i })),
    }));
  }, []);

  const updateRule = useCallback(
    (ruleId: string, field: keyof RotationRule, value: string | number) => {
      setLink((prev) => ({
        ...prev,
        rotation_rules: prev.rotation_rules.map((r) =>
          r.id === ruleId ? { ...r, [field]: value } : r,
        ),
      }));
    },
    [],
  );

  const distributeEvenly = useCallback(() => {
    const count = link.rotation_rules.length;
    if (count === 0) return;

    // Split 100% evenly among all secondary rules
    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;

    setLink((prev) => ({
      ...prev,
      rotation_rules: prev.rotation_rules.map((r, i) => ({
        ...r,
        weight_percentage: base + (i < remainder ? 1 : 0),
      })),
    }));
  }, [link.rotation_rules.length]);

  const runSimulation = useCallback(() => {
    const results = simulateClicks(link, 1000);
    setSimulationResults(results);
    setShowSimulation(true);

    // Phase 1: console log click events
    console.log("[RouteGenius] Simulation complete:", {
      link_id: link.id,
      iterations: 1000,
      results: results.map((r) => ({
        url: r.url,
        target: `${r.configured_weight}%`,
        actual: `${r.actual_percentage.toFixed(1)}%`,
        hits: r.actual_hits,
      })),
    });
  }, [link]);

  const copyTrackingUrl = useCallback(() => {
    navigator.clipboard.writeText(trackingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [trackingUrl]);

  return (
    <div className="space-y-6 pb-24">
      {/* ── Tracking URL Preview ── */}
      <div className="card-bg rounded-2xl border border-gray-200/80 shadow-sm p-4 sm:p-5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Su Enlace de Rastreo
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 font-mono text-xs sm:text-sm text-gray-600 overflow-hidden">
            <Link2 className="w-4 h-4 text-brand-blue shrink-0" />
            <span className="truncate">{trackingUrl}</span>
          </div>
          <motion.button
            onClick={copyTrackingUrl}
            className="shrink-0 p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-brand-blue transition-all"
            title="Copiar URL de rastreo"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              delay: 0,
            }}
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </motion.button>
        </div>
      </div>

      {/* ── Link Metadata Card ── */}
      <div className="card-bg rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Tag className="w-5 h-5 text-brand-cyan" />
            Metadatos del Enlace
          </h2>
        </div>
        <div className="p-4 sm:p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Título
            </label>
            <input
              type="text"
              value={link.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="ej., Campaña Tarjetas de Crédito Q1"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
            />
          </div>
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Descripción
            </label>
            <textarea
              value={link.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Descripción breve del enlace..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all resize-none"
            />
          </div>
        </div>
      </div>

      {/* ── Main Configuration Card ── */}
      <div className="card-bg rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Globe className="w-5 h-5 text-brand-blue" />
            Configuración del Enlace
          </h2>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {/* Nickname */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              Apodo
            </label>
            <input
              type="text"
              value={link.nickname}
              onChange={(e) => updateField("nickname", e.target.value)}
              placeholder="ej., Campaña Tarjetas de Crédito - Prueba A/B"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
            />
          </div>

          {/* Main Destination URL */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <Link2 className="w-3.5 h-3.5 text-gray-400" />
              URL de Destino Principal
              <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={link.main_destination_url}
              onChange={(e) =>
                updateField("main_destination_url", e.target.value)
              }
              placeholder="https://ejemplo.com/pagina-destino"
              className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 transition-all ${
                !hasValidMainUrl && link.main_destination_url !== ""
                  ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                  : "border-gray-200 focus:ring-brand-blue/20 focus:border-brand-blue"
              }`}
            />
            <p className="mt-1 text-xs text-gray-400">
              Esta URL recibe todo el tráfico cuando la rotación está
              desactivada, o el {remainingForMain}% restante cuando está
              activada.
            </p>
          </div>
        </div>
      </div>

      {/* ── Rotate Traffic Section ── */}
      <div className="card-bg rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        {/* Section Header with Toggle */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-linear-to-r from-cyan-50 to-lime-50 border border-cyan-100">
                <Shuffle className="w-4 h-4 text-brand-cyan" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Rotar Tráfico
                </h2>
                <p className="text-xs text-gray-400">
                  Dividir clics entre múltiples destinos
                </p>
              </div>
            </div>

            {/* Toggle */}
            <motion.button
              onClick={() =>
                updateField("rotation_enabled", !link.rotation_enabled)
              }
              className="flex items-center gap-2 group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: 0,
              }}
            >
              <span className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                {link.rotation_enabled ? "Habilitado" : "Deshabilitado"}
              </span>
              {link.rotation_enabled ? (
                <ToggleRight className="w-8 h-8 text-brand-lime" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-300" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Rotation Content */}
        {link.rotation_enabled && (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Weight Distribution Summary */}
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                isOverWeight
                  ? "bg-red-50 border-red-200"
                  : "bg-linear-to-r from-blue-50/60 to-cyan-50/60 border-blue-100"
              }`}
            >
              {isOverWeight ? (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              ) : (
                <Percent className="w-4 h-4 text-brand-blue shrink-0" />
              )}
              <div className="flex-1">
                {isOverWeight ? (
                  <p className="text-sm text-red-600 font-medium">
                    El peso total excede el 100% ({totalSecondaryWeight}%). Por
                    favor reduzca los pesos secundarios.
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">
                    Restante{" "}
                    <span className="font-bold text-brand-blue">
                      {remainingForMain}%
                    </span>{" "}
                    irá a{" "}
                    <span className="font-medium text-gray-700">
                      {link.main_destination_url || "Destino Principal"}
                    </span>
                  </p>
                )}
              </div>

              {/* Visual progress bar */}
              <div className="hidden sm:block w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOverWeight
                      ? "bg-red-400"
                      : "bg-linear-to-r from-brand-blue via-brand-cyan to-brand-lime"
                  }`}
                  style={{
                    width: `${Math.min(totalSecondaryWeight, 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Rotation Rules List */}
            <div className="space-y-3">
              {link.rotation_rules.map((rule, index) => (
                <div
                  key={rule.id}
                  className="group flex flex-col sm:flex-row sm:items-start gap-3 p-3 sm:p-4 rounded-xl border border-gray-150 bg-white hover:border-cyan-200 hover:shadow-sm transition-all"
                >
                  {/* Top row: drag handle + index + delete (mobile) */}
                  <div className="flex items-center gap-2 sm:contents">
                    {/* Drag handle (visual only in Phase 1) */}
                    <div className="text-gray-300 cursor-grab hidden sm:block sm:pt-2.5">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Rule index */}
                    <div className="shrink-0 w-7 h-7 sm:mt-1.5 rounded-full bg-linear-to-r from-cyan-500 to-lime-400 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {index + 1}
                      </span>
                    </div>

                    <span className="text-xs font-medium text-gray-500 sm:hidden flex-1">
                      Destino #{index + 1}
                    </span>

                    {/* Delete — visible on mobile, hover on desktop */}
                    <motion.button
                      onClick={() => removeRule(rule.id)}
                      className="shrink-0 p-2 sm:mt-6 sm:p-1.5 rounded-lg text-gray-400 sm:text-gray-300 hover:text-red-500 hover:bg-red-50 sm:opacity-0 sm:group-hover:opacity-100 transition-all min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 flex items-center justify-center sm:order-last"
                      title="Eliminar destino"
                      whileHover={{ scale: 1.2, rotate: -10 }}
                      whileTap={{ scale: 0.85 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                        delay: 0,
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>

                  {/* URL + Weight row */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 flex-1 min-w-0">
                    {/* URL Input */}
                    <div className="flex-1 min-w-0">
                      <label className="text-xs font-medium text-gray-500 mb-1 hidden sm:block">
                        Destino Secundario #{index + 1}
                      </label>
                      <input
                        type="url"
                        value={rule.destination_url}
                        onChange={(e) =>
                          updateRule(rule.id, "destination_url", e.target.value)
                        }
                        placeholder="https://ejemplo.com/variante"
                        className="w-full px-3 py-2.5 sm:py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan focus:bg-white transition-all"
                      />
                    </div>

                    {/* Weight Input */}
                    <div className="shrink-0 w-full sm:w-24">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Peso
                      </label>
                      <div className="relative">
                        <WeightInput
                          value={rule.weight_percentage}
                          onChange={(val) =>
                            updateRule(rule.id, "weight_percentage", val)
                          }
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <motion.button
                onClick={addRule}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:text-brand-cyan hover:border-cyan-300 hover:bg-cyan-50/30 transition-all"
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  delay: 0,
                }}
              >
                <Plus className="w-4 h-4" />
                Agregar Destino
              </motion.button>

              {link.rotation_rules.length >= 2 && (
                <motion.button
                  onClick={distributeEvenly}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:text-brand-blue hover:border-blue-200 hover:bg-blue-50/30 transition-all"
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: 0,
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Distribuir Uniformemente
                </motion.button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Advanced Settings (collapsible) ── */}
      <div className="card-bg rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <motion.button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-4 sm:px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-all"
          whileTap={{ scale: 0.99 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0 }}
        >
          <span className="text-sm font-medium text-gray-500">
            Configuración Avanzada
          </span>
          <motion.span
            animate={{ rotate: showAdvanced ? 180 : 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
          >
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </motion.span>
        </motion.button>

        {showAdvanced && (
          <div className="px-4 sm:px-6 pb-5 pt-0 border-t border-gray-100 space-y-4">
            {/* Status */}
            <div className="pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Estado del Enlace
              </label>
              <select
                value={link.status}
                onChange={(e) =>
                  updateField(
                    "status",
                    e.target.value as "enabled" | "disabled" | "expired",
                  )
                }
                className="w-full sm:w-48 px-3 py-2.5 sm:py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
              >
                <option value="enabled">Habilitado</option>
                <option value="disabled">Deshabilitado</option>
                <option value="expired">Expirado</option>
              </select>
            </div>

            {/* Link ID (read only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                ID del Enlace
              </label>
              <input
                type="text"
                value={link.id}
                readOnly
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-400 font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Simulation Section ── */}
      <div className="space-y-4">
        {/* Run Simulation Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <motion.button
            onClick={runSimulation}
            disabled={!hasValidMainUrl || isOverWeight}
            className={`flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-semibold shadow-md transition-all ${
              !hasValidMainUrl || isOverWeight
                ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                : "bg-linear-to-r from-brand-blue via-brand-cyan to-brand-lime text-white hover:shadow-lg"
            }`}
            whileHover={
              !hasValidMainUrl || isOverWeight ? {} : { scale: 1.02, y: -1 }
            }
            whileTap={!hasValidMainUrl || isOverWeight ? {} : { scale: 0.98 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              delay: 0,
            }}
          >
            <Play className="w-4 h-4" />
            Probar Rotación — Simular 1,000 Clics
          </motion.button>
        </div>

        {/* Simulation Results */}
        {showSimulation && simulationResults && (
          <SimulationResults
            results={simulationResults}
            iterations={1000}
            onClose={() => setShowSimulation(false)}
          />
        )}
      </div>

      {/* ── Sticky Bottom Save Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="border-t border-gray-200/80 bg-white/90 backdrop-blur-lg shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="max-w-3xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-3 sm:gap-4">
            {/* Save Status (left side) */}
            <div className="flex items-center gap-2 min-w-0">
              {saveStatus === "saving" && (
                <span className="inline-flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span className="truncate">Guardando cambios...</span>
                </span>
              )}
              {saveStatus === "saved" && !hasUnsavedChanges && (
                <span className="inline-flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">Todos los cambios guardados</span>
                </span>
              )}
              {saveStatus === "error" && (
                <span
                  className="inline-flex items-center gap-2 text-sm text-red-600 max-w-xs truncate"
                  title={saveError}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {saveError || "Error al guardar"}
                  </span>
                </span>
              )}
              {saveStatus === "idle" && hasUnsavedChanges && (
                <span className="inline-flex items-center gap-2 text-sm text-amber-600">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <span className="truncate">Cambios sin guardar</span>
                </span>
              )}
              {saveStatus === "idle" && !hasUnsavedChanges && (
                <span className="inline-flex items-center gap-2 text-sm text-gray-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">Sin cambios pendientes</span>
                </span>
              )}
            </div>

            {/* Save Button (right side) */}
            <motion.button
              onClick={handleManualSave}
              disabled={
                saveStatus === "saving" ||
                (!hasUnsavedChanges && saveStatus !== "error")
              }
              className={`shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all ${
                saveStatus === "saving"
                  ? "bg-gray-100 text-gray-400 cursor-wait"
                  : hasUnsavedChanges || saveStatus === "error"
                    ? "bg-linear-to-r from-brand-blue to-brand-cyan text-white hover:shadow-md active:scale-[0.97]"
                    : "bg-gray-100 text-gray-400 cursor-default"
              }`}
              whileHover={
                hasUnsavedChanges || saveStatus === "error"
                  ? { scale: 1.03, y: -1 }
                  : {}
              }
              whileTap={
                hasUnsavedChanges || saveStatus === "error"
                  ? { scale: 0.97 }
                  : {}
              }
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: 0,
              }}
            >
              {saveStatus === "saving" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Guardar
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
