"use client";
import axios from "axios";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Cart,
  ProductCategory,
  ProductFlavor,
  setCart,
  setIsLoading,
  setIsLoginDialoagOpen,
  setProductCategory,
  setProductFlavor,
  setProducts,
  setAddress,
} from "@/utils/DataSlice";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

import { usePathname, useRouter } from "next/navigation";
import { ShoppingCart, User, QrCode } from "lucide-react";
import DialogCompo from "@/app/component/comman/DialogCompo";
import Login from "./Login";
import { RootState } from "@/utils/store";
import useUserData from "@/hooks/useUserData";
import { useSignOut } from "@/hooks/SignOutHandler";

function Navbar() {
  const pathname = usePathname();
  const navigation = useRouter();
  const signOutHandler = useSignOut();

  const dispatch = useDispatch();
  const { status } = useUserData();

  const isLoginDialogOpen = useSelector(
    (state: RootState) => state.dataSlice.isLoginDialoagOpen
  );
  const userInfo = useSelector((state: RootState) => state.dataSlice.userInfo);
  const cart = useSelector((state: RootState) => state.dataSlice.cart);

  useEffect(() => {
    if (status === "unauthenticated" && userInfo.id) {
      signOutHandler();
    }
  }, [status, userInfo.id]);

  useEffect(() => {
    const fetchData = async () => {
      dispatch(setIsLoading(true));
      try {
        await Promise.all([
          getProductFlavour(),
          getPrductCategory(),
          getProducts(),
        ]);
      } catch (e: any) {
        console.log("Error is fetching data " + e.message);
      } finally {
        dispatch(setIsLoading(false));
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!userInfo.id) return;
    const controller = new AbortController();
    let isMounted = true; // Track mount status

    const fetchData = async () => {
      dispatch(setIsLoading(true));
      try {
        await Promise.all([getCart(controller), getAddress(controller)]);
      } catch (e: any) {
        // Only log if it's not a cancellation
        if (!axios.isCancel(e)) {
          console.log("Error fetching data: " + e.message);
        }
      } finally {
        // Only update state if component is still mounted
        if (isMounted) {
          dispatch(setIsLoading(false));
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [userInfo.id]);

  useEffect(() => {
    if (userInfo.role === "ADMIN") {
      navigation.push("/dashboard");
    }
  }, [userInfo.id]);

  const getCart = async (controller: AbortController) => {
    if (!userInfo.id) return;

    try {
      const res = await axios.get(`/api/cart/getCart?userId=${userInfo.id}`, {
        signal: controller.signal,
      });
      const { success, data, message } = res.data;

      if (success) {
        dispatch(setCart(data));
      } else {
        dispatch(setCart({} as Cart));
      }
    } catch (error) {
      // Don't update state if request was cancelled
      if (!axios.isCancel(error)) {
        console.error("Failed to fetch cart:", error);
        dispatch(setCart({} as Cart));
      }
    }
  };

  const getAddress = async (controller: AbortController) => {
    if (!userInfo.id) return;

    try {
      const addressRes = await axios.get(
        `/api/address/getAddress?userId=${userInfo.id}`,
        {
          signal: controller.signal,
        }
      );

      dispatch(setAddress(addressRes.data.address));
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log("Request canceled:", err.message);
      } else {
        console.error("Error fetching address:", err);
        // Optionally reset address state on error
        // dispatch(setAddress(null));
      }
    }
  };

  const getPrductCategory = async () => {
    const res = await axios.get("/api/Products/get-category");
    const { productCategorys } = res.data;
    dispatch(setProductCategory(productCategorys as ProductCategory[]));
  };
  const getProductFlavour = async () => {
    const res = await axios.get("/api/Products/get-flavor");
    const { productFlavors } = res.data;
    dispatch(setProductFlavor(productFlavors as ProductFlavor[]));
  };

  const getProducts = async () => {
    const res = await axios.get("/api/Products/get-products");
    const { products } = res.data;
    dispatch(setProducts(products));
  };

  return (
    <header className="border-b sticky top-0 z-50 bg-white">
      <div className="px-2 py-3 flex items-center justify-between">
        {/* ---------- LOGO ---------- */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.svg"
            alt="Warr Nutrition"
            width={120}
            height={50}
            className="object-contain"
            priority
          />
        </Link>
        {pathname !== "/terms-conditon" && pathname !== "/about" && (
          <>
            {/* Search */}
            {/* <div className="hidden md:flex items-center flex-1 max-w-xl mx-6">
              <SearchDropdown />
            </div> */}

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Link
                href="https://verify.warrnutrition.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                <QrCode className="flex" />
              </Link>
              {(status === "authenticated" || userInfo.id) && (
                <>
                  <Link
                    href="/account"
                    className="flex items-center gap-1"
                    onClick={() => navigation.push("/account")}
                  >
                    <User className="h-5 w-5" />
                    <span className="hidden md:block text-sm">Account</span>
                  </Link>
                  <Link
                    href="/cart"
                    className="flex items-center gap-1 relative"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span className="hidden md:inline text-sm">Cart</span>
                    <Badge className="absolute -top-2 -right-2 bg-rose-800 text-white text-xs h-5 w-5 flex items-center justify-center rounded-full">
                      {/* checking cart is empty or not */}
                      {Array.isArray(cart?.cartItems) &&
                      cart.cartItems.length > 0
                        ? cart.cartItems.length
                        : 0}
                    </Badge>
                  </Link>
                </>
              )}

              {status !== "authenticated" && !userInfo.id && (
                <Button
                  className="bg-gradient-to-br from-[#B50D27] to-[#DA203A] text-white px-6 py-2 rounded-md shadow-md hover:opacity-90 transition"
                  onClick={() =>
                    dispatch(setIsLoginDialoagOpen(!isLoginDialogOpen))
                  }
                >
                  Login
                </Button>
              )}
            </div>
          </>
        )}
      </div>
      <DialogCompo
        isOpen={isLoginDialogOpen}
        onOpenChange={() => dispatch(setIsLoginDialoagOpen(!isLoginDialogOpen))}
      >
        <Login />
      </DialogCompo>
    </header>
  );
}

export default Navbar;
