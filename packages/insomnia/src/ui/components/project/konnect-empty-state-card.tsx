import { Button } from 'react-aria-components';

interface Props {
  onConfigure: () => void;
}

export const KonnectEmptyStateCard = ({ onConfigure }: Props) => {
  return (
    <div className="p-2">
      <div className="overflow-hidden rounded-[4px] border border-solid border-(--hl-sm) bg-[#010101] pb-[60px]">
        <div className="h-[94px] w-full bg-[radial-gradient(ellipse_at_center_top,_#a3e635_0%,_#65a30d_24%,_#14532d_48%,_#052e16_70%,_transparent_100%)] opacity-80" />
        <div className="flex flex-col items-center gap-4 px-4 text-center">
          <div className="rounded-[2px] border border-solid border-[#ccff00] px-1 py-0.5 text-[12px] leading-none font-semibold text-[#ccff00]">
            NEW
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-[14px] font-bold text-white">Auto-sync your gateway service routes</h3>
            <p className="text-[12px] leading-[18px] text-(--color-font)">
              Get right into testing your gateway configuration in Insomnia with the new Konnect platform integration.
            </p>
          </div>
          <Button
            onPress={onConfigure}
            className="rounded-[4px] border border-solid border-(--hl-md) px-3 py-2 text-[12px] font-semibold text-(--color-font) hover:bg-(--hl-xs)"
          >
            Configure
          </Button>
        </div>
      </div>
    </div>
  );
};
