import { forwardRef } from "react";

interface Frame {
  frame_number: number;
  roll_1: number;
  roll_2: number | null;
  roll_3: number | null;
  is_strike: boolean;
  is_spare: boolean;
  pins_remaining: number[] | null;
  frame_score: number;
}

interface Game {
  game_number: number;
  total_score: number;
  is_clean: boolean;
  strike_count: number;
  spare_count: number;
  frames?: Frame[];
}

interface ShareCardProps {
  playerName: string;
  venue: string | null;
  dateLabel: string;
  totalPins: number;
  games: Game[];
}

function formatRoll(
  pins: number,
  rollIndex: number,
  isStrike: boolean,
  isSpare: boolean,
  frameNumber: number,
  roll1: number,
): { text: string; color: string } {
  // Strike
  if (isStrike && rollIndex === 0) {
    return { text: "X", color: "#22c55e" };
  }
  // In 10th frame, additional strikes
  if (frameNumber === 10 && pins === 10) {
    return { text: "X", color: "#22c55e" };
  }
  // Spare
  if (isSpare && rollIndex === 1) {
    return { text: "/", color: "#f59e0b" };
  }
  // 10th frame spare on roll 3
  if (frameNumber === 10 && rollIndex === 2) {
    if (pins !== null && roll1 !== undefined) {
      // Check if this roll + previous non-strike roll = 10
      // This is a simplification; spare on roll3 when roll2+roll3=10
      // We handle it by checking the value
    }
  }
  // Gutter
  if (pins === 0) {
    return { text: "-", color: "#334155" };
  }
  // Normal
  return { text: String(pins), color: "#64748b" };
}

function computeStats(games: Game[]) {
  let totalStrikes = 0;
  let totalSpareOpportunities = 0;
  let totalSparesConverted = 0;
  let totalNonTenthFrames = 0;
  let hasFrameData = false;

  for (const game of games) {
    if (game.frames && game.frames.length > 0) {
      hasFrameData = true;
      for (const frame of game.frames) {
        if (frame.frame_number < 10) {
          totalNonTenthFrames++;
          if (frame.is_strike) {
            totalStrikes++;
          } else {
            // Not a strike = spare opportunity
            totalSpareOpportunities++;
            if (frame.is_spare) {
              totalSparesConverted++;
            }
          }
        } else {
          // 10th frame: only count first ball for strike rate
          totalNonTenthFrames++;
          if (frame.is_strike) {
            totalStrikes++;
          } else {
            totalSpareOpportunities++;
            if (frame.is_spare) {
              totalSparesConverted++;
            }
          }
        }
      }
    } else {
      totalStrikes += game.strike_count;
      totalSparesConverted += game.spare_count;
    }
  }

  const strikeRate =
    hasFrameData && totalNonTenthFrames > 0
      ? Math.round((totalStrikes / totalNonTenthFrames) * 100)
      : games.length > 0
        ? Math.round((totalStrikes / (games.length * 9)) * 100)
        : 0;

  const spareRate =
    totalSpareOpportunities > 0
      ? Math.round((totalSparesConverted / totalSpareOpportunities) * 100)
      : 0;

  return { strikeRate, spareRate };
}

