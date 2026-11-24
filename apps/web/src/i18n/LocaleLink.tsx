import { Link, type LinkProps } from 'react-router';
import { useLocalePath } from './locale-context';

/** A normal link to a site path, in the current language: "/support" → "/fr/support". */
export function LocaleLink({ to, ...props }: Omit<LinkProps, 'to'> & { to: string }) {
  const localePath = useLocalePath();
  return <Link to={localePath(to)} {...props} />;
}
