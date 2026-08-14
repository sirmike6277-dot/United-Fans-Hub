"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TrophyIcon } from "./PredictionIcons";
import { PredictionForm } from "./PredictionForm";
import { PredictionSummary } from "./PredictionSummary";
import { isMatchLocked } from "@/lib/predictions/predictions";
import type { Prediction, SquadPlayer } from "@/lib/predictions/predictions";

export interface PredictionSectionProps {
  matchId: string;
  /** Null when the visitor isn't signed in — the section then shows a login CTA instead of a form, same pattern as the landing page's existing signed-out "Predict this match" CTA. */
  profileId: string | null;
  opponentName: string;
  isHome: boolean;
  kickoffAt: string;
  squad: SquadPlayer[];
  initialPrediction: Prediction | null;
}

export function PredictionSection({
  matchId,
  profileId,
  opponentName,
  isHome,
  kickoffAt,
  squad,
  initialPrediction,
}: PredictionSectionProps) {
  const [prediction, setPrediction] = useState(initialPrediction);
  const [editing, setEditing] = useState(false);
  const locked = isMatchLocked(kickoffAt);

  return (
    <Card>
      <div className="flex items-center gap-2">
        <TrophyIcon />
        <h2 className="font-display text-lg font-bold uppercase text-red-primary">Prediction</h2>
      </div>

      <div className="mt-4">
        {!profileId ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-text-muted">Sign in to predict this match.</p>
            <Button href="/login" size="sm">
              Login to Predict
            </Button>
          </div>
        ) : locked ? (
          prediction ? (
            <PredictionSummary prediction={prediction} opponentName={opponentName} isHome={isHome} locked />
          ) : (
            <p className="py-4 text-center text-sm text-text-muted">
              Predictions closed before you submitted one for this match.
            </p>
          )
        ) : prediction && !editing ? (
          <PredictionSummary
            prediction={prediction}
            opponentName={opponentName}
            isHome={isHome}
            locked={false}
            onEdit={() => setEditing(true)}
          />
        ) : (
          <PredictionForm
            matchId={matchId}
            profileId={profileId}
            opponentName={opponentName}
            isHome={isHome}
            squad={squad}
            existingPrediction={editing ? prediction : null}
            onSaved={(saved) => {
              setPrediction(saved);
              setEditing(false);
            }}
            onCancel={editing ? () => setEditing(false) : undefined}
          />
        )}
      </div>
    </Card>
  );
}
