import { useNavigate } from 'react-router-dom';

import type { AssetsMachineState } from '../machines';

import { Services, store } from '~/store';
import { Pages } from '~/systems/Core';

const selectors = {
  assets(state: AssetsMachineState) {
    return state.context.assets || [];
  },
  assetsListed(state: AssetsMachineState) {
    return state.context.assets?.filter(({ isCustom }) => !isCustom) || [];
  },
  assetsCustom(state: AssetsMachineState) {
    return state.context.assets?.filter(({ isCustom }) => isCustom) || [];
  },
  isLoading(state: AssetsMachineState) {
    return state.hasTag('loading');
  },
};

export function useAssets() {
  const navigate = useNavigate();
  const assets = store.useSelector(Services.assets, selectors.assets);
  const assetsListed = store.useSelector(
    Services.assets,
    selectors.assetsListed
  );
  const assetsCustom = store.useSelector(
    Services.assets,
    selectors.assetsCustom
  );
  const isLoading = store.useSelector(Services.assets, selectors.isLoading);

  store.useUpdateMachineConfig(Services.assets, {
    actions: {
      navigateBack() {
        navigate(-1);
      },
    },
  });

  function cancel() {
    navigate(-1);
  }

  function goToAdd() {
    navigate(Pages.assetsAdd());
  }

  function goToEdit(assetId: string) {
    navigate(Pages.assetsEdit({ id: assetId }));
  }

  return {
    handlers: {
      cancel,
      goToAdd,
      goToEdit,
      upsertAsset: store.upsertAsset,
      removeAsset: store.removeAsset,
    },
    assets,
    assetsListed,
    assetsCustom,
    isLoading,
  };
}
