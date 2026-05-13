"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/utility/axiosApi";
import { Reservation } from "@/types/inventory";
import { useCountdown } from "@/hooks/useCountdown";
import { Alert } from "@/components/Alert";
interface ReservationPageProps {
  params: Promise<{
    id: string;
  }>;
}

type ActionStatus = "idle" | "loading" | "success" | "error";

export default function ReservationPage({
  params,
}: ReservationPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<ActionStatus>("idle");
  const [releaseStatus, setReleaseStatus] = useState<ActionStatus>("idle");

  const countdown = useCountdown(reservation?.expiresAt || "");

  useEffect(() => {
    const fetchReservation = async () => {
      try {
        setError(null);
        const response = await apiClient.get(`/reservations/${id}`);
        setReservation(response.data.reservation);
      } catch (err: any) {
        console.error("Error fetching reservation:", err);
        const errorMsg =
          err?.response?.data?.message ||
          "Failed to load reservation details";
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchReservation();
    }
  }, [id]);

  const handleConfirmPurchase = async () => {
    try {
      setConfirmStatus("loading");
      setError(null);

      const response = await apiClient.post(
        `/reservations/${id}/confirm`
      );

      setReservation(response.data.reservation);
      setConfirmStatus("success");
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: any) {
      console.error("Error confirming reservation:", err);
      if (err?.response?.status === 410) {
        setError("⏱️ Reservation has expired. Please create a new one.");
        setConfirmStatus("error");
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else if (err?.response?.status === 400) {
        setError(
          "This reservation has already been processed or cannot be confirmed."
        );
        setConfirmStatus("error");
      } else {
        const errorMsg =
          err?.response?.data?.message ||
          "Failed to confirm reservation";
        setError(errorMsg);
        setConfirmStatus("error");
      }
    }
  };
  const handleCancel = async () => {
    try {
      setReleaseStatus("loading");
      setError(null);
      const response = await apiClient.post(`/reservations/${id}/release`);
      setReservation(response.data.reservation);
      setReleaseStatus("success");
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: any) {
      console.error("Error releasing reservation:", err);
      if (err?.response?.status === 400) {
        setError("This reservation has already been processed.");
        setReleaseStatus("error");
      } else {
        const errorMsg =
          err?.response?.data?.message ||
          "Failed to cancel reservation";
        setError(errorMsg);
        setReleaseStatus("error");
      }
    }
  };
  if (loading) {
    return (
      <main className="p-10 max-w-2xl mx-auto">
        <div className="text-center py-20">
          <p className="text-lg text-gray-600">Loading reservation details...</p>
        </div>
      </main>
    );
  }
  if (!reservation) {
    return (
      <main className="p-10 max-w-2xl mx-auto">
        <div className="mb-4">
          <button
            onClick={() => router.push("/")}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Products
          </button>
        </div>
        <Alert
          type="error"
          message={error || "Reservation not found"}
          onClose={() => setError(null)}
        />
      </main>
    );
  }
  const isExpired = countdown.isExpired || reservation.status !== "PENDING";
  const isConfirmed = reservation.status === "CONFIRMED";
  const isReleased = reservation.status === "RELEASED";
  return (
    <main className="p-10 max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.push("/")}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Products
        </button>
      </div>
      <div className="border rounded-xl p-8 space-y-6 bg-white shadow-sm">
        <div>
          <h1 className="text-3xl font-bold mb-2">Order Checkout</h1>
          <p className="text-gray-500">
            Reservation ID:{" "}
            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
              {reservation.id}
            </span>
          </p>
        </div>
        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => setError(null)}
          />
        )}
        {isConfirmed && (
          <Alert
            type="success"
            message="✓ Purchase confirmed successfully! Redirecting to home page..."
          />
        )}
        {isReleased && (
          <Alert
            type="info"
            message="Reservation released. Redirecting to home page..."
          />
        )}
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600 text-sm font-medium">Product</p>
              <p className="text-lg font-semibold">
                {reservation.inventory?.product?.name || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm font-medium">Warehouse</p>
              <p className="text-lg font-semibold">
                {reservation.inventory?.warehouse?.name || "N/A"}
              </p>
            </div>
          </div>
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 text-sm font-medium">Quantity</p>
                <p className="text-lg font-semibold">{reservation.quantity}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium">Status</p>
                <p
                  className={`text-lg font-semibold ${
                    isConfirmed
                      ? "text-green-600"
                      : isReleased
                      ? "text-red-600"
                      : "text-blue-600"
                  }`}
                >
                  {reservation.status}
                </p>
              </div>
            </div>
          </div>
        </div>
        {!isConfirmed && !isReleased && (
          <>
            <div
              className={`rounded-lg p-6 border-2 text-center ${ isExpired? "border-red-300 bg-red-50": "border-blue-300 bg-blue-50"}`}>
              <p
                className={`text-sm font-medium mb-2 ${
                  isExpired ? "text-red-700": "text-blue-700"
                }`}>
                {isExpired? " RESERVATION EXPIRED": "⏱️ Time Remaining"}
              </p>
              <p className={`text-4xl font-bold ${
                  isExpired ? "text-red-600" : "text-blue-600"}`}>{countdown.timeString}
              </p>
              {isExpired && (
                <p className="text-sm text-red-600 mt-2">
                  Your reservation has expired. Please create a new one.
                </p>
              )}
            </div>
          </>
        )}
        {!isConfirmed && !isReleased && (
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleConfirmPurchase}
              disabled={isExpired || confirmStatus === "loading"}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                isExpired
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : confirmStatus === "loading"
                  ? "bg-blue-400 text-white cursor-wait"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {confirmStatus === "loading" ? "Processing..." : "Confirm Purchase"}
            </button>
            <button
              onClick={handleCancel}
              disabled={releaseStatus === "loading"}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold border-2 transition-colors ${
                releaseStatus === "loading"
                  ? "border-gray-300 text-gray-600 cursor-wait"
                  : "border-red-600 text-red-600 hover:bg-red-50"
              }`}
            >
              {releaseStatus === "loading" ? "Cancelling..." : "Cancel"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
