import StockCard from "./StockCard";
import { Product }from "../types/inventory";
import { useEffect } from "react";

const ProductCard = ({product}:{product: Product}) => {
  // useEffect(()=>{
  //   console.log("from P card",product)
  // },[])
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {product.name}
        </h2>
        <p className="text-gray-600 line-clamp-2">
          {product.description || ""}
        </p>
      </div>
      <div className="p-6 space-y-3">
        <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Available Locations</p>
        <div className="grid gap-3">
          {product.stocks.map((stock) => (
            <StockCard
              inventoryId={stock.inventoryId}
              key={stock.inventoryId}
              warehouseName={stock.warehousename}
              stocks={stock.stocks}
              // onReservationComplete={onReservationComplete}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;