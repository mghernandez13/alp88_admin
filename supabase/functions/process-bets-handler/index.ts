import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("No authorization header");

  // 2. Initialize the Admin Client using the SERVICE_ROLE_KEY
  // Note: Do NOT use the user's JWT to initialize this client.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const normalizeBetNumber = (value: string) =>
    value.trim().replace(/^0+(?=\d)/, "");

  const splitAndNormalizeNumbers = (combinationValue: string) =>
    combinationValue.split("-").map(normalizeBetNumber);

  const isTrioCombinationWithoutZeroPrefix = (combinationValue: string) => {
    const parts = combinationValue.split("-").map((part) => part.trim());

    if (parts.length !== 3) {
      return false;
    }

    // Reject values like 01 so trio detection does not rely on zero-prefixed inputs.
    if (parts.some((part) => /^0\d+$/.test(part))) {
      return false;
    }

    return parts[0] === parts[1] && parts[1] === parts[2];
  };

  const checkIfRambolitoWinner = (
    betNumbers: string[],
    resultNumbers: string[],
  ) => {
    return (
      betNumbers.length === resultNumbers.length &&
      [...betNumbers].sort().join("-") === [...resultNumbers].sort().join("-")
    );
  };

  const { data: messages, error } = await supabase
    .schema("pgmq_public")
    .rpc("read", {
      queue_name: "process-bets-queue",
      sleep_seconds: 30, // seconds
      n: 5, // number of messages to batch
    });

  if (error) {
    console.error("Error reading messages from process-bets-queue:", error);

    return new Response(
      JSON.stringify({
        error: "Error reading messages from process-bets-queue",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (messages) {
    for (const msg of messages) {
      try {
        console.log("Processing message:", msg.message);

        const {
          resultId,
          lottoTypeId,
          resultDrawDate,
          combination,
          createdBy,
        } = JSON.parse(msg.message);

        if (
          !resultId ||
          !lottoTypeId ||
          !resultDrawDate ||
          !combination ||
          !createdBy
        ) {
          console.log(
            "Missing lottoTypeId, resultDrawDate, combination, or createdBy.",
          );
          break;
        }

        // Fetch all bets matching lottoTypeId and created_at date
        const startDate = resultDrawDate + "T00:00:00";
        const endDate = resultDrawDate + "T23:59:59.999";
        const { data: lottoTypeDetails, error: lottoTypeError } = await supabase
          .from("lotto_types")
          .select("*")
          .eq("id", lottoTypeId)
          .eq("is_active", true)
          .eq("is_archive", false)
          .single();

        if (lottoTypeError) {
          console.error(
            `Error fetching lotto type details for lottoTypeId ${lottoTypeId}:`,
            lottoTypeError,
          );
          continue;
        }

        const gameType = lottoTypeDetails?.game_type;

        //Reset all the bets before processing to ensure we can re-process if needed without duplicates
        await supabase
          .from("bets")
          .update({
            hit: false,
            prize_amount: null,
            is_super_jackpot: false,
            is_return_bet: false,
          })
          .eq("bet_status", "completed")
          .eq("is_archive", false)
          .eq("lotto_type_id", lottoTypeId)
          .gte("created_at", startDate)
          .lte("created_at", endDate);

        const { data: allBets, error: betsError } = await supabase
          .from("bets")
          .select("*, bet_types(id, name, code)")
          .eq("lotto_type_id", lottoTypeId)
          .eq("bet_status", "completed")
          .eq("is_archive", false)
          .gte("created_at", startDate)
          .lte("created_at", endDate);

        if (betsError) {
          return new Response(
            JSON.stringify({
              error: `Error fetching bets for lottoTypeId ${lottoTypeId} and draw date ${resultDrawDate}`,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Process bets for super_jackpot, return_bet, and classic match

        const resultNumbers = splitAndNormalizeNumbers(combination);
        const processedResults = [];
        if (allBets && Array.isArray(allBets)) {
          for (const bet of allBets) {
            const betAmount =
              bet.bet_types && bet.bet_types.code.toLowerCase() === "fb"
                ? 10
                : Number(bet.bet_amount || 0);
            const betTypeCode = bet.bet_types?.code;
            let betPrizeQuery = supabase
              .from("bet_prizes")
              .select("*, bet_types(id, name, code)")
              .eq("lotto_type_id", lottoTypeId)
              .eq("bet_amount", betAmount)
              .eq("is_active", true)
              .eq("is_archive", false);

            if (
              bet.bet_types?.id &&
              betTypeCode?.toLowerCase() !== "fb" &&
              betTypeCode?.toLowerCase() !== "rb"
            ) {
              betPrizeQuery = betPrizeQuery.eq(
                "bet_type_id",
                bet.bet_types?.id,
              );
            }

            const { data: betPrizeData, error: betPrizeError } =
              await betPrizeQuery.maybeSingle();

            if (betPrizeError) {
              console.error(
                `Error fetching bet prize for lottoTypeId: ${lottoTypeId}, bet code: ${betTypeCode} and bet amount: ${betAmount}:`,
                betPrizeError,
              );
            }

            let prizeAmount = 0;
            const betNumbers = splitAndNormalizeNumbers(bet.combination);

            if (gameType === "LP3") {
              const firstThree = resultNumbers.slice(0, 3);
              const isSuperJackpot =
                betNumbers.length === 3 &&
                betNumbers[0] === firstThree[0] &&
                betNumbers[1] === firstThree[1] &&
                betNumbers[2] === firstThree[2] &&
                !betTypeCode;

              const matchCount = betNumbers.filter((num) =>
                resultNumbers.includes(num),
              ).length;

              console.log(
                "matchCount",
                matchCount,
                "betNumbers",
                betNumbers,
                "firstThree",
                firstThree,
              );

              const isReturnBet =
                !isSuperJackpot &&
                matchCount === 2 &&
                bet.bet_amount >= 50 &&
                !betTypeCode;

              if (isSuperJackpot || isReturnBet) {
                if (isSuperJackpot && betPrizeData) {
                  prizeAmount = betPrizeData.super_jackpot
                    ? betPrizeData.prize * betPrizeData.super_jackpot_multiplier
                    : betPrizeData.prize;
                }

                if (isReturnBet) {
                  prizeAmount = 0;
                }

                await supabase
                  .from("bets")
                  .update({
                    hit: true,
                    prize_amount: prizeAmount,
                    is_super_jackpot:
                      betPrizeData.super_jackpot && isSuperJackpot,
                    is_return_bet: isReturnBet,
                  })
                  .eq("id", bet.id);

                processedResults.push({
                  ...bet,
                  prize_amount: prizeAmount,
                  hit: true,
                  is_super_jackpot: isSuperJackpot,
                  is_return_bet: isReturnBet,
                });
                continue;
              }
              const isClassicMatch = betNumbers.every((num) =>
                resultNumbers.includes(num),
              );
              if (isClassicMatch) {
                prizeAmount = betPrizeData ? betPrizeData.prize : 0;
                await supabase
                  .from("bets")
                  .update({
                    hit: true,
                    prize_amount: prizeAmount,
                    is_super_jackpot: false,
                    is_return_bet: false,
                  })
                  .eq("id", bet.id);
                processedResults.push({
                  ...bet,
                  hit: true,
                  prize_amount: prizeAmount,
                  is_super_jackpot: false,
                  is_return_bet: false,
                });
                continue;
              }
            } else if (gameType === "3D") {
              if (betTypeCode?.toLowerCase() === "s") {
                const isStraight =
                  betNumbers[0] === resultNumbers[0] &&
                  betNumbers[1] === resultNumbers[1] &&
                  betNumbers[2] === resultNumbers[2];

                const isTrioWinner =
                  betNumbers.length === resultNumbers.length &&
                  isTrioCombinationWithoutZeroPrefix(bet.combination) &&
                  isTrioCombinationWithoutZeroPrefix(combination) &&
                  [...betNumbers].sort().join("-") ===
                    [...resultNumbers].sort().join("-");

                if (isTrioWinner) {
                  const { data: betTypeTrioData, error: betTypeTrioError } =
                    await supabase
                      .from("bet_types")
                      .select("*")
                      .eq("game_type", "3D")
                      .eq("code", "T")
                      .eq("is_active", true)
                      .eq("is_archive", false);

                  if (!betTypeTrioError) {
                    const { data: betPrizeTrioData, error: betPrizeTrioError } =
                      await supabase
                        .from("bet_prizes")
                        .select("*, bet_types(id, name, code)")
                        .eq("lotto_type_id", lottoTypeId)
                        .eq("bet_amount", betAmount)
                        .eq("bet_type_id", betTypeTrioData?.[0]?.id)
                        .eq("is_active", true)
                        .eq("is_archive", false)
                        .maybeSingle();

                    if (betPrizeTrioError) {
                      console.error(
                        `Error fetching bet prize for lottoTypeId: ${lottoTypeId}, bet code: ${betTypeTrioData?.[0]?.code} and bet amount: ${betAmount}:`,
                        betPrizeTrioError,
                      );
                    } else {
                      prizeAmount = betPrizeTrioData
                        ? betPrizeTrioData.prize
                        : 0;
                    }
                  }
                } else if (isStraight) {
                  prizeAmount = betPrizeData ? betPrizeData.prize : 0;
                }
              } else if (betTypeCode?.toLowerCase() === "r") {
                const isRambolitoWinner = checkIfRambolitoWinner(
                  betNumbers,
                  resultNumbers,
                );
                if (isRambolitoWinner) {
                  const counts = betNumbers.reduce((acc, n) => {
                    acc[n] = (acc[n] || 0) + 1;
                    return acc;
                  }, {});
                  const uniqueCounts = Object.values(counts);
                  if (uniqueCounts.length === 2 && uniqueCounts.includes(2)) {
                    // Detects if Rambolito 3
                    prizeAmount = betPrizeData ? betPrizeData.prize : 0;
                  } else {
                    // Detects if Rambolito 6
                    // Prize is half only of the Rambolito 3 prize
                    prizeAmount = betPrizeData ? betPrizeData.prize / 2 : 0;
                  }
                }
              } else if (betTypeCode?.toLowerCase() === "t") {
                const isTrioWinner =
                  betNumbers.length === resultNumbers.length &&
                  isTrioCombinationWithoutZeroPrefix(bet.combination) &&
                  isTrioCombinationWithoutZeroPrefix(combination) &&
                  [...betNumbers].sort().join("-") ===
                    [...resultNumbers].sort().join("-");
                if (isTrioWinner) {
                  prizeAmount = betPrizeData ? betPrizeData.prize : 0;
                }
              }

              if (prizeAmount > 0) {
                await supabase
                  .from("bets")
                  .update({
                    hit: true,
                    prize_amount: prizeAmount,
                    is_super_jackpot: false,
                    is_return_bet: false,
                  })
                  .eq("id", bet.id);
                processedResults.push({
                  ...bet,
                  hit: true,
                  prize_amount: prizeAmount,
                  is_super_jackpot: false,
                  is_return_bet: false,
                });
                continue;
              }
            } else if (gameType === "2D") {
              const date = new Date(`${resultDrawDate}T12:00:00+08:00`);
              const targetTimezone = "Asia/Manila";

              const monthNumericToday = new Intl.DateTimeFormat("en-US", {
                timeZone: targetTimezone,
                month: "numeric",
              }).format(date);
              const dayNumericToday = new Intl.DateTimeFormat("en-US", {
                timeZone: targetTimezone,
                day: "numeric",
              }).format(date);

              const dayNumericYesterday = new Intl.DateTimeFormat("en-US", {
                timeZone: targetTimezone,
                day: "numeric",
              }).format(new Date(date.getTime() - 24 * 60 * 60 * 1000)); // Subtract one day

              const dayNumericTomorrow = new Intl.DateTimeFormat("en-US", {
                timeZone: targetTimezone,
                day: "numeric",
              }).format(new Date(date.getTime() + 24 * 60 * 60 * 1000)); // Add one day

              const { data: settingsData } = await supabase
                .from("settings")
                .select("*");

              const twoDPetsadaIsActive =
                settingsData?.find(
                  (setting) => setting.name === "2d_petsada_prize_is_active",
                )?.value === "true";

              const twoDMonthlyBracketIsActive =
                settingsData?.find(
                  (setting) =>
                    setting.name === "2d_monthly_bracket_prize_is_active",
                )?.value === "true";

              const isPetsada =
                twoDPetsadaIsActive &&
                resultNumbers.includes(monthNumericToday) &&
                (resultNumbers.includes(dayNumericToday) ||
                  resultNumbers.includes(dayNumericTomorrow) ||
                  resultNumbers.includes(dayNumericYesterday));
              const isMonthlyBracket =
                twoDMonthlyBracketIsActive &&
                resultNumbers.includes(monthNumericToday);

              if (isPetsada) {
                const twoDPetsadaPrizePerTenStraight = Number(
                  settingsData?.find(
                    (setting) =>
                      setting.name === "2d_petsada_prize_per_ten_straight",
                  )?.value ?? 0,
                );

                const twoDPetsadaPrizePerTenRamble = Number(
                  settingsData?.find(
                    (setting) =>
                      setting.name === "2d_petsada_prize_per_ten_ramble",
                  )?.value ?? 0,
                );

                const prizeAmountPerTen =
                  betTypeCode?.toLowerCase() === "s"
                    ? twoDPetsadaPrizePerTenStraight
                    : betTypeCode?.toLowerCase() === "r"
                      ? twoDPetsadaPrizePerTenRamble
                      : 0;

                if (betTypeCode?.toLowerCase() === "s") {
                  const isStraightWinner =
                    betNumbers[0] === resultNumbers[0] &&
                    betNumbers[1] === resultNumbers[1];

                  if (isStraightWinner) {
                    prizeAmount =
                      Math.floor(bet.bet_amount / 10) * prizeAmountPerTen;
                  }
                } else if (betTypeCode?.toLowerCase() === "r") {
                  const isRambleWinner = checkIfRambolitoWinner(
                    betNumbers,
                    resultNumbers,
                  );
                  if (isRambleWinner) {
                    prizeAmount =
                      Math.floor(bet.bet_amount / 10) * prizeAmountPerTen;
                  }
                }
              } else if (isMonthlyBracket) {
                const twoDMonthlyBracketPrizePerTenStraight = Number(
                  settingsData?.find(
                    (setting) =>
                      setting.name ===
                      "2d_monthly_bracket_prize_per_ten_straight",
                  )?.value ?? 0,
                );

                const twoDMonthlyBracketPrizePerTenRamble = Number(
                  settingsData?.find(
                    (setting) =>
                      setting.name ===
                      "2d_monthly_bracket_prize_per_ten_ramble",
                  )?.value ?? 0,
                );

                const prizeAmountPerTen =
                  betTypeCode?.toLowerCase() === "s"
                    ? twoDMonthlyBracketPrizePerTenStraight
                    : betTypeCode?.toLowerCase() === "r"
                      ? twoDMonthlyBracketPrizePerTenRamble
                      : 0;

                if (betTypeCode?.toLowerCase() === "s") {
                  const isStraightWinner =
                    betNumbers[0] === resultNumbers[0] &&
                    betNumbers[1] === resultNumbers[1];

                  if (isStraightWinner) {
                    prizeAmount =
                      Math.floor(bet.bet_amount / 10) * prizeAmountPerTen;
                  }
                } else if (betTypeCode?.toLowerCase() === "r") {
                  const isRambleWinner = checkIfRambolitoWinner(
                    betNumbers,
                    resultNumbers,
                  );

                  if (isRambleWinner) {
                    prizeAmount =
                      Math.floor(bet.bet_amount / 10) * prizeAmountPerTen;
                  }
                }
              } else {
                if (betTypeCode?.toLowerCase() === "s") {
                  const twoDPompyangIsActive =
                    settingsData?.find(
                      (setting) => setting.name === "2d_pompyang_is_active",
                    )?.value === "true";

                  const isStraightWinner =
                    betNumbers[0] === resultNumbers[0] &&
                    betNumbers[1] === resultNumbers[1];

                  const isBetPompyang =
                    twoDPompyangIsActive &&
                    betNumbers[0] === betNumbers[1] &&
                    isStraightWinner;

                  if (isBetPompyang) {
                    const twoDPompyangPrizePerTen = Number(
                      settingsData?.find(
                        (setting) =>
                          setting.name === "2d_pompyang_prize_per_ten",
                      )?.value ?? 0,
                    );
                    prizeAmount =
                      Math.floor(bet.bet_amount / 10) * twoDPompyangPrizePerTen;
                  } else if (isStraightWinner) {
                    prizeAmount = betPrizeData ? betPrizeData.prize : 0;
                  }
                } else if (betTypeCode?.toLowerCase() === "r") {
                  const isRambolito = checkIfRambolitoWinner(
                    betNumbers,
                    resultNumbers,
                  );
                  if (isRambolito) {
                    prizeAmount = betPrizeData ? betPrizeData.prize : 0;
                  }
                }
              }

              if (prizeAmount > 0) {
                await supabase
                  .from("bets")
                  .update({
                    hit: true,
                    prize_amount: prizeAmount,
                    is_super_jackpot: false,
                    is_return_bet: false,
                  })
                  .eq("id", bet.id);
                processedResults.push({
                  ...bet,
                  hit: true,
                  prize_amount: prizeAmount,
                  is_super_jackpot: false,
                  is_return_bet: false,
                });
                continue;
              }
            }
            // If not a winner, do nothing
          }
        }
        console.log(
          `Processed bets: ${JSON.stringify(processedResults)} for resultId ${resultId}`,
        );

        // Insert log into draw_results_logs table
        const { error: logError } = await supabase
          .from("draw_results_logs")
          .insert([
            {
              draw_result_id: resultId,
              name: "PROCESS BETS",
              status: "FINISHED",
              created_by: createdBy,
            },
          ]);
        if (logError) {
          console.error("Error inserting draw results log:", logError);
        }

        // Archive the processed message
        const { error: archiveError } = await supabase
          .schema("pgmq_public")
          .rpc("archive", {
            queue_name: "process-bets-queue",
            message_id: msg.msg_id,
          });

        if (archiveError) {
          console.error(
            "Error archiving message:",
            archiveError,
            "Message ID:",
            msg.msg_id,
          );
        }
      } catch (err) {
        console.error("Failed to process message:", msg.msg_id, err);
      }
    }

    console.log("Finished processing batch of messages.");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
