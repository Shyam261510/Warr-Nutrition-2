import { Input } from "@/components/ui/input";
import React, { useEffect } from "react";

import { CustomToast } from "@/app/component/comman/customToast";
import { PromoCodeInfoType, PROMO_CODES_INFO } from "@/constant/PromoCode";
interface PromoCodeCompoProps {
  promoCode: string;
  setPromoCode: React.Dispatch<React.SetStateAction<string>>;
  promoApplied: PromoCodeInfoType;
  setPromoApplied: React.Dispatch<React.SetStateAction<PromoCodeInfoType>>;
}

function PromoCodeCompo({
  promoCode,
  setPromoCode,
  promoApplied,
  setPromoApplied,
}: PromoCodeCompoProps) {
  // Cleaning the promoApplied state beacuse if the use not add the promo code then and PromoApplied state has data then this cause problem so, we have to clean the state
  useEffect(() => {
    if (promoCode.length !== 7 && promoApplied.discount !== 0) {
      setPromoApplied({ code: "", discount: 0 });
    }
  }, [promoCode]);
  function applyPromoCode() {
    const selectedPromoCode = PROMO_CODES_INFO.find(
      (item) => item.code === promoCode
    );

    if (selectedPromoCode) {
      setPromoApplied(selectedPromoCode);
    } else {
      CustomToast({ type: "error", message: "Invalid Promo Code" });
    }
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
      <Input
        placeholder="Promo code"
        value={promoCode}
        onChange={(e) =>
          setPromoCode(String(e.target.value).toLocaleUpperCase())
        }
        className="
          h-10
          border-rose-300
          bg-white
          text-rose-900
          placeholder:text-rose-400
          focus-visible:ring-1
          focus-visible:ring-rose-400
          font-bold
        "
      />

      <button
        className="
    h-10
    px-4
    rounded-md
    bg-rose-500
    text-white
    text-sm
    font-medium
    transition
    hover:bg-rose-600
    active:scale-95
    disabled:bg-rose-300
    disabled:cursor-not-allowed
    disabled:active:scale-100
  "
        disabled={promoCode.length < 7}
        onClick={applyPromoCode}
      >
        Apply
      </button>
    </div>
  );
}

export default PromoCodeCompo;
