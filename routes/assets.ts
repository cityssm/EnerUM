import { Router } from 'express'

import handler_assets from '../handlers/assets-get/assets.js'
import handler_doAddAsset from '../handlers/assets-post/doAddAsset.js'
import handler_doAddAssetGroup from '../handlers/assets-post/doAddAssetGroup.js'
import handler_doDeleteAsset from '../handlers/assets-post/doDeleteAsset.js'
import handler_doDeleteAssetGroup from '../handlers/assets-post/doDeleteAssetGroup.js'
import handler_doGetAsset from '../handlers/assets-post/doGetAsset.js'
import handler_doGetAssetGroup from '../handlers/assets-post/doGetAssetGroup.js'
import handler_doUpdateAsset from '../handlers/assets-post/doUpdateAsset.js'
import handler_doUpdateAssetGroup from '../handlers/assets-post/doUpdateAssetGroup.js'
import { updatePostHandler } from '../handlers/permissions.js'

export const router = Router()

router.get('/', handler_assets)

// Assets

router.post('/doAddAsset', updatePostHandler, handler_doAddAsset)

router.post('/doGetAsset', handler_doGetAsset)

router.post('/doUpdateAsset', updatePostHandler, handler_doUpdateAsset)

router.post('/doDeleteAsset', updatePostHandler, handler_doDeleteAsset)

// Asset Groups

router.post('/doAddAssetGroup', updatePostHandler, handler_doAddAssetGroup)

router.post('/doGetAssetGroup', handler_doGetAssetGroup)

router.post(
  '/doUpdateAssetGroup',
  updatePostHandler,
  handler_doUpdateAssetGroup
)

router.post(
  '/doDeleteAssetGroup',
  updatePostHandler,
  handler_doDeleteAssetGroup
)

export default router