function renderFrameRolls(
  frame: Frame,
  sizeMode: "normal" | "semi" | "compact",
) {
  const rollFontSize =
    sizeMode === "compact" ? 20 : sizeMode === "semi" ? 24 : 26;
  const rollWidth = sizeMode === "compact" ? 24 : sizeMode === "semi" ? 28 : 32;
  const rollPadding =
    sizeMode === "compact"
      ? "5px 2px"
      : sizeMode === "semi"
        ? "7px 3px"
        : "8px 4px";

  const rolls: { text: string; color: string }[] = [];

  if (frame.frame_number < 10) {
    if (frame.is_strike) {
      rolls.push({ text: "X", color: "#22c55e" });
      rolls.push({ text: "", color: "transparent" });
    } else {
      const r1 = formatRoll(
        frame.roll_1,
        0,
        false,
        false,
        frame.frame_number,
        frame.roll_1,
      );
      rolls.push(r1);
      if (frame.is_spare) {
        rolls.push({ text: "/", color: "#f59e0b" });
      } else {
        const r2val = frame.roll_2 ?? 0;
        rolls.push(
          formatRoll(r2val, 1, false, false, frame.frame_number, frame.roll_1),
        );
      }
    }
  } else {
    // 10th frame: up to 3 rolls
    const r1 = frame.roll_1;
    const r2 = frame.roll_2;
    const r3 = frame.roll_3;

    // Roll 1
    if (r1 === 10) {
      rolls.push({ text: "X", color: "#22c55e" });
    } else if (r1 === 0) {
      rolls.push({ text: "-", color: "#334155" });
    } else {
      rolls.push({ text: String(r1), color: "#64748b" });
    }

    // Roll 2
    if (r2 !== null && r2 !== undefined) {
      if (r1 === 10 && r2 === 10) {
        rolls.push({ text: "X", color: "#22c55e" });
      } else if (r1 !== 10 && r1 + r2 === 10) {
        rolls.push({ text: "/", color: "#f59e0b" });
      } else if (r2 === 0) {
        rolls.push({ text: "-", color: "#334155" });
      } else {
        rolls.push({ text: String(r2), color: "#64748b" });
      }
    }

    // Roll 3
    if (r3 !== null && r3 !== undefined) {
      // After two strikes, third can be strike
      if (r3 === 10) {
        rolls.push({ text: "X", color: "#22c55e" });
      } else if (r2 !== null && r1 === 10 && r2 !== 10 && r2 + r3 === 10) {
        rolls.push({ text: "/", color: "#f59e0b" });
      } else if (
        r2 !== null &&
        r1 !== 10 &&
        r1 + (r2 ?? 0) === 10 &&
        r3 === 10
      ) {
        rolls.push({ text: "X", color: "#22c55e" });
      } else if (r3 === 0) {
        rolls.push({ text: "-", color: "#334155" });
      } else {
        rolls.push({ text: String(r3), color: "#64748b" });
      }
    }
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "rgba(255, 255, 255, 0.03)",
        borderRadius: sizeMode === "compact" ? "8px" : "10px",
        padding: rollPadding,
        minHeight:
          sizeMode === "compact"
            ? "32px"
            : sizeMode === "semi"
              ? "36px"
              : "40px",
      }}
    >
      {rolls.map((roll, i) => (
        <span
          key={i}
          style={{
            fontSize: `${rollFontSize}px`,
            fontWeight: 700,
            color: roll.color,
            textAlign: "center" as const,
            minWidth: roll.text ? `${Math.max(rollWidth * 0.6, 14)}px` : "0px",
          }}
        >
          {roll.text}
        </span>
      ))}
    </div>
  );
}

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ playerName, venue, dateLabel, totalPins, games }, ref) => {
    const gameCount = games.length;
    const avg = gameCount > 0 ? Math.round(totalPins / gameCount) : 0;
    const highScore = Math.max(...games.map((g) => g.total_score));
    const cleanCount = games.filter((g) => g.is_clean).length;
    const { strikeRate, spareRate } = computeStats(games);

    const sizeMode: "normal" | "semi" | "compact" =
      gameCount >= 7 ? "compact" : gameCount >= 5 ? "semi" : "normal";

    // Size tokens based on mode
    const s = {
      normal: {
        padding: "72px 56px",
        headerMb: 40,
        avatarSize: 88,
        avatarFont: 40,
        nameFont: 42,
        venueFont: 28,
        bigGap: 40,
        bigMb: 48,
        bigLabelFont: 26,
        bigLabelMb: 8,
        bigValueFont: 120,
        chipsGap: 16,
        chipsMb: 32,
        chipPad: "10px 28px 14px",
        chipFont: 32,
        chipRadius: 20,
        statsGap: 24,
        statsMb: 40,
        statPad: "20px 16px",
        statLabelFont: 22,
        statLabelMb: 8,
        statValueFont: 36,
        statRadius: 20,
        cardsGap: 24,
        cardPad: 24,
        cardRadius: 24,
        cardHeaderMb: 16,
        cardTitleFont: 28,
        cardScoreFont: 36,
        frameTotalFont: 24,
        frameTotalPad: "4px 0",
        footerPt: 32,
        footerFont: 26,
      },
      semi: {
        padding: "44px 40px",
        headerMb: 20,
        avatarSize: 64,
        avatarFont: 28,
        nameFont: 36,
        venueFont: 22,
        bigGap: 24,
        bigMb: 20,
        bigLabelFont: 20,
        bigLabelMb: 4,
        bigValueFont: 80,
        chipsGap: 10,
        chipsMb: 20,
        chipPad: "8px 16px",
        chipFont: 26,
        chipRadius: 16,
        statsGap: 14,
        statsMb: 20,
        statPad: "14px 10px",
        statLabelFont: 18,
        statLabelMb: 4,
        statValueFont: 30,
        statRadius: 16,
        cardsGap: 12,
        cardPad: 16,
        cardRadius: 18,
        cardHeaderMb: 10,
        cardTitleFont: 22,
        cardScoreFont: 28,
        frameTotalFont: 18,
        frameTotalPad: "2px 0",
        footerPt: 16,
        footerFont: 20,
      },
      compact: {
        padding: "36px 32px",
        headerMb: 16,
        avatarSize: 52,
        avatarFont: 24,
        nameFont: 30,
        venueFont: 18,
        bigGap: 16,
        bigMb: 14,
        bigLabelFont: 16,
        bigLabelMb: 2,
        bigValueFont: 64,
        chipsGap: 8,
        chipsMb: 14,
        chipPad: "6px 12px",
        chipFont: 22,
        chipRadius: 12,
        statsGap: 10,
        statsMb: 16,
        statPad: "10px 8px",
        statLabelFont: 14,
        statLabelMb: 2,
        statValueFont: 24,
        statRadius: 12,
        cardsGap: 8,
        cardPad: 12,
        cardRadius: 14,
        cardHeaderMb: 6,
        cardTitleFont: 18,
        cardScoreFont: 22,
        frameTotalFont: 14,
        frameTotalPad: "1px 0",
        footerPt: 12,
        footerFont: 18,
      },
    }[sizeMode];

    const isHighGame = (score: number) => score === highScore;

    return (
      <div
        ref={ref}
        style={{
          width: "1080px",
          height: "1920px",
          background:
            "linear-gradient(165deg, #0a0e1a 0%, #0f1729 40%, #0a0e1a 100%)",
          borderRadius: "40px",
          padding: s.padding,
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Decorative radial blurs */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-80px",
            width: "500px",
            height: "500px",
            background:
              "radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-60px",
            left: "-40px",
            width: "400px",
            height: "400px",
            background:
              "radial-gradient(circle, rgba(34, 197, 94, 0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            marginBottom: `${s.headerMb}px`,
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: `${s.avatarSize}px`,
              height: `${s.avatarSize}px`,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: `${s.avatarFont}px`,
              fontWeight: 800,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {playerName.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div
              style={{
                fontSize: `${s.nameFont}px`,
                fontWeight: 800,
                color: "#f1f5f9",
                lineHeight: 1.1,
              }}
            >
              {playerName}
            </div>
            {venue && (
              <div
                style={{
                  fontSize: `${s.venueFont}px`,
                  color: "#64748b",
                  fontWeight: 500,
                }}
              >
                {venue}
              </div>
            )}
          </div>
        </div>

        {/* Big Scores */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            marginBottom: `${s.bigMb}px`,
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ flex: 1, textAlign: "center" }}>
            <div
              style={{
                fontSize: `${s.bigLabelFont}px`,
                fontWeight: 600,
                color: "#64748b",
                textTransform: "uppercase" as const,
                letterSpacing: "2px",
                marginBottom: `${s.bigLabelMb}px`,
              }}
            >
              Total
            </div>
            <div
              style={{
                fontSize: `${s.bigValueFont}px`,
                fontWeight: 900,
                lineHeight: 1,
                color: "#f1f5f9",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {totalPins.toLocaleString()}
            </div>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div
              style={{
                fontSize: `${s.bigLabelFont}px`,
                fontWeight: 600,
                color: "#64748b",
                textTransform: "uppercase" as const,
                letterSpacing: "2px",
                marginBottom: `${s.bigLabelMb}px`,
              }}
            >
              Average
            </div>
            <div
              style={{
                fontSize: `${s.bigValueFont}px`,
                fontWeight: 900,
                lineHeight: 1,
                color: "#f1f5f9",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {avg}
            </div>
          </div>
        </div>

        {/* Game Chips */}
        <div
          style={{
            display: "flex",
            gap: `${s.chipsGap}px`,
            marginBottom: `${s.chipsMb}px`,
            flexWrap: "wrap",
            justifyContent: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          {games.map((game) => {
            const isHigh = isHighGame(game.total_score);
            return (
              <div
                key={game.game_number}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: `2px solid ${isHigh ? "#f59e0b" : "rgba(255, 255, 255, 0.08)"}`,
                  borderRadius: `${s.chipRadius}px`,
                  padding: s.chipPad,
                  fontSize: `${s.chipFont}px`,
                  fontWeight: 700,
                  color: isHigh ? "#f59e0b" : "#cbd5e1",
                  textAlign: "center" as const,
                }}
              >
                <div
                  style={{
                    fontSize: `${sizeMode === "compact" ? 14 : 16}px`,
                    fontWeight: 600,
                    color: isHigh ? "#f59e0b" : "#64748b",
                    letterSpacing: "1px",
                    marginBottom: "2px",
                  }}
                >
                  G{game.game_number}
                </div>
                {game.total_score}
              </div>
            );
          })}
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: "flex",
            gap: `${s.statsGap}px`,
            marginBottom: `${s.statsMb}px`,
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              flex: 1,
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: `${s.statRadius}px`,
              padding: s.statPad,
              textAlign: "center" as const,
            }}
          >
            <div
              style={{
                fontSize: `${s.statLabelFont}px`,
                fontWeight: 600,
                color: "#64748b",
                textTransform: "uppercase" as const,
                letterSpacing: "1.5px",
                marginBottom: `${s.statLabelMb}px`,
              }}
            >
              Strike%
            </div>
            <div
              style={{
                fontSize: `${s.statValueFont}px`,
                fontWeight: 800,
                color: "#f1f5f9",
              }}
            >
              {strikeRate}%
            </div>
          </div>
          <div
            style={{
              flex: 1,
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: `${s.statRadius}px`,
              padding: s.statPad,
              textAlign: "center" as const,
            }}
          >
            <div
              style={{
                fontSize: `${s.statLabelFont}px`,
                fontWeight: 600,
                color: "#64748b",
                textTransform: "uppercase" as const,
                letterSpacing: "1.5px",
                marginBottom: `${s.statLabelMb}px`,
              }}
            >
              Spare%
            </div>
            <div
              style={{
                fontSize: `${s.statValueFont}px`,
                fontWeight: 800,
                color: "#f1f5f9",
              }}
            >
              {spareRate}%
            </div>
          </div>
          <div
            style={{
              flex: 1,
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: `${s.statRadius}px`,
              padding: s.statPad,
              textAlign: "center" as const,
            }}
          >
            <div
              style={{
                fontSize: `${s.statLabelFont}px`,
                fontWeight: 600,
                color: "#64748b",
                textTransform: "uppercase" as const,
                letterSpacing: "1.5px",
                marginBottom: `${s.statLabelMb}px`,
              }}
            >
              Clean
            </div>
            <div
              style={{
                fontSize: `${s.statValueFont}px`,
                fontWeight: 800,
                color: cleanCount > 0 ? "#22c55e" : "#475569",
              }}
            >
              {cleanCount}/{gameCount}
            </div>
          </div>
        </div>

        {/* Scorecards */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: `${s.cardsGap}px`,
            flex: 1,
            position: "relative",
            zIndex: 1,
          }}
        >
          {games.map((game) => {
            const isHigh = isHighGame(game.total_score);
            const isClean = game.is_clean;
            const borderColor = isClean
              ? "rgba(34, 197, 94, 0.5)"
              : isHigh
                ? "rgba(245, 158, 11, 0.5)"
                : "rgba(255, 255, 255, 0.06)";
            const titleColor = isClean
              ? "#22c55e"
              : isHigh
                ? "#f59e0b"
                : "#94a3b8";
            const scoreColor = isClean
              ? "#22c55e"
              : isHigh
                ? "#f59e0b"
                : "#f1f5f9";

            return (
              <div
                key={game.game_number}
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: `2px solid ${borderColor}`,
                  borderRadius: `${s.cardRadius}px`,
                  padding: `${s.cardPad}px`,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: `${s.cardHeaderMb}px`,
                  }}
                >
                  <div
                    style={{
                      fontSize: `${s.cardTitleFont}px`,
                      fontWeight: 700,
                      color: titleColor,
                    }}
                  >
                    Game {game.game_number}
                  </div>
                  <div
                    style={{
                      fontSize: `${s.cardScoreFont}px`,
                      fontWeight: 900,
                      color: scoreColor,
                    }}
                  >
                    {game.total_score}
                  </div>
                </div>

                {game.frames && game.frames.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(10, 1fr)",
                      gap: "6px",
                    }}
                  >
                    {game.frames.map((frame) => (
                      <div
                        key={frame.frame_number}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        {renderFrameRolls(frame, sizeMode)}
                        <div
                          style={{
                            fontSize: `${s.frameTotalFont}px`,
                            fontWeight: 700,
                            color: "#94a3b8",
                            textAlign: "center" as const,
                            padding: s.frameTotalPad,
                          }}
                        >
                          {frame.frame_score}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Date Footer */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: `${s.footerPt}px`,
            textAlign: "center" as const,
            fontSize: `${s.footerFont}px`,
            color: "#475569",
            fontWeight: 500,
            position: "relative",
            zIndex: 1,
          }}
        >
          {dateLabel}
        </div>
      </div>
    );
  },
);

ShareCard.displayName = "ShareCard";

export default ShareCard;
