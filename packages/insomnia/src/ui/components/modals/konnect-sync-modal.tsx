import { useEffect, useMemo, useState } from 'react';
import { Button, Dialog, Heading, Input, Label, Modal, ModalOverlay, Select, SelectValue, TextField } from 'react-aria-components';

import { useKonnectSyncActionFetcher, showKonnectSyncResultToast } from '~/routes/organization.$organizationId.konnect.sync';
import { type KonnectRegion } from '~/ui/konnect/konnect-api';
import { clearKonnectConnection, loadKonnectConnection, maskPat, saveKonnectConnection } from '~/ui/konnect/storage';

import { Icon } from '../icon';

const REGION_OPTIONS: Array<{ key: KonnectRegion; label: string }> = [
  { key: 'global', label: 'Global' },
  { key: 'us', label: 'US' },
  { key: 'eu', label: 'EU' },
  { key: 'au', label: 'Australia' },
];

export const KonnectSyncModal = ({
  isOpen,
  onOpenChange,
  organizationId,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  organizationId: string;
}) => {
  const storedConnection = useMemo(() => loadKonnectConnection(organizationId), [organizationId]);
  const [pat, setPat] = useState(storedConnection?.pat || '');
  const [region, setRegion] = useState<KonnectRegion>(storedConnection?.region || 'global');
  const [showRawPat, setShowRawPat] = useState(false);
  const syncFetcher = useKonnectSyncActionFetcher({ key: `konnect-sync:${organizationId}` });
  const safePat = typeof pat === 'string' ? pat : '';

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const latestConnection = loadKonnectConnection(organizationId);
    setPat(latestConnection?.pat || '');
    setRegion(latestConnection?.region || 'global');
    setShowRawPat(false);
  }, [isOpen, organizationId]);

  useEffect(() => {
    if (!syncFetcher.data || syncFetcher.state !== 'idle') {
      return;
    }

    if (syncFetcher.data.ok && syncFetcher.data.action === 'sync') {
      const current = loadKonnectConnection(organizationId);
      if (current) {
        saveKonnectConnection(organizationId, {
          ...current,
          lastSyncAt: Date.now(),
          lastSyncStatus: 'success',
          lastSyncError: undefined,
        });
      }
      showKonnectSyncResultToast(syncFetcher.data);
      return;
    }

    if (syncFetcher.data?.ok && syncFetcher.data.action === 'disconnect') {
      clearKonnectConnection(organizationId);
      setPat('');
      setRegion('global');
    }
  }, [organizationId, syncFetcher.data, syncFetcher.state]);

  const onSync = () => {
    const trimmedPat = safePat.trim();
    if (!trimmedPat) {
      return;
    }

    saveKonnectConnection(organizationId, {
      pat: trimmedPat,
      region,
      lastSyncAt: null,
      lastSyncStatus: 'idle',
    });

    syncFetcher.submit({
      organizationId,
      action: 'sync',
      pat: trimmedPat,
      region,
    });
  };

  const onDisconnect = () => {
    syncFetcher.submit({
      organizationId,
      action: 'disconnect',
    });
  };

  const busy = syncFetcher.state !== 'idle';
  const effectiveConnection = loadKonnectConnection(organizationId);

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className="fixed top-0 right-0 bottom-0 left-0 z-10 flex items-start justify-center bg-black/30 pt-[70px]"
    >
      <Modal className="flex max-h-[calc(var(--visual-viewport-height)-140px)] w-full max-w-2xl flex-col overflow-hidden rounded-md border border-solid border-(--hl-sm) bg-(--color-bg) text-(--color-font)">
        <Dialog aria-label="Konnect Sync Modal" className="grid flex-1 grid-rows-[min-content_1fr] gap-4 overflow-hidden p-10 outline-hidden">
          {({ close }) => (
            <>
              <div className="flex items-center justify-between gap-2">
                <Heading slot="title" className="text-2xl">
                  Konnect Sync (Prototype)
                </Heading>
                <Button
                  className="flex aspect-square h-6 shrink-0 items-center justify-center rounded-xs text-sm text-(--color-font) ring-1 ring-transparent transition-all hover:bg-(--hl-xs) focus:ring-(--hl-md) focus:ring-inset aria-pressed:bg-(--hl-sm)"
                  onPress={close}
                >
                  <Icon icon="x" />
                </Button>
              </div>

              <div className="flex flex-col gap-4 overflow-y-auto">
                <TextField className="group relative flex flex-col gap-2 px-0.5">
                  <Label className="pt-0 text-sm text-(--color-font)">Personal Access Token (PAT)</Label>
                  <Input
                    type="password"
                    value={safePat}
                    onChange={event => setPat(event.target.value)}
                    placeholder="Paste your Konnect PAT"
                    className="w-full rounded-xs border border-solid border-(--hl-sm) bg-(--color-bg) py-1 pr-7 pl-2 text-(--color-font) transition-colors placeholder:italic focus:ring-1 focus:ring-(--hl-md) focus:outline-hidden"
                  />
                </TextField>

                <Select
                  aria-label="Konnect region"
                  selectedKey={region}
                  onSelectionChange={selection => setRegion(selection as KonnectRegion)}
                >
                  <Label className="mb-2 px-0.5 pt-0 text-sm">Region</Label>
                  <Button className="flex w-full flex-1 items-center justify-between gap-2 rounded-xs border border-solid border-(--hl-sm) bg-(--color-bg) px-2 py-1 text-(--color-font) ring-1 ring-transparent transition-colors placeholder:italic hover:bg-(--hl-xs) focus:ring-1 focus:ring-(--hl-md) focus:outline-hidden focus:ring-inset aria-pressed:bg-(--hl-sm)">
                    <SelectValue>{({ selectedText }) => selectedText || 'Select region'}</SelectValue>
                    <Icon icon="caret-down" />
                  </Button>
                  <div className="mt-1 rounded-md border border-solid border-(--hl-sm) bg-(--color-bg) p-1">
                    {REGION_OPTIONS.map(option => (
                      <Button
                        key={option.key}
                        onPress={() => setRegion(option.key)}
                        className={`flex w-full items-center rounded-xs px-2 py-1 text-left text-sm ${region === option.key ? 'bg-(--hl-sm)' : 'hover:bg-(--hl-xs)'}`}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </Select>

                {effectiveConnection && (
                  <div className="rounded-xs border border-solid border-(--hl-sm) p-3 text-sm">
                    <div className="mb-1 flex items-center gap-2">
                      <Icon icon="cloud" />
                      <span>Current connection</span>
                    </div>
                    <div className="text-(--hl)">Region: {effectiveConnection.region.toUpperCase()}</div>
                    <div className="text-(--hl)">
                      PAT: {showRawPat ? effectiveConnection.pat : maskPat(effectiveConnection.pat)}
                      <Button
                        onPress={() => setShowRawPat(value => !value)}
                        className="ml-2 rounded-xs px-2 py-0.5 text-xs hover:bg-(--hl-xs)"
                      >
                        {showRawPat ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                    <div className="text-(--hl)">
                      Last sync:{' '}
                      {effectiveConnection.lastSyncAt
                        ? new Date(effectiveConnection.lastSyncAt).toLocaleString()
                        : 'Never'}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    onPress={onDisconnect}
                    isDisabled={!effectiveConnection || busy}
                    className="rounded-xs border border-solid border-(--hl-md) px-3 py-1 text-sm hover:bg-(--hl-xs) disabled:opacity-50"
                  >
                    Disconnect
                  </Button>
                  <Button
                    onPress={onSync}
                    isDisabled={busy || !safePat.trim()}
                    className="rounded-xs border border-solid border-(--hl-md) px-3 py-1 text-sm hover:bg-(--hl-xs) disabled:opacity-50"
                  >
                    {busy ? (
                      <span className="flex items-center gap-2">
                        <Icon icon="spinner" className="animate-spin" />
                        Syncing...
                      </span>
                    ) : (
                      'Sync Now'
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
};
