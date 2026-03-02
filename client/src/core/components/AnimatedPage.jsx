/**
 * AnimatedPage
 * ────────────
 * Wraps page content with smooth entrance animations.
 * Applies staggered fade-in-up to direct children for
 * a premium, sequential reveal effect.
 *
 * Usage:
 *   <AnimatedPage>
 *     <Header />    ← delay 0
 *     <Cards />     ← delay 1
 *     <Table />     ← delay 2
 *   </AnimatedPage>
 */

import { Children, cloneElement, isValidElement } from "react";

const STAGGER_MS = 80; // delay between each child

export default function AnimatedPage({
  children,
  className = "",
  stagger = STAGGER_MS,
  as: Tag = "div",
}) {
  return (
    <Tag className={`space-y-6 ${className}`}>
      {Children.map(children, (child, i) => {
        if (!isValidElement(child)) return child;

        const delay = `${i * stagger}ms`;

        return cloneElement(child, {
          style: {
            ...child.props.style,
            animationDelay: delay,
            animationFillMode: "both",
          },
          className: `${child.props.className ?? ""} animate-fade-in-up`.trim(),
        });
      })}
    </Tag>
  );
}

/**
 * AnimatedCard
 * ────────────
 * A single animated wrapper for card-level content.
 * Adds hover-lift + entrance animation.
 */
export function AnimatedCard({ children, className = "", delay = 0 }) {
  return (
    <div
      className={`animate-fade-in-up hover-lift ${className}`}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: "both",
      }}
    >
      {children}
    </div>
  );
}

/**
 * FadeIn
 * ──────
 * Simple fade-in wrapper with configurable direction and delay.
 */
export function FadeIn({
  children,
  direction = "up",
  delay = 0,
  className = "",
  as: Tag = "div",
}) {
  const directionClass = {
    up: "animate-fade-in-up",
    down: "animate-fade-in-down",
    left: "animate-fade-in-left",
    right: "animate-fade-in-right",
    none: "animate-scale-in",
  }[direction];

  return (
    <Tag
      className={`${directionClass} ${className}`}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: "both",
      }}
    >
      {children}
    </Tag>
  );
}
