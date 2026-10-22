import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const variants = cva('relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7', {
  variants: { variant: { default: 'bg-background text-foreground', destructive: 'border-destructive/50 text-destructive dark:border-destructive' } },
  defaultVariants: { variant: 'default' },
});
export function Alert({ className, variant, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof variants>) {
  return <div role="alert" className={cn(variants({ variant }), className)} {...props} />;
}
export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-sm leading-relaxed', className)} {...props} />;
}
