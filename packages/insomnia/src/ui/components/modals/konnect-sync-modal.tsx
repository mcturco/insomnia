import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  Heading,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Modal,
  ModalOverlay,
  Popover,
  Select,
  SelectValue,
  TextField,
} from 'react-aria-components';
import { useRevalidator } from 'react-router';

import {
  showKonnectSyncResultToast,
  useKonnectSyncActionFetcher,
} from '~/routes/organization.$organizationId.konnect.sync';
import { type KonnectRegion } from '~/ui/konnect/konnect-api';
import { clearKonnectConnection, loadKonnectConnection, saveKonnectConnection } from '~/ui/konnect/storage';

import { Icon } from '../icon';

const REGION_OPTIONS: { key: KonnectRegion; label: string }[] = [
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
  const syncFetcher = useKonnectSyncActionFetcher({ key: `konnect-sync:${organizationId}` });
  const revalidator = useRevalidator();
  const lastHandledResultRef = useRef<unknown>(null);
  const safePat = typeof pat === 'string' ? pat : '';

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const latestConnection = loadKonnectConnection(organizationId);
    setPat(latestConnection?.pat || '');
    setRegion(latestConnection?.region || 'global');
  }, [isOpen, organizationId]);

  useEffect(() => {
    if (!syncFetcher.data || syncFetcher.state !== 'idle') {
      return;
    }

    if (lastHandledResultRef.current === syncFetcher.data) {
      return;
    }
    lastHandledResultRef.current = syncFetcher.data;

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
      revalidator.revalidate();
      return;
    }

    if (syncFetcher.data?.ok && syncFetcher.data.action === 'disconnect') {
      clearKonnectConnection(organizationId);
      setPat('');
      setRegion('global');
      revalidator.revalidate();
      return;
    }

    if (syncFetcher.data?.action === 'sync') {
      revalidator.revalidate();
    }
  }, [organizationId, revalidator, syncFetcher.data, syncFetcher.state]);

  const onSync = () => {
    const trimmedPat = safePat.trim();
    if (!trimmedPat) {
      return;
    }

    const current = loadKonnectConnection(organizationId);
    const canReuseSuccessfulSyncState =
      current?.pat === trimmedPat && current.region === region && current.lastSyncStatus === 'success';

    saveKonnectConnection(organizationId, {
      pat: trimmedPat,
      region,
      lastSyncAt: canReuseSuccessfulSyncState ? (current?.lastSyncAt ?? null) : null,
      lastSyncStatus: canReuseSuccessfulSyncState ? 'success' : 'idle',
      lastSyncError: undefined,
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
        <Dialog
          aria-label="Konnect Sync Modal"
          className="grid flex-1 grid-rows-[min-content_1fr] gap-4 overflow-hidden p-10 outline-hidden"
        >
          {({ close }) => (
            <>
              <div className="flex items-center justify-between gap-2">
                <Heading slot="title" className="text-2xl">
                  Konnect Sync
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
                  <Popover className="min-w-(--trigger-width) rounded-md border border-solid border-(--hl-sm) bg-(--color-bg) p-1 shadow-lg">
                    <ListBox aria-label="Konnect regions" items={REGION_OPTIONS} className="outline-hidden">
                      {option => (
                        <ListBoxItem
                          id={option.key}
                          textValue={option.label}
                          className="cursor-default rounded-xs px-2 py-1 text-sm text-(--color-font) outline-hidden transition-colors hover:bg-(--hl-xs) focus:bg-(--hl-sm) aria-selected:bg-(--hl-sm)"
                        >
                          {option.label}
                        </ListBoxItem>
                      )}
                    </ListBox>
                  </Popover>
                </Select>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <div className="mr-auto text-xs text-(--hl)">
                    Last synced:{' '}
                    {effectiveConnection?.lastSyncAt
                      ? new Date(effectiveConnection.lastSyncAt).toLocaleString()
                      : 'Never'}
                  </div>
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
