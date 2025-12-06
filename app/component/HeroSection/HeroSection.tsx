"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

const slides = [
  {
    desktop:
      "https://ik.imagekit.io/fcuhugcgk/banner_2_dek.png?updatedAt=1761758522855",
    mobile:
      "https://ik.imagekit.io/fcuhugcgk/banner_1_mobile.png?updatedAt=1761758553357",
  },
  {
    desktop:
      "https://ik.imagekit.io/fcuhugcgk/Banner_1_desk.png?updatedAt=1761758523735",
    mobile:
      "https://ik.imagekit.io/fcuhugcgk/banner_2_mobile.png?updatedAt=1762674906333",
  },
  {
    desktop:
      "https://ik.imagekit.io/fcuhugcgk/banner_3.png?updatedAt=1762676066800",
    mobile:
      "https://ik.imagekit.io/fcuhugcgk/banner_3_mobile.png?updatedAt=1762676294754",
  },
];

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="w-full bg-black text-white ">
      <div className="relative overflow-hidden w-full">
        {/* Main slider container */}
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <div key={index} className="w-full flex-shrink-0 relative">
              {/* Desktop Image */}
              <div className="relative hidden md:block w-full min-h-[400px] max-h-[600px]">
                <Image
                  src={slide.desktop}
                  alt={`Desktop slide ${index + 1}`}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
              </div>

              {/* Mobile Image */}
              <div className="relative block md:hidden w-full min-h-[210px] max-h-[400px]">
                <Image
                  src={slide.mobile}
                  alt={`Mobile slide ${index + 1}`}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full"
          onClick={prevSlide}
        >
          <ChevronLeft className="h-6 w-6" />
          <span className="sr-only">Previous slide</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full"
          onClick={nextSlide}
        >
          <ChevronRight className="h-6 w-6" />
          <span className="sr-only">Next slide</span>
        </Button>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`w-2.5 h-2.5 rounded-full ${
                index === currentSlide ? "bg-rose-500" : "bg-white/40"
              }`}
              onClick={() => setCurrentSlide(index)}
            >
              <span className="sr-only">Go to slide {index + 1}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
