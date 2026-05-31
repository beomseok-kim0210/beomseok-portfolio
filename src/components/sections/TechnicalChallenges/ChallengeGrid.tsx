"use client";

import { useState } from "react";
import { ChallengeCard } from "@/components/ui/ChallengeCard";
import { MotionBlock } from "@/components/ui/MotionBlock";
import type { Challenge } from "@/types/portfolio";

type ChallengeGridProps = {
  challenges: Challenge[];
};

export function ChallengeGrid({ challenges }: ChallengeGridProps) {
  const [openChallenge, setOpenChallenge] = useState(0);

  return (
    <div className="mt-16 grid gap-8 lg:grid-cols-2">
      {challenges.map((challenge, index) => (
        <MotionBlock key={challenge.title} delay={(index % 2) * 0.05}>
          <ChallengeCard
            challenge={challenge}
            index={index}
            isOpen={openChallenge === index}
            onToggle={() => setOpenChallenge(openChallenge === index ? -1 : index)}
          />
        </MotionBlock>
      ))}
    </div>
  );
}
