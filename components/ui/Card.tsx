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
      className={`rounded-lg border border-slate-200/90 bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] ${
        interactive ? "transition-all duration-150 hover:border-slate-300 hover:shadow-md" : ""
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
  return <div className={`border-b border-slate-100 px-5 py-3.5 ${className}`}>{children}</div>;
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
  return <div className={`border-t border-slate-100 bg-slate-50/50 px-5 py-3 rounded-b-lg ${className}`}>{children}</div>;
}
