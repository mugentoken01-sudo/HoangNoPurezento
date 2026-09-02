"use client";
import React from "react";

export function Card({
  children,
  className = "",
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius-card,0.625rem)] border border-[#dfd8c8] bg-[#ffffff] shadow-[0_10px_30px_-15px_rgba(24,38,21,0.08),0_1px_3px_rgba(24,38,21,0.04)] ${
        interactive
          ? "transition-all duration-200 hover:border-[#bcc6b1] hover:shadow-[0_14px_34px_-18px_rgba(24,38,21,0.14),0_2px_4px_rgba(24,38,21,0.06)]"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border-b border-[#eee8db] bg-[#faf8f3]/60 px-5 py-4 rounded-t-[var(--radius-card,0.625rem)] ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

export function CardFooter({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border-t border-[#eee8db] bg-[#faf8f3]/60 px-5 py-3.5 rounded-b-[var(--radius-card,0.625rem)] ${className}`}>
      {children}
    </div>
  );
}
