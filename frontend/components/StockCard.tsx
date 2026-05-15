import { apiClient } from "@/utility/axiosApi";
import { useState,useEffect } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "./Alert";


const StockCard = ({inventoryId,warehouseName,stocks}:{
  warehouseName: string;
  stocks: number;
  inventoryId: string;
})=>{
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleReserve = async () => {
    setError(null);
    try {
      setLoading(true);
      if (quantity > stocks) {
        setError(`Cannot reserve more than available stock (${stocks} available)`);
        return;
      }
      if (quantity <= 0) {
        setError("Quantity must be at least 1");
        return;
      }
      const response = await apiClient.post("/reservations", {
        inventoryId,
        quantity,
      });
      if (response.data?.reservation?.id) {
        router.push(`/reservation/${response.data.reservation.id}`);
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Reservation failed. Please try again.";
      if (error?.response?.status === 409) {
        setError("Not enough stock available. Another customer may have reserved it.");
      } else if (error?.response?.status === 404) {
        setError("Inventory not found.");
      } else {
        setError(errorMessage);
      }
      console.error("Reservation error:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-5">
      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} />
      )}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg text-gray-900">
            {warehouseName}
          </h3>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold bg-green-300/50`}
          >
            {stocks} available
          </span>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <div className="flex items-center gap-2 bg-white border-2 border-gray-300 rounded-lg px-3 py-2">
          <span className="text-sm text-gray-600 font-medium">Qty:</span>
          <input type="number" min={1} max={stocks}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(stocks, Number(e.target.value))))}
            disabled={loading || stocks === 0}
            className="border-0 w-14 text-center font-semibold text-lg focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        <button
          onClick={handleReserve}
          disabled={loading || stocks === 0}
          className={`flex-1 font-semibold px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm md:text-base ${
            loading
              ? "bg-blue-400 text-white cursor-wait"
              : stocks === 0
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-md active:scale-95"
          }`}
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Reserving...
            </>
          ) : stocks === 0 ? (
            "Out of Stock"
          ) : (
            <>
              🛒 Reserve
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default StockCard;
