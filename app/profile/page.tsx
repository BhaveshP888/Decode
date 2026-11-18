"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle,
  FirstAidKit,
  FloppyDisk,
  Heartbeat,
  Leaf,
  Plus,
  ShieldWarning,
  Sparkle,
  Users,
  Warning,
  X,
} from "@phosphor-icons/react";

import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";

interface ChipOption {
  id: string;
  label: string;
}

interface HouseholdMemberRecord {
  id: string;
  name: string;
  allergens: string[];
  dietaryRegimes: string[];
  healthConditions: string[];
}

interface ProfileRecord {
  id: string;
  allergens: string[];
  dietaryRegimes: string[];
  healthConditions: string[];
  householdMembers?: HouseholdMemberRecord[];
}

interface ProfileApiResponse {
  profile: ProfileRecord | null;
  error?: string;
}

const COMMON_ALLERGENS: ChipOption[] = [
  { id: "peanuts", label: "Peanuts" },
  { id: "tree_nuts", label: "Tree Nuts" },
  { id: "dairy", label: "Dairy" },
  { id: "gluten", label: "Gluten" },
  { id: "soy", label: "Soy" },
  { id: "eggs", label: "Eggs" },
  { id: "shellfish", label: "Shellfish" },
  { id: "fish", label: "Fish" },
  { id: "sesame", label: "Sesame" },
  { id: "sulfites", label: "Sulfites" },
];

const DIETARY_REGIMES: ChipOption[] = [
  { id: "vegan", label: "Vegan" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "keto", label: "Keto" },
  { id: "clean_label", label: "Clean Label" },
  { id: "low_sodium", label: "Low Sodium" },
  { id: "diabetic_friendly", label: "Diabetic Friendly" },
];

const HEALTH_CONDITIONS: ChipOption[] = [
  { id: "diabetes", label: "Diabetes" },
  { id: "hypertension", label: "Hypertension" },
  { id: "celiac", label: "Celiac Disease" },
  { id: "lactose_intolerance", label: "Lactose Intolerance" },
  { id: "pregnancy", label: "Pregnancy" },
];

const COMMON_ALLERGEN_IDS = new Set(COMMON_ALLERGENS.map((item) => item.id));

