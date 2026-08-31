import { HTMLAttributes } from 'react';
import { classNames } from '../../utils/helpers';

export default function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={classNames('card p-6', className)} {...rest}>
      {children}
    </div>
  );
}
