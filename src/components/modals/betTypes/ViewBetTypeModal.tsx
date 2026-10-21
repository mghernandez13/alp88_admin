import { AnimatePresence, motion } from "framer-motion";
import type { ModalProps } from "../../../types/generic";
import { Check, X } from "lucide-react";
import Label from "../../generic/Label";
import Input from "../../generic/Input";
import { useEffect, useState } from "react";
import type {
  BetTypesQueryData,
  GetBetTypeQueryVariables,
} from "../../../types/api";
import { GET_BET_TYPE } from "../../../graphql/queries/betTypes";
import { useQuery } from "@apollo/client/react";
import { formatTo12h } from "../../../utils/helper";

interface ViewBetTypeModalProps extends ModalProps {
  betTypeId: string;
}

const ViewBetTypeModal: React.FC<ViewBetTypeModalProps> = ({
  isOpen,
  onClose,
  betTypeId,
}) => {
  const { data } = useQuery<BetTypesQueryData, GetBetTypeQueryVariables>(
    GET_BET_TYPE,
    {
      variables: { betTypeId: String(betTypeId) },
    },
  );

  const [formData, setFormData] = useState({
    gameType: "",
    drawTime: "",
    name: "",
    code: "",
    isActive: false,
  });

  useEffect(() => {
    const node = data?.bet_typesCollection?.edges?.[0]?.node;
    if (node) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        gameType: String(node.game_type || ""),
        drawTime: node.draw_time ? formatTo12h(node.draw_time) : "",
        name: String(node.name || ""),
        code: String(node.code || ""),
        isActive: Boolean(node.is_active),
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
            className="relative bg-white dark:bg-black border border-gray-200 dark:border-gray-700 w-full max-w-md p-8 rounded-lg shadow-2xl z-[70]"
          >
            <button
              onClick={onClose}
              className="absolute bg-transparent top-4 right-4 text-gray-900 dark:text-white hover:border-none hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Bet Type Details
            </h2>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2 w-full">
                <Label>Game Type</Label>
                <Input
                  type="text"
                  name="gameType"
                  disabled={true}
                  value={formData.gameType}
                  required
                />
              </div>

              {/* <div className="flex flex-col gap-2 w-full">
                <Label>Draw Time</Label>
                <Input
                  type="text"
                  name="drawTime"
                  disabled={true}
                  value={formData.drawTime}
                  required
                />
              </div> */}

              <div className="flex flex-col gap-2 w-full">
                <Label>Name</Label>
                <Input
                  type="text"
                  name="name"
                  disabled={true}
                  value={formData.name}
                  required
                />
              </div>

              <div className="flex flex-col gap-2 w-full">
                <Label>Code</Label>
                <Input
                  type="text"
                  name="code"
                  disabled={true}
                  value={formData.code}
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-700 dark:text-gray-300">
                  Is Active:
                </span>
                <span className="text-gray-900 dark:text-white">
                  {formData.isActive ? (
                    <div className="flex items-center">
                      <div className="w-5 h-5 rounded-full border-2 border-yellow-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-yellow-500" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <div className="w-5 h-5 rounded-full border-2 border-red-500 flex items-center justify-center">
                        <X className="w-3 h-3 text-red-500" />
                      </div>
                    </div>
                  )}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ViewBetTypeModal;
