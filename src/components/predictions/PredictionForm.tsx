"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormError } from "@/components/auth/FormError";
import { createPrediction, updatePrediction, MIN_SCORE, MAX_SCORE } from "@/lib/predictions/predictions";
import type { Prediction, SquadPlayer } from "@/lib/predictions/predictions";

export interface PredictionFormProps {
  matchId: string;
  profileId: string;
  opponentName: string;
  /** Whether Manchester United is the home side in this fixture — determines which of predicted_home_score/predicted_away_score "Man Utd" and "Opponent" map to, same convention as ScoreDisplay. */
  isHome: boolean;
  squad: SquadPlayer[];
  existingPrediction: Prediction | null;
  onSaved: (prediction: Prediction) => void;
  onCancel?: () => void;
}

/**
 * predicted_home_score/predicted_away_score in the schema are literal
 * home/away values (matching matches.home_score/away_score, which is what
 * settle_prediction() compares against) — never "Man Utd's score"
 * specifically. This form always presents "Manchester United" and
 * "Opponent" (per the approved UI spec), and converts to/from home/away
 * using `isHome`, exactly like ScoreDisplay already does for display.
 */
export function PredictionForm({
  matchId,
  profileId,
  opponentName,
  isHome,
  squad,
  existingPrediction,
  onSaved,
  onCancel,
}: PredictionFormProps) {
  const initialManUtd = existingPrediction
    ? String(isHome ? existingPrediction.predictedHomeScore : existingPrediction.predictedAwayScore)
    : "";
  const initialOpponent = existingPrediction
    ? String(isHome ? existingPrediction.predictedAwayScore : existingPrediction.predictedHomeScore)
    : "";

  const [manUtdScore, setManUtdScore] = useState(initialManUtd);
  const [opponentScore, setOpponentScore] = useState(initialOpponent);
  const [firstScorerId, setFirstScorerId] = useState(existingPrediction?.predictedFirstScorerId ?? "");
  const [motmId, setMotmId] = useState(existingPrediction?.predictedMotmId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickPicks = [
    { label: "2-0", manUtd: 2, opponent: 0 },
    { label: "2-1", manUtd: 2, opponent: 1 },
    { label: "3-1", manUtd: 3, opponent: 1 },
    { label: "1-0", manUtd: 1, opponent: 0 },
    { label: "1-1", manUtd: 1, opponent: 1 },
  ];
  const matchesQuickPick = (pick: { manUtd: number; opponent: number }) =>
    manUtdScore === String(pick.manUtd) && opponentScore === String(pick.opponent);
  const isCustom = manUtdScore !== "" && !quickPicks.some(matchesQuickPick);

  function validScore(value: string): number | null {
    if (value.trim() === "") return null;
    const n = Number(value);
    if (!Number.isInteger(n) || n < MIN_SCORE || n > MAX_SCORE) return null;
    return n;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const manUtd = validScore(manUtdScore);
    const opponent = validScore(opponentScore);

    if (manUtd === null || opponent === null) {
      setError(`Enter a whole number between ${MIN_SCORE} and ${MAX_SCORE} for both scores.`);
      return;
    }

    const predictedHomeScore = isHome ? manUtd : opponent;
    const predictedAwayScore = isHome ? opponent : manUtd;

    setSubmitting(true);
    const supabase = createClient();

    const { prediction, error: saveError } = existingPrediction
      ? await updatePrediction(supabase, {
          predictionId: existingPrediction.id,
          predictedHomeScore,
          predictedAwayScore,
          predictedFirstScorerId: firstScorerId || null,
          predictedMotmId: motmId || null,
        })
      : await createPrediction(supabase, {
          matchId,
          profileId,
          predictedHomeScore,
          predictedAwayScore,
          predictedFirstScorerId: firstScorerId || null,
          predictedMotmId: motmId || null,
        });

    setSubmitting(false);

    if (saveError || !prediction) {
      setError(saveError ?? "Couldn't save your prediction. Please try again.");
      return;
    }

    onSaved(prediction);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error ? <FormError message={error} /> : null}

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
          Your predicted score?
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {quickPicks.map((pick) => {
            const selected = matchesQuickPick(pick);
            return (
              <button
                key={pick.label}
                type="button"
                disabled={submitting}
                onClick={() => {
                  setManUtdScore(String(pick.manUtd));
                  setOpponentScore(String(pick.opponent));
                }}
                className={`rounded-control border px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary ${
                  selected
                    ? "border-red-primary bg-red-primary text-white"
                    : "border-ink/10 bg-bg-elevated text-text-body hover:border-ink/30"
                }`}
              >
                {pick.label}
              </button>
            );
          })}
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              setManUtdScore("");
              setOpponentScore("");
            }}
            className={`rounded-control border px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary ${
              isCustom
                ? "border-red-primary bg-red-primary text-white"
                : "border-ink/10 bg-bg-elevated text-text-body hover:border-ink/30"
            }`}
          >
            Other
          </button>
        </div>

        <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-text-muted">Or enter exact score</p>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Manchester United"
            name="manUtdScore"
            type="number"
            inputMode="numeric"
            min={MIN_SCORE}
            max={MAX_SCORE}
            step={1}
            value={manUtdScore}
            onChange={(e) => setManUtdScore(e.target.value)}
            disabled={submitting}
            required
          />
          <Input
            label={opponentName}
            name="opponentScore"
            type="number"
            inputMode="numeric"
            min={MIN_SCORE}
            max={MAX_SCORE}
            step={1}
            value={opponentScore}
            onChange={(e) => setOpponentScore(e.target.value)}
            disabled={submitting}
            required
          />
        </div>
      </div>

      <Select
        label="First scorer (optional)"
        name="firstScorer"
        value={firstScorerId}
        onChange={(e) => setFirstScorerId(e.target.value)}
        disabled={submitting}
      >
        <option value="">No prediction</option>
        {squad.map((p) => (
          <option key={p.id} value={p.id}>
            {p.shirtNumber ? `#${p.shirtNumber} ` : ""}
            {p.fullName}
          </option>
        ))}
      </Select>

      <Select
        label="Man of the Match (optional)"
        name="motm"
        value={motmId}
        onChange={(e) => setMotmId(e.target.value)}
        disabled={submitting}
      >
        <option value="">No prediction</option>
        {squad.map((p) => (
          <option key={p.id} value={p.id}>
            {p.shirtNumber ? `#${p.shirtNumber} ` : ""}
            {p.fullName}
          </option>
        ))}
      </Select>
      <p className="text-xs text-text-muted">
        Man of the Match predictions aren&apos;t scored yet — there&apos;s no reliable official result to check
        them against. This may change in a future update.
      </p>

      <div className="flex gap-3">
        <Button type="submit" loading={submitting} disabled={submitting}>
          {submitting ? "Saving..." : existingPrediction ? "Save Changes" : "Submit Prediction"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
