"use client";
import { useEffect, useState } from "react";
import { apiClient } from "@/utility/axiosApi";
import ProductCard from "@/components/ProductCard";
import { Product } from "../types/inventory";
import { Alert } from "@/components/Alert";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchProducts = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await apiClient.get("/products");
      console.log(response.data);
      setProducts(response.data.products || []); 
    } catch (error: any) {
      console.error("Error fetching products:", error);
      setError(error?.response?.data?.message||error?.message||"Failed to load products");
      setProducts([]); 
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchProducts();
  }, []); 
  const handleReservationComplete = () => {
    fetchProducts(); 
  };
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading products...</p>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Inventory Reservation System
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Reserve products securely with real-time stock protection
            </p>
          </div>
          <a href="/checkout/Reservation" className="bg-black hover:bg-gray-800 text-white px-5 py-3 rounded-xl font-medium transition-all">View Reservations</a>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-10">
        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => setError(null)}
          />
        )}
        {products.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-20 text-center border border-gray-200">
            <div className="text-6xl mb-5">📭</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No Products Available
            </h2>
            <p className="text-gray-500">
              Products will appear here once inventory is added.
            </p>
          </div>):(
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onReservationComplete={handleReservationComplete}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}