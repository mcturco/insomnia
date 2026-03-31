import konnectLogomarkSvg from '~/ui/components/assets/konnect-logomark.svg';
import controlPlaneGroupSvg from '~/ui/components/assets/konnect-gateway-icons/control-plane-group.svg';
import dedicatedCloudSvg from '~/ui/components/assets/konnect-gateway-icons/dedicated-cloud.svg';
import eventSvg from '~/ui/components/assets/konnect-gateway-icons/event.svg';
import kongIngressControllerSvg from '~/ui/components/assets/konnect-gateway-icons/kong-ingress-controller.svg';
import kongIngressControllerInnerSvg from '~/ui/components/assets/konnect-gateway-icons/kong-ingress-controller-inner.svg';
import selfManagedSvg from '~/ui/components/assets/konnect-gateway-icons/self-managed.svg';
import serverlessSvg from '~/ui/components/assets/konnect-gateway-icons/serverless.svg';
import type { KonnectGatewayType } from '~/ui/konnect/konnect-api';

export const KonnectLogo = ({ className = 'h-3.5 w-3.5' }: { className?: string }) => {
  return <img src={konnectLogomarkSvg} alt="Konnect project" className={className} />;
};

const gatewayIconByType: Record<KonnectGatewayType, string> = {
  'control-plane-group': controlPlaneGroupSvg,
  'dedicated-cloud': dedicatedCloudSvg,
  event: eventSvg,
  'kong-ingress-controller': kongIngressControllerSvg,
  'self-managed': selfManagedSvg,
  serverless: serverlessSvg,
};

export const KonnectGatewayLogo = ({
  gatewayType,
  className = 'h-3.5 w-3.5',
}: {
  gatewayType?: KonnectGatewayType;
  className?: string;
}) => {
  const resolvedGatewayType: KonnectGatewayType = gatewayType || 'self-managed';
  const source = gatewayIconByType[resolvedGatewayType];
  if (!source) {
    return <KonnectLogo className={className} />;
  }
  if (resolvedGatewayType === 'kong-ingress-controller') {
    return (
      <span className={`relative inline-flex ${className}`} aria-label="Konnect gateway type">
        <img src={kongIngressControllerSvg} alt="" className="h-full w-full" />
        <img src={kongIngressControllerInnerSvg} alt="" className="absolute inset-[19%] h-auto w-auto" />
      </span>
    );
  }
  return <img src={source} alt="Konnect gateway type" className={className} />;
};
