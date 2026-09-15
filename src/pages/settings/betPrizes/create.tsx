import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Headline from "../../../components/generic/Headline";
import AdminTemplate from "../../../templates/AdminTemplate";
import { ArrowLeft } from "lucide-react";
import { useMutation } from "@apollo/client/react";
import { CREATE_BET_PRIZE } from "../../../graphql/queries/betPrizes";
import Swal from "sweetalert2";
import BetPrizeForm, {
  type BetPrizeFormData,
  type LottoTypeOption,
} from "../../../components/forms/BetPrizeForm";
import { supabase } from "../../../db/supabase";
import { useEffect } from "react";
import { useCheckUserPermissions } from "../../../hooks/useCheckUserPermission";
import BackButton from "../../../components/generic/buttons/BackButton";

type LottoTypeSupabaseRow = {
  id: string | number;
  name: string;
  game_type: string;
  draw_time: string;
};

const CreateBetPrizePage: React.FC = () => {
  useCheckUserPermissions("Add Bet Prizes");

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [lottoTypes, setLottoTypes] = useState<LottoTypeOption[]>([]);
  const [formData, setFormData] = useState<BetPrizeFormData>({
    lottoTypeId: "",
    betTypeId: "",
    betAmount: "",
    prize: "",
    isActive: true,
  });

  useEffect(() => {
    const fetchLottoTypes = async () => {
      const { data } = await supabase
        .from("lotto_types")
        .select("id, name, game_type, draw_time")
        .eq("is_archive", false)
        .order("name", { ascending: true, nullsFirst: true });

      setLottoTypes(
        ((data ?? []) as LottoTypeSupabaseRow[]).map((item) => ({
          id: String(item.id),
          name: item.name,
          gameType: item.game_type,
          drawTime: item.draw_time,
        })),
      );
    };

    void fetchLottoTypes();
  }, []);

  const [createBetPrize] = useMutation(CREATE_BET_PRIZE);

  const numericFields = ["betAmount", "prize"];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;

    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: target.checked }));
      return;
    }

    if (numericFields.includes(name)) {
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
      return;
    }

    if (name === "lottoTypeId") {
      setFormData((prev) => ({ ...prev, lottoTypeId: value, betTypeId: "" }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createBetPrize({
        variables: {
          lottoTypeId: formData.lottoTypeId,
          ...(formData.betTypeId && { betTypeId: formData.betTypeId }),
          betAmount: Number(formData.betAmount),
          prize: Number(formData.prize),
          superJackpot: formData.super_jackpot,
          superJackpotMultiplier: Number(formData.super_jackpot_multiplier),
          isActive: formData.isActive,
        },
      });
      Swal.fire({
        icon: "success",
        title: "Create Bet Prize",
        text: "Bet prize successfully added!",
      });
      navigate("/settings/bet-prizes");
    } catch (err: Error | unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      Swal.fire({
        icon: "error",
        title: "Create Bet Prize",
        text: `Error occurred: ${errorMessage}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminTemplate>
      <div className="flex-col w-full px-4 sm:mx-2 md:mx-10 py-6">
        <div className="flex items-center gap-4 mb-8">
          <BackButton onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </BackButton>
          <Headline>Create Bet Prize</Headline>
        </div>
        <BetPrizeForm
          formData={formData}
          lottoTypes={lottoTypes}
          onChange={handleChange}
          onSubmit={handleSubmit}
          loading={loading}
          onCancel={() => navigate(-1)}
        />
      </div>
    </AdminTemplate>
  );
};

export default CreateBetPrizePage;