function formatTagLabel(tag: string): string {
  return tag
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ProfileSettingsPage() {
  const [allergens, setAllergens] = useState<string[]>([]);
  const [customAllergenInput, setCustomAllergenInput] = useState("");
  const [dietaryRegimes, setDietaryRegimes] = useState<string[]>([]);
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMemberRecord[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      try {
        const res = await fetch("/api/profile", { signal: controller.signal });
        if (res.status === 401) {
          setErrorMessage("Please sign in to load and save your personalized Health Profile.");
          return;
        }
        if (!res.ok) {
          throw new Error("Unable to load your health profile.");
        }
        const data = (await res.json()) as ProfileApiResponse;
        if (data.profile) {
          setAllergens(data.profile.allergens ?? []);
          setDietaryRegimes(data.profile.dietaryRegimes ?? []);
          setHealthConditions(data.profile.healthConditions ?? []);
          setHouseholdMembers(data.profile.householdMembers ?? []);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to fetch your health profile."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
    return () => controller.abort();
  }, []);

  const toggleItem = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setSaveSuccess(false);
    setter((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const handleAddCustomAllergen = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = customAllergenInput.trim().toLowerCase();
    if (!normalized) return;

    setSaveSuccess(false);
    setAllergens((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]));
    setCustomAllergenInput("");
  };

  const handleRemoveAllergen = (tag: string) => {
    setSaveSuccess(false);
    setAllergens((prev) => prev.filter((item) => item !== tag));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage("");

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allergens,
          dietaryRegimes,
          healthConditions,
        }),
      });

      const data = (await res.json()) as ProfileApiResponse;

      if (res.status === 401) {
        throw new Error("Please sign in to save changes to your Health Profile.");
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to save health profile.");
      }

      if (data.profile) {
        setAllergens(data.profile.allergens ?? []);
        setDietaryRegimes(data.profile.dietaryRegimes ?? []);
        setHealthConditions(data.profile.healthConditions ?? []);
        setHouseholdMembers(data.profile.householdMembers ?? []);
      }

      setSaveSuccess(true);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred while saving."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const customAllergens = allergens.filter((tag) => !COMMON_ALLERGEN_IDS.has(tag));

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30">
      <Navbar />

      <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-12 space-y-8">
        {/* Top Action & Navigation Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-900/60 hover:bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span>Back to Scanner</span>
            </Link>
            <Link
              href="/guru"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-1.5 text-xs font-medium text-emerald-300 transition-colors"
            >
              <Sparkle size={14} weight="fill" aria-hidden="true" />
              <span>Ask Health Guru</span>
            </Link>
          </div>

          <Button
            type="button"
            onClick={handleSaveProfile}
            disabled={isSaving || isLoading}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 h-10 gap-2 shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] cursor-pointer"
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <FloppyDisk size={16} weight="bold" />
                <span>Save Health Profile</span>
              </>
            )}
          </Button>
        </div>

        {/* Page Header */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <FirstAidKit size={14} weight="fill" aria-hidden="true" />
            <span>Personal Safety &amp; Allergen Guard</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
            Health Profile &amp; Household
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base max-w-2xl leading-relaxed">
            Configure allergens, dietary regimes, and health conditions. Every scan and Health Guru
            consultation automatically checks ingredients against these safety guards.
          </p>
        </header>

        {/* Feedback Banners */}
        {saveSuccess && (
          <div
            role="status"
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3.5 flex items-center gap-3 text-sm text-emerald-200"
          >
            <CheckCircle size={20} weight="fill" className="text-emerald-400 shrink-0" />
            <span>
              Health profile saved. Future scans and Health Guru consultations are synced with your
              latest preferences.
            </span>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3.5 flex items-center gap-3 text-sm text-red-200"
          >
            <Warning size={20} weight="fill" className="text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-5">
            <div className="h-44 rounded-2xl border border-white/5 bg-zinc-900/40 animate-pulse" />
            <div className="h-36 rounded-2xl border border-white/5 bg-zinc-900/40 animate-pulse" />
            <div className="h-36 rounded-2xl border border-white/5 bg-zinc-900/40 animate-pulse" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Section 1: Allergens */}
            <section className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-md p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <ShieldWarning size={18} weight="fill" className="text-red-400" />
                    <span>Allergens (Strict Conflict Precedence)</span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Matching ingredients trigger a full-width high-contrast safety alert on every scan.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-zinc-950 px-3 py-1 text-xs font-medium text-zinc-400">
                  {allergens.length} selected
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGENS.map((item) => {
                  const isSelected = allergens.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleItem(item.id, setAllergens)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "border-red-500/60 bg-red-500/15 text-red-200 shadow-[0_0_16px_-6px_rgba(239,68,68,0.5)]"
                          : "border-white/10 bg-zinc-950/60 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                      }`}
                    >
                      {isSelected && <Check size={13} weight="bold" className="text-red-300" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Allergen Chips */}
              {customAllergens.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Custom Allergens
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {customAllergens.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-950/50 px-3 py-1 text-xs font-medium text-red-200"
                      >
                        <span>{formatTagLabel(tag)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAllergen(tag)}
                          aria-label={`Remove custom allergen ${tag}`}
                          className="text-red-300/80 hover:text-white cursor-pointer"
                        >
                          <X size={12} weight="bold" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Allergen Input */}
              <form
                onSubmit={handleAddCustomAllergen}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-white/5"
              >
                <input
                  type="text"
                  value={customAllergenInput}
                  onChange={(event) => setCustomAllergenInput(event.target.value)}
                  placeholder="Add custom allergen (e.g. mustard, lupin, red 40)..."
                  aria-label="Custom allergen"
                  className="flex-1 h-10 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20"
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={!customAllergenInput.trim()}
                  className="h-10 rounded-xl border-white/10 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Plus size={14} weight="bold" />
                  <span>Add Allergen</span>
                </Button>
              </form>
            </section>

            {/* Section 2: Dietary Regimes */}
            <section className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-md p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <Leaf size={18} weight="fill" className="text-emerald-400" />
                    <span>Dietary Regimes</span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Tailor ingredient flags and cleaner swap recommendations to your eating pattern.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-zinc-950 px-3 py-1 text-xs font-medium text-zinc-400">
                  {dietaryRegimes.length} selected
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {DIETARY_REGIMES.map((item) => {
                  const isSelected = dietaryRegimes.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleItem(item.id, setDietaryRegimes)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200 shadow-[0_0_16px_-6px_rgba(16,185,129,0.5)]"
                          : "border-white/10 bg-zinc-950/60 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                      }`}
                    >
                      {isSelected && <Check size={13} weight="bold" className="text-emerald-300" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Section 3: Health Conditions */}
            <section className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-md p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <Heartbeat size={18} weight="fill" className="text-amber-400" />
                    <span>Health Conditions</span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Surface relevant additive cautions, glycemic considerations, and dietary notes.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-zinc-950 px-3 py-1 text-xs font-medium text-zinc-400">
                  {healthConditions.length} selected
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {HEALTH_CONDITIONS.map((item) => {
                  const isSelected = healthConditions.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleItem(item.id, setHealthConditions)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "border-amber-500/50 bg-amber-500/15 text-amber-200 shadow-[0_0_16px_-6px_rgba(245,158,11,0.45)]"
                          : "border-white/10 bg-zinc-950/60 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                      }`}
                    >
                      {isSelected && <Check size={13} weight="bold" className="text-amber-300" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Section 4: Household Members */}
            <section className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-md p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <Users size={18} weight="fill" className="text-emerald-400" />
                    <span>Household Members</span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Every scanned product is automatically evaluated across your profile and linked
                    household members in the Household Status Bar.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-zinc-950 px-3 py-1 text-xs font-medium text-zinc-400">
                  {householdMembers.length} {householdMembers.length === 1 ? "member" : "members"}
                </span>
              </div>

              {householdMembers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-zinc-950/40 p-6 text-center space-y-2">
                  <Users size={24} className="text-zinc-600 mx-auto" />
                  <p className="text-sm font-medium text-zinc-300">
                    No additional household members linked yet
                  </p>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                    Your personal profile (&ldquo;Self&rdquo;) is active on all scans. Linked
                    household member cards will display their individual allergens, dietary regimes,
                    and health conditions here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {householdMembers.map((member) => (
                    <article
                      key={member.id}
                      className="rounded-xl border border-white/10 bg-zinc-950/60 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-300">
                            {member.name.slice(0, 1).toUpperCase()}
                          </div>
                          <h3 className="text-sm font-semibold text-white">{member.name}</h3>
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                          Household
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
                            Allergens
                          </span>
                          {member.allergens.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {member.allergens.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-medium text-red-300"
                                >
                                  {formatTagLabel(tag)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-zinc-500">None specified</span>
                          )}
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
                            Dietary Regimes
                          </span>
                          {member.dietaryRegimes.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {member.dietaryRegimes.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300"
                                >
                                  {formatTagLabel(tag)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-zinc-500">None specified</span>
                          )}
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
                            Health Conditions
                          </span>
                          {member.healthConditions.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {member.healthConditions.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300"
                                >
                                  {formatTagLabel(tag)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-zinc-500">None specified</span>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
