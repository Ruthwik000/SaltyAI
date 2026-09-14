import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "sw-press inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[2px] font-semibold tracking-tight disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "bg-[#0b0b0c] text-white hover:bg-[#3a393e]",
        destructive: "bg-[#d0182a] text-white hover:bg-[#a51322]",
        outline: "border border-[#0b0b0c] bg-transparent text-[#0b0b0c] hover:bg-[#0b0b0c] hover:text-white",
        secondary: "bg-[#efede7] text-[#0b0b0c] hover:bg-[#e3e0d8]",
        ghost: "bg-transparent text-[#0b0b0c] hover:bg-[#efede7]",
        link: "bg-transparent px-0 text-[#0b0b0c] underline underline-offset-4 hover:text-[#3a393e]",
      },
      size: {
        default: "h-11 px-5 text-[15px]",
        sm: "h-9 px-4 text-sm",
        lg: "h-14 px-7 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
