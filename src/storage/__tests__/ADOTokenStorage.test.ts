import { ADOTokenStorage } from '../ADOTokenStorage';
import { mockFetch } from '../../../tests/__mocks__/fetchMock';
import { TokenTypes } from '@/constants/TokenTypes';
import { TokenSetStatus } from '@/constants/TokenSetStatus';

describe('ADOTokenStorage', () => {
  const baseUrl = 'https://brandcode.azure.com';
  const repositoryId = 'brandcode';
  const projectId = 'tokens';
  const secret = 'secret';
  const storageProvider = new ADOTokenStorage({
    baseUrl,
    secret,
    id: repositoryId,
    name: projectId,
  });

  beforeEach(() => {
    storageProvider.disableMultiFile();
  });

  it('can fetch branches', async () => {
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        count: 2,
        value: [
          { name: 'refs/heads/feat/foo' },
          { name: 'refs/heads/feat/bar' },
        ],
      }),
    }));

    const branches = await storageProvider.fetchBranches();
    expect(branches).toEqual(['feat/foo', 'feat/bar']);
  });

  it('should try to create a branch', async () => {
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        count: 1,
        value: [
          {
            name: 'refs/heads/main',
            objectId: 'main',
          },
        ],
      }),
    })).mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        count: 1,
        value: [
          {
            name: 'refs/heads/feat/foo',
            success: true,
          },
        ],
      }),
    }));

    const result = await storageProvider.createBranch('feat/foo');
    expect(mockFetch).toBeCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      `${baseUrl}/${projectId}/_apis/git/repositories/${repositoryId}/refs?api-version=6.0`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${btoa(`:${secret}`)}`,
        },
        body: JSON.stringify([{
          name: 'refs/heads/feat/foo',
          oldObjectId: '0000000000000000000000000000000000000000',
          newObjectId: 'main',
        }]),
      },
    );
    expect(result).toBe(true);

    mockFetch.mockClear();
  });

  it('should return false if a branch could not be created', async () => {
    mockFetch.mockImplementation((input: string, init?: RequestInit) => {
      if (init?.method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            count: 1,
            value: [
            ],
          }),
        });
      }
      return Promise.resolve({
        ok: false,
      });
    });

    const result = await storageProvider.createBranch('feat/foo');
    expect(result).toBe(false);

    mockFetch.mockClear();
  });

  it('should return `true` for canWrite if the refs response is ok', async () => {
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      status: 200,
    }));
    const canWrite = await storageProvider.canWrite();
    expect(canWrite).toBe(true);
  });

  it('should return `false` for canWrite if the refs response not ok', async () => {
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      status: 400,
    }));
    const canWrite = await storageProvider.canWrite();
    expect(canWrite).toBe(false);
  });

  it('can read from Git in single file format', async () => {
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        global: {
          colors: {
            red: {
              type: TokenTypes.COLOR,
              value: '#ff0000',
            },
          },
        },
        $themes: [
          {
            id: 'dark',
            name: 'Dark',
            selectedTokenSets: {},
          },
        ],
      }),
    }));

    storageProvider.changePath('data/tokens.json');
    const result = await storageProvider.read();
    expect(result[0]).toEqual({
      type: 'themes',
      path: 'data/tokens.json',
      data: [
        {
          id: 'dark',
          name: 'Dark',
          selectedTokenSets: {},
        },
      ],
    });
    expect(result[1]).toEqual({
      type: 'tokenSet',
      name: 'global',
      path: 'data/tokens.json',
      data: {
        colors: {
          red: {
            type: TokenTypes.COLOR,
            value: '#ff0000',
          },
        },
      },
    });
  });

  it('can read from Git in a multifile format', async () => {
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        count: 2,
        value: [
          { path: 'multifile/$themes.json' },
          { path: 'multifile/global.json' },
        ],
      }),
    })).mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([
        {
          id: 'light',
          name: 'Light',
          selectedTokenSets: {},
        },
      ]),
    })).mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        red: {
          type: TokenTypes.COLOR,
          name: 'red',
          value: '#ff00000',
        },
      }),
    }));

    storageProvider.enableMultiFile();
    storageProvider.changePath('multifile');

    const result = await storageProvider.read();
    expect(result[0]).toEqual({
      type: 'themes',
      path: 'multifile/$themes.json',
      data: [{
        id: 'light',
        name: 'Light',
        selectedTokenSets: {},
      }],
    });
    expect(result[1]).toEqual({
      type: 'tokenSet',
      name: 'global',
      path: 'multifile/global.json',
      data: {
        red: {
          type: TokenTypes.COLOR,
          name: 'red',
          value: '#ff00000',
        },
      },
    });
  });

  it('should be able to write', async () => {
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        count: 1,
        value: [
          { name: 'refs/heads/main' },
        ],
      }),
    })).mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        count: 1,
        value: [
          {
            name: 'refs/heads/main',
            objectId: 'main',
          },
        ],
      }),
    })).mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        count: 1,
        value: [
          { path: '/data/tokens.json' },
        ],
      }),
    })).mockImplementationOnce(() => Promise.resolve({
      ok: true,
    }));

    storageProvider.selectBranch('main');
    storageProvider.changePath('data/tokens.json');
    expect(await storageProvider.write([
      {
        type: 'metadata',
        path: 'metadata.json',
        data: {
          commitMessage: 'Initial commit',
        },
      },
      {
        type: 'themes',
        path: '$themes.json',
        data: [
          {
            id: 'light',
            name: 'Light',
            selectedTokenSets: {
              global: TokenSetStatus.ENABLED,
            },
          },
        ],
      },
      {
        type: 'tokenSet',
        name: 'global',
        path: 'global.json',
        data: {
          red: {
            type: TokenTypes.COLOR,
            name: 'red',
            value: '#ff0000',
          },
        },
      },
    ])).toBe(true);
    expect(mockFetch).toHaveBeenNthCalledWith(
      4,
      `${baseUrl}/${projectId}/_apis/git/repositories/${repositoryId}/pushes?api-version=6.0`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${btoa(`:${secret}`)}`,
        },
        body: JSON.stringify({
          refUpdates: [
            {
              name: 'refs/heads/main',
              oldObjectId: 'main',
            },
          ],
          commits: [
            {
              comment: 'Initial commit',
              changes: [
                {
                  changeType: 'edit',
                  item: { path: '/data/tokens.json' },
                  newContent: {
                    content: JSON.stringify({
                      $themes: [
                        {
                          id: 'light',
                          name: 'Light',
                          selectedTokenSets: {
                            global: TokenSetStatus.ENABLED,
                          },
                        },
                      ],
                      global: {
                        red: {
                          type: TokenTypes.COLOR,
                          name: 'red',
                          value: '#ff0000',
                        },
                      },
                    }, null, 2),
                    contentType: 'rawtext',
                  },
                },
              ],
            },
          ],
        }),
      },
    );
  });

  it('should be able to write in a multi file set-up', async () => {
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        count: 1,
        value: [
          { name: 'refs/heads/main' },
        ],
      }),
    })).mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        count: 1,
        value: [
          {
            name: 'refs/heads/main',
            objectId: 'main',
          },
        ],
      }),
    })).mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        count: 1,
        value: [
          { path: '/multifile/global.json' },
          { path: '/multifile/$themes.json' },
        ],
      }),
    }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true }));

    storageProvider.enableMultiFile();
    storageProvider.selectBranch('main');
    storageProvider.changePath('multifile');
    expect(await storageProvider.write([
      {
        type: 'metadata',
        path: 'metadata.json',
        data: {
          commitMessage: 'Initial commit',
        },
      },
      {
        type: 'themes',
        path: '$themes.json',
        data: [
          {
            id: 'light',
            name: 'Light',
            selectedTokenSets: {
              global: TokenSetStatus.ENABLED,
            },
          },
        ],
      },
      {
        type: 'tokenSet',
        name: 'global',
        path: 'global.json',
        data: {
          red: {
            type: TokenTypes.COLOR,
            name: 'red',
            value: '#ff0000',
          },
        },
      },
    ])).toBe(true);
    expect(mockFetch).toHaveBeenNthCalledWith(
      4,
      `${baseUrl}/${projectId}/_apis/git/repositories/${repositoryId}/pushes?api-version=6.0`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${btoa(`:${secret}`)}`,
        },
        body: JSON.stringify({
          refUpdates: [
            {
              name: 'refs/heads/main',
              oldObjectId: 'main',
            },
          ],
          commits: [
            {
              comment: 'Initial commit',
              changes: [
                {
                  changeType: 'edit',
                  item: { path: '/multifile/$themes.json' },
                  newContent: {
                    content: JSON.stringify([
                      {
                        id: 'light',
                        name: 'Light',
                        selectedTokenSets: {
                          global: TokenSetStatus.ENABLED,
                        },
                      },
                    ], null, 2),
                    contentType: 'rawtext',
                  },
                },
                {
                  changeType: 'edit',
                  item: { path: '/multifile/global.json' },
                  newContent: {
                    content: JSON.stringify({
                      red: {
                        type: TokenTypes.COLOR,
                        name: 'red',
                        value: '#ff0000',
                      },
                    }, null, 2),
                    contentType: 'rawtext',
                  },
                },
              ],
            },
          ],
        }),
      },
    );
  });
});
