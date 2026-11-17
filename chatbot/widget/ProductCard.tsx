"use client";

import React from "react";
import Link from "next/link";
import { ProductCardData } from "./types";

interface ProductCardProps {
  product: ProductCardData;
}

export function ProductCard({ product }: ProductCardProps) {
  const previewUrl = `/listings/${product.id}/preview`;

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow text-slate-900 w-full max-w-[240px] shrink-0">
      {/* Image container */}
      <div className="relative h-28 w-full bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-100">
        {product.photo ? (
          <img
            src={product.photo}
            alt={product.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              // Fallback to placeholder SVG icon if image fails
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <span className="text-3xl">🛍️</span>
        )}
        <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full shadow">
          In Stock
        </span>
      </div>

      {/* Info container */}
      <div className="p-3 flex flex-col flex-1 justify-between">
        <div>
          <h4 className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">
            {product.name}
          </h4>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{product.sku}</p>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-indigo-600">
              ₹{product.price.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] text-slate-400 block -mt-0.5">/ piece</span>
          </div>

          <Link
            href={previewUrl}
            target="_blank"
            className="text-[11px] font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-md transition-colors shadow-sm"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
