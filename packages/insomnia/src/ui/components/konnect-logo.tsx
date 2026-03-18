import konnectLogomarkSvg from '~/ui/components/assets/konnect-logomark.svg';

export const KonnectLogo = ({ className = 'h-3.5 w-3.5' }: { className?: string }) => {
  return <img src={konnectLogomarkSvg} alt="Konnect project" className={className} />;
};
