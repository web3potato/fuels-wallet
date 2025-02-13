import type { Asset } from '@fuel-wallet/types';
import type { InterpreterFrom, StateFrom } from 'xstate';
import { assign, createMachine } from 'xstate';

import type { AssetInputs } from '~/systems/Asset';
import { AssetService } from '~/systems/Asset';
import { assignErrorMessage, FetchMachine } from '~/systems/Core';

type MachineContext = {
  asset?: Asset;
  origin?: string;
  error?: string;
  addedAsset?: Asset;
};

type MachineServices = {
  saveAsset: {
    data: Asset;
  };
};

export type AddAssetInputs = {
  start: { origin: string; asset: Asset };
};

export type MachineEvents =
  | {
      type: 'START';
      input: AddAssetInputs['start'];
    }
  | { type: 'ADD_ASSET' }
  | { type: 'REJECT' };

export const addAssetRequestMachine = createMachine(
  {
    predictableActionArguments: true,
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    tsTypes: {} as import('./addAssetRequestMachine.typegen').Typegen0,
    schema: {
      context: {} as MachineContext,
      services: {} as MachineServices,
      events: {} as MachineEvents,
    },
    id: '(machine)',
    initial: 'idle',
    states: {
      idle: {
        on: {
          START: {
            actions: ['assignAssetData'],
            target: 'reviewAsset',
          },
        },
      },
      reviewAsset: {
        on: {
          ADD_ASSET: {
            target: 'addingAsset',
          },
          REJECT: {
            actions: [assignErrorMessage('Rejected request!')],
            target: 'failed',
          },
        },
      },
      addingAsset: {
        invoke: {
          src: 'saveAsset',
          data: {
            input: (ctx: MachineContext) => ({
              data: ctx.asset,
            }),
          },
          onDone: [
            FetchMachine.errorState('failed'),
            {
              actions: ['assignAddedAsset'],
              target: 'done',
            },
          ],
        },
      },
      done: {
        type: 'final',
      },
      failed: {},
    },
  },
  {
    actions: {
      assignAssetData: assign((ctx, ev) => ({
        ...ctx,
        asset: ev.input.asset,
        origin: ev.input.origin,
      })),
      assignAddedAsset: assign({
        addedAsset: (_, ev) => ev.data,
      }),
    },
    services: {
      saveAsset: FetchMachine.create<
        AssetInputs['upsertAsset'],
        MachineServices['saveAsset']['data']
      >({
        showError: true,
        async fetch({ input }) {
          if (!input?.data) {
            throw new Error('Invalid asset');
          }

          const currentAsset = await AssetService.getAsset(input.data.assetId);
          if (currentAsset && !currentAsset.isCustom) {
            throw new Error(`It's not allowed to change Listed Assets`);
          }

          const asset = await AssetService.upsertAsset({
            data: { ...input.data, isCustom: true },
          });

          if (!asset) {
            throw new Error('Failed to add asset');
          }

          return asset;
        },
      }),
    },
  }
);

export type AddAssetMachine = typeof addAssetRequestMachine;
export type AddAssetMachineService = InterpreterFrom<
  typeof addAssetRequestMachine
>;
export type AddAssetMachineState = StateFrom<typeof addAssetRequestMachine>;
