"use client";

import { useState } from "react";
import {
  AI_MODEL_OPTIONS,
  PAYMENT_GATEWAYS,
  isProfileComplete,
} from "@/lib/onboarding-options";

export type ProfileFormState = {
  paymentGateway: string;
  paymentGatewayOther: string;
  aiModelIds: string[];
  aiModelsOther: string[];
};

export const EMPTY_PROFILE_FORM: ProfileFormState = {
  paymentGateway: "",
  paymentGatewayOther: "",
  aiModelIds: [],
  aiModelsOther: [],
};

export function profileFormFromTenant(tenant: {
  payment_gateway?: string | null;
  payment_gateway_other?: string | null;
  ai_model_ids?: string[] | null;
  ai_models_other?: string[] | null;
}): ProfileFormState {
  return {
    paymentGateway: tenant.payment_gateway ?? "",
    paymentGatewayOther: tenant.payment_gateway_other ?? "",
    aiModelIds: tenant.ai_model_ids ?? [],
    aiModelsOther: tenant.ai_models_other ?? [],
  };
}

export function profileFormToPayload(form: ProfileFormState) {
  return {
    payment_gateway: form.paymentGateway,
    payment_gateway_other:
      form.paymentGateway === "other" ? form.paymentGatewayOther.trim() : null,
    ai_model_ids: form.aiModelIds,
    ai_models_other: form.aiModelsOther,
  };
}

export function validateProfileForm(form: ProfileFormState): string | null {
  if (!form.paymentGateway) return "Select the payment gateway you bill through.";
  if (form.paymentGateway === "other" && !form.paymentGatewayOther.trim()) {
    return "Tell us which payment gateway you use.";
  }
  if (form.aiModelIds.length + form.aiModelsOther.length === 0) {
    return "Select at least one AI model you run in production.";
  }
  return null;
}

export function isProfileFormComplete(form: ProfileFormState): boolean {
  return isProfileComplete(profileFormToPayload(form));
}

type Props = {
  value: ProfileFormState;
  onChange: (next: ProfileFormState) => void;
  disabled?: boolean;
};

export function TenantProfileFields({ value, onChange, disabled }: Props) {
  const [otherModelDraft, setOtherModelDraft] = useState("");

  function toggleModel(id: string) {
    const next = value.aiModelIds.includes(id)
      ? value.aiModelIds.filter((m) => m !== id)
      : [...value.aiModelIds, id];
    onChange({ ...value, aiModelIds: next });
  }

  function addOtherModel() {
    const name = otherModelDraft.trim();
    if (!name || value.aiModelsOther.includes(name)) {
      setOtherModelDraft("");
      return;
    }
    onChange({ ...value, aiModelsOther: [...value.aiModelsOther, name] });
    setOtherModelDraft("");
  }

  function removeOtherModel(name: string) {
    onChange({
      ...value,
      aiModelsOther: value.aiModelsOther.filter((m) => m !== name),
    });
  }

  return (
    <div className="space-y-6">
      <fieldset disabled={disabled} className="space-y-2">
        <legend className="text-sm font-medium text-black">
          How do you bill your customers?
        </legend>
        <p className="text-sm text-[var(--muted)]">
          The payment gateway you charge your own clients through.
        </p>
        <select
          value={value.paymentGateway}
          onChange={(e) =>
            onChange({ ...value, paymentGateway: e.target.value })
          }
          className="brand-input cursor-pointer"
        >
          <option value="">Select a gateway…</option>
          {PAYMENT_GATEWAYS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
        {value.paymentGateway === "other" && (
          <input
            type="text"
            value={value.paymentGatewayOther}
            onChange={(e) =>
              onChange({ ...value, paymentGatewayOther: e.target.value })
            }
            className="brand-input"
            placeholder="Which gateway?"
          />
        )}
      </fieldset>

      <fieldset disabled={disabled} className="space-y-2">
        <legend className="text-sm font-medium text-black">
          Which AI models do you run in production?
        </legend>
        <p className="text-sm text-[var(--muted)]">
          Used to understand your stack. Uploads still accept any model with
          published pricing.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {AI_MODEL_OPTIONS.map((model) => (
            <label
              key={model.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--surface)] px-3 py-2 text-sm text-black"
            >
              <input
                type="checkbox"
                checked={value.aiModelIds.includes(model.value)}
                onChange={() => toggleModel(model.value)}
                className="cursor-pointer"
              />
              <span>{model.label}</span>
              <span className="ml-auto text-xs uppercase tracking-wide text-[var(--muted)]">
                {model.provider}
              </span>
            </label>
          ))}
        </div>

        {value.aiModelsOther.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {value.aiModelsOther.map((name) => (
              <li key={name} className="brand-chip !ml-0">
                {name}
                <button
                  type="button"
                  onClick={() => removeOtherModel(name)}
                  className="ml-2 cursor-pointer font-semibold"
                  aria-label={`Remove ${name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={otherModelDraft}
            onChange={(e) => setOtherModelDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addOtherModel();
              }
            }}
            className="brand-input !mt-0"
            placeholder="Another model (e.g. gpt-4o)"
          />
          <button
            type="button"
            onClick={addOtherModel}
            className="brand-btn-ghost shrink-0 cursor-pointer"
          >
            Add
          </button>
        </div>
      </fieldset>
    </div>
  );
}
