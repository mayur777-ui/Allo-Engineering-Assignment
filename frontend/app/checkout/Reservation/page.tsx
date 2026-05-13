"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/utility/axiosApi";
import { Reservation } from "@/types/inventory";
import { Alert } from "@/components/Alert";
import CountdownCell from "@/components/CountdownCell";

export default function ReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionStates, setActionStates] = useState<Record<string, "idle" | "loading" | "success" | "error">>({});
    const fetchReservations = async () => {
      try {
        setError(null);
        const response = await apiClient.get("/Reservation");
        setReservations(response.data.reservations || []);
      } catch (err: any) {
        console.error("Error fetching reservations:", err);
        setError(err?.response?.data?.message || "Failed to load reservations");
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      fetchReservations();
    }, []);
    const handleConfirm = async (reservationId: string) => {
      try {
        setActionStates((prev) => ({ ...prev, [reservationId]: "loading" }));
        setError(null);
        const response = await apiClient.post(`/reservations/${reservationId}/confirm`);
        setReservations((prev) =>
          prev.map((reservation) =>
            reservation.id === reservationId
              ? { ...reservation, status: response.data.reservation.status }
              : reservation
          )
        );
        setActionStates((prev) => ({ ...prev, [reservationId]: "success" }));
        setTimeout(() => {
          setActionStates((prev) => ({ ...prev, [reservationId]: "idle" }));
        }, 2000);
      } catch (err: any) {
        console.error("Error confirming reservation:", err);
        const errorMsg = err?.response?.data?.message || "Failed to confirm reservation";
        setError(errorMsg);
        setActionStates((prev) => ({ ...prev, [reservationId]: "error" }));
      }
    };
    const handleRelease = async (reservationId: string) => {
      try {
        setActionStates((prev) => ({ ...prev, [reservationId]: "loading" }));
        setError(null);
        const response = await apiClient.post(`/reservations/${reservationId}/release`);
        setReservations((prev) =>
          prev.map((reservation) =>
            reservation.id === reservationId
              ? { ...reservation, status: response.data.reservation.status }
              : reservation
          )
        );
        setActionStates((prev) => ({ ...prev, [reservationId]: "success" }));
        setTimeout(() => {
          setActionStates((prev) => ({ ...prev, [reservationId]: "idle" }));
        }, 2000);
      } catch (err: any) {
        console.error("Error releasing reservation:", err);
        const errorMsg = err?.response?.data?.message || "Failed to release reservation";
        setError(errorMsg);
        setActionStates((prev) => ({ ...prev, [reservationId]: "error" }));
      }
    };
    const getStatusColor = (status: string) => {
      switch (status) {
        case "CONFIRMED":
          return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200";
        case "PENDING":
          return "bg-blue-100 text-blue-800 ring-1 ring-blue-200";
        case "RELEASED":
          return "bg-rose-100 text-rose-800 ring-1 ring-rose-200";
        default:
          return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
      }
    };
    const isExpired = (expiresAt: string) => {
      return new Date(expiresAt) < new Date();
    };
    if (loading) {
      return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50 px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center">
            <div className="rounded-3xl border border-white/70 bg-white/85 px-8 py-12 text-center shadow-2xl shadow-slate-200/70 backdrop-blur">
              <div className="mx-auto mb-5 h-16 w-16 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              <h1 className="text-2xl font-bold text-slate-900">Loading reservations</h1>
              <p className="mt-2 text-sm text-slate-600">Fetching the latest checkout queue...</p>
            </div>
          </div>
        </main>
      );
    }
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
              <Alert type="error" message={error} onClose={() => setError(null)} />
            </div>
          )}
          {reservations.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 px-6 py-20 text-center shadow-sm backdrop-blur">
              <h2 className="text-2xl font-bold text-slate-900">No reservations yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                Your checkout queue is empty. Once customers reserve stock, their reservations will appear here.
              </p>
              <button onClick={() => router.push("/")} className="mt-6 inline-flex items-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Browse products</button></div>
          ):(
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                        Reservation
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                        Inventory
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                        Quantity
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                        Created
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                        Countdown
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                        Expired
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {reservations.map((reservation) => {
                      const state = actionStates[reservation.id] || "idle";
                      const isPending = reservation.status === "PENDING";
                      return (
                        <tr key={reservation.id} className="group transition-colors hover:bg-slate-50/80">
                          <td className="px-6 py-5">
                            <div className="font-mono text-sm font-semibold text-slate-700">
                              {reservation.id.substring(0, 8)}...
                            </div>
                            <div className="mt-1 text-xs text-slate-400">Reservation ID</div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-mono text-sm text-slate-700">
                              {reservation.inventoryId.substring(0, 8)}...
                            </div>
                            <div className="mt-1 text-xs text-slate-400">Inventory reference</div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-900">
                              {reservation.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(reservation.status)}`}>
                              {reservation.status}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-sm text-slate-600">
                            {new Date(reservation.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-5">
                            {reservation.status === "PENDING" ? (
                              <CountdownCell expiresAt={reservation.expiresAt} status={reservation.status} />
                            ) : (
                              <span className="text-sm text-slate-500">
                                {new Date(reservation.expiresAt).toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            {isExpired(reservation.expiresAt) ? (
                              <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                                Yes ✕
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                No ✓
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            {isPending ? (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleConfirm(reservation.id)}
                                  disabled={state === "loading"}
                                  className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                                    state === "loading"
                                      ? "cursor-wait bg-blue-400 text-white"
                                      : state === "success"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg"
                                  }`}
                                >
                                  {state === "loading" ? "Confirming..." : state === "success" ? "✓ Confirmed" : "Confirm"}
                                </button>
                                <button
                                  onClick={() => handleRelease(reservation.id)}
                                  disabled={state === "loading"}
                                  className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                                    state === "loading"
                                      ? "cursor-wait bg-rose-400 text-white"
                                      : state === "success"
                                      ? "bg-rose-100 text-rose-800"
                                      : "bg-rose-600 text-white hover:bg-rose-700 hover:shadow-lg"
                                  }`}
                                >
                                  {state === "loading" ? "Releasing..." : state === "success" ? "✕ Released" : "Release"}
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-slate-500 italic">
                                {reservation.status === "CONFIRMED" ? "Already confirmed" : "Released"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
        </div>
      </main>
    );
  }
