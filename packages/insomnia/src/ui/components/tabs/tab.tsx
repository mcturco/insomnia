import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import classNames from 'classnames';
import { models } from 'insomnia-data';
import React, { useCallback } from 'react';
import { Button, GridListItem } from 'react-aria-components';

import type { WorkspaceFileIssue } from '~/main/git-service';
import { MethodBadge } from '~/ui/components/tags/method-badge';
import { scrollElementIntoView } from '~/ui/utils';

import { useInsomniaTabContext } from '../../context/app/insomnia-tab-context';
import { Icon } from '../icon';
import { Tooltip } from '../tooltip';
import { TAB_CONTEXT_MENU_COMMAND } from './tab-list';

export type TabType =
  | 'request'
  | 'folder'
  | 'environment'
  | 'mockServer'
  | 'mockRoute'
  | 'document'
  | 'collection'
  | 'runner'
  | 'test'
  | 'testSuite';
export interface BaseTab {
  type: TabType;
  name: string;
  url: string;
  organizationId: string;
  projectId: string;
  workspaceId: string;
  projectName: string;
  workspaceName: string;
  id: string;
  // tag is used to display the request method in the tab
  // method is used to display the tag color
  tag?: string;
  method?: string;
  temporary?: boolean;
}

const WORKSPACE_TAB_UI_MAP: Partial<Record<TabType, any>> = {
  collection: {
    icon: 'bars',
    bgColor: 'bg-(--color-fix)',
    textColor: 'text-(--color-font-fix)',
  },
  environment: {
    icon: 'code',
    bgColor: 'bg-(--color-font)',
    textColor: 'text-(--color-bg)',
  },
  mockServer: {
    icon: 'server',
    bgColor: 'bg-(--color-warning)',
    textColor: 'text-(--color-font-warning)',
  },
  document: {
    icon: 'file',
    bgColor: 'bg-(--color-info)',
    textColor: 'text-(--color-font-info)',
  },
};

export const InsomniaTab = ({ tab, fileIssue }: { tab: BaseTab; fileIssue?: WorkspaceFileIssue }) => {
  const { closeTabById, currentOrgTabs } = useInsomniaTabContext();

  const renderTabIcon = (type: TabType, tabId: string) => {
    if (WORKSPACE_TAB_UI_MAP[type]) {
      return (
        <div
          className={`${WORKSPACE_TAB_UI_MAP[type].bgColor} ${WORKSPACE_TAB_UI_MAP[type].textColor} flex h-[20px] w-[20px] items-center justify-center rounded-s-sm px-2`}
        >
          <Icon icon={WORKSPACE_TAB_UI_MAP[type].icon} />
        </div>
      );
    }

    if (models.mcpRequest.isMcpRequestId(tabId)) {
      return (
        <div className="flex h-[20px] w-[20px] items-center justify-center rounded-s-sm bg-(--color-danger) px-2 text-(--color-font-danger)">
          <Icon icon={['fac', 'mcp'] as unknown as IconProp} />
        </div>
      );
    }

    if (type === 'request' || type === 'mockRoute') {
      return <MethodBadge aria-label="Tab Tag" method={tab?.method || tab?.tag || ''} label={tab.tag} />;
    }

    if (type === 'folder') {
      return <Icon icon="folder" />;
    }
    if (type === 'runner') {
      return <Icon icon="play" />;
    }

    if (type === 'testSuite') {
      return <Icon icon="check" />;
    }

    return null;
  };

  const handleAuxClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, id: string) => {
    // If mouse middle button clicked, close tab
    if (e.button === 1) {
      closeTabById(id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    window.main.showContextMenu({
      key: 'insomniaTab',
      menuItems: [
        {
          label: TAB_CONTEXT_MENU_COMMAND.CLOSE_ALL,
        },
        {
          label: TAB_CONTEXT_MENU_COMMAND.CLOSE_OTHERS,
        },
      ],
      extra: {
        currentTabId: tab.id,
      },
    });
  };

  const scrollIntoView = useCallback(
    (node: HTMLDivElement) => {
      if (node && currentOrgTabs.activeTabId === tab.id) {
        scrollElementIntoView(node, { behavior: 'instant' });
      }
    },
    [currentOrgTabs.activeTabId, tab.id],
  );

  const { updateTabById } = useInsomniaTabContext();

  const handleDoubleClick = () => {
    if (tab.temporary) {
      updateTabById?.(tab.id, { temporary: false });
    }
  };

  return (
    <GridListItem
      textValue={`tab-${tab.name}`}
      id={tab.id}
      className="outline-hidden hover:bg-(--hl-xs) aria-selected:bg-(--hl-sm) aria-selected:text-(--color-font)"
      ref={scrollIntoView}
    >
      {({ isSelected, isHovered }) => (
        <Tooltip delay={1000} message={`${tab.projectName} / ${tab.workspaceName}`} className="h-full">
          <div
            onDoubleClick={handleDoubleClick}
            onAuxClick={e => handleAuxClick(e, tab.id)}
            onContextMenu={handleContextMenu}
            className={`relative flex h-full max-w-[200px] cursor-pointer flex-nowrap items-center border-r border-solid border-(--hl-sm) px-[10px] outline-hidden hover:text-(--color-font) ${!isSelected && !isHovered && 'opacity-[0.7]'}`}
          >
            {renderTabIcon(tab.type, tab.id)}
            <span
              className={classNames('mx-[8px] overflow-hidden text-nowrap text-ellipsis', {
                italic: tab.temporary,
              })}
            >
              {models.mcpRequest.isMcpRequestId(tab.id) ? tab.workspaceName : tab.name}
            </span>
            {fileIssue && (
              <span className="mr-2 flex shrink-0 items-center text-(--color-warning)">
                <Icon icon="triangle-exclamation" />
              </span>
            )}
            <Button
              aria-label="Close Tab"
              data-testid="tab-close-button"
              className="flex h-[15px] w-[15px] items-center justify-center hover:bg-(--hl-md)"
              onPress={() => closeTabById(tab.id)}
            >
              <Icon icon="close" />
            </Button>
            <span
              className={`absolute right-0 bottom-0 left-0 block h-px bg-(--color-bg) ${isSelected ? 'opacity-100' : 'opacity-0'}`}
            />
            <span
              className={`absolute right-0 bottom-0 left-0 block h-px bg-(--hl-sm) ${!isSelected ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>
          <Button slot="drag" className="hidden" />
        </Tooltip>
      )}
    </GridListItem>
  );
};
