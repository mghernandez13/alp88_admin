import { AnimatePresence, motion } from "framer-motion";
import type { ModalProps } from "../../../types/generic";
import { X } from "lucide-react";
import Label from "../../generic/Label";
import Input from "../../generic/Input";
import { useEffect, useState } from "react";
import type {
  GetLottoTypeQueryVariables,
  LottoQueryData,
} from "../../../types/api";
import { GET_LOTTO_TYPE } from "../../../graphql/queries/lotto";
import { useQuery } from "@apollo/client/react";
import { formatTo12h } from "../../../utils/helper";
import { DAYS_OF_WEEK } from "../../../types/constants";

interface ViewLottoTypeModalProps extends ModalProps {
  lottoTypeId: string;
}

const ViewLottoTypeModal: React.FC<ViewLottoTypeModalProps> = (props) => {
  const { isOpen, onClose, lottoTypeId } = props;

  const { data, loading } = useQuery<
    LottoQueryData,
    GetLottoTypeQueryVariables
  >(GET_LOTTO_TYPE, {
    variables: {
      lottoTypeId: String(lottoTypeId),
    },
  });

  const [formData, setFormData] = useState({
    gameType: "",
    drawTime: "",
    name: "",
    daysActive: [] as string[],
    isActive: false,
    numberOfDigits: 0,
    minNumber: 0,
    maxNumber: 0,
    logoImage: "",
  });

  useEffect(() => {
    const node = data?.lotto_typesCollection?.edges?.[0]?.node;
    if (node) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        gameType: String(node.game_type || ""),
        drawTime: node.draw_time ? formatTo12h(node.draw_time) : "",
        name: String(node.name || ""),
        daysActive: node.days_active ? node.days_active : [],
        isActive: Boolean(node.is_active),
        numberOfDigits: Number(node.number_of_digits || 0),
        minNumber: Number(node.min_number || 0),
        maxNumber: Number(node.max_number || 0),
        logoImage: String(node.logo_image || ""),
      });
    }
  }, [data]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
              mass: 0.8,
            }}
            className="relative bg-white dark:bg-black border border-gray-200 dark:border-gray-700 w-full max-w-2xl p-8 rounded-lg shadow-2xl z-[70]"
          >
            <div>
              <button
                onClick={onClose}
                className="absolute bg-transparent top-4 right-4 text-gray-900 dark:text-white hover:border-none hover:text-gray-600"
              >
                <X size={20} />
              </button>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Lotto Type Details
              </h2>

              <div className="flex flex-col gap-6">
                <div className="flex w-full justify-center gap-5">
                  {!loading && (
                    <img
                      src={
                        formData.logoImage ||
                        "https://lnnpmtjuzgrcdtusfrty.supabase.co/storage/v1/object/public/app/images/noPicture.png"
                      }
                      alt="Lotto Logo"
                      className="w-24 h-24 object-contain"
                    />
                  )}
                </div>
                <div className="flex w-full gap-5">
                  <div className="flex flex-col gap-2 w-full md:w-1/2">
                    <Label>Game Type</Label>
                    <Input
                      type="text"
                      name="gameType"
                      disabled={true}
                      value={formData.gameType}
                      placeholder="e.g., 2D, 3D"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2 w-full md:w-1/2">
                    <Label>Name</Label>
                    <Input
                      type="text"
                      name="name"
                      disabled={true}
                      value={formData.name}
                      placeholder="Lotto type name"
                      required
                    />
                  </div>
                </div>

                <div className="flex w-full gap-5">
                  <div className="flex flex-col gap-2 w-full md:w-1/2">
                    <Label>Draw Time</Label>
                    <Input
                      type="text"
                      name="drawTime"
                      disabled={true}
                      value={formData.drawTime}
                      placeholder="12:00 AM"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2 w-full md:w-1/2">
                    <Label>Active</Label>
                    <div className="flex items-center h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#16191d] px-3">
                      <span className="text-gray-900 dark:text-white">
                        {formData.isActive ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex w-full gap-5">
                  <div className="flex flex-col gap-2 w-full md:w-1/2">
                    <Label># of Digits</Label>
                    <Input
                      type="text"
                      name="numberOfDigits"
                      disabled={true}
                      value={formData.numberOfDigits}
                      placeholder="2"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2 w-full md:w-1/2">
                    <Label>Min #</Label>
                    <Input
                      type="text"
                      name="minNumber"
                      disabled={true}
                      value={formData.minNumber}
                      placeholder="01"
                      required
                    />
                  </div>
                </div>

                <div className="flex w-full gap-5">
                  <div className="flex flex-col gap-2 w-full md:w-1/2">
                    <Label>Max #</Label>
                    <Input
                      type="text"
                      name="maxNumber"
                      disabled={true}
                      value={formData.maxNumber}
                      placeholder="99"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2 w-full md:w-1/2">
                    <Label>Days Active</Label>
                    <div className="grid grid-cols-3 gap-2 p-2 bg-gray-50 dark:bg-[#16191d] border border-gray-300 dark:border-gray-600 rounded-md">
                      {DAYS_OF_WEEK.map((day) => (
                        <div key={day} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.daysActive?.includes(day)}
                            disabled={true}
                            className="w-4 h-4 text-yellow-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded"
                          />
                          <label className="ml-2 text-xs text-gray-700 dark:text-gray-300">
                            {day.substring(0, 3)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ViewLottoTypeModal;
