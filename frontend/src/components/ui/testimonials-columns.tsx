"use client";
import React from "react";
import { motion } from "framer-motion";

export type Testimonial = {
  text: string;
  image: string;
  name: string;
  role: string;
};

export function TestimonialsColumn({
  className,
  testimonials,
  duration = 10,
}: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) {
  return (
    <div className={className}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-5 pb-5"
      >
        {[...Array(2)].map((_, colIndex) => (
          <React.Fragment key={colIndex}>
            {testimonials.map(({ text, image, name, role }, i) => (
              <div
                key={i}
                className="p-7 rounded-2xl border border-gray-200 bg-white max-w-xs w-full flex flex-col"
                style={{ boxShadow: "0 4px 24px rgba(15,26,20,0.05)" }}
              >
                <p className="font-serif text-[26px] text-ink-5/40 leading-none mb-3 select-none">
                  &ldquo;
                </p>
                <p className="text-[14px] text-ink-2 leading-[1.72] font-light italic flex-1">
                  {text}
                </p>
                <div className="flex items-center gap-3 mt-5 pt-5 border-t border-gray-100">
                  <img
                    src={image}
                    alt={name}
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                  <div>
                    <p className="text-[13px] font-semibold text-ink leading-tight">
                      {name}
                    </p>
                    <p className="text-[12px] text-ink-4">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
}
