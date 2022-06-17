/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable react/button-has-type */
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import TokenGroupHeading from './TokenGroupHeading';
import { TokenButton } from './TokenButton';
import { editProhibitedSelector, collapsedSelector } from '@/selectors';
import { DeepKeyTokenMap, SingleToken, TokenTypeSchema } from '@/types/tokens';
import { isSingleToken } from '@/utils/is';
import IconButton from './IconButton';
import AddIcon from '@/icons/add.svg';

export type ShowFormOptions = {
  name: string;
  isPristine?: boolean;
  token: SingleToken | null;
};

export type ShowNewFormOptions = {
  name?: string;
};

type Props = {
  displayType: 'GRID' | 'LIST';
  schema: TokenTypeSchema;
  tokenValues: DeepKeyTokenMap;
  path?: string | null;
  showNewForm: (opts: ShowNewFormOptions) => void;
  showForm: (opts: ShowFormOptions) => void;
};

const TokenTree: React.FC<Props> = ({
  displayType, tokenValues, showNewForm, showForm, schema, path = null,
}) => {
  const editProhibited = useSelector(editProhibitedSelector);
  const collapsed = useSelector(collapsedSelector);
  const [isIntCollapsed, setIntCollapsed] = React.useState(false);
  const tokenValuesEntries = React.useMemo(() => (
    Object.entries(tokenValues).map(([name, value]) => {
      const stringPath = [path, name].filter((n) => n).join('.');

      return {
        stringPath,
        name,
        value,
        isIntCollapsed,
        handleShowNewForm: () => showNewForm({ name: `${stringPath}.` }),
        handleSetIntCollapsed: () => setIntCollapsed(!isIntCollapsed),
      };
    })
  ), [tokenValues, path, showNewForm, isIntCollapsed]);
  console.log('tokenVlaueEntries', tokenValuesEntries, 'isIntCollapsed', isIntCollapsed);
  const [draggedToken, setDraggedToken] = useState<SingleToken | null>(null);
  const [dragOverToken, setDragOverToken] = useState<SingleToken | null>(null);

  React.useEffect(() => {
    setIntCollapsed(collapsed);
  }, [collapsed]);

  return (
    <div className="flex justify-start flex-row flex-wrap">
      {tokenValuesEntries.map(({
        // eslint-disable-next-line @typescript-eslint/no-shadow
        stringPath, name, value, isIntCollapsed, handleShowNewForm, handleSetIntCollapsed,
      }) => (
        <React.Fragment key={stringPath}>
          {typeof value === 'object' && !isSingleToken(value) ? (
            <div className="property-wrapper w-full" data-cy={`token-group-${stringPath}`}>
              <div className="flex items-center justify-between group">
                <button onClick={handleSetIntCollapsed}>
                  {isIntCollapsed ? (
                    <svg width="6" height="6" viewBox="0 0 6 6" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 3L1 0v6l4-3z" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg width="6" height="6" viewBox="0 0 6 6" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 5l3-4H0l3 4z" fill="currentColor" />
                    </svg>
                  )}
                </button>
                <TokenGroupHeading label={name} path={stringPath} id="listing" type={schema.type} />
                <div className="opacity-0 group-hover:opacity-100 focus:opacity-100">
                  <IconButton
                    icon={<AddIcon />}
                    tooltip="Add a new token"
                    tooltipSide="left"
                    onClick={handleShowNewForm}
                    disabled={editProhibited}
                    dataCy="button-add-new-token-in-group"
                  />
                </div>
              </div>
              {!isIntCollapsed && (
              <TokenTree
                tokenValues={value}
                showNewForm={showNewForm}
                showForm={showForm}
                schema={schema}
                path={stringPath}
                displayType={displayType}
              />
              )}
            </div>
          ) : (
            <TokenButton
              type={schema.type}
              token={value}
              showForm={showForm}
              draggedToken={draggedToken}
              dragOverToken={dragOverToken}
              displayType={displayType}
              setDraggedToken={setDraggedToken}
              setDragOverToken={setDragOverToken}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default React.memo(TokenTree);
